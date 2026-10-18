"use client";

import { useState } from "react";
import { Search, Star, MapPin, ChevronRight, Clock, Shield, Wrench, Loader2 } from "lucide-react";
import { useRush } from "@/lib/store";
import { useProviders } from "@/lib/hooks";
import { SERVICE_CATEGORIES, naira } from "@/lib/data";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { EmptyState } from "@/components/shared/Cards";

export function ServicesScreen() {
  const { navigate } = useRush();
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const { data, isLoading } = useProviders({
    category: selectedCat || undefined,
    q: query || undefined,
  });

  const filtered = data?.providers || [];

  return (
    <div className="pb-6">
      <div className="px-4 pt-3 pb-2">
        <h1 className="text-xl font-extrabold text-ink tracking-tight">Services</h1>
        <p className="text-xs text-ink-soft mt-0.5">
          Hire trusted local professionals
        </p>
      </div>

      {/* Search */}
      <div className="px-4 pb-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-soft" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="What service do you need?"
            className="w-full bg-muted rounded-xl pl-9 pr-3 py-2.5 text-sm placeholder:text-ink-soft focus:outline-none focus:ring-2 focus:ring-rush/30"
          />
        </div>
      </div>

      {/* Categories */}
      <div className="overflow-x-auto no-scrollbar pb-2">
        <div className="flex gap-2 px-4 min-w-max">
          <CatChip label="All" icon="✨" active={selectedCat === null} onClick={() => setSelectedCat(null)} />
          {SERVICE_CATEGORIES.map((c) => (
            <CatChip
              key={c.id}
              label={c.label}
              icon={c.icon}
              active={selectedCat === c.id}
              onClick={() => setSelectedCat(c.id)}
            />
          ))}
        </div>
      </div>

      {/* Recommended providers */}
      <div className="px-4 pt-3">
        <p className="text-xs font-semibold text-ink-soft uppercase tracking-wider mb-2">
          {selectedCat ? `${selectedCat} providers` : "Recommended near you"}
        </p>

        {isLoading ? (
          <div className="pt-12 flex items-center justify-center text-ink-soft">
            <Loader2 className="h-5 w-5 animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Wrench className="h-6 w-6" />}
            title="No providers found"
            description="Try a different category or search."
          />
        ) : (
          <div className="space-y-3">
            {filtered.map((p) => (
              <button
                key={p.id}
                onClick={() => navigate("provider", { providerId: p.slug })}
                className="w-full rounded-2xl bg-card border border-border shadow-card overflow-hidden text-left hover:shadow-md transition-shadow"
              >
                <div className="relative h-20 bg-muted">
                  {p.coverImage && (
                    <img src={p.coverImage} alt={p.businessName} className="w-full h-full object-cover" />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-ink/50 to-transparent" />
                  <div className="absolute bottom-2 left-3 flex items-center gap-1 text-white">
                    <Star className="h-3.5 w-3.5 fill-warning text-warning" />
                    <span className="text-xs font-bold">{p.rating || "New"}</span>
                    {p.reviewCount > 0 && (
                      <span className="text-[11px] opacity-90">({p.reviewCount})</span>
                    )}
                  </div>
                  {p.verified && (
                    <div className="absolute top-2 right-2 flex items-center gap-0.5 bg-white/90 backdrop-blur-sm text-rush text-[10px] font-bold px-2 py-0.5 rounded-md">
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
                      <p className="text-sm font-bold text-ink line-clamp-1">{p.businessName}</p>
                      <p className="text-[11px] text-ink-soft line-clamp-1">{p.tagline}</p>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-ink-soft">
                        <span className="flex items-center gap-0.5">
                          <MapPin className="h-3 w-3" /> {p.location}
                        </span>
                        <span>·</span>
                        <span className="flex items-center gap-0.5">
                          <Clock className="h-3 w-3" /> ~{p.responseTimeMin}m response
                        </span>
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
        )}
      </div>
    </div>
  );
}

function CatChip({
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
