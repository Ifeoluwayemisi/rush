import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth";
import { sendEmail } from "@/lib/email/send";
import { kycApprovedEmailTemplate, kycRejectedEmailTemplate } from "@/lib/email/templates";

/**
 * PATCH /api/admin/kyc/:id
 *
 * Body: { action: "APPROVE" | "REJECT", reason?: string }
 *
 * Approve or reject a vendor's KYC submission.
 *
 *  - APPROVE:  sets kycStatus = APPROVED, verifiedAt = now,
 *              reviewedByAdminId = admin's user id, verified = true
 *              (legacy flag). Sends a confirmation email to the vendor.
 *
 *  - REJECT:   sets kycStatus = REJECTED, rejectionReason = reason,
 *              reviewedByAdminId, reviewedAt. Sends a rejection email.
 *              The vendor can re-submit from their store settings
 *              (the tier-transition guard allows REJECTED → any).
 *
 * The admin's id is taken from the requireAdmin() session — never
 * from the request body — so we have a non-repudiable audit trail.
 */
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { action, reason } = body;

    if (action !== "APPROVE" && action !== "REJECT") {
      return NextResponse.json(
        { error: "Action must be APPROVE or REJECT." },
        { status: 400 },
      );
    }

    if (action === "REJECT") {
      if (typeof reason !== "string" || reason.trim().length < 5) {
        return NextResponse.json(
          { error: "Please provide a reason for rejecting this submission (min 5 chars)." },
          { status: 400 },
        );
      }
    }

    const vendor = await db.vendorProfile.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!vendor) {
      return NextResponse.json({ error: "Vendor not found." }, { status: 404 });
    }

    // Don't allow re-approving an already-approved vendor — would
    // overwrite the original approval audit and re-send the email.
    if (action === "APPROVE" && vendor.kycStatus === "APPROVED") {
      return NextResponse.json(
        { error: "This vendor is already approved." },
        { status: 400 },
      );
    }

    const now = new Date();

    if (action === "APPROVE") {
      await db.vendorProfile.update({
        where: { id },
        data: {
          kycStatus: "APPROVED",
          verifiedAt: now,
          reviewedByAdminId: admin.id,
          reviewedAt: now,
          rejectionReason: null,
          // Set the legacy verified flag too so existing UI keeps
          // showing the badge.
          verified: true,
        },
      });

      // Best-effort confirmation email.
      try {
        const tier = (vendor.verificationTier ?? "COMMUNITY_EXTERNAL") as
          | "STUDENT_LASU"
          | "STAFF_LASU"
          | "COMMUNITY_EXTERNAL";
        const template = kycApprovedEmailTemplate({
          name: vendor.user.name,
          tier,
        });
        await sendEmail({
          to: { email: vendor.user.email, name: vendor.user.name, userId: vendor.user.id },
          subject: template.subject,
          html: template.html,
          text: template.text,
          type: "KYC_APPROVED",
          idempotencyKey: `kyc-approved:${vendor.user.id}:${tier}:${now.getTime()}`,
        });
      } catch (err) {
        console.error("[admin/kyc APPROVE] email failed:", err);
      }

      return NextResponse.json({
        success: true,
        message: "Vendor approved. Verification badge is now active.",
      });
    }

    // action === "REJECT"
    await db.vendorProfile.update({
      where: { id },
      data: {
        kycStatus: "REJECTED",
        rejectionReason: reason.trim(),
        reviewedByAdminId: admin.id,
        reviewedAt: now,
        // Clear the verified flag — a previously-approved vendor that
        // is now rejected should lose their badge.
        verified: false,
        // Keep verifiedAt as-is for audit (the previous approval timestamp).
      },
    });

    // Best-effort rejection email.
    try {
      const template = kycRejectedEmailTemplate({
        name: vendor.user.name,
        reason: reason.trim(),
      });
      await sendEmail({
        to: { email: vendor.user.email, name: vendor.user.name, userId: vendor.user.id },
        subject: template.subject,
        html: template.html,
        text: template.text,
        type: "KYC_REJECTED",
        idempotencyKey: `kyc-rejected:${vendor.user.id}:${now.getTime()}`,
      });
    } catch (err) {
      console.error("[admin/kyc REJECT] email failed:", err);
    }

    return NextResponse.json({
      success: true,
      message: "Vendor rejected. They can re-submit from their store settings.",
    });
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error("[admin/kyc PATCH] error", err);
    return NextResponse.json(
      { error: err?.message || "Failed to update KYC status." },
      { status: 500 },
    );
  }
}
