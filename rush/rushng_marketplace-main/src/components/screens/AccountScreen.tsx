"use client";

import { useState, useRef, useEffect } from "react";
import {
  ChevronRight,
  ShoppingBag,
  Wrench,
  Car,
  Heart,
  MapPin,
  Bell,
  Settings,
  HelpCircle,
  LogOut,
  Store,
  Wallet,
  Camera,
  Loader2,
  Trash2,
  ShieldCheck,
} from "lucide-react";
import { useRush } from "@/lib/store";
import {
  useLogout,
  useUpdateProfile,
  useUploadFile,
  useDeleteAccount,
  useDeleteStore,
} from "@/lib/hooks";
import { RushLogo } from "@/components/RushLogo";
import { NameAvatar } from "@/components/NameAvatar";
import { naira } from "@/lib/data";
import { KycVerificationSheet } from "@/components/vendor/KycVerificationSheet";
import { WalletSheet } from "@/components/vendor/WalletSheet";
import { SupportSheet } from "@/components/shared/SupportSheet";
import { NotificationsSheet } from "@/components/shared/NotificationsSheet";
import { ProfileSettingsSheet } from "@/components/shared/ProfileSettingsSheet";

export function AccountScreen() {
  const { user, navigate, pushToast } = useRush();
  const logoutMut = useLogout();
  const [editOpen, setEditOpen] = useState(false);
  const [kycOpen, setKycOpen] = useState(false);
  const [walletOpen, setWalletOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileSettingsOpen, setProfileSettingsOpen] = useState(false);

  const vendorSlug = (user as any)?.vendorProfile?.slug;
  const deleteAccountMut = useDeleteAccount();
  const deleteStoreMut = useDeleteStore(vendorSlug || "__none__");

  useEffect(() => {
    if (deleteAccountMut.isSuccess || deleteStoreMut.isSuccess) {
      window.location.href = "/";
    }
  }, [deleteAccountMut.isSuccess, deleteStoreMut.isSuccess]);

  if (!user) {
    return (
      <div className="px-4 pt-16 pb-6 text-center">
        <RushLogo size={64} clickable={false} className="mx-auto mb-4" />
        <h1 className="text-xl font-extrabold text-ink">Sign in to Rush</h1>
        <p className="text-sm text-ink-soft mt-1 mb-5">
          One account to shop, sell, offer services, and ride.
        </p>
        <button
          type="button"
          onClick={() => navigate("sell")}
          className="px-6 py-3 rounded-xl rush-gradient text-white font-bold text-sm shadow-rush"
        >
          Sign in / Create account
        </button>
      </div>
    );
  }

  const vendorCap = user.capabilities?.find((c: any) => c.type === "VENDOR");
  const providerCap = user.capabilities?.find((c: any) => c.type === "SERVICE_PROVIDER");
  const riderCap = user.capabilities?.find((c: any) => c.type === "RIDER");
  const adminCap = user.capabilities?.find((c: any) => c.type === "ADMIN" && c.status === "ACTIVE");
  const walletBalance = (user as any).wallet?.balance ?? (user as any).walletBalance ?? 0;

  const handleLogout = async () => {
    await logoutMut.mutateAsync();
    pushToast({ title: "Signed out" });
    window.location.href = "/";
  };

  const handleDeleteStore = () => {
    if (!vendorSlug) {
      pushToast({ title: "No store to delete" });
      return;
    }
    const ok = window.confirm(
      "This will permanently delete your store and ALL products in it. This cannot be undone. Continue?",
    );
    if (!ok) return;
    const typed = window.prompt('Type "DELETE" to confirm.');
    if (typed !== "DELETE") {
      pushToast({ title: "Cancelled — store was not deleted." });
      return;
    }
    deleteStoreMut.mutate(undefined, {
      onError: (err: any) => {
        pushToast({ title: "Failed to delete store", description: err?.message });
      },
    });
  };

  const handleDeleteAccount = () => {
    const ok = window.confirm(
      "This will PERMANENTLY delete your account, store, services, rides, wallet, and all related data. This CANNOT be undone. Continue?",
    );
    if (!ok) return;
    const typed = window.prompt('Type "DELETE" to confirm.');
    if (typed !== "DELETE") {
      pushToast({ title: "Cancelled — account was not deleted." });
      return;
    }
    deleteAccountMut.mutate(undefined, {
      onError: (err: any) => {
        pushToast({ title: "Failed to delete account", description: err?.message });
      },
    });
  };

  return (
    <div className="pb-6">
      <div className="px-4 pt-3 pb-2">
        <h1 className="text-xl font-extrabold text-ink tracking-tight">Account</h1>
      </div>

      {/* Profile header */}
      <div className="px-4 pt-2">
        <div className="rounded-2xl rush-gradient p-4 text-white shadow-rush relative overflow-hidden">
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10" />
          <div className="relative flex items-center gap-3">
            <div className="h-14 w-14 rounded-full ring-2 ring-white/40 overflow-hidden shrink-0">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <NameAvatar name={user.name} size={56} />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-base font-bold">{user.name}</p>
              <p className="text-xs opacity-90 flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {user.location || "Lagos"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="px-2.5 py-1.5 rounded-lg bg-white/20 text-xs font-semibold backdrop-blur-sm hover:bg-white/30 transition-colors"
            >
              Edit
            </button>
          </div>
          <div className="mt-3 pt-3 border-t border-white/20 grid grid-cols-3 gap-2 text-center">
            <div>
              <p className="text-sm font-bold">{user.capabilities?.length || 1}</p>
              <p className="text-[10px] opacity-90">Capabilities</p>
            </div>
            <div>
              <p className="text-sm font-bold">{naira(walletBalance)}</p>
              <p className="text-[10px] opacity-90">Wallet</p>
            </div>
            <div>
              <p className="text-sm font-bold">—</p>
              <p className="text-[10px] opacity-90">Reputation</p>
            </div>
          </div>
        </div>
      </div>

      {/* My activity shortcuts */}
      <section className="px-4 pt-5">
        <p className="text-xs font-semibold text-ink-soft uppercase tracking-wider mb-2">My activity</p>
        <div className="rounded-2xl bg-card border border-border shadow-card overflow-hidden divide-y divide-border">
          <Row icon={<ShoppingBag className="h-4 w-4" />} label="My orders" sub="Past and active orders" onClick={() => navigate("activity")} />
          <Row icon={<Wrench className="h-4 w-4" />} label="My services" sub="Service jobs you've booked" onClick={() => navigate("services")} />
          <Row icon={<Car className="h-4 w-4" />} label="My rides" sub="Ride history" onClick={() => navigate("ride")} />
          <Row icon={<Heart className="h-4 w-4" />} label="Saved items" sub="Stores, products, providers" onClick={() => navigate("saved-items")} />
        </div>
      </section>

      {/* My businesses */}
      <section className="px-4 pt-5">
        <p className="text-xs font-semibold text-ink-soft uppercase tracking-wider mb-2">Earn on Rush</p>
        <div className="rounded-2xl bg-card border border-border shadow-card overflow-hidden divide-y divide-border">
          {(user as any).vendorProfile || vendorCap ? (
            <Row
              icon={<Store className="h-4 w-4 text-rush" />}
              label="My Store"
              sub={(user as any).vendorProfile?.businessName || "Vendor"}
              onClick={() => navigate("vendor-dashboard")}
              badge="Active"
              badgeTone="success"
            />
          ) : (
            <Row
              icon={<Store className="h-4 w-4" />}
              label="Sell products"
              sub="Open a store"
              onClick={() => navigate("onboarding-vendor")}
            />
          )}

          {(user as any).vendorProfile && (
            <Row
              icon={<ShieldCheck className="h-4 w-4 text-rush" />}
              label={
                (user as any).vendorProfile?.kyc?.kycStatus === "APPROVED"
                  ? "Verification"
                  : (user as any).vendorProfile?.kyc?.kycStatus === "PENDING"
                  ? "Verification in review"
                  : "Get verified"
              }
              sub={
                (user as any).vendorProfile?.kyc?.kycStatus === "APPROVED"
                  ? "Your verified badge is active"
                  : (user as any).vendorProfile?.kyc?.kycStatus === "PENDING"
                  ? "Awaiting admin review of your ID"
                  : (user as any).vendorProfile?.kyc?.kycStatus === "REJECTED"
                  ? "Re-submit to unlock unlimited listings"
                  : "Verify LASU status or upload an ID"
              }
              onClick={() => setKycOpen(true)}
              badge={
                (user as any).vendorProfile?.kyc?.kycStatus === "APPROVED"
                  ? "Verified"
                  : (user as any).vendorProfile?.kyc?.kycStatus === "PENDING"
                  ? "Pending"
                  : (user as any).vendorProfile?.kyc?.kycStatus === "REJECTED"
                  ? "Rejected"
                  : undefined
              }
              badgeTone={
                (user as any).vendorProfile?.kyc?.kycStatus === "APPROVED"
                  ? "success"
                  : (user as any).vendorProfile?.kyc?.kycStatus === "PENDING"
                  ? "warning"
                  : "muted"
              }
            />
          )}

          {(user as any).providerProfile || providerCap ? (
            <Row
              icon={<Wrench className="h-4 w-4 text-rush" />}
              label="My Services"
              sub={providerCap?.status === "ACTIVE" ? "Active" : "Verification pending"}
              onClick={() => navigate("provider-dashboard")}
              badge={providerCap?.status === "ACTIVE" ? "Active" : "Pending"}
              badgeTone={providerCap?.status === "ACTIVE" ? "success" : "warning"}
            />
          ) : (
            <Row
              icon={<Wrench className="h-4 w-4" />}
              label="Offer services"
              sub="Become a service provider"
              onClick={() => navigate("onboarding-provider")}
            />
          )}

          {riderCap ? (
            <Row
              icon={<Car className="h-4 w-4 text-rush" />}
              label="Rider Account"
              sub={riderCap.status === "ACTIVE" ? "Active" : "Verification pending"}
              onClick={() => navigate("rider-dashboard")}
              badge={riderCap.status === "ACTIVE" ? "Active" : "Pending"}
              badgeTone={riderCap.status === "ACTIVE" ? "success" : "warning"}
            />
          ) : (
            <Row
              icon={<Car className="h-4 w-4" />}
              label="Ride & deliver"
              sub="Become a rider"
              onClick={() => navigate("onboarding-rider")}
            />
          )}
        </div>
      </section>

      {/* Wallet & settings */}
      <section className="px-4 pt-5">
        <p className="text-xs font-semibold text-ink-soft uppercase tracking-wider mb-2">Wallet & settings</p>
        <div className="rounded-2xl bg-card border border-border shadow-card overflow-hidden divide-y divide-border">
          <Row
            icon={<Wallet className="h-4 w-4" />}
            label="Rush Wallet"
            sub={`${naira(walletBalance)} · Top up · Withdraw`}
            onClick={() => setWalletOpen(true)}
          />
          <Row
            icon={<Bell className="h-4 w-4" />}
            label="Notifications"
            sub="History & alerts"
            onClick={() => setNotificationsOpen(true)}
          />
          <Row
            icon={<Settings className="h-4 w-4" />}
            label="Profile settings"
            sub="Addresses, security & preferences"
            onClick={() => setProfileSettingsOpen(true)}
          />
          <Row
            icon={<HelpCircle className="h-4 w-4" />}
            label="Help & support"
            sub="FAQs, contact us, report a bug"
            onClick={() => setSupportOpen(true)}
          />
        </div>
      </section>

      {/* Admin Panel */}
      {adminCap && (
        <section className="px-4 pt-5">
          <p className="text-xs font-semibold text-ink-soft uppercase tracking-wider mb-2">Internal</p>
          <div className="rounded-2xl bg-card border border-border shadow-card overflow-hidden divide-y divide-border">
            <Row
              icon={<ShieldCheck className="h-4 w-4 text-rush" />}
              label="Admin Panel"
              sub="Users, verifications, marketplace, operations"
              onClick={() => navigate("admin")}
              badge="Admin"
              badgeTone="warning"
            />
          </div>
        </section>
      )}

      {/* Sign out */}
      <div className="px-4 pt-5">
        <button
          type="button"
          onClick={handleLogout}
          disabled={logoutMut.isPending}
          className="w-full flex items-center justify-center gap-2 p-3 rounded-2xl border border-border text-destructive text-sm font-semibold bg-card disabled:opacity-60 hover:bg-destructive/5 transition-colors"
        >
          <LogOut className="h-4 w-4" /> Sign out
        </button>
      </div>

      {/* Danger zone */}
      <section className="px-4 pt-5">
        <p className="text-xs font-semibold text-destructive/80 uppercase tracking-wider mb-2">
          Danger zone
        </p>
        <div className="rounded-2xl bg-card border border-destructive/30 overflow-hidden divide-y divide-destructive/30">
          {vendorCap && (
            <button
              type="button"
              onClick={handleDeleteStore}
              disabled={deleteStoreMut.isPending}
              className="w-full flex items-center gap-3 p-3 text-left hover:bg-destructive/5 transition-colors disabled:opacity-60"
            >
              <div className="h-9 w-9 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                <Trash2 className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-destructive">
                  Delete my store
                </p>
                <p className="text-[11px] text-ink-soft line-clamp-1">
                  {deleteStoreMut.isPending
                    ? "Deleting…"
                    : "Removes your storefront and all products. Your account stays."}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-destructive/70 shrink-0" />
            </button>
          )}
          <button
            type="button"
            onClick={handleDeleteAccount}
            disabled={deleteAccountMut.isPending}
            className="w-full flex items-center gap-3 p-3 text-left hover:bg-destructive/5 transition-colors disabled:opacity-60"
          >
            <div className="h-9 w-9 rounded-xl bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
              <Trash2 className="h-4 w-4" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-destructive">
                Delete my account
              </p>
              <p className="text-[11px] text-ink-soft line-clamp-1">
                {deleteAccountMut.isPending
                  ? "Deleting…"
                  : "Permanently removes your account and all data. Cannot be undone."}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 text-destructive/70 shrink-0" />
          </button>
        </div>
      </section>

      <div className="px-4 pt-4 text-center">
        <p className="text-[10px] text-ink-soft">One account, many possibilities</p>
      </div>

      <ProfileEditSheet open={editOpen} onClose={() => setEditOpen(false)} />
      <KycVerificationSheet
        open={kycOpen}
        onOpenChange={setKycOpen}
        kyc={(user as any)?.vendorProfile?.kyc ?? null}
      />
      <WalletSheet open={walletOpen} onOpenChange={setWalletOpen} />
      <SupportSheet open={supportOpen} onOpenChange={setSupportOpen} />
      <NotificationsSheet open={notificationsOpen} onOpenChange={setNotificationsOpen} />
      <ProfileSettingsSheet open={profileSettingsOpen} onOpenChange={setProfileSettingsOpen} />
    </div>
  );
}

function Row({
  icon,
  label,
  sub,
  onClick,
  badge,
  badgeTone = "muted",
}: {
  icon: React.ReactNode;
  label: string;
  sub: string;
  onClick: () => void;
  badge?: string;
  badgeTone?: "muted" | "success" | "warning";
}) {
  const badgeCls = {
    muted: "bg-muted text-ink-soft",
    success: "bg-success/10 text-success",
    warning: "bg-warning/15 text-warning",
  }[badgeTone];

  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 hover:bg-muted/40 transition-colors text-left"
    >
      <div className="h-9 w-9 rounded-xl bg-rush-soft text-rush flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-ink">{label}</p>
        <p className="text-[11px] text-ink-soft line-clamp-1">{sub}</p>
      </div>
      {badge && (
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${badgeCls}`}>
          {badge}
        </span>
      )}
      <ChevronRight className="h-4 w-4 text-ink-soft shrink-0" />
    </button>
  );
}

function ProfileEditSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, pushToast } = useRush();
  const updateProfile = useUpdateProfile();
  const uploadMut = useUploadFile();
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");
  const [location, setLocation] = useState(user?.location || "");
  const [avatar, setAvatar] = useState(user?.avatar || "");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  if (!open || !user) return null;

  const handleAvatarPick = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      const res = await uploadMut.mutateAsync(file);
      setAvatar(res.url);
    } catch (err: any) {
      pushToast({ title: "Avatar upload failed", description: err.message });
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleSave = async () => {
    try {
      await updateProfile.mutateAsync({ name, phone, avatar, location });
      pushToast({ title: "Profile updated" });
      onClose();
    } catch (err: any) {
      pushToast({ title: "Update failed", description: err.message });
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background flex flex-col">
      <header className="flex items-center justify-between px-4 py-3 border-b border-border bg-background sticky top-0">
        <button
          type="button"
          onClick={onClose}
          className="text-ink-soft hover:text-ink text-sm font-medium"
        >
          Cancel
        </button>
        <p className="font-bold text-ink">Edit profile</p>
        <button
          type="button"
          onClick={handleSave}
          disabled={updateProfile.isPending}
          className="text-rush hover:text-rush-deep text-sm font-bold disabled:opacity-50"
        >
          {updateProfile.isPending ? "Saving…" : "Save"}
        </button>
      </header>

      <div className="flex-1 overflow-y-auto px-4 pt-6 pb-6">
        <div className="flex flex-col items-center mb-6">
          <div className="relative">
            <div className="h-24 w-24 rounded-full ring-4 ring-rush/20 overflow-hidden flex items-center justify-center">
              {avatar ? (
                <img
                  src={avatar}
                  alt={name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <NameAvatar name={name || "?"} size={96} />
              )}
            </div>
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute bottom-0 right-0 h-8 w-8 rounded-full rush-gradient text-white flex items-center justify-center shadow-rush disabled:opacity-50"
              aria-label="Upload avatar"
            >
              {uploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarPick}
            />
          </div>
          <p className="text-xs text-ink-soft mt-2">Tap to upload a new avatar</p>
        </div>

        <div className="space-y-4">
          <Field label="Name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-muted rounded-xl px-3.5 py-2.5 text-sm text-ink focus:outline-none"
              placeholder="Your name"
            />
          </Field>
          <Field label="Phone">
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-muted rounded-xl px-3.5 py-2.5 text-sm text-ink focus:outline-none"
              placeholder="+234 …"
            />
          </Field>
          <Field label="Location">
            <input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              className="w-full bg-muted rounded-xl px-3.5 py-2.5 text-sm text-ink focus:outline-none"
              placeholder="e.g. Yaba, Lagos"
            />
          </Field>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-semibold text-ink-soft mb-1.5">{label}</label>
      {children}
    </div>
  );
}
