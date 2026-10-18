"use client";

import { memo } from "react";
import { ShoppingBag, Wrench, Car, ChevronRight, Store, Sparkles, Star, Zap, TrendingUp } from "lucide-react";
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
    <div className="pb-6">
      {/* ─── Gradient greeting header ─────────────────────────────── */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center gap-3 mb-3">
          {user?.avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatar} alt={user.name} className="h-10 w-10 rounded-full object-cover ring-2 ring-rush/20" />
          ) : (
            <NameAvatar name={user?.name || "?"} size={40} />
          )}
          <div>
            <p className="text-xs text-ink-soft">Hey{user ? `, ${user.name.split(" ")[0]}` : ""} 👋</p>
            <h1 className="text-lg font-extrabold text-ink tracking-tight">
              What's the move?
            </h1>
          </div>
        </div>

        {/* 3 primary action tiles — bolder, gradient-backed */}
        <div className="grid grid-cols-3 gap-2">
          <ActionTile
            emoji="🛍️"
            label="Shop"
            sub="Buy things"
            gradient="from-rush to-rush-deep"
            onClick={() => navigate("shop")}
          />
          <ActionTile
            emoji="🔧"
            label="Services"
            sub="Hire pros"
            gradient="from-ink to-ink-soft"
            onClick={() => navigate("services")}
          />
          <ActionTile
            emoji="🚗"
            label="Rides"
            sub="Get around"
            gradient="from-rush-deep to-ink"
            onClick={() => navigate("ride")}
          />
        </div>
      </div>

      {/* Promo banner — flashier */}
      <div className="px-4 pt-3">
        <div className="rush-gradient rounded-2xl p-4 text-white shadow-rush relative overflow-hidden">
          <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-white/10" />
          <div className="absolute -right-2 -bottom-10 h-24 w-24 rounded-full bg-white/10" />
          <div className="relative">
            <div className="flex items-center gap-1.5 mb-1">
              <Sparkles className="h-3.5 w-3.5" />
              <span className="text-[11px] font-bold uppercase tracking-wider opacity-90">
                New on Rush
              </span>
            </div>
            <p className="text-base font-extrabold leading-tight">
              Open your store in 5 minutes ⚡
            </p>
            <p className="text-xs opacity-90 mt-0.5 mb-3 max-w-[15rem]">
              Sell to thousands of buyers across Lagos. Free to start.
            </p>
            <button
              onClick={() => navigate("onboarding-vendor")}
              className="bg-white text-rush-deep text-xs font-bold px-3.5 py-2 rounded-lg shadow-sm hover:shadow-md transition-shadow"
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
            <section className="px-4 pt-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-extrabold text-ink flex items-center gap-1.5">
                  <TrendingUp className="h-4 w-4 text-rush" />
                  Popular near you
                </h2>
                <button
                  onClick={() => navigate("shop")}
                  className="text-xs font-bold text-rush hover:text-rush-deep"
                >
                  See all →
                </button>
              </div>
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
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-extrabold text-ink flex items-center gap-1.5">
                  <Store className="h-4 w-4 text-rush" />
                  Top stores
                </h2>
                <button
                  onClick={() => navigate("explore")}
                  className="text-xs font-bold text-rush hover:text-rush-deep"
                >
                  Browse →
                </button>
              </div>
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
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-extrabold text-ink flex items-center gap-1.5">
                  <Wrench className="h-4 w-4 text-rush" />
                  Service providers
                </h2>
                <button
                  onClick={() => navigate("services")}
                  className="text-xs font-bold text-rush hover:text-rush-deep"
                >
                  See all →
                </button>
              </div>
              <div className="space-y-2.5">
                {topProviders.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => navigate("provider", { providerId: p.slug })}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl bg-card border border-border shadow-card text-left hover:shadow-md hover:border-rush/30 transition-all"
                  >
                    {p.avatar ? (
                      // eslint-disable-next-line @next/next/no-img-element
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

      {/* Become a rider banner */}
      <section className="px-4 pt-7">
        <button
          onClick={() => navigate("onboarding-rider")}
          className="w-full flex items-center gap-3 p-4 rounded-2xl bg-ink text-white text-left hover:scale-[1.01] active:scale-[0.99] transition-transform"
        >
          <div className="h-10 w-10 rounded-xl bg-rush/20 flex items-center justify-center text-2xl">
            🏍️
          </div>
          <div className="flex-1">
            <p className="text-sm font-bold">Earn with your bike or car</p>
            <p className="text-xs opacity-80 mt-0.5">
              Become a Rush Rider. Flexible hours, daily payouts.
            </p>
          </div>
          <ChevronRight className="h-4 w-4 opacity-70" />
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

// ─── Action tile — emoji + gradient, gen-Z vibe ──────────────────────
function ActionTile({
  emoji,
  label,
  sub,
  gradient,
  onClick,
}: {
  emoji: string;
  label: string;
  sub: string;
  gradient: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-start gap-1.5 p-2.5 rounded-2xl bg-gradient-to-br ${gradient} text-white shadow-md hover:scale-[1.03] active:scale-[0.97] transition-transform`}
    >
      <span className="text-xl leading-none">{emoji}</span>
      <div className="leading-tight">
        <p className="text-xs font-extrabold">{label}</p>
        <p className="text-[9px] opacity-80">{sub}</p>
      </div>
    </button>
  );
}
