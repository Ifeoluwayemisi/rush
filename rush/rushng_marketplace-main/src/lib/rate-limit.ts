import "server-only";

/**
 * In-memory rate limiter.
 *
 * Sliding-window counter per key (typically IP + route). Tracks
 * request counts in a Map with expiry timestamps; old entries are
 * purged on each check. Not suitable for multi-instance serverless
 * deployments (each Vercel function instance has its own memory), but
 * works fine for the single-instance dev server and small-scale prod.
 *
 * For production-grade rate limiting, swap this for `@upstash/ratelimit`
 * (Redis-backed, works across Vercel instances).
 */

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

// Periodically purge expired buckets so the Map doesn't grow forever.
// We do this lazily on every check — if a bucket's resetAt has passed,
// we drop it before reading.
function purgeIfExpired(key: string) {
  const bucket = buckets.get(key);
  if (bucket && bucket.resetAt < Date.now()) {
    buckets.delete(key);
  }
}

// Once every 5 minutes, drop everything that's expired. Keeps the
// Map small under heavy load.
let lastSweep = Date.now();
function maybeSweep() {
  const now = Date.now();
  if (now - lastSweep < 5 * 60 * 1000) return;
  lastSweep = now;
  for (const [k, b] of buckets) {
    if (b.resetAt < now) buckets.delete(k);
  }
}

export interface RateLimitOptions {
  /** Max number of requests allowed in the window. */
  limit: number;
  /** Window duration in ms. */
  windowMs: number;
}

export interface RateLimitResult {
  ok: boolean;
  /** Remaining requests in the current window. 0 if blocked. */
  remaining: number;
  /** ms until the window resets and the counter clears. */
  retryAfterMs: number;
}

export function rateLimit(
  key: string,
  opts: RateLimitOptions,
): RateLimitResult {
  maybeSweep();
  purgeIfExpired(key);

  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing) {
    buckets.set(key, { count: 1, resetAt: now + opts.windowMs });
    return { ok: true, remaining: opts.limit - 1, retryAfterMs: opts.windowMs };
  }

  existing.count += 1;
  const remaining = Math.max(0, opts.limit - existing.count);
  const ok = existing.count <= opts.limit;
  return {
    ok,
    remaining,
    retryAfterMs: Math.max(0, existing.resetAt - now),
  };
}

/**
 * Convenience: extract a rate-limit key from a NextRequest.
 * Prefers `x-forwarded-for` (Vercel sets this), falls back to the
 * request's IP. Returns "unknown" if neither is set (e.g. local dev).
 */
export function getRequestIp(req: Request): string {
  const fwd = req.headers.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim();
  // Next.js Request doesn't expose remote address; in dev this is fine.
  return "unknown";
}

/**
 * Apply rate limiting to a request. Returns null if the request is
 * allowed; returns a 429 Response if the limit has been exceeded.
 *
 * Usage:
 *   const blocked = enforceRateLimit(req, "login", { limit: 5, windowMs: 60_000 });
 *   if (blocked) return blocked;
 */
export function enforceRateLimit(
  req: Request,
  keyPrefix: string,
  opts: RateLimitOptions,
): Response | null {
  const ip = getRequestIp(req);
  const result = rateLimit(`${keyPrefix}:${ip}`, opts);
  if (!result.ok) {
    const retryAfterSec = Math.ceil(result.retryAfterMs / 1000);
    return new Response(
      JSON.stringify({
        error: "Too many requests. Try again in " + retryAfterSec + "s.",
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(retryAfterSec),
          "X-RateLimit-Limit": String(opts.limit),
          "X-RateLimit-Remaining": "0",
          "X-RateLimit-Reset": String(Date.now() + result.retryAfterMs),
        },
      },
    );
  }
  return null;
}
