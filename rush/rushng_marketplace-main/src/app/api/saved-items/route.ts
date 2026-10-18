import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const user = await requireUser();
    const type = req.nextUrl.searchParams.get("type");

    const where: any = { userId: user.id };
    if (type) where.targetType = type;

    const items = await db.follow.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ items });
  } catch (err: any) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: err.message || "Failed to load saved items" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const { targetId, targetType } = await req.json();

    if (!targetId || !targetType) {
      return NextResponse.json({ error: "targetId and targetType are required" }, { status: 400 });
    }

    const follow = await db.follow.upsert({
      where: {
        userId_targetId_targetType: {
          userId: user.id,
          targetId,
          targetType,
        },
      },
      create: {
        userId: user.id,
        targetId,
        targetType,
      },
      update: {},
    });

    return NextResponse.json({ ok: true, follow });
  } catch (err: any) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: err.message || "Failed to save item" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireUser();
    let targetId = req.nextUrl.searchParams.get("targetId");
    let targetType = req.nextUrl.searchParams.get("targetType");

    if (!targetId || !targetType) {
      const body = await req.json().catch(() => ({}));
      targetId = body.targetId;
      targetType = body.targetType;
    }

    if (!targetId || !targetType) {
      return NextResponse.json({ error: "Missing targetId or targetType" }, { status: 400 });
    }

    await db.follow.deleteMany({
      where: {
        userId: user.id,
        targetId,
        targetType,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: err.message || "Failed to unsave item" }, { status: 500 });
  }
}
