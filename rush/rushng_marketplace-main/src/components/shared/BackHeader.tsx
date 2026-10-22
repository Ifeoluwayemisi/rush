"use client";

import { ChevronLeft } from "lucide-react";
import { CONTENT_WIDTH } from "@/lib/layout";

/**
 * Shared sticky back-header used by detail screens (cart, checkout,
 * store, product, dashboards, tracking…).
 *
 * Historically lived in CartScreen.tsx and was re-exported from
 * there; it now lives in shared/ so screens can import it directly.
 * CartScreen still re-exports it for backward compatibility with
 * existing `import { BackHeader } from "./CartScreen"` call sites.
 */
export function BackHeader({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-md border-b border-border">
      <div className={`mx-auto ${CONTENT_WIDTH} px-4 py-3 flex items-center gap-3`}>
        <button
          onClick={onBack}
          className="h-8 w-8 rounded-full hover:bg-muted flex items-center justify-center cursor-pointer"
          aria-label="Go back"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
        <h1 className="text-base font-extrabold text-ink tracking-tight">{title}</h1>
      </div>
    </div>
  );
}
