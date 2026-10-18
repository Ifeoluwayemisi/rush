"use client";

/**
 * Data-layer configuration.
 *
 * RUSH no longer has any mock-data fallback. The application always
 * uses real data from the configured backend, and surfaces friendly
 * errors when the API is unreachable (see src/lib/errors.ts and
 * src/components/shared/DataState.tsx).
 *
 * The previous `?mock=1` / `?api=1` query flags, the
 * `USE_MOCK_FALLBACK` env var, and the `withFallback` primitive have
 * all been removed intentionally — they created false confidence by
 * showing fake data when the real backend was down. Real users should
 * never see fake vendors, products, or orders mixed into their actual
 * RUSH experience.
 */

export const isProduction = process.env.NODE_ENV === "production";
