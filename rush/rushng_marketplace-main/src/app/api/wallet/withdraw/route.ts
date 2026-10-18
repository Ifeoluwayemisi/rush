import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { randomBytes } from "node:crypto";
import { sendNotification } from "@/lib/notify";
import { sendWithdrawalInitiatedEmail, sendWithdrawalFailedEmail } from "@/lib/email/wallet";

const MIN_WITHDRAWAL = 1000;

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();

    const body = await req.json().catch(() => ({}));
    const amount = Number(body.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ error: "Enter a valid withdrawal amount." }, { status: 400 });
    }
    if (amount < MIN_WITHDRAWAL) {
      return NextResponse.json(
        { error: `Minimum withdrawal is ₦${MIN_WITHDRAWAL.toLocaleString()}.` },
        { status: 400 },
      );
    }

    // ─── 1. Load saved bank account details ──────────────────────────
    const freshUser = await db.user.findUnique({
      where: { id: user.id },
      select: {
        name: true,
        email: true,
        bankAccountNumber: true,
        bankAccountName: true,
        bankName: true,
        paystackRecipientCode: true,
      },
    });

    if (!freshUser?.paystackRecipientCode) {
      return NextResponse.json(
        {
          error:
            "Add a bank account before withdrawing. Open Rush Wallet → Withdraw → Add bank account.",
        },
        { status: 400 },
      );
    }

    // ─── 2. Load wallet balance ─────────────────────────────────────
    const wallet = await db.wallet.findUnique({ where: { userId: user.id } });
    if (!wallet) {
      return NextResponse.json(
        { error: "Rush wallet not found for this account." },
        { status: 404 },
      );
    }

    const balanceBefore = wallet.balance ?? 0;
    if (balanceBefore < amount) {
      return NextResponse.json(
        {
          error: `Insufficient balance. You have ₦${balanceBefore.toLocaleString()}.`,
          balance: balanceBefore,
          requested: amount,
        },
        { status: 402 },
      );
    }

    // ─── 3. Atomic compare-and-swap debit ───────────────────────────
    const debitResult = await db.wallet.updateMany({
      where: { id: wallet.id, balance: { gte: amount } },
      data: { balance: { decrement: amount } },
    });

    if (debitResult.count === 0) {
      return NextResponse.json(
        { error: "Wallet balance updated concurrently. Please retry." },
        { status: 409 },
      );
    }

    const balanceAfter = balanceBefore - amount;

    // ─── 4. Ledger entry recording ──────────────────────────────────
    try {
      await db.walletLedgerEntry.create({
        data: {
          id: randomBytes(12).toString("hex"),
          walletId: wallet.id,
          type: "DEBIT",
          amount,
          balanceBefore,
          balanceAfter,
          description: `Withdrawal to ${freshUser.bankName} (${freshUser.bankAccountNumber})`,
          createdAt: new Date(),
        },
      });
    } catch (ledgerErr: any) {
      console.warn("[wallet/withdraw] ledger entry skipped or failed:", ledgerErr?.message);
    }

    // ─── 5. Create PENDING payout record ────────────────────────────
    const payoutId = randomBytes(12).toString("hex");
    await db.payout.create({
      data: {
        id: payoutId,
        vendorId: null,      // null marks this as a customer wallet withdrawal
        userId: user.id,
        amount,
        currency: "NGN",
        status: "PENDING",
        recipientCode: freshUser.paystackRecipientCode,
        bankAccountNumber: freshUser.bankAccountNumber,
        bankAccountName: freshUser.bankAccountName,
        bankName: freshUser.bankName,
        description: `Wallet withdrawal by ${freshUser.name || "Customer"}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // ─── 6. Execute Paystack Transfer ───────────────────────────────
    try {
      const secretKey = process.env.PAYSTACK_SECRET_KEY;
      if (!secretKey) {
        throw new Error("PAYSTACK_SECRET_KEY is not configured.");
      }

      const transferRes = await fetch("https://api.paystack.co/transfer", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          source: "balance",
          amount: Math.round(amount * 100), // convert Naira to kobo
          recipient: freshUser.paystackRecipientCode,
          reason: `Rush wallet withdrawal — ${freshUser.name || user.id}`,
          reference: `payout-${payoutId}-${Date.now()}`,
        }),
      });

      const transferData = await transferRes.json();
      if (!transferRes.ok || !transferData.status) {
        throw new Error(transferData.message || "Paystack transfer declined.");
      }

      const transferCode = transferData.data.transfer_code;

      await db.payout.update({
        where: { id: payoutId },
        data: {
          transferCode,
          reference: transferData.data.reference,
          providerResponse: JSON.stringify(transferData.data),
        },
      });

      // ─── 7. Notify + email the customer ────────────────────────────
      try {
        await sendNotification({
          userId: user.id,
          title: "Withdrawal Initiated",
          message: `₦${amount.toLocaleString()} is on its way to your bank account.`,
          type: "PAYOUT",
        });
      } catch (notifyErr: any) {
        console.error("[wallet/withdraw] notification failed:", notifyErr?.message ?? notifyErr);
      }

      try {
        await sendWithdrawalInitiatedEmail({
          userId: user.id,
          email: freshUser.email,
          name: freshUser.name,
          amount,
          bankName: freshUser.bankName,
          accountNumber: freshUser.bankAccountNumber,
        });
      } catch (emailErr: any) {
        console.error("[wallet/withdraw] initiated email failed:", emailErr?.message ?? emailErr);
      }

      return NextResponse.json({
        ok: true,
        payout: {
          id: payoutId,
          amount,
          status: "PENDING",
          transferCode,
          bankName: freshUser.bankName,
        },
        message: "Withdrawal initiated. Funds will arrive in your account shortly.",
      });
    } catch (paystackErr: any) {
      console.error(`[wallet/withdraw] Paystack transfer error for payout ${payoutId}:`, paystackErr?.message);

      // Refund the wallet balance on Paystack initiation failure
      await db.payout.update({
        where: { id: payoutId },
        data: {
          status: "FAILED",
          failureReason: paystackErr?.message || "Paystack transfer call failed",
        },
      });

      await db.wallet.updateMany({
        where: { id: wallet.id },
        data: { balance: { increment: amount } },
      });

      try {
        await db.walletLedgerEntry.create({
          data: {
            id: randomBytes(12).toString("hex"),
            walletId: wallet.id,
            type: "CREDIT",
            amount,
            balanceBefore: balanceAfter,
            balanceAfter: balanceBefore,
            description: `Refund — withdrawal ${payoutId} failed at payment gateway`,
            createdAt: new Date(),
          },
        });
      } catch (_) {}

      try {
        await sendNotification({
          userId: user.id,
          title: "Withdrawal Failed",
          message: `Your withdrawal of ₦${amount.toLocaleString()} failed and was refunded to your wallet.`,
          type: "PAYOUT",
        });
      } catch (notifyErr: any) {
        console.error("[wallet/withdraw] failure notification failed:", notifyErr?.message ?? notifyErr);
      }

      try {
        await sendWithdrawalFailedEmail({
          userId: user.id,
          email: freshUser.email,
          name: freshUser.name,
          amount,
          reason: paystackErr?.message,
        });
      } catch (emailErr: any) {
        console.error("[wallet/withdraw] failed-withdrawal email failed:", emailErr?.message ?? emailErr);
      }

      return NextResponse.json(
        {
          error: `Payment transfer failed: ${paystackErr?.message || "Unknown error"}. Your wallet balance has been refunded.`,
        },
        { status: 502 },
      );
    }
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error("[wallet/withdraw POST] unexpected error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to process withdrawal." },
      { status: 500 },
    );
  }
}
