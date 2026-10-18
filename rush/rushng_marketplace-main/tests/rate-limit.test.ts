/**
 * Integration tests for the rate limiter in `lib/rate-limit.ts`.
 *
 * The rate limiter is a sliding-window counter per key, in-memory.
 * We exercise:
 *   - Under-the-limit requests succeed
 *   - Over-the-limit requests return a Response (not null)
 *   - Different keys have independent counters
 *   - The window resets after `windowMs` elapses (faked via fake timers)
 *
 * Note: we don't actually sleep for the full window in the test —
 * vitest's fake timers let us advance time without waiting.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { rateLimit, enforceRateLimit, getRequestIp } from "@/lib/rate-limit";

describe("rateLimit: basic counter", () => {
  it("allows requests up to the limit", () => {
    for (let i = 0; i < 5; i++) {
      const r = rateLimit("test-allow", { limit: 5, windowMs: 60_000 });
      expect(r.ok).toBe(true);
      expect(r.remaining).toBe(5 - (i + 1));
    }
  });

  it("blocks requests beyond the limit", () => {
    // Burn all 3 slots.
    for (let i = 0; i < 3; i++) {
      rateLimit("test-block", { limit: 3, windowMs: 60_000 });
    }
    // The 4th should be blocked.
    const r = rateLimit("test-block", { limit: 3, windowMs: 60_000 });
    expect(r.ok).toBe(false);
    expect(r.remaining).toBe(0);
    expect(r.retryAfterMs).toBeGreaterThan(0);
  });

  it("tracks different keys independently", () => {
    rateLimit("ip-1", { limit: 1, windowMs: 60_000 });
    // Same limit, different key — should still be allowed.
    const r = rateLimit("ip-2", { limit: 1, windowMs: 60_000 });
    expect(r.ok).toBe(true);
  });

  it("resets after the window elapses", () => {
    vi.useFakeTimers();
    try {
      // Burn the single slot.
      rateLimit("test-reset", { limit: 1, windowMs: 1_000 });
      // Immediately, blocked.
      expect(rateLimit("test-reset", { limit: 1, windowMs: 1_000 }).ok).toBe(false);
      // Advance time past the window.
      vi.advanceTimersByTime(1_001);
      // Should be allowed again.
      expect(rateLimit("test-reset", { limit: 1, windowMs: 1_000 }).ok).toBe(true);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe("enforceRateLimit: returns a 429 when blocked", () => {
  it("returns null when allowed", () => {
    const req = new Request("https://example.com", {
      headers: { "x-forwarded-for": "1.2.3.4" },
    });
    const r = enforceRateLimit(req, "test-allowed", { limit: 5, windowMs: 60_000 });
    expect(r).toBeNull();
  });

  it("returns a 429 Response when blocked", async () => {
    const req = new Request("https://example.com", {
      headers: { "x-forwarded-for": "9.9.9.9" },
    });
    // Burn all slots.
    for (let i = 0; i < 2; i++) {
      enforceRateLimit(req, "test-blocked", { limit: 2, windowMs: 60_000 });
    }
    // Now the 3rd request should be blocked.
    const blocked = enforceRateLimit(req, "test-blocked", { limit: 2, windowMs: 60_000 });
    expect(blocked).not.toBeNull();
    expect(blocked instanceof Response).toBe(true);
    expect(blocked!.status).toBe(429);
    const body = await blocked!.json();
    expect(body.error).toMatch(/too many requests/i);
    // Headers carry standard rate-limit metadata.
    expect(blocked!.headers.get("Retry-After")).toBeTruthy();
    expect(blocked!.headers.get("X-RateLimit-Limit")).toBe("2");
    expect(blocked!.headers.get("X-RateLimit-Remaining")).toBe("0");
  });
});

describe("getRequestIp", () => {
  it("parses x-forwarded-for (single hop)", () => {
    const req = new Request("https://example.com", {
      headers: { "x-forwarded-for": "1.2.3.4" },
    });
    expect(getRequestIp(req)).toBe("1.2.3.4");
  });

  it("takes the first IP from a multi-hop x-forwarded-for", () => {
    const req = new Request("https://example.com", {
      headers: { "x-forwarded-for": "1.2.3.4, 5.6.7.8, 9.10.11.12" },
    });
    expect(getRequestIp(req)).toBe("1.2.3.4");
  });

  it("falls back to 'unknown' when no x-forwarded-for", () => {
    const req = new Request("https://example.com");
    expect(getRequestIp(req)).toBe("unknown");
  });
});

beforeEach(() => {
  // Use unique keys per test so they don't bleed into each other.
  // Each `it` block above uses a distinct "test-*" key.
});

afterEach(() => {
  vi.restoreAllMocks();
});
