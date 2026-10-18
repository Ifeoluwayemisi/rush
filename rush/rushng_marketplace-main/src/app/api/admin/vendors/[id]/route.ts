import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

/**
 * PATCH /api/admin/vendors/:id
 *
 * Body: { action, ...payload }
 *
 * Supported actions:
 *  - { action: "SET_VISIBILITY", visibility } — PUBLIC | LINK_ONLY | PRIVATE
 *  - { action: "SET_VERIFIED", verified }     — true / false
 *  - { action: "SUSPEND" }                    — sets the VENDOR capability on
 *                                                the owner to SUSPENDED and
 *                                                the store visibility to PRIVATE.
 *  - { action: "REACTIVATE" }                 — sets the VENDOR capability on
 *                                                the owner to ACTIVE and the
 *                                                store visibility to PUBLIC.
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

    const vendor = await db.vendorProfile.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }

    if (action === "SET_VISIBILITY") {
      const { visibility } = body;
      if (!["PUBLIC", "LINK_ONLY", "PRIVATE"].includes(visibility)) {
        return NextResponse.json({ error: "Invalid visibility" }, { status: 400 });
      }
      const updated = await db.vendorProfile.update({
        where: { id },
        data: { visibility },
      });
      return NextResponse.json({ vendor: updated });
    }

    if (action === "SET_VERIFIED") {
      const { verified } = body;
      const updated = await db.vendorProfile.update({
        where: { id },
        data: { verified: !!verified },
      });
      return NextResponse.json({ vendor: updated });
    }

    if (action === "SUSPEND") {
      const caps = JSON.parse(vendor.user.capabilities).map((c: any) =>
        c.type === "VENDOR" ? { ...c, status: "SUSPENDED" } : c,
      );
      await db.user.update({
        where: { id: vendor.user.id },
        data: { capabilities: JSON.stringify(caps) },
      });
      const updated = await db.vendorProfile.update({
        where: { id },
        data: { visibility: "PRIVATE" },
      });
      return NextResponse.json({ vendor: updated });
    }

    if (action === "REACTIVATE") {
      const caps = JSON.parse(vendor.user.capabilities).map((c: any) =>
        c.type === "VENDOR" ? { ...c, status: "ACTIVE" } : c,
      );
      await db.user.update({
        where: { id: vendor.user.id },
        data: { capabilities: JSON.stringify(caps) },
      });
      const updated = await db.vendorProfile.update({
        where: { id },
        data: { visibility: "PUBLIC" },
      });
      return NextResponse.json({ vendor: updated });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error("[admin/vendors PATCH] error", err);
    return NextResponse.json({ error: "Failed to update vendor" }, { status: 500 });
  }
}
