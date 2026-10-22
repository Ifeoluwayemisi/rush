"use client";

import { useState } from "react";
import { Search, X, TrendingUp, Clock, Loader2, ArrowLeft } from "lucide-react";
import { useRush } from "@/lib/store";
import { CONTENT_WIDTH } from "@/lib/layout";
import { useProducts, useStores, useProviders } from "@/lib/hooks";
import { ProductCard, VendorCard } from "@/components/shared/Cards";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const TRENDING = ["iPhone 13", "Jollof rice", "Nike sneakers", "Electrician", "Bike ride"];
const RECENT = ["Wireless headphones", "Laundry service", "Power bank"];

export function SearchScreen() {
  const { navigate, back, searchQuery, setSearchQuery } = useRush();
  const [query, setQuery] = useState(searchQuery);

  const productsQ = useProducts({ q: query || undefined });
  const storesQ = useStores();
  const providersQ = useProviders({ q: query || undefined });

  const productMatches = (productsQ.data?.products || []).slice(0, 4);
  const vendorMatches = (storesQ.data?.vendors || []).filter((v) =>
    query.length > 1 ? v.businessName.toLowerCase().includes(query.toLowerCase()) : false,
  ).slice(0, 2);
  const providerMatches = (providersQ.data?.providers || []).slice(0, 2);

  return (
    <div className="pb-10 min-h-screen">
      {/* Search bar */}
      <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border">
        <div className={`mx-auto ${CONTENT_WIDTH} px-4 py-3 flex items-center gap-2`}>
          <button
            onClick={back}
            aria-label="Back"
            className="h-9 w-9 rounded-full hover:bg-muted flex items-center justify-center cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rush/30"
          >
            <ArrowLeft className="h-5 w-5 text-ink" />
          </button>
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-soft" />
            <input
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setSearchQuery(e.target.value);
              }}
              placeholder="Search products, stores, services…"
              aria-label="Search products, stores, services"
              className="w-full bg-muted rounded-xl pl-9 pr-9 py-2.5 text-sm text-ink placeholder:text-ink-soft focus:outline-none focus:ring-2 focus:ring-rush/30"
            />
            {query && (
              <button
                onClick={() => {
                  setQuery("");
                  setSearchQuery("");
                }}
                aria-label="Clear search"
                className="absolute right-2.5 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-ink/10 hover:bg-ink/20 flex items-center justify-center cursor-pointer"
              >
                <X className="h-3 w-3 text-ink-soft" />
              </button>
            )}
          </div>
        </div>
      </div>

      {!query && (
        <div className="px-4 pt-5 space-y-6">
          <section>
            <p className="text-xs font-extrabold text-ink uppercase tracking-wider mb-2.5 flex items-center gap-1.5">
              <TrendingUp className="h-3.5 w-3.5 text-rush" /> Trending searches
            </p>
            <div className="flex flex-wrap gap-2">
              {TRENDING.map((t) => (
                <button
                  key={t}
                  onClick={() => setQuery(t)}
                  className="px-3.5 py-2 rounded-full bg-card border border-border text-xs font-semibold text-ink hover:bg-rush-soft hover:text-rush-deep hover:border-rush/20 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rush/30"
                >
                  {t}
                </button>
              ))}
            </div>
          </section>

          <section>
            <p className="text-xs font-extrabold text-ink uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5 text-ink-soft" /> Recent searches
            </p>
            <div className="space-y-0.5">
              {RECENT.map((r) => (
                <button
                  key={r}
                  onClick={() => setQuery(r)}
                  className="w-full flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-muted text-left cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rush/30"
                >
                  <Clock className="h-3.5 w-3.5 text-ink-soft shrink-0" />
                  <span className="text-sm text-ink">{r}</span>
                </button>
              ))}
            </div>
          </section>
        </div>
      )}

      {query && (
        <div className="px-4 pt-4 space-y-6">
          {/* Quick action chips */}
          <div className="flex gap-2">
            <button
              onClick={() => navigate("shop")}
              className="px-3.5 py-1.5 rounded-full bg-rush-deep text-white text-xs font-bold shadow-card cursor-pointer hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rush/30"
            >
              Shop &quot;{query}&quot;
            </button>
            <button
              onClick={() => navigate("services")}
              className="px-3.5 py-1.5 rounded-full bg-card border border-border text-ink text-xs font-bold cursor-pointer hover:border-rush/30 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rush/30"
            >
              Services
            </button>
          </div>

          {productsQ.isLoading && (
            <div className="pt-8 flex items-center justify-center text-ink-soft">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          )}

          {productMatches.length > 0 && (
            <section>
              <p className="text-xs font-extrabold text-ink uppercase tracking-wider mb-2.5">
                Products ({productMatches.length})
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-x-3 gap-y-4">
                {productMatches.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </section>
          )}

          {vendorMatches.length > 0 && (
            <section>
              <p className="text-xs font-extrabold text-ink uppercase tracking-wider mb-2.5">
                Stores ({vendorMatches.length})
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {vendorMatches.map((v) => (
                  <VendorCard key={v.id} vendor={v} />
                ))}
              </div>
            </section>
          )}

          {providerMatches.length > 0 && (
            <section>
              <p className="text-xs font-extrabold text-ink uppercase tracking-wider mb-2.5">
                Service providers ({providerMatches.length})
              </p>
              <div className="space-y-2.5">
                {providerMatches.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => navigate("provider", { providerId: p.slug })}
                    className="w-full flex items-center gap-3 p-3.5 rounded-2xl bg-card border border-border shadow-card text-left cursor-pointer hover:shadow-md hover:border-rush/30 transition-all"
                  >
                    <Avatar className="h-12 w-12 rounded-xl">
                      {p.avatar && <AvatarImage src={p.avatar} alt={p.businessName} />}
                      <AvatarFallback>{p.businessName[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-bold text-ink">{p.businessName}</p>
                      <p className="text-[11px] text-ink-soft line-clamp-1">{p.tagline}</p>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          {!productsQ.isLoading && productMatches.length === 0 && vendorMatches.length === 0 && providerMatches.length === 0 && (
            <div className="text-center py-14">
              <div className="h-16 w-16 rounded-full bg-rush-soft text-rush-deep flex items-center justify-center mx-auto mb-4">
                <Search className="h-6 w-6" />
              </div>
              <p className="text-base font-extrabold text-ink">No results for &quot;{query}&quot;</p>
              <p className="text-sm text-ink-soft mt-1">Try a different keyword or browse categories.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
