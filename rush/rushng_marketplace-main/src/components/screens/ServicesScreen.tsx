"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";
import {
  Search,
  Star,
  MapPin,
  ChevronRight,
  Clock,
  Shield,
  LayoutGrid,
  SprayCan,
  Zap,
  Wrench,
  Hammer,
  ShoppingBasket,
  Package,
  Scissors,
  GraduationCap,
  Truck,
} from "lucide-react";
import { useRush } from "@/lib/store";
import { useProviders } from "@/lib/hooks";
import { SERVICE_CATEGORIES, naira } from "@/lib/data";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmptyState } from "@/components/shared/Cards";
import { DataState } from "@/components/shared/DataState";

const CATEGORY_ICONS: Record<string, LucideIcon> = {
  Cleaning: SprayCan,
  Electrical: Zap,
  Plumbing: Wrench,
  Repairs: Hammer,
  Errands: ShoppingBasket,
  Moving: Package,
  Beauty: Scissors,
  Tutoring: GraduationCap,
  Deliveries: Truck,
};

export function ServicesScreen() {
  const { navigate } = useRush();
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const { data, isLoading, error, refetch } = useProviders({
    category: selectedCat || undefined,
    q: query || undefined,
  });

  const filtered = data?.providers || [];
  const selectedLabel = selectedCat
    ? SERVICE_CATEGORIES.find((c) => c.id === selectedCat)?.label || selectedCat
    : null;

  return (
    <div className="pb-6">
      <div className="px-4 pt-3 pb-2">
        <h1 className="text-xl font-extrabold text-ink tracking-tight">Services</h1>
        <p className="text-xs text-ink-soft mt-0.5">
          Hire trusted local professionals
        </p>
      </div>

      {/* Search */}
      <div className="px-4 pb-3" role="search">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-soft" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="What service do you need?"
            aria-label="Search services"
            className="w-full bg-muted rounded-xl pl-9 pr-3 py-2.5 text-sm placeholder:text-ink-soft focus:outline-none focus:ring-2 focus:ring-rush/30"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="overflow-x-auto no-scrollbar pb-2">
        <div className="flex gap-2 px-4 min-w-max">
          <CatChip
            label="All"
            Icon={LayoutGrid}
            active={selectedCat === null}
            onClick={() => setSelectedCat(null)}
          />
          {SERVICE_CATEGORIES.map((c) => (
            <CatChip
              key={c.id}
              label={c.label}
              Icon={CATEGORY_ICONS[c.id] || LayoutGrid}
              active={selectedCat === c.id}
              onClick={() => setSelectedCat(c.id)}
            />
          ))}
        </div>
      </div>

      {/* Recommended providers */}
      <div className="px-4 pt-3">
        <p className="text-xs font-semibold text-ink-soft uppercase tracking-wider mb-2">
          {selectedLabel ? `${selectedLabel} providers` : "Recommended near you"}
        </p>

        <DataState
          isLoading={isLoading}
          error={error}
          isEmpty={filtered.length === 0}
          onRetry={() => void refetch()}
          empty={
            <EmptyState
              icon={<Wrench className="h-6 w-6" />}
              title="No providers found"
              description="Try a different category or search."
            />
          }
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => navigate("provider", { providerId: p.slug })}
                className="w-full rounded-2xl bg-card border border-border shadow-card overflow-hidden text-left hover:shadow-md transition-shadow cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <div className="relative h-20 bg-muted">
                  {p.coverImage && (
                    <img src={p.coverImage} alt={p.businessName} className="w-full h-full object-cover" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/40 to-transparent" />
                  {p.verified && (
                    <div className="absolute top-2 right-2 flex items-center gap-0.5 bg-background/95 text-rush-deep text-[10px] font-bold px-2 py-0.5 rounded-md">
                      <Shield className="h-3 w-3" /> Verified
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <div className="flex items-start gap-2.5">
                    <Avatar className="h-10 w-10 rounded-lg">
                      {p.avatar && <AvatarImage src={p.avatar} alt={p.businessName} />}
                      <AvatarFallback>{p.businessName[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-bold text-ink line-clamp-1">{p.businessName}</p>
                        {typeof p.rating === "number" && p.rating > 0 ? (
                          <span className="flex items-center gap-0.5 text-[11px] font-semibold text-ink shrink-0">
                            <Star className="h-3 w-3 fill-warning text-warning" />
                            {p.rating}
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold text-ink-soft shrink-0">New</span>
                        )}
                      </div>
                      <p className="text-[11px] text-ink-soft line-clamp-1">{p.tagline}</p>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-ink-soft">
                        <span className="flex items-center gap-0.5">
                          <MapPin className="h-3 w-3" /> {p.location}
                        </span>
                        {typeof p.responseTimeMin === "number" && p.responseTimeMin > 0 && (
                          <>
                            <span>·</span>
                            <span className="flex items-center gap-0.5">
                              <Clock className="h-3 w-3" /> ~{p.responseTimeMin}m response
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-ink-soft shrink-0 mt-1" />
                  </div>
                  <div className="mt-2 pt-2 border-t border-border flex items-center justify-between">
                    <span className="text-[11px] text-ink-soft">
                      {p.completedJobs} jobs completed
                    </span>
                    <span className="text-xs">
                      <span className="text-ink-soft">From </span>
                      <span className="font-bold text-rush">{naira(p.startingPrice)}</span>
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </DataState>
      </div>
    </div>
  );
}

function CatChip({
  label,
  Icon,
  active,
  onClick,
}: {
  label: string;
  Icon: LucideIcon;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
        active
          ? "bg-rush-deep text-white shadow-rush"
          : "bg-muted text-ink-soft hover:bg-muted/70"
      }`}
    >
      <Icon className="h-3.5 w-3.5" />
      {label}
    </button>
  );
}
