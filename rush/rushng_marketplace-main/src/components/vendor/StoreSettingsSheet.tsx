"use client";

import { useState, useEffect } from "react";
import { Loader2, ShieldCheck } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useRush } from "@/lib/store";
import { useStore, useUpdateStore } from "@/lib/hooks";
import { ApiError } from "@/lib/api-client";
import { SinglePhotoPicker } from "@/components/shared/SinglePhotoPicker";
import { KycVerificationSheet } from "@/components/vendor/KycVerificationSheet";
import { VerifiedBadge } from "@/components/vendor/VerifiedBadge";

interface StoreSettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  slug: string;
  initialData?: any;
}

export function StoreSettingsSheet({
  open,
  onOpenChange,
  slug,
  initialData,
}: StoreSettingsSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[92vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Store settings</SheetTitle>
        </SheetHeader>
        {open && slug && (
          <StoreSettingsForm
            key={slug}
            slug={slug}
            initialData={initialData}
            onDone={() => onOpenChange(false)}
          />
        )}
      </SheetContent>
    </Sheet>
  );
}

const STORE_CATEGORIES = [
  "Electronics", "Fashion", "Food", "Groceries", "Beauty",
  "Health", "Home", "Sports", "Books", "Toys", "Other",
];

const VISIBILITY_OPTIONS: Array<{ value: "PUBLIC" | "LINK_ONLY" | "PRIVATE"; label: string; hint: string }> = [
  { value: "PUBLIC", label: "Public", hint: "Anyone can find and browse your store" },
  { value: "LINK_ONLY", label: "Link only", hint: "Only people with the direct link" },
  { value: "PRIVATE", label: "Private", hint: "Hidden — only you can see it" },
];

function StoreSettingsForm({
  slug,
  initialData,
  onDone,
}: {
  slug: string;
  initialData?: any;
  onDone: () => void;
}) {
  const { pushToast } = useRush();
  const { data, isLoading } = useStore(slug);
  const updateStore = useUpdateStore(slug);

  // Fallback to initialData if query hasn't resolved yet
  const vendor = data?.vendor || initialData;

  const [businessName, setBusinessName] = useState(vendor?.businessName ?? "");
  const [description, setDescription] = useState(vendor?.description ?? "");
  const [category, setCategory] = useState(vendor?.category ?? "Electronics");
  const [logo, setLogo] = useState(vendor?.logo ?? "");
  const [coverImage, setCoverImage] = useState(vendor?.coverImage ?? "");
  const [phone, setPhone] = useState(vendor?.phone ?? "");
  const [whatsapp, setWhatsapp] = useState(vendor?.whatsapp ?? "");
  const [email, setEmail] = useState(vendor?.email ?? "");
  const [location, setLocation] = useState(vendor?.location ?? "");
  const [instagram, setInstagram] = useState(vendor?.instagram ?? "");
  const [tiktok, setTiktok] = useState(vendor?.tiktok ?? "");
  const [facebook, setFacebook] = useState(vendor?.facebook ?? "");
  const [themeColor, setThemeColor] = useState(vendor?.theme?.coverColor || "#FF6B1A");
  const [visibility, setVisibility] = useState<"PUBLIC" | "LINK_ONLY" | "PRIVATE">(
    vendor?.visibility ?? "PUBLIC",
  );
  const [deliveryEnabled, setDeliveryEnabled] = useState(vendor?.deliveryEnabled ?? false);
  const [deliveryFee, setDeliveryFee] = useState(
    vendor?.deliveryFee !== undefined ? String(vendor.deliveryFee) : "0",
  );
  const [deliveryTimeMin, setDeliveryTimeMin] = useState(
    vendor?.deliveryTimeMin !== undefined ? String(vendor.deliveryTimeMin) : "30",
  );
  const [error, setError] = useState<string | null>(null);

  // Sync state when fresh server data finishes loading
  useEffect(() => {
    if (!vendor) return;

    setBusinessName(vendor.businessName ?? "");
    setDescription(vendor.description ?? "");
    setCategory(vendor.category ?? "Electronics");
    setLogo(vendor.logo ?? "");
    setCoverImage(vendor.coverImage ?? "");
    setPhone(vendor.phone ?? "");
    setWhatsapp(vendor.whatsapp ?? "");
    setEmail(vendor.email ?? "");
    setLocation(vendor.location ?? "");
    setInstagram(vendor.instagram ?? "");
    setTiktok(vendor.tiktok ?? "");
    setFacebook(vendor.facebook ?? "");
    setThemeColor(vendor.theme?.coverColor || "#FF6B1A");
    setVisibility(vendor.visibility ?? "PUBLIC");
    setDeliveryEnabled(vendor.deliveryEnabled ?? false);
    setDeliveryFee(vendor.deliveryFee !== undefined ? String(vendor.deliveryFee) : "0");
    setDeliveryTimeMin(vendor.deliveryTimeMin !== undefined ? String(vendor.deliveryTimeMin) : "30");
  }, [vendor]);

  const saving = updateStore.isPending;

  if (isLoading && !vendor) {
    return (
      <div className="px-4 pb-4 pt-6 flex items-center justify-center text-ink-soft">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="px-4 pb-4 pt-6 text-center text-sm text-ink-soft">
        Couldn't load your store. Try again.
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const v = vendor!;
    if (!v) return;

    const feeNum = Number(deliveryFee);
    const timeNum = Number(deliveryTimeMin);
    if (!Number.isFinite(feeNum) || feeNum < 0) {
      setError("Delivery fee must be a non-negative number.");
      return;
    }
    if (!Number.isFinite(timeNum) || timeNum < 0) {
      setError("Delivery time must be a non-negative number.");
      return;
    }

    const patch: Record<string, unknown> = {};
    if (businessName.trim() !== v.businessName) patch.businessName = businessName.trim();
    if (description !== v.description) patch.description = description;
    if (category !== v.category) patch.category = category;
    if (logo !== (v.logo ?? "")) patch.logo = logo;
    if (coverImage !== (v.coverImage ?? "")) patch.coverImage = coverImage;
    if (phone !== (v.phone ?? "")) patch.phone = phone;
    if (whatsapp !== (v.whatsapp ?? "")) patch.whatsapp = whatsapp;
    if (email !== (v.email ?? "")) patch.email = email;
    if (location !== (v.location ?? "")) patch.location = location;
    if (instagram !== (v.instagram ?? "")) patch.instagram = instagram;
    if (tiktok !== (v.tiktok ?? "")) patch.tiktok = tiktok;
    if (facebook !== (v.facebook ?? "")) patch.facebook = facebook;
    if (themeColor !== (v.theme?.coverColor || "#FF6B1A")) patch.themeColor = themeColor;
    if (visibility !== v.visibility) patch.visibility = visibility;
    if (deliveryEnabled !== v.deliveryEnabled) patch.deliveryEnabled = deliveryEnabled;
    if (feeNum !== v.deliveryFee) patch.deliveryFee = feeNum;
    if (timeNum !== v.deliveryTimeMin) patch.deliveryTimeMin = timeNum;

    if (Object.keys(patch).length === 0) {
      pushToast({ title: "Nothing to save", description: "No changes made." });
      onDone();
      return;
    }

    try {
      await updateStore.mutateAsync(patch);
      pushToast({ title: "Store updated" });
      onDone();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="px-4 pb-4 space-y-5">
      {/* Brand images */}
      <section className="space-y-4">
        <div>
          <span className="block text-xs font-semibold text-ink-soft mb-1.5">
            Cover image
          </span>
          <div className="w-full max-h-36 overflow-hidden rounded-xl border border-border bg-muted/20 [&_img]:max-h-36 [&_img]:w-full [&_img]:object-cover">
            <SinglePhotoPicker
              value={coverImage}
              onChange={setCoverImage}
              shape="rect"
              aspect="16/9"
              placeholder="Upload cover banner"
            />
          </div>
          <p className="text-[10px] text-ink-soft mt-1">Recommended: 16:9 landscape banner</p>
        </div>

        <div>
          <span className="block text-xs font-semibold text-ink-soft mb-1.5">
            Store Logo
          </span>
          <div className="flex items-center gap-3">
            <SinglePhotoPicker
              value={logo}
              onChange={setLogo}
              shape="circle"
              size={72}
              placeholder="Upload logo"
            />
            <div className="text-xs text-ink-soft">
              <p className="font-semibold text-ink">Square display logo</p>
              <p className="text-[10px]">Appears in search, product tags, and vendor lists</p>
            </div>
          </div>
        </div>
      </section>

      {/* Identity */}
      <section className="space-y-3.5">
        <Field label="Business name">
          <Input value={businessName} onChange={(e) => setBusinessName(e.target.value)} placeholder="e.g. Campus Gadgets" />
        </Field>
        <Field label="Description">
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What does your store sell? What makes it special?"
            rows={3}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Category">
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            >
              {STORE_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </Field>
          <Field label="Theme color">
            <div className="flex items-center gap-2 h-9">
              <input
                type="color"
                value={themeColor}
                onChange={(e) => setThemeColor(e.target.value)}
                className="h-9 w-12 rounded-md border border-input bg-transparent cursor-pointer"
                aria-label="Theme color"
              />
              <Input value={themeColor} onChange={(e) => setThemeColor(e.target.value)} className="flex-1" />
            </div>
          </Field>
        </div>
      </section>

      {/* Contact */}
      <section className="space-y-3.5">
        <h3 className="text-xs font-bold text-ink-soft uppercase tracking-wide">Contact</h3>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Phone">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+234 …" />
          </Field>
          <Field label="WhatsApp">
            <Input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} placeholder="+234 …" />
          </Field>
        </div>
        <Field label="Email">
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="store@example.com" />
        </Field>
        <Field label="Location">
          <Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="e.g. Yaba, Lagos" />
        </Field>
      </section>

      {/* Social */}
      <section className="space-y-3.5">
        <h3 className="text-xs font-bold text-ink-soft uppercase tracking-wide">Social</h3>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Instagram">
            <Input value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder="@username" />
          </Field>
          <Field label="TikTok">
            <Input value={tiktok} onChange={(e) => setTiktok(e.target.value)} placeholder="@username" />
          </Field>
        </div>
        <Field label="Facebook">
          <Input value={facebook} onChange={(e) => setFacebook(e.target.value)} placeholder="page URL or @username" />
        </Field>
      </section>

      {/* Verification (KYC) */}
      <section className="space-y-2">
        <h3 className="text-xs font-bold text-ink-soft uppercase tracking-wide">Verification</h3>
        <KycSection slug={slug} />
      </section>

      {/* Visibility */}
      <section className="space-y-2">
        <h3 className="text-xs font-bold text-ink-soft uppercase tracking-wide">Visibility</h3>
        <div className="space-y-1.5">
          {VISIBILITY_OPTIONS.map((opt) => {
            const active = visibility === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setVisibility(opt.value)}
                className={`w-full text-left p-2.5 rounded-xl border-2 transition-colors ${
                  active ? "border-rush bg-rush-soft/40" : "border-border hover:border-ink-soft/30"
                }`}
              >
                <p className="text-sm font-bold text-ink">{opt.label}</p>
                <p className="text-[11px] text-ink-soft">{opt.hint}</p>
              </button>
            );
          })}
        </div>
      </section>

      {/* Delivery */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-ink-soft uppercase tracking-wide">Delivery</h3>
          <label className="flex items-center gap-2 text-xs font-semibold text-ink cursor-pointer">
            <input
              type="checkbox"
              checked={deliveryEnabled}
              onChange={(e) => setDeliveryEnabled(e.target.checked)}
              className="h-4 w-4 rounded border-input accent-rush"
            />
            Enabled
          </label>
        </div>
        {deliveryEnabled && (
          <div className="grid grid-cols-2 gap-3">
            <Field label="Delivery fee (₦)">
              <Input type="number" min="0" value={deliveryFee} onChange={(e) => setDeliveryFee(e.target.value)} placeholder="500" />
            </Field>
            <Field label="Delivery time (min)">
              <Input type="number" min="0" value={deliveryTimeMin} onChange={(e) => setDeliveryTimeMin(e.target.value)} placeholder="30" />
            </Field>
          </div>
        )}
      </section>

      {error && <p className="text-xs font-semibold text-destructive">{error}</p>}

      <SheetFooter className="px-0 pt-1">
        <button
          type="submit"
          disabled={saving}
          className="w-full py-3 rounded-xl rush-gradient text-white font-bold text-sm shadow-rush disabled:opacity-60 flex items-center justify-center gap-2"
        >
          {saving && <Loader2 className="h-4 w-4 animate-spin" />}
          Save changes
        </button>
      </SheetFooter>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-semibold text-ink-soft mb-1">{label}</span>
      {children}
    </label>
  );
}

function KycSection({ slug: _slug }: { slug: string }) {
  const { user } = useRush();
  const [kycOpen, setKycOpen] = useState(false);
  const kyc = (user as any)?.vendorProfile?.kyc ?? null;

  return (
    <>
      <div className="rounded-xl border border-border bg-card p-3 flex items-start gap-3">
        <div className="h-9 w-9 rounded-xl bg-rush-soft text-rush flex items-center justify-center shrink-0">
          <ShieldCheck className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          {kyc?.kycStatus === "APPROVED" ? (
            <>
              <p className="text-sm font-semibold text-ink flex items-center gap-1.5">
                Verified
                <VerifiedBadge vendor={{ kyc }} size="sm" />
              </p>
              <p className="text-[11px] text-ink-soft mt-0.5">
                Your store shows the verified badge. You have unlimited listings.
              </p>
            </>
          ) : kyc?.kycStatus === "PENDING" ? (
            <>
              <p className="text-sm font-semibold text-ink">Verification in review</p>
              <p className="text-[11px] text-ink-soft mt-0.5">
                We're reviewing your submission. You can keep selling in the meantime.
              </p>
            </>
          ) : kyc?.kycStatus === "REJECTED" ? (
            <>
              <p className="text-sm font-semibold text-destructive">Verification rejected</p>
              <p className="text-[11px] text-ink-soft mt-0.5">
                {kyc.rejectionReason || "Re-submit to unlock unlimited listings."}
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-semibold text-ink">Not verified yet</p>
              <p className="text-[11px] text-ink-soft mt-0.5">
                Verify your LASU student or staff status, or submit a government ID.
                Unverified vendors are capped at 5 listings.
              </p>
            </>
          )}
          <button
            type="button"
            onClick={() => setKycOpen(true)}
            className="mt-2 text-xs font-semibold text-rush"
          >
            {kyc?.kycStatus === "APPROVED" ? "Manage verification" : "Get verified →"}
          </button>
        </div>
      </div>

      <KycVerificationSheet
        open={kycOpen}
        onOpenChange={setKycOpen}
        kyc={kyc}
      />
    </>
  );
}
