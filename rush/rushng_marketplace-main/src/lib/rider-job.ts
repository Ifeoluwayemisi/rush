// RiderJob is the unified surface a rider interacts with, regardless of
// whether the work underneath is a delivery (Order) or a passenger trip
// (Ride). Keep the vocabulary intentionally small — five statuses that
// apply the same way to either job type — and let the type-specific
// side effects (updating Order/Ride status, crediting earnings, etc.)
// live in the API route that knows which kind of job it's handling.

export type RiderJobType = "DELIVERY" | "RIDE";
export type RiderJobStatus = "OFFERED" | "ACCEPTED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";

export function isJobTerminal(status: string): boolean {
  return status === "COMPLETED" || status === "CANCELLED";
}

/** What a rider is allowed to do with a job in its current status. */
export function allowedJobActions(status: string): Array<"ACCEPT" | "DECLINE" | "ADVANCE"> {
  if (status === "OFFERED") return ["ACCEPT", "DECLINE"];
  if (status === "ACCEPTED" || status === "IN_PROGRESS") return ["ADVANCE"];
  return [];
}
