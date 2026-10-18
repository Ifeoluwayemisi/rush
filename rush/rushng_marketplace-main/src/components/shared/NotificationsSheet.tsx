"use client";

import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Package, Car, Wallet, Shield, Bell, CheckCheck } from "lucide-react";
import { api } from "@/lib/api-client";
import { useRush } from "@/lib/store";
import { Button } from "@/components/ui/button";

export function NotificationsSheet({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const { navigate } = useRush();
  const [notifications, setNotifications] = useState<any[]>([]);

  async function load() {
    try {
      const res = await api.get<{ notifications: any[] }>("/api/notifications");
      setNotifications(res.notifications || []);
    } catch {
      setNotifications([]);
    }
  }

  useEffect(() => {
    if (open) load();
  }, [open]);

  async function markAllRead() {
    try {
      await api.post("/api/notifications", { markAllRead: true });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch {}
  }

  function getIcon(type: string) {
    switch (type) {
      case "ORDER": return <Package className="h-4 w-4 text-rush" />;
      case "RIDE": return <Car className="h-4 w-4 text-rush" />;
      case "WALLET_UPDATE":
      case "PAYOUT": return <Wallet className="h-4 w-4 text-rush" />;
      case "KYC": return <Shield className="h-4 w-4 text-rush" />;
      default: return <Bell className="h-4 w-4 text-rush" />;
    }
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="max-h-[85vh] overflow-y-auto rounded-t-2xl">
        <SheetHeader className="flex flex-row items-center justify-between pb-2 border-b border-border">
          <SheetTitle>Notifications</SheetTitle>
          {notifications.some((n) => !n.read) && (
            <Button variant="ghost" size="sm" onClick={markAllRead} className="text-xs flex gap-1">
              <CheckCheck className="h-3.5 w-3.5" /> Mark all read
            </Button>
          )}
        </SheetHeader>

        <div className="space-y-2 py-4">
          {notifications.length === 0 ? (
            <p className="text-center py-8 text-sm text-ink-soft">No notifications yet</p>
          ) : (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => {
                  if (n.link) navigate(n.link);
                  onOpenChange(false);
                }}
                className={`p-3 rounded-xl border flex items-start gap-3 cursor-pointer ${
                  n.read ? "bg-card border-border" : "bg-rush-soft/20 border-rush/30"
                }`}
              >
                <div className="mt-0.5">{getIcon(n.type)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-ink">{n.title}</p>
                  <p className="text-xs text-ink-soft mt-0.5">{n.message}</p>
                </div>
                {!n.read && <span className="h-2 w-2 rounded-full bg-rush mt-1" />}
              </div>
            ))
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
