import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth";
import { activeDbBackend, dbBackendLabel } from "@/lib/db-backend";
import { isFirebaseAdminConfigured } from "@/lib/auth-providers/firebase-admin";
import { isPaystackConfigured } from "@/lib/payments/paystack";

/**
 * GET /api/admin/system
 *
 * Returns the configuration status of each infrastructure integration:
 *   - Firebase Auth (client + admin)
 *   - MongoDB Atlas (vs SQLite dev)
 *   - Paystack
 *
 * Used by the admin dashboard's "System" section to surface a clear
 * "you haven't configured X yet" so the operator knows what's missing
 * before going to production.
 *
 * Returns boolean flags only — never the actual config values
 * (secrets stay server-side).
 */
export async function GET() {
  try {
    await requireAdmin();

    // Reveal the *presence* of env vars, not their values.
    const has = (k: string) => Boolean(process.env[k]);

    return NextResponse.json({
      database: {
        backend: activeDbBackend,
        label: dbBackendLabel(),
        configured: true,
      },
      firebase: {
        // Client SDK env vars — all six must be present.
        clientConfigured: Boolean(
          has("NEXT_PUBLIC_FIREBASE_API_KEY") &&
            has("NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN") &&
            has("NEXT_PUBLIC_FIREBASE_PROJECT_ID") &&
            has("NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET") &&
            has("NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID") &&
            has("NEXT_PUBLIC_FIREBASE_APP_ID"),
        ),
        // Admin SDK service account
        adminConfigured: isFirebaseAdminConfigured,
      },
      mongodb: {
        uriConfigured: has("MONGODB_URI"),
        active: activeDbBackend === "mongodb",
      },
      paystack: {
        secretKeyConfigured: has("PAYSTACK_SECRET_KEY"),
        publicKeyConfigured: has("NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY"),
        configured: isPaystackConfigured,
      },
    });
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error("[admin/system GET] error", err);
    return NextResponse.json({ error: "Failed to load system status" }, { status: 500 });
  }
}
