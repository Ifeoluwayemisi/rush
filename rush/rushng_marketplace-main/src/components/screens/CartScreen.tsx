"use client";

import { Trash2, Minus, Plus, ShoppingBag, Store } from "lucide-react";
import { useRush } from "@/lib/store";
import { CONTENT_WIDTH } from "@/lib/layout";
import { naira } from "@/lib/data";
import { EmptyState } from "@/components/shared/Cards";
import { BackHeader } from "@/components/shared/BackHeader";

// BackHeader moved to @/components/shared/BackHeader; re-exported here
// so existing `import { BackHeader } from "./CartScreen"` call sites
// keep working unchanged.
export { BackHeader };

export function CartScreen() {
  const { cart, updateQuantity, removeFromCart, cartSubtotal, navigate, back } = useRush();

  // Group by vendor
  const grouped = cart.reduce<Record<string, typeof cart>>((acc, item) => {
    (acc[item.vendorId] ||= []).push(item);
    return acc;
  }, {});

  const subtotal = cartSubtotal();

  if (cart.length === 0) {
    return (
      <div className="pb-6">
        <BackHeader title="Your cart" onBack={back} />
        <EmptyState
          icon={<ShoppingBag className="h-6 w-6" />}
          title="Your cart is empty"
          description="Browse products from local vendors and add them to your cart."
          actionLabel="Browse shop"
          onAction={() => navigate("shop")}
        />
      </div>
    );
  }

  return (
    <div className="pb-32">
      <BackHeader title="Your cart" onBack={back} />

      <div className="px-4 space-y-4">
        {Object.entries(grouped).map(([vendorId, items]) => (
          <div key={vendorId} className="rounded-2xl bg-card border border-border shadow-card overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2.5 bg-muted/40 border-b border-border">
              <Store className="h-4 w-4 text-rush" />
              <button
                onClick={() => navigate("store", { storeSlug: items[0].vendorId })}
                className="text-xs font-bold text-ink hover:text-rush cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring rounded"
              >
                {items[0].vendorName}
              </button>
            </div>
            <div className="divide-y divide-border">
              {items.map((item) => (
                <div key={item.productId} className="flex items-center gap-3 p-3">
                  <div className="h-14 w-14 sm:h-16 sm:w-16 rounded-lg overflow-hidden bg-muted shrink-0">
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-ink line-clamp-2">{item.name}</p>
                    <p className="text-sm font-bold text-rush mt-0.5">{naira(item.price)}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <button
                      onClick={() => removeFromCart(item.productId)}
                      className="p-1.5 rounded-lg text-ink-soft hover:text-destructive transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                      aria-label={`Remove ${item.name} from cart`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <div className="flex items-center gap-1 bg-muted rounded-md p-0.5">
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity - 1)}
                        className="h-7 w-7 rounded bg-background flex items-center justify-center shadow-sm cursor-pointer transition-colors hover:bg-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                        aria-label={`Decrease quantity of ${item.name}`}
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="text-xs font-bold w-5 text-center" aria-live="polite">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.productId, item.quantity + 1)}
                        className="h-7 w-7 rounded bg-background flex items-center justify-center shadow-sm cursor-pointer transition-colors hover:bg-card focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
                        aria-label={`Increase quantity of ${item.name}`}
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Summary */}
      <div className="px-4 mt-4">
        <div className="rounded-2xl bg-card border border-border shadow-card p-4">
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-ink-soft">Subtotal</span>
              <span className="font-semibold text-ink">{naira(subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-ink-soft">Delivery</span>
              <span className="font-semibold text-ink">Calculated at checkout</span>
            </div>
          </div>
          <div className="mt-3 rounded-xl bg-rush-soft/60 px-3 py-2 flex justify-between items-center">
            <span className="text-sm font-bold text-ink">Total</span>
            <span className="text-base font-extrabold text-rush-deep">{naira(subtotal)}</span>
          </div>
        </div>
      </div>

      {/* CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border safe-bottom">
        <div className={`mx-auto ${CONTENT_WIDTH} px-4 py-3 flex items-center gap-3`}>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-ink-soft">Total</p>
            <p className="text-base font-extrabold text-ink truncate">{naira(subtotal)}</p>
          </div>
          <button
            onClick={() => navigate("checkout")}
            className="cta-primary h-12 px-6 rounded-xl text-sm shrink-0"
          >
            Checkout
          </button>
        </div>
      </div>
    </div>
  );
}
