import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { createTransferRecipient, resolveAccountNumber } from "@/lib/payments/paystack";

/**
 * POST /api/vendor/bank-account
 *
 * Body: {
 *   accountNumber: string,    // 10-digit NUBAN
 *   bankCode: string,         // 3-digit Paystack bank code (from /api/banks)
 *   bankName: string,         // human-readable bank name (e.g. "Zenith Bank")
 *   accountName?: string,     // optional — re-resolved server-side for safety
 * }
 *
 * Saves the verified bank account against the vendor's profile and
 * creates a Paystack transfer recipient (returns a `recipient_code`
 * we store and reuse for every future payout).
 *
 * Flow:
 *   1. Resolve the account → confirm the account name.
 *   2. Create a Paystack transfer recipient → get recipient_code.
 *   3. Store accountNumber, bankCode, bankName, accountName, recipientCode
 *      on the vendor profile.
 *
 * Re-running this route replaces the previous bank account (we don't
 * keep history — the Paystack recipient stays around but is no longer
 * used by us). For audit purposes the previous values are overwritten
 * in-place.
 */
export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();
    const vendorProfile = (user as any).vendorProfile;
    if (!vendorProfile) {
      return NextResponse.json(
        { error: "Open a vendor store before setting up payouts." },
        { status: 403 },
      );
    }

    const body = await req.json();
    const { accountNumber, bankCode, bankName } = body;

    if (!accountNumber || !bankCode || !bankName) {
      return NextResponse.json(
        { error: "accountNumber, bankCode, and bankName are required." },
        { status: 400 },
      );
    }

    const sanitizedAccount = String(accountNumber).replace(/\D/g, "");
    if (sanitizedAccount.length !== 10) {
      return NextResponse.json(
        { error: "Account number must be 10 digits." },
        { status: 400 },
      );
    }

    // 1. Resolve to confirm the account name (defense in depth — even
    //    if the client claims an accountName, we re-resolve server-side).
    const resolved = await resolveAccountNumber(sanitizedAccount, String(bankCode));

    // 2. Create the Paystack transfer recipient.
    const recipient = await createTransferRecipient(
      resolved.accountName,
      sanitizedAccount,
      String(bankCode),
    );

    // 3. Save to the vendor profile.
    await db.vendorProfile.update({
      where: { id: vendorProfile.id },
      data: {
        bankAccountNumber: sanitizedAccount,
        bankCode: String(bankCode),
        bankName: String(bankName),
        bankAccountName: resolved.accountName,
        paystackRecipientCode: recipient.recipientCode,
        bankAccountVerified: true,
      },
    });

    return NextResponse.json({
      ok: true,
      bankAccount: {
        accountNumber: sanitizedAccount,
        accountName: resolved.accountName,
        bankName: String(bankName),
        bankCode: String(bankCode),
        recipientCode: recipient.recipientCode,
      },
    });
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error("[vendor/bank-account POST] error", err);
    return NextResponse.json(
      { error: err?.message || "Failed to save bank account." },
      { status: 500 },
    );
  }
}

/**
 * GET /api/vendor/bank-account
 *
 * Returns the vendor's saved bank account (or null if not yet set up).
 * Used by the payout UI to show the current account + allow editing.
 */
export async function GET() {
  try {
    const user = await requireUser();
    const vendorProfile = (user as any).vendorProfile;
    if (!vendorProfile) {
      return NextResponse.json(
        { error: "Open a vendor store first." },
        { status: 403 },
      );
    }

    // Re-fetch to make sure we have the latest bank account fields.
    const fresh = await db.vendorProfile.findUnique({
      where: { id: vendorProfile.id },
      select: {
        bankAccountNumber: true,
        bankCode: true,
        bankName: true,
        bankAccountName: true,
        paystackRecipientCode: true,
        bankAccountVerified: true,
      },
    });

    if (!fresh?.bankAccountNumber) {
      return NextResponse.json({ bankAccount: null });
    }

    return NextResponse.json({
      bankAccount: {
        accountNumber: fresh.bankAccountNumber,
        accountName: fresh.bankAccountName,
        bankName: fresh.bankName,
        bankCode: fresh.bankCode,
        recipientCode: fresh.paystackRecipientCode,
        verified: fresh.bankAccountVerified ?? false,
      },
    });
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error("[vendor/bank-account GET] error", err);
    return NextResponse.json(
      { error: err?.message || "Failed to load bank account." },
      { status: 500 },
    );
  }
}
