import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

/**
 * GET /api/vendor/payouts
 *
 * Returns the calling vendor's payout history (most recent first).
 * Includes all statuses (PENDING, SUCCESS, FAILED) so the vendor can
 * see the full audit trail.
 *
 * Capped at 50 most recent. Pagination is a follow-up if a vendor
 * ever has more than 50 payouts (rare).
 */
export async function GET(_req: NextRequest) {
  try {
    const user = await requireUser();
    const vendorProfile = (user as any).vendorProfile;
    if (!vendorProfile) {
      return NextResponse.json(
        { error: "Open a vendor store first." },
        { status: 403 },
      );
    }

    const payouts = await db.payout.findMany({
      where: { vendorId: vendorProfile.id },
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const out = payouts.map((p) => ({
      id: p.id,
      amount: p.amount,
      currency: p.currency,
      status: p.status, // PENDING | SUCCESS | FAILED
      bankName: p.bankName,
      bankAccountNumber: p.bankAccountNumber,
      bankAccountName: p.bankAccountName,
      reference: p.reference,
      transferCode: p.transferCode,
      description: p.description,
      failureReason: p.failureReason,
      createdAt: p.createdAt instanceof Date ? p.createdAt.toISOString() : p.createdAt,
      paidAt: p.paidAt instanceof Date ? p.paidAt.toISOString() : p.paidAt,
    }));

    return NextResponse.json({ payouts: out });
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error("[vendor/payouts GET] error", err);
    return NextResponse.json(
      { error: err?.message || "Failed to load payouts." },
      { status: 500 },
    );
  }
}
