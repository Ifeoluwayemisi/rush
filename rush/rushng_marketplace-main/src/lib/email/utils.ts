/**
 * Escape user-controlled strings before inserting them into
 * HTML that is generated outside React Email.
 *
 * React Email normally handles escaping for us, but keeping
 * this utility available is useful for plain HTML fallbacks.
 */
export function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Safely display a user's name.
 */
export function displayName(
  name?: string | null,
  fallback = "there",
): string {
  const value = name?.trim();

  return value || fallback;
}

/**
 * Format a monetary value for Rush emails.
 */
export function formatMoney(
  amount: number | string | null | undefined,
  currency = "NGN",
): string {
  if (
    amount === null ||
    amount === undefined ||
    amount === ""
  ) {
    return "";
  }

  const numericAmount =
    typeof amount === "string"
      ? Number(amount)
      : amount;

  if (!Number.isFinite(numericAmount)) {
    return String(amount);
  }

  try {
    return new Intl.NumberFormat("en-NG", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(numericAmount);
  } catch {
    return `${currency} ${numericAmount.toFixed(2)}`;
  }
}

/**
 * Normalize email addresses.
 */
export function normalizeEmail(
  email: string,
): string {
  return email.trim().toLowerCase();
}

/**
 * Prevent malformed or obviously invalid addresses
 * from being sent to Resend.
 */
export function isValidEmail(
  email: string,
): boolean {
  const value = normalizeEmail(email);

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/**
 * Convert an arbitrary status into a human-readable label.
 */
export function humanizeStatus(
  value: string,
): string {
  return value
    .replace(/_/g, " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
}

/**
 * Make an idempotency key safe for the Resend API.
 */
export function createIdempotencyKey(
  value: string,
): string {
  return value
    .trim()
    .replace(/[^a-zA-Z0-9._:/-]/g, "-")
    .slice(0, 256);
}