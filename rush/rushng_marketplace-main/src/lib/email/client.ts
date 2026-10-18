import "server-only";

import { Resend } from "resend";
import { emailConfig } from "./config";

let resendClient: Resend | null = null;

/**
 * Get the singleton Resend client.
 *
 * The client is created lazily so importing the email library
 * does not crash builds when the environment variable isn't
 * configured yet.
 */
export function getResend(): Resend {
  if (!emailConfig.apiKey) {
    throw new Error(
      "RESEND_API_KEY is not configured.",
    );
  }

  if (!resendClient) {
    resendClient = new Resend(
      emailConfig.apiKey,
    );
  }

  return resendClient;
}