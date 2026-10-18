import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

/**
 * GET /api/admin/kyc
 *
 * Returns all vendor profiles whose KYC is in a reviewable state:
 *   - kycStatus = PENDING (queue for review)
 *   - kycStatus = REJECTED (recently rejected, for audit)
 *   - verificationTier = COMMUNITY_EXTERNAL (all external submissions)
 *
 * Supports an optional `?status=PENDING|REJECTED|ALL` filter.
 *
 * The response includes PII (ID card URL, residential address, phone)
 * because admins need it to verify the submission. This route is
 * admin-gated via `requireAdmin`.
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const url = new URL(req.url);
    const statusFilter = url.searchParams.get("status") || "PENDING";

    const where: Record<string, unknown> = {};
    if (statusFilter === "PENDING") {
      where.kycStatus = "PENDING";
    } else if (statusFilter === "REJECTED") {
      where.kycStatus = "REJECTED";
    } else if (statusFilter === "APPROVED") {
      where.kycStatus = "APPROVED";
      where.verificationTier = { not: "UNVERIFIED" };
    } else if (statusFilter === "ALL") {
      // All vendors with any KYC activity (tier != UNVERIFIED or
      // kycStatus != UNSUBMITTED).
      where.OR = [
        { verificationTier: { not: "UNVERIFIED" } },
        { kycStatus: { not: "UNSUBMITTED" } },
      ];
    }

    const vendors = await db.vendorProfile.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            avatar: true,
            createdAt: true,
          },
        },
        _count: { select: { products: true, orders: true } },
      },
      take: 200,
    });

    const transformed = vendors.map((v) => ({
      id: v.id,
      businessName: v.businessName,
      slug: v.slug,
      category: v.category,
      location: v.location,
      verificationTier: v.verificationTier ?? "UNVERIFIED",
      kycStatus: v.kycStatus ?? "UNSUBMITTED",
      institutionalEmail: v.institutionalEmail ?? null,
      matricOrPfNumber: v.matricOrPfNumber ?? null,
      idCardUrl: v.idCardUrl ?? null,
      idType: v.idType ?? null,
      residentialAddress: v.residentialAddress ?? null,
      kycPhone: v.kycPhone ?? null,
      verifiedAt: v.verifiedAt instanceof Date ? v.verifiedAt.toISOString() : v.verifiedAt ?? null,
      rejectionReason: v.rejectionReason ?? null,
      reviewedByAdminId: v.reviewedByAdminId ?? null,
      reviewedAt: v.reviewedAt instanceof Date ? v.reviewedAt.toISOString() : v.reviewedAt ?? null,
      updatedAt: v.updatedAt instanceof Date ? v.updatedAt.toISOString() : v.updatedAt,
      owner: {
        id: v.user.id,
        name: v.user.name,
        email: v.user.email,
        phone: v.user.phone,
        avatar: v.user.avatar,
        createdAt: v.user.createdAt instanceof Date ? v.user.createdAt.toISOString() : v.user.createdAt,
      },
      productCount: v._count.products,
      orderCount: v._count.orders,
    }));

    return NextResponse.json({ vendors: transformed });
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error("[admin/kyc GET] error", err);
    return NextResponse.json(
      { error: "Failed to load KYC submissions" },
      { status: 500 },
    );
  }
}
