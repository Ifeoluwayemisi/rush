"use client";

import { useEffect } from "react";
import { useMe } from "@/lib/hooks";
import { useRush } from "@/lib/store";

/**
 * Syncs the Zustand store's `user` with the server's current
 * authenticated user.
 *
 * Mount this once at the top of the app (inside the QueryProvider).
 *
 * Behaviour:
 *   - API returns { user: <record> }  → set user to that record.
 *   - API returns { user: null }      → set user to null (unauthenticated).
 *   - API call fails (network/server error) → also set user to null.
 *     We deliberately do NOT show a banner / blocking error here,
 *     because the user might be on a public page where
 *     unauthenticated IS the right state. The data-screen components
 *     themselves surface friendly errors via the DataState component
 *     when they fail to load their own data.
 *
 * The `useMe` hook has `retry: false` so a single transient failure
 * doesn't retry forever — the user will see whatever state the page
 * resolves to.
 */
export function AuthHydrator() {
  const { data, error } = useMe();
  const setAuthenticatedUser = useRush((s) => s.setAuthenticatedUser);

  useEffect(() => {
    setAuthenticatedUser(data?.user || null);
  }, [data, setAuthenticatedUser]);

  // Swallow the error here — it's already surfaced by individual
  // data screens when they call their own queries. Logging it would
  // be noisy in the console for the common "no session cookie yet"
  // case on first visit.
  void error;

  return null;
}
