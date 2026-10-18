"use client";

import { GraduationCap, Landmark, ShieldCheck, Clock, type LucideIcon } from "lucide-react";
import { getBadgeInfo, type BadgeInfo } from "@/lib/kyc-hooks";
import type { VendorProfile } from "@/lib/types";

/**
 * VerifiedBadge — displays the vendor's KYC verification status as a
 * colored pill with an icon. Designed to be embedded inline next to a
 * store name on store cards, store screens, product pages, and the
 * vendor's own dashboard.
 *
 * Four variants:
 *   - 🎓 Blue  (STUDENT_LASU)  — "Verified LASU Student"
 *   - 🏛️ Purple (STAFF_LASU)   — "Verified LASU Staff"
 *   - 🛡️ Green (COMMUNITY_EXTERNAL APPROVED) — "ID-Verified Merchant"
 *   - ⏳ Amber (COMMUNITY_EXTERNAL PENDING)  — "Pending ID verification"
 *
 * Returns null when the vendor has no badge (truly unverified, no
 * legacy admin override). Callers should fall back to a muted
 * "Community seller" label or render nothing.
 */

const TONE_STYLES: Record<BadgeInfo["tone"], { bg: string; text: string; ring: string }> = {
  blue: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    ring: "ring-blue-200",
  },
  purple: {
    bg: "bg-purple-50",
    text: "text-purple-700",
    ring: "ring-purple-200",
  },
  green: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    ring: "ring-emerald-200",
  },
  amber: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    ring: "ring-amber-200",
  },
};

const ICONS: Record<BadgeInfo["icon"], LucideIcon> = {
  graduation: GraduationCap,
  landmark: Landmark,
  "shield-check": ShieldCheck,
  clock: Clock,
};

interface VerifiedBadgeProps {
  /** Vendor shape — kyc is optional (legacy vendors may not have it).
   *  `verified` is also optional so callers can pass a partial object
   *  (e.g. when constructing inline from a `kyc` object alone). */
  vendor: {
    kyc?: VendorProfile["kyc"];
    verified?: boolean;
  };
  /** Show the full label instead of just the short tag. Default: false. */
  showLabel?: boolean;
  /** Size variant. "sm" for inline in product cards, "md" for store
   *  headers, "lg" for the vendor's own dashboard banner. */
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function VerifiedBadge({
  vendor,
  showLabel = false,
  size = "md",
  className = "",
}: VerifiedBadgeProps) {
  const info = getBadgeInfo(vendor);
  if (!info) return null;

  const tone = TONE_STYLES[info.tone];
  const Icon = ICONS[info.icon];

  const sizeCls = {
    sm: "text-[10px] px-1.5 py-0.5 gap-0.5",
    md: "text-[11px] px-2 py-1 gap-1",
    lg: "text-xs px-2.5 py-1.5 gap-1.5",
  }[size];

  const iconSize = {
    sm: "h-3 w-3",
    md: "h-3.5 w-3.5",
    lg: "h-4 w-4",
  }[size];

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full ring-1 ${tone.bg} ${tone.text} ${tone.ring} ${sizeCls} ${className}`}
      title={info.description}
    >
      <Icon className={iconSize} />
      <span>{showLabel ? info.label : info.tag}</span>
    </span>
  );
}

/**
 * VerifiedBadgeLarge — a card-style badge used on the vendor dashboard
 * to celebrate their verified status. Includes the description text
 * below the label.
 */
export function VerifiedBadgeLarge({
  vendor,
  className = "",
}: {
  vendor: {
    kyc?: VendorProfile["kyc"];
    verified?: boolean;
  };
  className?: string;
}) {
  const info = getBadgeInfo(vendor);
  if (!info) return null;

  const tone = TONE_STYLES[info.tone];
  const Icon = ICONS[info.icon];

  return (
    <div
      className={`rounded-xl ${tone.bg} ring-1 ${tone.ring} p-3 flex items-start gap-2.5 ${className}`}
    >
      <Icon className={`h-5 w-5 ${tone.text} shrink-0 mt-0.5`} />
      <div className="min-w-0">
        <p className={`text-sm font-bold ${tone.text}`}>{info.label}</p>
        <p className="text-[11px] text-ink-soft mt-0.5 leading-snug">
          {info.description}
        </p>
      </div>
    </div>
  );
}

/**
 * UnverifiedBadge — the muted "Community seller" fallback shown when a
 * vendor has no KYC badge. Used on public store pages and product
 * cards so buyers see SOMETHING (rather than an empty gap) and know
 * this vendor hasn't been verified yet.
 */
export function UnverifiedBadge({
  size = "md",
  className = "",
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const sizeCls = {
    sm: "text-[10px] px-1.5 py-0.5",
    md: "text-[11px] px-2 py-1",
    lg: "text-xs px-2.5 py-1.5",
  }[size];

  return (
    <span
      className={`inline-flex items-center font-medium rounded-full bg-muted text-ink-soft ${sizeCls} ${className}`}
      title="This vendor hasn't completed Rush verification."
    >
      Community seller
    </span>
  );
}
