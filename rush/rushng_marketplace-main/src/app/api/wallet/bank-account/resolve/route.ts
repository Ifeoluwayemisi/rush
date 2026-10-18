import { NextRequest, NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";

export async function POST(req: NextRequest) {
  try {
    await requireUser();

    const body = await req.json().catch(() => ({}));
    const { accountNumber, bankCode } = body;

    if (!accountNumber || !bankCode) {
      return NextResponse.json(
        { error: "Account number and bank code are required." },
        { status: 400 },
      );
    }

    const sanitized = String(accountNumber).replace(/\D/g, "");
    if (sanitized.length !== 10) {
      return NextResponse.json(
        { error: "Account number must be exactly 10 digits." },
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

    const res = await fetch(
      `https://api.paystack.co/bank/resolve?account_number=${encodeURIComponent(
        sanitized,
      )}&bank_code=${encodeURIComponent(String(bankCode))}`,
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
        },
      },
    );

    const data = await res.json();
    if (!res.ok || !data.status) {
      return NextResponse.json(
        { error: data.message || "Could not verify bank account details." },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      accountNumber: data.data.account_number,
      accountName: data.data.account_name,
    });
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error("[wallet/bank-account/resolve POST] error:", err);
    return NextResponse.json(
      { error: err?.message || "Failed to resolve account." },
      { status: 500 },
    );
  }
}
