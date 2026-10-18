import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { checkCapability, suspendedMessage, pendingVerificationMessage } from "@/lib/capability";
import { safeJsonParse } from "@/lib/safe-json";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const product = await db.product.findUnique({
    where: { id },
    include: {
      vendor: {
        select: {
          id: true,
          businessName: true,
          slug: true,
          description: true,
          logo: true,
          coverImage: true,
          category: true,
          phone: true,
          whatsapp: true,
          email: true,
          location: true,
          instagram: true,
          tiktok: true,
          facebook: true,
          themeColor: true,
          visibility: true,
          deliveryEnabled: true,
          deliveryFee: true,
          deliveryTimeMin: true,
          rating: true,
          reviewCount: true,
          followers: true,
          verified: true,
        },
      },
    },
  });

  if (!product) {
    return NextResponse.json({ error: "Product not found" }, { status: 404 });
  }

  return NextResponse.json({
    product: {
      id: product.id,
      vendorId: product.vendorId,
      vendorName: product.vendor.businessName,
      vendorSlug: product.vendor.slug,
      name: product.name,
      description: product.description,
      price: product.price,
      compareAtPrice: product.compareAtPrice ?? undefined,
      images: safeJsonParse<string[]>(product.images, []),
      category: product.category,
      condition: product.condition ?? undefined,
      stock: product.stock,
      rating: product.rating,
      reviewCount: product.reviewCount,
      location: product.location,
      createdAt: product.createdAt.toISOString(),
      tags: safeJsonParse<string[]>(product.tags, []),
    },
    vendor: {
      ...product.vendor,
      theme: { coverColor: product.vendor.themeColor },
    },
  });
}

// PATCH /api/products/:id — vendor edits their own product.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    // ⚠ Capability-status enforcement — same gate as POST.
    const vendorCap = checkCapability(user, "VENDOR");
    if (!vendorCap.hasCapability) {
      return NextResponse.json(
        { error: "You need a vendor store before you can edit products." },
        { status: 403 },
      );
    }
    if (vendorCap.status === "SUSPENDED") {
      return NextResponse.json({ error: suspendedMessage("VENDOR") }, { status: 403 });
    }
    if (vendorCap.status === "PENDING_VERIFICATION") {
      return NextResponse.json({ error: pendingVerificationMessage("VENDOR") }, { status: 403 });
    }

    const { id } = await params;

    const existing = await db.product.findUnique({ where: { id }, include: { vendor: true } });
    if (!existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    if (existing.vendor.userId !== user.id) {
      return NextResponse.json({ error: "You can only edit your own products." }, { status: 403 });
    }

    const body = await req.json();
    const { name, description, price, compareAtPrice, images, category, condition, stock, location, tags } = body;

    if (price !== undefined) {
      const parsedPrice = Number(price);
      if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
        return NextResponse.json({ error: "Price must be a valid non-negative number." }, { status: 400 });
      }
    }

    // Defense-in-depth: when images are being updated, each entry must
    // be either our /api/uploads/ path (GridFS — current pattern),
    // a /uploads/ path (legacy filesystem pattern), or an https URL.
    // Rejects the same scheme attacks as POST.
    if (Array.isArray(images)) {
      for (const url of images) {
        if (typeof url !== "string" || (!url.startsWith("/api/uploads/") && !url.startsWith("/uploads/") && !url.startsWith("https://"))) {
          return NextResponse.json(
            { error: "Image URLs must be /api/uploads/ paths or https:// URLs." },
            { status: 400 },
          );
        }
      }
    }

    const updated = await db.product.update({
      where: { id },
      data: {
        ...(name !== undefined ? { name } : {}),
        ...(description !== undefined ? { description } : {}),
        ...(price !== undefined ? { price: Number(price) } : {}),
        ...(compareAtPrice !== undefined
          ? { compareAtPrice: compareAtPrice === "" || compareAtPrice === null ? null : Number(compareAtPrice) }
          : {}),
        ...(Array.isArray(images) ? { images: JSON.stringify(images.filter(Boolean)) } : {}),
        ...(category !== undefined ? { category } : {}),
        ...(condition !== undefined ? { condition: condition || null } : {}),
        ...(stock !== undefined ? { stock: Math.max(0, parseInt(stock, 10) || 0) } : {}),
        ...(location !== undefined ? { location } : {}),
        ...(Array.isArray(tags) ? { tags: JSON.stringify(tags) } : {}),
      },
    });

    return NextResponse.json({
      product: { ...updated, images: JSON.parse(updated.images), tags: JSON.parse(updated.tags) },
    });
  } catch (err: any) {
    if (err instanceof Response) throw err;
    console.error("[product PATCH] error", err);
    return NextResponse.json({ error: err.message || "Failed to update product" }, { status: 500 });
  }
}

// DELETE /api/products/:id — vendor removes their own product.
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    // ⚠ Capability-status enforcement — same gate as POST/PATCH.
    const vendorCap = checkCapability(user, "VENDOR");
    if (!vendorCap.hasCapability) {
      return NextResponse.json(
        { error: "You need a vendor store before you can delete products." },
        { status: 403 },
      );
    }
    if (vendorCap.status === "SUSPENDED") {
      return NextResponse.json({ error: suspendedMessage("VENDOR") }, { status: 403 });
    }
    if (vendorCap.status === "PENDING_VERIFICATION") {
      return NextResponse.json({ error: pendingVerificationMessage("VENDOR") }, { status: 403 });
    }

    const { id } = await params;

    const existing = await db.product.findUnique({ where: { id }, include: { vendor: true } });
    if (!existing) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }
    if (existing.vendor.userId !== user.id) {
      return NextResponse.json({ error: "You can only delete your own products." }, { status: 403 });
    }

    await db.product.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    if (err instanceof Response) throw err;
    console.error("[product DELETE] error", err);
    return NextResponse.json({ error: err.message || "Failed to delete product" }, { status: 500 });
  }
}
