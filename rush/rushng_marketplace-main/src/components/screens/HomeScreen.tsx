"use client";

import { memo, type ReactNode } from "react";
import { ShoppingBag, Wrench, Car, Bike, ChevronRight, Star } from "lucide-react";
import { useRush } from "@/lib/store";
import { useProducts, useStores, useProviders } from "@/lib/hooks";
import { naira } from "@/lib/data";
import { SectionHeader, ProductCard, VendorCard, EmptyState } from "@/components/shared/Cards";
import { NameAvatar } from "@/components/NameAvatar";
import { DataState } from "@/components/shared/DataState";

export const HomeScreen = memo(function HomeScreen() {
  const user = useRush((s) => s.user);
  const navigate = useRush((s) => s.navigate);
  const productsQ = useProducts();
  const storesQ = useStores();
  const providersQ = useProviders();

  const popularProducts = (productsQ.data?.products || []).slice(0, 6);
  const topVendors = (storesQ.data?.vendors || []).filter((v) => v.visibility === "PUBLIC").slice(0, 4);
  const topProviders = (providersQ.data?.providers || []).slice(0, 2);

  const hasAnyData = !!(productsQ.data || storesQ.data || providersQ.data);
  const allErrored = !!(productsQ.error && storesQ.error && providersQ.error);
  const error = !hasAnyData && allErrored
    ? (productsQ.error || storesQ.error || providersQ.error)
    : null;
  const loading = (productsQ.isLoading || storesQ.isLoading) && !hasAnyData;
  const isEmpty = !loading && !error && popularProducts.length === 0 && topVendors.length === 0 && topProviders.length === 0;

  return (
    <div className="pb-24">
      {/* ─── Greeting header ─────────────────────────────────────── */}
      <div className="px-4 pt-5">
        <div className="flex items-center gap-3">
          {user?.avatar ? (
            <img src={user.avatar} alt={user.name} className="h-11 w-11 rounded-full object-cover ring-2 ring-rush/20" />
          ) : (
            <NameAvatar name={user?.name || "?"} size={44} />
          )}
          <div>
            <p className="text-xs text-ink-soft">Hey{user ? `, ${user.name.split(" ")[0]}` : ""} 👋</p>
            <h1 className="text-xl font-extrabold text-ink tracking-tight">
              What&apos;s the move?
            </h1>
          </div>
        </div>
      </div>

      {/* ─── Quick actions ───────────────────────────────────────── */}
      <div className="px-4 pt-4">
        <div className="grid grid-cols-3 gap-2.5">
          <ActionTile
            icon={<ShoppingBag className="h-4 w-4" />}
            tone="rush"
            label="Shop"
            sub="Buy things"
            onClick={() => navigate("shop")}
          />
          <ActionTile
            icon={<Wrench className="h-4 w-4" />}
            tone="ink"
            label="Services"
            sub="Hire pros"
            onClick={() => navigate("services")}
          />
          <ActionTile
            icon={<Car className="h-4 w-4" />}
            tone="success"
            label="Rides"
            sub="Get around"
            onClick={() => navigate("ride")}
          />
        </div>
      </div>

      {/* ─── Seller promo ────────────────────────────────────────── */}
      <div className="px-4 pt-4">
        <div className="rounded-3xl bg-rush-soft/70 border border-rush/15 p-4 sm:p-5 relative overflow-hidden">
          <div
            aria-hidden="true"
            className="absolute -right-8 -top-10 h-32 w-32 rounded-full bg-rush/10 pointer-events-none"
          />
          <div className="relative">
            <p className="text-[11px] font-bold uppercase tracking-wider text-rush-deep">
              New on Rush
            </p>
            <p className="text-base font-extrabold text-ink mt-1 leading-snug">
              Open your store in 5 minutes
            </p>
            <p className="text-xs text-ink-soft mt-0.5 mb-3 max-w-[16rem]">
              Sell to thousands of buyers across Lagos. Free to start.
            </p>
            <button
              onClick={() => navigate("onboarding-vendor")}
              className="cta-primary rounded-lg px-4 py-2 text-xs cursor-pointer"
            >
              Start selling →
            </button>
          </div>
        </div>
      </div>

      <DataState
        isLoading={loading}
        error={error}
        isEmpty={isEmpty}
        onRetry={() => { void productsQ.refetch(); void storesQ.refetch(); void providersQ.refetch(); }}
        empty={
          <div className="px-4 pt-6">
            <EmptyState
              title="Nothing here yet"
              description="Be the first to add products and stores to Rush."
            />
          </div>
        }
      >
        <>
          {/* Popular near you */}
          {popularProducts.length > 0 && (
            <section className="px-4 pt-7">
              <SectionHeader
                title="Popular near you"
                action="See all"
                onAction={() => navigate("shop")}
              />
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-3 gap-y-4">
                {popularProducts.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </section>
          )}

          {/* Top stores */}
          {topVendors.length > 0 && (
            <section className="px-4 pt-7">
              <SectionHeader
                title="Top stores"
                action="Browse"
                onAction={() => navigate("explore")}
              />
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {topVendors.map((v) => (
                  <VendorCard key={v.id} vendor={v} />
                ))}
              </div>
            </section>
          )}

          {/* Recommended providers */}
          {topProviders.length > 0 && (
            <section className="px-4 pt-7">
              <SectionHeader
                title="Service providers"
                action="See all"
                onAction={() => navigate("services")}
              />
              <div className="space-y-3">
                {topProviders.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => navigate("provider", { providerId: p.slug })}
                    className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-card border border-border shadow-card text-left cursor-pointer hover:shadow-md hover:border-rush/30 transition-all"
                  >
                    {p.avatar ? (
                      <img src={p.avatar} alt={p.businessName} className="h-14 w-14 rounded-xl object-cover" />
                    ) : (
                      <NameAvatar name={p.businessName} size={56} shape="square" />
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-ink line-clamp-1">
                        {p.businessName}
                      </p>
                      <p className="text-[11px] text-ink-soft line-clamp-1">{p.tagline}</p>
                      <div className="flex items-center gap-2 mt-1 text-[11px]">
                        <span className="flex items-center gap-0.5 font-bold text-ink">
                          <Star className="h-3 w-3 fill-warning text-warning" />
                          {p.rating}
                        </span>
                        <span className="text-ink-soft">·</span>
                        <span className="text-ink-soft">From {naira(p.startingPrice)}</span>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-ink-soft shrink-0" />
                  </button>
                ))}
              </div>
            </section>
          )}
        </>
      </DataState>

      {/* ─── Become a rider banner ───────────────────────────────── */}
      <section className="px-4 pt-7">
        <button
          onClick={() => navigate("onboarding-rider")}
          className="w-full flex items-center gap-3 p-4 rounded-3xl bg-ink text-white text-left hover:scale-[1.01] active:scale-[0.99] transition-transform cursor-pointer"
        >
          <div className="h-10 w-10 rounded-full bg-rush-deep text-white flex items-center justify-center shrink-0">
            <Bike className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold">Earn with your bike or car</p>
            <p className="text-xs text-white/70 mt-0.5">
              Become a Rush Rider. Flexible hours, daily payouts.
            </p>
          </div>
          <ChevronRight className="h-4 w-4 text-white/70 shrink-0" />
        </button>
      </section>

      <div className="px-4 pt-6 text-center">
        <p className="text-[11px] text-ink-soft">
          Rush · One account, many possibilities
        </p>
      </div>
    </div>
  );
});

// ─── Quick-action tile — white card w/ brand icon circle ──────────
function ActionTile({
  icon,
  tone,
  label,
  sub,
  onClick,
}: {
  icon: ReactNode;
  tone: "rush" | "ink" | "success";
  label: string;
  sub: string;
  onClick: () => void;
}) {
  const toneCls = {
    rush: "bg-rush-deep text-white",
    ink: "bg-ink text-white",
    success: "bg-success text-white",
  }[tone];

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-start gap-2 p-3 rounded-2xl bg-card border border-border shadow-card text-left cursor-pointer transition-all hover:shadow-md hover:border-rush/30 active:scale-[0.98]"
    >
      <div className={`h-9 w-9 rounded-full flex items-center justify-center ${toneCls}`}>
        {icon}
      </div>
      <div className="leading-tight">
        <p className="text-xs font-extrabold text-ink">{label}</p>
        <p className="text-[10px] text-ink-soft">{sub}</p>
      </div>
    </button>
  );
}
