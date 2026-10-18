import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { verifyPassword, createToken, setSessionCookie } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  // Rate limit: 10 login attempts per minute per IP. Protects
  // against brute-force password attacks.
  const blocked = enforceRateLimit(req, "login", { limit: 10, windowMs: 60_000 });
  if (blocked) return blocked;

  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 },
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        vendorProfile: true,
        providerProfile: true,
        riderProfile: { include: { vehicle: true } },
        wallet: true,
      },
    });

    // 401 Unauthorized prevents account enumeration probes
    if (!user) {
      return NextResponse.json(
        { error: "Invalid email or password. Please check your credentials or register." },
        { status: 401 },
      );
    }

    // Accounts created via Firebase (Google Sign-In) have passwordHash = null.
    // Refuse the legacy email/password flow for them — they must sign in
    // with Google again.
    if (!user.passwordHash) {
      return NextResponse.json(
        {
          error:
            "This account was created with Google. Please use the “Continue with Google” button to sign in.",
        },
        { status: 401 },
      );
    }

    const ok = await verifyPassword(password, user.passwordHash);
    if (!ok) {
      return NextResponse.json(
        { error: "Invalid email or password. Please check your credentials or register." },
        { status: 401 },
      );
    }

    const token = await createToken(user.id);
    await setSessionCookie(token);

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      avatar: user.avatar,
      location: user.location,
      emailVerified: user.emailVerified,
      capabilities: JSON.parse(user.capabilities),
      activeWorkspace: user.activeWorkspace,
      vendorProfile: user.vendorProfile,
      providerProfile: user.providerProfile,
      riderProfile: user.riderProfile,
      wallet: user.wallet,
    });
  } catch (err) {
    console.error("[login] error", err);
    return NextResponse.json(
      { error: "Failed to log in. Please try again." },
      { status: 500 },
    );
  }
}
