import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email/send";
import { kycOtpEmailTemplate } from "@/lib/email/templates";
import {
  generateOtp,
  hashOtp,
  isLasuInstitutionalEmail,
  normalizeEmail,
  OTP_TTL_MS,
  OTP_RESEND_COOLDOWN_MS,
  canChangeTier,
} from "@/lib/kyc";

/**
 * POST /api/kyc/institutional/send-otp
 *
 * Body: { institutionalEmail: string }
 *
 * Validates the supplied LASU student email, ensures it isn't already
 * claimed by another APPROVED vendor, generates a 6-digit OTP, persists
 * its hash with a 10-minute expiry, and emails the OTP to the address.
 *
 * Staff verification has been removed — only students use this route.
 */
export async function POST(req: NextRequest) {
  const blocked = enforceRateLimit(req, "kyc-send-otp", { limit: 5, windowMs: 60_000 });
  if (blocked) return blocked;

  try {
    const user = await requireUser();

    const body = await req.json().catch(() => ({}));
    const email = normalizeEmail(body.institutionalEmail);

    if (!email) {
      return NextResponse.json(
        { error: "Please enter your institutional email address." },
        { status: 400 },
      );
    }

    if (!isLasuInstitutionalEmail(email)) {
      return NextResponse.json(
        {
          error:
            "Please enter a valid LASU student email address. " +
            "Format: name.surname<matric>@st.lasu.edu.ng " +
            "(e.g. emeka.divine220591001@st.lasu.edu.ng).",
        },
        { status: 400 },
      );
    }

    // ─── Vendor profile gate ──────────────────────────────────────────
    const vendorProfile = (user as any).vendorProfile;
    if (!vendorProfile) {
      return NextResponse.json(
        { error: "Open a vendor store before requesting verification." },
        { status: 403 },
      );
    }

    // Tier-transition guard
    const tierCheck = canChangeTier(
      vendorProfile.verificationTier,
      vendorProfile.kycStatus,
      "STUDENT_LASU",
    );
    if (!tierCheck.allowed) {
      return NextResponse.json({ error: tierCheck.reason }, { status: 409 });
    }

    // ─── Email-claim guard ────────────────────────────────────────────
    const claimedBy = await db.vendorProfile.findFirst({
      where: {
        institutionalEmail: email,
        kycStatus: "APPROVED",
        id: { not: vendorProfile.id },
      },
      select: { id: true },
    });
    if (claimedBy) {
      return NextResponse.json(
        {
          error:
            "This institutional email has already been verified on another Rush account. " +
            "If you believe this is a mistake, contact support.",
        },
        { status: 409 },
      );
    }

    // ─── Resend cooldown ──────────────────────────────────────────────
    const otpType = "LASU_STUDENT_EMAIL";
    const recentOtp = await db.verificationOtp.findFirst({
      where: { target: email, type: otpType },
      orderBy: { createdAt: "desc" },
    });
    if (recentOtp) {
      const ageMs = Date.now() - new Date(recentOtp.createdAt).getTime();
      if (ageMs < OTP_RESEND_COOLDOWN_MS) {
        const retryInSec = Math.ceil((OTP_RESEND_COOLDOWN_MS - ageMs) / 1000);
        return NextResponse.json(
          { error: `Please wait ${retryInSec}s before requesting another code.` },
          { status: 429 },
        );
      }
    }

    // ─── Issue new OTP ────────────────────────────────────────────────
    const otp = generateOtp();
    const codeHash = hashOtp(otp);
    const expiresAt = new Date(Date.now() + OTP_TTL_MS);

    if (recentOtp) {
      await db.verificationOtp.deleteMany({
        where: { target: email, type: otpType },
      });
    }

    await db.verificationOtp.create({
      data: {
        target: email,
        codeHash,
        type: otpType,
        expiresAt,
        attempts: 0,
      },
    });

    // ─── Send the email ───────────────────────────────────────────────
    const template = kycOtpEmailTemplate({
      name: user.name,
      otp,
      tier: "STUDENT_LASU",
      expiresAt,
    });
    const sendResult = await sendEmail({
      to: { email, name: user.name, userId: user.id },
      subject: template.subject,
      html: template.html,
      text: template.text,
      type: "KYC_OTP",
      idempotencyKey: `kyc-otp:${email}:${Date.now()}`,
      metadata: { tier: "STUDENT_LASU", role: "STUDENT" },
    });

    if (!sendResult.success && !sendResult.skipped) {
      console.error("[kyc/send-otp] email send failed:", sendResult.error);
    }

    return NextResponse.json({
      message: `Verification code sent to ${email}. Check your inbox (and spam folder).`,
      maskedEmail: maskEmail(email),
      expiresInMs: OTP_TTL_MS,
    });
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error("[kyc/send-otp POST] error", err);
    return NextResponse.json(
      { error: err?.message || "Failed to send verification code." },
      { status: 500 },
    );
  }
}

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  return `${local[0]}${"*".repeat(Math.max(2, local.length - 1))}@${domain}`;
}
