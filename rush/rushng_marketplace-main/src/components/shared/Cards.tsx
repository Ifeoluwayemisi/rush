"use client";

import { Star, MapPin, ChevronRight } from "lucide-react";
import type { Product, VendorProfile } from "@/lib/types";
import { naira } from "@/lib/data";
import { useRush } from "@/lib/store";
import { NameAvatar } from "@/components/NameAvatar";

// ---------- Section header ----------
export function SectionHeader({
  title,
  action,
  onAction,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="text-base font-bold text-ink tracking-tight">{title}</h2>
      {action && (
        <button
          onClick={onAction}
          className="text-xs font-semibold text-rush flex items-center gap-0.5 hover:gap-1 transition-all"
        >
          {action}
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

// ---------- Product Card (Jiji-style minimal) ----------
export function ProductCard({ product }: { product: Product }) {
  const { navigate } = useRush();
  // Defensive guards: if `product` is briefly undefined during a
  // re-render (e.g. when AuthHydrator flips the user from null →
  // record and the parent re-renders before TanStack Query re-resolves
  // the cached data), don't crash the whole tree. Return null and
  // let the next render with real data paint.
  if (!product || !product.images || !Array.isArray(product.images)) {
    return null;
  }
  // Defensive: stock may be undefined for legacy rows.
  const stock = typeof product.stock === "number" ? product.stock : 0;
  const primaryImage = product.images[0] || "";
  return (
    <button
      onClick={() => navigate("product", { productId: product.id })}
      className="flex flex-col text-left group"
    >
      <div className="relative aspect-square rounded-xl overflow-hidden bg-muted">
        {primaryImage ? (
          <img
            src={primaryImage}
            alt={product.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-ink-soft text-[10px]">
            No image
          </div>
        )}
        {product.compareAtPrice && product.compareAtPrice > 0 && (
          <span className="absolute top-1.5 left-1.5 bg-rush text-white text-[10px] font-bold px-1.5 py-0.5 rounded-md">
            -{Math.round((1 - product.price / product.compareAtPrice) * 100)}%
          </span>
        )}
        {stock > 0 && stock <= 4 && (
          <span className="absolute bottom-1.5 left-1.5 bg-ink/80 text-white text-[10px] font-semibold px-1.5 py-0.5 rounded-md backdrop-blur-sm">
            Only {stock} left
          </span>
        )}
      </div>
      <div className="mt-2 px-0.5">
        <p className="text-sm font-semibold text-ink line-clamp-1">
          {product.name}
        </p>
        <p className="text-base font-bold text-rush mt-0.5">
          {naira(product.price)}
        </p>
        <div className="flex items-center gap-1.5 mt-1 text-[11px] text-ink-soft">
          <span className="flex items-center gap-0.5">
            <Star className="h-3 w-3 fill-warning text-warning" />
            {product.rating}
          </span>
          <span>·</span>
          <span className="flex items-center gap-0.5 truncate">
            <MapPin className="h-3 w-3 shrink-0" />
            <span className="truncate">{product.location}</span>
          </span>
        </div>
        <p className="text-[11px] text-ink-soft mt-0.5 truncate">
          by {product.vendorName}
        </p>
      </div>
    </button>
  );
}

// ---------- Vendor store card ----------
export function VendorCard({ vendor }: { vendor: VendorProfile }) {
  const { navigate } = useRush();
  // Same defensive guard as ProductCard — don't crash on brief
  // undefined during re-renders.
  if (!vendor || !vendor.businessName) return null;
  return (
    <button
      onClick={() => navigate("store", { storeSlug: vendor.slug })}
      className="flex flex-col text-left rounded-2xl overflow-hidden bg-card border border-border shadow-card group"
    >
      <div className="relative h-24 bg-muted">
        {vendor.coverImage ? (
          <img
            src={vendor.coverImage}
            alt={vendor.businessName}
            loading="lazy"
            className="w-full h-full object-cover"
          />
        ) : (
          // Gradient fallback so the card header isn't a blank grey
          // box when a vendor hasn't uploaded a cover image yet.
          <div className="w-full h-full rush-gradient-soft" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink/40 to-transparent" />
      </div>
      <div className="p-3 -mt-7 relative">
        <div className="h-12 w-12 rounded-xl overflow-hidden border-2 border-background bg-muted">
          {vendor.logo ? (
            <img src={vendor.logo} alt={vendor.businessName} className="w-full h-full object-cover" />
          ) : (
            // No logo uploaded — fall back to a vibrant gradient
            // initials avatar so the storefront card still looks
            // branded instead of empty.
            <NameAvatar name={vendor.businessName} size={48} shape="square" />
          )}
        </div>
        <p className="text-sm font-bold text-ink mt-2 line-clamp-1">
          {vendor.businessName}
        </p>
        <p className="text-[11px] text-ink-soft mt-0.5">{vendor.category} · {vendor.location}</p>
        <div className="flex items-center gap-1 mt-1.5 text-[11px]">
          <Star className="h-3 w-3 fill-warning text-warning" />
          <span className="font-semibold text-ink">{vendor.rating}</span>
          <span className="text-ink-soft">({vendor.reviewCount})</span>
        </div>
      </div>
    </button>
  );
}

// ---------- Compact Stat Pill ----------
export function StatPill({
  icon,
  label,
  value,
  tone = "default",
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  tone?: "default" | "rush" | "success" | "warning";
}) {
  const toneCls = {
    default: "bg-muted text-ink",
    rush: "bg-rush-soft text-rush-deep",
    success: "bg-success/10 text-success",
    warning: "bg-warning/15 text-warning",
  }[tone];

  return (
    <div className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 ${toneCls}`}>
      {icon}
      <div className="leading-tight">
        <p className="text-[10px] font-medium opacity-80">{label}</p>
        <p className="text-xs font-bold">{value}</p>
      </div>
    </div>
  );
}

// ---------- Empty state ----------
export function EmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-6">
      {icon && (
        <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4 text-ink-soft">
          {icon}
        </div>
      )}
      <p className="text-base font-bold text-ink">{title}</p>
      {description && (
        <p className="text-sm text-ink-soft mt-1 max-w-xs">{description}</p>
      )}
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="mt-4 px-5 py-2.5 rounded-xl rush-gradient text-white font-semibold text-sm shadow-rush"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
