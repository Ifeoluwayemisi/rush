import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { initiateTransfer } from "@/lib/payments/paystack";
import {
  getOrCreateVendorWallet,
  debitVendorAvailable,
  MIN_WITHDRAWAL_NAIRA,
} from "@/lib/payments/vendor-wallet";
import { randomBytes } from "node:crypto";

/**
 * POST /api/vendor/payouts/withdraw
 *
 * Body: { amount: number }
 *
 * Vendor requests a withdrawal to their saved bank account.
 *
 * Flow:
 *   1. Validate amount (≥ ₦1,000 floor, numeric, positive).
 *   2. Load the vendor profile + confirm they have a saved bank
 *      account with a Paystack recipient_code.
 *   3. Atomically debit the vendor's AVAILABLE balance
 *      (compare-and-swap to prevent overdraft).
 *   4. Create a Payout record with status=PENDING.
 *   5. Call Paystack's initiateTransfer with the stored recipient_code.
 *   6. Store the returned transferCode on the Payout (used by the
 *      webhook to match transfer.success / transfer.failed events).
 *
 * The actual settlement is asynchronous — Paystack fires a webhook
 * (transfer.success or transfer.failed) within minutes. On failure,
 * the webhook handler refunds the vendor's available balance.
 *
 * If the Paystack initiate call fails AFTER the debit, we immediately
 * reverse the debit (refund the available balance) so the vendor
 * isn't stuck without their funds.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const vendorProfile = (user as any).vendorProfile;
    if (!vendorProfile) {
      return NextResponse.json(
        { error: "Open a vendor store before withdrawing." },
        { status: 403 },
      );
    }

    const body = await req.json();
    const amount = Number(body.amount);

    // ─── Validation ──────────────────────────────────────────────────
    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json(
        { error: "Enter a valid amount." },
        { status: 400 },
      );
    }
    if (amount < MIN_WITHDRAWAL_NAIRA) {
      return NextResponse.json(
        {
          error: `Minimum withdrawal is ₦${MIN_WITHDRAWAL_NAIRA.toLocaleString()}.`,
          min: MIN_WITHDRAWAL_NAIRA,
        },
        { status: 400 },
      );
    }

    // ─── Bank account gate ───────────────────────────────────────────
    const freshVendor = await db.vendorProfile.findUnique({
      where: { id: vendorProfile.id },
      select: {
        businessName: true,
        bankAccountNumber: true,
        bankAccountName: true,
        bankName: true,
        paystackRecipientCode: true,
        bankAccountVerified: true,
      },
    });
    if (!freshVendor?.paystackRecipientCode) {
      return NextResponse.json(
        {
          error:
            "Add a verified bank account before requesting a withdrawal. " +
            "Go to Settings → Payouts to set one up.",
        },
        { status: 400 },
      );
    }

    // ─── Atomic debit of available balance ───────────────────────────
    const debit = await debitVendorAvailable(vendorProfile.id, amount);
    if (!debit) {
      const wallet = await getOrCreateVendorWallet(vendorProfile.id);
      return NextResponse.json(
        {
          error:
            `Insufficient available balance. You have ₦${(wallet.availableBalance ?? 0).toLocaleString()} ` +
            `available to withdraw (pending funds become available when orders are delivered).`,
          available: wallet.availableBalance ?? 0,
          requested: amount,
        },
        { status: 402 }, // Payment Required
      );
    }

    // ─── Create Payout record ────────────────────────────────────────
    const payoutId = randomBytes(12).toString("hex");
    const payout = await db.payout.create({
      data: {
        id: payoutId,
        vendorId: vendorProfile.id,
        amount,
        currency: "NGN",
        status: "PENDING",
        recipientCode: freshVendor.paystackRecipientCode,
        bankAccountNumber: freshVendor.bankAccountNumber,
        bankAccountName: freshVendor.bankAccountName,
        bankName: freshVendor.bankName,
        description: `Withdrawal by ${freshVendor.businessName}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    // Write a debit ledger entry for the audit trail.
    try {
      await db.vendorWalletLedgerEntry.create({
        data: {
          id: randomBytes(12).toString("hex"),
          vendorWalletId: debit.walletId,
          type: "DEBIT",
          bucket: "AVAILABLE",
          amount,
          balanceBefore: debit.balanceBefore,
          balanceAfter: debit.balanceBefore - amount,
          description: `Withdrawal to ${freshVendor.bankName} (${freshVendor.bankAccountNumber})`,
          linkedPayoutId: payoutId,
          createdAt: new Date(),
        },
      });
    } catch (ledgerErr: any) {
      console.error(
        "[vendor/payouts/withdraw] ledger entry failed (debit was successful):",
        ledgerErr?.message ?? ledgerErr,
      );
    }

    // ─── Call Paystack to initiate the transfer ──────────────────────
    let transferCode: string | null = null;
    let paystackReference: string | null = null;
    try {
      const transfer = await initiateTransfer(
        freshVendor.paystackRecipientCode,
        amount,
        `Rush payout — ${freshVendor.businessName}`,
      );
      transferCode = transfer.transferCode;
      paystackReference = transfer.reference;

      await db.payout.update({
        where: { id: payoutId },
        data: {
          reference: paystackReference,
          transferCode,
          providerResponse: JSON.stringify(transfer),
        },
      });
    } catch (paystackErr: any) {
      // ⚠ Paystack call failed AFTER we debited the vendor. Reverse
      // the debit so they're not stuck without their funds.
      console.error(
        `[vendor/payouts/withdraw] Paystack initiate failed for payout ${payoutId}:`,
        paystackErr?.message ?? paystackErr,
      );
      await db.payout.update({
        where: { id: payoutId },
        data: {
          status: "FAILED",
          failureReason: paystackErr?.message || "Paystack initiate failed",
          providerResponse: JSON.stringify({ error: paystackErr?.message }),
        },
      });
      // Refund the available balance.
      const { refundVendorAvailableOnFailedPayout } = await import(
        "@/lib/payments/vendor-wallet"
      );
      await refundVendorAvailableOnFailedPayout({
        vendorId: vendorProfile.id,
        amount,
        payoutId,
      });

      return NextResponse.json(
        {
          error:
            `Paystack couldn't process the transfer: ${paystackErr?.message || "unknown error"}. ` +
            `Your available balance has been refunded.`,
          payoutId,
        },
        { status: 502 }, // Bad Gateway — upstream failure
      );
    }

    console.log(
      `[vendor/payouts/withdraw] vendor=${vendorProfile.id} payout=${payoutId} amount=₦${amount} transfer=${transferCode}`,
    );

    return NextResponse.json({
      ok: true,
      payout: {
        id: payoutId,
        amount,
        status: "PENDING",
        transferCode,
        reference: paystackReference,
        bankName: freshVendor.bankName,
        bankAccountNumber: freshVendor.bankAccountNumber,
        createdAt: payout.createdAt.toISOString(),
      },
      message:
        "Withdrawal initiated. Funds will arrive in your bank account within a few minutes. " +
        "You'll get a notification when it settles.",
    });
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error("[vendor/payouts/withdraw POST] error", err);
    return NextResponse.json(
      { error: err?.message || "Failed to process withdrawal." },
      { status: 500 },
    );
  }
}
