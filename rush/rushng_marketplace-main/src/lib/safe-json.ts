/**
 * Safe JSON parse — returns a fallback instead of throwing.
 *
 * Use this whenever you're parsing a field that came from the DB
 * and might be:
 *   - undefined (row created before the field existed)
 *   - null (nullable column with no value)
 *   - a non-JSON string (legacy data, manual DB edit)
 *   - malformed JSON (truncated, encoding issue)
 *
 * Without this, one bad row in a list endpoint takes down the
 * ENTIRE list — `JSON.parse(undefined)` throws synchronously
 * inside `.map()`, bubbles up to the route's catch, and the
 * whole 500 response wipes out every other valid row.
 *
 * Usage:
 *   const images = safeJsonParse<string[]>(p.images, []);
 *   const tags = safeJsonParse<string[]>(p.tags, []);
 *   const portfolio = safeJsonParse<string[]>(p.portfolio, []);
 *
 * The fallback is returned for ANY parse failure — undefined input,
 * null input, malformed JSON, or JSON that doesn't match the
 * expected type (we don't actually type-check, but the caller's
 * downstream code should handle the fallback shape).
 */
export function safeJsonParse<T>(value: unknown, fallback: T): T {
  if (value == null) return fallback;
  if (typeof value !== "string") {
    // Already-parsed object (e.g. Mongo returned a sub-doc instead
    // of a JSON string) — return as-is, assuming it's the right shape.
    return value as T;
  }
  if (value === "") return fallback;
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}
