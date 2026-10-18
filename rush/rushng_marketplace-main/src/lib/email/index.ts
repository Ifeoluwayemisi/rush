export {
  getResend,
} from "./client";

export {
  emailConfig,
  assertEmailConfigured,
} from "./config";

export {
  sendEmail,
} from "./send";

export {
  sendWelcomeEmail,
} from "./welcome";

export {
  sendOrderNotification,
  sendRideNotification,
  sendPaymentNotification,
  sendAccountNotification,
} from "./notifications";

export {
  welcomeEmailTemplate,
  orderEmailTemplate,
  rideEmailTemplate,
  paymentEmailTemplate,
} from "./templates";

export * from "./verification";

export type {
  EmailType,
  EmailDeliveryStatus,
  EmailRecipient,
  SendEmailOptions,
  EmailSendResult,
  WelcomeEmailData,
  OrderEmailData,
  RideEmailData,
  PaymentEmailData,
} from "./types";
