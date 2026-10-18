import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, requireUser } from "@/lib/auth";
import { canCancel, customerCanCancel, getNextStep, getStepOwner, isTerminal } from "@/lib/order-status";
import { serializeOrder } from "@/lib/order-serialize";
import { sendOrderNotification } from "@/lib/email";
import { releaseVendorFundsOnDelivery, reverseVendorCreditOnCancel } from "@/lib/payments/vendor-wallet";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    const order = await db.order.findUnique({
      where: { id },
      include: {
        vendor: {
          select: { id: true, businessName: true, slug: true, logo: true, phone: true, userId: true },
        },
      },
    });

    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const myRiderProfileId = (user as any)?.riderProfile?.id;
    const isOwner =
      !!user &&
      (order.customerId === user.id ||
        order.vendor.userId === user.id ||
        (!!order.riderId && myRiderProfileId === order.riderId));
    if (!isOwner) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    let rider: { name: string; avatar: string | null; rating: number; vehicleType: string | null; plate: string | null } | null = null;
    if (order.riderId) {
      const r = await db.riderProfile.findUnique({ where: { id: order.riderId }, include: { vehicle: true } });
      if (r) {
        rider = {
          name: r.name,
          avatar: r.avatar,
          rating: r.rating,
          vehicleType: r.vehicle?.type || null,
          plate: r.vehicle?.plate || null,
        };
      }
    }

    return NextResponse.json({
      order: serializeOrder(order, order.vendor, rider),
    });
  } catch (err) {
    console.error("[order GET] error", err);
    return NextResponse.json({ error: "Failed to fetch order" }, { status: 500 });
  }
}

// PATCH /api/orders/:id
// Body:
//   { status: "CANCELLED" }                          — cancel (customer before confirm, vendor any time before terminal)
//   { status: "<next lifecycle status>", riderId? }   — the vendor advances one of *their* steps (confirm/prepare/assign rider)
// Once a rider is assigned, the remaining steps (pickup, delivered) are
// exclusively driven through /api/rider-jobs/:id — this endpoint will
// refuse to advance a rider-owned step even for the vendor, so there's
// only ever one path that can move an order forward at any given time.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await req.json();
    const { status: requestedStatus, riderId } = body;

    const order = await db.order.findUnique({
      where: { id },
      include: { vendor: { select: { userId: true, businessName: true, slug: true } } },
    });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const isVendorOwner = order.vendor.userId === user.id;
    const isCustomer = order.customerId === user.id;
    const myRiderProfileId = (user as any).riderProfile?.id;
    const isAssignedRider = !!order.riderId && myRiderProfileId === order.riderId;

    if (!isVendorOwner && !isCustomer && !isAssignedRider) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (isTerminal(order.status)) {
      return NextResponse.json(
        { error: "This order is already complete and can no longer be changed." },
        { status: 400 },
      );
    }

    const nowTimestamp = () => new Date().toLocaleTimeString("en-NG", { hour: "numeric", minute: "2-digit" });

    let nextStatus: string;
    let timelineLabel: string;
    let riderIdToSet: string | undefined;
    let newRiderJobId: string | undefined;

    if (requestedStatus === "CANCELLED") {
      if (!isVendorOwner && !isCustomer) {
        return NextResponse.json({ error: "Only the customer or vendor can cancel this order." }, { status: 403 });
      }
      if (!canCancel(order.status)) {
        return NextResponse.json({ error: "This order can no longer be cancelled." }, { status: 400 });
      }
      if (isCustomer && !isVendorOwner && !customerCanCancel(order.status)) {
        return NextResponse.json(
          { error: "The vendor has already confirmed this order — ask them to cancel it." },
          { status: 403 },
        );
      }
      nextStatus = "CANCELLED";
      timelineLabel = isVendorOwner ? "Cancelled by vendor" : "Cancelled by customer";
      // Clean up any dangling job offer if the order is cancelled before a rider picked it up.
      await db.riderJob.updateMany({
        where: { orderId: id, status: { in: ["OFFERED", "ACCEPTED"] } },
        data: { status: "CANCELLED", respondedAt: new Date() },
      });
      // ⚠ Stock restoration — refund the items back to inventory.
      // We only restore if the order had actually decremented stock
      // (i.e. it was past PLACED). Since stock is decremented at
      // order-creation time, every cancel restores stock. Safe to
      // call even if items is malformed — the try/catch below
      // protects against parse failures.
      try {
        const items = JSON.parse(order.items);
        if (Array.isArray(items)) {
          for (const item of items) {
            if (item.productId && typeof item.quantity === "number" && item.quantity > 0) {
              await db.product.update({
                where: { id: item.productId },
                data: { stock: { increment: item.quantity } },
              });
            }
          }
        }
      } catch (stockErr: any) {
        // Don't fail the cancel if stock restoration fails — but
        // log loudly so we can reconcile manually.
        console.error("[order PATCH] stock restoration failed:", stockErr?.message ?? stockErr);
      }
    } else {
      const owner = getStepOwner(order.fulfilment, order.status);
      if (owner === "RIDER") {
        return NextResponse.json(
          { error: "This step is handled by the assigned rider's job queue, not the order directly." },
          { status: 400 },
        );
      }
      if (!isVendorOwner) {
        return NextResponse.json({ error: "Only the vendor can update this order right now." }, { status: 403 });
      }

      const next = getNextStep(order.fulfilment, order.status);
      if (!next) {
        return NextResponse.json({ error: "No further status changes are available." }, { status: 400 });
      }
      if (requestedStatus && requestedStatus !== next.status) {
        return NextResponse.json(
          { error: `Order isn't ready for that step yet — next step is ${next.status.replace(/_/g, " ")}.` },
          { status: 409 },
        );
      }
      if (next.requiresRider) {
        if (!riderId) {
          return NextResponse.json({ error: "Select a rider to continue." }, { status: 400 });
        }
        const rider = await db.riderProfile.findUnique({ where: { id: riderId } });
        if (!rider || rider.status !== "ACTIVE") {
          return NextResponse.json({ error: "That rider isn't available right now." }, { status: 400 });
        }
        riderIdToSet = riderId;
        const job = await db.riderJob.create({
          data: { riderId, type: "DELIVERY", status: "OFFERED", orderId: id },
        });
        newRiderJobId = job.id;
      }
      nextStatus = next.status;
      timelineLabel = next.timelineLabel;
    }

    const timeline = [
      ...JSON.parse(order.timeline).map((t: any) => ({ ...t, completed: true })),
      { label: timelineLabel, timestamp: nowTimestamp(), completed: true },
    ];

    const updated = await db.order.update({
      where: { id },
      data: {
        status: nextStatus,
        timeline: JSON.stringify(timeline),
        ...(riderIdToSet !== undefined ? { riderId: riderIdToSet } : {}),
      },
    });

    // ─── Vendor wallet ledger transitions ─────────────────────────────
    //   DELIVERED → release the vendor's pending credit to available
    //              (so they can now withdraw it).
    //   CANCELLED → reverse any pending credit (so the vendor doesn't
    //              keep money for an unfulfilled order). Both are
    //              idempotent — safe to call multiple times.
    if (nextStatus === "DELIVERED" && order.vendorId) {
      try {
        await releaseVendorFundsOnDelivery({
          vendorId: order.vendorId,
          orderId: id,
        });
      } catch (e: any) {
        console.error(
          `[order PATCH] releaseVendorFunds failed for ${id}:`,
          e?.message ?? e,
        );
      }
    } else if (nextStatus === "CANCELLED" && order.vendorId) {
      try {
        await reverseVendorCreditOnCancel({
          vendorId: order.vendorId,
          orderId: id,
        });
      } catch (e: any) {
        console.error(
          `[order PATCH] reverseVendorCredit failed for ${id}:`,
          e?.message ?? e,
        );
      }
    }

    let riderInfo: { name: string; avatar: string | null; rating: number; vehicleType: string | null; plate: string | null } | null = null;
    if (updated.riderId) {
      const r = await db.riderProfile.findUnique({ where: { id: updated.riderId }, include: { vehicle: true } });
      if (r) riderInfo = { name: r.name, avatar: r.avatar, rating: r.rating, vehicleType: r.vehicle?.type || null, plate: r.vehicle?.plate || null };
    }

    // Send the customer an order-status email if the status actually
    // changed and there's a matching email type. The sendOrderNoti-
    // -fication helper uses an idempotency key per (orderCode, type)
    // so duplicate emails can't fire even if PATCH is called twice.
    const statusToEmailType: Record<string, "ORDER_CONFIRMED" | "ORDER_PREPARING" | "ORDER_RIDER_ASSIGNED" | "ORDER_ON_THE_WAY" | "ORDER_DELIVERED" | "ORDER_PICKED_UP" | "ORDER_CANCELLED" | undefined> = {
      CONFIRMED: "ORDER_CONFIRMED",
      PREPARING: "ORDER_PREPARING",
      RIDER_ASSIGNED: "ORDER_RIDER_ASSIGNED",
      ON_THE_WAY: "ORDER_ON_THE_WAY",
      PICKED_UP: "ORDER_PICKED_UP",
      DELIVERED: "ORDER_DELIVERED",
      CANCELLED: "ORDER_CANCELLED",
    };
    const emailType = statusToEmailType[nextStatus];
    if (emailType && order.customerId) {
      const customer = await db.user.findUnique({ where: { id: order.customerId } });
      if (customer) {
        try {
          await sendOrderNotification({
            userId: customer.id,
            email: customer.email,
            name: customer.name,
            orderCode: updated.code,
            status: nextStatus,
            total: updated.total,
            vendorName: order.vendor.businessName,
            deliveryAddress: updated.deliveryAddress || undefined,
            type: emailType,
          });
        } catch (emailErr) {
          console.error("[order PATCH] email failed:", emailErr);
        }
      }
    }

    return NextResponse.json({ order: serializeOrder(updated, order.vendor, riderInfo), riderJobId: newRiderJobId });
  } catch (err) {
    if (err instanceof Response) throw err; // pass through requireUser's 401
    console.error("[order PATCH] error", err);
    return NextResponse.json({ error: "Failed to update order" }, { status: 500 });
  }
}
