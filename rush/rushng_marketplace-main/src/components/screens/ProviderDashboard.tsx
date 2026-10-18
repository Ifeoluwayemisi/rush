"use client";

import { useState } from "react";
import { ChevronLeft, Wrench, Wallet, Star, Clock, MessageCircle, ChevronRight, CheckCircle2, XCircle, ArrowRight, Loader2 } from "lucide-react";
import { useRush } from "@/lib/store";
import { useProviders, useServiceJobs, useRespondServiceJob } from "@/lib/hooks";
import type { ServiceJob } from "@/lib/types";
import { naira } from "@/lib/data";
import { getProviderAdvanceStep } from "@/lib/service-job-status";
import { ApiError } from "@/lib/api-client";
import { BackHeader } from "./CartScreen";

export function ProviderDashboard() {
  const { back, user, navigate, pushToast } = useRush();
  const providerProfile = (user as any)?.providerProfile;
  const providerCap = user?.capabilities?.find((c: any) => c.type === "SERVICE_PROVIDER");
  const providersQ = useProviders();
  const myJobsQ = useServiceJobs("provider");
  const openJobsQ = useServiceJobs("open");
  const respond = useRespondServiceJob();

  // Find this user's provider record (full data including services)
  const provider = (providersQ.data?.providers || []).find((p) => p.id === providerProfile?.id) || providerProfile;

  const myJobs = myJobsQ.data?.jobs || [];
  const incoming = myJobs.filter((j) => j.status !== "COMPLETED" && j.status !== "CANCELLED");
  const openJobs = openJobsQ.data?.jobs || [];

  async function handleQuote(job: ServiceJob, quotedPrice?: number) {
    try {
      await respond.mutateAsync({ id: job.id, action: "QUOTE", quotedPrice });
      pushToast({ title: job.quotedPrice !== null ? "Job accepted" : "Quote sent" });
    } catch (err) {
      pushToast({ title: "Couldn't send quote", description: err instanceof ApiError ? err.message : undefined });
    }
  }

  async function handleDecline(job: ServiceJob) {
    try {
      await respond.mutateAsync({ id: job.id, action: "DECLINE" });
      pushToast({ title: "Request declined" });
    } catch (err) {
      pushToast({ title: "Couldn't decline", description: err instanceof ApiError ? err.message : undefined });
    }
  }

  async function handleAdvance(job: ServiceJob) {
    const next = getProviderAdvanceStep(job.status);
    if (!next) return;
    try {
      await respond.mutateAsync({ id: job.id, action: "ADVANCE" });
      pushToast({ title: next.actionLabel });
    } catch (err) {
      pushToast({ title: "Couldn't update job", description: err instanceof ApiError ? err.message : undefined });
    }
  }

  if (!providerProfile && !providerCap) {
    return (
      <div className="pb-6">
        <BackHeader title="Service provider" onBack={back} />
        <div className="p-6 text-center">
          <p className="text-sm text-ink-soft mb-3">You haven't applied to be a provider yet.</p>
          <button
            onClick={() => navigate("onboarding-provider")}
            className="px-5 py-2.5 rounded-xl rush-gradient text-white font-bold text-sm shadow-rush"
          >
            Become a provider
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="pb-6">
      <BackHeader title="Service provider" onBack={back} />

      {/* Verification status */}
      {providerCap?.status === "PENDING_VERIFICATION" && (
        <div className="px-4 pt-3">
          <div className="rounded-2xl bg-warning/10 border border-warning/30 p-4">
            <div className="flex items-start gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-warning/20 flex items-center justify-center shrink-0">
                <Clock className="h-4 w-4 text-warning" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-ink">Verification in progress</p>
                <p className="text-xs text-ink-soft mt-0.5 leading-relaxed">
                  Your provider application is being reviewed. You'll be able to accept jobs once verified. Usually takes 24-48 hours.
                </p>
                <button
                  onClick={() => pushToast({ title: "Documents re-submitted" })}
                  className="mt-2 text-xs font-semibold text-warning underline-offset-2 hover:underline"
                >
                  View submitted documents →
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Profile preview */}
      {provider && (
        <div className="px-4 pt-4">
          <div className="rounded-2xl bg-card border border-border shadow-card p-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-muted overflow-hidden">
                {provider.avatar && (
                  <img src={provider.avatar} alt={provider.businessName} className="w-full h-full object-cover" />
                )}
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-ink">{provider.businessName}</p>
                <p className="text-[11px] text-ink-soft">{provider.tagline}</p>
              </div>
              <span className="text-[10px] font-semibold text-ink-soft bg-muted px-2 py-1 rounded">
                {provider.category}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-border text-center">
              <div>
                <p className="text-sm font-bold text-ink">{provider.completedJobs || 0}</p>
                <p className="text-[10px] text-ink-soft">Jobs</p>
              </div>
              <div>
                <p className="text-sm font-bold text-ink">{provider.rating ? `${provider.rating}★` : "New"}</p>
                <p className="text-[10px] text-ink-soft">Rating</p>
              </div>
              <div>
                <p className="text-sm font-bold text-ink">{naira(provider.startingPrice)}</p>
                <p className="text-[10px] text-ink-soft">Starting</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Incoming requests */}
      <section className="px-4 pt-5">
        <h2 className="text-sm font-bold text-ink mb-2">Incoming requests</h2>
        {incoming.length === 0 ? (
          <div className="rounded-2xl bg-muted/40 p-6 text-center">
            <Wrench className="h-8 w-8 text-ink-soft mx-auto mb-2" />
            <p className="text-sm font-semibold text-ink">No requests yet</p>
            <p className="text-xs text-ink-soft mt-1">
              When a customer requests you, it'll show up here.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {incoming.map((j) => (
              <RequestCard
                key={j.id}
                job={j}
                busy={respond.isPending}
                onQuote={handleQuote}
                onDecline={handleDecline}
                onAdvance={handleAdvance}
              />
            ))}
          </div>
        )}
      </section>

      {/* Open jobs near you */}
      <section className="px-4 pt-5">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-bold text-ink">Open jobs near you</h2>
          <span className="text-[10px] text-ink-soft">{openJobs.length} available</span>
        </div>
        {openJobs.length === 0 ? (
          <div className="rounded-2xl bg-muted/40 p-6 text-center">
            <Wrench className="h-8 w-8 text-ink-soft mx-auto mb-2" />
            <p className="text-sm font-semibold text-ink">No open jobs yet</p>
            <p className="text-xs text-ink-soft mt-1">
              Once verified, you'll see service jobs customers have posted in your area.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {openJobs.map((j) => (
              <RequestCard
                key={j.id}
                job={j}
                busy={respond.isPending}
                onQuote={handleQuote}
                onDecline={handleDecline}
                onAdvance={handleAdvance}
              />
            ))}
          </div>
        )}
      </section>

      {/* Services you offer */}
      <section className="px-4 pt-5">
        <h2 className="text-sm font-bold text-ink mb-2">Services you offer</h2>
        {provider?.services && provider.services.length > 0 ? (
          <div className="space-y-2">
            {provider.services.map((s: any) => (
              <div key={s.id} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
                <Wrench className="h-4 w-4 text-rush" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-ink">{s.name}</p>
                  <p className="text-[10px] text-ink-soft">{s.duration} · {naira(s.price)}</p>
                </div>
                <ChevronRight className="h-4 w-4 text-ink-soft" />
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-ink-soft text-center py-4">No services listed yet.</p>
        )}
        <button
          onClick={() => pushToast({ title: "Add new service" })}
          className="w-full mt-2 p-3 rounded-xl border-2 border-dashed border-border text-xs font-semibold text-ink-soft hover:border-rush hover:text-rush transition-colors"
        >
          + Add new service
        </button>
      </section>
    </div>
  );
}

function RequestCard({
  job,
  busy,
  onQuote,
  onDecline,
  onAdvance,
}: {
  job: ServiceJob;
  busy: boolean;
  onQuote: (job: ServiceJob, quotedPrice?: number) => void;
  onDecline: (job: ServiceJob) => void;
  onAdvance: (job: ServiceJob) => void;
}) {
  const [quoting, setQuoting] = useState(false);
  const [amount, setAmount] = useState("");
  const advanceStep = getProviderAdvanceStep(job.status);

  return (
    <div className="rounded-xl bg-card border border-border p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold text-ink line-clamp-1">{job.title}</p>
          <p className="text-[10px] text-ink-soft mt-0.5 line-clamp-2">{job.description}</p>
        </div>
        {(job.quotedPrice ?? job.budget) !== null && (
          <p className="text-sm font-bold text-rush shrink-0">{naira(job.quotedPrice ?? job.budget!)}</p>
        )}
      </div>

      {job.status === "OPEN" &&
        (quoting ? (
          <div className="mt-2.5 flex items-center gap-2">
            <input
              type="number"
              min="0"
              autoFocus
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Your quote (₦)"
              className="flex-1 h-8 rounded-lg border border-input bg-transparent px-2.5 text-xs"
            />
            <button
              disabled={busy || !amount}
              onClick={() => {
                onQuote(job, Number(amount));
                setQuoting(false);
                setAmount("");
              }}
              className="px-3 py-1.5 rounded-lg rush-gradient text-white text-[11px] font-bold shadow-rush disabled:opacity-60"
            >
              Send
            </button>
          </div>
        ) : (
          <div className="mt-2.5 flex items-center gap-2">
            <button
              disabled={busy}
              onClick={() => (job.quotedPrice !== null ? onQuote(job) : setQuoting(true))}
              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg rush-gradient text-white text-[11px] font-bold shadow-rush disabled:opacity-60"
            >
              <CheckCircle2 className="h-3 w-3" /> {job.quotedPrice !== null ? "Accept job" : "Send a quote"}
            </button>
            <button
              disabled={busy}
              onClick={() => onDecline(job)}
              className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-destructive/10 text-destructive text-[11px] font-bold disabled:opacity-60"
            >
              <XCircle className="h-3 w-3" /> Decline
            </button>
          </div>
        ))}

      {job.status === "QUOTED" && (
        <p className="mt-2.5 text-[11px] text-ink-soft italic">Waiting for the customer to approve your quote…</p>
      )}

      {advanceStep && (
        <button
          disabled={busy}
          onClick={() => onAdvance(job)}
          className="mt-2.5 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg rush-gradient text-white text-[11px] font-bold shadow-rush disabled:opacity-60"
        >
          {advanceStep.actionLabel} <ArrowRight className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}
