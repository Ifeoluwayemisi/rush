"use client";

import { api } from "@/lib/api-client";

/**
 * Shared primitives for the repository layer.
 *
 * RUSH no longer has any mock-data fallback. Every repository call
 * goes straight to the API. If the API is unreachable, the caller
 * surfaces a friendly error to the user (see src/lib/errors.ts and
 * src/components/shared/DataState.tsx).
 *
 * The previous `withFallback` / `apiGetOrMock` functions have been
 * removed intentionally — they created false confidence by showing
 * fake data when the real backend was down. Real users should never
 * see fake vendors, products, or orders mixed into their actual
 * RUSH experience.
 */

export { api };
export { isProduction } from "./config";
