"use client";

import type { Product, VendorProfile } from "@/lib/types";
import { api } from "./shared";

export const storesRepo = {
  list(visibility: "PUBLIC" | "ALL" = "PUBLIC"): Promise<{ vendors: VendorProfile[] }> {
    return api.get(`/api/stores${visibility === "ALL" ? "?visibility=ALL" : ""}`);
  },

  get(slug: string): Promise<{ vendor: VendorProfile; products: Product[] }> {
    return api.get(`/api/stores/${slug}`);
  },
};
