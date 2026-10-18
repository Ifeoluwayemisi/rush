"use client";

import type { Provider } from "@/lib/types";
import { api } from "./shared";

function buildQuery(opts: { category?: string; q?: string }): string {
  const params = new URLSearchParams();
  if (opts.category && opts.category !== "All") params.set("category", opts.category);
  if (opts.q) params.set("q", opts.q);
  const qs = params.toString();
  return qs ? `?${qs}` : "";
}

export const providersRepo = {
  list(opts: { category?: string; q?: string } = {}): Promise<{ providers: Provider[] }> {
    return api.get(`/api/providers${buildQuery(opts)}`);
  },

  get(slug: string): Promise<{ provider: Provider }> {
    return api.get(`/api/providers/${slug}`);
  },
};
