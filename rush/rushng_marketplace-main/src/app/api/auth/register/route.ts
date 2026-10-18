import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendWelcomeEmail, sendVerificationEmail } from "@/lib/email";
import {
  hashPassword,
  createToken,
  createVerificationToken,
  setSessionCookie,
  addCapability,
  serializeCapabilities,
} from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  // Rate limit: 5 signups per hour per IP. Defends against
  // automated account creation.
  const blocked = enforceRateLimit(req, "register", { limit: 5, windowMs: 60 * 60_000 });
  if (blocked) return blocked;

  try {
    const body = await req.json();
    const { name, email, phone, password, location } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: "Name, email, and password are required" },
        { status: 400 },
      );
    }

    const existing = await db.user.findUnique({
      where: { email },
    });

    if (existing) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 },
      );
    }

    const passwordHash = await hashPassword(password);

    const user = await db.user.create({
      data: {
        name,
        email,
        phone: phone || null,
        location: location || null,
        passwordHash,
        emailVerified: false,
        avatar:
          body.avatar ||
          `https://ui-avatars.com/api/?name=${encodeURIComponent(
            name,
          )}&background=FF6B1A&color=fff`,
        capabilities: serializeCapabilities(
          addCapability(
            { capabilities: null },
            "CUSTOMER",
            "ACTIVE",
          ),
        ),
        activeWorkspace: "CUSTOMER",
        wallet: {
          create: {
            balance: 0,
          },
        },
      },
      include: {
        wallet: true,
      },
    });

    /*
     * Send verification and welcome emails.
     * If email delivery fails, account creation should still succeed.
     */
    const verificationToken = createVerificationToken(user.id, user.email);

    try {
      await sendVerificationEmail({
        userId: user.id,
        email: user.email,
        name: user.name,
        token: verificationToken,
      });
    } catch (emailErr) {
      console.error("[register POST] Verification email delivery failed:", emailErr);
    }

    try {
      await sendWelcomeEmail({
        userId: user.id,
        email: user.email,
        name: user.name,
      });
    } catch (emailError) {
      console.error(
        "[register] welcome email failed:",
        emailError,
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
      wallet: user.wallet,
    });
  } catch (err) {
    console.error("[register] error", err);

    return NextResponse.json(
      {
        error: "Failed to register. Please try again.",
      },
      {
        status: 500,
      },
    );
  }
}
