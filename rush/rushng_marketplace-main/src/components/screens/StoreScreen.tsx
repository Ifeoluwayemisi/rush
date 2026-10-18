"use client";

import { useState } from "react";
import { ChevronLeft, Star, MapPin, Phone, MessageCircle, Share2, Shield, ShoppingBag, Instagram, Heart, Truck, Loader2 } from "lucide-react";
import { useRush } from "@/lib/store";
import { CONTENT_WIDTH } from "@/lib/layout";
import { useStore, useFollow, useToggleFollow } from "@/lib/hooks";
import { naira } from "@/lib/data";
import { BackHeader } from "./CartScreen";
import { ProductCard, EmptyState } from "@/components/shared/Cards";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { VerifiedBadge, UnverifiedBadge } from "@/components/vendor/VerifiedBadge";

export function StoreScreen() {
  const { params, navigate, back, pushToast } = useRush();
  const { data, isLoading } = useStore(params.storeSlug);
  const [tab, setTab] = useState<"products" | "about" | "reviews">("products");

  if (isLoading) {
    return (
      <div>
        <BackHeader title="Store" onBack={back} />
        <div className="pt-16 flex items-center justify-center text-ink-soft">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </div>
    );
  }

  const vendor = data?.vendor;
  const products = data?.products || [];

  if (!vendor) {
    return (
      <div className="pb-6">
        <BackHeader title="Store" onBack={back} />
        <p className="p-6 text-center text-sm text-ink-soft">Store not found.</p>
      </div>
    );
  }

  return (
    <div className="pb-6">
      {/* Cover */}
      <div className="relative h-40 bg-muted">
        {vendor.coverImage && (
          <img
            src={vendor.coverImage}
            alt={vendor.businessName}
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink/60 to-transparent" />

        <div className="absolute top-0 left-0 right-0 px-4 pt-3 flex items-center justify-between">
          <button
            onClick={back}
            className="h-9 w-9 rounded-full bg-background/90 backdrop-blur-sm flex items-center justify-center shadow-sm"
            aria-label="Go back"
          >
            <ChevronLeft className="h-5 w-5 text-ink" />
          </button>
          <div className="flex gap-1.5">
            <button
              onClick={() => pushToast({ title: "Saved store" })}
              className="h-9 w-9 rounded-full bg-background/90 backdrop-blur-sm flex items-center justify-center shadow-sm"
            >
              <Heart className="h-4 w-4 text-ink" />
            </button>
            <button
              onClick={() => pushToast({ title: "Store link copied" })}
              className="h-9 w-9 rounded-full bg-background/90 backdrop-blur-sm flex items-center justify-center shadow-sm"
            >
              <Share2 className="h-4 w-4 text-ink" />
            </button>
          </div>
        </div>

        {vendor.visibility !== "PUBLIC" && (
          <span className="absolute top-14 left-1/2 -translate-x-1/2 bg-ink/80 text-white text-[10px] font-semibold px-2 py-1 rounded-md backdrop-blur-sm">
            {vendor.visibility === "LINK_ONLY" ? "Link only · not in marketplace" : "Private store"}
          </span>
        )}
      </div>

      {/* Vendor identity */}
      <div className="px-4 -mt-8 relative">
        <Avatar className="h-16 w-16 rounded-2xl border-4 border-background shadow-card">
          {vendor.logo && <AvatarImage src={vendor.logo} alt={vendor.businessName} />}
          <AvatarFallback>{vendor.businessName[0]}</AvatarFallback>
        </Avatar>

        <div className="mt-2">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h1 className="text-lg font-extrabold text-ink tracking-tight">
              {vendor.businessName}
            </h1>
            {vendor.verified && (
              <Shield className="h-4 w-4 text-rush fill-rush/20" />
            )}
            {/* KYC badge — replaces the plain shield when tier info is
                available. Falls through to UnverifiedBadge so buyers
                see "Community seller" on stores that haven't completed
                KYC. */}
            {vendor.kyc ? (
              <VerifiedBadge vendor={vendor} size="sm" />
            ) : (
              vendor.verified ? null : <UnverifiedBadge size="sm" />
            )}
          </div>
          <p className="text-xs text-ink-soft mt-0.5">
            {vendor.category} · {vendor.location}
          </p>
          <div className="flex items-center gap-2 mt-1.5 text-xs">
            <span className="flex items-center gap-0.5 font-semibold text-ink">
              <Star className="h-3.5 w-3.5 fill-warning text-warning" />
              {vendor.rating || "New"}
            </span>
            <span className="text-ink-soft">({vendor.reviewCount} reviews)</span>
            <span className="text-ink-soft">·</span>
            <span className="text-ink-soft">{vendor.followers} followers</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          <button
            onClick={() => pushToast({ title: "Calling store…" })}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-muted text-ink text-xs font-semibold"
          >
            <Phone className="h-3.5 w-3.5" /> Call
          </button>
          <button
            onClick={() => pushToast({ title: "Opening WhatsApp…" })}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-muted text-ink text-xs font-semibold"
          >
            <MessageCircle className="h-3.5 w-3.5" /> Chat
          </button>
          <FollowButton targetType="vendor" targetId={vendor.id} />
        </div>

        {/* Delivery info */}
        {vendor.deliveryEnabled && (
          <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-rush-soft/40 text-rush-deep text-xs font-medium">
            <Truck className="h-3.5 w-3.5" />
            Delivery available · ~{vendor.deliveryTimeMin} min · {naira(vendor.deliveryFee)}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="sticky top-0 z-20 mt-4 bg-background/95 backdrop-blur-md border-b border-border">
        <div className={`mx-auto ${CONTENT_WIDTH} px-4 flex gap-5`}>
          {(["products", "about", "reviews"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`py-3 text-sm font-semibold capitalize relative ${
                tab === t ? "text-rush" : "text-ink-soft"
              }`}
            >
              {t}
              {tab === t && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-rush rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="px-4 pt-4">
        {tab === "products" && (
          products.length === 0 ? (
            <EmptyState
              icon={<ShoppingBag className="h-6 w-6" />}
              title="No products yet"
              description="This store hasn't listed any products."
            />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-3 gap-y-4">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )
        )}

        {tab === "about" && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-ink mb-1.5">About this store</h3>
              <p className="text-sm text-ink-soft leading-relaxed">{vendor.description}</p>
            </div>
            <div>
              <h3 className="text-sm font-bold text-ink mb-1.5">Contact</h3>
              <div className="rounded-xl bg-muted/40 p-3 space-y-2 text-xs">
                <div className="flex items-center gap-2">
                  <Phone className="h-3.5 w-3.5 text-rush" /> {vendor.phone}
                </div>
                {vendor.whatsapp && (
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-3.5 w-3.5 text-success" /> {vendor.whatsapp}
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 text-rush" /> {vendor.location}
                </div>
              </div>
            </div>
            {(vendor.instagram || vendor.tiktok || vendor.facebook) && (
              <div>
                <h3 className="text-sm font-bold text-ink mb-1.5">Follow</h3>
                <div className="flex gap-2">
                  {vendor.instagram && (
                    <SocialChip icon={<Instagram className="h-3.5 w-3.5" />} label={vendor.instagram} />
                  )}
                  {vendor.tiktok && <SocialChip icon={<span className="text-xs font-bold">TT</span>} label={vendor.tiktok} />}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "reviews" && (
          <div className="space-y-3">
            <div className="rounded-2xl bg-rush-soft/40 p-4 text-center">
              <p className="text-3xl font-extrabold text-rush">{vendor.rating || "—"}</p>
              <div className="flex justify-center gap-0.5 mt-1">
                {[1, 2, 3, 4, 5].map((s) => (
                  <Star
                    key={s}
                    className={`h-3.5 w-3.5 ${
                      s <= Math.round(vendor.rating) ? "fill-warning text-warning" : "text-muted-foreground/40"
                    }`}
                  />
                ))}
              </div>
              <p className="text-[11px] text-ink-soft mt-1">{vendor.reviewCount} reviews</p>
            </div>

            {vendor.reviewCount === 0 && (
              <div className="text-center py-8 text-sm text-ink-soft">
                No reviews yet. Be the first to review this store.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SocialChip({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-muted text-xs font-medium text-ink">
      {icon}
      {label}
    </div>
  );
}

/**
 * FollowButton — reusable follow/unfollow button for vendors + providers.
 * Uses the useFollow hook to read current state and useToggleFollow to
 * mutate. Shows a loading spinner while the query is loading.
 */
function FollowButton({
  targetType,
  targetId,
}: {
  targetType: "vendor" | "provider";
  targetId: string;
}) {
  const { data, isLoading } = useFollow(targetType, targetId);
  const toggleMut = useToggleFollow();
  const following = data?.following ?? false;
  const { pushToast } = useRush();

  return (
    <button
      onClick={async () => {
        try {
          await toggleMut.mutateAsync({
            targetType,
            targetId,
            follow: !following,
          });
          pushToast({
            title: following ? "Unfollowed" : "Following",
          });
        } catch (err: any) {
          pushToast({ title: "Failed to toggle follow", description: err.message });
        }
      }}
      disabled={isLoading || toggleMut.isPending}
      className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold disabled:opacity-50 ${
        following
          ? "bg-muted text-ink"
          : "rush-gradient text-white shadow-rush"
      }`}
    >
      {isLoading ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Heart className={`h-3.5 w-3.5 ${following ? "fill-ink" : ""}`} />
      )}
      {following ? "Following" : "Follow"}
    </button>
  );
}
