import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { publicKycView } from "@/lib/kyc";

/**
 * GET /api/admin/vendors
 *
 * All vendor profiles, regardless of visibility, with their owner user
 * — for the admin marketplace pane. Admins need to see LINK_ONLY and
 * PRIVATE stores even though the public /api/stores endpoint filters
 * those out.
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const vendors = await db.vendorProfile.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            capabilities: true,
          },
        },
        _count: { select: { products: true, orders: true } },
      },
    });

    const transformed = vendors.map((v) => ({
      id: v.id,
      businessName: v.businessName,
      slug: v.slug,
      category: v.category,
      location: v.location,
      visibility: v.visibility,
      rating: v.rating,
      reviewCount: v.reviewCount,
      followers: v.followers,
      verified: v.verified,
      // Admin vendors list shows the public KYC view (tier, status,
      // verifiedAt). For the full PII view (ID card URL, residential
      // address), admins use /api/admin/kyc.
      kyc: publicKycView(v),
      createdAt: v.createdAt.toISOString(),
      owner: {
        id: v.user.id,
        name: v.user.name,
        email: v.user.email,
        capabilities: JSON.parse(v.user.capabilities),
      },
      productCount: v._count.products,
      orderCount: v._count.orders,
    }));

    return NextResponse.json({ vendors: transformed });
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error("[admin/vendors GET] error", err);
    return NextResponse.json({ error: "Failed to load vendors" }, { status: 500 });
  }
}
