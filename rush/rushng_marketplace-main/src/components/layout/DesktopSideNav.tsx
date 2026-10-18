"use client";

import { useRush } from "@/lib/store";
import { NAV_TABS } from "./nav-tabs";

// Desktop only — a 5-icon bar stretched across a 1920px screen doesn't
// become "desktop navigation" just by getting wider, so this replaces
// BottomNav entirely at lg+ rather than resizing it.
export function DesktopSideNav() {
  const { view, navigate } = useRush();

  return (
    <aside className="hidden lg:flex w-56 shrink-0 flex-col gap-1 py-6 pr-4 self-start">
      {NAV_TABS.map((tab) => {
        const isActive = tab.match.includes(view);
        const Icon = tab.icon;
        return (
          <button
            key={tab.id}
            onClick={() => navigate(tab.id)}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-colors ${
              isActive ? "bg-rush-soft text-rush" : "text-ink-soft hover:bg-muted hover:text-ink"
            }`}
            aria-current={isActive ? "page" : undefined}
          >
            <Icon className="h-[18px] w-[18px]" strokeWidth={isActive ? 2.5 : 2} />
            {tab.label}
          </button>
        );
      })}
    </aside>
  );
}
