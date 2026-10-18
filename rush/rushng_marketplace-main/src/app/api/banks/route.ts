import { NextRequest, NextResponse } from "next/server";
import { listBanks } from "@/lib/payments/paystack";

/**
 * GET /api/banks
 *
 * Returns the list of Nigerian banks supported by Paystack for transfers.
 * Used by the vendor bank-account picker UI. Cached aggressively on the
 * client (the list rarely changes — Paystack adds banks maybe once a year).
 *
 * Returns an empty array when Paystack isn't configured (dev mode
 * without a secret key) — the vendor payout flow can't be tested
 * without Paystack, so we surface that as an empty list rather than
 * an error.
 */
export async function GET() {
  try {
    const banks = await listBanks();
    // Trim to just the fields the UI needs.
    const out = banks
      .filter((b) => b.active)
      .map((b) => ({
        name: b.name,
        code: b.code,
        slug: b.slug,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
    return NextResponse.json({ banks: out });
  } catch (err: any) {
    console.error("[banks GET] error", err);
    return NextResponse.json(
      { error: err?.message || "Failed to load banks" },
      { status: 500 },
    );
  }
}
