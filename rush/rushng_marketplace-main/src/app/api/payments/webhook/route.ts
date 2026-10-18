import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getPaymentProvider } from "@/lib/payments/provider";
import { creditVendorPending, refundVendorAvailableOnFailedPayout } from "@/lib/payments/vendor-wallet";
import { verifyTransfer } from "@/lib/payments/paystack";
import { creditWalletTopUp, isWalletTopUp } from "@/lib/payments/wallet-topup";
import { sendNotification } from "@/lib/notify";
import { sendWithdrawalPaidEmail, sendWithdrawalFailedEmail } from "@/lib/email/wallet";

/**
 * POST /api/payments/webhook
 *
 * Paystack webhook handler — authoritative source of truth for charges
 * and transfer payouts/withdrawals.
 */
export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get("x-paystack-signature");

    const provider = getPaymentProvider();
    const valid = await provider.verifyWebhookSignature(rawBody, signature);
    if (!valid) {
      console.warn("[payments/webhook] invalid signature — ignoring");
      return NextResponse.json({ ok: true, ignored: true });
    }

    const event = JSON.parse(rawBody);
    const eventType = event.event as string;

    // ─── Charge events (customer → Rush) ───────────────────────────────
    if (eventType === "charge.success") {
      return await _handleChargeSuccess(event, provider);
    }

    // ─── Transfer events (Rush → vendor or customer wallet withdrawal) ─
    if (
      eventType === "transfer.success" ||
      eventType === "transfer.failed" ||
      eventType === "transfer.reversed"
    ) {
      return await _handleTransferEvent(event, eventType);
    }

    // Other unhandled events
    return NextResponse.json({ ok: true, ignored: true });
  } catch (err: any) {
    console.error("[payments/webhook] error", err);
    return NextResponse.json({ ok: true });
  }
}

/**
 * Handle `charge.success`.
 */
async function _handleChargeSuccess(event: any, provider: ReturnType<typeof getPaymentProvider>) {
  const reference = event.data?.reference;
  if (!reference) {
    console.warn("[payments/webhook] charge.success missing reference");
    return NextResponse.json({ ok: true });
  }

  // Defense in depth: re-verify with Paystack's API
  const verified = await provider.verify(reference);
  if (verified.status !== "success") {
    console.warn(`[payments/webhook] verify returned ${verified.status} for ${reference}`);
    return NextResponse.json({ ok: true });
  }

  const payment = await db.payment.findUnique({ where: { reference } });
  if (!payment) {
    console.warn(`[payments/webhook] unknown reference ${reference}`);
    return NextResponse.json({ ok: true });
  }

  // Amount verification
  if (payment.amount && verified.amountNaira > 0 && Math.abs(verified.amountNaira - payment.amount) > 1) {
    console.error(
      `[payments/webhook] amount mismatch for ${reference}: gateway=${verified.amountNaira} naira, payment=${payment.amount} naira`,
    );
    await db.payment.update({
      where: { reference },
      data: {
        status: "FAILED",
        providerResponse: JSON.stringify({
          ...verified,
          mismatchReason: `amount ${verified.amountNaira} ≠ payment.amount ${payment.amount}`,
        }),
      },
    });
    return NextResponse.json({ ok: true });
  }

  if (payment.status !== "SUCCESS") {
    await db.payment.update({
      where: { reference },
      data: { status: "SUCCESS", providerResponse: verified as any },
    });
  }

  // ─── Wallet top-up ───────────────────────────────────────────────────
  if (isWalletTopUp(payment)) {
    try {
      await creditWalletTopUp(payment);
    } catch (e: any) {
      console.error(`[payments/webhook] wallet credit failed for ${reference}:`, e?.message ?? e);
      return NextResponse.json({ ok: false }, { status: 500 });
    }
    return NextResponse.json({ ok: true });
  }

  // ─── Order payment ───────────────────────────────────────────────────
  if (payment.orderId) {
    const order = await db.order.findUnique({ where: { id: payment.orderId } });
    if (order && order.status === "PLACED") {
      await db.order.update({
        where: { id: order.id },
        data: { status: "CONFIRMED" },
      });

      if (order.vendorId && order.subtotal > 0) {
        try {
          await creditVendorPending({
            vendorId: order.vendorId,
            amount: order.subtotal,
            linkedOrderId: order.id,
            description: `Payment for order ${order.code}`,
          });
        } catch (e: any) {
          console.error(`[payments/webhook] vendor credit failed for order ${order.id}:`, e?.message ?? e);
        }
      }
    }
  }

  return NextResponse.json({ ok: true });
}

/**
 * Handle `transfer.success` / `transfer.failed` / `transfer.reversed`
 * Manages vendor payouts and customer wallet withdrawals.
 */
async function _handleTransferEvent(event: any, eventType: string) {
  const transferCode = event.data?.transfer_code;
  if (!transferCode) {
    console.warn(`[payments/webhook] ${eventType} missing transfer_code`);
    return NextResponse.json({ ok: true });
  }

  const payout = await db.payout.findFirst({
    where: { transferCode },
  });
  if (!payout) {
    console.warn(`[payments/webhook] ${eventType} — unknown transfer ${transferCode}`);
    return NextResponse.json({ ok: true });
  }

  // Already settled
  if (payout.status === "SUCCESS" || payout.status === "FAILED") {
    return NextResponse.json({ ok: true });
  }

  let paystackStatus: string = eventType === "transfer.success" ? "success" : "failed";
  let failureReason: string | null | undefined = null;
  try {
    const verified = await verifyTransfer(transferCode);
    paystackStatus = verified.status;
    failureReason = verified.failureReason ?? null;
  } catch (e: any) {
    console.warn(`[payments/webhook] transfer verify failed (trusting webhook body): ${e?.message ?? e}`);
  }

  if (paystackStatus === "success") {
    await db.payout.update({
      where: { id: payout.id },
      data: {
        status: "SUCCESS",
        paidAt: new Date(),
        providerResponse: JSON.stringify({ event, verified: paystackStatus }),
      },
    });
    console.log(`[payments/webhook] payout ${payout.id} SUCCESS (₦${payout.amount})`);

    // ─── Notify + email customer withdrawals only ──────────────────────
    // (vendor payouts don't get a customer-facing notification here)
    if (payout.userId) {
      const user = await db.user.findUnique({ where: { id: payout.userId } });
      if (user) {
        try {
          await sendNotification({
            userId: user.id,
            title: "Withdrawal Sent",
            message: `₦${payout.amount.toLocaleString()} was successfully paid into your account.`,
            type: "PAYOUT",
          });
        } catch (notifyErr: any) {
          console.error(`[payments/webhook] notification failed for payout ${payout.id}:`, notifyErr?.message ?? notifyErr);
        }

        try {
          await sendWithdrawalPaidEmail({
            userId: user.id,
            email: user.email,
            name: user.name,
            amount: payout.amount,
            bankName: payout.bankName || "Bank",
            accountNumber: payout.bankAccountNumber || "",
          });
        } catch (emailErr: any) {
          console.error(`[payments/webhook] paid email failed for payout ${payout.id}:`, emailErr?.message ?? emailErr);
        }
      }
    }
  } else {
    // FAILED or REVERSED — reverse the debit
    await db.payout.update({
      where: { id: payout.id },
      data: {
        status: "FAILED",
        failureReason: failureReason || `Paystack reported ${eventType}`,
        providerResponse: JSON.stringify({ event, verified: paystackStatus }),
      },
    });

    try {
      if (payout.vendorId) {
        // Vendor payout — refund vendor available balance
        await refundVendorAvailableOnFailedPayout({
          vendorId: payout.vendorId,
          amount: payout.amount,
          payoutId: payout.id,
        });
        console.log(`[payments/webhook] payout ${payout.id} FAILED — refunded ₦${payout.amount} to vendor ${payout.vendorId}`);
      } else if (payout.userId) {
        // Customer withdrawal — refund customer wallet
        const wallet = await db.wallet.findUnique({
          where: { userId: payout.userId },
        });

        if (wallet) {
          const balanceBefore = wallet.balance ?? 0;
          await db.wallet.updateMany({
            where: { id: wallet.id },
            data: { balance: { increment: payout.amount } },
          });

          try {
            const { randomBytes } = await import("node:crypto");
            await db.walletLedgerEntry.create({
              data: {
                id: randomBytes(12).toString("hex"),
                walletId: wallet.id,
                type: "CREDIT",
                amount: payout.amount,
                balanceBefore,
                balanceAfter: balanceBefore + payout.amount,
                description: `Refund — withdrawal ${payout.id} failed at Paystack`,
                createdAt: new Date(),
              },
            });
          } catch (ledgerErr: any) {
            console.warn("[payments/webhook] ledger write failed:", ledgerErr?.message);
          }

          console.log(`[payments/webhook] payout ${payout.id} FAILED — refunded ₦${payout.amount} to wallet ${wallet.id}`);

          const user = await db.user.findUnique({ where: { id: payout.userId } });
          if (user) {
            try {
              await sendNotification({
                userId: user.id,
                title: "Withdrawal Failed",
                message: `Your withdrawal of ₦${payout.amount.toLocaleString()} failed and was returned to your wallet.`,
                type: "PAYOUT",
              });
            } catch (notifyErr: any) {
              console.error(`[payments/webhook] failure notification failed for payout ${payout.id}:`, notifyErr?.message ?? notifyErr);
            }

            try {
              await sendWithdrawalFailedEmail({
                userId: user.id,
                email: user.email,
                name: user.name,
                amount: payout.amount,
                reason: failureReason || undefined,
              });
            } catch (emailErr: any) {
              console.error(`[payments/webhook] failed-withdrawal email failed for payout ${payout.id}:`, emailErr?.message ?? emailErr);
            }
          }
        }
      }
    } catch (e: any) {
      console.error(`[payments/webhook] refund failed for payout ${payout.id}:`, e?.message ?? e);
    }
  }

  return NextResponse.json({ ok: true });
}
