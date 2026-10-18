import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

/** GET /api/admin/providers — every provider, with owner + job stats. */
export async function GET() {
  try {
    await requireAdmin();

    const providers = await db.provider.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { id: true, name: true, email: true, capabilities: true },
        },
        _count: { select: { jobs: true, services: true } },
      },
    });

    const transformed = providers.map((p) => ({
      id: p.id,
      businessName: p.businessName,
      slug: p.slug,
      category: p.category,
      location: p.location,
      rating: p.rating,
      reviewCount: p.reviewCount,
      startingPrice: p.startingPrice,
      verified: p.verified,
      completedJobs: p.completedJobs,
      createdAt: p.createdAt.toISOString(),
      owner: {
        id: p.user.id,
        name: p.user.name,
        email: p.user.email,
        capabilities: JSON.parse(p.user.capabilities),
      },
      serviceCount: p._count.services,
      jobCount: p._count.jobs,
    }));

    return NextResponse.json({ providers: transformed });
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error("[admin/providers GET] error", err);
    return NextResponse.json({ error: "Failed to load providers" }, { status: 500 });
  }
}
