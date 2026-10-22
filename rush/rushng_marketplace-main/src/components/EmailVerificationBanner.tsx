"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { useMe } from "@/lib/hooks";

/**
 * EmailVerificationBanner — shown when the user returns from the
 * /api/auth/verify callback, which redirects to
 * /?verified=true (success) or /?verified=false&reason=… (failure).
 *
 * Trust model:
 *   - Failure notices are keyed off the query param — that is all the
 *     existing callback provides (it sets no state on failure). The
 *     copy only ever describes the link, never the account.
 *   - Success is NEVER trusted from the param alone: anyone can type
 *     /?verified=true. We additionally require the session's
 *     server-confirmed `emailVerified` flag from /api/auth/me. If that
 *     flag is missing or false, we stay silent rather than display a
 *     potentially false success message.
 *
 * Staleness / remount-safety: the param is consumed exactly once per
 * document into module scope. That matters because on a logged-in
 * return the page renders a one-commit "landing" state (user still
 * null) before AuthHydrator stores the session — the banner mounts
 * there, then unmounts and remounts in the app branch. Module-scoped
 * consumption keeps the notice (and the URL strip) stable across that
 * remount, and a refresh / back / future visit sees no params, so no
 * notice ever replays. Only one instance renders at a time (mounted in
 * exactly one of the page's exclusive branches).
 */

const FAILURE_COPY: Record<string, string> = {
  missing: "The verification link is missing its token. Open the link from your verification email again.",
  expired: "This verification link has expired or is no longer valid.",
  not_found: "The account linked to this verification link could not be found.",
};

type Notice = { kind: "success" } | { kind: "failure"; reason: string };

let consumed = false;
let consumedNotice: Notice | null = null;

/** Reads ?verified=… at most once per document load. Pure read — the
 *  URL strip happens in the effect below. */
function consumeVerificationNotice(): Notice | null {
  if (consumed) return consumedNotice;
  if (typeof window === "undefined") return null; // SSR: don't mark consumed
  consumed = true;
  const q = new URLSearchParams(window.location.search);
  const verified = q.get("verified");
  // Ordinary visit (no param, or unrelated junk) → nothing at all.
  if (verified !== "true" && verified !== "false") return null;
  consumedNotice =
    verified === "true"
      ? { kind: "success" }
      : { kind: "failure", reason: q.get("reason") ?? "" };
  return consumedNotice;
}

export function EmailVerificationBanner() {
  const [notice] = useState(consumeVerificationNotice);
  const [dismissed, setDismissed] = useState(false);

  const { data: meData, isLoading: meLoading } = useMe();

  // Strip the params once the notice has been read (same pattern as
  // PaymentReturnHandler) so no refresh, back navigation, or later
  // visit can replay a stale notice. Guarded: only strips when this
  // banner actually claimed a verification notice.
  useEffect(() => {
    if (notice && typeof window !== "undefined" && window.location.search) {
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [notice]);

  if (dismissed || !notice) return null;

  // Success: require reliable evidence from the session (the query
  // param alone is spoofable). While the me query is still loading we
  // render nothing — we will not guess.
  if (notice.kind === "success") {
    if (meLoading) return null;
    if (meData?.user?.emailVerified !== true) return null;

    return (
      <div className="px-4 pt-4 sm:px-6 lg:px-0">
        <div
          role="status"
          className="flex items-start gap-2.5 rounded-xl border border-rush/25 bg-rush-soft px-4 py-3"
        >
          <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-rush-deep" aria-hidden="true" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-rush-deep">Your email is verified</p>
            <p className="mt-0.5 text-xs font-medium text-rush-deep/85">
              Thanks — your RUSH account is now confirmed.
            </p>
          </div>
          <button
            type="button"
            aria-label="Dismiss verification notice"
            onClick={() => setDismissed(true)}
            className="-m-1 shrink-0 rounded-lg p-1 text-rush-deep/70 transition-colors hover:text-rush-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    );
  }

  const copy =
    FAILURE_COPY[notice.reason] ?? "Please open the link from your verification email again.";

  return (
    <div className="px-4 pt-4 sm:px-6 lg:px-0">
      <div
        role="alert"
        className="flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3"
      >
        <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-bold text-destructive">Email not verified</p>
          <p className="mt-0.5 text-xs font-medium text-destructive/90">{copy}</p>
        </div>
        <button
          type="button"
          aria-label="Dismiss verification notice"
          onClick={() => setDismissed(true)}
          className="-m-1 shrink-0 rounded-lg p-1 text-destructive/70 transition-colors hover:text-destructive focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
        >
          <X className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
