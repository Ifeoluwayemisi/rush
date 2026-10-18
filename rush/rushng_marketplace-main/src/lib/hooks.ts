"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  productsRepo,
  storesRepo,
  providersRepo,
  ordersRepo,
  ridesRepo,
  serviceJobsRepo,
  riderJobsRepo,
  ridersRepo,
  authRepo,
  onboardingRepo,
  type RiderJobSummary,
  type AvailableRider,
} from "./data";
import type {
  Product,
  VendorProfile,
  Provider,
  Order,
  Ride,
  ServiceJob,
  User,
} from "./types";

// ---------- Auth ----------
// `useMe` deliberately keeps `retry: false` and `staleTime: 30s` so that
// a transient API failure doesn't hammer the server. There is no
// fallback — if the API is unreachable, the caller surfaces a friendly
// error via DataState. AuthHydrator still sets user to null on error
// (the user might just be on a public page that doesn't require auth).
export function useMe() {
  return useQuery<{ user: User | null }>({
    queryKey: ["me"],
    queryFn: () => authRepo.me(),
    retry: false,
    staleTime: 30_000,
  });
}

export function useLogin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: { email: string; password: string }) => authRepo.login(body),
    onSuccess: () => {
      // Remove the cached { user: null } from the pre-login state so
      // the next useMe() call forces a fresh fetch from the server
      // (which will now return the authenticated user because the
      // session cookie was just set). Without this, TanStack Query
      // would return the stale null for up to 30s (staleTime),
      // causing the landing page gate to briefly re-appear after
      // login before the background refetch resolves.
      qc.removeQueries({ queryKey: ["me"] });
      qc.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

export function useRegister() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      name: string;
      email: string;
      password: string;
      phone?: string;
      location?: string;
    }) => authRepo.register(body),
    onSuccess: () => {
      // Same as login — remove stale null cache so useMe() re-fetches.
      qc.removeQueries({ queryKey: ["me"] });
      qc.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

export function useLogout() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => authRepo.logout(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me"] });
      qc.setQueryData(["me"], { user: null });
    },
  });
}

// ---------- Products ----------
export function useProducts(opts?: { category?: string; q?: string; vendorId?: string }) {
  return useQuery<{ products: Product[] }>({
    queryKey: ["products", opts?.category, opts?.q, opts?.vendorId],
    queryFn: () => productsRepo.list(opts),
    staleTime: 60_000,
  });
}

export function useProduct(id?: string) {
  return useQuery<{ product: Product; vendor: VendorProfile }>({
    queryKey: ["product", id],
    queryFn: () => productsRepo.get(id as string),
    enabled: !!id,
  });
}

export interface ProductFormInput {
  name: string;
  description: string;
  price: number;
  compareAtPrice?: number | null;
  images: string[];
  category: string;
  condition?: string;
  stock?: number;
  location?: string;
  tags?: string[];
}

export function useCreateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: ProductFormInput) => productsRepo.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}

export function useUpdateProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...body }: Partial<ProductFormInput> & { id: string }) =>
      productsRepo.update(id, body),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["products"] });
      qc.invalidateQueries({ queryKey: ["product", vars.id] });
    },
  });
}

export function useDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => productsRepo.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["products"] }),
  });
}

// ---------- Stores / Vendors ----------
export function useStores() {
  return useQuery<{ vendors: VendorProfile[] }>({
    queryKey: ["stores"],
    queryFn: () => storesRepo.list("PUBLIC"),
    staleTime: 60_000,
  });
}

export function useStore(slug?: string) {
  return useQuery<{ vendor: VendorProfile; products: Product[] }>({
    queryKey: ["store", slug],
    queryFn: () => storesRepo.get(slug as string),
    enabled: !!slug,
  });
}

// ---------- Providers ----------
export function useProviders(opts?: { category?: string; q?: string }) {
  return useQuery<{ providers: Provider[] }>({
    queryKey: ["providers", opts?.category, opts?.q],
    queryFn: () => providersRepo.list(opts),
    staleTime: 60_000,
  });
}

export function useProvider(slug?: string) {
  return useQuery<{ provider: Provider }>({
    queryKey: ["provider", slug],
    queryFn: () => providersRepo.get(slug as string),
    enabled: !!slug,
  });
}

// ---------- Orders ----------
export function useOrders(scope: "customer" | "vendor" | "rider" = "customer") {
  return useQuery<{ orders: Order[] }>({
    queryKey: ["orders", scope],
    queryFn: () => ordersRepo.list(scope),
    staleTime: 10_000,
  });
}

export function useOrder(id?: string) {
  return useQuery<{ order: Order }>({
    queryKey: ["order", id],
    queryFn: () => ordersRepo.get(id as string),
    enabled: !!id,
    // Re-fetch every few seconds so tracking stays fresh
    refetchInterval: (q) => {
      const order = q.state.data?.order;
      if (!order) return false;
      return order.status === "DELIVERED" || order.status === "CANCELLED" ? false : 5000;
    },
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      items: any[];
      vendorId: string;
      fulfilment: string;
      paymentMethod: string;
      deliveryAddress?: string;
      deliveryFee?: number;
    }) => ordersRepo.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["orders"] }),
  });
}

export function useUpdateOrderStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, riderId }: { id: string; status: string; riderId?: string }) =>
      ordersRepo.updateStatus(id, { status, riderId }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["order", vars.id] });
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

// ---------- Rider Jobs (unified delivery + ride queue) ----------
export type { RiderJobSummary };

export function useRiderJobs(statuses?: string[]) {
  return useQuery<{ jobs: RiderJobSummary[] }>({
    queryKey: ["rider-jobs", statuses?.join(",") || "all"],
    queryFn: () => riderJobsRepo.list(statuses),
    staleTime: 5_000,
    refetchInterval: 8_000,
  });
}

export function useRespondToRiderJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, action }: { id: string; action: "ACCEPT" | "DECLINE" | "ADVANCE" }) =>
      riderJobsRepo.respond(id, { action }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rider-jobs"] });
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["rides"] });
      qc.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

export function useToggleRiderOnline() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (online: boolean) => ridersRepo.toggleOnline(online),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["me"] }),
  });
}

export type { AvailableRider };

export function useAvailableRiders(enabled: boolean) {
  return useQuery<{ riders: AvailableRider[] }>({
    queryKey: ["riders", "available"],
    queryFn: () => ridersRepo.available(),
    enabled,
    staleTime: 15_000,
  });
}

// ---------- Rides ----------
export function useRides(scope: "customer" | "rider" = "customer") {
  return useQuery<{ rides: Ride[] }>({
    queryKey: ["rides", scope],
    queryFn: () => ridesRepo.list(scope),
    staleTime: 10_000,
  });
}

export function useRide(id?: string) {
  return useQuery<{ ride: Ride }>({
    queryKey: ["ride", id],
    queryFn: () => ridesRepo.get(id as string),
    enabled: !!id,
    refetchInterval: (q) => {
      const ride = q.state.data?.ride;
      if (!ride) return false;
      return ride.status === "COMPLETED" || ride.status === "CANCELLED" ? false : 5000;
    },
  });
}

export function useCancelRide() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => ridesRepo.cancel(id),
    onSuccess: (_, id) => {
      qc.invalidateQueries({ queryKey: ["ride", id] });
      qc.invalidateQueries({ queryKey: ["rides"] });
    },
  });
}

export function useRequestRide() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      type: string;
      pickup: string;
      destination: string;
      fare: number;
      distanceKm: number;
      estimatedMin: number;
    }) => ridesRepo.request(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["rides"] }),
  });
}

// ---------- Service Jobs ----------
export function useServiceJobs(scope: "customer" | "provider" | "open" = "customer") {
  return useQuery<{ jobs: ServiceJob[] }>({
    queryKey: ["service-jobs", scope],
    queryFn: () => serviceJobsRepo.list(scope),
    staleTime: 10_000,
  });
}

export function useServiceJob(id?: string) {
  return useQuery<{ job: ServiceJob }>({
    queryKey: ["service-job", id],
    queryFn: () => serviceJobsRepo.get(id as string),
    enabled: !!id,
    refetchInterval: (q) => {
      const job = q.state.data?.job;
      if (!job) return false;
      return job.status === "COMPLETED" || job.status === "CANCELLED" ? false : 8000;
    },
  });
}

export function useCreateServiceJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      providerId?: string;
      serviceId?: string;
      title: string;
      description: string;
      category: string;
      budget?: number;
      location: string;
    }) => serviceJobsRepo.create(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["service-jobs"] }),
  });
}

export function useRespondServiceJob() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      action,
      quotedPrice,
    }: {
      id: string;
      action: "CANCEL" | "APPROVE_QUOTE" | "DECLINE_QUOTE" | "QUOTE" | "DECLINE" | "ADVANCE";
      quotedPrice?: number;
    }) => serviceJobsRepo.respond(id, { action, quotedPrice }),
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ["service-job", vars.id] });
      qc.invalidateQueries({ queryKey: ["service-jobs"] });
    },
  });
}

// ---------- Onboarding ----------
export function useOnboardVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      businessName: string;
      category: string;
      description?: string;
      location: string;
      phone: string;
      whatsapp?: string;
      visibility?: string;
    }) => onboardingRepo.vendor(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["me"] }),
  });
}

export function useOnboardProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: any) => onboardingRepo.provider(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["me"] }),
  });
}

export function useOnboardRider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: any) => onboardingRepo.rider(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["me"] }),
  });
}

// ─── Profile edit + uploads + follows + notifications ──────────────────

export function useUpdateProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: { name?: string; phone?: string; avatar?: string; location?: string }) => {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update profile");
      }
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["me"] }),
  });
}

export function useUploadFile() {
  return useMutation({
    mutationFn: async (file: File): Promise<{ url: string; size: number; contentType: string }> => {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/uploads", {
        method: "POST",
        credentials: "include",
        body: fd,
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to upload file");
      }
      return res.json();
    },
  });
}

export function useUpdateStore(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) => {
      const res = await fetch(`/api/stores/${slug}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to update store");
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["store", slug] });
      qc.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

export function useFollow(targetType: "vendor" | "provider", targetId?: string) {
  const qc = useQueryClient();
  const key = ["follow", targetType, targetId];
  return useQuery<{ following: boolean }>({
    queryKey: key,
    queryFn: async () => {
      if (!targetId) return { following: false };
      const res = await fetch(`/api/follows?targetType=${targetType}&targetId=${targetId}`, { credentials: "include" });
      if (!res.ok) return { following: false };
      return res.json();
    },
    enabled: !!targetId,
  });
}

export function useToggleFollow() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ targetType, targetId, follow }: { targetType: "vendor" | "provider"; targetId: string; follow: boolean }) => {
      const res = await fetch(`/api/follows?targetType=${targetType}&targetId=${targetId}`, {
        method: follow ? "POST" : "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ targetType, targetId }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to toggle follow");
      }
      return res.json();
    },
    onSuccess: (_data, vars) => {
      qc.invalidateQueries({ queryKey: ["follow", vars.targetType, vars.targetId] });
    },
  });
}

export interface AppNotification {
  id: string;
  type: "ORDER_UPDATE" | "RIDE_UPDATE" | "PAYMENT" | "FOLLOW" | "SYSTEM";
  title: string;
  body?: string | null;
  link?: { view: string; params?: Record<string, string> } | null;
  read: boolean;
  createdAt: string;
}

export function useNotifications() {
  return useQuery<{ notifications: AppNotification[]; unreadCount: number }>({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications", { credentials: "include" });
      if (!res.ok) return { notifications: [], unreadCount: 0 };
      return res.json();
    },
    // Poll every 30s — matches the rest of the app's polling cadence.
    refetchInterval: 30_000,
    refetchIntervalInBackground: false,
  });
}

export function useMarkNotificationsRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/notifications?action=mark-all-read", {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to mark notifications read");
      return res.json();
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications"] }),
  });
}

// ─── Danger zone: delete account + delete store ─────────────────────────
//
// Both hooks hit the DELETE endpoints we added on /api/auth/me and
// /api/stores/[slug]. Both require `{ confirm: true }` in the body —
// we let the calling component craft the UX (a "type DELETE" prompt
// is the recommended pattern) and just forward the confirmation.

/**
 * useDeleteAccount — permanently delete the authenticated user's
 * account + all derived data (vendor profile, provider profile,
 * rider profile, wallet, orders, rides, payments, etc.).
 *
 * On success the server returns `{ ok: true }`. The hook then
 * invalidates EVERY query in the cache so the client refetches with
 * a cleared session — the next `/api/auth/me` call returns
 * `{ user: null }` and AuthHydrator flips the user to null,
 * triggering the landing-gate UI.
 */
export function useDeleteAccount() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/auth/me", {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete account");
      }
      return res.json();
    },
    onSuccess: () => {
      // Invalidate everything — the user record is gone, so every
      // cached query for orders / rides / stores / etc. is now stale.
      qc.invalidateQueries();
    },
  });
}

/**
 * useDeleteStore — tear down the calling user's vendor store. The
 * user account stays; only the VENDOR capability + the
 * vendorProfile + the vendor's products are removed.
 *
 * `slug` is required — pass the vendor profile's slug (the same one
 * used to construct `/stores/[slug]` URLs).
 */
export function useDeleteStore(slug: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/stores/${slug}`, {
        method: "DELETE",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ confirm: true }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to delete store");
      }
      return res.json();
    },
    onSuccess: () => {
      // `me` so the user's capabilities array refreshes (the VENDOR
      // cap is now gone) and the TopBar / AccountScreen re-render.
      qc.invalidateQueries({ queryKey: ["me"] });
      // `stores` so the public store list no longer includes this one.
      qc.invalidateQueries({ queryKey: ["stores"] });
      // `products` because all products under this vendor are gone.
      qc.invalidateQueries({ queryKey: ["products"] });
    },
  });
}
