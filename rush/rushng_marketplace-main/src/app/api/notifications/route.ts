import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

/**
 * GET /api/notifications
 *
 * Returns the current user's notifications, most-recent first.
 * Query params:
 *   ?unread=1    — only unread notifications
 *   ?limit=20    — cap (default 50, max 200)
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const url = new URL(req.url);
    const unreadOnly = url.searchParams.get("unread") === "1";
    const limit = Math.min(
      200,
      parseInt(url.searchParams.get("limit") || "50", 10),
    );

    const where: Record<string, unknown> = { userId: user.id };
    if (unreadOnly) where.read = false;

    const notifications = await db.notification.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
    });

    const unreadCount = await db.notification.count({
      where: { userId: user.id, read: false },
    });

    return NextResponse.json({
      notifications: notifications.map((n: any) => ({
        id: n.id,
        type: n.type,
        title: n.title,
        body: n.body,
        link: n.link ? JSON.parse(n.link) : null,
        read: !!n.read,
        createdAt: n.createdAt instanceof Date ? n.createdAt.toISOString() : n.createdAt,
      })),
      unreadCount,
    });
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error("[notifications GET] error", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch notifications" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/notifications/mark-all-read
 *
 * Marks every notification for the current user as read. Body empty.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const url = new URL(req.url);
    if (url.searchParams.get("action") === "mark-all-read") {
      await db.notification.updateMany({
        where: { userId: user.id, read: false },
        data: { read: true, updatedAt: new Date() },
      });
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json(
      { error: "Use ?action=mark-all-read" },
      { status: 400 },
    );
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error("[notifications POST] error", err);
    return NextResponse.json(
      { error: err.message || "Failed to mark notifications read" },
      { status: 500 },
    );
  }
}
