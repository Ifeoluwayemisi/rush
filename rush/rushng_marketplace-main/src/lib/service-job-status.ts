// Lifecycle rules for ServiceJob, shared by the API routes and the UI.
//
// A job can be created two ways:
//  - Targeted: customer requests a specific provider (providerId set immediately).
//  - Open: posted without a provider, visible to any verified provider in
//    that category until one of them quotes it (architecture supports this;
//    the current UI only creates targeted requests from a provider's page).
//
// Two provider response paths, depending on whether a price was already fixed:
//  - Custom job (quotedPrice starts null): provider must submit a quote ->
//    QUOTED, and the customer has to approve it before work is scheduled.
//  - A specific listed Service (quotedPrice pre-filled from that service's
//    price): there's nothing to negotiate, so the provider just accepts or
//    declines and it goes straight to ASSIGNED.

export type ServiceJobStatus = "OPEN" | "QUOTED" | "ASSIGNED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

const TERMINAL: string[] = ["COMPLETED", "CANCELLED"];

export function isJobTerminal(status: string): boolean {
  return TERMINAL.includes(status);
}

/** Customers can back out any time before the job is finished. */
export function customerCanCancel(status: string): boolean {
  return !isJobTerminal(status);
}

export interface ProviderNextStep {
  status: ServiceJobStatus;
  actionLabel: string;
}

/** What the provider's "advance" button should say/do once a job is ASSIGNED or IN_PROGRESS. */
export function getProviderAdvanceStep(status: string): ProviderNextStep | null {
  if (status === "ASSIGNED") return { status: "IN_PROGRESS", actionLabel: "Start work" };
  if (status === "IN_PROGRESS") return { status: "COMPLETED", actionLabel: "Mark completed" };
  return null;
}
