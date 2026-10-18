import "server-only";

import { db } from "@/lib/db";
import { randomBytes } from "node:crypto";

/**
 * In-app notification helper.
 *
 * Notifications are short messages a user sees in their notification
 * bell — distinct from email (which is a separate, async channel).
 * Notifications are stored in the `notifications` collection.
 */

export type NotificationType =
  | "ORDER_UPDATE"
  | "RIDE_UPDATE"
  | "PAYMENT"
  | "FOLLOW"
  | "SYSTEM"
  | "SERVICE"
  | "KYC"
  | "WALLET_UPDATE"
  | "PAYOUT";

export interface NotifyInput {
  userId: string;
  type: NotificationType;
  title: string;
  body?: string;
  /** Optional deep-link target. e.g. { view: "order-tracking", orderId: "..." } */
  link?:
    | {
        view: string;
        params?: Record<string, string>;
      }
    | string;
}

/**
 * Create a notification for a user.
 * Fire-and-forget: notification failures should never block a request.
 */
export async function notifyUser(input: NotifyInput): Promise<void> {
  try {
    const linkStr =
      typeof input.link === "string"
        ? input.link
        : input.link
        ? JSON.stringify(input.link)
        : null;

    await db.notification.create({
      data: {
        id: randomBytes(12).toString("hex"),
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body ?? null,
        link: linkStr,
        read: false,
        createdAt: new Date(),
      },
    });
  } catch (err: any) {
    console.error("[notify] failed:", err?.message ?? err);
  }
}

/**
 * Exported alias matching routes that call sendNotification({ userId, title, message, type, link })
 */
export async function sendNotification(input: {
  userId: string;
  title: string;
  message?: string;
  body?: string;
  type: NotificationType;
  link?: any;
}): Promise<void> {
  return notifyUser({
    userId: input.userId,
    type: input.type,
    title: input.title,
    body: input.message ?? input.body,
    link: input.link,
  });
}
