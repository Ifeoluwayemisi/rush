"use client";

import type * as React from "react";
import { Search, Store, Wrench, ShoppingBag, Loader2 } from "lucide-react";
import { useRush } from "@/lib/store";
import { useStores } from "@/lib/hooks";
import { SHOP_CATEGORIES, SERVICE_CATEGORIES } from "@/lib/data";
import { VendorCard } from "@/components/shared/Cards";

export function ExploreScreen() {
  const { navigate } = useRush();
  const { data, isLoading } = useStores();
  const vendors = data?.vendors || [];

  return (
    <div className="pb-6">
      <div className="px-4 pt-5 pb-1">
        <h1 className="text-xl font-extrabold text-ink tracking-tight">Explore</h1>
        <p className="text-xs text-ink-soft mt-0.5">
          Browse everything on Rush — products, stores, services
        </p>
      </div>

      <div className="px-4 pt-3 pb-4">
        <button
          onClick={() => navigate("search")}
          className="w-full flex items-center gap-2.5 bg-muted rounded-xl px-3.5 py-2.5 text-left cursor-pointer hover:bg-muted/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rush/30"
        >
          <Search className="h-4 w-4 text-ink-soft" />
          <span className="text-sm text-ink-soft">Search anything on Rush…</span>
        </button>
      </div>

      {/* Quick links */}
      <div className="px-4 grid grid-cols-3 gap-2.5 mb-6">
        <QuickLink
          icon={<ShoppingBag className="h-5 w-5" />}
          label="Shop"
          tone="rush"
          onClick={() => navigate("shop")}
        />
        <QuickLink
          icon={<Wrench className="h-5 w-5" />}
          label="Services"
          tone="ink"
          onClick={() => navigate("services")}
        />
        <QuickLink
          icon={<Store className="h-5 w-5" />}
          label="Stores"
          tone="rush-deep"
          onClick={() => document.getElementById("stores")?.scrollIntoView({ behavior: "smooth" })}
        />
      </div>

      {/* Categories — products */}
      <section className="px-4 mb-6">
        <p className="text-xs font-extrabold text-ink uppercase tracking-wider mb-2.5">
          Shop by category
        </p>
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
          {SHOP_CATEGORIES.slice(0, 8).map((c) => (
            <button
              key={c.id}
              onClick={() => navigate("shop")}
              className="flex flex-col items-center gap-1.5 p-2.5 rounded-2xl bg-card border border-border shadow-card hover:border-rush/30 hover:shadow-md transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rush/30"
            >
              <span className="text-2xl">{c.icon}</span>
              <span className="text-[10px] font-bold text-ink text-center leading-tight">
                {c.label}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Categories — services */}
      <section className="px-4 mb-7">
        <p className="text-xs font-extrabold text-ink uppercase tracking-wider mb-2.5">
          Service categories
        </p>
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
          {SERVICE_CATEGORIES.slice(0, 8).map((c) => (
            <button
              key={c.id}
              onClick={() => navigate("services")}
              className="flex flex-col items-center gap-1.5 p-2.5 rounded-2xl bg-card border border-border shadow-card hover:border-rush/30 hover:shadow-md transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rush/30"
            >
              <span className="text-2xl">{c.icon}</span>
              <span className="text-[10px] font-bold text-ink text-center leading-tight">
                {c.label}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* All stores */}
      <section id="stores" className="px-4">
        <p className="text-xs font-extrabold text-ink uppercase tracking-wider mb-2.5">
          All stores on Rush
        </p>
        {isLoading ? (
          <div className="pt-8 flex items-center justify-center text-ink-soft">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : vendors.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-sm font-semibold text-ink">No stores yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {vendors.map((v) => (
              <VendorCard key={v.id} vendor={v} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function QuickLink({
  icon,
  label,
  tone,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  tone: "rush" | "ink" | "rush-deep";
  onClick: () => void;
}) {
  const toneCls = {
    rush: "bg-rush-deep text-white",
    ink: "bg-ink text-white",
    "rush-deep": "bg-rush-soft text-rush-deep",
  }[tone];

  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-card border border-border shadow-card hover:shadow-md hover:border-rush/30 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rush/30"
    >
      <span className={`h-10 w-10 rounded-full flex items-center justify-center ${toneCls}`}>
        {icon}
      </span>
      <span className="text-xs font-extrabold text-ink">{label}</span>
    </button>
  );
}
