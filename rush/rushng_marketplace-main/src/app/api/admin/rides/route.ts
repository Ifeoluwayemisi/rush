import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

/** GET /api/admin/rides — every ride for the operations pane. */
export async function GET() {
  try {
    await requireAdmin();

    const rides = await db.ride.findMany({
      orderBy: { createdAt: "desc" },
      take: 200,
      include: {
        customer: { select: { id: true, name: true, email: true, phone: true } },
        rider: {
          select: {
            id: true,
            name: true,
            phone: true,
            rating: true,
            vehicle: true,
          },
        },
      },
    });

    const transformed = rides.map((r) => ({
      id: r.id,
      code: r.code,
      type: r.type,
      pickup: r.pickup,
      destination: r.destination,
      fare: r.fare,
      distanceKm: r.distanceKm,
      estimatedMin: r.estimatedMin,
      status: r.status,
      createdAt: r.createdAt.toISOString(),
      customer: {
        id: r.customer.id,
        name: r.customer.name,
        phone: r.customer.phone,
      },
      rider: r.rider
        ? {
            id: r.rider.id,
            name: r.rider.name,
            phone: r.rider.phone,
            rating: r.rider.rating,
            vehicleType: r.rider.vehicle?.type,
            plate: r.rider.vehicle?.plate,
          }
        : null,
    }));

    return NextResponse.json({ rides: transformed });
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error("[admin/rides GET] error", err);
    return NextResponse.json({ error: "Failed to load rides" }, { status: 500 });
  }
}
