import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

/**
 * DELETE /api/admin/products/:id
 *
 * Hard-removes a product. Used by admins to clean up listings that
 * violate policy. Vendors can already delete their own products via
 * /api/products/:id — this is the same operation gated on ADMIN.
 */
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const product = await db.product.findUnique({ where: { id } });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    await db.product.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error("[admin/products DELETE] error", err);
    return NextResponse.json({ error: "Failed to delete product" }, { status: 500 });
  }
}
