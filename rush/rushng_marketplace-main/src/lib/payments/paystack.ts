import "server-only";

/**
 * Paystack payment integration — server-side only.
 *
 * Docs: https://paystack.com/docs/api/
 *
 * The flow we support:
 *   1. Customer hits checkout → frontend calls POST /api/payments/initiate
 *      → server creates a Payment record (status=INITIALIZED), asks
 *      Paystack to initialize a transaction, gets back an authorization
 *      URL, returns it to the client.
 *   2. Customer is redirected to Paystack's hosted checkout, completes
 *      payment (card / bank transfer / USSD / etc.).
 *   3. Paystack redirects back to our return URL with a reference.
 *   4. Frontend calls POST /api/payments/verify with the reference
 *      → server verifies the transaction with Paystack, marks the
 *      Payment record SUCCESS (or FAILED), updates the order status.
 *   5. Separately, Paystack fires a webhook to /api/payments/webhook
 *      → server does the same verification (defense in depth; the
 *      redirect-back verify is the primary path, the webhook is the
 *      authoritative backstop in case the customer closes the tab).
 *
 * When PAYSTACK_SECRET_KEY is unset, this module throws — the caller
 * is expected to fall back to "mock payment success" in development.
 */

export const isPaystackConfigured: boolean = Boolean(
  process.env.PAYSTACK_SECRET_KEY,
);

const API_BASE = "https://api.paystack.co";

export interface InitiatePaymentInput {
  /** The RUSH order or wallet-topup id we're collecting payment for. */
  orderId?: string;
  /** Customer's email — required by Paystack for receipt + reconciliation. */
  email: string;
  /** Amount in NAIRA (kobo conversion handled internally). */
  amountNaira: number;
  /** What this payment is for — shows up in the Paystack dashboard. */
  description: string;
  /** Customer's metadata — Paystack stores it and includes in webhook. */
  metadata?: Record<string, unknown>;
  /**
   * ABSOLUTE url Paystack sends the customer back to after paying
   * (Paystack appends `?reference=...&trxref=...`). Must start with
   * https:// — a relative path is ignored and the customer is left
   * on Paystack's "Payment Successful" page.
   */
  returnUrl?: string;
}

export interface InitiatePaymentResult {
  reference: string;
  authorizationUrl: string;
  accessCode: string;
}

export async function initiateTransaction(
  input: InitiatePaymentInput,
): Promise<InitiatePaymentResult> {
  if (!isPaystackConfigured) {
    throw new Error(
      "PAYSTACK_SECRET_KEY is not set — Paystack integration disabled. " +
        'Set it in .env to enable real payments, or unset to use "mock payment" mode.',
    );
  }

  const res = await fetch(`${API_BASE}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      // Paystack requires amounts in the smallest currency unit —
      // for NGN that's kobo (1 NGN = 100 kobo).
      amount: Math.round(input.amountNaira * 100),
      currency: "NGN",
      email: input.email,
      // reference must be unique per transaction — use the orderId + timestamp
      // so retries don't collide.
      reference:
        input.orderId
          ? `rush-${input.orderId}-${Date.now()}`
          : `rush-wallet-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      // Caller-supplied absolute URL wins; otherwise fall back to the app root.
      callback_url:
        input.returnUrl ?? `${process.env.NEXT_PUBLIC_APP_URL || ""}/`,
      metadata: {
        ...input.metadata,
        orderId: input.orderId,
        description: input.description,
      },
    }),
  });

  const data = await res.json();
  if (!res.ok || !data.status) {
    throw new Error(
      `Paystack initialize failed: ${data.message || res.statusText}`,
    );
  }

  return {
    reference: data.data.reference,
    authorizationUrl: data.data.authorization_url,
    accessCode: data.data.access_code,
  };
}

export interface VerifyTransactionResult {
  status: "success" | "failed" | "pending" | "abandoned";
  amountNaira: number;
  currency: string;
  reference: string;
  gatewayResponse: string;
  channel: string;
  customerEmail: string;
  paidAt: string;
}

export async function verifyTransaction(
  reference: string,
): Promise<VerifyTransactionResult> {
  if (!isPaystackConfigured) {
    throw new Error("PAYSTACK_SECRET_KEY is not set — cannot verify.");
  }

  const res = await fetch(`${API_BASE}/transaction/verify/${reference}`, {
    headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
  });
  const data = await res.json();
  if (!res.ok || !data.status) {
    throw new Error(
      `Paystack verify failed: ${data.message || res.statusText}`,
    );
  }

  const t = data.data;
  return {
    status: t.status, // "success" | "failed" | "pending" | "abandoned"
    amountNaira: t.amount / 100, // kobo → naira
    currency: t.currency,
    reference: t.reference,
    gatewayResponse: t.gateway_response,
    channel: t.channel,
    customerEmail: t.customer.email,
    paidAt: t.paid_at,
  };
}

/**
 * Verify the HMAC signature on a Paystack webhook payload.
 * Paystack signs webhooks with the secret key so we can trust the
 * payload came from them. The signature is the SHA-512 hash of the
 * raw request body, hex-encoded.
 */
export async function verifyWebhookSignature(
  rawBody: string,
  signature: string | null,
): Promise<boolean> {
  if (!isPaystackConfigured || !signature) return false;
  const { createHmac } = await import("node:crypto");
  const expected = createHmac("sha512", process.env.PAYSTACK_SECRET_KEY!)
    .update(rawBody)
    .digest("hex");
  // Constant-time compare to avoid timing attacks.
  if (expected.length !== signature.length) return false;
  let mismatch = 0;
  for (let i = 0; i < expected.length; i++) {
    mismatch |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  }
  return mismatch === 0;
}

// ─── Transfer / payout APIs (vendor payouts) ──────────────────────────────
//
// These are the calls needed to send money FROM Rush TO a vendor's bank
// account via Paystack. Distinct from the charge APIs above (which pull
// money FROM the customer INTO Rush's Paystack settlement account).

export interface BankListItem {
  name: string;
  slug: string;
  code: string;
  longcode: string;
  gateway?: string | null;
  pay_with_bank: boolean;
  active: boolean;
}

/**
 * List all banks supported by Paystack for transfers. Used by the
 * vendor's bank-account picker UI. Cached aggressively on the client
 * (the list rarely changes).
 */
export async function listBanks(): Promise<BankListItem[]> {
  if (!isPaystackConfigured) return [];
  // Paystack caps this at 100 per page; we use perPage=100 and
  // paginate by country=nigeria. For most use cases a single page
  // is enough — there are ~100 Nigerian banks on Paystack.
  const res = await fetch(
    `${API_BASE}/bank?country=nigeria&perPage=100`,
    { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } },
  );
  const data = await res.json();
  if (!res.ok || !data.status) {
    throw new Error(`Paystack listBanks failed: ${data.message || res.statusText}`);
  }
  return (data.data || []) as BankListItem[];
}

export interface ResolveAccountResult {
  accountNumber: string;
  accountName: string;
  bankId: number;
}

/**
 * Resolve an account number to its account name. Used during vendor
 * bank-account setup so the vendor can confirm the name matches before
 * we save the account + create a transfer recipient.
 *
 * `accountNumber` is the 10-digit NUBAN account number. `bankCode` is
 * the 3-digit bank code from `listBanks()` (e.g. "057" for Zenith).
 */
export async function resolveAccountNumber(
  accountNumber: string,
  bankCode: string,
): Promise<ResolveAccountResult> {
  if (!isPaystackConfigured) {
    throw new Error("PAYSTACK_SECRET_KEY is not set — cannot resolve account.");
  }
  const res = await fetch(
    `${API_BASE}/bank/resolve?account_number=${encodeURIComponent(
      accountNumber,
    )}&bank_code=${encodeURIComponent(bankCode)}`,
    { headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` } },
  );
  const data = await res.json();
  if (!res.ok || !data.status) {
    throw new Error(
      `Could not resolve account: ${data.message || res.statusText}`,
    );
  }
  return {
    accountNumber: data.data.account_number,
    accountName: data.data.account_name,
    bankId: data.data.bank_id,
  };
}

export interface CreateRecipientResult {
  recipientCode: string;
  type: string; // "nuban" for Nigerian bank accounts
  active: boolean;
  name: string;
}

/**
 * Create a Paystack transfer recipient. Returns a `recipient_code` that
 * we store against the vendor — used in all future `initiateTransfer`
 * calls for that vendor.
 *
 * `name` should match the resolved account name (we pass it through to
 * Paystack as the recipient's display name).
 */
export async function createTransferRecipient(
  name: string,
  accountNumber: string,
  bankCode: string,
): Promise<CreateRecipientResult> {
  if (!isPaystackConfigured) {
    throw new Error("PAYSTACK_SECRET_KEY is not set — cannot create recipient.");
  }
  const res = await fetch(`${API_BASE}/transferrecipient`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      type: "nuban",
      name,
      account_number: accountNumber,
      bank_code: bankCode,
      currency: "NGN",
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.status) {
    throw new Error(
      `Paystack createTransferRecipient failed: ${data.message || res.statusText}`,
    );
  }
  return {
    recipientCode: data.data.recipient_code,
    type: data.data.type,
    active: data.data.active,
    name: data.data.name,
  };
}

export interface InitiateTransferResult {
  reference: string;     // our reference
  transferCode: string;  // Paystack's transfer code (used to verify status)
  status: string;        // "pending" | "success" | "failed" | "otp" | ...
}

/**
 * Initiate a transfer to a previously-created recipient. Returns a
 * `transferCode` we use to verify the transfer status via webhook or
 * polling.
 *
 * IMPORTANT: Paystack transfers are NOT instant like charges. They
 * settle asynchronously (within minutes for Nigerian banks) and the
 * final status arrives via the `transfer.success` / `transfer.failed`
 * webhook events. We mark the Payout PENDING here and flip it on the
 * webhook.
 */
export async function initiateTransfer(
  recipientCode: string,
  amountNaira: number,
  reason: string,
): Promise<InitiateTransferResult> {
  if (!isPaystackConfigured) {
    throw new Error("PAYSTACK_SECRET_KEY is not set — cannot initiate transfer.");
  }
  if (amountNaira < 100) {
    throw new Error("Paystack transfer minimum is ₦100.");
  }
  const reference = `rush-payout-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}`;
  const res = await fetch(`${API_BASE}/transfer`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      source: "balance", // debit Rush's Paystack settlement balance
      amount: Math.round(amountNaira * 100), // kobo
      currency: "NGN",
      recipient: recipientCode,
      reason,
      reference,
    }),
  });
  const data = await res.json();
  if (!res.ok || !data.status) {
    throw new Error(
      `Paystack initiateTransfer failed: ${data.message || res.statusText}`,
    );
  }
  return {
    reference,
    transferCode: data.data.transfer_code,
    status: data.data.status, // "pending" in normal flow
  };
}

export interface VerifyTransferResult {
  status: "success" | "pending" | "failed" | "reversed" | "otp";
  amountNaira: number;
  reference: string;
  transferCode: string;
  failureReason?: string | null;
}

/**
 * Verify a transfer by its Paystack transfer code. Used by the webhook
 * handler (defense in depth — we don't trust the body alone) and by
 * the polling fallback if webhooks aren't arriving.
 */
export async function verifyTransfer(
  transferCode: string,
): Promise<VerifyTransferResult> {
  if (!isPaystackConfigured) {
    throw new Error("PAYSTACK_SECRET_KEY is not set — cannot verify transfer.");
  }
  const res = await fetch(`${API_BASE}/transfer/verify/${transferCode}`, {
    headers: { Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}` },
  });
  const data = await res.json();
  if (!res.ok || !data.status) {
    throw new Error(
      `Paystack verifyTransfer failed: ${data.message || res.statusText}`,
    );
  }
  return {
    status: data.data.status,
    amountNaira: (data.data.amount || 0) / 100,
    reference: data.data.reference,
    transferCode: data.data.transfer_code,
    failureReason: data.data.failures?.[0]?.reason ?? null,
  };
}
