"use client";

import { useState } from "react";
import { ChevronLeft, Star, MapPin, Phone, MessageCircle, Share2, Shield, Clock, CheckCircle2, ChevronRight, Loader2 } from "lucide-react";
import { useRush } from "@/lib/store";
import { CONTENT_WIDTH } from "@/lib/layout";
import { useProvider, useCreateServiceJob } from "@/lib/hooks";
import { naira } from "@/lib/data";
import { BackHeader } from "./CartScreen";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ServiceRequestSheet } from "@/components/service/ServiceRequestSheet";
import { ApiError } from "@/lib/api-client";

export function ProviderScreen() {
  const { params, back, navigate, pushToast } = useRush();
  const { data, isLoading } = useProvider(params.providerId);
  const [tab, setTab] = useState<"services" | "about" | "portfolio">("services");
  const [requestSheetOpen, setRequestSheetOpen] = useState(false);
  const createJob = useCreateServiceJob();

  if (isLoading) {
    return (
      <div>
        <BackHeader title="Service provider" onBack={back} />
        <div className="pt-16 flex items-center justify-center text-ink-soft">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </div>
    );
  }

  const provider = data?.provider;

  if (!provider) {
    return (
      <div className="pb-6">
        <BackHeader title="Service provider" onBack={back} />
        <p className="p-6 text-center text-sm text-ink-soft">Provider not found.</p>
      </div>
    );
  }

  async function handleRequestListedService(service: { id: string; name: string; description: string }) {
    try {
      const res = await createJob.mutateAsync({
        providerId: provider!.id,
        serviceId: service.id,
        title: service.name,
        description: service.description,
        category: provider!.category,
        location: provider!.location,
      });
      pushToast({ title: "Request sent", description: `${provider!.businessName} will respond shortly` });
      navigate("service-job-tracking", { jobId: res.job.id });
    } catch (err) {
      pushToast({ title: "Couldn't send request", description: err instanceof ApiError ? err.message : undefined });
    }
  }

  return (
    <div className="pb-28">
      {/* Cover */}
      <div className="relative h-36 bg-muted">
        {provider.coverImage && (
          <img src={provider.coverImage} alt={provider.businessName} className="w-full h-full object-cover" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-ink/60 to-transparent" />
        <div className="absolute top-0 left-0 right-0 px-4 pt-3">
          <div className="flex justify-between">
            <button
              onClick={back}
              className="h-9 w-9 rounded-full bg-background/90 backdrop-blur-sm flex items-center justify-center shadow-sm"
              aria-label="Go back"
            >
              <ChevronLeft className="h-5 w-5 text-ink" />
            </button>
            <button
              onClick={() => pushToast({ title: "Profile link copied" })}
              className="h-9 w-9 rounded-full bg-background/90 backdrop-blur-sm flex items-center justify-center shadow-sm"
            >
              <Share2 className="h-4 w-4 text-ink" />
            </button>
          </div>
        </div>
      </div>

      {/* Identity */}
      <div className="px-4 -mt-10 relative">
        <Avatar className="h-20 w-20 rounded-2xl border-4 border-background shadow-card">
          {provider.avatar && <AvatarImage src={provider.avatar} alt={provider.businessName} />}
          <AvatarFallback>{provider.businessName[0]}</AvatarFallback>
        </Avatar>

        <div className="mt-2">
          <div className="flex items-center gap-1.5">
            <h1 className="text-lg font-extrabold text-ink tracking-tight">{provider.businessName}</h1>
            {provider.verified && <Shield className="h-4 w-4 text-rush fill-rush/20" />}
          </div>
          <p className="text-xs text-ink-soft mt-0.5">{provider.tagline}</p>
          <div className="flex flex-wrap items-center gap-2 mt-1.5 text-xs">
            <span className="flex items-center gap-0.5 font-semibold text-ink">
              <Star className="h-3.5 w-3.5 fill-warning text-warning" />
              {provider.rating || "New"}
            </span>
            {provider.reviewCount > 0 && (
              <span className="text-ink-soft">({provider.reviewCount} reviews)</span>
            )}
            <span className="text-ink-soft">·</span>
            <span className="flex items-center gap-0.5 text-ink-soft">
              <MapPin className="h-3 w-3" /> {provider.location}
            </span>
            <span className="text-ink-soft">·</span>
            <span className="flex items-center gap-0.5 text-ink-soft">
              <Clock className="h-3 w-3" /> ~{provider.responseTimeMin}m
            </span>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          <StatBox value={`${provider.completedJobs}`} label="Jobs done" />
          <StatBox value={naira(provider.startingPrice)} label="Starting from" small />
          <StatBox value={`${provider.rating || "—"}★`} label="Rating" />
        </div>

        {/* Contact actions */}
        <div className="grid grid-cols-2 gap-2 mt-3">
          <button
            onClick={() => pushToast({ title: "Calling provider…" })}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-muted text-ink text-xs font-semibold"
          >
            <Phone className="h-3.5 w-3.5" /> Call
          </button>
          <button
            onClick={() => pushToast({ title: "Opening chat…" })}
            className="flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-muted text-ink text-xs font-semibold"
          >
            <MessageCircle className="h-3.5 w-3.5" /> Chat
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="sticky top-0 z-20 mt-4 bg-background/95 backdrop-blur-md border-b border-border">
        <div className={`mx-auto ${CONTENT_WIDTH} px-4 flex gap-5`}>
          {(["services", "about", "portfolio"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`py-3 text-sm font-semibold capitalize relative ${
                tab === t ? "text-rush" : "text-ink-soft"
              }`}
            >
              {t}
              {tab === t && <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-rush rounded-full" />}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div className="px-4 pt-4">
        {tab === "services" && (
          <div className="space-y-2.5">
            {provider.services.map((s) => (
              <div key={s.id} className="rounded-2xl bg-card border border-border shadow-card p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-ink">{s.name}</p>
                    <p className="text-xs text-ink-soft mt-0.5 leading-relaxed">{s.description}</p>
                    <div className="flex items-center gap-2 mt-1.5 text-[11px] text-ink-soft">
                      <Clock className="h-3 w-3" /> {s.duration}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-base font-extrabold text-rush">{naira(s.price)}</p>
                    <button
                      onClick={() => handleRequestListedService(s)}
                      disabled={createJob.isPending}
                      className="mt-2 px-3 py-1.5 rounded-lg rush-gradient text-white text-xs font-bold shadow-rush disabled:opacity-60"
                    >
                      Request
                    </button>
                  </div>
                </div>
              </div>
            ))}

            <button
              onClick={() => setRequestSheetOpen(true)}
              className="w-full mt-2 p-3 rounded-2xl border-2 border-dashed border-border text-xs font-semibold text-ink-soft hover:border-rush hover:text-rush transition-colors"
            >
              + Post a custom job request
            </button>
          </div>
        )}

        {tab === "about" && (
          <div className="space-y-4">
            <div>
              <h3 className="text-sm font-bold text-ink mb-1.5">About</h3>
              <p className="text-sm text-ink-soft leading-relaxed">{provider.description}</p>
            </div>
            <div>
              <h3 className="text-sm font-bold text-ink mb-1.5">Why choose this provider</h3>
              <ul className="space-y-1.5">
                {["Verified by Rush", "Quick response time", "Quality work guaranteed", "Secure payments via escrow"].map((f) => (
                  <li key={f} className="flex items-center gap-2 text-xs text-ink">
                    <CheckCircle2 className="h-3.5 w-3.5 text-success" /> {f}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {tab === "portfolio" && (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {provider.portfolio.length > 0 ? (
              provider.portfolio.map((img, i) => (
                <div key={i} className="aspect-square rounded-xl overflow-hidden bg-muted">
                  <img src={img} alt={`Work ${i + 1}`} className="w-full h-full object-cover" />
                </div>
              ))
            ) : (
              <p className="col-span-2 text-sm text-ink-soft text-center py-8">
                No portfolio items yet.
              </p>
            )}
          </div>
        )}
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border safe-bottom">
        <div className={`mx-auto ${CONTENT_WIDTH} px-4 py-3 flex items-center gap-3`}>
          <div className="flex-1">
            <p className="text-[10px] text-ink-soft">Starting from</p>
            <p className="text-base font-extrabold text-ink">{naira(provider.startingPrice)}</p>
          </div>
          <button
            onClick={() => setRequestSheetOpen(true)}
            className="h-12 px-6 rounded-xl rush-gradient text-white font-bold text-sm shadow-rush"
          >
            Request service
          </button>
        </div>
      </div>

      <ServiceRequestSheet
        open={requestSheetOpen}
        onOpenChange={setRequestSheetOpen}
        providerId={provider.id}
        providerName={provider.businessName}
        category={provider.category}
        defaultLocation={provider.location}
      />
    </div>
  );
}

function StatBox({ value, label, small }: { value: string; label: string; small?: boolean }) {
  return (
    <div className="rounded-xl bg-muted/50 p-2.5 text-center">
      <p className={`font-extrabold text-ink ${small ? "text-xs" : "text-sm"}`}>{value}</p>
      <p className="text-[10px] text-ink-soft mt-0.5">{label}</p>
    </div>
  );
}
