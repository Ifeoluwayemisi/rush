import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import crypto from "crypto";
import { db } from "./db";

/**
 * JWT signing secret. MUST be set via the JWT_SECRET environment variable.
 *
 * Previously this had a hardcoded fallback ("rush-dev-secret-change-in-
 * production-please"), which meant any deployment that forgot to set
 * JWT_SECRET would silently sign sessions with a publicly-readable
 * string committed to the repo — letting anyone mint admin JWTs.
 *
 * We now refuse to boot if the secret is missing. Generate one with:
 *   openssl rand -hex 32
 */
function getJwtSecret(): Uint8Array {
  const raw = process.env.JWT_SECRET;
  if (!raw || raw.length < 32) {
    throw new Error(
      "JWT_SECRET environment variable is required and must be at least 32 characters. " +
        "Generate one with: openssl rand -hex 32",
    );
  }
  return new TextEncoder().encode(raw);
}

// Lazy getter so the throw happens at first request, not at module load
// (otherwise `next build` would crash type-checking).
const COOKIE_NAME = "rush_session";
const SESSION_DURATION = 60 * 60 * 24 * 30; // 30 days

const AUTH_SECRET = process.env.AUTH_SECRET || process.env.JWT_SECRET || "rush-fallback-secret-change-me";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
}

export async function hashPassword(password: string): Promise<string> {
  // OWASP recommends a bcrypt cost factor of at least 12. Previously
  // this was 10; bumped to 12 (~250ms per hash on a modern CPU, still
  // fine for login throughput at our scale).
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export async function createToken(userId: string): Promise<string> {
  return new SignJWT({ sub: userId })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION}s`)
    .sign(getJwtSecret());
}

export async function verifyToken(token: string): Promise<{ sub: string } | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecret());
    return { sub: payload.sub as string };
  } catch {
    return null;
  }
}

export async function setSessionCookie(token: string) {
  const c = await cookies();
  c.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_DURATION,
    path: "/",
  });
}

export async function clearSessionCookie() {
  const c = await cookies();
  c.delete(COOKIE_NAME);
}

export async function getSessionToken(): Promise<string | undefined> {
  const c = await cookies();
  return c.get(COOKIE_NAME)?.value;
}

/**
 * Get the authenticated user from the current request's cookie.
 * Returns null if not authenticated.
 */
export async function getCurrentUser() {
  const token = await getSessionToken();
  if (!token) return null;

  const payload = await verifyToken(token);
  if (!payload) return null;

  const user = await db.user.findUnique({
    where: { id: payload.sub },
    include: {
      vendorProfile: true,
      providerProfile: true,
      riderProfile: { include: { vehicle: true } },
      wallet: true,
    },
  });

  return user;
}

/**
 * Throw a 401 response if not authenticated. Otherwise return the user.
 */
export async function requireUser() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  return user;
}

/**
 * Throw 401 if not authenticated, 403 if authenticated but not an admin.
 * `ADMIN` is treated as a capability, not a separate role, so a user
 * with `[{type:"CUSTOMER",status:"ACTIVE"},{type:"ADMIN",status:"ACTIVE"}]`
 * is allowed; a user whose ADMIN capability is SUSPENDED is not.
 */
export async function requireAdmin() {
  const user = await requireUser();
  const caps = parseCapabilities(user.capabilities);
  const adminCap = caps.find((c: any) => c.type === "ADMIN");
  if (!adminCap || adminCap.status !== "ACTIVE") {
    throw new Response(JSON.stringify({ error: "Admin access required" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  return user;
}

/**
 * Get parsed capabilities array from user record.
 */
export function parseCapabilities(raw: string | null | undefined) {
  if (!raw) return [{ type: "CUSTOMER", status: "ACTIVE" }];
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed;
    return [{ type: "CUSTOMER", status: "ACTIVE" }];
  } catch {
    return [{ type: "CUSTOMER", status: "ACTIVE" }];
  }
}

/**
 * Serialize capabilities array back to JSON string for storage.
 */
export function serializeCapabilities(caps: any[]): string {
  return JSON.stringify(caps);
}

/**
 * Add a capability to the user's capabilities array if not already present.
 */
export function addCapability(user: any, type: string, status = "ACTIVE", profileId?: string) {
  const caps = parseCapabilities(user.capabilities);
  const exists = caps.find((c: any) => c.type === type);
  if (exists) return caps;
  caps.push({ type, status, ...(profileId ? { profileId } : {}) });
  return caps;
}

/**
 * Generate a signed, time-limited token for email verification links.
 */
export function createVerificationToken(userId: string, email: string): string {
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
  const payload = `${userId}:${email}:${expiresAt}`;
  const signature = crypto
    .createHmac("sha256", AUTH_SECRET)
    .update(payload)
    .digest("hex");

  return Buffer.from(`${payload}:${signature}`).toString("base64url");
}

/**
 * Verify HMAC signature and expiration on an email verification token.
 */
export function verifyVerificationToken(token: string): { userId: string; email: string } | null {
  try {
    const raw = Buffer.from(token, "base64url").toString("utf-8");
    const [userId, email, expiresAtStr, signature] = raw.split(":");
    if (!userId || !email || !expiresAtStr || !signature) return null;

    const expiresAt = Number(expiresAtStr);
    if (Date.now() > expiresAt) return null; // Expired

    const payload = `${userId}:${email}:${expiresAtStr}`;
    const expectedSig = crypto
      .createHmac("sha256", AUTH_SECRET)
      .update(payload)
      .digest("hex");

    const sigBuf = Buffer.from(signature);
    const expBuf = Buffer.from(expectedSig);

    if (sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf)) {
      return { userId, email };
    }
    return null;
  } catch {
    return null;
  }
}
