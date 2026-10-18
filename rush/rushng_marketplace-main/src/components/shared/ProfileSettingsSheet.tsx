"use client";

import { useState, useEffect } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useRush } from "@/lib/store";
import { api } from "@/lib/api-client";
import { MapPin, Lock, Bell, Trash2, Plus, ShieldCheck } from "lucide-react";

interface ProfileSettingsSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NOTIFICATION_COPY: Record<string, { label: string; description: string }> = {
  orders: { label: "Orders", description: "Confirmations, status changes, and delivery updates" },
  rides: { label: "Rides", description: "Driver assignment and trip status" },
  wallet: { label: "Wallet", description: "Top-ups, withdrawals, and payment receipts" },
  marketing: { label: "Marketing", description: "Offers, promos, and product news" },
};

export function ProfileSettingsSheet({ open, onOpenChange }: ProfileSettingsSheetProps) {
  const { pushToast } = useRush();
  const [tab, setTab] = useState<"addresses" | "security" | "notifications">("addresses");

  // Address state
  const [addresses, setAddresses] = useState<any[]>([]);
  const [newLabel, setNewLabel] = useState("Home");
  const [newAddress, setNewAddress] = useState("");
  const [addingAddress, setAddingAddress] = useState(false);

  // Security state
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  // Notification state
  const [prefs, setPrefs] = useState({ orders: true, rides: true, wallet: true, marketing: false });

  useEffect(() => {
    if (open) {
      api.get<{ addresses: any[] }>("/api/addresses").then((r) => setAddresses(r.addresses || [])).catch(() => {});
      api.get<{ preferences: any }>("/api/notifications/preferences").then((r) => setPrefs(r.preferences)).catch(() => {});
    }
  }, [open]);

  async function handleAddAddress() {
    if (!newAddress) return;
    try {
      const res = await api.post<{ address: any }>("/api/addresses", { label: newLabel, address: newAddress });
      setAddresses((prev) => [...prev, res.address]);
      setNewAddress("");
      setAddingAddress(false);
      pushToast({ title: "Address added" });
    } catch (e: any) {
      pushToast({ title: "Could not add address", description: e.message });
    }
  }

  async function handleDeleteAddress(id: string) {
    try {
      await api.delete(`/api/addresses?id=${encodeURIComponent(id)}`);
      setAddresses((prev) => prev.filter((a) => a.id !== id));
      pushToast({ title: "Address removed" });
    } catch (e: any) {
      pushToast({ title: "Failed to delete", description: e.message });
    }
  }

  async function handleChangePassword() {
    if (!oldPassword || !newPassword) return;
    setSavingPassword(true);
    try {
      await api.post("/api/auth/change-password", { oldPassword, newPassword });
      pushToast({ title: "Password updated successfully" });
      setOldPassword("");
      setNewPassword("");
    } catch (e: any) {
      pushToast({ title: "Password update failed", description: e.message });
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleTogglePref(key: keyof typeof prefs) {
    const updated = { ...prefs, [key]: !prefs[key] };
    setPrefs(updated);
    try {
      await api.patch("/api/notifications/preferences", { [key]: updated[key] });
    } catch {
      // Roll back on failure so the UI doesn't lie about saved state.
      setPrefs(prefs);
      pushToast({ title: "Couldn't save that preference" });
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[88vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader>
          <SheetTitle>Profile Settings</SheetTitle>
        </SheetHeader>

        <div className="px-4 pb-6 pt-2 space-y-4">
          {/* Tab toggle — matches the Fund/Withdraw pattern used in WalletSheet */}
          <div className="flex gap-2">
            {([
              { key: "addresses", label: "Addresses" },
              { key: "security", label: "Security" },
              { key: "notifications", label: "Notifications" },
            ] as const).map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`flex-1 py-2.5 rounded-xl text-xs font-bold transition-colors ${
                  tab === t.key ? "rush-gradient text-white shadow-rush" : "bg-muted text-ink-soft"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          {/* ─── Addresses ─────────────────────────────────────────── */}
          {tab === "addresses" && (
            <div className="space-y-3">
              {addresses.length === 0 && !addingAddress && (
                <div className="rounded-xl border-2 border-dashed border-border p-6 text-center">
                  <MapPin className="h-5 w-5 text-ink-soft mx-auto mb-2" />
                  <p className="text-sm font-semibold text-ink">No saved addresses yet</p>
                  <p className="text-[11px] text-ink-soft mt-0.5">Add one to speed up checkout</p>
                </div>
              )}

              {addresses.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-3 p-3 rounded-xl border border-border bg-card"
                >
                  <div className="h-9 w-9 rounded-xl bg-rush-soft text-rush flex items-center justify-center shrink-0">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-ink">{a.label}</p>
                    <p className="text-[11px] text-ink-soft truncate">{a.address}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteAddress(a.id)}
                    className="h-8 w-8 rounded-lg flex items-center justify-center text-ink-soft hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                    aria-label={`Remove ${a.label} address`}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}

              {addingAddress ? (
                <div className="rounded-xl bg-muted/40 p-3 space-y-3">
                  <div>
                    <label className="text-[11px] font-semibold text-ink-soft mb-1 block">Label</label>
                    <Input
                      placeholder="Home, Work, etc."
                      value={newLabel}
                      onChange={(e) => setNewLabel(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-ink-soft mb-1 block">Full address</label>
                    <Input
                      placeholder="Street, area, city"
                      value={newAddress}
                      onChange={(e) => setNewAddress(e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleAddAddress} disabled={!newAddress}>
                      Save address
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setAddingAddress(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setAddingAddress(true)}
                  className="w-full text-left rounded-xl border-2 border-dashed border-border p-4 hover:border-rush hover:bg-rush-soft/30 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-xl bg-muted text-ink-soft flex items-center justify-center">
                      <Plus className="h-4 w-4" />
                    </div>
                    <p className="text-sm font-semibold text-ink">Add address</p>
                  </div>
                </button>
              )}
            </div>
          )}

          {/* ─── Security ──────────────────────────────────────────── */}
          {tab === "security" && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-ink-soft">
                <Lock className="h-4 w-4" />
                <p className="text-[11px]">Choose a new password with at least 8 characters.</p>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="text-[11px] font-semibold text-ink-soft mb-1 block">Current password</label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-[11px] font-semibold text-ink-soft mb-1 block">New password</label>
                  <Input
                    type="password"
                    placeholder="••••••••"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                  />
                </div>
              </div>

              <Button
                className="w-full"
                disabled={savingPassword || !oldPassword || !newPassword}
                onClick={handleChangePassword}
              >
                {savingPassword ? "Updating…" : "Update password"}
              </Button>
            </div>
          )}

          {/* ─── Notifications ─────────────────────────────────────── */}
          {tab === "notifications" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2 text-ink-soft">
                <Bell className="h-4 w-4" />
                <p className="text-[11px]">Choose what you'd like to be notified about.</p>
              </div>

              {Object.keys(prefs).map((key) => {
                const copy = NOTIFICATION_COPY[key] ?? { label: key, description: "" };
                return (
                  <div
                    key={key}
                    className="flex items-center justify-between gap-3 p-3 rounded-xl border border-border bg-card"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-ink">{copy.label}</p>
                      {copy.description && (
                        <p className="text-[11px] text-ink-soft mt-0.5">{copy.description}</p>
                      )}
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={(prefs as any)[key]}
                      aria-label={`${copy.label} notifications`}
                      onClick={() => handleTogglePref(key as any)}
                      className={`shrink-0 h-6 w-11 rounded-full transition-colors relative ${
                        (prefs as any)[key] ? "rush-gradient" : "bg-muted"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
                          (prefs as any)[key] ? "translate-x-[22px]" : "translate-x-0.5"
                        }`}
                      />
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
