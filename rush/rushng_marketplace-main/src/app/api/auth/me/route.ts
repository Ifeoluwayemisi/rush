import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser, requireUser } from "@/lib/auth";
import { privateKycView } from "@/lib/kyc";

/**
 * GET /api/auth/me
 *
 * Returns the authenticated user's full profile (with vendorProfile,
 * providerProfile, riderProfile, wallet included) or null.
 *
 * Note: returns 200 with `user: null` for unauthenticated callers —
 * this is intentional so the client can treat it uniformly (no error
 * to catch on a fresh page load). Auth-required mutations use
 * requireUser() which throws 401.
 */
export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ user: null });
    }

    const wallet = user.wallet ?? null;

    return NextResponse.json({
      user: {
        id: user.id,
        firebaseUid: user.firebaseUid ?? null,
        name: user.name,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
        location: user.location,
        capabilities: JSON.parse(user.capabilities),
        activeWorkspace: user.activeWorkspace,
        createdAt: user.createdAt instanceof Date ? user.createdAt.toISOString() : user.createdAt,
        wallet: wallet ? { balance: wallet.balance } : null,
        // Vendor profile — include the full (private) KYC view because
        // this is the owner querying their own account. PII like
        // institutional email, PF/matric, ID card URL is fine to expose
        // here; it is NEVER included in /api/stores responses.
        vendorProfile: user.vendorProfile
          ? { ...user.vendorProfile, kyc: privateKycView(user.vendorProfile) }
          : null,
        providerProfile: user.providerProfile ?? null,
        riderProfile: user.riderProfile ?? null,
      },
    });
  } catch (err: any) {
    console.error("[auth/me GET] error", err);
    // Don't leak internal errors — return null user so client treats
    // it as unauthenticated rather than a server failure.
    return NextResponse.json({ user: null });
  }
}

/**
 * PATCH /api/auth/me
 *
 * Update the current user's profile: name, phone, avatar URL,
 * location. All fields are optional — only what's sent is updated.
 *
 * Avatar should be a `/uploads/...` URL returned by POST /api/uploads.
 * For backwards-compat we also accept any https URL.
 */
export async function PATCH(req: NextRequest) {
  try {
    const user = await requireUser();
    const body = await req.json();
    const { name, phone, avatar, location } = body;

    // Validate only the fields we want to allow editing. We never
    // accept email or capabilities changes via this route — email
    // changes need a separate verification flow, capability changes
    // go through onboarding/admin routes.
    const updates: Record<string, unknown> = { updatedAt: new Date() };
    if (typeof name === "string" && name.trim().length >= 2) {
      updates.name = name.trim();
    }
    if (typeof phone === "string") {
      updates.phone = phone.trim() || null;
    }
    if (typeof avatar === "string") {
      // Accept /api/uploads/ (GridFS — current pattern) and
      // /uploads/ (legacy filesystem pattern — kept for backward
      // compat with any pre-GridFS data). Also accept https:// URLs.
      // Reject javascript:, data:, file:, etc.
      if (
        avatar.startsWith("/api/uploads/") ||
        avatar.startsWith("/uploads/") ||
        avatar.startsWith("https://")
      ) {
        updates.avatar = avatar;
      } else {
        return NextResponse.json(
          { error: "Avatar must be a /api/uploads/ URL or an https URL" },
          { status: 400 },
        );
      }
    }
    if (typeof location === "string") {
      updates.location = location.trim() || null;
    }

    const updated = await db.user.update({
      where: { id: user.id },
      data: updates,
    });

    return NextResponse.json({
      id: updated.id,
      name: updated.name,
      email: updated.email,
      phone: updated.phone,
      avatar: updated.avatar,
      location: updated.location,
      capabilities: JSON.parse(updated.capabilities),
      activeWorkspace: updated.activeWorkspace,
    });
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error("[auth/me PATCH] error", err);
    return NextResponse.json(
      { error: err.message || "Failed to update profile" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/auth/me — permanently delete the authenticated user's
 * account and all derived data.
 *
 * Body MUST be `{ confirm: true }` — a soft guard so the client has
 * to opt in deliberately (the UI goes further with a "type DELETE"
 * prompt before calling this).
 *
 * Cascade (order matters — children before parents):
 *   1. VENDOR  branch: products → vendorProfile
 *   2. PROVIDER branch: services → serviceJobs → providerProfile
 *   3. RIDER branch: vehicle → riderJobs → rides (unassign) → riderProfile
 *   4. WALLET branch: walletLedgerEntries → wallet
 *   5. follow edges (both as follower and as the followed target — we
 *      store `userId` on the follow row, target ids are vendor/provider
 *      ids that will already be gone by the time we get here)
 *   6. notifications addressed to this user
 *   7. rides this user booked as a customer
 *   8. payments this user made (customerId)
 *   9. finally, the user record itself
 *
 * We don't try to wrap this in a multi-doc ACID transaction —
 * `db.$transaction` is a no-op shim against our Mongo singleton
 * (see db.ts). Each deleteMany is atomic per-document; if one fails
 * the catch returns 500 and partial state is left behind. That's an
 * acceptable tradeoff vs. blocking the user on a multi-collection
 * join that Mongo doesn't natively support.
 */
export async function DELETE(req: NextRequest) {
  try {
    const user = await requireUser();

    // Soft-confirm guard — body must explicitly say `confirm: true`.
    let body: any = {};
    try {
      body = await req.json();
    } catch {
      body = {};
    }
    if (body?.confirm !== true) {
      return NextResponse.json(
        { error: "Confirmation required — send { confirm: true } to delete your account." },
        { status: 400 },
      );
    }

    const userId = user.id;

    // ── 1. VENDOR branch ───────────────────────────────────────────
    const vendorProfile = (user as any).vendorProfile;
    if (vendorProfile?.id) {
      await db.product.deleteMany({ where: { vendorId: vendorProfile.id } });
      await db.vendorProfile.delete({ where: { id: vendorProfile.id } });
    }

    // ── 2. PROVIDER branch ────────────────────────────────────────
    const providerProfile = (user as any).providerProfile;
    if (providerProfile?.id) {
      // Service jobs authored by this provider (status was QUOTED /
      // ASSIGNED / IN_PROGRESS). We null-out providerId on OPEN jobs
      // so customers can still get other quotes — but since the
      // provider is being deleted entirely, we just remove their
      // ownership stake and let the customer re-request.
      await db.service.deleteMany({ where: { providerId: providerProfile.id } });
      await db.serviceJob.updateMany({
        where: { providerId: providerProfile.id },
        data: { providerId: null, status: "OPEN" },
      });
      await db.provider.delete({ where: { id: providerProfile.id } });
    }

    // ── 3. RIDER branch ───────────────────────────────────────────
    const riderProfile = (user as any).riderProfile;
    if (riderProfile?.id) {
      // Unassign rides currently linked to this rider — the customer
      // gets to re-request a rider rather than their ride vanishing.
      await db.ride.updateMany({
        where: { riderId: riderProfile.id },
        data: { riderId: null, status: "SEARCHING" },
      });
      // Rider jobs (delivery + ride offers) — delete them outright;
      // an orphaned job would otherwise sit forever pointing at a
      // non-existent rider.
      await db.riderJob.deleteMany({ where: { riderId: riderProfile.id } });
      // Vehicle — 1:1 with rider, so delete by riderId.
      await db.vehicle.deleteMany({ where: { riderId: riderProfile.id } });
      await db.riderProfile.delete({ where: { id: riderProfile.id } });
    }

    // ── 4. WALLET branch ──────────────────────────────────────────
    const wallet = (user as any).wallet;
    if (wallet?.id) {
      await db.walletLedgerEntry.deleteMany({ where: { walletId: wallet.id } });
      await db.wallet.delete({ where: { id: wallet.id } });
    }

    // ── 5. follows ────────────────────────────────────────────────
    // Edges where this user is the follower.
    await db.follow.deleteMany({ where: { userId } });

    // ── 6. notifications ──────────────────────────────────────────
    await db.notification.deleteMany({ where: { userId } });

    // ── 7. rides as customer ──────────────────────────────────────
    // The riderJob collection has `rideId`, not a nested `ride`
    // relation filter — fetch the customer's ride ids first, then
    // delete jobs by rideId in ($in).
    const customerRides = await db.ride.findMany({
      where: { customerId: userId },
      select: { id: true },
    });
    const customerRideIds = customerRides.map((r: { id: string }) => r.id);
    if (customerRideIds.length > 0) {
      await db.riderJob.deleteMany({
        where: { rideId: { in: customerRideIds } },
      });
    }
    await db.ride.deleteMany({ where: { customerId: userId } });

    // ── 8. payments ───────────────────────────────────────────────
    await db.payment.deleteMany({ where: { customerId: userId } });

    // ── 9. orders as customer (delete last so payment cascade above
    //      still finds them by orderId) ────────────────────────────
    await db.order.deleteMany({ where: { customerId: userId } });

    // ── 10. user record ───────────────────────────────────────────
    await db.user.delete({ where: { id: userId } });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error("[auth/me DELETE] error", err);
    return NextResponse.json(
      { error: err?.message || "Failed to delete account" },
      { status: 500 },
    );
  }
}
