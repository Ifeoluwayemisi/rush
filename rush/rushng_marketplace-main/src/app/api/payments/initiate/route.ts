import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getPaymentProvider, isPaystackConfigured } from "@/lib/payments/provider";
import { enforceRateLimit } from "@/lib/rate-limit";
import {
  MIN_TOPUP_NAIRA,
  MAX_TOPUP_NAIRA,
  WALLET_TOPUP,
} from "@/lib/payments/wallet-topup";

type Charge = {
  purpose: "ORDER" | typeof WALLET_TOPUP;
  amountNaira: number;
  description: string;
  metadata: Record<string, unknown>;
  orderId?: string;
};

const fail = (error: string, status: number) =>
  NextResponse.json({ error }, { status });

// ─── Wallet top-up: validate amount only — there is no order to load.
function topUpCharge(userId: string, amount: unknown): Charge | Response {
  const amt = Number(amount);
  if (!Number.isInteger(amt) || amt < MIN_TOPUP_NAIRA || amt > MAX_TOPUP_NAIRA) {
    return fail(
      `Top-up must be a whole amount between ₦${MIN_TOPUP_NAIRA.toLocaleString()} and ₦${MAX_TOPUP_NAIRA.toLocaleString()}`,
      400,
    );
  }
  return {
    purpose: WALLET_TOPUP,
    amountNaira: amt,
    description: "RUSH wallet top-up",
    metadata: { type: "wallet_topup", userId },
  };
}

// ─── Order payment: order must exist, belong to caller, be payable.
async function orderCharge(userId: string, orderId: unknown): Promise<Charge | Response> {
  if (!orderId || typeof orderId !== "string") return fail("orderId is required", 400);

  const order = await db.order.findUnique({ where: { id: orderId }, include: { vendor: true } });
  if (!order) return fail("Order not found", 404);
  if (order.customerId !== userId) return fail("You don't own this order", 403);
  if (order.status === "DELIVERED" || order.status === "CANCELLED") {
    return fail(`Order is ${order.status.toLowerCase()} — cannot pay.`, 400);
  }

  return {
    purpose: "ORDER",
    orderId: order.id,
    amountNaira: order.total,
    description: `RUSH order ${order.code} — ${order.vendor.businessName}`,
    metadata: {
      orderCode: order.code,
      vendorName: order.vendor.businessName,
      items: order.items,
    },
  };
}

export async function POST(req: NextRequest) {
  // Rate limit: 10 payment initiations per minute per IP.
  const blocked = enforceRateLimit(req, "pay-init", { limit: 10, windowMs: 60_000 });
  if (blocked) return blocked;

  try {
    const user = await requireUser();
    const body = await req.json().catch(() => ({}));

    const charge =
      body.type === "wallet_topup"
        ? topUpCharge(user.id, body.amount)
        : await orderCharge(user.id, body.orderId);
    if (charge instanceof Response) return charge;

    // Build the callback URL for Paystack redirect
    const origin =
      req.headers.get("origin") ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://rush-marketplace-eight.vercel.app";

    const returnUrl =
      charge.purpose === WALLET_TOPUP
        ? `${origin}/?wallet=funded`
        : `${origin}/?pay=order&orderId=${charge.orderId || ""}`;

    const provider = getPaymentProvider();
    const init = await provider.initiate({
      orderId: charge.orderId,
      email: user.email,
      amountNaira: charge.amountNaira,
      description: charge.description,
      metadata: charge.metadata,
      returnUrl,
    });

    // Upsert by reference so a retried initiate updates the same record.
    await db.payment.upsert({
      where: { reference: init.reference },
      create: {
        reference: init.reference,
        ...(charge.orderId ? { orderId: charge.orderId } : {}),
        purpose: charge.purpose,
        customerId: user.id,
        amount: charge.amountNaira,
        currency: "NGN",
        provider: provider.name,
        status: "INITIALIZED",
      },
      update: { status: "INITIALIZED" },
    });

    return NextResponse.json({
      reference: init.reference,
      authorizationUrl: init.authorizationUrl,
      provider: provider.name,
      isMock: provider.name === "mock",
      paystackConfigured: isPaystackConfigured,
      purpose: charge.purpose,
    });
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error("[payments/initiate POST] error", err);
    return fail(err.message || "Failed to initiate payment", 500);
  }
}

/**
 * Handle accidental GET requests gracefully rather than returning 405.
 */
export async function GET(req: NextRequest) {
  const origin =
    req.headers.get("origin") ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "https://rush-marketplace-eight.vercel.app";
  return NextResponse.redirect(new URL("/", origin));
}
