import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import crypto from "crypto";

function hashPassword(password: string): string {
  return crypto.createHash("sha256").update(password).digest("hex");
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const { oldPassword, newPassword } = await req.json();

    if (!oldPassword || !newPassword) {
      return NextResponse.json({ error: "Both current and new password are required" }, { status: 400 });
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: "New password must be at least 6 characters" }, { status: 400 });
    }

    const dbUser = await db.user.findUnique({ where: { id: user.id } });
    if (!dbUser?.passwordHash) {
      return NextResponse.json(
        { error: "Account signed in using external provider (e.g. Firebase/Google). No password to change." },
        { status: 400 },
      );
    }

    if (dbUser.passwordHash !== hashPassword(oldPassword)) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 403 });
    }

    await db.user.update({
      where: { id: user.id },
      data: { passwordHash: hashPassword(newPassword) },
    });

    return NextResponse.json({ ok: true, message: "Password updated successfully" });
  } catch (err: any) {
    if (err instanceof Response) return err;
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
