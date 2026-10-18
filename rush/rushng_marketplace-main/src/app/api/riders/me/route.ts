import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

// PATCH /api/riders/me — the rider updates their own profile (currently: online toggle).
export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser();
    const riderProfile = (user as any).riderProfile;
    if (!riderProfile) {
      return NextResponse.json({ error: "You don't have a rider profile yet." }, { status: 403 });
    }

    const body = await req.json();
    const { online } = body;

    if (online === true && riderProfile.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "You need to be verified before you can go online." },
        { status: 400 },
      );
    }

    const updated = await db.riderProfile.update({
      where: { id: riderProfile.id },
      data: { ...(typeof online === "boolean" ? { online } : {}) },
      include: { vehicle: true },
    });

    return NextResponse.json({ riderProfile: updated });
  } catch (err) {
    if (err instanceof Response) throw err;
    console.error("[riders/me PATCH] error", err);
    return NextResponse.json({ error: "Failed to update rider profile" }, { status: 500 });
  }
}
