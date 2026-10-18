"use client";

import { useState } from "react";
import { Search, SlidersHorizontal, X, PackageOpen } from "lucide-react";
import { useProducts } from "@/lib/hooks";
import { SHOP_CATEGORIES } from "@/lib/data";
import { ProductCard, EmptyState } from "@/components/shared/Cards";
import { DataState } from "@/components/shared/DataState";

export function ShopScreen() {
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const productsQ = useProducts({
    category: selectedCat || undefined,
    q: query || undefined,
  });

  const filtered = productsQ.data?.products || [];

  return (
    <div className="pb-6">
      <div className="px-4 pt-3 pb-2">
        <h1 className="text-xl font-extrabold text-ink tracking-tight">Shop</h1>
        <p className="text-xs text-ink-soft mt-0.5">
          {filtered.length} {filtered.length === 1 ? "item" : "items"} from{" "}
          {new Set(filtered.map((p) => p.vendorId)).size} stores near you
        </p>
      </div>

      {/* Search */}
      <div className="px-4 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-soft" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search products…"
            className="w-full bg-muted rounded-xl pl-9 pr-9 py-2.5 text-sm placeholder:text-ink-soft focus:outline-none focus:ring-2 focus:ring-rush/30"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-muted-foreground/15 flex items-center justify-center"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Categories */}
      <div className="overflow-x-auto no-scrollbar pb-2">
        <div className="flex gap-2 px-4 min-w-max">
          <CategoryChip
            label="All"
            icon="🛍️"
            active={selectedCat === null}
            onClick={() => setSelectedCat(null)}
          />
          {SHOP_CATEGORIES.map((c) => (
            <CategoryChip
              key={c.id}
              label={c.label}
              icon={c.icon}
              active={selectedCat === c.id}
              onClick={() => setSelectedCat(c.id)}
            />
          ))}
        </div>
      </div>

      {/* Sort / filter bar */}
      <div className="flex items-center justify-between px-4 py-3">
        <p className="text-xs text-ink-soft">
          {filtered.length} {filtered.length === 1 ? "item" : "items"}
        </p>
        <button className="flex items-center gap-1.5 text-xs font-semibold text-ink-soft hover:text-ink">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Sort & filter
        </button>
      </div>

      {/* Product grid */}
      <DataState
        isLoading={productsQ.isLoading}
        error={productsQ.error}
        isEmpty={filtered.length === 0}
        onRetry={() => void productsQ.refetch()}
        empty={
          <EmptyState
            icon={<PackageOpen className="h-6 w-6" />}
            title="No products found"
            description={query || selectedCat
              ? "Try a different search or category."
              : "No products have been listed yet."}
          />
        }
      >
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-x-3 gap-y-4 px-4">
          {filtered.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      </DataState>
    </div>
  );
}

function CategoryChip({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
        active
          ? "bg-rush text-white shadow-rush"
          : "bg-muted text-ink-soft hover:bg-muted/70"
      }`}
    >
      <span className="text-sm">{icon}</span>
      {label}
    </button>
  );
}
