import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";

/**
 * PATCH /api/admin/providers/:id
 * Body: { action } where action ∈ { "SET_VERIFIED", "SUSPEND", "REACTIVATE" }
 *  - SET_VERIFIED: sets `verified` to body.verified (true/false)
 *  - SUSPEND: sets the SERVICE_PROVIDER capability on the owner to SUSPENDED
 *  - REACTIVATE: sets the SERVICE_PROVIDER capability on the owner to ACTIVE
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

    const provider = await db.provider.findUnique({
      where: { id },
      include: { user: true },
    });
    if (!provider) {
      return NextResponse.json({ error: "Provider not found" }, { status: 404 });
    }

    if (action === "SET_VERIFIED") {
      const updated = await db.provider.update({
        where: { id },
        data: { verified: !!body.verified },
      });
      // Mirror the verification state into the user's capability status,
      // so the account-level view of "is this provider cleared" agrees
      // with the profile-level view. Verified → ACTIVE; unverified →
      // PENDING_VERIFICATION (not SUSPENDED — that's reserved for
      // explicit admin action via the SUSPEND action below).
      const newCapStatus = body.verified ? "ACTIVE" : "PENDING_VERIFICATION";
      const caps = JSON.parse(provider.user.capabilities).map((c: any) =>
        c.type === "SERVICE_PROVIDER" ? { ...c, status: newCapStatus } : c,
      );
      await db.user.update({
        where: { id: provider.user.id },
        data: { capabilities: JSON.stringify(caps) },
      });
      return NextResponse.json({ provider: updated });
    }

    if (action === "SUSPEND" || action === "REACTIVATE") {
      const newStatus = action === "SUSPEND" ? "SUSPENDED" : "ACTIVE";
      const caps = JSON.parse(provider.user.capabilities).map((c: any) =>
        c.type === "SERVICE_PROVIDER" ? { ...c, status: newStatus } : c,
      );
      await db.user.update({
        where: { id: provider.user.id },
        data: { capabilities: JSON.stringify(caps) },
      });
      // If reactivating, also flip the provider.verified flag — a
      // suspended provider was unverified by definition; the admin
      // restoring them implies verification was successful.
      if (action === "REACTIVATE") {
        await db.provider.update({
          where: { id },
          data: { verified: true },
        });
      }
      return NextResponse.json({ provider: { id: provider.id, suspended: action === "SUSPEND" } });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error("[admin/providers PATCH] error", err);
    return NextResponse.json({ error: "Failed to update provider" }, { status: 500 });
  }
}
