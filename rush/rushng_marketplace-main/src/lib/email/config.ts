import "server-only";

/**
 * Rush Email Configuration
 *
 * IMPORTANT:
 * - RESEND_API_KEY must NEVER be exposed as NEXT_PUBLIC_*.
 * - RUSH_EMAIL_FROM should use a domain verified in Resend.
 */

export const emailConfig = {
  apiKey: process.env.RESEND_API_KEY || "",

  from:
    process.env.RUSH_EMAIL_FROM ||
    "Rush <notifications@yourdomain.com>",

  replyTo:
    process.env.RUSH_EMAIL_REPLY_TO ||
    undefined,

  appUrl:
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.APP_URL ||
    "https://rush-marketplace-eight.vercel.app",

  enabled:
    Boolean(process.env.RESEND_API_KEY) &&
    Boolean(process.env.RUSH_EMAIL_FROM),
};

export function assertEmailConfigured() {
  if (!emailConfig.apiKey) {
    throw new Error(
      "RESEND_API_KEY is not configured.",
    );
  }

  if (!emailConfig.from) {
    throw new Error(
      "RUSH_EMAIL_FROM is not configured.",
    );
  }
}
