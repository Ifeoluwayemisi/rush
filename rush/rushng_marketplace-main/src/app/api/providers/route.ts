import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { safeJsonParse } from "@/lib/safe-json";

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const category = url.searchParams.get("category");
    const query = url.searchParams.get("q");

    const providers = await db.provider.findMany({
      where: {
        ...(category && category !== "All" ? { category } : {}),
        ...(query
          ? { OR: [
              { businessName: { contains: query } },
              { tagline: { contains: query } },
            ] }
          : {}),
      },
      include: { services: true },
      orderBy: { rating: "desc" },
      take: 50,
    });

    const transformed = providers.map((p) => ({
      id: p.id,
      userId: p.userId,
      businessName: p.businessName,
      slug: p.slug,
      tagline: p.tagline,
      description: p.description,
      category: p.category,
      coverImage: p.coverImage,
      avatar: p.avatar,
      location: p.location,
      rating: p.rating,
      reviewCount: p.reviewCount,
      startingPrice: p.startingPrice,
      responseTimeMin: p.responseTimeMin,
      verified: p.verified,
      completedJobs: p.completedJobs,
      // safeJsonParse — `portfolio` may be undefined/null/malformed
      // for legacy rows. Previously `JSON.parse(p.portfolio)` would
      // throw synchronously inside this .map() and 500 the whole
      // list. Now one bad row returns [] and the rest render fine.
      portfolio: safeJsonParse<string[]>(p.portfolio, []),
      services: p.services.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        price: s.price,
        duration: s.duration,
      })),
    }));

    return NextResponse.json({ providers: transformed });
  } catch (err: any) {
    console.error("[providers GET] error", err?.message ?? err);
    return NextResponse.json(
      { error: "Failed to load providers", details: err?.message },
      { status: 500 },
    );
  }
}
