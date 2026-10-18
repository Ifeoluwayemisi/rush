import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createToken, setSessionCookie } from "@/lib/auth";
import {
  isFirebaseAdminConfigured,
  verifyIdToken,
} from "@/lib/auth-providers/firebase-admin";
import { sendWelcomeEmail } from "@/lib/email";

/**
 * POST /api/auth/firebase
 *
 * Exchange a Firebase ID token for a RUSH session cookie.
 *
 * Flow:
 *   1. Client signs in with Google via Firebase → gets idToken.
 *   2. POSTs idToken here.
 *   3. Backend verifies idToken with Firebase Admin SDK.
 *   4. Backend looks up the RUSH user by firebaseUid.
 *      - If found → issue a RUSH session cookie.
 *      - If not found → check for an existing email/password
 *        account and link it.
 *      - If neither exists → create a new RUSH user.
 *   5. A welcome email is sent ONLY when a brand-new RUSH
 *      account is created.
 *   6. Set the rush_session cookie.
 *
 * Firebase authentication should NOT determine the RUSH role:
 *   - Google doesn't make you a vendor.
 *   - Google doesn't make you a rider.
 *   - Google just answers "who is this person?"
 *   - RUSH answers "what does this person have/do on RUSH?"
 */
export async function POST(req: NextRequest) {
  try {
    if (!isFirebaseAdminConfigured) {
      return NextResponse.json(
        {
          error:
            "Firebase Auth isn't configured on the server. Set FIREBASE_SERVICE_ACCOUNT to the service-account JSON.",
        },
        { status: 503 },
      );
    }

    const body = await req.json();
    const { idToken } = body;

    if (!idToken || typeof idToken !== "string") {
      return NextResponse.json(
        { error: "Missing idToken" },
        { status: 400 },
      );
    }

    // 1. Verify the Firebase ID token.
    // The backend NEVER trusts client claims until the token
    // has been verified by Firebase Admin.
    const decoded = await verifyIdToken(idToken);

    if (!decoded.uid) {
      return NextResponse.json(
        { error: "Invalid token" },
        { status: 401 },
      );
    }

    /*
     * Tracks whether this request actually created a brand-new
     * RUSH account.
     *
     * This is important because we only want to send the welcome
     * email on account creation — NOT every time someone signs
     * in with Google.
     */
    let createdNewUser = false;

    // 2. First, find the RUSH user by Firebase UID.
    let user = await db.user.findUnique({
      where: { firebaseUid: decoded.uid },
    });

    /*
     * If no Firebase UID match exists, check whether this email
     * already belongs to an existing RUSH account.
     *
     * This handles the migration/linking case:
     *
     * Existing email/password account
     *              +
     * Google sign-in using the same email
     *              ↓
     * Link Firebase UID
     *
     * No new account is created.
     * Therefore, no welcome email is sent.
     */
    if (!user && decoded.email) {
      user = await db.user.findUnique({
        where: { email: decoded.email },
      });

      if (user) {
        user = await db.user.update({
          where: { id: user.id },
          data: {
            firebaseUid: decoded.uid,
          },
        });
      }
    }

    /*
     * 3. If the user still doesn't exist, create a brand-new
     * RUSH account from the verified Firebase identity.
     */
    if (!user) {
      if (!decoded.email) {
        return NextResponse.json(
          {
            error:
              "Firebase user has no email — required to create a RUSH account.",
          },
          { status: 400 },
        );
      }

      user = await db.user.create({
        data: {
          firebaseUid: decoded.uid,
          email: decoded.email,
          name:
            decoded.name ||
            decoded.email.split("@")[0] ||
            "Rush user",
          avatar: decoded.picture || null,

          // Firebase owns authentication for this account.
          passwordHash: null,

          // Google Sign-In only creates a CUSTOMER account.
          // It does NOT grant vendor/provider/rider privileges.
          capabilities: JSON.stringify([
            {
              type: "CUSTOMER",
              status: "ACTIVE",
            },
          ]),

          activeWorkspace: "CUSTOMER",

          wallet: {
            create: {
              balance: 0,
            },
          },
        },
      });

      // This is genuinely a new RUSH account.
      createdNewUser = true;
    }

    /*
     * 4. Send the welcome email ONLY for a newly created account.
     *
     * sendWelcomeEmail() has its own delivery/idempotency protection,
     * so the same RUSH user will not receive multiple welcome emails.
     *
     * If Resend fails, we DO NOT fail authentication.
     * The user should still be able to log into RUSH.
     */
    if (createdNewUser) {
      try {
        await sendWelcomeEmail({
          userId: user.id,
          email: user.email,
          name: user.name,
        });
      } catch (emailError) {
        console.error(
          "[auth/firebase] welcome email failed:",
          emailError,
        );
      }
    }

    /*
     * 5. Issue the RUSH session cookie.
     *
     * The cookie contains the RUSH user identity.
     * RUSH resolves the user's current capabilities from
     * the database on subsequent requests.
     */
    const token = await createToken(user.id);
    await setSessionCookie(token);

    return NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
        firebaseUid: user.firebaseUid,
      },
    });
  } catch (err: any) {
    if (err instanceof Response) {
      return err;
    }

    // Log the full error + stack so we can see it in Vercel logs.
    // The 11ms 500 was previously opaque — now we'll know if it's
    // a JSON parse error, a missing field, or an SDK init failure.
    console.error("[auth/firebase POST] error:", err?.message ?? err);
    console.error("[auth/firebase POST] stack:", err?.stack);
    console.error("[auth/firebase POST] FIREBASE_SERVICE_ACCOUNT set:",
      Boolean(process.env.FIREBASE_SERVICE_ACCOUNT));
    console.error("[auth/firebase POST] FIREBASE_SERVICE_ACCOUNT length:",
      process.env.FIREBASE_SERVICE_ACCOUNT?.length ?? 0);

    return NextResponse.json(
      {
        error:
          err?.message ||
          "Failed to authenticate with Firebase",
      },
      {
        status: 500,
      },
    );
  }
}
