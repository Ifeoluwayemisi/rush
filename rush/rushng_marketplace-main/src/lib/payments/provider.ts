import "server-only";

import * as paystack from "./paystack";

export interface InitiateInput {
  orderId?: string;
  email: string;
  amountNaira: number;
  description: string;
  metadata?: Record<string, unknown>;
  /** Absolute URL the gateway sends the customer back to after paying. */
  returnUrl?: string;
}

export interface InitiateResult {
  reference: string;
  authorizationUrl: string;
  accessCode: string;
}

export interface VerifyResult {
  status: "success" | "failed" | "pending" | "abandoned";
  amountNaira: number;
  currency: string;
  reference: string;
  gatewayResponse: string;
  channel: string;
  customerEmail: string;
  paidAt: string;
}

export interface PaymentProvider {
  name: string;
  isConfigured: boolean;
  initiate(input: InitiateInput): Promise<InitiateResult>;
  verify(reference: string): Promise<VerifyResult>;
  verifyWebhookSignature(rawBody: string, signature: string | null): Promise<boolean>;
}

export { isPaystackConfigured } from "./paystack";

export const activePaymentProvider: PaymentProvider = {
  name: "paystack",
  isConfigured: paystack.isPaystackConfigured,
  initiate: paystack.initiateTransaction,
  verify: paystack.verifyTransaction,
  verifyWebhookSignature: paystack.verifyWebhookSignature,
};

/**
 * Returns the active payment provider.
 * Throws an explicit error if PAYSTACK_SECRET_KEY is missing.
 */
export function getPaymentProvider(): PaymentProvider {
  if (!activePaymentProvider.isConfigured) {
    throw new Error(
      "PAYSTACK_SECRET_KEY is not configured. Please ensure PAYSTACK_SECRET_KEY and NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY are set in your environment variables."
    );
  }
  return activePaymentProvider;
}
