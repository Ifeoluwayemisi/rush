"use client";

import type { Product, VendorProfile } from "@/lib/types";
import { api } from "./shared";

function buildQuery(opts: { category?: string; q?: string; vendorId?: string }): string {
  const params = new URLSearchParams();
  if (opts.category && opts.category !== "All") params.set("category", opts.category);
  if (opts.q) params.set("q", opts.q);
  if (opts.vendorId) params.set("vendorId", opts.vendorId);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export interface ProductDetail {
  product: Product;
  vendor: VendorProfile;
}

export const productsRepo = {
  list(opts: { category?: string; q?: string; vendorId?: string } = {}): Promise<{ products: Product[] }> {
    return api.get(`/api/products${buildQuery(opts)}`);
  },

  get(id: string): Promise<ProductDetail> {
    return api.get(`/api/products/${id}`);
  },

  create(body: any): Promise<{ product: Product }> {
    return api.post("/api/products", body);
  },

  update(id: string, body: any): Promise<{ product: Product }> {
    return api.patch(`/api/products/${id}`, body);
  },

  remove(id: string): Promise<{ ok: true }> {
    return api.delete(`/api/products/${id}`);
  },
};
