import "server-only";

/**
 * Vendor wallet service — manages the per-vendor pending/available balance
 * ledger and the payout lifecycle.
 *
 * Key concepts (mirroring real fintech marketplace escrow):
 *
 *   1. Customer pays → we credit the vendor's PENDING balance with the
 *      full item subtotal (NO commission deduction — commission is added
 *      on top at checkout, not subtracted here).
 *
 *   2. Order reaches DELIVERED → that pending amount moves from PENDING
 *      to AVAILABLE. Until then, the vendor can't withdraw it.
 *
 *   3. Vendor requests a withdrawal → we atomically debit AVAILABLE
 *      (compare-and-swap to prevent overdraft), create a Payout record,
 *      and call Paystack to initiate a transfer.
 *
 *   4. Paystack fires transfer.success / transfer.failed webhooks → we
 *      flip the Payout status. On failure, we credit AVAILABLE back
 *      (reverse the debit).
 *
 * The wallet has TWO numeric balances — `pending` and `available` —
 * rather than one, to enforce the hold period. Both are protected by
 * the same atomic updateMany pattern used in the customer wallet.
 *
 * Commission model:
 *   - 5% added on TOP of the vendor's price at checkout (customer-facing).
 *   - Vendor receives the FULL item subtotal — never deducted.
 *   - Delivery fee is excluded from the commission base (pass-through
 *     to the rider, not Rush's cut).
 */

import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";

/** 5% commission rate, applied to the item subtotal at checkout. */
export const COMMISSION_RATE = 0.05;

/**
 * Minimum withdrawal amount. Set above Paystack's ₦100 minimum to avoid
 * costly micro-transfers (Paystack charges per transfer in some plans).
 */
export const MIN_WITHDRAWAL_NAIRA = 1000;

/**
 * Get or create the vendor wallet for a given vendorId. Idempotent —
 * if the wallet already exists, return it; otherwise create it with
 * zero balances.
 *
 * We use upsert by vendorId (the unique index on vendor_wallets.vendorId
 * prevents races from creating duplicate wallets).
 */
export async function getOrCreateVendorWallet(vendorId: string) {
  const existing = await db.vendorWallet.findUnique({ where: { vendorId } });
  if (existing) return existing;

  try {
    return await db.vendorWallet.create({
      data: {
        id: randomBytes(12).toString("hex"),
        vendorId,
        pendingBalance: 0,
        availableBalance: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  } catch (err: any) {
    // Race: another request created the wallet between our findUnique
    // and create. Re-fetch — the unique index on vendorId guarantees
    // there's now exactly one.
    if (err?.code === 11000 || err?.codeName === "DuplicateKey") {
      return await db.vendorWallet.findUnique({ where: { vendorId } });
    }
    throw err;
  }
}

/**
 * Credit the vendor's PENDING balance on payment success. The amount
 * credited is the FULL item subtotal — commission is NOT deducted here
 * (it's added on top at checkout, so the customer already paid it).
 *
 * Writes an audit ledger entry alongside the balance update.
 *
 * Idempotent: if a ledger entry with the same linkedOrderId already
 * exists, we no-op. This protects against double-crediting if the
 * webhook fires twice for the same payment.
 */
export async function creditVendorPending({
  vendorId,
  amount,
  linkedOrderId,
  description,
}: {
  vendorId: string;
  amount: number;
  linkedOrderId: string;
  description: string;
}) {
  if (amount <= 0) return;

  // Idempotency check — if we already credited this order, don't double-count.
  const existing = await db.vendorWalletLedgerEntry.findFirst({
    where: { linkedOrderId, type: "CREDIT" },
    select: { id: true },
  });
  if (existing) {
    return; // already credited
  }

  const wallet = await getOrCreateVendorWallet(vendorId);
  const balanceBefore = wallet.pendingBalance ?? 0;
  const balanceAfter = balanceBefore + amount;

  // Atomic increment on pending balance.
  await db.vendorWallet.updateMany({
    where: { id: wallet.id },
    data: { pendingBalance: { increment: amount }, updatedAt: new Date() },
  });

  // Audit ledger entry.
  try {
    await db.vendorWalletLedgerEntry.create({
      data: {
        id: randomBytes(12).toString("hex"),
        vendorWalletId: wallet.id,
        type: "CREDIT",
        bucket: "PENDING", // which balance this credit landed in
        amount,
        balanceBefore,
        balanceAfter,
        description,
        linkedOrderId,
        createdAt: new Date(),
      },
    });
  } catch (err: any) {
    console.error(
      "[vendorWallet] credit ledger entry failed (credit was successful):",
      err?.message ?? err,
    );
  }

  console.log(
    `[vendorWallet] vendor=${vendorId} pending credit ₦${amount} (₦${balanceBefore} → ₦${balanceAfter}) order=${linkedOrderId}`,
  );
}

/**
 * Move funds from PENDING → AVAILABLE when an order is delivered.
 *
 * Looks up the original CREDIT ledger entry to find the amount, then
 * atomically decrements pending + increments available. Writes a
 * ledger entry recording the transition.
 *
 * Idempotent: if a RELEASE entry already exists for this order, no-op.
 */
export async function releaseVendorFundsOnDelivery({
  vendorId,
  orderId,
}: {
  vendorId: string;
  orderId: string;
}) {
  // Idempotency — already released?
  const existingRelease = await db.vendorWalletLedgerEntry.findFirst({
    where: { linkedOrderId: orderId, type: "RELEASE" },
    select: { id: true, amount: true },
  });
  if (existingRelease) return;

  // Find the original CREDIT to know how much to release.
  const originalCredit = await db.vendorWalletLedgerEntry.findFirst({
    where: { linkedOrderId: orderId, type: "CREDIT" },
    select: { amount: true },
  });
  if (!originalCredit) {
    // No credit was ever made — order was probably cancelled before
    // payment, or it was a cash-on-delivery order. Nothing to release.
    return;
  }

  const amount = originalCredit.amount ?? 0;
  if (amount <= 0) return;

  const wallet = await getOrCreateVendorWallet(vendorId);
  const pendingBefore = wallet.pendingBalance ?? 0;
  const availableBefore = wallet.availableBalance ?? 0;

  // Guard: don't let pending go negative. This shouldn't happen (we
  // only release what was previously credited), but defense in depth.
  if (pendingBefore < amount) {
    console.warn(
      `[vendorWallet] release skipped — pending ${pendingBefore} < credit ${amount} for order ${orderId}. Possible manual adjustment.`,
    );
    return;
  }

  // Atomic: decrement pending, increment available. Single updateMany
  // so both fields move together (no chance of inconsistency).
  const result = await db.vendorWallet.updateMany({
    where: { id: wallet.id, pendingBalance: { gte: amount } },
    data: {
      pendingBalance: { decrement: amount },
      availableBalance: { increment: amount },
      updatedAt: new Date(),
    },
  });
  if (result.count === 0) {
    // Race — pending balance dropped between our read and write.
    console.warn(
      `[vendorWallet] release race lost for order ${orderId}. Will retry on next delivery webhook.`,
    );
    return;
  }

  // Audit ledger entry.
  try {
    await db.vendorWalletLedgerEntry.create({
      data: {
        id: randomBytes(12).toString("hex"),
        vendorWalletId: wallet.id,
        type: "RELEASE",
        bucket: "AVAILABLE", // released INTO available
        amount,
        balanceBefore: availableBefore,
        balanceAfter: availableBefore + amount,
        description: `Funds released for order ${orderId} (delivered)`,
        linkedOrderId: orderId,
        createdAt: new Date(),
      },
    });
  } catch (err: any) {
    console.error(
      "[vendorWallet] release ledger entry failed (release was successful):",
      err?.message ?? err,
    );
  }

  console.log(
    `[vendorWallet] vendor=${vendorId} release ₦${amount} (pending ₦${pendingBefore} → ₦${pendingBefore - amount}, available ₦${availableBefore} → ₦${availableBefore + amount}) order=${orderId}`,
  );
}

/**
 * Reverse a vendor credit when an order is CANCELLED before delivery.
 *
 * This handles the case where the customer paid (so we credited the
 * vendor's pending balance) but then cancelled before the order was
 * delivered. We debit the pending balance back so the vendor doesn't
 * keep money for an order they didn't fulfil.
 *
 * Idempotent: if a REVERSAL entry already exists for this order, no-op.
 *
 * Note: this does NOT handle the customer refund — that's the job of
 * the order cancellation flow. This only corrects the vendor-side
 * ledger so it matches reality.
 */
export async function reverseVendorCreditOnCancel({
  vendorId,
  orderId,
}: {
  vendorId: string;
  orderId: string;
}) {
  // Idempotency — already reversed?
  const existingReversal = await db.vendorWalletLedgerEntry.findFirst({
    where: { linkedOrderId: orderId, type: "REVERSAL" },
    select: { id: true },
  });
  if (existingReversal) return;

  // Find the original CREDIT.
  const originalCredit = await db.vendorWalletLedgerEntry.findFirst({
    where: { linkedOrderId: orderId, type: "CREDIT" },
    select: { amount: true, bucket: true },
  });
  if (!originalCredit) {
    return; // never credited (e.g. order cancelled before payment)
  }

  const amount = originalCredit.amount ?? 0;
  if (amount <= 0) return;

  const wallet = await getOrCreateVendorWallet(vendorId);
  // Reverse from whichever bucket the credit was originally in.
  // PENDING credits reverse from PENDING; AVAILABLE (released) credits
  // reverse from AVAILABLE.
  const bucket = originalCredit.bucket || "PENDING";
  const balanceBefore =
    bucket === "AVAILABLE" ? wallet.availableBalance ?? 0 : wallet.pendingBalance ?? 0;

  if (balanceBefore < amount) {
    console.warn(
      `[vendorWallet] reversal skipped — ${bucket} ${balanceBefore} < credit ${amount} for order ${orderId}. Manual adjustment needed.`,
    );
    return;
  }

  if (bucket === "AVAILABLE") {
    await db.vendorWallet.updateMany({
      where: { id: wallet.id, availableBalance: { gte: amount } },
      data: { availableBalance: { decrement: amount }, updatedAt: new Date() },
    });
  } else {
    await db.vendorWallet.updateMany({
      where: { id: wallet.id, pendingBalance: { gte: amount } },
      data: { pendingBalance: { decrement: amount }, updatedAt: new Date() },
    });
  }

  try {
    await db.vendorWalletLedgerEntry.create({
      data: {
        id: randomBytes(12).toString("hex"),
        vendorWalletId: wallet.id,
        type: "REVERSAL",
        bucket,
        amount,
        balanceBefore,
        balanceAfter: balanceBefore - amount,
        description: `Credit reversed — order ${orderId} cancelled`,
        linkedOrderId: orderId,
        createdAt: new Date(),
      },
    });
  } catch (err: any) {
    console.error(
      "[vendorWallet] reversal ledger entry failed (reversal was successful):",
      err?.message ?? err,
    );
  }
}

/**
 * Atomically debit the vendor's AVAILABLE balance for a withdrawal.
 *
 * Uses the same compare-and-swap pattern as the customer wallet:
 * `updateMany` with `where: { availableBalance: { gte: amount } }`
 * will match 0 docs if a concurrent withdrawal dropped the balance
 * below `amount` between our read and write. In that case we return
 * `null` and the caller returns a 409 to the client.
 *
 * Returns the wallet's pre-debit available balance on success, or
 * `null` if the debit couldn't be performed (insufficient funds /
 * race lost).
 */
export async function debitVendorAvailable(
  vendorId: string,
  amount: number,
): Promise<{ walletId: string; balanceBefore: number } | null> {
  const wallet = await getOrCreateVendorWallet(vendorId);
  const balanceBefore = wallet.availableBalance ?? 0;

  const result = await db.vendorWallet.updateMany({
    where: { id: wallet.id, availableBalance: { gte: amount } },
    data: { availableBalance: { decrement: amount }, updatedAt: new Date() },
  });
  if (result.count === 0) {
    return null; // insufficient funds or race lost
  }
  return { walletId: wallet.id, balanceBefore };
}

/**
 * Credit the vendor's AVAILABLE balance back when a Paystack transfer
 * FAILS. Used by the webhook handler on `transfer.failed`.
 *
 * Writes a REVERSAL ledger entry so the audit trail shows why the
 * balance went back up.
 */
export async function refundVendorAvailableOnFailedPayout({
  vendorId,
  amount,
  payoutId,
}: {
  vendorId: string;
  amount: number;
  payoutId: string;
}) {
  const wallet = await getOrCreateVendorWallet(vendorId);
  const balanceBefore = wallet.availableBalance ?? 0;

  await db.vendorWallet.updateMany({
    where: { id: wallet.id },
    data: { availableBalance: { increment: amount }, updatedAt: new Date() },
  });

  try {
    await db.vendorWalletLedgerEntry.create({
      data: {
        id: randomBytes(12).toString("hex"),
        vendorWalletId: wallet.id,
        type: "REFUND",
        bucket: "AVAILABLE",
        amount,
        balanceBefore,
        balanceAfter: balanceBefore + amount,
        description: `Refund — payout ${payoutId} failed at Paystack`,
        linkedPayoutId: payoutId,
        createdAt: new Date(),
      },
    });
  } catch (err: any) {
    console.error(
      "[vendorWallet] refund ledger entry failed (refund was successful):",
      err?.message ?? err,
    );
  }
}
