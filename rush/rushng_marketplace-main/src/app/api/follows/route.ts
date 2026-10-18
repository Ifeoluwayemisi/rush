import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { notifyUser } from "@/lib/notify";

/**
 * POST /api/follows — follow a vendor or provider.
 *
 * Body: { targetType: "vendor" | "provider", targetId: string }
 *
 * Idempotent — following an already-followed target is a no-op.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const { targetType, targetId } = body;

    if (!targetType || !targetId) {
      return NextResponse.json(
        { error: "targetType and targetId are required" },
        { status: 400 },
      );
    }
    if (targetType !== "vendor" && targetType !== "provider") {
      return NextResponse.json(
        { error: "targetType must be 'vendor' or 'provider'" },
        { status: 400 },
      );
    }

    // Verify the target exists.
    const target =
      targetType === "vendor"
        ? await db.vendorProfile.findUnique({ where: { id: targetId } })
        : await db.provider.findUnique({ where: { id: targetId } });
    if (!target) {
      return NextResponse.json({ error: "Target not found" }, { status: 404 });
    }

    // Upsert the follow record. Unique index on (userId, targetType,
    // targetId) prevents duplicates at the DB level.
    const existing = await db.follow.findFirst({
      where: { userId: user.id, targetType, targetId },
    });
    if (!existing) {
      await db.follow.create({
        data: { userId: user.id, targetType, targetId },
      });
      // Bump the follower count on the target.
      if (targetType === "vendor") {
        await db.vendorProfile.update({
          where: { id: targetId },
          data: { followers: { increment: 1 } },
        });
        // Notify the vendor owner they have a new follower.
        void notifyUser({
          userId: target.userId,
          type: "FOLLOW",
          title: "New follower",
          body: `${user.name} is now following your store.`,
          link: { view: "vendor-dashboard" },
        });
      } else {
        await db.provider.update({
          where: { id: targetId },
          data: { followers: { increment: 1 } },
        });
        void notifyUser({
          userId: target.userId,
          type: "FOLLOW",
          title: "New follower",
          body: `${user.name} is now following your service business.`,
          link: { view: "provider-dashboard" },
        });
      }
    }

    return NextResponse.json({ following: true });
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error("[follows POST] error", err);
    return NextResponse.json(
      { error: err.message || "Failed to follow" },
      { status: 500 },
    );
  }
}

/**
 * GET /api/follows?targetType=vendor&targetId=...
 *        /api/follows?mine=1 — list my follows
 *
 * Without query params, returns whether the current user follows the
 * given target. With ?mine=1, returns all the user's follows.
 */
export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const url = new URL(req.url);
    const mine = url.searchParams.get("mine");
    const targetType = url.searchParams.get("targetType");
    const targetId = url.searchParams.get("targetId");

    if (mine === "1") {
      const follows = await db.follow.findMany({
        where: { userId: user.id },
        orderBy: { createdAt: "desc" },
        take: 200,
      });
      return NextResponse.json({
        follows: follows.map((f: any) => ({
          id: f.id,
          targetType: f.targetType,
          targetId: f.targetId,
          createdAt: f.createdAt instanceof Date ? f.createdAt.toISOString() : f.createdAt,
        })),
      });
    }

    if (targetType && targetId) {
      const existing = await db.follow.findFirst({
        where: { userId: user.id, targetType, targetId },
      });
      return NextResponse.json({ following: !!existing });
    }

    return NextResponse.json(
      { error: "Provide ?mine=1 or ?targetType=...&targetId=..." },
      { status: 400 },
    );
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error("[follows GET] error", err);
    return NextResponse.json(
      { error: err.message || "Failed to fetch follows" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/follows?id=<followId>
 *        DELETE /api/follows?targetType=vendor&targetId=...
 *
 * Idempotent — unfollowing a not-followed target is a no-op.
 */
export async function DELETE(req: NextRequest) {
  try {
    const user = await requireUser();
    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    const targetType = url.searchParams.get("targetType");
    const targetId = url.searchParams.get("targetId");

    let follow: any = null;
    if (id) {
      follow = await db.follow.findUnique({ where: { id } });
      if (follow && follow.userId !== user.id) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    } else if (targetType && targetId) {
      follow = await db.follow.findFirst({
        where: { userId: user.id, targetType, targetId },
      });
    } else {
      return NextResponse.json(
        { error: "Provide ?id= or ?targetType=...&targetId=..." },
        { status: 400 },
      );
    }

    if (!follow) {
      // Idempotent — already not following.
      return NextResponse.json({ following: false });
    }

    await db.follow.delete({ where: { id: follow.id } });

    // Decrement the follower count on the target.
    if (follow.targetType === "vendor") {
      await db.vendorProfile.update({
        where: { id: follow.targetId },
        data: { followers: { decrement: 1 } },
      });
    } else {
      await db.provider.update({
        where: { id: follow.targetId },
        data: { followers: { decrement: 1 } },
      });
    }

    return NextResponse.json({ following: false });
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error("[follows DELETE] error", err);
    return NextResponse.json(
      { error: err.message || "Failed to unfollow" },
      { status: 500 },
    );
  }
}
