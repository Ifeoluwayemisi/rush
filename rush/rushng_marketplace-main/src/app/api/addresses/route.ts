import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { randomBytes } from "node:crypto";

export async function GET() {
  try {
    const user = await requireUser();
    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      select: { addresses: true },
    });

    const addresses = dbUser?.addresses ? JSON.parse(dbUser.addresses as string) : [];
    return NextResponse.json({ addresses });
  } catch (err: any) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const { label, address, city, state } = await req.json();

    if (!address) {
      return NextResponse.json({ error: "Address is required" }, { status: 400 });
    }

    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      select: { addresses: true },
    });

    const existing = dbUser?.addresses ? JSON.parse(dbUser.addresses as string) : [];
    const newAddress = {
      id: randomBytes(6).toString("hex"),
      label: label || "Home",
      address,
      city: city || "Lagos",
      state: state || "Lagos",
      createdAt: new Date().toISOString(),
    };

    const updated = [...existing, newAddress];

    await db.user.update({
      where: { id: user.id },
      data: { addresses: JSON.stringify(updated) },
    });

    return NextResponse.json({ ok: true, address: newAddress });
  } catch (err: any) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireUser();
    let id = req.nextUrl.searchParams.get("id");

    if (!id) {
      const body = await req.json().catch(() => ({}));
      id = body.id;
    }

    if (!id) {
      return NextResponse.json({ error: "Address id is required" }, { status: 400 });
    }

    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      select: { addresses: true },
    });

    const existing = dbUser?.addresses ? JSON.parse(dbUser.addresses as string) : [];
    const updated = existing.filter((a: any) => a.id !== id);

    await db.user.update({
      where: { id: user.id },
      data: { addresses: JSON.stringify(updated) },
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
