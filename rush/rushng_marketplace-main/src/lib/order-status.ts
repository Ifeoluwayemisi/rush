// Single source of truth for order status transitions.
// Imported by the API route (server) AND the vendor dashboard (client)
// so the UI never has to guess what the server will accept.

export type OrderStatus =
  | "PLACED"
  | "CONFIRMED"
  | "PREPARING"
  | "RIDER_ASSIGNED"
  | "ON_THE_WAY"
  | "DELIVERED"
  | "PICKED_UP"
  | "CANCELLED";

export interface NextStep {
  status: OrderStatus;
  timelineLabel: string;
  actionLabel: string;
  requiresRider?: boolean;
}

const DELIVERY_FLOW: Record<string, NextStep | undefined> = {
  PLACED: { status: "CONFIRMED", timelineLabel: "Vendor confirmed your order", actionLabel: "Confirm order" },
  CONFIRMED: { status: "PREPARING", timelineLabel: "Vendor is preparing your order", actionLabel: "Start preparing" },
  PREPARING: {
    status: "RIDER_ASSIGNED",
    timelineLabel: "Rider assigned",
    actionLabel: "Assign a rider",
    requiresRider: true,
  },
  RIDER_ASSIGNED: { status: "ON_THE_WAY", timelineLabel: "Order picked up — on the way", actionLabel: "Mark picked up" },
  ON_THE_WAY: { status: "DELIVERED", timelineLabel: "Order delivered", actionLabel: "Mark delivered" },
};

const PICKUP_FLOW: Record<string, NextStep | undefined> = {
  PLACED: { status: "CONFIRMED", timelineLabel: "Vendor confirmed your order", actionLabel: "Confirm order" },
  CONFIRMED: { status: "PREPARING", timelineLabel: "Vendor is preparing your order", actionLabel: "Start preparing" },
  PREPARING: { status: "PICKED_UP", timelineLabel: "Ready — picked up by customer", actionLabel: "Mark picked up" },
};

/** The next legal status for an order, or null if it's a dead end (terminal or unknown). */
export function getNextStep(fulfilment: string, status: string): NextStep | null {
  const flow = fulfilment === "PICKUP" ? PICKUP_FLOW : DELIVERY_FLOW;
  return flow[status] ?? null;
}

export interface TimelineEntry {
  label: string;
  timestamp: string;
  completed: boolean;
  /** Optional machine-readable marker for entries that need to be identified programmatically, not just displayed. */
  type?: string;
}

export type StepOwner = "VENDOR" | "RIDER";

/**
 * Who is allowed to push the order past its *current* status.
 * For deliveries, once a rider is assigned, control of the remaining
 * steps (pickup, on-the-way -> delivered) passes to that rider — the
 * vendor's job (confirm/prepare/assign) is done.
 */
export function getStepOwner(fulfilment: string, status: string): StepOwner {
  if (fulfilment === "DELIVERY" && (status === "RIDER_ASSIGNED" || status === "ON_THE_WAY")) {
    return "RIDER";
  }
  return "VENDOR";
}

const TERMINAL: string[] = ["DELIVERED", "PICKED_UP", "CANCELLED"];
const CANCELLABLE: string[] = ["PLACED", "CONFIRMED", "PREPARING"];

export function isTerminal(status: string): boolean {
  return TERMINAL.includes(status);
}

/** Whether *anyone* (subject to the caller-specific rule below) could still cancel this order. */
export function canCancel(status: string): boolean {
  return CANCELLABLE.includes(status);
}

/** Customers can only self-cancel before the vendor has confirmed; after that it's the vendor's call. */
export function customerCanCancel(status: string): boolean {
  return status === "PLACED";
}
