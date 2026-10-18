"use client";

import { api } from "./shared";
import type {
  VendorKycPrivate,
  VerificationTier,
  KycStatus,
  KycIdType,
} from "@/lib/types";

/**
 * Client-side KYC repository.
 *
 * All calls go straight to the network — there is no mock fallback
 * (consistent with the rest of the Rush data layer). The repository
 * shape mirrors the API endpoints under /api/kyc.
 */

export interface SendOtpResponse {
  message: string;
  maskedEmail: string;
  expiresInMs: number;
}

export interface VerifyOtpResponse {
  success: true;
  tier: VerificationTier;
  message: string;
}

export interface ExternalSubmitResponse {
  success: true;
  tier: "COMMUNITY_EXTERNAL";
  kycStatus: KycStatus;
  message: string;
}

export interface KycStatusResponse {
  kyc: VendorKycPrivate | null;
  publicKyc:
    | {
        verificationTier: VerificationTier;
        kycStatus: KycStatus;
        verifiedAt: string | null;
      }
    | null;
}

export const kycRepo = {
  /** POST /api/kyc/institutional/send-otp */
  sendInstitutionalOtp(body: {
    institutionalEmail: string;
    role: "STUDENT";
  }): Promise<SendOtpResponse> {
    return api.post("/api/kyc/institutional/send-otp", body);
  },

  /** POST /api/kyc/institutional/verify-otp */
  verifyInstitutionalOtp(body: {
    institutionalEmail: string;
    otp: string;
    role: "STUDENT";
    matricOrPfNumber?: string;
  }): Promise<VerifyOtpResponse> {
    return api.post("/api/kyc/institutional/verify-otp", body);
  },

  /** POST /api/kyc/external/submit */
  submitExternalKyc(body: {
    idCardUrl: string;
    idType: KycIdType;
    residentialAddress: string;
    phone: string;
    businessName?: string;
    ninNumber?: string;
  }): Promise<ExternalSubmitResponse> {
    return api.post("/api/kyc/external/submit", body);
  },

  /** GET /api/kyc/status */
  getStatus(): Promise<KycStatusResponse> {
    return api.get("/api/kyc/status");
  },
};
