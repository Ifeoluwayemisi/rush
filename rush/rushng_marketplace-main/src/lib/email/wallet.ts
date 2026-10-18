import { sendEmail } from "./send";
import { EmailType } from "./types";
import { naira } from "@/lib/data";

interface WalletEmailParams {
  userId?: string;
  email: string;
  name: string;
  amount: number;
  balanceAfter?: number;
  reference?: string;
  bankName?: string;
  accountNumber?: string;
  reason?: string;
}

export async function sendWalletCreditEmail({
  email,
  name,
  amount,
  balanceAfter,
  reference,
}: WalletEmailParams) {
  return sendEmail({
    to: { email, name },
    subject: `${naira(amount)} credited to your Rush Wallet`,
    type: "WALLET_CREDIT" as EmailType,
    html: `
      <h2>Wallet Funded Successfully</h2>
      <p>Hello ${name},</p>
      <p>Your Rush wallet has been credited with <strong>${naira(amount)}</strong>.</p>
      ${balanceAfter !== undefined ? `<p>New Balance: <strong>${naira(balanceAfter)}</strong></p>` : ""}
      ${reference ? `<p><small>Reference: ${reference}</small></p>` : ""}
    `,
  });
}

export async function sendWalletDebitEmail({
  email,
  name,
  amount,
  balanceAfter,
  reason,
}: WalletEmailParams) {
  return sendEmail({
    to: { email, name },
    subject: `${naira(amount)} debited from your Rush Wallet`,
    type: "WALLET_DEBIT" as EmailType,
    html: `
      <h2>Wallet Debit Notice</h2>
      <p>Hello ${name},</p>
      <p>A payment of <strong>${naira(amount)}</strong> was made from your wallet.</p>
      ${reason ? `<p>Purpose: ${reason}</p>` : ""}
      ${balanceAfter !== undefined ? `<p>Current Balance: <strong>${naira(balanceAfter)}</strong></p>` : ""}
    `,
  });
}

export async function sendWithdrawalInitiatedEmail({
  email,
  name,
  amount,
  bankName,
  accountNumber,
}: WalletEmailParams) {
  return sendEmail({
    to: { email, name },
    subject: `Withdrawal initiated: ${naira(amount)}`,
    type: "WITHDRAWAL_INITIATED" as EmailType,
    html: `
      <h2>Withdrawal in Progress</h2>
      <p>Hello ${name},</p>
      <p>Your request to withdraw <strong>${naira(amount)}</strong> to ${bankName || "your bank account"} (${accountNumber || "saved NUBAN"}) is being processed.</p>
      <p>Funds typically arrive within 1-5 minutes.</p>
    `,
  });
}

export async function sendWithdrawalPaidEmail({
  email,
  name,
  amount,
  bankName,
  accountNumber,
}: WalletEmailParams) {
  return sendEmail({
    to: { email, name },
    subject: `Withdrawal complete: ${naira(amount)}`,
    type: "WITHDRAWAL_PAID" as EmailType,
    html: `
      <h2>Withdrawal Completed</h2>
      <p>Hello ${name},</p>
      <p>Your withdrawal of <strong>${naira(amount)}</strong> to ${bankName} (${accountNumber}) was successful.</p>
    `,
  });
}

export async function sendWithdrawalFailedEmail({
  email,
  name,
  amount,
  reason,
}: WalletEmailParams) {
  return sendEmail({
    to: { email, name },
    subject: `Withdrawal failed — ${naira(amount)} refunded`,
    type: "WITHDRAWAL_FAILED" as EmailType,
    html: `
      <h2>Withdrawal Failed</h2>
      <p>Hello ${name},</p>
      <p>Your withdrawal of <strong>${naira(amount)}</strong> could not be completed.</p>
      <p>Reason: ${reason || "Banking transfer declined."}</p>
      <p><strong>Your wallet balance has been refunded in full.</strong></p>
    `,
  });
}
