import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";

export async function GET() {
  try {
    const user = await requireUser();

    const fresh = await db.user.findUnique({
      where: { id: user.id },
      select: {
        bankAccountNumber: true,
        bankCode: true,
        bankName: true,
        bankAccountName: true,
        paystackRecipientCode: true,
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
      },
    });
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error("[wallet/bank-account GET] error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to load bank account." },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireUser();

    const body = await req.json().catch(() => ({}));
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

    const secretKey = process.env.PAYSTACK_SECRET_KEY;
    if (!secretKey) {
      return NextResponse.json(
        { error: "Payment gateway is not configured." },
        { status: 500 },
      );
    }

    // 1. Resolve account to obtain the verified account holder name
    const resolveRes = await fetch(
      `https://api.paystack.co/bank/resolve?account_number=${encodeURIComponent(
        sanitizedAccount,
      )}&bank_code=${encodeURIComponent(String(bankCode))}`,
      {
        headers: { Authorization: `Bearer ${secretKey}` },
      },
    );
    const resolveData = await resolveRes.json();
    if (!resolveRes.ok || !resolveData.status) {
      return NextResponse.json(
        { error: resolveData.message || "Failed to verify account name." },
        { status: 400 },
      );
    }
    const resolvedAccountName = resolveData.data.account_name;

    // 2. Create transfer recipient on Paystack
    const recipientRes = await fetch("https://api.paystack.co/transferrecipient", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: "nuban",
        name: resolvedAccountName,
        account_number: sanitizedAccount,
        bank_code: String(bankCode),
        currency: "NGN",
      }),
    });
    const recipientData = await recipientRes.json();
    if (!recipientRes.ok || !recipientData.status) {
      return NextResponse.json(
        { error: recipientData.message || "Failed to create transfer recipient on Paystack." },
        { status: 400 },
      );
    }

    const recipientCode = recipientData.data.recipient_code;

    // 3. Persist details on the User record
    await db.user.update({
      where: { id: user.id },
      data: {
        bankAccountNumber: sanitizedAccount,
        bankCode: String(bankCode),
        bankName: String(bankName),
        bankAccountName: resolvedAccountName,
        paystackRecipientCode: recipientCode,
      },
    });

    return NextResponse.json({
      ok: true,
      bankAccount: {
        accountNumber: sanitizedAccount,
        accountName: resolvedAccountName,
        bankName: String(bankName),
        bankCode: String(bankCode),
        recipientCode,
      },
    });
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error("[wallet/bank-account POST] error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to save bank account." },
      { status: 500 },
    );
  }
}
