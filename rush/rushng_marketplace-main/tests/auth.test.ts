// @vitest-environment node
/**
 * Integration tests for the JWT helpers in `lib/auth.ts`.
 *
 * These cover the parts that don't require a database or cookie layer:
 *   - hashPassword / verifyPassword round-trip
 *   - createToken / verifyToken round-trip
 *   - verifyToken rejects tokens signed with a different secret
 *   - parseCapabilities happy-path + malformed input
 *
 * Uses the `node` environment (not jsdom) because jose, the JWT
 * library, gets confused by Uint8Array instances in the jsdom
 * global — Node's Uint8Array and the jsdom-provided Uint8Array are
 * subtly different types and jose's instanceof check fails.
 *
 * The cookie helpers are NOT tested here because they require
 * `next/headers` mock plumbing — we test them in the API route
 * integration tests instead.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";
import { randomBytes } from "node:crypto";

// Set a known test secret BEFORE importing the auth module. This
// matches what we'd do in a real env — the secret is read at module
// load via getJwtSecret() which we call lazily per-request, so the
// env var must be set before any token sign/verify call.
const TEST_SECRET = "test-jwt-secret-at-least-32-chars-long-please";
process.env.JWT_SECRET = TEST_SECRET;

// Mock the db module — auth.ts imports `db` for getCurrentUser which
// we don't exercise here. Stubbing avoids any Mongo connection
// attempt during the import.
vi.mock("@/lib/db", () => ({
  db: {
    user: { findUnique: vi.fn().mockResolvedValue(null) },
  },
}));

import {
  hashPassword,
  verifyPassword,
  createToken,
  verifyToken,
  parseCapabilities,
  serializeCapabilities,
  addCapability,
} from "@/lib/auth";

describe("auth: password hashing", () => {
  it("hashes a password and verifies it round-trip", async () => {
    const password = "correct horse battery staple";
    const hash = await hashPassword(password);
    expect(hash).not.toBe(password);
    expect(hash.length).toBeGreaterThan(40);
    expect(await verifyPassword(password, hash)).toBe(true);
  });

  it("rejects a wrong password", async () => {
    const hash = await hashPassword("right-password");
    expect(await verifyPassword("wrong-password", hash)).toBe(false);
  });

  it("produces a different hash for the same password (salt)", async () => {
    const a = await hashPassword("same");
    const b = await hashPassword("same");
    expect(a).not.toBe(b);
    expect(await verifyPassword("same", a)).toBe(true);
    expect(await verifyPassword("same", b)).toBe(true);
  });
});

describe("auth: JWT tokens", () => {
  it("creates and verifies a token round-trip", async () => {
    const userId = "user-abc-123";
    const token = await createToken(userId);
    expect(typeof token).toBe("string");
    expect(token.split(".")).toHaveLength(3); // JWT = header.payload.signature

    const payload = await verifyToken(token);
    expect(payload).not.toBeNull();
    expect(payload?.sub).toBe(userId);
  });

  it("rejects a token signed with a different secret", async () => {
    const token = await createToken("user-1");

    // Flip the secret and verify the same token — should fail.
    process.env.JWT_SECRET = "a-completely-different-32-char-secret-xx";
    const payload = await verifyToken(token);
    expect(payload).toBeNull();

    // Restore for subsequent tests.
    process.env.JWT_SECRET = TEST_SECRET;
  });

  it("rejects a malformed token", async () => {
    expect(await verifyToken("not-a-jwt")).toBeNull();
    expect(await verifyToken("")).toBeNull();
    expect(await verifyToken("a.b.c")).toBeNull(); // three parts but bad base64
  });

  it("refuses to sign a token if JWT_SECRET is missing", async () => {
    const saved = process.env.JWT_SECRET;
    delete process.env.JWT_SECRET;
    await expect(createToken("user-1")).rejects.toThrow(/JWT_SECRET.*required/i);
    process.env.JWT_SECRET = saved;
  });

  it("refuses to sign a token if JWT_SECRET is too short", async () => {
    const saved = process.env.JWT_SECRET;
    process.env.JWT_SECRET = "too-short";
    await expect(createToken("user-1")).rejects.toThrow(/at least 32 characters/i);
    process.env.JWT_SECRET = saved;
  });
});

describe("auth: capabilities parsing", () => {
  it("parses a valid capabilities JSON array", () => {
    const raw = JSON.stringify([
      { type: "CUSTOMER", status: "ACTIVE" },
      { type: "VENDOR", status: "PENDING_VERIFICATION" },
    ]);
    const caps = parseCapabilities(raw);
    expect(caps).toHaveLength(2);
    expect(caps[0]).toMatchObject({ type: "CUSTOMER", status: "ACTIVE" });
  });

  it("falls back to default CUSTOMER ACTIVE when capabilities is null", () => {
    const caps = parseCapabilities(null);
    expect(caps).toEqual([{ type: "CUSTOMER", status: "ACTIVE" }]);
  });

  it("falls back when capabilities is malformed JSON", () => {
    const caps = parseCapabilities("not json {");
    expect(caps).toEqual([{ type: "CUSTOMER", status: "ACTIVE" }]);
  });

  it("falls back when capabilities is a non-array JSON", () => {
    const caps = parseCapabilities(JSON.stringify({ not: "an array" }));
    expect(caps).toEqual([{ type: "CUSTOMER", status: "ACTIVE" }]);
  });

  it("round-trips serialize + parse", () => {
    const original = [
      { type: "CUSTOMER", status: "ACTIVE" },
      { type: "ADMIN", status: "ACTIVE" },
    ];
    const serialized = serializeCapabilities(original);
    expect(JSON.parse(serialized)).toEqual(original);
  });

  it("addCapability is a no-op when the capability already exists", () => {
    const user = { capabilities: JSON.stringify([{ type: "CUSTOMER", status: "ACTIVE" }]) };
    const caps = addCapability(user, "CUSTOMER", "ACTIVE");
    expect(caps.filter((c: any) => c.type === "CUSTOMER")).toHaveLength(1);
  });

  it("addCapability adds when missing", () => {
    const user = { capabilities: JSON.stringify([{ type: "CUSTOMER", status: "ACTIVE" }]) };
    const caps = addCapability(user, "VENDOR", "ACTIVE");
    expect(caps.find((c: any) => c.type === "VENDOR")).toMatchObject({ type: "VENDOR", status: "ACTIVE" });
    // existing caps untouched
    expect(caps.find((c: any) => c.type === "CUSTOMER")).toBeDefined();
  });

  it("addCapability includes profileId when given", () => {
    const user = { capabilities: JSON.stringify([{ type: "CUSTOMER", status: "ACTIVE" }]) };
    const caps = addCapability(user, "VENDOR", "ACTIVE", "vendor-123");
    expect(caps.find((c: any) => c.type === "VENDOR")).toMatchObject({
      type: "VENDOR",
      status: "ACTIVE",
      profileId: "vendor-123",
    });
  });
});

describe("auth: token randomness", () => {
  it("two tokens for the same user are different (iat differs)", async () => {
    const t1 = await createToken("user-x");
    // jose sets iat in 1s resolution; sleep a bit so iat differs.
    await new Promise((r) => setTimeout(r, 1100));
    const t2 = await createToken("user-x");
    expect(t1).not.toBe(t2);
  });
});

// Silence console.warn in tests — `verifyToken` doesn't log, but
// our setup's matchMedia stub might emit warnings.
beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
