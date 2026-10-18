"use client";

import { useState, useRef, useEffect } from "react";
import { Search, Bell, MapPin, LogIn, X } from "lucide-react";
import { useRush } from "@/lib/store";
import { RushLogo } from "@/components/RushLogo";
import { NameAvatar } from "@/components/NameAvatar";
import { CONTENT_WIDTH } from "@/lib/layout";
import {
  useNotifications,
  useMarkNotificationsRead,
  type AppNotification,
} from "@/lib/hooks";

/**
 * TopBar
 *
 * The persistent top header shown on most screens. It always renders the
 * logo, notifications bell, and account avatar/sign-in button. The search
 * field and the "deliver to" location row are optional — pass
 * `hideSearch` to suppress them on screens where search doesn't make
 * sense (Sell, Activity, Account — those are dashboard-style screens
 * where the user is managing their own stuff, not browsing the
 * marketplace).
 */
export function TopBar({ hideSearch = false }: { hideSearch?: boolean }) {
  const { user, navigate, pushToast } = useRush();
  const [bellOpen, setBellOpen] = useState(false);
  const bellRef = useRef<HTMLDivElement>(null);

  const { data: notifData } = useNotifications();
  const markReadMut = useMarkNotificationsRead();
  const unreadCount = notifData?.unreadCount ?? 0;
  const notifications = notifData?.notifications ?? [];

  // Close the bell popover on outside click.
  useEffect(() => {
    if (!bellOpen) return;
    const handler = (e: MouseEvent) => {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [bellOpen]);

  const handleBellClick = () => {
    setBellOpen((v) => !v);
    // If opening and there are unread notifications, mark them read
    // after a short delay (so the user sees the unread state briefly).
    if (!bellOpen && unreadCount > 0) {
      setTimeout(() => markReadMut.mutate(), 800);
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-background/95 backdrop-blur-md border-b border-border">
      <div className={`mx-auto ${CONTENT_WIDTH} px-4 pt-3 pb-2.5`}>
        <div className="flex items-center justify-between mb-2.5">
          <RushLogo size={40} />

          <div className="flex items-center gap-1.5">
            <div className="relative" ref={bellRef}>
              <button
                onClick={user ? handleBellClick : () => pushToast({ title: "Sign in to see notifications" })}
                className="relative h-9 w-9 rounded-full flex items-center justify-center hover:bg-muted transition-colors"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5 text-ink-soft" />
                {unreadCount > 0 && (
                  <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-rush text-white text-[10px] font-bold flex items-center justify-center">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>
              {bellOpen && user && (
                <div className="absolute right-0 top-full mt-1 w-80 max-w-[calc(100vw-2rem)] rounded-2xl bg-card border border-border shadow-lg overflow-hidden z-50">
                  <div className="flex items-center justify-between px-4 py-2.5 border-b border-border bg-muted/30">
                    <p className="text-sm font-bold text-ink">Notifications</p>
                    <button
                      onClick={() => setBellOpen(false)}
                      className="text-ink-soft hover:text-ink"
                      aria-label="Close"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-sm text-ink-soft">
                        No notifications yet
                      </div>
                    ) : (
                      notifications.slice(0, 10).map((n) => (
                        <NotificationItem
                          key={n.id}
                          notification={n}
                          onNavigate={(view, params) => {
                            setBellOpen(false);
                            // @ts-expect-error navigate accepts NavParams but our link is Record<string,string>
                            navigate(view, params);
                          }}
                        />
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            {user ? (
              <button
                onClick={() => navigate("account")}
                className="rounded-full ring-2 ring-rush/20 overflow-hidden"
                aria-label="Account"
              >
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="h-9 w-9 object-cover"
                  />
                ) : (
                  <NameAvatar name={user.name} size={36} />
                )}
              </button>
            ) : (
              <button
                onClick={() => navigate("account")}
                className="h-9 px-3 rounded-full rush-gradient text-white text-xs font-bold shadow-rush flex items-center gap-1"
              >
                <LogIn className="h-3.5 w-3.5" /> Sign in
              </button>
            )}
          </div>
        </div>

        {!hideSearch && (
          <>
            <button
              onClick={() => navigate("search")}
              className="w-full flex items-center gap-2.5 bg-muted rounded-xl px-3.5 py-2.5 text-left hover:bg-muted/80 transition-colors"
            >
              <Search className="h-4 w-4 text-ink-soft" />
              <span className="text-sm text-ink-soft">
                Search products, stores, services…
              </span>
            </button>

            <div className="flex items-center gap-1 mt-2 text-xs text-ink-soft">
              <MapPin className="h-3.5 w-3.5 text-rush" />
              <span className="font-medium">Deliver to</span>
              <button
                onClick={() => navigate("account")}
                className="font-semibold text-ink underline-offset-2 hover:underline"
              >
                {user?.location || "Lagos"}
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}

function NotificationItem({
  notification,
  onNavigate,
}: {
  notification: AppNotification;
  onNavigate: (view: string, params?: Record<string, string>) => void;
}) {
  const time = new Date(notification.createdAt).toLocaleString("en-NG", {
    hour: "numeric",
    minute: "2-digit",
    day: "numeric",
    month: "short",
  });
  return (
    <button
      onClick={() => {
        if (notification.link) {
          onNavigate(notification.link.view, notification.link.params);
        }
      }}
      className={`w-full text-left px-4 py-2.5 border-b border-border last:border-0 hover:bg-muted/40 transition-colors ${
        !notification.read ? "bg-rush-soft/30" : ""
      }`}
    >
      <div className="flex items-start gap-2">
        {!notification.read && (
          <span className="mt-1.5 h-2 w-2 rounded-full bg-rush shrink-0" />
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-ink truncate">
            {notification.title}
          </p>
          {notification.body && (
            <p className="text-xs text-ink-soft line-clamp-2">{notification.body}</p>
          )}
          <p className="text-[10px] text-ink-soft/70 mt-0.5">{time}</p>
        </div>
      </div>
    </button>
  );
}
