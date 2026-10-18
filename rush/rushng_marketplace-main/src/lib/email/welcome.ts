import "server-only";

import { sendEmail } from "./send";
import { welcomeEmailTemplate } from "./templates";

import type {
  WelcomeEmailData,
} from "./types";

/**
 * Send the Rush welcome email exactly once.
 *
 * The idempotency key is based on the Rush user ID rather than
 * the email address because email addresses can theoretically
 * change while the Rush user ID remains stable.
 */
export async function sendWelcomeEmail(
  data: WelcomeEmailData & {
    userId: string;
  },
) {
  const template =
    welcomeEmailTemplate(data);

  return sendEmail({
    to: {
      userId: data.userId,
      email: data.email,
      name: data.name,
    },

    subject: template.subject,

    html: template.html,

    text: template.text,

    type: "WELCOME",

    idempotencyKey:
      `welcome:${data.userId}`,

    metadata: {
      userId: data.userId,
      email: data.email,
    },
  });
}