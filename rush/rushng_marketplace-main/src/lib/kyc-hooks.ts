"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  kycRepo,
  type SendOtpResponse,
  type VerifyOtpResponse,
  type ExternalSubmitResponse,
} from "./data/kyc";
import type { KycIdType, VerificationTier } from "./types";

/**
 * React Query hooks for the vendor KYC flow.
 *
 * All mutations invalidate the `["me"]` query on success — the
 * `useMe()` hook powers the `user.vendorProfile.kyc` field everywhere
 * in the UI, so a single invalidation refreshes the verified badge
 * on every screen.
 */

// ─── Send institutional OTP ────────────────────────────────────────────────
export function useSendInstitutionalOtp() {
  return useMutation({
    mutationFn: (body: {
      institutionalEmail: string;
      role: "STUDENT";
    }): Promise<SendOtpResponse> => kycRepo.sendInstitutionalOtp(body),
  });
}

// ─── Verify institutional OTP ──────────────────────────────────────────────
export function useVerifyInstitutionalOtp() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      institutionalEmail: string;
      otp: string;
      role: "STUDENT";
      matricOrPfNumber?: string;
    }): Promise<VerifyOtpResponse> => kycRepo.verifyInstitutionalOtp(body),
    onSuccess: () => {
      // Verification status changed → refresh the cached user.
      qc.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

// ─── Submit external KYC ───────────────────────────────────────────────────
export function useSubmitExternalKyc() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: {
      idCardUrl: string;
      idType: KycIdType;
      residentialAddress: string;
      phone: string;
      businessName?: string;
      ninNumber?: string;
    }): Promise<ExternalSubmitResponse> => kycRepo.submitExternalKyc(body),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["me"] });
    },
  });
}

// ─── Get current KYC status (rarely needed — useMe already exposes kyc) ───
export function useKycStatus() {
  return useQuery({
    queryKey: ["kyc", "status"],
    queryFn: () => kycRepo.getStatus(),
    staleTime: 30_000,
  });
}

// ─── Helpers for UI components ─────────────────────────────────────────────

/**
 * Derive the badge variant from a vendor's KYC state. Used by the
 * `VerifiedBadge` component and by screens that want a one-line label.
 *
 * Returns `null` if no badge should be shown (truly unverified, no
 * legacy admin override). Otherwise returns an object describing
 * the badge's tone, icon, label, and short tag.
 */
export interface BadgeInfo {
  tier: VerificationTier;
  tone: "blue" | "purple" | "green" | "amber";
  icon: "graduation" | "landmark" | "shield-check" | "clock";
  label: string;
  tag: string;
  /** Short helper text shown in tooltip / expanded view. */
  description: string;
}

export function getBadgeInfo(vendor: {
  kyc?: {
    verificationTier?: VerificationTier;
    kycStatus?: string;
    verifiedAt?: string | null;
  } | null;
  verified?: boolean;
}): BadgeInfo | null {
  const kyc = vendor.kyc;
  const tier = kyc?.verificationTier ?? "UNVERIFIED";
  const status = kyc?.kycStatus ?? "UNSUBMITTED";

  // Pending external submission — show a "pending" amber badge so
  // buyers know verification is in progress (and the vendor gets
  // credit for having started the process).
  if (tier === "COMMUNITY_EXTERNAL" && status === "PENDING") {
    return {
      tier: "COMMUNITY_EXTERNAL",
      tone: "amber",
      icon: "clock",
      label: "Pending ID verification",
      tag: "Verification in review",
      description: "This vendor has submitted a government ID and is awaiting admin review.",
    };
  }

  // Approved tiers
  if (status === "APPROVED" || vendor.verified === true) {
    if (tier === "STUDENT_LASU") {
      return {
        tier: "STUDENT_LASU",
        tone: "blue",
        icon: "graduation",
        label: "Verified LASU Student",
        tag: "LASU Student",
        description: "This vendor verified their LASU student email address.",
      };
    }
    if (tier === "STAFF_LASU") {
      return {
        tier: "STAFF_LASU",
        tone: "purple",
        icon: "landmark",
        label: "Verified LASU Staff",
        tag: "LASU Staff",
        description: "This vendor verified their LASU staff email and PF number.",
      };
    }
    if (tier === "COMMUNITY_EXTERNAL") {
      return {
        tier: "COMMUNITY_EXTERNAL",
        tone: "green",
        icon: "shield-check",
        label: "ID-Verified Merchant",
        tag: "ID Verified",
        description: "This vendor submitted a government-issued ID, reviewed by Rush.",
      };
    }
    // Legacy admin-verified vendor with no tier → treat as community.
    return {
      tier: "COMMUNITY_EXTERNAL",
      tone: "green",
      icon: "shield-check",
      label: "Verified Merchant",
      tag: "Verified",
      description: "This vendor is verified by Rush admin.",
    };
  }

  return null;
}
