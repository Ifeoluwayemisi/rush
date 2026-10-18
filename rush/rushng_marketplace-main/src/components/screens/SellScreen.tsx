"use client";

import { Store, Wrench, Bike, ChevronRight, Plus, CheckCircle2, Clock, Shield } from "lucide-react";
import { useRush } from "@/lib/store";

export function SellScreen() {
  const { user, navigate } = useRush();

  const vendorCap = user?.capabilities?.find((c: any) => c.type === "VENDOR");
  const providerCap = user?.capabilities?.find((c: any) => c.type === "SERVICE_PROVIDER");
  const riderCap = user?.capabilities?.find((c: any) => c.type === "RIDER");
  const vendorProfile = (user as any)?.vendorProfile;

  return (
    <div className="pb-6">
      <div className="px-4 pt-3 pb-2">
        <h1 className="text-xl font-extrabold text-ink tracking-tight">Sell / Earn</h1>
        <p className="text-xs text-ink-soft mt-0.5">
          One account, many ways to earn on Rush
        </p>
      </div>

      {/* Active businesses */}
      {(vendorCap || providerCap || riderCap) && (
        <section className="px-4 pt-3">
          <p className="text-xs font-semibold text-ink-soft uppercase tracking-wider mb-2">
            Your businesses
          </p>
          <div className="space-y-2.5">
            {vendorCap && (
              <BusinessCard
                icon={<Store className="h-5 w-5" />}
                title={vendorProfile?.businessName || "My Store"}
                subtitle="Vendor store"
                status={vendorCap.status}
                onClick={() => navigate("vendor-dashboard")}
              />
            )}
            {providerCap && (
              <BusinessCard
                icon={<Wrench className="h-5 w-5" />}
                title="Service Provider"
                subtitle={providerCap.status === "ACTIVE" ? "Active" : "Awaiting verification"}
                status={providerCap.status}
                onClick={() => navigate("provider-dashboard")}
              />
            )}
            {riderCap && (
              <BusinessCard
                icon={<Bike className="h-5 w-5" />}
                title="Rider Account"
                subtitle={riderCap.status === "ACTIVE" ? "Active" : "Verification in progress"}
                status={riderCap.status}
                onClick={() => navigate("rider-dashboard")}
              />
            )}
          </div>
        </section>
      )}

      {/* Add new capability */}
      <section className="px-4 pt-6">
        <p className="text-xs font-semibold text-ink-soft uppercase tracking-wider mb-2">
          {vendorCap || providerCap || riderCap ? "Add another" : "Get started"}
        </p>

        <div className="space-y-3">
          {/* Vendor */}
          <CapabilityCard
            tone="rush"
            icon={<Store className="h-5 w-5" />}
            title="Sell Products"
            subtitle="Open a store and reach thousands of buyers across Lagos."
            bullets={["Free to start", "Your own store URL", "Manage orders & inventory"]}
            ctaLabel={vendorCap ? "Already a vendor" : "Open a store"}
            disabled={!!vendorCap}
            onClick={() => navigate("onboarding-vendor")}
          />

          {/* Service Provider */}
          <CapabilityCard
            tone="ink"
            icon={<Wrench className="h-5 w-5" />}
            title="Offer Services"
            subtitle="List your skills, get matched with customers, grow your business."
            bullets={["Quote on jobs", "Escrow-protected payments", "Build your reputation"]}
            ctaLabel={providerCap ? "Already a provider" : "Become a provider"}
            disabled={!!providerCap}
            onClick={() => navigate("onboarding-provider")}
          />

          {/* Rider */}
          <CapabilityCard
            tone="rush-deep"
            icon={<Bike className="h-5 w-5" />}
            title="Ride & Deliver"
            subtitle="Earn flexible income with your bike, car, or keke."
            bullets={["Daily payouts", "Choose delivery, rides, or both", "Verified rider benefits"]}
            ctaLabel={riderCap ? "Already a rider" : "Become a rider"}
            disabled={!!riderCap}
            onClick={() => navigate("onboarding-rider")}
          />
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 pt-7">
        <div className="rounded-2xl bg-muted/40 p-4">
          <p className="text-sm font-bold text-ink mb-3">How Rush works for sellers</p>
          <ol className="space-y-2.5 text-xs text-ink-soft">
            {[
              "Pick what you want to do — sell, offer services, or ride.",
              "Set up your profile in under 5 minutes.",
              "Get verified (some capabilities need document review).",
              "Start receiving orders, jobs, or ride requests.",
              "Get paid through Rush Wallet — secure, fast, traceable.",
            ].map((step, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="h-5 w-5 rounded-full rush-gradient text-white text-[10px] font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                <span className="text-ink leading-relaxed">{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </div>
  );
}

function BusinessCard({
  icon,
  title,
  subtitle,
  status,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  status: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-2xl bg-card border border-border shadow-card text-left hover:shadow-md transition-shadow"
    >
      <div className="h-11 w-11 rounded-xl rush-gradient flex items-center justify-center text-white">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-ink line-clamp-1">{title}</p>
        <p className="text-[11px] text-ink-soft">{subtitle}</p>
      </div>
      <div className="flex flex-col items-end gap-1">
        {status === "ACTIVE" ? (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success" /> Active
          </span>
        ) : status === "PENDING_VERIFICATION" ? (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-warning">
            <Clock className="h-3 w-3" /> Pending
          </span>
        ) : (
          <span className="text-[10px] font-semibold text-destructive">Suspended</span>
        )}
        <ChevronRight className="h-4 w-4 text-ink-soft" />
      </div>
    </button>
  );
}

function CapabilityCard({
  tone,
  icon,
  title,
  subtitle,
  bullets,
  ctaLabel,
  disabled,
  onClick,
}: {
  tone: "rush" | "ink" | "rush-deep";
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  bullets: string[];
  ctaLabel: string;
  disabled?: boolean;
  onClick: () => void;
}) {
  const toneCls = {
    rush: "rush-gradient text-white shadow-rush",
    ink: "bg-ink text-white",
    "rush-deep": "bg-rush-deep text-white",
  }[tone];

  return (
    <div className="rounded-2xl bg-card border border-border shadow-card overflow-hidden">
      <div className="p-4">
        <div className="flex items-start gap-3">
          <div className={`h-12 w-12 rounded-xl flex items-center justify-center ${toneCls}`}>
            {icon}
          </div>
          <div className="flex-1">
            <p className="text-base font-bold text-ink">{title}</p>
            <p className="text-xs text-ink-soft mt-0.5 leading-relaxed">{subtitle}</p>
          </div>
        </div>

        <ul className="mt-3 space-y-1.5">
          {bullets.map((b) => (
            <li key={b} className="flex items-center gap-2 text-xs text-ink">
              <CheckCircle2 className="h-3.5 w-3.5 text-success shrink-0" />
              {b}
            </li>
          ))}
        </ul>

        <button
          onClick={onClick}
          disabled={disabled}
          className={`mt-3 w-full py-2.5 rounded-xl text-sm font-bold transition-all ${
            disabled
              ? "bg-muted text-ink-soft cursor-not-allowed"
              : toneCls + " hover:scale-[1.01] active:scale-[0.99]"
          }`}
        >
          {disabled && <CheckCircle2 className="inline h-4 w-4 mr-1.5" />}
          {ctaLabel}
          {!disabled && <ChevronRight className="inline h-4 w-4 ml-1" />}
        </button>
      </div>
    </div>
  );
}
