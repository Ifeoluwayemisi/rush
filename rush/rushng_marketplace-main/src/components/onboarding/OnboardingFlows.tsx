"use client";

import type * as React from "react";
import { useState } from "react";
import {
  Bike,
  Check,
  ChevronLeft,
  ChevronRight,
  Loader2,
  MapPin,
  Store,
  Wrench,
} from "lucide-react";
import { useRush } from "@/lib/store";
import { CONTENT_WIDTH } from "@/lib/layout";
import { useOnboardVendor, useOnboardProvider, useOnboardRider } from "@/lib/hooks";
import { SHOP_CATEGORIES } from "@/lib/data";

const inputCls =
  "w-full bg-muted rounded-xl border border-border/70 px-3.5 py-2.5 text-sm text-ink placeholder:text-ink-soft outline-none transition focus:border-rush/40 focus:bg-card focus:ring-2 focus:ring-rush/20 cursor-text disabled:opacity-50 disabled:cursor-not-allowed";

const tileCls = (active: boolean) =>
  `rounded-xl border-2 text-center transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
    active
      ? "border-rush bg-rush-soft/60 shadow-card"
      : "border-border hover:border-ink-soft/30"
  }`;

// ============== VENDOR ONBOARDING ==============
export function OnboardingVendorScreen() {
  const { back, navigate, pushToast } = useRush();
  const onboardMut = useOnboardVendor();
  const [step, setStep] = useState(1);
  const [data, setData] = useState({
    businessName: "",
    category: "",
    location: "",
    phone: "",
    whatsapp: "",
    description: "",
    visibility: "PUBLIC" as "PUBLIC" | "LINK_ONLY" | "PRIVATE",
  });

  const total = 3;
  const next = () => setStep((s) => Math.min(total, s + 1));
  const prev = () => (step === 1 ? back() : setStep((s) => s - 1));

  const finish = async () => {
    try {
      await onboardMut.mutateAsync({
        businessName: data.businessName,
        category: data.category,
        description: data.description,
        location: data.location,
        phone: data.phone,
        whatsapp: data.whatsapp || undefined,
        visibility: data.visibility,
      });
      pushToast({ title: "Store created!", description: "Welcome to Rush, vendor." });
      navigate("vendor-dashboard");
    } catch (err) {
      pushToast({
        title: "Failed to create store",
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  return (
    <div className="pb-32 min-h-screen">
      <BackHeader onBack={prev} title="Open your store" step={step} total={total} icon={<Store className="h-4 w-4" />} />

      <div className="px-4 pt-4">
        {step === 1 && (
          <Step title="Tell us about your store" sub="This is how customers will recognise you on Rush.">
            <Field label="Store name">
              <input
                value={data.businessName}
                onChange={(e) => setData({ ...data, businessName: e.target.value })}
                placeholder="e.g. Campus Gadgets"
                className={inputCls}
              />
            </Field>
            <Field label="Category">
              <div className="grid grid-cols-3 gap-2">
                {SHOP_CATEGORIES.slice(0, 6).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setData({ ...data, category: c.id })}
                    className={`flex flex-col items-center gap-1 p-2.5 ${tileCls(data.category === c.id)}`}
                  >
                    <span className="text-lg">{c.icon}</span>
                    <span className="text-[10px] font-semibold text-ink">{c.label}</span>
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Description (optional)">
              <textarea
                value={data.description}
                onChange={(e) => setData({ ...data, description: e.target.value })}
                placeholder="What do you sell? Why should customers choose you?"
                rows={3}
                className={`${inputCls} resize-none cursor-text`}
              />
            </Field>
          </Step>
        )}

        {step === 2 && (
          <Step title="Where are you located?" sub="Customers near you will see your products first.">
            <Field label="Location / Area">
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-rush pointer-events-none" />
                <input
                  value={data.location}
                  onChange={(e) => setData({ ...data, location: e.target.value })}
                  placeholder="e.g. Yaba, Lagos"
                  className={`${inputCls} pl-9`}
                />
              </div>
            </Field>
            <Field label="Phone number">
              <input
                value={data.phone}
                onChange={(e) => setData({ ...data, phone: e.target.value })}
                placeholder="+234 803 555 0142"
                className={inputCls}
              />
            </Field>
            <Field label="WhatsApp (optional)">
              <input
                value={data.whatsapp}
                onChange={(e) => setData({ ...data, whatsapp: e.target.value })}
                placeholder="+234 803 555 0142"
                className={inputCls}
              />
            </Field>
          </Step>
        )}

        {step === 3 && (
          <Step title="Store visibility" sub="Choose where your store appears. You can change this later.">
            <div className="space-y-2.5">
              <VisibilityOption
                icon="🌍"
                title="Public"
                description="Your store appears in Rush marketplace search and explore."
                active={data.visibility === "PUBLIC"}
                onClick={() => setData({ ...data, visibility: "PUBLIC" })}
              />
              <VisibilityOption
                icon="🔗"
                title="Link only"
                description="Only people with your store link can find you. Great for student sellers."
                active={data.visibility === "LINK_ONLY"}
                onClick={() => setData({ ...data, visibility: "LINK_ONLY" })}
              />
              <VisibilityOption
                icon="🔒"
                title="Private"
                description="Hidden while you set up. You can launch later."
                active={data.visibility === "PRIVATE"}
                onClick={() => setData({ ...data, visibility: "PRIVATE" })}
              />
            </div>

            <div className="mt-5 p-3.5 rounded-xl bg-rush-soft/50 border border-rush/20">
              <p className="text-xs font-bold text-rush-deep">What happens next?</p>
              <ul className="mt-1.5 space-y-1 text-[11px] text-ink-soft">
                <li>✓ Your store URL is created instantly</li>
                <li>✓ You can add your first product right away</li>
                <li>✓ Optional: upgrade to verified vendor later</li>
              </ul>
            </div>
          </Step>
        )}
      </div>

      <CTABar
        step={step}
        total={total}
        loading={onboardMut.isPending}
        onNext={step === total ? finish : next}
        nextLabel={step === total ? "Create store" : "Continue"}
        disabled={step === 1 ? !data.businessName || !data.category : step === 2 ? !data.location || !data.phone : false}
      />
    </div>
  );
}

// ============== PROVIDER ONBOARDING ==============
export function OnboardingProviderScreen() {
  const { back, navigate, pushToast } = useRush();
  const onboardMut = useOnboardProvider();
  const [step, setStep] = useState(1);
  const [data, setData] = useState({
    businessName: "",
    category: "",
    location: "",
    startingPrice: "",
    tagline: "",
  });
  const total = 3;
  const next = () => setStep((s) => Math.min(total, s + 1));
  const prev = () => (step === 1 ? back() : setStep((s) => s - 1));
  const finish = async () => {
    try {
      await onboardMut.mutateAsync({
        businessName: data.businessName,
        tagline: data.tagline,
        category: data.category,
        location: data.location,
        startingPrice: data.startingPrice,
      });
      pushToast({ title: "Application submitted!", description: "Verification takes 24-48 hours." });
      navigate("provider-dashboard");
    } catch (err) {
      pushToast({
        title: "Failed to submit",
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  return (
    <div className="pb-32 min-h-screen">
      <BackHeader onBack={prev} title="Become a provider" step={step} total={total} icon={<Wrench className="h-4 w-4" />} />
      <div className="px-4 pt-4">
        {step === 1 && (
          <Step title="Your business profile" sub="Tell customers what you do.">
            <Field label="Business name">
              <input
                value={data.businessName}
                onChange={(e) => setData({ ...data, businessName: e.target.value })}
                placeholder="e.g. John Electrical Services"
                className={inputCls}
              />
            </Field>
            <Field label="Tagline">
              <input
                value={data.tagline}
                onChange={(e) => setData({ ...data, tagline: e.target.value })}
                placeholder="One-line summary of what you do"
                className={inputCls}
              />
            </Field>
            <Field label="Service category">
              <div className="grid grid-cols-3 gap-2">
                {["Cleaning", "Electrical", "Plumbing", "Repairs", "Beauty", "Moving"].map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setData({ ...data, category: c })}
                    className={`p-2.5 rounded-xl border-2 text-xs font-semibold transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                      data.category === c
                        ? "border-rush bg-rush-soft/60 text-rush-deep shadow-card"
                        : "border-border text-ink hover:border-ink-soft/30"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </Field>
          </Step>
        )}
        {step === 2 && (
          <Step title="Pricing & location" sub="Set a starting price and where you operate.">
            <Field label="Starting price (₦)">
              <input
                value={data.startingPrice}
                onChange={(e) => setData({ ...data, startingPrice: e.target.value })}
                placeholder="5000"
                inputMode="numeric"
                className={inputCls}
              />
            </Field>
            <Field label="Location / Area">
              <input
                value={data.location}
                onChange={(e) => setData({ ...data, location: e.target.value })}
                placeholder="e.g. Yaba, Lagos"
                className={inputCls}
              />
            </Field>
          </Step>
        )}
        {step === 3 && (
          <Step title="Verification required" sub="We verify providers to keep Rush safe.">
            <div className="space-y-3">
              <UploadCard label="Government-issued ID" hint="NIN, Drivers License, or Voters Card" />
              <UploadCard label="Certification (optional)" hint="Trade test, professional certificate" />
              <UploadCard label="Recent work photos" hint="Show customers your past jobs" />
            </div>
            <div className="mt-4 p-3 rounded-xl bg-warning/10 border border-warning/30">
              <p className="text-xs text-ink">
                <strong>Verification takes 24-48 hours.</strong> You'll be notified once approved.
              </p>
            </div>
          </Step>
        )}
      </div>
      <CTABar
        step={step}
        total={total}
        loading={onboardMut.isPending}
        onNext={step === total ? finish : next}
        nextLabel={step === total ? "Submit for review" : "Continue"}
        disabled={step === 1 ? !data.businessName || !data.category : step === 2 ? !data.location || !data.startingPrice : false}
      />
    </div>
  );
}

// ============== RIDER ONBOARDING ==============
export function OnboardingRiderScreen() {
  const { back, navigate, pushToast } = useRush();
  const onboardMut = useOnboardRider();
  const [step, setStep] = useState(1);
  const [data, setData] = useState({
    phone: "",
    location: "",
    mobility: ["DELIVERY", "PASSENGER_RIDES"] as string[],
    vehicleType: "BIKE",
    plate: "",
    vehicleModel: "",
    color: "",
    licenseNumber: "",
  });
  const total = 4;
  const next = () => setStep((s) => Math.min(total, s + 1));
  const prev = () => (step === 1 ? back() : setStep((s) => s - 1));
  const finish = async () => {
    try {
      await onboardMut.mutateAsync({
        phone: data.phone,
        location: data.location,
        mobility: data.mobility,
        vehicleType: data.vehicleType,
        plate: data.plate,
        vehicleModel: data.vehicleModel,
        color: data.color,
        licenseNumber: data.licenseNumber,
      });
      pushToast({ title: "Application submitted!", description: "Document review takes 24-48 hours." });
      navigate("rider-dashboard");
    } catch (err) {
      pushToast({
        title: "Failed to submit",
        description: err instanceof Error ? err.message : undefined,
      });
    }
  };

  const toggleMobility = (m: string) => {
    setData((d) => ({
      ...d,
      mobility: d.mobility.includes(m)
        ? d.mobility.filter((x) => x !== m)
        : [...d.mobility, m],
    }));
  };

  return (
    <div className="pb-32 min-h-screen">
      <BackHeader onBack={prev} title="Become a rider" step={step} total={total} icon={<Bike className="h-4 w-4" />} />
      <div className="px-4 pt-4">
        {step === 1 && (
          <Step title="Personal details" sub="Tell us who you are.">
            <Field label="Phone number">
              <input
                value={data.phone}
                onChange={(e) => setData({ ...data, phone: e.target.value })}
                placeholder="+234 803 555 0142"
                className={inputCls}
              />
            </Field>
            <Field label="Location / Area">
              <input
                value={data.location}
                onChange={(e) => setData({ ...data, location: e.target.value })}
                placeholder="Yaba, Lagos"
                className={inputCls}
              />
            </Field>
            <Field label="What can you do?">
              <div className="grid grid-cols-2 gap-2">
                {[
                  { id: "DELIVERY", label: "Deliveries", icon: "🛵", desc: "Move products" },
                  { id: "PASSENGER_RIDES", label: "Passenger rides", icon: "🚗", desc: "Move people" },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => toggleMobility(m.id)}
                    className={`flex flex-col items-start gap-1 p-3 rounded-xl border-2 text-left transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
                      data.mobility.includes(m.id)
                        ? "border-rush bg-rush-soft/60 shadow-card"
                        : "border-border hover:border-ink-soft/30"
                    }`}
                  >
                    <span className="text-xl">{m.icon}</span>
                    <span className="text-xs font-bold text-ink">{m.label}</span>
                    <span className="text-[10px] text-ink-soft">{m.desc}</span>
                  </button>
                ))}
              </div>
            </Field>
          </Step>
        )}
        {step === 2 && (
          <Step title="Your vehicle" sub="Tell us about what you'll ride.">
            <Field label="Vehicle type">
              <div className="grid grid-cols-4 gap-2">
                {[
                  { id: "BIKE", label: "Bike", icon: "🏍️" },
                  { id: "CAR", label: "Car", icon: "🚗" },
                  { id: "KEKE", label: "Keke", icon: "🛺" },
                  { id: "VAN", label: "Van", icon: "🚐" },
                ].map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setData({ ...data, vehicleType: v.id })}
                    className={`flex flex-col items-center gap-1 p-2.5 ${tileCls(data.vehicleType === v.id)}`}
                  >
                    <span className="text-xl">{v.icon}</span>
                    <span className="text-[10px] font-semibold text-ink">{v.label}</span>
                  </button>
                ))}
              </div>
            </Field>
            <Field label="Plate number">
              <input
                value={data.plate}
                onChange={(e) => setData({ ...data, plate: e.target.value })}
                placeholder="LAG-482-QD"
                className={inputCls}
              />
            </Field>
            <Field label="Vehicle model">
              <input
                value={data.vehicleModel}
                onChange={(e) => setData({ ...data, vehicleModel: e.target.value })}
                placeholder="e.g. Bajaj Boxer 150"
                className={inputCls}
              />
            </Field>
            <Field label="Color">
              <input
                value={data.color}
                onChange={(e) => setData({ ...data, color: e.target.value })}
                placeholder="e.g. Red"
                className={inputCls}
              />
            </Field>
          </Step>
        )}
        {step === 3 && (
          <Step title="License & documents" sub="Required for verification.">
            <Field label="Drivers license number">
              <input
                value={data.licenseNumber}
                onChange={(e) => setData({ ...data, licenseNumber: e.target.value })}
                placeholder="LAG-MC-2024-44182"
                className={inputCls}
              />
            </Field>
            <UploadCard label="Drivers license (photo)" hint="Clear photo of front side" required />
            <UploadCard label="Vehicle papers" hint="Proof of ownership or insurance" required />
            <UploadCard label="Utility bill (proof of address)" hint="Recent bill showing your address" />
          </Step>
        )}
        {step === 4 && (
          <Step title="Almost there" sub="Review and submit.">
            <div className="rounded-2xl bg-rush-soft/50 border border-rush/20 p-4">
              <p className="text-sm font-bold text-rush-deep mb-2">What happens next</p>
              <ol className="space-y-2 text-xs text-ink-soft">
                <li className="flex gap-2"><span className="font-bold text-rush-deep">1.</span> We review your documents (24-48 hours)</li>
                <li className="flex gap-2"><span className="font-bold text-rush-deep">2.</span> Vehicle and license verified</li>
                <li className="flex gap-2"><span className="font-bold text-rush-deep">3.</span> You get notified once approved</li>
                <li className="flex gap-2"><span className="font-bold text-rush-deep">4.</span> Go online and start earning</li>
              </ol>
            </div>
            <div className="mt-4 p-3 rounded-xl bg-muted/60 border border-border">
              <p className="text-xs text-ink-soft leading-relaxed">
                By submitting, you agree to Rush's Rider Code of Conduct and consent to background checks.
                Daily payouts to your Rush Wallet. Service fee: 15% per completed trip.
              </p>
            </div>
          </Step>
        )}
      </div>
      <CTABar
        step={step}
        total={total}
        loading={onboardMut.isPending}
        onNext={step === total ? finish : next}
        nextLabel={step === total ? "Submit application" : "Continue"}
        disabled={
          step === 1 ? !data.phone || !data.location || data.mobility.length === 0 :
          step === 2 ? !data.plate || !data.vehicleModel :
          step === 3 ? !data.licenseNumber :
          false
        }
      />
    </div>
  );
}

// ============== Shared building blocks ==============

function BackHeader({
  onBack,
  title,
  step,
  total,
  icon,
}: {
  onBack: () => void;
  title: string;
  step?: number;
  total?: number;
  icon?: React.ReactNode;
}) {
  return (
    <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border">
      <div className={`mx-auto ${CONTENT_WIDTH} px-4 py-3 flex items-center gap-3`}>
        <button
          type="button"
          onClick={onBack}
          className="h-9 w-9 rounded-full bg-card border border-border shadow-card hover:bg-muted flex items-center justify-center cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          aria-label="Go back"
        >
          <ChevronLeft className="h-5 w-5 text-ink" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-base font-bold text-ink truncate">{title}</h1>
          {step && total && (
            <p className="text-[10px] font-semibold text-ink-soft">Step {step} of {total}</p>
          )}
        </div>
        <div className="h-9 w-9 rounded-xl bg-rush-soft text-rush-deep flex items-center justify-center shrink-0">
          {icon ?? <Store className="h-4 w-4" />}
        </div>
      </div>
    </div>
  );
}

function Step({
  title,
  sub,
  children,
}: {
  title: string;
  sub: string;
  children: React.ReactNode;
}) {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
      <h2 className="text-lg font-extrabold text-ink tracking-tight">{title}</h2>
      <p className="text-xs text-ink-soft mt-0.5 mb-4">{sub}</p>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs font-bold text-ink mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function VisibilityOption({
  icon,
  title,
  description,
  active,
  onClick,
}: {
  icon: string;
  title: string;
  description: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-3 p-3 rounded-2xl border-2 text-left transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
        active ? "border-rush bg-rush-soft/60 shadow-card" : "border-border hover:border-ink-soft/30"
      }`}
    >
      <div className={`h-10 w-10 rounded-xl flex items-center justify-center text-xl shrink-0 ${active ? "bg-rush-deep text-white" : "bg-muted"}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-ink">{title}</p>
        <p className="text-[11px] text-ink-soft">{description}</p>
      </div>
      {active && <Check className="h-4 w-4 text-rush-deep shrink-0" />}
    </button>
  );
}

function UploadCard({
  label,
  hint,
  required,
}: {
  label: string;
  hint: string;
  required?: boolean;
}) {
  return (
    <button
      type="button"
      className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-dashed border-border hover:border-rush hover:bg-rush-soft/30 transition-colors text-left cursor-pointer"
    >
      <div className="h-10 w-10 rounded-xl bg-muted flex items-center justify-center shrink-0">
        <svg className="h-5 w-5 text-ink-soft" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.66-.9l.8-1.2a2 2 0 011.66-.9h5.9a2 2 0 011.66.9l.8 1.2a2 2 0 001.66.9H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
          <circle cx="12" cy="13" r="3" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-ink">
          {label} {required && <span className="text-destructive">*</span>}
        </p>
        <p className="text-[10px] text-ink-soft">{hint}</p>
      </div>
      <span className="text-[10px] font-semibold text-rush-deep shrink-0">Upload</span>
    </button>
  );
}

function CTABar({
  step,
  total,
  loading,
  onNext,
  nextLabel,
  disabled,
}: {
  step: number;
  total: number;
  loading: boolean;
  onNext: () => void;
  nextLabel: string;
  disabled?: boolean;
}) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border safe-bottom">
      <div className={`mx-auto ${CONTENT_WIDTH} px-4 py-3 flex items-center gap-3`}>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-semibold text-ink-soft">Step {step} of {total}</p>
          <div className="h-1.5 bg-muted rounded-full mt-1 overflow-hidden">
            <div
              className="h-full rush-gradient transition-all"
              style={{ width: `${(step / total) * 100}%` }}
            />
          </div>
        </div>
        <button
          type="button"
          onClick={onNext}
          disabled={loading || disabled}
          className="cta-primary h-12 px-6 rounded-xl text-sm disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none shrink-0"
        >
          {loading && <Loader2 className="h-4 w-4 animate-spin" />}
          {nextLabel}
          {!loading && <ChevronRight className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}
