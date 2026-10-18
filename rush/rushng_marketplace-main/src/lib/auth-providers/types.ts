"use client";

/**
 * Provider-agnostic authentication abstraction for the RUSH client.
 *
 * Goal: Google Sign-In today, Email/Password, Phone OTP, and Sign in
 * with Apple tomorrow — all without rewriting the user system.
 *
 * Architecture:
 *   - `AuthProviders` enumerates the supported identity providers.
 *   - `signInWith(provider)` is the single entry point UI code uses.
 *   - Each provider's implementation lives in its own file and is
 *     responsible for:
 *       (a) authenticating the user with the third-party SDK,
 *       (b) getting an ID token from the third party,
 *       (c) POSTing that ID token to /api/auth/firebase (or the
 *           legacy /api/auth/login for email/password) so the backend
 *           can verify it and create/look-up the matching RUSH user.
 *
 * The backend never trusts a "I'm logged in" claim from the client;
 * it always verifies the ID token before issuing a RUSH session
 * cookie. See src/app/api/auth/firebase/route.ts.
 */



export type AuthProviderId = "google" | "email" | "phone" | "apple";

export interface AuthResult {
  /** RUSH user id — the foreign key into our DB. */
  id: string;
  email: string;
  name: string;
}

export interface SignInInput {
  /** For email/password auth. */
  email?: string;
  password?: string;
  /** For phone OTP. */
  phone?: string;
  code?: string;
}

export class AuthError extends Error {
  code: string;
  constructor(message: string, code = "AUTH_ERROR") {
    super(message);
    this.code = code;
  }
}
