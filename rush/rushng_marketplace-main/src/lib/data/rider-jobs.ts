"use client";

import { api } from "./shared";

export interface RiderJobSummary {
  id: string;
  type: "DELIVERY" | "RIDE";
  status: "OFFERED" | "ACCEPTED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  offeredAt: string;
  respondedAt: string | null;
  completedAt: string | null;
  order?: {
    id: string;
    code: string;
    vendorName: string;
    items: unknown[];
    total: number;
    deliveryFee: number;
    deliveryAddress?: string;
    customerName: string;
    customerPhone: string;
    status: string;
  };
  ride?: {
    id: string;
    code: string;
    pickup: string;
    destination: string;
    fare: number;
    distanceKm: number;
    estimatedMin: number;
    customerName: string;
    customerPhone: string;
    status: string;
  };
}

export const riderJobsRepo = {
  list(statuses?: string[]): Promise<{ jobs: RiderJobSummary[] }> {
    const query = statuses?.length ? `?status=${statuses.join(",")}` : "";
    return api.get(`/api/rider-jobs${query}`);
  },

  respond(
    id: string,
    body: { action: "ACCEPT" | "DECLINE" | "ADVANCE" },
  ): Promise<{ job: RiderJobSummary }> {
    return api.patch(`/api/rider-jobs/${id}`, body);
  },
};
