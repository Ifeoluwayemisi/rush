import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

// GET /api/riders/available — active riders a vendor can hand a delivery to.
// This is deliberately simple (manual selection, no location matching) —
// see project notes on MVP-scope dispatch vs. automatic nearest-rider matching.
export async function GET() {
  try {
    await requireUser();

    const riders = await db.riderProfile.findMany({
      where: { status: "ACTIVE" },
      include: { vehicle: true },
      orderBy: [{ online: "desc" }, { rating: "desc" }],
      take: 25,
    });

    return NextResponse.json({
      riders: riders.map((r) => ({
        id: r.id,
        name: r.name,
        avatar: r.avatar,
        rating: r.rating,
        online: r.online,
        vehicleType: r.vehicle?.type || null,
      })),
    });
  } catch (err) {
    if (err instanceof Response) throw err;
    console.error("[riders/available GET] error", err);
    return NextResponse.json({ riders: [] });
  }
}
