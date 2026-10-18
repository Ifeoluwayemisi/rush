import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { randomBytes } from "node:crypto";
import { creditVendorPending } from "@/lib/payments/vendor-wallet";
import { sendNotification } from "@/lib/notify";
import { sendWalletDebitEmail } from "@/lib/email/wallet";

/**
 * POST /api/wallet/debit
 *
 * Body: { orderId: string }
 *
 * Atomic wallet payment for an order. The flow:
 *   1. Load the order, ensure it belongs to the caller + isn't already paid.
 *   2. Load the caller's wallet.
 *   3. Atomically decrement wallet.balance if balance >= order.total
 *      (uses Mongo's $inc with a `where: { balance: { gte: total } }`
 *      precondition to prevent overdrafts under concurrent writes).
 *   4. Write a WalletLedgerEntry recording the debit (type=DEBIT,
 *      amount, balanceBefore, balanceAfter, description, linkedOrderId).
 *   5. Mark the order CONFIRMED.
 *   6. Credit the vendor's pending balance.
 *   7. Notify + email the customer.
 *
 * Returns the new wallet balance + the order id.
 *
 * Why this is its own endpoint (vs. handling wallet inline in
 * /api/orders or /api/payments): the wallet is the ONLY payment method
 * where Rush itself holds the funds — there's no third-party gateway.
 * So the accounting has to happen on our side, with our own ledger.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();

    if (!user.emailVerified) {
      return NextResponse.json(
        { error: "Please verify your email address before initiating wallet withdrawals or transfers." },
        { status: 403 },
      );
    }

    const body = await req.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json({ error: "orderId is required" }, { status: 400 });
    }

    // 1. Load the order.
    const order = await db.order.findUnique({ where: { id: orderId } });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }
    if (order.customerId !== user.id) {
      return NextResponse.json(
        { error: "You don't own this order" },
        { status: 403 },
      );
    }
    // Allow debit only when the order is still PLACED (i.e. awaiting
    // payment). Once confirmed, the wallet was already debited.
    if (order.status !== "PLACED") {
      return NextResponse.json(
        { error: `Order is ${order.status.toLowerCase()} — cannot pay from wallet.` },
        { status: 400 },
      );
    }

    // 2. Load the wallet.
    const wallet = await db.wallet.findUnique({ where: { userId: user.id } });
    if (!wallet) {
      return NextResponse.json(
        { error: "You don't have a Rush wallet. Contact support." },
        { status: 404 },
      );
    }

    const balanceBefore = wallet.balance ?? 0;
    const amount = order.total ?? 0;
    if (amount <= 0) {
      return NextResponse.json(
        { error: "Order total is zero — nothing to debit." },
        { status: 400 },
      );
    }
    if (balanceBefore < amount) {
      return NextResponse.json(
        {
          error: `Insufficient wallet balance. You have ₦${balanceBefore.toLocaleString()} but the order total is ₦${amount.toLocaleString()}.`,
          balance: balanceBefore,
          required: amount,
          shortfall: amount - balanceBefore,
        },
        { status: 402 }, // Payment Required
      );
    }

    // 3. Atomic debit. The `where.balance.gte` precondition means
    //    if another concurrent payment dropped the balance below
    //    `amount` between our read and our write, the updateMany
    //    matches 0 docs and we return a 409. This is the canonical
    //    Mongo pattern for atomic compare-and-swap on a numeric field.
    const debitResult = await db.wallet.updateMany({
      where: { id: wallet.id, balance: { gte: amount } },
      data: { balance: { decrement: amount } },
    });
    if (debitResult.count === 0) {
      // Race lost — someone else just spent from this wallet.
      return NextResponse.json(
        { error: "Wallet balance changed during payment. Please try again." },
        { status: 409 },
      );
    }

    const balanceAfter = balanceBefore - amount;

    // 4. Ledger entry — the audit trail. We write this AFTER the
    //    debit succeeds; if the ledger write fails, the debit is
    //    still good (the wallet is debited) but we lose the audit
    //    row. We log loudly and continue — never roll back a
    //    successful debit due to a ledger failure.
    try {
      await db.walletLedgerEntry.create({
        data: {
          id: randomBytes(12).toString("hex"),
          walletId: wallet.id,
          type: "DEBIT",
          amount,
          balanceBefore,
          balanceAfter,
          description: `Payment for order ${order.code}`,
          linkedOrderId: order.id,
          createdAt: new Date(),
        },
      });
    } catch (ledgerErr: any) {
      console.error(
        "[wallet/debit] ledger entry failed (debit was successful):",
        ledgerErr?.message ?? ledgerErr,
      );
    }

    // 5. Mark the order CONFIRMED. Vendors can now accept it.
    await db.order.update({
      where: { id: order.id },
      data: { status: "CONFIRMED" },
    });

    // 6. Credit the vendor's PENDING balance with the full item subtotal.
    //    Same logic as the Paystack verify route — the vendor gets the
    //    subtotal (no commission deduction; commission was added on top
    //    at checkout). Idempotent — creditVendorPending checks for an
    //    existing CREDIT entry on this orderId.
    if (order.vendorId && order.subtotal > 0) {
      try {
        await creditVendorPending({
          vendorId: order.vendorId,
          amount: order.subtotal,
          linkedOrderId: order.id,
          description: `Wallet payment for order ${order.code}`,
        });
      } catch (e: any) {
        console.error(
          `[wallet/debit] vendor credit failed for order ${order.id}:`,
          e?.message ?? e,
        );
      }
    }

    // 7. Notify + email the customer. Non-fatal — the debit already
    //    succeeded, so a notification/email hiccup shouldn't surface
    //    as an error to the client.
    try {
      await sendNotification({
        userId: user.id,
        title: "Wallet Debit",
        message: `₦${amount.toLocaleString()} debited for order ${order.code}.`,
        type: "WALLET_UPDATE",
      });
    } catch (notifyErr: any) {
      console.error("[wallet/debit] notification failed:", notifyErr?.message ?? notifyErr);
    }

    try {
      await sendWalletDebitEmail({
        userId: user.id,
        email: user.email,
        name: user.name,
        amount,
        balanceAfter,
        reason: `Payment for order ${order.code}`,
      });
    } catch (emailErr: any) {
      console.error("[wallet/debit] email failed:", emailErr?.message ?? emailErr);
    }

    console.log(
      `[wallet/debit] user=${user.id} order=${order.code} debited ₦${amount} (balance ₦${balanceBefore} → ₦${balanceAfter})`,
    );

    return NextResponse.json({
      ok: true,
      orderId: order.id,
      balance: balanceAfter,
      amount,
    });
  } catch (err: any) {
    if (err instanceof Response) throw err;
    console.error("[wallet/debit POST] error", err);
    return NextResponse.json(
      { error: err.message || "Failed to debit wallet" },
      { status: 500 },
    );
  }
}
