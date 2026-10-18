"use client";

import type { ServiceJob } from "@/lib/types";
import { api } from "./shared";

export type ServiceJobScope = "customer" | "provider" | "open";

export const serviceJobsRepo = {
  list(scope: ServiceJobScope = "customer"): Promise<{ jobs: ServiceJob[] }> {
    return api.get(`/api/service-jobs?scope=${scope}`);
  },

  get(id: string): Promise<{ job: ServiceJob }> {
    return api.get(`/api/service-jobs/${id}`);
  },

  create(body: any): Promise<{ job: ServiceJob }> {
    return api.post("/api/service-jobs", body);
  },

  respond(
    id: string,
    body: { action: "CANCEL" | "APPROVE_QUOTE" | "DECLINE_QUOTE" | "QUOTE" | "DECLINE" | "ADVANCE"; quotedPrice?: number },
  ): Promise<{ job: ServiceJob }> {
    return api.patch(`/api/service-jobs/${id}`, body);
  },
};
