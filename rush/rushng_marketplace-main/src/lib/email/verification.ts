import { sendEmail } from "./send";
import { emailVerificationTemplate } from "./templates";

export async function sendVerificationEmail(params: {
  userId: string;
  email: string;
  name: string;
  token: string;
}) {
  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  const verifyUrl = `${appUrl}/api/auth/verify?token=${params.token}`;
  const template = emailVerificationTemplate({
    name: params.name,
    verifyUrl,
  });

  return sendEmail({
    to: {
      email: params.email,
      name: params.name,
    },
    subject: template.subject,
    html: template.html,
  });
}
