import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import { resolveAccountNumber } from "@/lib/payments/paystack";

/**
 * POST /api/vendor/bank-account/resolve
 *
 * Body: { accountNumber: string, bankCode: string }
 *
 * Resolves an account number to its account name via Paystack's
 * /bank/resolve endpoint. Used by the vendor's bank-account setup
 * flow so they can confirm the name matches before saving.
 *
 * Returns { accountName } on success.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();

    const body = await req.json();
    const { accountNumber, bankCode } = body;

    if (!accountNumber || !bankCode) {
      return NextResponse.json(
        { error: "accountNumber and bankCode are required." },
        { status: 400 },
      );
    }

    // Validate the account number is a 10-digit NUBAN.
    const sanitized = String(accountNumber).replace(/\D/g, "");
    if (sanitized.length !== 10) {
      return NextResponse.json(
        { error: "Account number must be 10 digits." },
        { status: 400 },
      );
    }

    // Vendor gate — only vendors can save a payout bank account.
    const vendorProfile = (user as any).vendorProfile;
    if (!vendorProfile) {
      return NextResponse.json(
        { error: "Open a vendor store before setting up payouts." },
        { status: 403 },
      );
    }

    const resolved = await resolveAccountNumber(sanitized, String(bankCode));

    return NextResponse.json({
      accountNumber: resolved.accountNumber,
      accountName: resolved.accountName,
    });
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error("[vendor/bank-account/resolve POST] error", err);
    return NextResponse.json(
      { error: err?.message || "Failed to resolve account." },
      { status: 500 },
    );
  }
}
