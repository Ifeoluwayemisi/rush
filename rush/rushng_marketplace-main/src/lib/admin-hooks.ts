"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";

// Admin API calls go straight to the network — admin operations must
// never fall back to mock data, so we use the raw `api` client instead
// of going through the repository layer.

export interface AdminStats {
  users: number;
  vendors: number;
  providers: number;
  riders: number;
  products: number;
  openOrders: number;
  activeRides: number;
  openServiceJobs: number;
  pendingVerifications: number;
  pendingRiders: number;
  pendingProviders: number;
  /** Vendor KYC submissions awaiting admin review. */
  pendingKyc?: number;
}

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatar: string | null;
  location: string | null;
  capabilities: Array<{ type: string; status: string; profileId?: string }>;
  activeWorkspace: string | null;
  walletBalance: number;
  vendorProfile: { id: string; businessName: string; slug: string } | null;
  providerProfile: { id: string; businessName: string; slug: string } | null;
  riderProfile: {
    id: string;
    name: string;
    status: string;
    licenseUploaded: boolean;
    documentsVerified: boolean;
  } | null;
  createdAt: string;
}

export interface AdminVendor {
  id: string;
  businessName: string;
  slug: string;
  category: string;
  location: string;
  visibility: "PUBLIC" | "LINK_ONLY" | "PRIVATE";
  rating: number;
  reviewCount: number;
  followers: number;
  verified: boolean;
  createdAt: string;
  owner: { id: string; name: string; email: string; capabilities: any[] };
  productCount: number;
  orderCount: number;
}

export interface AdminProvider {
  id: string;
  businessName: string;
  slug: string;
  category: string;
  location: string;
  rating: number;
  reviewCount: number;
  startingPrice: number;
  verified: boolean;
  completedJobs: number;
  createdAt: string;
  owner: { id: string; name: string; email: string; capabilities: any[] };
  serviceCount: number;
  jobCount: number;
}

export interface AdminRider {
  id: string;
  name: string;
  phone: string;
  rating: number;
  trips: number;
  earningsToday: number;
  online: boolean;
  status: "PENDING_VERIFICATION" | "ACTIVE" | "OFFLINE" | "SUSPENDED";
  mobility: string[];
  licenseUploaded: boolean;
  documentsVerified: boolean;
  vehicle: {
    type: string;
    plate: string;
    model: string;
    licenseNumber: string;
    verified: boolean;
  } | null;
  owner: { id: string; email: string; capabilities: any[] };
  jobCount: number;
  createdAt: string;
}

export interface AdminProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  compareAtPrice?: number;
  stock: number;
  rating: number;
  reviewCount: number;
  condition?: string;
  images: string[];
  tags: string[];
  createdAt: string;
  vendor: { id: string; businessName: string; slug: string };
}

// ---------- Stats ----------
export function useAdminStats() {
  return useQuery<AdminStats>({
    queryKey: ["admin", "stats"],
    queryFn: () => api.get("/api/admin/stats"),
    staleTime: 15_000,
  });
}

export interface SystemStatus {
  database: { backend: string; label: string; configured: boolean };
  firebase: { clientConfigured: boolean; adminConfigured: boolean };
  mongodb: { uriConfigured: boolean; active: boolean };
  paystack: { secretKeyConfigured: boolean; publicKeyConfigured: boolean; configured: boolean };
}

export function useAdminSystemStatus() {
  return useQuery<SystemStatus>({
    queryKey: ["admin", "system"],
    queryFn: () => api.get("/api/admin/system"),
    staleTime: 60_000,
  });
}

// ---------- Users ----------
export function useAdminUsers(role?: string) {
  const qs = role && role !== "ALL" ? `?role=${role}` : "";
  return useQuery<{ users: AdminUser[] }>({
    queryKey: ["admin", "users", role || "ALL"],
    queryFn: () => api.get(`/api/admin/users${qs}`),
    staleTime: 30_000,
  });
}

export function useAdminUpdateUser() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      action,
      ...body
    }: {
      id: string;
      action: "SET_CAPABILITY_STATUS" | "ADD_CAPABILITY" | "REMOVE_CAPABILITY";
      capability?: string;
      status?: string;
    }) => api.patch(`/api/admin/users/${id}`, { action, ...body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
}

// ---------- Vendors ----------
export function useAdminVendors() {
  return useQuery<{ vendors: AdminVendor[] }>({
    queryKey: ["admin", "vendors"],
    queryFn: () => api.get("/api/admin/vendors"),
    staleTime: 30_000,
  });
}

export function useAdminUpdateVendor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      action,
      ...body
    }: {
      id: string;
      action: "SET_VISIBILITY" | "SET_VERIFIED" | "SUSPEND" | "REACTIVATE";
      visibility?: string;
      verified?: boolean;
    }) => api.patch(`/api/admin/vendors/${id}`, { action, ...body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "vendors"] }),
  });
}

// ---------- Providers ----------
export function useAdminProviders() {
  return useQuery<{ providers: AdminProvider[] }>({
    queryKey: ["admin", "providers"],
    queryFn: () => api.get("/api/admin/providers"),
    staleTime: 30_000,
  });
}

export function useAdminUpdateProvider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      action,
      ...body
    }: {
      id: string;
      action: "SET_VERIFIED" | "SUSPEND" | "REACTIVATE";
      verified?: boolean;
    }) => api.patch(`/api/admin/providers/${id}`, { action, ...body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "providers"] }),
  });
}

// ---------- Riders ----------
export function useAdminRiders() {
  return useQuery<{ riders: AdminRider[] }>({
    queryKey: ["admin", "riders"],
    queryFn: () => api.get("/api/admin/riders"),
    staleTime: 30_000,
  });
}

export function useAdminUpdateRider() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      action,
    }: {
      id: string;
      action: "APPROVE" | "REJECT" | "VERIFY_DOCS" | "SUSPEND" | "REACTIVATE";
    }) => api.patch(`/api/admin/riders/${id}`, { action }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "riders"] }),
  });
}

// ---------- Products ----------
export function useAdminProducts() {
  return useQuery<{ products: AdminProduct[] }>({
    queryKey: ["admin", "products"],
    queryFn: () => api.get("/api/admin/products"),
    staleTime: 30_000,
  });
}

export function useAdminDeleteProduct() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/admin/products/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "products"] }),
  });
}

// ---------- Orders / Rides / Service Jobs ----------
export function useAdminOrders(status?: string) {
  const qs = status ? `?status=${status}` : "";
  return useQuery({
    queryKey: ["admin", "orders", status || "ALL"],
    queryFn: () => api.get(`/api/admin/orders${qs}`),
    staleTime: 15_000,
  });
}

export function useAdminRides() {
  return useQuery({
    queryKey: ["admin", "rides"],
    queryFn: () => api.get("/api/admin/rides"),
    staleTime: 15_000,
  });
}

export function useAdminServiceJobs(status?: string) {
  const qs = status ? `?status=${status}` : "";
  return useQuery({
    queryKey: ["admin", "service-jobs", status || "ALL"],
    queryFn: () => api.get(`/api/admin/service-jobs${qs}`),
    staleTime: 15_000,
  });
}

// ─── Vendor KYC submissions ──────────────────────────────────────────────

export interface AdminKycVendor {
  id: string;
  businessName: string;
  slug: string;
  category: string;
  location: string;
  verificationTier: string;
  kycStatus: string;
  institutionalEmail: string | null;
  matricOrPfNumber: string | null;
  idCardUrl: string | null;
  idType: string | null;
  residentialAddress: string | null;
  kycPhone: string | null;
  verifiedAt: string | null;
  rejectionReason: string | null;
  reviewedByAdminId: string | null;
  reviewedAt: string | null;
  updatedAt: string;
  owner: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
    avatar: string | null;
    createdAt: string;
  };
  productCount: number;
  orderCount: number;
}

export function useAdminKyc(status: "PENDING" | "REJECTED" | "APPROVED" | "ALL" = "PENDING") {
  return useQuery<{ vendors: AdminKycVendor[] }>({
    queryKey: ["admin", "kyc", status],
    queryFn: () => api.get(`/api/admin/kyc?status=${status}`),
    staleTime: 30_000,
  });
}

export function useAdminReviewKyc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      action,
      reason,
    }: {
      id: string;
      action: "APPROVE" | "REJECT";
      reason?: string;
    }) => api.patch(`/api/admin/kyc/${id}`, { action, reason }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin", "kyc"] });
      // Also invalidate the vendors list since `verified` flag and KYC
      // status will have changed.
      qc.invalidateQueries({ queryKey: ["admin", "vendors"] });
    },
  });
}
