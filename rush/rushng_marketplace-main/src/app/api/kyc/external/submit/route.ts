import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import {
  canChangeTier,
  normalizeNigerianPhone,
} from "@/lib/kyc";

/**
 * POST /api/kyc/external/submit
 *
 * Body: {
 *   idCardUrl: string,            // /api/uploads/<id> URL — NIN slip photo
 *   ninNumber: string,            // 11-digit NIN number (physically input)
 *   residentialAddress: string,
 *   phone: string,
 *   businessName?: string,
 * }
 *
 * Only NIN is accepted (voter's card and driver's license removed).
 * The NIN number is validated to be exactly 11 digits.
 *
 * Also used by students who completed email OTP — they upload their NIN
 * as an additional verification step. When called by a student who is
 * already STUDENT_LASU APPROVED, we just add the NIN fields without
 * changing the tier.
 */
export async function POST(req: NextRequest) {
  const blocked = enforceRateLimit(req, "kyc-external-submit", { limit: 3, windowMs: 60 * 60_000 });
  if (blocked) return blocked;

  try {
    const user = await requireUser();

    const body = await req.json().catch(() => ({}));
    const {
      idCardUrl,
      ninNumber,
      residentialAddress,
      phone,
      businessName,
    } = body;

    // ─── Field validation ─────────────────────────────────────────────
    if (typeof idCardUrl !== "string" ||
        (!idCardUrl.startsWith("/api/uploads/") && !idCardUrl.startsWith("/uploads/"))) {
      return NextResponse.json(
        { error: "Please upload a clear photo of your NIN slip." },
        { status: 400 },
      );
    }

    // NIN number must be exactly 11 digits.
    const sanitizedNin = typeof ninNumber === "string" ? ninNumber.replace(/\D/g, "") : "";
    if (sanitizedNin.length !== 11) {
      return NextResponse.json(
        { error: "Please enter your 11-digit NIN number." },
        { status: 400 },
      );
    }

    if (typeof residentialAddress !== "string" || residentialAddress.trim().length < 10) {
      return NextResponse.json(
        { error: "Please enter your full residential address (at least 10 characters)." },
        { status: 400 },
      );
    }

    const normalizedPhone = normalizeNigerianPhone(phone);
    if (!normalizedPhone) {
      return NextResponse.json(
        {
          error:
            "Please enter a valid Nigerian phone number (e.g. 08012345678 or +2348012345678).",
        },
        { status: 400 },
      );
    }

    // ─── Vendor profile gate ──────────────────────────────────────────
    const vendorProfile = (user as any).vendorProfile;
    if (!vendorProfile) {
      return NextResponse.json(
        { error: "Open a vendor store before submitting verification." },
        { status: 403 },
      );
    }

    // ─── Determine the target tier ────────────────────────────────────
    // If the vendor is already STUDENT_LASU APPROVED (just completed
    // email OTP), this is a supplementary NIN upload — we keep the tier
    // as STUDENT_LASU and just add the NIN fields.
    //
    // If the vendor is unverified or coming from "Other Users", we set
    // the tier to COMMUNITY_EXTERNAL with PENDING status (admin review).
    const isStudentAddingNin =
      vendorProfile.verificationTier === "STUDENT_LASU" &&
      vendorProfile.kycStatus === "APPROVED";

    let targetTier: string;
    let targetStatus: string;

    if (isStudentAddingNin) {
      // Student already verified via email — just add NIN, keep APPROVED.
      targetTier = "STUDENT_LASU";
      targetStatus = "APPROVED";
    } else {
      // Other Users path — admin review required.
      targetTier = "COMMUNITY_EXTERNAL";
      targetStatus = "PENDING";

      const tierCheck = canChangeTier(
        vendorProfile.verificationTier,
        vendorProfile.kycStatus,
        "COMMUNITY_EXTERNAL",
      );
      if (!tierCheck.allowed) {
        return NextResponse.json({ error: tierCheck.reason }, { status: 409 });
      }
    }

    // ─── Persist the submission ───────────────────────────────────────
    const updates: Record<string, unknown> = {
      idCardUrl,
      idType: "NIN",
      ninNumber: sanitizedNin,
      residentialAddress: residentialAddress.trim(),
      kycPhone: normalizedPhone,
      rejectionReason: null,
    };

    if (!isStudentAddingNin) {
      // Only set tier + status for the "Other Users" path (not for
      // students who are just adding NIN to their existing approval).
      updates.verificationTier = targetTier;
      updates.kycStatus = targetStatus;
      updates.reviewedByAdminId = null;
      updates.reviewedAt = null;
      updates.institutionalEmail = null;
      updates.matricOrPfNumber = null;
    }

    if (typeof businessName === "string" && businessName.trim().length >= 2) {
      updates.businessName = businessName.trim();
    }

    await db.vendorProfile.update({
      where: { id: vendorProfile.id },
      data: updates,
    });

    return NextResponse.json({
      success: true,
      tier: targetTier,
      kycStatus: targetStatus,
      message: isStudentAddingNin
        ? "NIN uploaded successfully. Your verified student badge is active."
        : "Your NIN has been submitted for review. Our team will review it within 1-2 business days. " +
          "You can keep using Rush in the meantime.",
    });
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error("[kyc/external-submit POST] error", err);
    return NextResponse.json(
      { error: err?.message || "Failed to submit verification." },
      { status: 500 },
    );
  }
}
