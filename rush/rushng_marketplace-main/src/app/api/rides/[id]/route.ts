import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, requireUser } from "@/lib/auth";

// GET /api/rides/:id
// NOTE: this previously had no auth check at all — anyone could read any
// ride's pickup/destination just by guessing an id. Fixed to require the
// caller be the customer or the assigned rider.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  const { id } = await params;
  const ride = await db.ride.findUnique({
    where: { id },
    include: {
      rider: { include: { vehicle: true } },
    },
  });

  if (!ride) {
    return NextResponse.json({ error: "Ride not found" }, { status: 404 });
  }

  const myRiderProfileId = (user as any)?.riderProfile?.id;
  const isOwner =
    !!user && (ride.customerId === user.id || (!!ride.riderId && myRiderProfileId === ride.riderId));
  if (!isOwner) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    ride: {
      id: ride.id,
      code: ride.code,
      type: ride.type,
      rider: ride.rider
        ? {
            name: ride.rider.name,
            avatar: ride.rider.avatar,
            rating: ride.rider.rating,
            vehiclePlate: ride.rider.vehicle?.plate || "",
            vehicleModel: ride.rider.vehicle?.model || "",
          }
        : undefined,
      pickup: ride.pickup,
      destination: ride.destination,
      fare: ride.fare,
      distanceKm: ride.distanceKm,
      estimatedMin: ride.estimatedMin,
      status: ride.status,
      createdAt: ride.createdAt.toISOString(),
    },
  });
}

// PATCH /api/rides/:id — currently only supports customer cancellation
// while the ride hasn't started yet.
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await req.json();

    if (body.action !== "CANCEL") {
      return NextResponse.json({ error: "Invalid action." }, { status: 400 });
    }

    const ride = await db.ride.findUnique({ where: { id } });
    if (!ride) {
      return NextResponse.json({ error: "Ride not found" }, { status: 404 });
    }
    if (ride.customerId !== user.id) {
      return NextResponse.json({ error: "Only the customer can cancel this ride." }, { status: 403 });
    }
    if (!["SEARCHING", "ASSIGNED"].includes(ride.status)) {
      return NextResponse.json(
        { error: "This ride can no longer be cancelled — it's already underway." },
        { status: 400 },
      );
    }

    await db.riderJob.updateMany({
      where: { rideId: id, status: { in: ["OFFERED", "ACCEPTED"] } },
      data: { status: "CANCELLED", respondedAt: new Date() },
    });
    const updated = await db.ride.update({ where: { id }, data: { status: "CANCELLED" } });

    return NextResponse.json({ ride: { ...updated, createdAt: updated.createdAt.toISOString() } });
  } catch (err) {
    if (err instanceof Response) throw err;
    console.error("[ride PATCH] error", err);
    return NextResponse.json({ error: "Failed to update ride" }, { status: 500 });
  }
}
