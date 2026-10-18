import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

/** GET /api/admin/products — every product across all vendors. */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const products = await db.product.findMany({
      orderBy: { createdAt: "desc" },
      take: 300,
      include: {
        vendor: {
          select: { id: true, businessName: true, slug: true },
        },
      },
    });

    const transformed = products.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category,
      price: p.price,
      compareAtPrice: p.compareAtPrice ?? undefined,
      stock: p.stock,
      rating: p.rating,
      reviewCount: p.reviewCount,
      condition: p.condition ?? undefined,
      images: JSON.parse(p.images),
      tags: JSON.parse(p.tags),
      createdAt: p.createdAt.toISOString(),
      vendor: p.vendor,
    }));

    return NextResponse.json({ products: transformed });
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error("[admin/products GET] error", err);
    return NextResponse.json({ error: "Failed to load products" }, { status: 500 });
  }
}
