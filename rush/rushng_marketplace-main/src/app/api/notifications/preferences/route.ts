import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requireUser();
    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      select: { notificationPrefs: true },
    });

    const prefs = dbUser?.notificationPrefs
      ? JSON.parse(dbUser.notificationPrefs as string)
      : {
          orders: true,
          rides: true,
          wallet: true,
          marketing: false,
        };

    return NextResponse.json({ preferences: prefs });
  } catch (err: any) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser();
    const updates = await req.json();

    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      select: { notificationPrefs: true },
    });

    const current = dbUser?.notificationPrefs ? JSON.parse(dbUser.notificationPrefs as string) : {};
    const merged = { ...current, ...updates };

    await db.user.update({
      where: { id: user.id },
      data: { notificationPrefs: JSON.stringify(merged) },
    });

    return NextResponse.json({ ok: true, preferences: merged });
  } catch (err: any) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
