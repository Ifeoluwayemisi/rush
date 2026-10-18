import "server-only";

/**
 * Vendor KYC domain logic.
 *
 * This module is the single source of truth for:
 *   - LASU email domain rules (student vs staff)
 *   - Verification tier transitions
 *   - OTP generation, hashing, and validation
 *   - The unverified-vendor product listing cap
 *
 * The data model lives on `vendor_profiles` directly (MongoDB is
 * schemaless so we don't need a Prisma migration). The fields are:
 *
 *   verificationTier   "UNVERIFIED" | "STUDENT_LASU" | "STAFF_LASU" | "COMMUNITY_EXTERNAL"
 *   kycStatus          "UNSUBMITTED" | "PENDING" | "APPROVED" | "REJECTED"
 *   institutionalEmail string | null  (e.g. emeka.divine220591001@st.lasu.edu.ng)
 *   matricOrPfNumber   string | null
 *   idCardUrl          string | null  (GridFS /api/uploads/<id> URL)
 *   idType             "NIN" | "VOTER_ID" | "DRIVERS_LICENSE" | null
 *   residentialAddress string | null
 *   verifiedAt         Date | null
 *   rejectionReason    string | null
 *   reviewedByAdminId  string | null
 *   reviewedAt         Date | null
 *
 * OTPs live in a separate `verification_otps` collection (model
 * `verificationOtp` in db.ts) with a TTL index on `expiresAt`.
 */

import crypto from "node:crypto";

// ─── Tiers & statuses ─────────────────────────────────────────────────────

export const VERIFICATION_TIERS = [
  "UNVERIFIED",
  "STUDENT_LASU",
  "STAFF_LASU",
  "COMMUNITY_EXTERNAL",
] as const;
export type VerificationTier = (typeof VERIFICATION_TIERS)[number];

export const KYC_STATUSES = [
  "UNSUBMITTED",
  "PENDING",
  "APPROVED",
  "REJECTED",
] as const;
export type KycStatus = (typeof KYC_STATUSES)[number];

export const KYC_ID_TYPES = ["NIN", "VOTER_ID", "DRIVERS_LICENSE"] as const;
export type KycIdType = (typeof KYC_ID_TYPES)[number];

export const KYC_ID_LABELS: Record<KycIdType, string> = {
  NIN: "NIN Slip",
  VOTER_ID: "Voter's Card",
  DRIVERS_LICENSE: "Driver's License",
};

export type InstitutionalRole = "STUDENT" | "STAFF";

// ─── LASU email domain rules ──────────────────────────────────────────────

/**
 * LASU's institutional domain is `lasu.edu.ng`.
 *
 *   - Students use `@st.lasu.edu.ng`, with the local part following the
 *     canonical format `name.surname<matric_number>` — e.g.
 *     `emeka.divine220591001@st.lasu.edu.ng`.
 *
 * Staff verification has been removed — staff can use the "Other Users"
 * path with NIN upload if they want the verified badge.
 */

/**
 * Canonical LASU student email format, surfaced to the UI as a hint.
 * Example: `emeka.divine220591001@st.lasu.edu.ng`
 */
export const LASU_STUDENT_EMAIL_FORMAT = "name.surname<matric>@st.lasu.edu.ng";
export const LASU_STUDENT_EMAIL_EXAMPLE = "emeka.divine220591001@st.lasu.edu.ng";

/**
 * Strict student email regex. Matches `name.surname<matric>@st.lasu.edu.ng`
 * where:
 *   - `name` is one or more lowercase letters, optionally with hyphens
 *   - then a literal `.` separator
 *   - `surname` is one or more lowercase letters, optionally with hyphens
 *   - `matric_number` is 6–12 digits
 *   - domain is exactly `@st.lasu.edu.ng` (case-insensitive)
 */
const LASU_STUDENT_EMAIL_RE =
  /^[a-z]+(?:-[a-z]+)*\.[a-z]+(?:-[a-z]+)*[0-9]{6,12}@st\.lasu\.edu\.ng$/i;

/**
 * True iff `email` is a valid LASU institutional address (student only).
 * Staff verification has been removed.
 */
export function isLasuInstitutionalEmail(email: string): boolean {
  return LASU_STUDENT_EMAIL_RE.test(email.trim().toLowerCase());
}

/** True iff `email` matches the canonical LASU student format. */
export function isLasuStudentEmail(email: string): boolean {
  return LASU_STUDENT_EMAIL_RE.test(email.trim().toLowerCase());
}

/**
 * Classify an LASU institutional email. Always returns 'STUDENT' since
 * staff verification has been removed. Throws if not an LASU email.
 */
export function classifyLasuEmail(email: string): InstitutionalRole {
  if (!isLasuInstitutionalEmail(email)) {
    throw new Error(`${email} is not a valid LASU student email`);
  }
  return "STUDENT";
}

// ─── OTP generation & hashing ─────────────────────────────────────────────

/** Generate a cryptographically-random 6-digit OTP. */
export function generateOtp(): string {
  // randomInt is uniform — Math.random() would skew the distribution.
  return String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
}

/** SHA-256 hash of an OTP. We store only the hash so a DB leak doesn't
 *  expose unused OTPs. */
export function hashOtp(otp: string): string {
  return crypto.createHash("sha256").update(otp).digest("hex");
}

/** Constant-time comparison of a raw OTP against its hash. */
export function verifyOtpHash(otp: string, expectedHash: string): boolean {
  const actual = hashOtp(otp.trim());
  const a = Buffer.from(actual, "utf-8");
  const b = Buffer.from(expectedHash, "utf-8");
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

export const OTP_TTL_MS = 10 * 60 * 1000; // 10 minutes
export const OTP_RESEND_COOLDOWN_MS = 60 * 1000; // 1 minute between sends
export const OTP_MAX_VERIFY_ATTEMPTS = 5; // per OTP record

// ─── Tier rules ───────────────────────────────────────────────────────────

/**
 * Maximum number of *active* (non-deleted) products an unverified
 * vendor can list. Verified vendors (any tier with kycStatus APPROVED)
 * have unlimited listings.
 *
 * The number is intentionally low — it's a soft cap that nudges
 * vendors toward completing KYC without blocking them from testing
 * the platform. The cap is enforced in POST /api/products.
 */
export const UNVERIFIED_PRODUCT_CAP = 5;

/**
 * True iff this vendor's KYC state means "fully verified" — eligible
 * for unlimited listings, the verified badge, and priority in feeds.
 *
 * Legacy vendors (created before KYC shipped) have `verificationTier`
 * unset — we treat them as UNVERIFIED. Admins can still set the legacy
 * `verified: true` flag directly for hand-picked accounts, which we
 * also honour here so existing verified vendors don't lose their
 * badge.
 */
export function isFullyVerified(vendor: {
  verificationTier?: string | null;
  kycStatus?: string | null;
  verified?: boolean | null;
}): boolean {
  if (vendor?.verified === true) return true; // legacy admin-verified
  if (!vendor?.verificationTier || vendor.verificationTier === "UNVERIFIED") return false;
  return vendor.kycStatus === "APPROVED";
}

/**
 * The badge variant a buyer should see on this vendor's store / cards.
 * Returns null when no badge should be shown (truly unverified, no
 * legacy admin override).
 */
export function getBadgeTier(vendor: {
  verificationTier?: string | null;
  kycStatus?: string | null;
  verified?: boolean | null;
}): VerificationTier | null {
  if (isFullyVerified(vendor)) {
    if (vendor.verificationTier && vendor.verificationTier !== "UNVERIFIED") {
      return vendor.verificationTier as VerificationTier;
    }
    // Legacy admin-verified vendors with no tier → treat as COMMUNITY_EXTERNAL
    // so they still get a badge, but the "LASU Student/Staff" label is
    // reserved for accounts that went through the institutional flow.
    return "COMMUNITY_EXTERNAL";
  }
  return null;
}

/**
 * A vendor may NOT switch tiers once APPROVED without admin intervention.
 * This stops a verified student from "downgrading" themselves to
 * external (which would let them re-submit with a fake ID) or claiming
 * a new institutional identity.
 *
 * Allowed transitions:
 *   - From UNSUBMITTED / REJECTED → any tier
 *   - From PENDING (same tier) → resubmit / withdraw
 *   - From APPROVED → no tier change without admin action
 */
export function canChangeTier(
  currentTier: VerificationTier | null | undefined,
  currentStatus: KycStatus | null | undefined,
  _newTier: VerificationTier,
): { allowed: boolean; reason?: string } {
  if (currentStatus === "APPROVED") {
    if (currentTier === _newTier) {
      // Re-submitting the same tier (e.g. institutional email changed)
      return { allowed: true };
    }
    return {
      allowed: false,
      reason:
        "Your account is already verified under a different tier. " +
        "Contact support if you need to change your verification type.",
    };
  }
  return { allowed: true };
}

// ─── Public-safe vs private KYC projection ────────────────────────────────

/**
 * The subset of KYC fields safe to expose on the public marketplace
 * (in /api/stores responses, product cards, search results). Anything
 * not in this list is considered PII and is only returned to the
 * vendor themselves (via /api/auth/me) or to admins.
 */
export function publicKycView(vendor: any) {
  if (!vendor) return null;
  const tier = (vendor.verificationTier ?? "UNVERIFIED") as VerificationTier;
  const status = (vendor.kycStatus ?? "UNSUBMITTED") as KycStatus;
  // Only surface a rejection reason to the OWNER, never to the public.
  return {
    verificationTier: tier,
    kycStatus: status,
    verifiedAt: vendor.verifiedAt instanceof Date
      ? vendor.verifiedAt.toISOString()
      : vendor.verifiedAt ?? null,
  };
}

/**
 * The full KYC record — only returned to the vendor themselves or to
 * admins. Includes PII like institutional email, PF/matric, ID card
 * URL, and residential address.
 */
export function privateKycView(vendor: any) {
  if (!vendor) return null;
  return {
    ...publicKycView(vendor),
    institutionalEmail: vendor.institutionalEmail ?? null,
    matricOrPfNumber: vendor.matricOrPfNumber ?? null,
    idCardUrl: vendor.idCardUrl ?? null,
    idType: vendor.idType ?? null,
    residentialAddress: vendor.residentialAddress ?? null,
    ninNumber: vendor.ninNumber ?? null,
    reviewedByAdminId: vendor.reviewedByAdminId ?? null,
    reviewedAt: vendor.reviewedAt instanceof Date
      ? vendor.reviewedAt.toISOString()
      : vendor.reviewedAt ?? null,
    rejectionReason: vendor.rejectionReason ?? null,
  };
}

// ─── Validation helpers (used by API routes) ──────────────────────────────

/** Strip + lower-case an email. Returns null if not a string. */
export function normalizeEmail(email: unknown): string | null {
  if (typeof email !== "string") return null;
  const trimmed = email.trim().toLowerCase();
  return trimmed.length > 0 ? trimmed : null;
}

/** Validate a Nigerian phone number in roughly +234 / 0XXX form. */
export function normalizeNigerianPhone(phone: unknown): string | null {
  if (typeof phone !== "string") return null;
  const trimmed = phone.replace(/[\s-]/g, "");
  // Accept +234XXXXXXXXXX or 0XXXXXXXXXX (11 digits). We store as-is.
  if (/^\+234\d{10}$/.test(trimmed) || /^0\d{10}$/.test(trimmed)) {
    return trimmed;
  }
  return null;
}

/** Validate a PF / matric number — non-empty alphanumeric, 4-30 chars. */
export function isValidMatricOrPf(value: unknown): boolean {
  if (typeof value !== "string") return false;
  const trimmed = value.trim();
  return trimmed.length >= 4 && trimmed.length <= 30 && /^[a-zA-Z0-9/\-]+$/.test(trimmed);
}
