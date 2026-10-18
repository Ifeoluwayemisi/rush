"use client";

import type { VendorProfile, Provider } from "@/lib/types";
import { api } from "./shared";

export interface VendorOnboardInput {
  businessName: string;
  category: string;
  description?: string;
  location: string;
  phone: string;
  whatsapp?: string;
  visibility?: string;
}

export const onboardingRepo = {
  vendor(body: VendorOnboardInput): Promise<{ vendor: VendorProfile }> {
    return api.post("/api/onboarding/vendor", body);
  },
  provider(body: any): Promise<{ provider: Provider }> {
    return api.post("/api/onboarding/provider", body);
  },
  rider(body: any): Promise<{ rider: any }> {
    return api.post("/api/onboarding/rider", body);
  },
};
