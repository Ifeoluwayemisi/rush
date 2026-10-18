import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

/**
 * PATCH /api/admin/riders/:id
 * Body: { action } where action ∈ { "APPROVE", "REJECT", "VERIFY_DOCS", "SUSPEND", "REACTIVATE" }
 *  - APPROVE       — set status to ACTIVE, mark documents verified
 *  - REJECT        — set status to SUSPENDED (rider keeps the profile, can't work)
 *  - VERIFY_DOCS   — set documentsVerified + vehicle.verified to true
 *  - SUSPEND       — set status to SUSPENDED
 *  - REACTIVATE    — set status to ACTIVE
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const { action } = body;

    const rider = await db.riderProfile.findUnique({
      where: { id },
      include: { user: true, vehicle: true },
    });
    if (!rider) {
      return NextResponse.json({ error: "Rider not found" }, { status: 404 });
    }

    if (action === "APPROVE") {
      const updated = await db.riderProfile.update({
        where: { id },
        data: { status: "ACTIVE", documentsVerified: true },
      });
      if (rider.vehicle) {
        await db.vehicle.update({
          where: { id: rider.vehicle.id },
          data: { verified: true },
        });
      }
      // Also flip the user's RIDER capability from PENDING_VERIFICATION →
      // ACTIVE, so the account-level view of "is this rider cleared"
      // agrees with the rider-profile-level view.
      const caps = JSON.parse(rider.user.capabilities).map((c: any) =>
        c.type === "RIDER" ? { ...c, status: "ACTIVE" } : c,
      );
      await db.user.update({
        where: { id: rider.user.id },
        data: { capabilities: JSON.stringify(caps) },
      });
      return NextResponse.json({ rider: updated });
    }

    if (action === "REJECT" || action === "SUSPEND") {
      const updated = await db.riderProfile.update({
        where: { id },
        data: { status: "SUSPENDED" },
      });
      const caps = JSON.parse(rider.user.capabilities).map((c: any) =>
        c.type === "RIDER" ? { ...c, status: "SUSPENDED" } : c,
      );
      await db.user.update({
        where: { id: rider.user.id },
        data: { capabilities: JSON.stringify(caps) },
      });
      return NextResponse.json({ rider: updated });
    }

    if (action === "REACTIVATE") {
      const updated = await db.riderProfile.update({
        where: { id },
        data: { status: "ACTIVE" },
      });
      const caps = JSON.parse(rider.user.capabilities).map((c: any) =>
        c.type === "RIDER" ? { ...c, status: "ACTIVE" } : c,
      );
      await db.user.update({
        where: { id: rider.user.id },
        data: { capabilities: JSON.stringify(caps) },
      });
      return NextResponse.json({ rider: updated });
    }

    if (action === "VERIFY_DOCS") {
      const updated = await db.riderProfile.update({
        where: { id },
        data: { documentsVerified: true },
      });
      if (rider.vehicle) {
        await db.vehicle.update({
          where: { id: rider.vehicle.id },
          data: { verified: true },
        });
      }
      return NextResponse.json({ rider: updated });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error("[admin/riders PATCH] error", err);
    return NextResponse.json({ error: "Failed to update rider" }, { status: 500 });
  }
}
