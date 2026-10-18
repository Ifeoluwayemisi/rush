import "server-only";

import type {
  OrderEmailData,
  PaymentEmailData,
  RideEmailData,
  WelcomeEmailData,
} from "./types";

const BRAND_COLOR = "#FF6B1A";
const DARK = "#171717";
const MUTED = "#666666";
const BORDER = "#E5E7EB";
const BACKGROUND = "#F7F7F7";

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function formatNaira(amount?: number): string {
  if (typeof amount !== "number") {
    return "";
  }

  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
    maximumFractionDigits: 2,
  }).format(amount);
}

/**
 * Base Rush email layout.
 */
function layout({
  title,
  preheader,
  content,
}: {
  title: string;
  preheader?: string;
  content: string;
}) {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />
  <title>${escapeHtml(title)}</title>
</head>

<body
  style="
    margin:0;
    padding:0;
    background:${BACKGROUND};
    font-family:
      Arial,
      Helvetica,
      sans-serif;
    color:${DARK};
  "
>
  ${
    preheader
      ? `
        <div
          style="
            display:none;
            max-height:0;
            overflow:hidden;
            opacity:0;
          "
        >
          ${escapeHtml(preheader)}
        </div>
      `
      : ""
  }

  <table
    width="100%"
    cellpadding="0"
    cellspacing="0"
    border="0"
    style="background:${BACKGROUND};"
  >
    <tr>
      <td
        align="center"
        style="padding:40px 16px;"
      >
        <table
          width="100%"
          cellpadding="0"
          cellspacing="0"
          border="0"
          style="
            max-width:620px;
            background:#ffffff;
            border-radius:16px;
            overflow:hidden;
            border:1px solid ${BORDER};
          "
        >
          <!-- Header -->
          <tr>
            <td
              style="
                background:${BRAND_COLOR};
                padding:28px 32px;
              "
            >
              <div
                style="
                  font-size:28px;
                  line-height:1;
                  font-weight:800;
                  color:#ffffff;
                  letter-spacing:-1px;
                "
              >
                rush
              </div>

              <div
                style="
                  margin-top:8px;
                  font-size:13px;
                  color:rgba(255,255,255,.9);
                "
              >
                Shop. Sell. Services. Rides.
              </div>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td
              style="
                padding:36px 32px;
              "
            >
              ${content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td
              style="
                padding:24px 32px;
                border-top:1px solid ${BORDER};
                background:#fafafa;
              "
            >
              <p
                style="
                  margin:0;
                  font-size:12px;
                  line-height:1.6;
                  color:${MUTED};
                "
              >
                This is an automated email from Rush.
                Please do not reply unless the message
                provides a reply address.
              </p>

              <p
                style="
                  margin:10px 0 0;
                  font-size:12px;
                  color:${MUTED};
                "
              >
                © ${new Date().getFullYear()} Rush.
                All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

/**
 * Welcome email.
 */
export function welcomeEmailTemplate(
  data: WelcomeEmailData,
) {
  const name = escapeHtml(data.name);

  return {
    subject: "Welcome to Rush 🎉",
    html: layout({
      title: "Welcome to Rush",
      preheader:
        "Your Rush account has been created successfully.",
      content: `
        <h1
          style="
            margin:0 0 16px;
            font-size:28px;
            line-height:1.2;
          "
        >
          Welcome to Rush, ${name}! 🎉
        </h1>

        <p
          style="
            margin:0 0 18px;
            font-size:16px;
            line-height:1.7;
            color:#444;
          "
        >
          Your Rush account is ready.
          You now have one account for shopping,
          selling, discovering services, and booking rides.
        </p>

        <p
          style="
            margin:0 0 28px;
            font-size:16px;
            line-height:1.7;
            color:#444;
          "
        >
          We're glad to have you with us.
        </p>

        <a
          href="${escapeHtml(
            process.env.NEXT_PUBLIC_APP_URL ||
              process.env.APP_URL ||
              "https://rushng-marketplace.vercel.app",
          )}"
          style="
            display:inline-block;
            padding:14px 22px;
            background:${BRAND_COLOR};
            color:#ffffff;
            text-decoration:none;
            border-radius:10px;
            font-weight:700;
            font-size:14px;
          "
        >
          Explore Rush
        </a>
      `,
    }),
    text: `
Welcome to Rush, ${data.name}!

Your Rush account is ready.

You now have one account for shopping, selling,
discovering services, and booking rides.

We're glad to have you with us.

Explore Rush:
${
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.APP_URL ||
  "https://rushng-marketplace.vercel.app"
}
`.trim(),
  };
}

/**
 * Generic order notification template.
 */
export function orderEmailTemplate(
  data: OrderEmailData,
) {
  const name = escapeHtml(data.name);
  const orderCode = escapeHtml(data.orderCode);
  const status = escapeHtml(data.status);
  const vendorName = escapeHtml(
    data.vendorName || "Rush",
  );
  const address = escapeHtml(
    data.deliveryAddress || "",
  );

  const total = formatNaira(data.total);

  return {
    subject: `Rush order ${data.orderCode} — ${data.status}`,
    html: layout({
      title: `Order ${data.orderCode}`,
      preheader: `Your Rush order is now ${data.status}.`,
      content: `
        <h1
          style="
            margin:0 0 12px;
            font-size:26px;
          "
        >
          Order update
        </h1>

        <p
          style="
            margin:0 0 24px;
            font-size:16px;
            line-height:1.6;
            color:#444;
          "
        >
          Hi ${name}, your Rush order has been
          updated.
        </p>

        <table
          width="100%"
          cellpadding="0"
          cellspacing="0"
          style="
            border-collapse:collapse;
            margin-bottom:24px;
          "
        >
          <tr>
            <td
              style="
                padding:12px 0;
                border-bottom:1px solid ${BORDER};
                color:${MUTED};
              "
            >
              Order
            </td>
            <td
              align="right"
              style="
                padding:12px 0;
                border-bottom:1px solid ${BORDER};
                font-weight:700;
              "
            >
              ${orderCode}
            </td>
          </tr>

          <tr>
            <td
              style="
                padding:12px 0;
                border-bottom:1px solid ${BORDER};
                color:${MUTED};
              "
            >
              Status
            </td>
            <td
              align="right"
              style="
                padding:12px 0;
                border-bottom:1px solid ${BORDER};
                font-weight:700;
                color:${BRAND_COLOR};
              "
            >
              ${status}
            </td>
          </tr>

          <tr>
            <td
              style="
                padding:12px 0;
                border-bottom:1px solid ${BORDER};
                color:${MUTED};
              "
            >
              Vendor
            </td>
            <td
              align="right"
              style="
                padding:12px 0;
                border-bottom:1px solid ${BORDER};
                font-weight:700;
              "
            >
              ${vendorName}
            </td>
          </tr>

          ${
            total
              ? `
                <tr>
                  <td
                    style="
                      padding:12px 0;
                      color:${MUTED};
                    "
                  >
                    Total
                  </td>

                  <td
                    align="right"
                    style="
                      padding:12px 0;
                      font-weight:800;
                    "
                  >
                    ${escapeHtml(total)}
                  </td>
                </tr>
              `
              : ""
          }
        </table>

        ${
          address
            ? `
              <p
                style="
                  margin:0 0 24px;
                  font-size:14px;
                  line-height:1.6;
                  color:#555;
                "
              >
                <strong>Delivery address:</strong><br />
                ${address}
              </p>
            `
            : ""
        }

        <a
          href="${
            process.env.NEXT_PUBLIC_APP_URL ||
            process.env.APP_URL ||
            "https://rushng-marketplace.vercel.app"
          }"
          style="
            display:inline-block;
            padding:14px 22px;
            background:${BRAND_COLOR};
            color:#ffffff;
            text-decoration:none;
            border-radius:10px;
            font-weight:700;
            font-size:14px;
          "
        >
          Open Rush
        </a>
      `,
    }),
    text: `
Hi ${data.name},

Your Rush order has been updated.

Order: ${data.orderCode}
Status: ${data.status}
Vendor: ${data.vendorName || "Rush"}
${data.total !== undefined ? `Total: ${formatNaira(data.total)}` : ""}
${
  data.deliveryAddress
    ? `Delivery address: ${data.deliveryAddress}`
    : ""
}

Open Rush:
${
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.APP_URL ||
  "https://rushng-marketplace.vercel.app"
}
`.trim(),
  };
}

// Email verification
export function emailVerificationTemplate(params: {
  name: string;
  verifyUrl: string;
}): { subject: string; html: string } {
  const subject = "Verify your Rush account";
  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px; color: #111;">
      <h2 style="font-size: 22px; font-weight: 800; margin-bottom: 16px;">Verify your email address</h2>
      <p style="font-size: 15px; line-height: 1.6; color: #444;">Hi ${params.name},</p>
      <p style="font-size: 15px; line-height: 1.6; color: #444;">
        Welcome to Rush! Please verify your email address to complete your account setup and activate full access to the marketplace.
      </p>
      <div style="margin: 28px 0;">
        <a href="${params.verifyUrl}" style="background-color: #FF6B1A; color: #ffffff; padding: 12px 24px; border-radius: 8px; font-weight: 700; text-decoration: none; display: inline-block;">
          Verify Email
        </a>
      </div>
      <p style="font-size: 13px; line-height: 1.5; color: #888;">
        Or paste this link into your browser:<br/>
        <a href="${params.verifyUrl}" style="color: #FF6B1A;">${params.verifyUrl}</a>
      </p>
      <p style="font-size: 12px; color: #aaa; margin-top: 32px;">This link will expire in 24 hours. If you did not create an account on Rush, you can ignore this email.</p>
    </div>
  `;

  return { subject, html };
}


/**
 * Ride notification template.
 */
export function rideEmailTemplate(
  data: RideEmailData,
) {
  const fare = formatNaira(data.fare);

  return {
    subject: `Rush ride ${data.rideCode} — ${data.status}`,
    html: layout({
      title: `Ride ${data.rideCode}`,
      preheader: `Your Rush ride is now ${data.status}.`,
      content: `
        <h1
          style="
            margin:0 0 12px;
            font-size:26px;
          "
        >
          Ride update
        </h1>

        <p
          style="
            margin:0 0 24px;
            font-size:16px;
            line-height:1.6;
            color:#444;
          "
        >
          Hi ${escapeHtml(data.name)}, your Rush
          ride has been updated.
        </p>

        <table
          width="100%"
          cellpadding="0"
          cellspacing="0"
          style="border-collapse:collapse;"
        >
          <tr>
            <td
              style="
                padding:12px 0;
                border-bottom:1px solid ${BORDER};
                color:${MUTED};
              "
            >
              Ride
            </td>

            <td
              align="right"
              style="
                padding:12px 0;
                border-bottom:1px solid ${BORDER};
                font-weight:700;
              "
            >
              ${escapeHtml(data.rideCode)}
            </td>
          </tr>

          <tr>
            <td
              style="
                padding:12px 0;
                border-bottom:1px solid ${BORDER};
                color:${MUTED};
              "
            >
              Status
            </td>

            <td
              align="right"
              style="
                padding:12px 0;
                border-bottom:1px solid ${BORDER};
                color:${BRAND_COLOR};
                font-weight:800;
              "
            >
              ${escapeHtml(data.status)}
            </td>
          </tr>

          ${
            data.pickup
              ? `
                <tr>
                  <td
                    style="
                      padding:12px 0;
                      border-bottom:1px solid ${BORDER};
                      color:${MUTED};
                    "
                  >
                    Pickup
                  </td>

                  <td
                    align="right"
                    style="
                      padding:12px 0;
                      border-bottom:1px solid ${BORDER};
                      font-weight:600;
                    "
                  >
                    ${escapeHtml(data.pickup)}
                  </td>
                </tr>
              `
              : ""
          }

          ${
            data.destination
              ? `
                <tr>
                  <td
                    style="
                      padding:12px 0;
                      color:${MUTED};
                    "
                  >
                    Destination
                  </td>

                  <td
                    align="right"
                    style="
                      padding:12px 0;
                      font-weight:600;
                    "
                  >
                    ${escapeHtml(data.destination)}
                  </td>
                </tr>
              `
              : ""
          }

          ${
            fare
              ? `
                <tr>
                  <td
                    style="
                      padding:12px 0;
                      color:${MUTED};
                    "
                  >
                    Fare
                  </td>

                  <td
                    align="right"
                    style="
                      padding:12px 0;
                      font-weight:800;
                    "
                  >
                    ${escapeHtml(fare)}
                  </td>
                </tr>
              `
              : ""
          }
        </table>
      `,
    }),
    text: `
Hi ${data.name},

Your Rush ride has been updated.

Ride: ${data.rideCode}
Status: ${data.status}
${data.pickup ? `Pickup: ${data.pickup}` : ""}
${data.destination ? `Destination: ${data.destination}` : ""}
${data.fare !== undefined ? `Fare: ${formatNaira(data.fare)}` : ""}
`.trim(),
  };
}

/**
 * Payment notification template.
 */
export function paymentEmailTemplate(
  data: PaymentEmailData,
) {
  return {
    subject: `Rush payment — ${data.status}`,
    html: layout({
      title: "Payment update",
      preheader: `Your Rush payment is ${data.status}.`,
      content: `
        <h1
          style="
            margin:0 0 12px;
            font-size:26px;
          "
        >
          Payment update
        </h1>

        <p
          style="
            margin:0 0 24px;
            font-size:16px;
            line-height:1.6;
            color:#444;
          "
        >
          Hi ${escapeHtml(data.name)}, here's an
          update about your Rush payment.
        </p>

        <table
          width="100%"
          cellpadding="0"
          cellspacing="0"
          style="border-collapse:collapse;"
        >
          <tr>
            <td
              style="
                padding:12px 0;
                border-bottom:1px solid ${BORDER};
                color:${MUTED};
              "
            >
              Reference
            </td>

            <td
              align="right"
              style="
                padding:12px 0;
                border-bottom:1px solid ${BORDER};
                font-weight:700;
              "
            >
              ${escapeHtml(data.reference)}
            </td>
          </tr>

          <tr>
            <td
              style="
                padding:12px 0;
                border-bottom:1px solid ${BORDER};
                color:${MUTED};
              "
            >
              Status
            </td>

            <td
              align="right"
              style="
                padding:12px 0;
                border-bottom:1px solid ${BORDER};
                color:${BRAND_COLOR};
                font-weight:800;
              "
            >
              ${escapeHtml(data.status)}
            </td>
          </tr>

          ${
            data.amount !== undefined
              ? `
                <tr>
                  <td
                    style="
                      padding:12px 0;
                      color:${MUTED};
                    "
                  >
                    Amount
                  </td>

                  <td
                    align="right"
                    style="
                      padding:12px 0;
                      font-weight:800;
                    "
                  >
                    ${escapeHtml(
                      formatNaira(data.amount),
                    )}
                  </td>
                </tr>
              `
              : ""
          }

          ${
            data.orderCode
              ? `
                <tr>
                  <td
                    style="
                      padding:12px 0;
                      color:${MUTED};
                    "
                  >
                    Order
                  </td>

                  <td
                    align="right"
                    style="
                      padding:12px 0;
                      font-weight:700;
                    "
                  >
                    ${escapeHtml(data.orderCode)}
                  </td>
                </tr>
              `
              : ""
          }
        </table>
      `,
    }),
    text: `
Hi ${data.name},

Your Rush payment has been updated.

Reference: ${data.reference}
Status: ${data.status}
${data.amount !== undefined ? `Amount: ${formatNaira(data.amount)}` : ""}
${data.orderCode ? `Order: ${data.orderCode}` : ""}
`.trim(),
  };
}

// ─── Vendor KYC templates ─────────────────────────────────────────────────

/**
 * OTP email sent to a vendor's institutional (LASU) address when they
 * request institutional verification.
 *
 * The OTP is shown in a large monospace block so it's easy to read on
 * mobile and copy into the app. We deliberately don't link anywhere —
 * the user is expected to copy the code back into the Rush app, which
 * avoids the "magic link" attack surface where a leaked referrer or
 * cached browser history could grant account access.
 */
export function kycOtpEmailTemplate(params: {
  name: string;
  otp: string;
  tier: "STUDENT_LASU" | "STAFF_LASU";
  expiresAt: Date;
}): { subject: string; html: string; text: string } {
  const tierLabel = params.tier === "STAFF_LASU" ? "LASU staff" : "LASU student";
  const minutesLeft = Math.max(
    1,
    Math.round((params.expiresAt.getTime() - Date.now()) / 60_000),
  );

  return {
    subject: `Your Rush ${tierLabel} verification code: ${params.otp}`,
    html: layout({
      title: `${tierLabel} verification`,
      preheader: `Your code is ${params.otp}. It expires in ${minutesLeft} minutes.`,
      content: `
        <h1 style="margin:0 0 12px;font-size:26px;">Verify your ${escapeHtml(tierLabel)} status</h1>

        <p style="margin:0 0 24px;font-size:16px;line-height:1.6;color:#444;">
          Hi ${escapeHtml(params.name)}, enter this code in the Rush app to
          confirm your ${escapeHtml(tierLabel)} email and unlock your
          verified vendor badge.
        </p>

        <div style="margin:24px 0;padding:24px;background:#FFF7F0;border:1px solid #FFE0CC;border-radius:12px;text-align:center;">
          <p style="margin:0 0 8px;font-size:12px;color:${MUTED};letter-spacing:0.08em;text-transform:uppercase;">
            Your verification code
          </p>
          <p style="margin:0;font-family:'SF Mono', Menlo, Consolas, monospace;font-size:36px;font-weight:800;letter-spacing:8px;color:${BRAND_COLOR};">
            ${escapeHtml(params.otp)}
          </p>
        </div>

        <p style="margin:0 0 8px;font-size:14px;color:${MUTED};">
          This code expires in <strong>${minutesLeft} minutes</strong>.
        </p>
        <p style="margin:0;font-size:13px;color:${MUTED};">
          If you didn't request this, you can safely ignore this email —
          no changes have been made to your Rush account.
        </p>
      `,
    }),
    text: `
Hi ${params.name},

Enter this code in the Rush app to verify your ${tierLabel} status:

  ${params.otp}

This code expires in ${minutesLeft} minutes. If you didn't request it, you can safely ignore this email.

— The Rush team
`.trim(),
  };
}

/**
 * Confirmation email sent when an admin approves an external vendor's
 * government-ID KYC submission.
 */
export function kycApprovedEmailTemplate(params: {
  name: string;
  tier: "COMMUNITY_EXTERNAL" | "STUDENT_LASU" | "STAFF_LASU";
}): { subject: string; html: string; text: string } {
  const tierLabel =
    params.tier === "STUDENT_LASU"
      ? "LASU Student"
      : params.tier === "STAFF_LASU"
        ? "LASU Staff"
        : "ID-Verified Merchant";

  return {
    subject: `You're verified on Rush — ${tierLabel} badge active`,
    html: layout({
      title: "Verification approved",
      preheader: "Your Rush vendor account is now verified.",
      content: `
        <h1 style="margin:0 0 12px;font-size:26px;">You're verified 🎉</h1>
        <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#444;">
          Hi ${escapeHtml(params.name)}, your vendor verification has been
          approved. Your store now displays the
          <strong>${escapeHtml(tierLabel)}</strong> badge — buyers can
          shop with confidence knowing you're a verified Rush merchant.
        </p>
        <p style="margin:0 0 16px;font-size:14px;color:${MUTED};">
          You now have unlimited product listings, priority placement in
          search feeds, and instant withdrawal eligibility.
        </p>
        <p style="margin:0;font-size:13px;color:${MUTED};">
          Thanks for helping us keep Rush a trusted marketplace.
        </p>
      `,
    }),
    text: `
Hi ${params.name},

Your Rush vendor verification has been approved. Your store now shows the "${tierLabel}" badge.

You now have unlimited product listings, priority placement in search, and instant withdrawal eligibility.

— The Rush team
`.trim(),
  };
}

/**
 * Rejection email sent when an admin rejects an external vendor's KYC
 * submission. Includes the admin's reason so the vendor knows what to fix.
 */
export function kycRejectedEmailTemplate(params: {
  name: string;
  reason: string;
}): { subject: string; html: string; text: string } {
  return {
    subject: "Rush vendor verification — action needed",
    html: layout({
      title: "Verification needs another look",
      preheader: "Your KYC submission couldn't be approved. Here's why.",
      content: `
        <h1 style="margin:0 0 12px;font-size:26px;">We couldn't approve your verification</h1>
        <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#444;">
          Hi ${escapeHtml(params.name)}, thanks for submitting your vendor
          verification. Our team reviewed it and we're unable to approve
          it right now:
        </p>
        <blockquote style="margin:0 0 16px;padding:12px 16px;background:#F7F7F7;border-left:3px solid ${BRAND_COLOR};font-size:14px;color:#444;">
          ${escapeHtml(params.reason)}
        </blockquote>
        <p style="margin:0 0 16px;font-size:14px;color:${MUTED};">
          You can re-submit your verification from your store settings
          once you've addressed the issue above. If you think this is a
          mistake, reply to this email and our team will take another look.
        </p>
      `,
    }),
    text: `
Hi ${params.name},

Thanks for submitting your vendor verification. Our team reviewed it and we're unable to approve it right now:

  ${params.reason}

You can re-submit your verification from your store settings once you've addressed the issue above. If you think this is a mistake, reply to this email and our team will take another look.

— The Rush team
`.trim(),
  };
}
