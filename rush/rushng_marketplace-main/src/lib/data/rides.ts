"use client";

import type { Ride } from "@/lib/types";
import { api } from "./shared";

export type RideScope = "customer" | "rider";

export const ridesRepo = {
  list(scope: RideScope = "customer"): Promise<{ rides: Ride[] }> {
    return api.get(`/api/rides?scope=${scope}`);
  },

  get(id: string): Promise<{ ride: Ride }> {
    return api.get(`/api/rides/${id}`);
  },

  request(body: {
    type: string;
    pickup: string;
    destination: string;
    fare: number;
    distanceKm: number;
    estimatedMin: number;
  }): Promise<{ ride: Ride; candidateCount: number }> {
    return api.post("/api/rides", body);
  },

  cancel(id: string): Promise<{ ride: Ride }> {
    return api.patch(`/api/rides/${id}`, { action: "CANCEL" });
  },
};
