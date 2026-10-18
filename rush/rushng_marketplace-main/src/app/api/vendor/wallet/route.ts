import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getOrCreateVendorWallet } from "@/lib/payments/vendor-wallet";

/**
 * GET /api/vendor/wallet
 *
 * Returns the calling vendor's wallet balances + recent ledger entries.
 *
 *   pendingBalance   — funds from paid-but-not-yet-delivered orders
 *                      (not withdrawable yet)
 *   availableBalance — funds from delivered orders (withdrawable)
 *
 * Also returns the 20 most recent ledger entries so the vendor can
 * see the audit trail (credits on payment, releases on delivery,
 * debits on withdrawal, refunds on failed payouts).
 */
export async function GET() {
  try {
    const user = await requireUser();
    const vendorProfile = (user as any).vendorProfile;
    if (!vendorProfile) {
      return NextResponse.json(
        { error: "Open a vendor store first." },
        { status: 403 },
      );
    }

    const wallet = await getOrCreateVendorWallet(vendorProfile.id);
    const entries = await db.vendorWalletLedgerEntry.findMany({
      where: { vendorWalletId: wallet.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    return NextResponse.json({
      wallet: {
        id: wallet.id,
        pendingBalance: wallet.pendingBalance ?? 0,
        availableBalance: wallet.availableBalance ?? 0,
        // Total ever credited — useful for the dashboard "lifetime earnings" stat.
        // Computed from ledger entries sum to avoid a separate field.
      },
      ledger: entries.map((e) => ({
        id: e.id,
        type: e.type, // CREDIT | RELEASE | REVERSAL | DEBIT | REFUND
        bucket: e.bucket, // PENDING | AVAILABLE
        amount: e.amount,
        balanceBefore: e.balanceBefore,
        balanceAfter: e.balanceAfter,
        description: e.description,
        linkedOrderId: e.linkedOrderId,
        linkedPayoutId: e.linkedPayoutId,
        createdAt: e.createdAt instanceof Date ? e.createdAt.toISOString() : e.createdAt,
      })),
    });
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error("[vendor/wallet GET] error", err);
    return NextResponse.json(
      { error: err?.message || "Failed to load wallet." },
      { status: 500 },
    );
  }
}
