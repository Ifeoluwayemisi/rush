import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { safeJsonParse } from "@/lib/safe-json";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const provider = await db.provider.findUnique({
    where: { slug },
    include: { services: true },
  });

  if (!provider) {
    return NextResponse.json({ error: "Provider not found" }, { status: 404 });
  }

  return NextResponse.json({
    provider: {
      id: provider.id,
      userId: provider.userId,
      businessName: provider.businessName,
      slug: provider.slug,
      tagline: provider.tagline,
      description: provider.description,
      category: provider.category,
      coverImage: provider.coverImage,
      avatar: provider.avatar,
      location: provider.location,
      rating: provider.rating,
      reviewCount: provider.reviewCount,
      startingPrice: provider.startingPrice,
      responseTimeMin: provider.responseTimeMin,
      verified: provider.verified,
      completedJobs: provider.completedJobs,
      portfolio: safeJsonParse<string[]>(provider.portfolio, []),
      services: provider.services.map((s) => ({
        id: s.id,
        name: s.name,
        description: s.description,
        price: s.price,
        duration: s.duration,
      })),
    },
  });
}
