import "server-only";

export type EmailType =
  | "WELCOME"
  | "VERIFICATION_OTP"
  | "ORDER_CREATED"
  | "ORDER_CONFIRMATION"
  | "ORDER_CONFIRMED"
  | "ORDER_STATUS_UPDATE"
  | "ORDER_PREPARING"
  | "ORDER_RIDER_ASSIGNED"
  | "ORDER_ON_THE_WAY"
  | "ORDER_DELIVERED"
  | "ORDER_PICKED_UP"
  | "ORDER_CANCELLED"
  | "RIDE_REQUESTED"
  | "RIDE_ASSIGNED"
  | "RIDE_EN_ROUTE"
  | "RIDE_STARTED"
  | "RIDE_COMPLETED"
  | "RIDE_CANCELLED"
  | "PAYMENT_SUCCESS"
  | "PAYMENT_FAILED"
  | "PAYMENT_REFUNDED"
  | "ACCOUNT_SECURITY"
  | "ACCOUNT_UPDATE"
  | "APP_UPDATE"
  | "KYC_OTP"
  | "KYC_SUBMITTED"
  | "KYC_APPROVED"
  | "KYC_REJECTED"
  | "WALLET_CREDIT"
  | "WALLET_DEBIT"
  | "WITHDRAWAL_INITIATED"
  | "WITHDRAWAL_PAID"
  | "WITHDRAWAL_FAILED";

export type EmailDeliveryStatus =
  | "PENDING"
  | "SENDING"
  | "SENT"
  | "FAILED";

export interface EmailRecipient {
  userId?: string;
  email: string;
  name?: string | null;
}

export interface SendEmailOptions {
  to: EmailRecipient;
  subject: string;
  html: string;
  text?: string;

  /**
   * Unique logical identifier for this email.
   *
   * Examples:
   *   welcome:userId
   *   order:orderId:CONFIRMED
   *   ride:rideId:COMPLETED
   *
   * This prevents duplicate emails.
   */
  idempotencyKey?: string;

  type?: EmailType;

  /**
   * Optional metadata stored with the delivery record.
   */
  metadata?: Record<string, unknown>;
}

export interface EmailSendResult {
  success: boolean;
  skipped?: boolean;
  id?: string;
  providerId?: string;
  error?: string;
}

export interface WelcomeEmailData {
  name: string;
  email: string;
}

export interface OrderEmailData {
  name: string;
  email: string;
  orderCode: string;
  status: string;
  total?: number;
  vendorName?: string;
  deliveryAddress?: string;
}

export interface RideEmailData {
  name: string;
  email: string;
  rideCode: string;
  status: string;
  pickup?: string;
  destination?: string;
  fare?: number;
}

export interface PaymentEmailData {
  name: string;
  email: string;
  reference: string;
  status: string;
  amount?: number;
  orderCode?: string;
}

export interface WalletEmailData {
  name: string;
  email: string;
  amount: number;
  balanceAfter?: number;
  reference?: string;
}

export interface WithdrawalEmailData {
  name: string;
  email: string;
  amount: number;
  reference: string;
  status: string;
  reason?: string;
}
