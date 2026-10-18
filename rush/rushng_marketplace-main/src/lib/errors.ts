"use client";

import { ApiError } from "@/lib/api-client";

/**
 * Centralized error-handling system for RUSH.
 *
 * The principle: technical errors (Prisma connection failures, network
 * timeouts, invalid Firebase tokens) belong in developer/server logs —
 * NOT on the user's screen. Users see clear, friendly messages and a
 * path to retry.
 *
 * Usage:
 *   try { ... } catch (e) {
 *     const appErr = toAppError(e);
 *     // log full error to server-side logger / console
 *     console.error("[domain.action]", e);
 *     // show friendly message to user
 *     toast.error(appErr.message);
 *   }
 */

export type ErrorKind =
  | "network"
  | "unauthorized"
  | "forbidden"
  | "not-found"
  | "validation"
  | "server"
  | "auth-provider"
  | "payment"
  | "unknown";

export interface AppError {
  kind: ErrorKind;
  /** Human-friendly message — safe to show to any user. */
  message: string;
  /** Suggested action — used by retry buttons / sign-in CTAs. */
  retry?: boolean;
  signIn?: boolean;
  /** Original error (for developer logging only — never sent to UI). */
  cause?: unknown;
}

const FRIENDLY: Record<ErrorKind, { message: string; retry?: boolean; signIn?: boolean }> = {
  network: {
    message: "We couldn't reach Rush right now. Please check your connection and try again.",
    retry: true,
  },
  unauthorized: {
    message: "Your session has expired. Please sign in again.",
    signIn: true,
  },
  forbidden: {
    message: "You don't have permission to do that.",
  },
  "not-found": {
    message: "We couldn't find this. It may have been removed.",
  },
  validation: {
    message: "Please check the highlighted fields and try again.",
  },
  server: {
    message: "Something went wrong on our side. Please try again in a moment.",
    retry: true,
  },
  "auth-provider": {
    message: "We couldn't sign you in. Please try again.",
    retry: true,
  },
  payment: {
    message: "We couldn't process your payment. Please try again or use a different method.",
    retry: true,
  },
  unknown: {
    message: "Something went wrong. Please try again.",
    retry: true,
  },
};

/**
 * Convert any thrown error into a friendly AppError.
 * Technical details stay on the cause property — never expose them
 * in the UI directly.
 */
export function toAppError(err: unknown): AppError {
  if (err instanceof ApiError) {
    let kind: ErrorKind;
    if (err.status === 401) kind = "unauthorized";
    else if (err.status === 403) kind = "forbidden";
    else if (err.status === 404) kind = "not-found";
    else if (err.status === 422 || err.status === 400) kind = "validation";
    else if (err.status === 402) kind = "payment";
    else if (err.status >= 500) kind = "server";
    else if (err.status === 0) kind = "network";
    else kind = "unknown";
    return { kind, message: FRIENDLY[kind].message, retry: FRIENDLY[kind].retry, signIn: FRIENDLY[kind].signIn, cause: err };
  }
  // fetch() throws TypeError when the network is unreachable.
  if (err instanceof TypeError && /fetch|network/i.test(err.message)) {
    return { kind: "network", message: FRIENDLY.network.message, retry: true, cause: err };
  }
  // Auth-provider-specific error code (set by the auth-providers/* modules).
  if (err && typeof err === "object" && "code" in err) {
    const code = (err as any).code as string;
    if (code === "FIREBASE_NOT_CONFIGURED" || code === "auth/invalid-credential" || code === "auth/popup-closed-by-user") {
      return { kind: "auth-provider", message: FRIENDLY["auth-provider"].message, retry: true, cause: err };
    }
  }
  return { kind: "unknown", message: FRIENDLY.unknown.message, retry: true, cause: err };
}

/**
 * Get the friendly message for an error kind directly — useful for
 * static empty/error states that don't have a thrown error in hand.
 */
export function friendlyMessage(kind: ErrorKind): string {
  return FRIENDLY[kind].message;
}
