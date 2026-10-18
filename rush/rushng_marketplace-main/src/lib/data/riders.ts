"use client";

import { api } from "./shared";

export interface AvailableRider {
  id: string;
  name: string;
  avatar: string | null;
  rating: number;
  online: boolean;
  vehicleType: string | null;
}

export const ridersRepo = {
  available(): Promise<{ riders: AvailableRider[] }> {
    return api.get("/api/riders/available");
  },

  toggleOnline(online: boolean): Promise<{ riderProfile: any }> {
    return api.patch("/api/riders/me", { online });
  },
};
