"use client";

import { Loader2, MapPin, Wallet, Wrench, XCircle, CheckCircle2, Clock, Tag, CalendarClock } from "lucide-react";
import { useRush } from "@/lib/store";
import { useServiceJob, useRespondServiceJob } from "@/lib/hooks";
import { naira } from "@/lib/data";
import { ApiError } from "@/lib/api-client";
import { BackHeader } from "./CartScreen";
import { ErrorState, EmptyState } from "@/components/shared/DataState";

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Waiting for a quote",
  QUOTED: "Quote received",
  ASSIGNED: "Scheduled",
  IN_PROGRESS: "Work in progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

const STATUS_HEADLINE: Record<string, string> = {
  OPEN: "Finding you a provider",
  QUOTED: "Your provider sent a quote",
  ASSIGNED: "The job is scheduled",
  IN_PROGRESS: "Your provider is on the job",
  COMPLETED: "Work completed",
  CANCELLED: "Request cancelled",
};

const TERMINAL_STATUSES = new Set(["COMPLETED", "CANCELLED"]);

export function ServiceJobTrackingScreen() {
  const { back, params, pushToast } = useRush();
  const { data, isLoading, error, refetch } = useServiceJob(params.jobId);
  const respond = useRespondServiceJob();

  if (isLoading) {
    return (
      <div className="pb-6 min-h-screen">
        <BackHeader title="Service request" onBack={back} />
        <div className="pt-16 flex items-center justify-center text-ink-soft">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </div>
    );
  }

  if (error && !data) {
    return (
      <div className="pb-6 min-h-screen">
        <BackHeader title="Service request" onBack={back} />
        <ErrorState error={error} onRetry={() => refetch()} />
      </div>
    );
  }

  const job = data?.job;
  if (!job) {
    return (
      <div className="pb-6 min-h-screen">
        <BackHeader title="Service request" onBack={back} />
        <EmptyState
          icon={<Wrench className="h-6 w-6" />}
          title="Request not found"
          message="This job may have been removed."
        />
      </div>
    );
  }

  async function handle(action: "APPROVE_QUOTE" | "DECLINE_QUOTE" | "CANCEL") {
    if (action === "CANCEL" && !window.confirm("Cancel this service request? This can't be undone.")) return;
    try {
      await respond.mutateAsync({ id: job!.id, action });
      pushToast({
        title:
          action === "APPROVE_QUOTE" ? "Quote approved" : action === "DECLINE_QUOTE" ? "Quote declined" : "Request cancelled",
      });
    } catch (err) {
      pushToast({ title: "Couldn't update request", description: err instanceof ApiError ? err.message : undefined });
    }
  }

  const price = job.quotedPrice ?? job.budget;
  const heroTone =
    job.status === "COMPLETED"
      ? "bg-success text-white"
      : job.status === "CANCELLED"
      ? "bg-muted text-ink"
      : "bg-rush-deep text-white";

  return (
    <div className="pb-8 min-h-screen">
      <BackHeader title={job.code} onBack={back} />

      {/* Status hero */}
      <div className="px-4 pt-4">
        <div className={`rounded-2xl p-4 shadow-rush relative overflow-hidden ${heroTone}`}>
          {!TERMINAL_STATUSES.has(job.status) && (
            <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
          )}
          <div className="relative" aria-live="polite">
            <p className="text-[11px] font-semibold uppercase tracking-wider opacity-90">
              {job.status.replace(/_/g, " ")}
            </p>
            <h2 className="text-lg font-bold mt-0.5 leading-tight">
              {STATUS_HEADLINE[job.status] || job.status}
            </h2>
            <p className="text-xs opacity-90 mt-0.5">
              {job.providerName || "Awaiting a provider"}
              {job.scheduledFor && (
                <span className="flex items-center gap-1 mt-1">
                  <CalendarClock className="h-3 w-3" />
                  Scheduled for {new Date(job.scheduledFor).toLocaleString()}
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Request details */}
      <div className="px-4 pt-3">
        <div className="rounded-2xl bg-card border border-border shadow-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-base font-bold text-ink">{job.title}</p>
              <span className="inline-flex mt-1 items-center text-[10px] font-bold px-2 py-1 rounded-full bg-rush-soft text-rush-deep whitespace-nowrap">
                {STATUS_LABEL[job.status] || job.status}
              </span>
            </div>
          </div>
          <p className="text-sm text-ink-soft mt-3 leading-relaxed">{job.description}</p>

          <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 gap-3 text-xs">
            <div className="flex items-center gap-1.5 text-ink-soft">
              <MapPin className="h-3.5 w-3.5" /> {job.location}
            </div>
            <div className="flex items-center gap-1.5 text-ink-soft">
              <Tag className="h-3.5 w-3.5" /> {job.category}
            </div>
          </div>

          {price !== null && (
            <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
              <span className="text-xs text-ink-soft flex items-center gap-1.5">
                <Wallet className="h-3.5 w-3.5" /> {job.quotedPrice !== null ? "Quoted price" : "Your budget"}
              </span>
              <span className="text-base font-extrabold text-rush-deep">{naira(price)}</span>
            </div>
          )}
        </div>
      </div>

      {/* Quote decision */}
      {job.status === "QUOTED" && (
        <div className="px-4 pt-4">
          <div className="rounded-2xl bg-rush-soft/40 p-4">
            <p className="text-sm font-bold text-ink mb-1">{job.providerName} sent a quote</p>
            <p className="text-xs text-ink-soft mb-3">Approve to schedule the work, or decline to cancel this request.</p>
            <div className="flex items-center gap-2">
              <button
                disabled={respond.isPending}
                onClick={() => handle("APPROVE_QUOTE")}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl cta-primary text-sm disabled:opacity-60"
              >
                <CheckCircle2 className="h-4 w-4" /> Approve
              </button>
              <button
                disabled={respond.isPending}
                onClick={() => handle("DECLINE_QUOTE")}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-destructive/10 text-destructive text-sm font-bold disabled:opacity-60 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              >
                <XCircle className="h-4 w-4" /> Decline
              </button>
            </div>
          </div>
        </div>
      )}

      {job.status === "OPEN" && (
        <div className="px-4 pt-4">
          <div className="rounded-xl bg-muted/40 p-3 flex items-center gap-2.5">
            <Clock className="h-4 w-4 text-ink-soft" />
            <p className="text-xs text-ink-soft">Waiting for {job.providerName || "the provider"} to respond.</p>
          </div>
        </div>
      )}

      {(job.status === "ASSIGNED" || job.status === "IN_PROGRESS") && (
        <div className="px-4 pt-4">
          <div className="rounded-xl bg-success/10 p-3 flex items-center gap-2.5">
            <Wrench className="h-4 w-4 text-success" />
            <p className="text-xs text-ink">
              {job.status === "ASSIGNED" ? "Scheduled — the provider will start soon." : "The provider has started work."}
            </p>
          </div>
        </div>
      )}

      {job.status === "COMPLETED" && (
        <div className="px-4 pt-4">
          <div className="rounded-xl bg-success/10 p-3 flex items-center gap-2.5">
            <CheckCircle2 className="h-4 w-4 text-success" />
            <p className="text-xs text-ink">The provider marked this job as complete.</p>
          </div>
        </div>
      )}

      {job.status === "CANCELLED" && (
        <div className="px-4 pt-4">
          <div className="rounded-xl bg-muted/60 p-3 flex items-center gap-2.5">
            <XCircle className="h-4 w-4 text-ink-soft" />
            <p className="text-xs text-ink-soft">This request was cancelled.</p>
          </div>
        </div>
      )}

      {/* Cancel */}
      {(job.status === "OPEN" || job.status === "ASSIGNED" || job.status === "IN_PROGRESS") && (
        <div className="px-4 pt-4">
          <button
            disabled={respond.isPending}
            onClick={() => handle("CANCEL")}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-destructive/10 text-destructive text-sm font-bold disabled:opacity-60 cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            {respond.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
            Cancel request
          </button>
        </div>
      )}
    </div>
  );
}
