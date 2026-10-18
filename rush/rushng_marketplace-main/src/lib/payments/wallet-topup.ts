import "server-only";

/**
 * Customer wallet top-ups (Paystack → Rush wallet).
 *
 * A top-up is a Payment with `purpose: "WALLET_TOPUP"` and no orderId.
 * Both /api/payments/verify (browser) and /api/payments/webhook
 * (Paystack) can confirm it; `creditWalletTopUp` guarantees the wallet
 * is credited exactly once no matter which arrives first, or both.
 */

import { randomBytes } from "node:crypto";
import { db } from "@/lib/db";

export const MIN_TOPUP_NAIRA = 100;
export const MAX_TOPUP_NAIRA = 500_000;
export const WALLET_TOPUP = "WALLET_TOPUP";

export const isWalletTopUp = (payment: { purpose?: string | null }) =>
  payment.purpose === WALLET_TOPUP;

/** Existing wallet, or a fresh ₦0 one (unique userId index settles races). */
async function getOrCreateWallet(userId: string) {
  const existing = await db.wallet.findUnique({ where: { userId } });
  if (existing) return existing;
  try {
    return await db.wallet.create({ data: { userId, balance: 0 } });
  } catch (err: any) {
    if (err?.code === 11000) return db.wallet.findUnique({ where: { userId } });
    throw err;
  }
}

/**
 * Credit the customer wallet for a SUCCESSFUL top-up payment.
 * Returns true if THIS call credited, false if it was already credited.
 */
export async function creditWalletTopUp(payment: {
  reference: string;
  customerId: string;
  amount: number;
}): Promise<boolean> {
  // ── Claim: only the caller that flips walletCreditedAt null → date wins.
  //    `walletCreditedAt: null` matches missing-or-null in Mongo.
  const claim = await db.payment.updateMany({
    where: { reference: payment.reference, walletCreditedAt: null },
    data: { walletCreditedAt: new Date() },
  });
  if (claim.count === 0) return false; // already credited

  try {
    const wallet = await getOrCreateWallet(payment.customerId);
    const balanceBefore = wallet.balance ?? 0;

    // ── Atomic $inc — safe against concurrent spends/top-ups.
    await db.wallet.updateMany({
      where: { id: wallet.id },
      data: { balance: { increment: payment.amount } },
    });

    // ── Audit row. A ledger failure never undoes a successful credit.
    await db.walletLedgerEntry
      .create({
        data: {
          id: randomBytes(12).toString("hex"),
          walletId: wallet.id,
          type: "CREDIT",
          amount: payment.amount,
          balanceBefore,
          balanceAfter: balanceBefore + payment.amount,
          description: "Wallet top-up via Paystack",
          linkedPaymentRef: payment.reference,
          createdAt: new Date(),
        },
      })
      .catch((e: any) =>
        console.error("[wallet-topup] ledger entry failed (credit succeeded):", e?.message ?? e),
      );

    console.log(`[wallet-topup] user=${payment.customerId} +₦${payment.amount} ref=${payment.reference}`);
    return true;
  } catch (err) {
    // ── Release the claim so verify/webhook retries can credit later.
    await db.payment.updateMany({
      where: { reference: payment.reference },
      data: { walletCreditedAt: null },
    });
    throw err;
  }
}
