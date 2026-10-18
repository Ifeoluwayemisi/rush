import "server-only";

import { parseCapabilities } from "./auth";

/**
 * Capability helpers — shared by API routes that need to gate mutations
 * behind a capability's status (e.g. a SUSPENDED vendor shouldn't be
 * able to create products).
 */

export type CapabilityStatus = "ACTIVE" | "PENDING_VERIFICATION" | "SUSPENDED";
export type CapabilityType = "CUSTOMER" | "VENDOR" | "SERVICE_PROVIDER" | "RIDER" | "ADMIN";

export interface CapabilityCheckResult {
  /** True if the capability exists at all. */
  hasCapability: boolean;
  /** True if the capability exists AND status === "ACTIVE". */
  isActive: boolean;
  /** The status string, or null if the capability is missing. */
  status: CapabilityStatus | null;
}

/**
 * Look up the status of a given capability type on a user.
 * `user.capabilities` is stored as a JSON string per the Rush schema.
 */
export function checkCapability(
  user: { capabilities?: string | null },
  type: CapabilityType,
): CapabilityCheckResult {
  const caps = parseCapabilities(user.capabilities);
  const cap = caps.find((c: any) => c.type === type);
  if (!cap) {
    return { hasCapability: false, isActive: false, status: null };
  }
  return {
    hasCapability: true,
    isActive: cap.status === "ACTIVE",
    status: cap.status as CapabilityStatus,
  };
}

/**
 * Returns a 403 Response body for the "suspended" case. Use this in
 * API routes after `checkCapability` to give the caller a clear reason.
 */
export function suspendedMessage(type: CapabilityType): string {
  const friendlyName: Record<CapabilityType, string> = {
    CUSTOMER: "customer",
    VENDOR: "vendor",
    SERVICE_PROVIDER: "service provider",
    RIDER: "rider",
    ADMIN: "admin",
  };
  return `Your ${friendlyName[type]} capability is suspended. Contact support to restore it.`;
}

/**
 * Returns a 403 Response body for the "pending verification" case.
 */
export function pendingVerificationMessage(type: CapabilityType): string {
  const friendlyName: Record<CapabilityType, string> = {
    CUSTOMER: "customer",
    VENDOR: "vendor",
    SERVICE_PROVIDER: "service provider",
    RIDER: "rider",
    ADMIN: "admin",
  };
  return `Your ${friendlyName[type]} capability is pending verification. You'll be able to do this once an admin approves it.`;
}
