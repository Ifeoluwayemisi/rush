import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

/** GET /api/admin/riders — every rider, with vehicle and document status. */
export async function GET() {
  try {
    await requireAdmin();

    const riders = await db.riderProfile.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        user: {
          select: { id: true, name: true, email: true, capabilities: true },
        },
        vehicle: true,
        _count: { select: { riderJobs: true } },
      },
    });

    const transformed = riders.map((r) => ({
      id: r.id,
      name: r.name,
      phone: r.phone,
      rating: r.rating,
      trips: r.trips,
      earningsToday: r.earningsToday,
      online: r.online,
      status: r.status,
      mobility: JSON.parse(r.mobility),
      licenseUploaded: r.licenseUploaded,
      documentsVerified: r.documentsVerified,
      vehicle: r.vehicle
        ? {
            type: r.vehicle.type,
            plate: r.vehicle.plate,
            model: r.vehicle.model,
            licenseNumber: r.vehicle.licenseNumber,
            verified: r.vehicle.verified,
          }
        : null,
      owner: {
        id: r.user.id,
        email: r.user.email,
        capabilities: JSON.parse(r.user.capabilities),
      },
      jobCount: r._count.riderJobs,
      createdAt: r.createdAt.toISOString(),
    }));

    return NextResponse.json({ riders: transformed });
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error("[admin/riders GET] error", err);
    return NextResponse.json({ error: "Failed to load riders" }, { status: 500 });
  }
}
