import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email/send";
import { kycApprovedEmailTemplate } from "@/lib/email/templates";
import {
  hashOtp,
  isLasuInstitutionalEmail,
  normalizeEmail,
  canChangeTier,
  OTP_MAX_VERIFY_ATTEMPTS,
} from "@/lib/kyc";

/**
 * POST /api/kyc/institutional/verify-otp
 *
 * Body: { institutionalEmail: string, otp: string, matricOrPfNumber?: string }
 *
 * Student-only flow (staff verification removed). On success: upgrades
 * the vendor's verificationTier to STUDENT_LASU and sets kycStatus = APPROVED.
 *
 * After email OTP verification, students are ALSO required to upload their
 * NIN (National Identification Number) — but that happens in a separate
 * step via the external submit route (with idType=NIN). The OTP verification
 * here sets the tier to STUDENT_LASU but leaves the NIN fields empty.
 * The UI will prompt the student to upload their NIN next.
 */
export async function POST(req: NextRequest) {
  const blocked = enforceRateLimit(req, "kyc-verify-otp", { limit: 10, windowMs: 60_000 });
  if (blocked) return blocked;

  try {
    const user = await requireUser();

    const body = await req.json().catch(() => ({}));
    const email = normalizeEmail(body.institutionalEmail);
    const otpRaw = typeof body.otp === "string" ? body.otp.trim() : "";
    const matricOrPfNumber =
      typeof body.matricOrPfNumber === "string" ? body.matricOrPfNumber.trim() : "";

    if (!email || !otpRaw) {
      return NextResponse.json(
        { error: "Email and verification code are required." },
        { status: 400 },
      );
    }
    if (!isLasuInstitutionalEmail(email)) {
      return NextResponse.json(
        { error: "Invalid LASU student email." },
        { status: 400 },
      );
    }

    // ─── Vendor profile gate ──────────────────────────────────────────
    const vendorProfile = (user as any).vendorProfile;
    if (!vendorProfile) {
      return NextResponse.json(
        { error: "Open a vendor store before verifying." },
        { status: 403 },
      );
    }

    const tierCheck = canChangeTier(
      vendorProfile.verificationTier,
      vendorProfile.kycStatus,
      "STUDENT_LASU",
    );
    if (!tierCheck.allowed) {
      return NextResponse.json({ error: tierCheck.reason }, { status: 409 });
    }

    // ─── Look up the OTP ──────────────────────────────────────────────
    const otpType = "LASU_STUDENT_EMAIL";
    const candidateHash = hashOtp(otpRaw);

    const otpRecord = await db.verificationOtp.findFirst({
      where: {
        target: email,
        type: otpType,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: "desc" },
    });

    if (!otpRecord) {
      return NextResponse.json(
        { error: "No active verification code found. Please request a new code." },
        { status: 400 },
      );
    }

    // ─── Attempt-limit check ──────────────────────────────────────────
    const currentAttempts = (otpRecord as any).attempts ?? 0;
    if (currentAttempts >= OTP_MAX_VERIFY_ATTEMPTS) {
      await db.verificationOtp.delete({ where: { id: otpRecord.id } });
      return NextResponse.json(
        {
          error:
            "Too many incorrect attempts. For security, this code has been invalidated. " +
            "Please request a new verification code.",
        },
        { status: 429 },
      );
    }

    // ─── Hash compare ─────────────────────────────────────────────────
    if (candidateHash !== otpRecord.codeHash) {
      try {
        await db.verificationOtp.update({
          where: { id: otpRecord.id },
          data: { attempts: { increment: 1 } } as any,
        });
      } catch (_) {}

      const remaining = OTP_MAX_VERIFY_ATTEMPTS - (currentAttempts + 1);
      return NextResponse.json(
        {
          error:
            remaining > 0
              ? `Incorrect code. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`
              : "Incorrect code. This code has been invalidated — please request a new one.",
        },
        { status: 400 },
      );
    }

    // ─── Success: burn the OTP and upgrade the vendor ────────────────
    await db.verificationOtp.delete({ where: { id: otpRecord.id } });

    const updates: Record<string, unknown> = {
      verificationTier: "STUDENT_LASU",
      kycStatus: "APPROVED",
      verifiedAt: new Date(),
      institutionalEmail: email,
      rejectionReason: null,
      verified: true,
    };
    if (matricOrPfNumber) {
      updates.matricOrPfNumber = matricOrPfNumber;
    }

    await db.vendorProfile.update({
      where: { id: vendorProfile.id },
      data: updates,
    });

    // ─── Send confirmation email ──────────────────────────────────────
    try {
      const template = kycApprovedEmailTemplate({
        name: user.name,
        tier: "STUDENT_LASU",
      });
      await sendEmail({
        to: { email: user.email, name: user.name, userId: user.id },
        subject: template.subject,
        html: template.html,
        text: template.text,
        type: "KYC_APPROVED",
        idempotencyKey: `kyc-approved:${user.id}:STUDENT_LASU`,
      });
    } catch (err) {
      console.error("[kyc/verify-otp] confirmation email failed:", err);
    }

    return NextResponse.json({
      success: true,
      tier: "STUDENT_LASU",
      message: "LASU student verification successful! Your verified badge is now active.",
    });
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error("[kyc/verify-otp POST] error", err);
    return NextResponse.json(
      { error: err?.message || "Failed to verify code." },
      { status: 500 },
    );
  }
}
