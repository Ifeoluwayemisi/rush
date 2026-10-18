"use client";

import { Loader2, MapPin, Wallet, Wrench, XCircle, CheckCircle2, Clock, Tag } from "lucide-react";
import { useRush } from "@/lib/store";
import { useServiceJob, useRespondServiceJob } from "@/lib/hooks";
import { naira } from "@/lib/data";
import { ApiError } from "@/lib/api-client";
import { BackHeader } from "./CartScreen";

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Waiting for a quote",
  QUOTED: "Quote received",
  ASSIGNED: "Scheduled",
  IN_PROGRESS: "Work in progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
};

export function ServiceJobTrackingScreen() {
  const { back, params, pushToast } = useRush();
  const { data, isLoading } = useServiceJob(params.jobId);
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

  const job = data?.job;
  if (!job) {
    return (
      <div className="pb-6 min-h-screen">
        <BackHeader title="Service request" onBack={back} />
        <p className="p-6 text-center text-sm text-ink-soft">Request not found.</p>
      </div>
    );
  }

  async function handle(action: "APPROVE_QUOTE" | "DECLINE_QUOTE" | "CANCEL") {
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

  return (
    <div className="pb-8 min-h-screen">
      <BackHeader title={job.code} onBack={back} />

      <div className="px-4 pt-4">
        <div className="rounded-2xl bg-card border border-border shadow-card p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-base font-bold text-ink">{job.title}</p>
              <p className="text-xs text-ink-soft mt-0.5">{job.providerName || "Awaiting a provider"}</p>
            </div>
            <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-rush-soft text-rush-deep whitespace-nowrap">
              {STATUS_LABEL[job.status] || job.status}
            </span>
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
              <span className="text-base font-extrabold text-rush">{naira(price)}</span>
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
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl rush-gradient text-white text-sm font-bold shadow-rush disabled:opacity-60"
              >
                <CheckCircle2 className="h-4 w-4" /> Approve
              </button>
              <button
                disabled={respond.isPending}
                onClick={() => handle("DECLINE_QUOTE")}
                className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-destructive/10 text-destructive text-sm font-bold disabled:opacity-60"
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

      {/* Cancel */}
      {(job.status === "OPEN" || job.status === "ASSIGNED" || job.status === "IN_PROGRESS") && (
        <div className="px-4 pt-4">
          <button
            disabled={respond.isPending}
            onClick={() => handle("CANCEL")}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-destructive/10 text-destructive text-sm font-bold disabled:opacity-60"
          >
            {respond.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
            Cancel request
          </button>
        </div>
      )}
    </div>
  );
}
