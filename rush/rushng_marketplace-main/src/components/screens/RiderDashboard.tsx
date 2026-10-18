"use client";

import { ChevronLeft, Bike, Wallet, Star, Clock, Shield, CheckCircle2, AlertCircle, Power, FileText, Package, Car, ArrowRight, Check, X, Loader2 } from "lucide-react";
import { useRush } from "@/lib/store";
import { BackHeader } from "./CartScreen";
import { naira } from "@/lib/data";
import { useRiderJobs, useRespondToRiderJob, useToggleRiderOnline, type RiderJobSummary } from "@/lib/hooks";
import { ApiError } from "@/lib/api-client";

export function RiderDashboard() {
  const { back, user, pushToast } = useRush();
  const riderProfile = (user as any)?.riderProfile;
  const riderCap = user?.capabilities?.find((c: any) => c.type === "RIDER");

  const jobsQ = useRiderJobs();
  const respond = useRespondToRiderJob();
  const toggleOnline = useToggleRiderOnline();

  if (!riderProfile && !riderCap) {
    return (
      <div className="pb-6">
        <BackHeader title="Rider dashboard" onBack={back} />
        <div className="p-6 text-center">
          <p className="text-sm text-ink-soft mb-3">You haven't applied to be a rider yet.</p>
          <button
            onClick={() => {
              const { navigate } = useRush.getState();
              navigate("onboarding-rider");
            }}
            className="px-5 py-2.5 rounded-xl rush-gradient text-white font-bold text-sm shadow-rush"
          >
            Become a rider
          </button>
        </div>
      </div>
    );
  }

  // Use rider profile from user (populated via /api/auth/me)
  const r = riderProfile || {
    status: riderCap?.status || "PENDING_VERIFICATION",
    rating: 0,
    trips: 0,
    earningsToday: 0,
    mobility: ["DELIVERY", "PASSENGER_RIDES"],
    vehicle: null,
    licenseUploaded: false,
    documentsVerified: false,
    online: false,
  };

  const isActive = r.status === "ACTIVE";
  const allJobs = jobsQ.data?.jobs || [];
  const activeJobs = allJobs.filter((j) => j.status !== "COMPLETED" && j.status !== "CANCELLED");
  const pastJobs = allJobs.filter((j) => j.status === "COMPLETED" || j.status === "CANCELLED");

  async function handleGoOnline() {
    try {
      await toggleOnline.mutateAsync(!r.online);
      pushToast({ title: r.online ? "You're offline" : "You're online", description: r.online ? undefined : "You can now be assigned deliveries and rides" });
    } catch (err) {
      pushToast({ title: "Couldn't update status", description: err instanceof ApiError ? err.message : undefined });
    }
  }

  async function handleRespond(job: RiderJobSummary, action: "ACCEPT" | "DECLINE" | "ADVANCE") {
    try {
      await respond.mutateAsync({ id: job.id, action });
      const verb = action === "ACCEPT" ? "accepted" : action === "DECLINE" ? "declined" : "updated";
      pushToast({ title: `${job.type === "RIDE" ? "Trip" : "Delivery"} ${verb}` });
    } catch (err) {
      pushToast({ title: "Couldn't respond", description: err instanceof ApiError ? err.message : undefined });
    }
  }

  return (
    <div className="pb-6">
      <BackHeader title="Rider dashboard" onBack={back} />

      {/* Verification status */}
      {r.status === "PENDING_VERIFICATION" && (
        <div className="px-4 pt-3">
          <div className="rounded-2xl bg-warning/10 border border-warning/30 p-4">
            <div className="flex items-start gap-2.5">
              <div className="h-9 w-9 rounded-xl bg-warning/20 flex items-center justify-center shrink-0">
                <Shield className="h-4 w-4 text-warning" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-ink">Verification pending</p>
                <p className="text-xs text-ink-soft mt-0.5 leading-relaxed">
                  Your documents are under review. Once approved, you can go online and start accepting trips and deliveries.
                </p>
                <div className="mt-2 space-y-1.5">
                  <CheckRow label="Rider profile submitted" done />
                  <CheckRow label="Drivers licence uploaded" done={r.licenseUploaded} />
                  <CheckRow label="Vehicle registered" done={!!r.vehicle} />
                  <CheckRow label="Documents verified" done={r.documentsVerified} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Go online CTA */}
      <div className="px-4 pt-4">
        <button
          disabled={!isActive || toggleOnline.isPending}
          onClick={handleGoOnline}
          className={`w-full p-4 rounded-2xl flex items-center gap-3 transition-all disabled:opacity-70 ${
            r.online
              ? "bg-success/10 border-2 border-success text-success"
              : isActive
              ? "rush-gradient text-white shadow-rush hover:scale-[1.01]"
              : "bg-muted text-ink-soft cursor-not-allowed"
          }`}
        >
          <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${r.online ? "bg-success/15" : isActive ? "bg-white/20" : "bg-muted-foreground/10"}`}>
            {toggleOnline.isPending ? <Loader2 className="h-5 w-5 animate-spin" /> : <Power className="h-5 w-5" />}
          </div>
          <div className="flex-1 text-left">
            <p className="text-sm font-bold">
              {!isActive ? "Verify to go online" : r.online ? "You're online" : "Go online"}
            </p>
            <p className="text-[11px] opacity-80">
              {!isActive
                ? "Complete verification to start earning"
                : r.online
                ? "Tap to go offline"
                : "Start receiving ride and delivery requests"}
            </p>
          </div>
        </button>
      </div>

      {/* Stats */}
      <div className="px-4 pt-4 grid grid-cols-3 gap-2.5">
        <StatBlock icon={<Star className="h-4 w-4" />} value={`${r.rating || 0}`} label="Rating" />
        <StatBlock icon={<Bike className="h-4 w-4" />} value={`${r.trips || 0}`} label="Trips" />
        <StatBlock icon={<Wallet className="h-4 w-4" />} value={naira(r.earningsToday || 0)} label="Today" small />
      </div>

      {/* Active jobs (deliveries + rides) */}
      {isActive && (
        <section className="px-4 pt-5">
          <p className="text-xs font-semibold text-ink-soft uppercase tracking-wider mb-2">
            Active jobs
          </p>
          {activeJobs.length === 0 ? (
            <div className="rounded-2xl bg-muted/40 p-6 text-center">
              <Package className="h-8 w-8 text-ink-soft mx-auto mb-2" />
              <p className="text-sm font-semibold text-ink">No jobs assigned</p>
              <p className="text-xs text-ink-soft mt-1">
                {r.online ? "You'll be notified when a delivery or ride comes in." : "Go online to start receiving work."}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {activeJobs.map((job) => (
                <JobCard key={job.id} job={job} busy={respond.isPending} onRespond={handleRespond} />
              ))}
            </div>
          )}
        </section>
      )}

      {/* Mobility capabilities */}
      <section className="px-4 pt-5">
        <p className="text-xs font-semibold text-ink-soft uppercase tracking-wider mb-2">
          Your mobility capabilities
        </p>
        <div className="grid grid-cols-2 gap-2.5">
          <CapCard
            icon="🛵"
            title="Deliveries"
            description="Deliver products from vendors to customers"
            enabled={(r.mobility || []).includes("DELIVERY")}
          />
          <CapCard
            icon="🚗"
            title="Passenger rides"
            description="Pick and drop passengers across Lagos"
            enabled={(r.mobility || []).includes("PASSENGER_RIDES")}
          />
        </div>
      </section>

      {/* Vehicle info */}
      {r.vehicle && (
        <section className="px-4 pt-5">
          <p className="text-xs font-semibold text-ink-soft uppercase tracking-wider mb-2">
            Registered vehicle
          </p>
          <div className="rounded-2xl bg-card border border-border p-4">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-xl bg-rush-soft flex items-center justify-center text-2xl">
                {r.vehicle.type === "BIKE" ? "🏍️" : r.vehicle.type === "CAR" ? "🚗" : "🛺"}
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-ink">{r.vehicle.model || "Vehicle"}</p>
                <p className="text-[11px] text-ink-soft">
                  {r.vehicle.color || "—"} · {r.vehicle.plate || "—"}
                </p>
              </div>
              <span className={`text-[10px] font-semibold px-2 py-1 rounded ${
                r.vehicle.verified ? "bg-success/10 text-success" : "bg-warning/15 text-warning"
              }`}>
                {r.vehicle.verified ? "Verified" : "Pending"}
              </span>
            </div>
            {r.vehicle.licenseNumber && (
              <div className="mt-3 pt-3 border-t border-border grid grid-cols-2 gap-2 text-xs">
                <div>
                  <p className="text-[10px] text-ink-soft">License number</p>
                  <p className="font-semibold text-ink">{r.vehicle.licenseNumber}</p>
                </div>
                <div>
                  <p className="text-[10px] text-ink-soft">Type</p>
                  <p className="font-semibold text-ink">{r.vehicle.type}</p>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Recent trips */}
      <section className="px-4 pt-5">
        <p className="text-xs font-semibold text-ink-soft uppercase tracking-wider mb-2">
          Recent trips
        </p>
        {pastJobs.length === 0 ? (
          <div className="rounded-2xl bg-muted/40 p-6 text-center">
            <Bike className="h-8 w-8 text-ink-soft mx-auto mb-2" />
            <p className="text-sm font-semibold text-ink">No trips yet</p>
            <p className="text-xs text-ink-soft mt-1">
              Once you're verified, your trip history will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {pastJobs.slice(0, 10).map((job) => (
              <div key={job.id} className="flex items-center justify-between p-2.5 rounded-xl bg-card border border-border">
                <div className="flex items-center gap-2">
                  {job.type === "RIDE" ? <Car className="h-3.5 w-3.5 text-ink-soft" /> : <Package className="h-3.5 w-3.5 text-ink-soft" />}
                  <div>
                    <p className="text-xs font-semibold text-ink">{job.order?.code || job.ride?.code}</p>
                    <p className="text-[10px] text-ink-soft">{job.order?.vendorName || job.ride?.customerName}</p>
                  </div>
                </div>
                <span
                  className={`text-[10px] font-semibold px-2 py-1 rounded-full ${
                    job.status === "CANCELLED" ? "bg-destructive/10 text-destructive" : "bg-success/10 text-success"
                  }`}
                >
                  {job.status === "CANCELLED" ? "Cancelled" : "Completed"}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Help */}
      <div className="px-4 pt-4">
        <button
          onClick={() => pushToast({ title: "Opening help center…" })}
          className="w-full flex items-center gap-3 p-3 rounded-xl bg-card border border-border"
        >
          <FileText className="h-4 w-4 text-rush" />
          <div className="flex-1 text-left">
            <p className="text-xs font-semibold text-ink">Rider guidelines & support</p>
            <p className="text-[10px] text-ink-soft">Rules, safety, payouts, and FAQs</p>
          </div>
        </button>
      </div>
    </div>
  );
}

function jobAdvanceLabel(job: RiderJobSummary): string {
  if (job.type === "DELIVERY") {
    return job.status === "ACCEPTED" ? "Mark picked up" : "Mark delivered";
  }
  return job.status === "ACCEPTED" ? "Start trip" : "Complete trip";
}

function JobCard({
  job,
  busy,
  onRespond,
}: {
  job: RiderJobSummary;
  busy: boolean;
  onRespond: (job: RiderJobSummary, action: "ACCEPT" | "DECLINE" | "ADVANCE") => void;
}) {
  const isRide = job.type === "RIDE";
  const amount = isRide ? job.ride?.fare || 0 : job.order?.deliveryFee || 0;

  return (
    <div className="rounded-xl bg-card border border-border p-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          {isRide ? <Car className="h-3 w-3 text-ink-soft" /> : <Package className="h-3 w-3 text-ink-soft" />}
          <p className="text-xs font-bold text-ink">{job.order?.code || job.ride?.code}</p>
        </div>
        <p className="text-sm font-bold text-rush">{naira(amount)}</p>
      </div>

      {isRide ? (
        <div className="mt-1.5 space-y-0.5">
          <p className="text-[10px] text-ink-soft line-clamp-1">📍 {job.ride?.pickup}</p>
          <p className="text-[10px] text-ink-soft line-clamp-1">🏁 {job.ride?.destination}</p>
        </div>
      ) : (
        <p className="text-[10px] text-ink-soft mt-1.5 line-clamp-1">
          {job.order?.vendorName} · 📍 {job.order?.deliveryAddress || "Address not provided"}
        </p>
      )}

      {job.status === "OFFERED" ? (
        <div className="mt-2.5 flex items-center gap-2">
          <button
            disabled={busy}
            onClick={() => onRespond(job, "ACCEPT")}
            className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg rush-gradient text-white text-[11px] font-bold shadow-rush disabled:opacity-60"
          >
            <Check className="h-3 w-3" /> Accept
          </button>
          <button
            disabled={busy}
            onClick={() => onRespond(job, "DECLINE")}
            className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-destructive/10 text-destructive text-[11px] font-bold disabled:opacity-60"
          >
            <X className="h-3 w-3" /> Decline
          </button>
        </div>
      ) : (
        <button
          disabled={busy}
          onClick={() => onRespond(job, "ADVANCE")}
          className="mt-2.5 w-full flex items-center justify-center gap-1.5 py-1.5 rounded-lg rush-gradient text-white text-[11px] font-bold shadow-rush disabled:opacity-60"
        >
          {jobAdvanceLabel(job)} <ArrowRight className="h-3 w-3" />
        </button>
      )}
    </div>
  );
}

function StatBlock({
  icon,
  value,
  label,
  small,
}: {
  icon: React.ReactNode;
  value: string;
  label: string;
  small?: boolean;
}) {
  return (
    <div className="rounded-2xl bg-card border border-border p-3 text-center">
      <div className="h-7 w-7 rounded-lg bg-rush-soft text-rush flex items-center justify-center mx-auto">
        {icon}
      </div>
      <p className={`font-extrabold text-ink mt-1.5 ${small ? "text-sm" : "text-base"}`}>{value}</p>
      <p className="text-[10px] text-ink-soft">{label}</p>
    </div>
  );
}

function CapCard({
  icon,
  title,
  description,
  enabled,
}: {
  icon: string;
  title: string;
  description: string;
  enabled: boolean;
}) {
  return (
    <div
      className={`rounded-xl border-2 p-3 ${
        enabled ? "border-rush bg-rush-soft/30" : "border-border bg-muted/30"
      }`}
    >
      <div className="flex items-center justify-between">
        <span className="text-xl">{icon}</span>
        {enabled ? (
          <CheckCircle2 className="h-4 w-4 text-success" />
        ) : (
          <AlertCircle className="h-4 w-4 text-ink-soft" />
        )}
      </div>
      <p className="text-xs font-bold text-ink mt-1.5">{title}</p>
      <p className="text-[10px] text-ink-soft leading-snug mt-0.5">{description}</p>
    </div>
  );
}

function CheckRow({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      {done ? (
        <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
      ) : (
        <Clock className="h-3.5 w-3.5 text-warning shrink-0" />
      )}
      <span className={done ? "text-ink" : "text-ink-soft"}>{label}</span>
    </div>
  );
}
