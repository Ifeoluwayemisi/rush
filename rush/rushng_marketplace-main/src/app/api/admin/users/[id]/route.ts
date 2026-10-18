import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, parseCapabilities } from "@/lib/auth";

/**
 * PATCH /api/admin/users/:id
 *
 * Body: { action, ...payload }
 *
 * Supported actions:
 *  - { action: "SET_CAPABILITY_STATUS", capability, status }
 *      Updates the status (ACTIVE / PENDING_VERIFICATION / SUSPENDED) of a
 *      single capability on the user. This is the lever admins pull to
 *      suspend a vendor, approve a rider, etc.
 *  - { action: "ADD_CAPABILITY", capability, status }
 *      Adds a capability the user didn't have before.
 *  - { action: "REMOVE_CAPABILITY", capability }
 *      Removes a capability. ADMIN can't be self-removed (prevents
 *      accidentally locking yourself out of the panel).
 *
 * The user's ADMIN capability can be set to SUSPENDED by another admin
 * (to disable access) but cannot be removed by self-service.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const adminUser = await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const { action } = body;

    const user = await db.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    let caps = parseCapabilities(user.capabilities);

    if (action === "SET_CAPABILITY_STATUS") {
      const { capability, status } = body;
      if (!["ACTIVE", "PENDING_VERIFICATION", "SUSPENDED"].includes(status)) {
        return NextResponse.json({ error: "Invalid status" }, { status: 400 });
      }
      const target = caps.find((c: any) => c.type === capability);
      if (!target) {
        return NextResponse.json(
          { error: `User does not have the ${capability} capability` },
          { status: 400 },
        );
      }
      // Don't let an admin remove their own ADMIN access — break-glass
      // requires another admin or a DB-level change.
      if (capability === "ADMIN" && adminUser.id === user.id && status !== "ACTIVE") {
        return NextResponse.json(
          { error: "You cannot suspend your own admin access — ask another admin." },
          { status: 400 },
        );
      }
      target.status = status;
    } else if (action === "ADD_CAPABILITY") {
      const { capability, status = "ACTIVE" } = body;
      if (caps.find((c: any) => c.type === capability)) {
        return NextResponse.json(
          { error: `User already has ${capability} capability` },
          { status: 400 },
        );
      }
      caps.push({ type: capability, status });
    } else if (action === "REMOVE_CAPABILITY") {
      const { capability } = body;
      if (capability === "ADMIN" && adminUser.id === user.id) {
        return NextResponse.json(
          { error: "You cannot remove your own admin capability — ask another admin." },
          { status: 400 },
        );
      }
      caps = caps.filter((c: any) => c.type !== capability);
      if (caps.length === 0) {
        caps = [{ type: "CUSTOMER", status: "ACTIVE" }];
      }
    } else {
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
    }

    const updated = await db.user.update({
      where: { id },
      data: { capabilities: JSON.stringify(caps) },
      select: {
        id: true,
        name: true,
        email: true,
        capabilities: true,
      },
    });

    return NextResponse.json({
      user: {
        ...updated,
        capabilities: JSON.parse(updated.capabilities),
      },
    });
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error("[admin/users PATCH] error", err);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}
