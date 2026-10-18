/**
 * Integration tests for the capability helpers in `lib/capability.ts`.
 *
 * These are pure functions — no DB, no async. Easy to test exhaustively.
 */
import { describe, it, expect } from "vitest";
import {
  checkCapability,
  suspendedMessage,
  pendingVerificationMessage,
} from "@/lib/capability";

describe("checkCapability", () => {
  it("returns ACTIVE for a capability with status ACTIVE", () => {
    const user = {
      capabilities: JSON.stringify([
        { type: "CUSTOMER", status: "ACTIVE" },
        { type: "VENDOR", status: "ACTIVE" },
      ]),
    };
    const r = checkCapability(user, "VENDOR");
    expect(r.hasCapability).toBe(true);
    expect(r.isActive).toBe(true);
    expect(r.status).toBe("ACTIVE");
  });

  it("returns isActive=false for a SUSPENDED capability", () => {
    const user = {
      capabilities: JSON.stringify([
        { type: "CUSTOMER", status: "ACTIVE" },
        { type: "VENDOR", status: "SUSPENDED" },
      ]),
    };
    const r = checkCapability(user, "VENDOR");
    expect(r.hasCapability).toBe(true);
    expect(r.isActive).toBe(false);
    expect(r.status).toBe("SUSPENDED");
  });

  it("returns isActive=false for PENDING_VERIFICATION", () => {
    const user = {
      capabilities: JSON.stringify([
        { type: "SERVICE_PROVIDER", status: "PENDING_VERIFICATION" },
      ]),
    };
    const r = checkCapability(user, "SERVICE_PROVIDER");
    expect(r.hasCapability).toBe(true);
    expect(r.isActive).toBe(false);
    expect(r.status).toBe("PENDING_VERIFICATION");
  });

  it("returns hasCapability=false when the capability is missing", () => {
    const user = {
      capabilities: JSON.stringify([{ type: "CUSTOMER", status: "ACTIVE" }]),
    };
    const r = checkCapability(user, "ADMIN");
    expect(r.hasCapability).toBe(false);
    expect(r.isActive).toBe(false);
    expect(r.status).toBeNull();
  });

  it("handles a null capabilities field", () => {
    // parseCapabilities falls back to [{CUSTOMER, ACTIVE}] on null,
    // so any non-CUSTOMER lookup returns hasCapability=false.
    const r = checkCapability({ capabilities: null }, "VENDOR");
    expect(r.hasCapability).toBe(false);
  });
});

describe("suspendedMessage / pendingVerificationMessage", () => {
  it("produces a helpful message mentioning the capability type", () => {
    expect(suspendedMessage("VENDOR")).toMatch(/vendor.*suspended/i);
    expect(suspendedMessage("RIDER")).toMatch(/rider.*suspended/i);
    expect(suspendedMessage("SERVICE_PROVIDER")).toMatch(/service provider.*suspended/i);
  });

  it("produces a helpful pending-verification message", () => {
    expect(pendingVerificationMessage("VENDOR")).toMatch(/vendor.*pending verification/i);
    expect(pendingVerificationMessage("SERVICE_PROVIDER")).toMatch(/service provider.*pending verification/i);
  });
});
