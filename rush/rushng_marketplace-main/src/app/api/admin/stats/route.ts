import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

/**
 * GET /api/admin/stats
 *
 * Top-line counts for the admin dashboard. Single round-trip instead
 * of one query per metric, since this is the page admins open first.
 *
 * Authorization: a user with the ACTIVE ADMIN capability.
 */
export async function GET() {
  try {
    await requireAdmin();

    const [
      users,
      vendors,
      providers,
      riders,
      products,
      openOrders,
      activeRides,
      openServiceJobs,
      pendingRiders,
      pendingProviders,
      pendingKyc,
    ] = await Promise.all([
      db.user.count(),
      db.vendorProfile.count(),
      db.provider.count(),
      db.riderProfile.count(),
      db.product.count(),
      db.order.count({ where: { status: { not: "DELIVERED" } } }),
      db.ride.count({ where: { status: { in: ["SEARCHING", "ASSIGNED", "IN_PROGRESS"] } } }),
      db.serviceJob.count({ where: { status: "OPEN" } }),
      db.riderProfile.count({ where: { status: "PENDING_VERIFICATION" } }),
      db.user.count({
        where: {
          capabilities: { contains: "PENDING_VERIFICATION" },
        },
      }),
      // Vendor KYC submissions awaiting admin review.
      db.vendorProfile.count({ where: { kycStatus: "PENDING" } }),
    ]);

    // Pending providers are tracked inside the capabilities JSON of users
    // who onboarded as a provider but aren't verified yet. We approximate
    // the count by looking at provider records whose user has the
    // capability in PENDING_VERIFICATION status — cheaper than a JSON
    // array scan in SQLite. For the MVP this is sufficient.
    const pendingProviderCount = await db.provider.count({
      where: { verified: false },
    });

    return NextResponse.json({
      users,
      vendors,
      providers,
      riders,
      products,
      openOrders,
      activeRides,
      openServiceJobs,
      pendingVerifications: pendingRiders + pendingProviderCount + pendingKyc,
      pendingRiders,
      pendingProviders: pendingProviderCount,
      pendingKyc,
    });
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error("[admin/stats GET] error", err);
    return NextResponse.json({ error: "Failed to load stats" }, { status: 500 });
  }
}
