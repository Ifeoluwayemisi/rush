# Vendor KYC Verification — Implementation Summary

This document describes the LASU vendor KYC verification feature added to Rush.

## What it does

Decouples **Account Authentication** (Gmail/Google login) from **Vendor KYC Verification**. A vendor logs in with their personal email, then optionally completes an in-app verification flow to unlock the verified badge, unlimited product listings, and priority placement in search feeds.

Three verification paths, one badge system:

| Tier | Who | How | Speed |
|------|-----|-----|-------|
| `STUDENT_LASU` | LASU students | OTP to `name.surname<matric>@st.lasu.edu.ng` (e.g. `emeka.divine220591001@st.lasu.edu.ng`) | Instant |
| `STAFF_LASU` | LASU staff | OTP to `@lasu.edu.ng` + PF number stored for audit | Instant |
| `COMMUNITY_EXTERNAL` | Non-LASU vendors | Upload government ID (NIN / Voter's Card / Driver's License) + address + phone | 1–2 business days (admin review) |

Vendors who skip KYC entirely can still use the app — they're soft-capped at **5 active product listings** and show a muted "Community seller" badge.

## Files created

### Domain logic
- `src/lib/kyc.ts` — enums, LASU email validators, OTP generation/hashing, tier-transition rules, public vs private KYC projections, product cap constant.
- `src/lib/kyc-hooks.ts` — React Query hooks (`useSendInstitutionalOtp`, `useVerifyInstitutionalOtp`, `useSubmitExternalKyc`, `useKycStatus`) and the `getBadgeInfo` helper used by `VerifiedBadge`.
- `src/lib/data/kyc.ts` — client-side repository mirroring the `/api/kyc/*` endpoints.

### API routes
- `src/app/api/kyc/institutional/send-otp/route.ts` — validates LASU email, checks claim uniqueness, generates + hashes OTP, emails via Resend. Rate-limited 5/min/IP, 60s resend cooldown.
- `src/app/api/kyc/institutional/verify-otp/route.ts` — constant-time OTP compare, 5-attempt limit per OTP, upgrades tier to `STUDENT_LASU` or `STAFF_LASU`, sends confirmation email.
- `src/app/api/kyc/external/submit/route.ts` — accepts ID card upload URL, ID type, residential address, phone; sets `COMMUNITY_EXTERNAL` + `kycStatus: PENDING`. Rate-limited 3/hour/IP.
- `src/app/api/kyc/status/route.ts` — returns the caller's full (private) KYC record.
- `src/app/api/admin/kyc/route.ts` — admin list of pending/approved/rejected KYC submissions with full PII.
- `src/app/api/admin/kyc/[id]/route.ts` — admin approve/reject; on reject, requires a reason that is shown to the vendor in-app and via email.

### UI components
- `src/components/vendor/VerifiedBadge.tsx` — colored pill with tier-specific icon (🎓 blue student, 🏛️ purple staff, 🛡️ green external, ⏳ amber pending). Plus `UnverifiedBadge` for the "Community seller" fallback.
- `src/components/vendor/KycVerificationSheet.tsx` — full-screen modal with 3 segments: choice screen → student OTP flow / staff OTP flow / external ID upload → done screen. Handles rejection reasons, resends, and the entire lifecycle.

### Email templates
- Added `KYC_OTP`, `KYC_APPROVED`, `KYC_REJECTED` to `EmailType` in `src/lib/email/types.ts`.
- Added `kycOtpEmailTemplate`, `kycApprovedEmailTemplate`, `kycRejectedEmailTemplate` to `src/lib/email/templates.ts`.

## Files modified

### Data layer
- `src/lib/db.ts` — added `verificationOtp` model delegate (collection: `verification_otps`); added indexes for OTPs (target+type, expiresAt TTL), unique partial index on `vendor_profiles.institutionalEmail` for APPROVED vendors, and an admin-review queue index.
- `scripts/init-mongodb.ts` — same indexes added to the manual init script.
- `src/lib/types.ts` — added `VerificationTier`, `KycStatus`, `KycIdType`, `VendorKycPublic`, `VendorKycPrivate` types; extended `VendorProfile` with optional `kyc` field.

### Existing API routes
- `src/app/api/auth/me/route.ts` — `vendorProfile` response now includes the private KYC view (full PII) since this is the owner querying their own account.
- `src/app/api/stores/route.ts` and `src/app/api/stores/[slug]/route.ts` — public store responses now include the public KYC view (tier, status, verifiedAt only — no PII).
- `src/app/api/admin/vendors/route.ts` — admin vendor list now includes the public KYC view.
- `src/app/api/admin/stats/route.ts` — added `pendingKyc` count to the dashboard stats.
- `src/app/api/products/route.ts` — POST handler now enforces the 5-product cap for unverified vendors. Returns a 403 with `code: "UNVERIFIED_PRODUCT_CAP"` so the client can show a targeted CTA.

### Admin panel
- `src/components/admin/AdminPanel.tsx` — `VerificationsTab` now shows a "Vendor KYC submissions" section at the top with a `KycReviewCard` per pending vendor. Card displays ID photo inline (for external), institutional email + PF/matric (for institutional), and Approve/Reject buttons (reject requires a reason).
- `src/lib/admin-hooks.ts` — added `AdminKycVendor` type, `useAdminKyc(status)` query, `useAdminReviewKyc()` mutation; extended `AdminStats` with `pendingKyc?`.

### Vendor UI
- `src/components/screens/VendorDashboard.tsx` — store banner now shows the active badge (or "Pending review" / "Get verified" CTA). Opens `KycVerificationSheet`.
- `src/components/vendor/StoreSettingsSheet.tsx` — added a "Verification" section showing current KYC status with a "Get verified" button.
- `src/components/screens/AccountScreen.tsx` — added a "Verification" row in the "Earn on Rush" section for users with a vendor profile.
- `src/components/screens/StoreScreen.tsx` — public store page now renders `VerifiedBadge` (or `UnverifiedBadge`) next to the store name.

## Key design decisions (intuition / updates beyond the original spec)

1. **OTP attempt limiting** — Each OTP record carries an `attempts` counter; after 5 wrong guesses the OTP is invalidated and the user must request a new one. Combined with the 10/min/IP verify rate limit, this makes online brute-force infeasible (~1.4 years to exhaust a 6-digit space from one IP).

2. **Single active OTP per (target, type)** — Issuing a new OTP deletes prior unused ones for the same email + type, so the most recent code is always the only valid one. Prevents confusion and keeps the table small.

3. **Resend cooldown** — 60-second minimum between OTP sends to the same target, preventing inbox-flooding harassment.

4. **Email-claim uniqueness** — A partial unique index on `vendor_profiles.institutionalEmail` (filtered to `kycStatus: APPROVED`) ensures the same LASU email can't be claimed by two Rush accounts. Pre-flight check in `send-otp` returns a friendly 409 before the insert.

5. **Domain-based role discrimination** — `@lasu.edu.ng` (bare) = staff; `name.surname<matric>@st.lasu.edu.ng` = student. The student regex enforces the canonical local-part shape (`name.surname` followed by 6–12 matric digits) so typos and lookalike domains are rejected at the edge. The caller-supplied role is cross-checked against the domain — mismatches return a clear error.

6. **Tier-transition guard** — Once APPROVED, a vendor cannot switch tiers (e.g., downgrade from `STUDENT_LASU` to `COMMUNITY_EXTERNAL`) without admin intervention. They CAN re-verify at the same tier if their institutional email changed.

7. **Public vs private KYC projection** — Public store responses expose only `verificationTier`, `kycStatus`, `verifiedAt`. PII (institutional email, PF/matric, ID card URL, residential address) is only returned to the vendor themselves (via `/api/auth/me`) or to admins (via `/api/admin/kyc`).

8. **Product listing cap** — Unverified vendors are soft-capped at 5 active products. The cap is enforced in `POST /api/products` with a re-fetch of the vendor profile (in case KYC was just completed) and a targeted error code so the client can prompt the user to verify.

9. **Audit trail** — `reviewedByAdminId`, `reviewedAt`, `rejectionReason` are stored on the vendor profile for every admin action. Non-repudiable: admin id comes from `requireAdmin()` session, never the request body.

10. **Legacy `verified` flag compatibility** — The pre-existing `vendor.verified: boolean` field is set to `true` on approval and `false` on rejection, so any code that reads it directly continues to work. The new `verificationTier` is the source of truth; `verified` is derived.

11. **TTL index for OTP cleanup** — MongoDB's TTL monitor automatically deletes OTP records 1 hour after their `expiresAt`. The verify handler also deletes on success and on attempt-limit exhaustion, so the collection stays small even without the TTL.

12. **Pending badge for external submissions** — A vendor who submitted an external ID but hasn't been approved yet shows an amber "Pending ID verification" badge (not no badge), so buyers know verification is in progress rather than assuming the vendor is unverified.

13. **Rejection email includes the reason** — When an admin rejects a submission, the vendor gets an email with the admin's reason verbatim. Rejections are recoverable: the vendor can re-submit from their store settings (the tier-transition guard allows `REJECTED → any`).

## Setup

No new env vars required beyond what Rush already uses (`RESEND_API_KEY`, `RUSH_EMAIL_FROM`, `MONGODB_URI`, `JWT_SECRET`).

If you already have a running deployment, the indexes will be created automatically on the first request via `ensureIndexes()` in `src/lib/db.ts`. To create them manually (e.g., to verify connectivity):

```bash
MONGODB_URI=your-uri bun run scripts/init-mongodb.ts
```

## Testing the flow locally

1. Sign in as a vendor (or complete vendor onboarding).
2. Open the Vendor Dashboard — you'll see a "Get the Verified LASU Merchant badge" CTA in the store banner.
3. Tap it → choose Student / Staff / External.
4. For Student/Staff: enter your LASU email, get a 6-digit OTP, enter it → badge activates instantly.
5. For External: upload an ID photo, fill address + phone → status becomes "Pending ID verification".
6. Sign in as an admin → open Admin Panel → Verifications tab → review the pending external submission with the ID photo inline → Approve or Reject (with reason).
