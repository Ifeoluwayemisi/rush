import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, requireUser } from "@/lib/auth";
import { serializeOrder } from "@/lib/order-serialize";
import { sendOrderNotification } from "@/lib/email";
import { notifyUser } from "@/lib/notify";
import { COMMISSION_RATE } from "@/lib/payments/vendor-wallet";

// POST /api/orders — create a new order
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const { items, vendorId, fulfilment, paymentMethod, deliveryAddress } = body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Cart is empty" }, { status: 400 });
    }

    if (!vendorId) {
      return NextResponse.json({ error: "Vendor is required" }, { status: 400 });
    }

    // Validate each line item's quantity up-front. Previously the
    // route accepted any `quantity` value (including 0, negative
    // numbers, or strings), which let a malicious caller submit
    // `quantity: -100` and produce a negative subtotal.
    for (const item of items) {
      const qty = Number(item?.quantity);
      if (!Number.isInteger(qty) || qty < 1 || qty > 999) {
        return NextResponse.json(
          { error: `Invalid quantity for product ${item?.productId ?? "?"}` },
          { status: 400 },
        );
      }
    }

    const vendor = await db.vendorProfile.findUnique({ where: { id: vendorId } });
    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    // ⚠ Server-side price authority: previously `deliveryFee` came
    // from the request body, letting a caller submit `deliveryFee: 0`
    // (or `-1000`) regardless of what the vendor charges. Now we
    // ignore the body entirely and read the vendor's configured rate.
    // If the vendor has delivery disabled, we still allow pickup
    // orders (deliveryFee stays 0).
    const deliveryFee =
      vendor.deliveryEnabled && fulfilment !== "PICKUP"
        ? (vendor.deliveryFee ?? 0)
        : 0;

    // Validate stock & compute subtotal
    const productIds = items.map((i: any) => i.productId);
    const products = await db.product.findMany({ where: { id: { in: productIds } } });

    // Cross-vendor injection check: every product must belong to the
    // specified vendor. Without this, a caller could create an "order
    // to vendor A" that contains products belonging to vendor B.
    for (const item of items) {
      const p = products.find((pp) => pp.id === item.productId);
      if (!p) {
        return NextResponse.json(
          { error: `Product ${item.productId} not found` },
          { status: 404 },
        );
      }
      if (p.vendorId !== vendor.id) {
        return NextResponse.json(
          { error: `Product ${p.name} doesn't belong to this vendor` },
          { status: 400 },
        );
      }
      // Stock check — refuse to oversell.
      if (typeof p.stock === "number" && p.stock < item.quantity) {
        return NextResponse.json(
          { error: `Only ${p.stock} of "${p.name}" left in stock` },
          { status: 400 },
        );
      }
    }

    const lineItems = items.map((i: any) => {
      const p = products.find((pp) => pp.id === i.productId)!;
      return {
        productId: p.id,
        vendorId: p.vendorId,
        vendorName: vendor.businessName,
        name: p.name,
        image: JSON.parse(p.images)[0] || "",
        price: p.price,
        quantity: i.quantity,
      };
    });

    const subtotal = lineItems.reduce((s, i) => s + i.price * i.quantity, 0);
    // ─── Commission (5% service fee, added on top of subtotal) ──────────
    // Customer pays subtotal + serviceFee + deliveryFee.
    // Vendor receives the full subtotal — never deducted. The service
    // fee stays with Rush (covers platform ops + Paystack charges).
    // Delivery fee is EXCLUDED from the commission base — it's a
    // pass-through to the rider, not Rush's cut.
    const serviceFee = Math.round(subtotal * COMMISSION_RATE);
    const total = subtotal + serviceFee + deliveryFee;

    // Generate a unique order code
    const code = `RSH-${Math.floor(10000 + Math.random() * 90000)}`;

    // Initial timeline
    const now = new Date();
    const timeline = [
      { label: "Order placed", timestamp: now.toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit" }), completed: true },
    ];

    const order = await db.order.create({
      data: {
        code,
        customerId: user.id,
        vendorId: vendor.id,
        items: JSON.stringify(lineItems),
        subtotal,
        serviceFee,
        deliveryFee,
        total,
        fulfilment,
        paymentMethod,
        status: "PLACED",
        deliveryAddress: deliveryAddress || null,
        customerName: user.name,
        customerPhone: user.phone || "",
        timeline: JSON.stringify(timeline),
      },
    });

    // ⚠ Atomic stock decrement with oversell guard.
    //
    // We re-checked stock above per-item, but two customers could
    // race: both pass the check, both create orders. To prevent
    // overselling, we use updateMany with `where: { id, stock: { gte:
    // qty } }` — Mongo only modifies the doc if the precondition
    // still holds. If 0 docs were modified, the race was lost —
    // we cancel the just-created order and tell the customer.
    //
    // This is a partial rollback: the order exists momentarily in
    // PLACED before being flipped to CANCELLED. We accept that
    // brief window — the customer never sees it because we return
    // 409 immediately.
    const outOfStock: string[] = [];
    for (const item of lineItems) {
      const res = await db.product.updateMany({
        where: { id: item.productId, stock: { gte: item.quantity } },
        data: { stock: { decrement: item.quantity } },
      });
      if (res.count === 0) {
        outOfStock.push(item.name);
      }
    }

    if (outOfStock.length > 0) {
      // Roll back: cancel the order. (We don't delete it — cancelled
      // is a valid terminal state and preserves the audit trail.)
      await db.order.update({
        where: { id: order.id },
        data: { status: "CANCELLED" },
      });
      return NextResponse.json(
        {
          error: `Insufficient stock for: ${outOfStock.join(", ")}. Order cancelled.`,
          orderId: order.id,
        },
        { status: 409 },
      );
    }

    // Fire-and-forget order-created email + in-app notification.
    // Failures don't break the order — they're just logged inside
    // sendEmail / notifyUser.
    try {
      await sendOrderNotification({
        userId: user.id,
        email: user.email,
        name: user.name,
        orderCode: order.code,
        status: "PLACED",
        total: order.total,
        vendorName: vendor.businessName,
        deliveryAddress: deliveryAddress || undefined,
        type: "ORDER_CREATED",
      });
    } catch (emailErr) {
      console.error("[orders POST] welcome email failed:", emailErr);
    }
    void notifyUser({
      userId: user.id,
      type: "ORDER_UPDATE",
      title: `Order ${order.code} placed`,
      body: `${vendor.businessName} will prepare your order once payment is confirmed.`,
      link: { view: "order-tracking", params: { orderId: order.id } },
    });
    // Also notify the vendor owner that a new order arrived.
    void notifyUser({
      userId: vendor.userId,
      type: "ORDER_UPDATE",
      title: `New order ${order.code}`,
      body: `${user.name} placed an order for ₦${order.total.toLocaleString()}.`,
      link: { view: "vendor-dashboard" },
    });

    return NextResponse.json({ order });
  } catch (err: any) {
    console.error("[orders POST] error", err);
    if (err instanceof Response) throw err; // pass through requireUser's 401
    return NextResponse.json(
      { error: err.message || "Failed to create order" },
      { status: 500 },
    );
  }
}

// GET /api/orders?scope=customer|vendor|rider — list orders relevant to the
// caller in that role. Defaults to "customer". A user can be a customer,
// vendor, and rider at once, so the caller must say which hat they're wearing.
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ orders: [] });
    }

    const scope = req.nextUrl.searchParams.get("scope") || "customer";

    let where: Record<string, string>;
    if (scope === "vendor") {
      const vendorId = (user as any).vendorProfile?.id;
      if (!vendorId) return NextResponse.json({ orders: [] });
      where = { vendorId };
    } else if (scope === "rider") {
      const riderId = (user as any).riderProfile?.id;
      if (!riderId) return NextResponse.json({ orders: [] });
      where = { riderId };
    } else {
      where = { customerId: user.id };
    }

    const orders = await db.order.findMany({
      where,
      orderBy: { createdAt: "desc" },
      // Cap the page size — previously this returned every order
      // matching the scope, which could grow unbounded over time.
      // Pagination (skip/cursor) is a follow-up; for now the 50 most
      // recent is plenty for the activity screen.
      take: 50,
      include: {
        vendor: {
          select: { id: true, businessName: true, slug: true, logo: true },
        },
      },
    });

    // Batch-fetch rider info for any orders that have one assigned, instead
    // of one query per order.
    const riderIds = [...new Set(orders.map((o) => o.riderId).filter(Boolean))] as string[];
    const riders = riderIds.length
      ? await db.riderProfile.findMany({ where: { id: { in: riderIds } }, include: { vehicle: true } })
      : [];
    const riderMap = new Map<string, { name: string; avatar: string | null; rating: number; vehicleType: string | null; plate: string | null }>(
      riders.map((r) => [
        r.id,
        { name: r.name, avatar: r.avatar, rating: r.rating, vehicleType: r.vehicle?.type || null, plate: r.vehicle?.plate || null },
      ]),
    );

    const transformed = orders.map((o) => serializeOrder(o, o.vendor, o.riderId ? riderMap.get(o.riderId) : null));

    return NextResponse.json({ orders: transformed });
  } catch (err) {
    console.error("[orders GET] error", err);
    return NextResponse.json({ orders: [] });
  }
}
