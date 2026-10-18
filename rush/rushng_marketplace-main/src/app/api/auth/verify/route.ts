// src/app/api/auth/verify/route.ts
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyVerificationToken, setSessionCookie, createToken } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");

  if (!token) {
    return NextResponse.redirect(new URL("/?verified=false&reason=missing", req.url));
  }

  const payload = verifyVerificationToken(token);
  if (!payload) {
    return NextResponse.redirect(new URL("/?verified=false&reason=expired", req.url));
  }

  const user = await db.user.findUnique({
    where: { id: payload.userId },
  });

  if (!user || user.email !== payload.email) {
    return NextResponse.redirect(new URL("/?verified=false&reason=not_found", req.url));
  }

  // Update user in DB
  await db.user.update({
    where: { id: user.id },
    data: {
      emailVerified: true,
      // If capabilities need updating or status checks:
    },
  });

  // Issue session cookie so they land logged in
  const sessionToken = await createToken(user.id);
  const response = NextResponse.redirect(new URL("/?verified=true", req.url));

  response.cookies.set("rush_session", sessionToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  return response;
}
