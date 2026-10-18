"use client";

import { Plus } from "lucide-react";
import { useRush } from "@/lib/store";
import { NAV_TABS } from "./nav-tabs";
import { CONTENT_WIDTH } from "@/lib/layout";

// Mobile/tablet only — DesktopSideNav takes over at the lg breakpoint.
export function BottomNav() {
  const { view, navigate } = useRush();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 bg-background/95 backdrop-blur-lg border-t border-border safe-bottom lg:hidden"
      aria-label="Primary"
    >
      <div className={`mx-auto ${CONTENT_WIDTH} px-2 grid grid-cols-5 items-stretch`}>
        {NAV_TABS.map((tab) => {
          const isActive = tab.match.includes(view);
          const Icon = tab.icon;

          // Sell is the prominent center button
          if (tab.id === "sell") {
            return (
              <button
                key={tab.id}
                onClick={() => navigate("sell")}
                className="flex flex-col items-center justify-center py-1.5 gap-0.5 group"
                aria-label="Sell or earn on Rush"
              >
                <div
                  className={`h-9 w-9 rounded-full flex items-center justify-center transition-all ${
                    isActive
                      ? "rush-gradient shadow-rush scale-105"
                      : "rush-gradient shadow-rush group-active:scale-95"
                  }`}
                >
                  <Plus className="h-5 w-5 text-white" strokeWidth={2.5} />
                </div>
                <span
                  className={`text-[10px] font-semibold ${
                    isActive ? "text-rush" : "text-ink-soft"
                  }`}
                >
                  Sell
                </span>
              </button>
            );
          }

          return (
            <button
              key={tab.id}
              onClick={() => navigate(tab.id)}
              className="flex flex-col items-center justify-center py-1.5 gap-0.5 group"
              aria-label={tab.label}
              aria-current={isActive ? "page" : undefined}
            >
              <div
                className={`h-7 w-7 flex items-center justify-center rounded-lg transition-all ${
                  isActive ? "bg-rush-soft" : "group-active:bg-muted"
                }`}
              >
                <Icon
                  className={`h-[18px] w-[18px] transition-colors ${
                    isActive ? "text-rush" : "text-ink-soft"
                  }`}
                  strokeWidth={isActive ? 2.5 : 2}
                />
              </div>
              <span
                className={`text-[10px] font-medium ${
                  isActive ? "text-rush" : "text-ink-soft"
                }`}
              >
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
