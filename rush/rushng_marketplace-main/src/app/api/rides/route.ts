import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, requireUser } from "@/lib/auth";
import { sendRideNotification } from "@/lib/email";

function serializeRide(ride: any, rider?: { name: string; avatar: string | null; rating: number; vehiclePlate: string; vehicleModel: string } | null) {
  return {
    id: ride.id,
    code: ride.code,
    type: ride.type,
    rider: rider || undefined,
    pickup: ride.pickup,
    destination: ride.destination,
    fare: ride.fare,
    distanceKm: ride.distanceKm,
    estimatedMin: ride.estimatedMin,
    status: ride.status,
    createdAt: ride.createdAt instanceof Date ? ride.createdAt.toISOString() : ride.createdAt,
  };
}

// GET /api/rides?scope=customer|rider — rides relevant to the caller in
// that role. Previously this only ever checked customerId, which meant a
// rider had no way to see rides assigned to them — same class of bug as
// the orders list before it.
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ rides: [] });

    const scope = req.nextUrl.searchParams.get("scope") || "customer";

    let where: Record<string, string>;
    if (scope === "rider") {
      const riderId = (user as any).riderProfile?.id;
      if (!riderId) return NextResponse.json({ rides: [] });
      where = { riderId };
    } else {
      where = { customerId: user.id };
    }

    const rides = await db.ride.findMany({
      where,
      orderBy: { createdAt: "desc" },
      // Cap page size — previously returned every ride matching the
      // scope, growing unbounded over time.
      take: 50,
      include: { rider: { include: { vehicle: true } } },
    });

    const transformed = rides.map((r) =>
      serializeRide(
        r,
        r.rider
          ? {
              name: r.rider.name,
              avatar: r.rider.avatar,
              rating: r.rider.rating,
              vehiclePlate: r.rider.vehicle?.plate || "",
              vehicleModel: r.rider.vehicle?.model || "",
            }
          : null,
      ),
    );

    return NextResponse.json({ rides: transformed });
  } catch (err) {
    console.error("[rides GET] error", err);
    return NextResponse.json({ rides: [] });
  }
}

// POST /api/rides — customer requests a ride. Matching is a simple
// broadcast: every online, verified rider capable of passenger rides
// (preferring a matching vehicle type) gets an OFFERED RiderJob, and
// whichever one accepts first is assigned — first-to-accept wins, the
// rest are cancelled. This is deliberately not sophisticated
// location-based dispatch; see project notes on MVP-scope matching.
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const { type, pickup, destination, fare, distanceKm, estimatedMin } = body;

    if (!type || !pickup || !destination) {
      return NextResponse.json(
        { error: "Type, pickup, and destination are required" },
        { status: 400 },
      );
    }

    const code = `RSH-RIDE-${Math.floor(1000 + Math.random() * 9000)}`;

    const ride = await db.ride.create({
      data: {
        code,
        type,
        pickup,
        destination,
        fare: parseFloat(fare),
        distanceKm: parseFloat(distanceKm),
        estimatedMin: parseInt(estimatedMin, 10),
        status: "SEARCHING",
        customerId: user.id,
      },
    });

    // Find eligible riders: online, verified, able to take passenger rides.
    const candidates = await db.riderProfile.findMany({
      where: { status: "ACTIVE", online: true },
      include: { vehicle: true },
    });
    const eligible = candidates.filter((r) => {
      let mobility: string[] = [];
      try {
        mobility = JSON.parse(r.mobility);
      } catch {
        mobility = [];
      }
      return mobility.includes("PASSENGER_RIDES");
    });
    // Prefer riders with a matching vehicle type; fall back to any eligible rider if none match.
    const matchingType = eligible.filter((r) => r.vehicle?.type === type);
    const pool = (matchingType.length > 0 ? matchingType : eligible)
      .sort((a, b) => b.rating - a.rating)
      .slice(0, 8);

    if (pool.length > 0) {
      await db.riderJob.createMany({
        data: pool.map((r) => ({ riderId: r.id, type: "RIDE", status: "OFFERED", rideId: ride.id })),
      });
    }

    // Fire-and-forget ride-requested email.
    try {
      await sendRideNotification({
        userId: user.id,
        email: user.email,
        name: user.name,
        rideCode: ride.code,
        status: "SEARCHING",
        pickup,
        destination,
        fare: ride.fare,
        type: "RIDE_REQUESTED",
      });
    } catch (emailErr) {
      console.error("[rides POST] email failed:", emailErr);
    }

    return NextResponse.json({ ride: serializeRide(ride), candidateCount: pool.length });
  } catch (err: any) {
    console.error("[rides POST] error", err);
    if (err instanceof Response) throw err;
    return NextResponse.json(
      { error: err.message || "Failed to request ride" },
      { status: 500 },
    );
  }
}
