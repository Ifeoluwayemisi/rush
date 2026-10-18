import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { serializeOrder } from "@/lib/order-serialize";

/**
 * GET /api/admin/orders
 * Lists every order with vendor + customer + rider info. Admins use
 * this to investigate delivery disputes and refund failures.
 */
export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const status = req.nextUrl.searchParams.get("status");

    const orders = await db.order.findMany({
      where: status ? { status } : undefined,
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        vendor: { select: { id: true, businessName: true, slug: true } },
        customer: { select: { id: true, name: true, email: true, phone: true } },
      },
    });

    const riderIds = [...new Set(orders.map((o) => o.riderId).filter(Boolean))] as string[];
    const riders = riderIds.length
      ? await db.riderProfile.findMany({
          where: { id: { in: riderIds } },
          include: { vehicle: true },
        })
      : [];
    const riderMap = new Map<string, any>(
      riders.map((r) => [r.id, { name: r.name, avatar: r.avatar, rating: r.rating, vehicleType: r.vehicle?.type || null, plate: r.vehicle?.plate || null }]),
    );

    const transformed = orders.map((o) =>
      serializeOrder(
        o,
        o.vendor,
        o.riderId ? riderMap.get(o.riderId) : null,
      ),
    );

    return NextResponse.json({ orders: transformed });
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error("[admin/orders GET] error", err);
    return NextResponse.json({ error: "Failed to load orders" }, { status: 500 });
  }
}
