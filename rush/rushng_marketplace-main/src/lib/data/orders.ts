"use client";

import type { Order } from "@/lib/types";
import { api } from "./shared";

export type OrderScope = "customer" | "vendor" | "rider";

export const ordersRepo = {
  list(scope: OrderScope = "customer"): Promise<{ orders: Order[] }> {
    return api.get(`/api/orders?scope=${scope}`);
  },

  get(id: string): Promise<{ order: Order }> {
    return api.get(`/api/orders/${id}`);
  },

  create(body: any): Promise<{ order: Order }> {
    return api.post("/api/orders", body);
  },

  updateStatus(id: string, body: { status: string; riderId?: string }): Promise<{ order: Order }> {
    return api.patch(`/api/orders/${id}`, body);
  },
};
