"use client";

import { Loader2, AlertCircle, RefreshCw, PackageOpen } from "lucide-react";

/**
 * Standard 4-state pattern for every data-driven screen in RUSH.
 *
 * Usage:
 *   <DataState
 *     isLoading={query.isLoading}
 *     error={query.error}
 *     isEmpty={data?.length === 0}
 *     onRetry={() => query.refetch()}
 *     empty={<EmptyState title="No products yet" message="Add your first product to start selling." />}
 *   >
 *     {actual data rendering}
 *   </DataState>
 *
 * State precedence:
 *   1. LOADING (isLoading) → shows spinner
 *   2. ERROR (error is truthy) → shows error + retry
 *   3. EMPTY (isEmpty) → shows empty state
 *   4. SUCCESS → renders children
 *
 * IMPORTANT for stale-while-revalidate: the CALLER controls whether
 * `error` is truthy. If the caller wants to keep showing stale data
 * during a background refetch failure, it should pass `error={null}`
 * (or a falsy value) when it still has data. See HomeScreen for the
 * pattern:
 *
 *   const hasAnyData = !!(productsQ.data || storesQ.data || ...);
 *   const error = !hasAnyData && allErrored ? ... : null;
 *
 * Why this matters:
 *   - LOADING shows a skeleton/spinner — never fake data.
 *   - SUCCESS renders children with real data.
 *   - EMPTY shows a genuine empty state — not fabricated records.
 *   - ERROR shows a friendly message + retry — never stack traces,
 *     provider names, or technical terminology.
 */

export function DataState({
  isLoading,
  error,
  isEmpty,
  onRetry,
  empty,
  loading,
  children,
}: {
  isLoading: boolean;
  error: unknown;
  isEmpty: boolean;
  onRetry?: () => void;
  empty?: React.ReactNode;
  loading?: React.ReactNode;
  children: React.ReactNode;
}) {
  if (isLoading) {
    return (
      <>{loading ?? <DefaultLoading />}</>
    );
  }
  if (error) {
    return <ErrorState error={error} onRetry={onRetry} />;
  }
  if (isEmpty) {
    return <>{empty ?? <DefaultEmpty />}</>;
  }
  return <>{children}</>;
}

export function DefaultLoading() {
  return (
    <div className="flex items-center justify-center py-12 text-ink-soft">
      <Loader2 className="h-5 w-5 animate-spin" />
    </div>
  );
}

export function DefaultEmpty() {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-ink-soft text-center">
      <PackageOpen className="h-8 w-8 mb-2 opacity-50" />
      <p className="text-sm">Nothing here yet.</p>
    </div>
  );
}

/**
 * Standard error state — converts any thrown error into a friendly
 * message via toAppError. Technical details stay in the cause
 * property and are never rendered.
 */
export function ErrorState({
  error,
  onRetry,
}: {
  error: unknown;
  onRetry?: () => void;
}) {
  // Lazy-import so this file doesn't pull server-only modules.
  // (errors.ts is marked "use client" so this is fine, but keeping
  // it dynamic-resolved keeps the bundle smaller.)
  const appErr = toAppErrorSafe(error);

  return (
    <div className="flex flex-col items-center justify-center py-12 text-center px-4">
      <AlertCircle className="h-8 w-8 text-amber-500 mb-2" />
      <p className="text-sm font-medium text-ink mb-1">{appErr.message}</p>
      {onRetry && appErr.retry !== false && (
        <button
          onClick={onRetry}
          className="mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-ink text-white text-xs font-semibold"
        >
          <RefreshCw className="h-3.5 w-3.5" /> Try again
        </button>
      )}
    </div>
  );
}

/**
 * Standard empty state for screens where "nothing here yet" is the
 * right message. Can be customized per-screen via the `title` and
 * `message` props.
 */
export function EmptyState({
  icon,
  title = "Nothing here yet",
  message,
  action,
}: {
  icon?: React.ReactNode;
  title?: string;
  message?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center px-4">
      {icon ?? <PackageOpen className="h-8 w-8 text-ink-soft mb-2 opacity-50" />}
      <p className="text-sm font-semibold text-ink">{title}</p>
      {message && <p className="text-xs text-ink-soft mt-1 max-w-xs">{message}</p>}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

// Inline import — keeps this file self-contained even if errors.ts
// changes shape. Also avoids a circular import (errors.ts is shared
// across the data layer AND the UI layer).
import { toAppError } from "@/lib/errors";

function toAppErrorSafe(error: unknown): ReturnType<typeof toAppError> {
  try {
    return toAppError(error);
  } catch {
    return {
      kind: "unknown",
      message: "Something went wrong. Please try again.",
      retry: true,
    };
  }
}
