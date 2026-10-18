import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getPaymentProvider } from "@/lib/payments/provider";
import { sendPaymentNotification } from "@/lib/email";
import { sendWalletCreditEmail } from "@/lib/email/wallet";
import { sendNotification } from "@/lib/notify";
import { creditVendorPending } from "@/lib/payments/vendor-wallet";
import { creditWalletTopUp, isWalletTopUp } from "@/lib/payments/wallet-topup";

/**
 * Shared verification logic for both GET (browser redirects/address bar) 
 * and POST (in-app client fetch calls).
 */
async function processVerification(req: NextRequest, reference: string | null, isGetRequest = false) {
  if (!reference) {
    return NextResponse.json({ error: "reference is required" }, { status: 400 });
  }

  // 1. Authenticate user
  const user = await requireUser();

  // 2. Locate payment record
  const payment = await db.payment.findUnique({ where: { reference } });
  if (!payment) {
    return NextResponse.json({ error: "Payment reference not found" }, { status: 404 });
  }

  if (payment.customerId !== user.id) {
    return NextResponse.json(
      { error: "This payment wasn't initiated by you" },
      { status: 403 },
    );
  }

  const topUp = isWalletTopUp(payment);

  // 3. Handle already SUCCESS payments idempotently
  if (payment.status === "SUCCESS") {
    if (topUp) await creditWalletTopUp(payment);

    if (isGetRequest) {
      const origin =
        req.headers.get("origin") ||
        process.env.NEXT_PUBLIC_APP_URL ||
        "https://rush-marketplace-eight.vercel.app";
      return NextResponse.redirect(new URL("/?wallet=funded", origin));
    }

    return NextResponse.json({
      status: "SUCCESS",
      amount: payment.amount,
      alreadyVerified: true,
      purpose: topUp ? "WALLET_TOPUP" : "ORDER",
      payment: { status: "SUCCESS", reference, amount: payment.amount },
    });
  }

  // 4. Verify with Paystack
  const order = payment.orderId
    ? await db.order.findUnique({ where: { id: payment.orderId } })
    : null;

  const provider = getPaymentProvider();
  const result = await provider.verify(reference);

  const newStatus =
    result.status === "success" ? "SUCCESS" :
    result.status === "pending" ? "PENDING" :
    result.status === "abandoned" ? "ABANDONED" : "FAILED";

  // 5. Re-check charged amount
  const expected = order?.total ?? payment.amount;
  if (
    newStatus === "SUCCESS" &&
    provider.name !== "mock" &&
    result.amountNaira > 0 &&
    Math.abs(result.amountNaira - expected) > 1
  ) {
    console.error(
      `[payments/verify] amount mismatch for ${reference}: ` +
        `gateway=${result.amountNaira} naira, expected=${expected} naira`,
    );
    await db.payment.update({
      where: { reference },
      data: {
        status: "FAILED",
        providerResponse: JSON.stringify({
          ...result,
          mismatchReason: `amount ${result.amountNaira} ≠ expected ${expected}`,
        }),
      },
    });
    return NextResponse.json(
      {
        status: "FAILED",
        reason: "amount_mismatch",
        expected,
        received: result.amountNaira,
        orderId: payment.orderId,
      },
      { status: 402 },
    );
  }

  // 6. Update payment in DB
  await db.payment.update({
    where: { reference },
    data: { status: newStatus, providerResponse: JSON.stringify(result) },
  });

  // ─── Wallet top-up flow ─────────────────────────────────────────────
  if (topUp) {
    if (newStatus === "SUCCESS") {
      await creditWalletTopUp(payment);

      // Notify & email
      try {
        await sendNotification({
          userId: user.id,
          title: "Wallet Funded",
          message: `₦${payment.amount.toLocaleString()} was successfully added to your wallet.`,
          type: "WALLET_UPDATE",
        });
      } catch (e: any) {
        console.error("[payments/verify] wallet notification failed:", e?.message ?? e);
      }

      try {
        await sendWalletCreditEmail({
          email: user.email,
          name: user.name,
          amount: payment.amount,
          reference,
        });
      } catch (e: any) {
        console.error("[payments/verify] wallet email failed:", e?.message ?? e);
      }
    }

    if (isGetRequest) {
      const origin =
        req.headers.get("origin") ||
        process.env.NEXT_PUBLIC_APP_URL ||
        "https://rush-marketplace-eight.vercel.app";
      return NextResponse.redirect(
        new URL(newStatus === "SUCCESS" ? "/?wallet=funded" : "/?wallet=failed", origin),
      );
    }

    return NextResponse.json({
      status: newStatus,
      amount: payment.amount,
      purpose: "WALLET_TOPUP",
    });
  }

  // ─── Order payment flow ─────────────────────────────────────────────
  if (newStatus === "SUCCESS" && order) {
    if (order.status === "PLACED") {
      await db.order.update({
        where: { id: order.id },
        data: { status: "CONFIRMED" },
      });
    }

    if (order.vendorId && order.subtotal > 0) {
      try {
        await creditVendorPending({
          vendorId: order.vendorId,
          amount: order.subtotal,
          linkedOrderId: order.id,
          description: `Payment for order ${order.code}`,
        });
      } catch (e: any) {
        console.error(
          `[payments/verify] vendor credit failed for order ${order.id}:`,
          e?.message ?? e,
        );
      }
    }

    try {
      await sendPaymentNotification({
        userId: user.id,
        email: user.email,
        name: user.name,
        reference,
        status: "SUCCESS",
        amount: payment.amount,
        orderCode: order.code,
        type: "PAYMENT_SUCCESS",
      });
    } catch (emailErr) {
      console.error("[payments/verify] email failed:", emailErr);
    }
  } else if (newStatus === "FAILED" && order) {
    try {
      await sendPaymentNotification({
        userId: user.id,
        email: user.email,
        name: user.name,
        reference,
        status: "FAILED",
        amount: payment.amount,
        orderCode: order.code,
        type: "PAYMENT_FAILED",
      });
    } catch (emailErr) {
      console.error("[payments/verify] email failed:", emailErr);
    }
  }

  if (isGetRequest) {
    const origin =
      req.headers.get("origin") ||
      process.env.NEXT_PUBLIC_APP_URL ||
      "https://rush-marketplace-eight.vercel.app";
    return NextResponse.redirect(
      new URL(newStatus === "SUCCESS" ? "/?order=paid" : "/?order=failed", origin),
    );
  }

  return NextResponse.json({
    status: newStatus,
    amount: payment.amount,
    orderId: payment.orderId,
  });
}

/**
 * GET /api/payments/verify?reference=xxx
 * Handles browser visits, search-param redirects, and manual browser testing.
 */
export async function GET(req: NextRequest) {
  try {
    const reference = req.nextUrl.searchParams.get("reference");
    return await processVerification(req, reference, true);
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error("[payments/verify GET] error", err);
    return NextResponse.json(
      { error: err.message || "Failed to verify payment" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/payments/verify
 * Handles programmatic client fetch calls with JSON body: { reference: "xxx" }.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const reference = body.reference || req.nextUrl.searchParams.get("reference");
    return await processVerification(req, reference, false);
  } catch (err: any) {
    if (err instanceof Response) return err;
    console.error("[payments/verify POST] error", err);
    return NextResponse.json(
      { error: err.message || "Failed to verify payment" },
      { status: 500 },
    );
  }
}
