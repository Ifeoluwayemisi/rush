/**
 * Currency formatting helper. Pure — no React, no API, no mock data — so
 * it can be safely imported from anywhere (server or client) without
 * pulling in the data layer.
 *
 * Previously this lived in `mock-data.ts`, which forced every UI component
 * that wanted to format naira to also pull the entire mock dataset.
 */
export function naira(amount: number): string {
  return "₦" + (amount ?? 0).toLocaleString("en-NG", { maximumFractionDigits: 0 });
}
