import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

// GET /api/rider-jobs?status=OFFERED,ACCEPTED — the current rider's job
// queue, delivery and ride jobs together. This is the one endpoint a
// rider's dashboard needs instead of separately polling orders and rides.
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const riderProfile = (user as any).riderProfile;
    if (!riderProfile) {
      return NextResponse.json({ jobs: [] });
    }

    const statusParam = req.nextUrl.searchParams.get("status");
    const statuses = statusParam ? statusParam.split(",") : undefined;

    const jobs = await db.riderJob.findMany({
      where: { riderId: riderProfile.id, ...(statuses ? { status: { in: statuses } } : {}) },
      orderBy: { createdAt: "desc" },
      // Cap page size. Previously returned every job for the rider
      // with no limit; combined with the 8s poll interval on the
      // rider dashboard, the payload would grow forever.
      take: 50,
      include: {
        order: { include: { vendor: { select: { businessName: true } } } },
        ride: { include: { customer: { select: { name: true, phone: true } } } },
      },
    });

    const transformed = jobs.map((j) => ({
      id: j.id,
      type: j.type,
      status: j.status,
      offeredAt: j.offeredAt.toISOString(),
      respondedAt: j.respondedAt?.toISOString() || null,
      completedAt: j.completedAt?.toISOString() || null,
      order: j.order
        ? {
            id: j.order.id,
            code: j.order.code,
            vendorName: j.order.vendor.businessName,
            items: JSON.parse(j.order.items),
            total: j.order.total,
            deliveryFee: j.order.deliveryFee,
            deliveryAddress: j.order.deliveryAddress,
            customerName: j.order.customerName,
            customerPhone: j.order.customerPhone,
            status: j.order.status,
          }
        : undefined,
      ride: j.ride
        ? {
            id: j.ride.id,
            code: j.ride.code,
            pickup: j.ride.pickup,
            destination: j.ride.destination,
            fare: j.ride.fare,
            distanceKm: j.ride.distanceKm,
            estimatedMin: j.ride.estimatedMin,
            customerName: j.ride.customer.name,
            customerPhone: j.ride.customer.phone,
            status: j.ride.status,
          }
        : undefined,
    }));

    return NextResponse.json({ jobs: transformed });
  } catch (err) {
    if (err instanceof Response) throw err;
    console.error("[rider-jobs GET] error", err);
    return NextResponse.json({ jobs: [] });
  }
}
