"use client";

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
      <div className="px-4 pt-3 pb-2">
        <h1 className="text-xl font-extrabold text-ink tracking-tight">Explore</h1>
        <p className="text-xs text-ink-soft mt-0.5">
          Browse everything on Rush — products, stores, services
        </p>
      </div>

      <div className="px-4 pb-3">
        <button
          onClick={() => navigate("search")}
          className="w-full flex items-center gap-2.5 bg-muted rounded-xl px-3.5 py-2.5 text-left"
        >
          <Search className="h-4 w-4 text-ink-soft" />
          <span className="text-sm text-ink-soft">Search anything on Rush…</span>
        </button>
      </div>

      {/* Quick links */}
      <div className="px-4 grid grid-cols-3 gap-2.5 mb-5">
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
      <section className="px-4 mb-5">
        <p className="text-xs font-semibold text-ink-soft uppercase tracking-wider mb-2">
          Shop by category
        </p>
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
          {SHOP_CATEGORIES.slice(0, 8).map((c) => (
            <button
              key={c.id}
              onClick={() => navigate("shop")}
              className="flex flex-col items-center gap-1 p-2 rounded-xl bg-muted/40 hover:bg-muted transition-colors"
            >
              <span className="text-xl">{c.icon}</span>
              <span className="text-[10px] font-semibold text-ink text-center leading-tight">
                {c.label}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Categories — services */}
      <section className="px-4 mb-6">
        <p className="text-xs font-semibold text-ink-soft uppercase tracking-wider mb-2">
          Service categories
        </p>
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
          {SERVICE_CATEGORIES.slice(0, 8).map((c) => (
            <button
              key={c.id}
              onClick={() => navigate("services")}
              className="flex flex-col items-center gap-1 p-2 rounded-xl bg-muted/40 hover:bg-muted transition-colors"
            >
              <span className="text-xl">{c.icon}</span>
              <span className="text-[10px] font-semibold text-ink text-center leading-tight">
                {c.label}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* All stores */}
      <section id="stores" className="px-4">
        <p className="text-xs font-semibold text-ink-soft uppercase tracking-wider mb-2">
          All stores on Rush
        </p>
        {isLoading ? (
          <div className="pt-8 flex items-center justify-center text-ink-soft">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : vendors.length === 0 ? (
          <p className="text-sm text-ink-soft text-center py-8">No stores yet.</p>
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
    rush: "rush-gradient text-white shadow-rush",
    ink: "bg-ink text-white",
    "rush-deep": "bg-rush-deep text-white",
  }[tone];

  return (
    <button
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl ${toneCls}`}
    >
      {icon}
      <span className="text-xs font-bold">{label}</span>
    </button>
  );
}
