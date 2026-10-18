import "server-only";

import {
  orderEmailTemplate,
  paymentEmailTemplate,
  rideEmailTemplate,
} from "./templates";

import { sendEmail } from "./send";

import type {
  OrderEmailData,
  PaymentEmailData,
  RideEmailData,
} from "./types";

/**
 * Send an order notification.
 */
export async function sendOrderNotification(
  data: OrderEmailData & {
    userId: string;
    type:
      | "ORDER_CREATED"
      | "ORDER_CONFIRMED"
      | "ORDER_PREPARING"
      | "ORDER_RIDER_ASSIGNED"
      | "ORDER_ON_THE_WAY"
      | "ORDER_DELIVERED"
      | "ORDER_PICKED_UP"
      | "ORDER_CANCELLED";
  },
) {
  const template =
    orderEmailTemplate(data);

  return sendEmail({
    to: {
      userId: data.userId,
      email: data.email,
      name: data.name,
    },

    subject: template.subject,

    html: template.html,

    text: template.text,

    type: data.type,

    /**
     * One email per order status.
     *
     * Example:
     * order:abc123:CONFIRMED
     */
    idempotencyKey:
      `order:${data.orderCode}:${data.type}`,

    metadata: {
      orderCode: data.orderCode,
      status: data.status,
    },
  });
}

/**
 * Send a ride notification.
 */
export async function sendRideNotification(
  data: RideEmailData & {
    userId: string;
    type:
      | "RIDE_REQUESTED"
      | "RIDE_ASSIGNED"
      | "RIDE_EN_ROUTE"
      | "RIDE_STARTED"
      | "RIDE_COMPLETED"
      | "RIDE_CANCELLED";
  },
) {
  const template =
    rideEmailTemplate(data);

  return sendEmail({
    to: {
      userId: data.userId,
      email: data.email,
      name: data.name,
    },

    subject: template.subject,

    html: template.html,

    text: template.text,

    type: data.type,

    idempotencyKey:
      `ride:${data.rideCode}:${data.type}`,

    metadata: {
      rideCode: data.rideCode,
      status: data.status,
    },
  });
}

/**
 * Send a payment notification.
 */
export async function sendPaymentNotification(
  data: PaymentEmailData & {
    userId: string;
    type:
      | "PAYMENT_SUCCESS"
      | "PAYMENT_FAILED"
      | "PAYMENT_REFUNDED";
  },
) {
  const template =
    paymentEmailTemplate(data);

  return sendEmail({
    to: {
      userId: data.userId,
      email: data.email,
      name: data.name,
    },

    subject: template.subject,

    html: template.html,

    text: template.text,

    type: data.type,

    idempotencyKey:
      `payment:${data.reference}:${data.type}`,

    metadata: {
      reference: data.reference,
      status: data.status,
    },
  });
}

/**
 * Generic account update email.
 */
export async function sendAccountNotification({
  userId,
  email,
  name,
  subject,
  html,
  text,
  type = "ACCOUNT_UPDATE",
  idempotencyKey,
}: {
  userId: string;
  email: string;
  name?: string | null;
  subject: string;
  html: string;
  text?: string;
  type?:
    | "ACCOUNT_SECURITY"
    | "ACCOUNT_UPDATE"
    | "APP_UPDATE";
  idempotencyKey: string;
}) {
  return sendEmail({
    to: {
      userId,
      email,
      name,
    },

    subject,
    html,
    text,

    type,

    idempotencyKey,
  });
}