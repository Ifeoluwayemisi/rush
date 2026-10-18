"use client";

import { useState, useEffect } from "react";
import { Heart, Trash2, Store, Package, Wrench, ChevronLeft } from "lucide-react";
import { api } from "@/lib/api-client";
import { useRush } from "@/lib/store";
import { Button } from "@/components/ui/button";

export function SavedItemsScreen({ onBack }: { onBack?: () => void }) {
  const { navigate, pushToast } = useRush();
  const [tab, setTab] = useState<"product" | "vendor" | "provider">("product");
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  async function loadItems() {
    setLoading(true);
    try {
      const res = await api.get<{ items: any[] }>(`/api/saved-items?type=${tab}`);
      setItems(res.items || []);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadItems();
  }, [tab]);

  async function handleRemove(targetId: string) {
    try {
      await api.delete(`/api/saved-items?targetId=${encodeURIComponent(targetId)}&targetType=${tab}`);
      setItems((prev) => prev.filter((i) => i.targetId !== targetId));
      pushToast({ title: "Item removed" });
    } catch (e: any) {
      pushToast({ title: "Failed to remove item", description: e.message });
    }
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 z-20 flex items-center gap-3 bg-background/80 p-4 backdrop-blur border-b border-border">
        {onBack && (
          <button onClick={onBack} className="p-1 text-ink">
            <ChevronLeft className="h-6 w-6" />
          </button>
        )}
        <h1 className="text-lg font-bold text-ink">Saved Items</h1>
      </div>

      <div className="flex border-b border-border p-2 gap-2">
        {(["product", "vendor", "provider"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg capitalize transition-colors ${
              tab === t ? "rush-gradient text-white shadow-rush" : "bg-muted text-ink-soft"
            }`}
          >
            {t}s
          </button>
        ))}
      </div>

      <div className="p-4 space-y-3">
        {loading ? (
          <p className="text-center text-sm text-ink-soft py-8">Loading saved {tab}s...</p>
        ) : items.length === 0 ? (
          <div className="text-center py-12 space-y-2">
            <Heart className="h-10 w-10 mx-auto text-ink-soft/40" />
            <p className="text-sm font-semibold text-ink">No saved {tab}s yet</p>
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-3 rounded-xl border border-border bg-card"
            >
              <div
                className="flex items-center gap-3 flex-1 cursor-pointer"
                onClick={() => {
                  if (tab === "vendor") navigate("store", { storeSlug: item.targetId });
                  if (tab === "product") navigate("product", { productId: item.targetId });
                  if (tab === "provider") navigate("provider", { storeSlug: item.targetId });
                }}
              >
                <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center text-ink-soft">
                  {tab === "product" && <Package className="h-5 w-5" />}
                  {tab === "vendor" && <Store className="h-5 w-5" />}
                  {tab === "provider" && <Wrench className="h-5 w-5" />}
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink">{item.title || item.targetId}</p>
                  <p className="text-xs text-ink-soft capitalize">{tab}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemove(item.targetId)}
                className="text-destructive hover:bg-destructive/10"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
