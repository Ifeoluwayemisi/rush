import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

/**
 * PATCH /api/notifications/:id
 *
 * Body: { read: true | false }
 *
 * Marks a single notification read or unread. Only the owner of the
 * notification can change it.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const user = await requireUser();
    const { id } = await params;
    const body = await req.json();
    const { read } = body;

    if (typeof read !== "boolean") {
      return NextResponse.json(
        { error: "read must be true or false" },
        { status: 400 },
      );
    }

    const existing = await db.notification.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    if (existing.userId !== user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await db.notification.update({
      where: { id },
      data: { read, updatedAt: new Date() },
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error("[notifications PATCH] error", err);
    return NextResponse.json(
      { error: err.message || "Failed to update notification" },
      { status: 500 },
    );
  }
}
