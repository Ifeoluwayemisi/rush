import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { enforceRateLimit } from "@/lib/rate-limit";
import { sendEmail } from "@/lib/email/send";

/**
 * POST /api/support
 *
 * Body: {
 *   type: "feedback" | "complaint" | "question" | "bug",
 *   subject: string,
 *   message: string,
 * }
 *
 * Sends the user's feedback/complaint to Rush4servicesupport@gmail.com
 * via the Resend email service. The user's name + email + account ID
 * are included so the support team can follow up.
 *
 * Rate-limited: 5 per hour per IP — prevents spam.
 */
const SUPPORT_EMAIL = "Rush4servicesupport@gmail.com";

const VALID_TYPES = ["feedback", "complaint", "question", "bug"] as const;
type SupportType = (typeof VALID_TYPES)[number];

const TYPE_LABELS: Record<SupportType, string> = {
  feedback: "Feedback",
  complaint: "Complaint",
  question: "Question",
  bug: "Bug Report",
};

export async function POST(req: NextRequest) {
  const blocked = enforceRateLimit(req, "support", { limit: 5, windowMs: 60 * 60_000 });
  if (blocked) return blocked;

  try {
    const user = await requireUser();

    const body = await req.json().catch(() => ({}));
    const { type, subject, message } = body;

    // ─── Validation ───────────────────────────────────────────────────
    if (!VALID_TYPES.includes(type)) {
      return NextResponse.json(
        { error: "Please select a valid type (feedback, complaint, question, or bug)." },
        { status: 400 },
      );
    }

    if (typeof subject !== "string" || subject.trim().length < 3) {
      return NextResponse.json(
        { error: "Please enter a subject (at least 3 characters)." },
        { status: 400 },
      );
    }

    if (typeof message !== "string" || message.trim().length < 10) {
      return NextResponse.json(
        { error: "Please enter a message (at least 10 characters)." },
        { status: 400 },
      );
    }

    // ─── Send to support email ────────────────────────────────────────
    const html = `
      <h2>New ${TYPE_LABELS[type as SupportType]} from Rush user</h2>
      <table cellpadding="8" cellspacing="0" style="border-collapse:collapse;font-family:sans-serif;font-size:14px;">
        <tr><td style="color:#666;">Type:</td><td><strong>${TYPE_LABELS[type as SupportType]}</strong></td></tr>
        <tr><td style="color:#666;">Subject:</td><td><strong>${escapeHtml(subject.trim())}</strong></td></tr>
        <tr><td style="color:#666;">From:</td><td>${escapeHtml(user.name)} (${escapeHtml(user.email)})</td></tr>
        <tr><td style="color:#666;">User ID:</td><td>${user.id}</td></tr>
        <tr><td style="color:#666;">Phone:</td><td>${escapeHtml(user.phone || "N/A")}</td></tr>
      </table>
      <h3 style="margin-top:24px;">Message</h3>
      <div style="background:#f7f7f7;padding:16px;border-radius:8px;font-size:14px;line-height:1.6;white-space:pre-wrap;">
        ${escapeHtml(message.trim())}
      </div>
      <p style="margin-top:24px;color:#999;font-size:12px;">
        This message was sent from the Rush app Help &amp; Support form.
        Reply directly to the user's email to follow up.
      </p>
    `;

    const sendResult = await sendEmail({
      to: { email: SUPPORT_EMAIL, name: "Rush Support" },
      subject: `[${TYPE_LABELS[type as SupportType]}] ${subject.trim()}`,
      html,
      text: `${TYPE_LABELS[type as SupportType]} from ${user.name} (${user.email})\n\nSubject: ${subject.trim()}\n\n${message.trim()}`,
      type: "ACCOUNT_UPDATE",
      idempotencyKey: `support:${user.id}:${Date.now()}`,
      metadata: { type, userId: user.id },
    });

    if (!sendResult.success && !sendResult.skipped) {
      console.error("[support] email send failed:", sendResult.error);
      return NextResponse.json(
        { error: "Couldn't send your message right now. Please try again or email us directly at " + SUPPORT_EMAIL },
        { status: 500 },
      );
    }

    return NextResponse.json({
      ok: true,
      message: "Your message has been sent to our support team. We'll get back to you soon!",
    });
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error("[support POST] error", err);
    return NextResponse.json(
      { error: err?.message || "Failed to send message." },
      { status: 500 },
    );
  }
}

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
