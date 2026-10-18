"use client";

import { ChevronLeft, Phone, MessageCircle, Star, MapPin, Bike, Shield, Loader2, XCircle } from "lucide-react";
import { useRush } from "@/lib/store";
import { useOrder, useUpdateOrderStatus } from "@/lib/hooks";
import { naira } from "@/lib/data";
import { BackHeader } from "./CartScreen";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { customerCanCancel } from "@/lib/order-status";
import { ApiError } from "@/lib/api-client";

export function OrderTrackingScreen() {
  const { params, navigate, back, pushToast } = useRush();
  const { data, isLoading } = useOrder(params.orderId);
  const updateOrderStatus = useUpdateOrderStatus();

  if (isLoading) {
    return (
      <div>
        <BackHeader title="Order tracking" onBack={back} />
        <div className="pt-16 flex items-center justify-center text-ink-soft">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </div>
    );
  }

  const order = data?.order;

  if (!order) {
    return (
      <div className="pb-6">
        <BackHeader title="Order tracking" onBack={back} />
        <p className="p-6 text-center text-sm text-ink-soft">Order not found.</p>
      </div>
    );
  }

  const currentStepIndex = order.timeline.findIndex((t) => !t.completed);
  const lastCompletedIndex = currentStepIndex === -1 ? order.timeline.length - 1 : currentStepIndex - 1;
  const isDelivered = order.status === "DELIVERED" || order.status === "PICKED_UP";
  const canCancelNow = customerCanCancel(order.status);

  async function handleCancel() {
    if (!order) return;
    if (!window.confirm("Cancel this order? This can't be undone.")) return;
    try {
      await updateOrderStatus.mutateAsync({ id: order.id, status: "CANCELLED" });
      pushToast({ title: "Order cancelled" });
    } catch (err) {
      pushToast({ title: "Couldn't cancel order", description: err instanceof ApiError ? err.message : undefined });
    }
  }

  return (
    <div className="pb-6">
      <BackHeader title={`Order ${order.code}`} onBack={back} />

      {/* Live status hero */}
      <div className="mx-4 mt-4 rounded-2xl rush-gradient p-4 text-white shadow-rush relative overflow-hidden">
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10" />
        <div className="relative">
          <p className="text-[11px] font-semibold uppercase tracking-wider opacity-90">
            {order.status.replace(/_/g, " ")}
          </p>
          <h2 className="text-lg font-bold mt-0.5 leading-tight">
            {isDelivered
              ? "Order delivered"
              : order.status === "ON_THE_WAY"
              ? "Your order is on the way"
              : order.status === "PREPARING"
              ? "Vendor is preparing your order"
              : "Order placed"}
          </h2>
          <p className="text-xs opacity-90 mt-0.5">
            ETA: ~15 mins · {order.vendorName}
          </p>

          {order.rider && (
            <div className="mt-3 flex items-center gap-2.5 bg-white/15 backdrop-blur-sm rounded-xl p-2.5">
              <Avatar className="h-10 w-10 ring-2 ring-white/30">
                {order.rider.avatar && <AvatarImage src={order.rider.avatar} alt={order.rider.name} />}
                <AvatarFallback>{order.rider.name[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold">{order.rider.name}</p>
                <p className="text-[11px] opacity-90 flex items-center gap-1.5">
                  <Bike className="h-3 w-3" /> ·
                  <span className="flex items-center gap-0.5">
                    <Star className="h-3 w-3 fill-white" /> {order.rider.rating}
                  </span>
                </p>
              </div>
              <div className="flex gap-1.5">
                <button
                  onClick={() => pushToast({ title: "Calling rider…" })}
                  className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center"
                  aria-label="Call rider"
                >
                  <Phone className="h-4 w-4" />
                </button>
                <button
                  onClick={() => pushToast({ title: "Opening chat…" })}
                  className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center"
                  aria-label="Chat rider"
                >
                  <MessageCircle className="h-4 w-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Map placeholder */}
      {!isDelivered && (
        <div className="mx-4 mt-4 rounded-2xl overflow-hidden h-32 bg-gradient-to-br from-emerald-50 to-emerald-100 relative">
          <div
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: `
                linear-gradient(90deg, transparent 49%, #d1d5db 49%, #d1d5db 51%, transparent 51%),
                linear-gradient(0deg, transparent 49%, #d1d5db 49%, #d1d5db 51%, transparent 51%)
              `,
              backgroundSize: "32px 32px",
            }}
          />
          <div className="absolute top-1/2 left-4 -translate-y-1/2 flex flex-col items-center">
            <div className="h-3 w-3 rounded-full bg-rush ring-2 ring-white" />
          </div>
          <div className="absolute top-1/2 right-4 -translate-y-1/2">
            <MapPin className="h-6 w-6 text-ink fill-ink/30" />
          </div>
          <svg
            className="absolute inset-0 w-full h-full"
            preserveAspectRatio="none"
            viewBox="0 0 100 100"
          >
            <path
              d="M 10 50 Q 50 20 90 50"
              stroke="#FF6B1A"
              strokeWidth="2"
              strokeDasharray="4 3"
              fill="none"
              strokeLinecap="round"
            />
          </svg>
        </div>
      )}

      {/* Timeline */}
      <div className="mx-4 mt-5 rounded-2xl bg-card border border-border shadow-card p-4">
        <h3 className="text-sm font-bold text-ink mb-3">Order progress</h3>
        <ol className="space-y-0">
          {order.timeline.map((step, i) => {
            const isCompleted = step.completed;
            const isCurrent = i === lastCompletedIndex + 1 && !step.completed;
            return (
              <li key={i} className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div
                    className={`h-5 w-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                      isCompleted
                        ? "bg-success text-white"
                        : isCurrent
                        ? "bg-rush text-white ring-4 ring-rush/20"
                        : "bg-muted text-ink-soft"
                    }`}
                  >
                    {isCompleted ? "✓" : i + 1}
                  </div>
                  {i < order.timeline.length - 1 && (
                    <div className={`w-0.5 h-7 ${isCompleted ? "bg-success" : "bg-border"}`} />
                  )}
                </div>
                <div className="pb-4">
                  <p
                    className={`text-sm ${
                      isCompleted ? "font-semibold text-ink" : isCurrent ? "font-bold text-rush" : "text-ink-soft"
                    }`}
                  >
                    {step.label}
                  </p>
                  <p className="text-[11px] text-ink-soft">{step.timestamp}</p>
                </div>
              </li>
            );
          })}
        </ol>
      </div>

      {canCancelNow && (
        <div className="mx-4 mt-4">
          <button
            onClick={handleCancel}
            disabled={updateOrderStatus.isPending}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-destructive/10 text-destructive text-sm font-bold disabled:opacity-60"
          >
            {updateOrderStatus.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            Cancel order
          </button>
        </div>
      )}

      {/* Order items */}
      <div className="mx-4 mt-4 rounded-2xl bg-card border border-border shadow-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-ink">Items</h3>
          <button
            onClick={() => navigate("store", { storeSlug: order.vendorSlug })}
            className="text-xs font-semibold text-rush"
          >
            View store
          </button>
        </div>
        <div className="space-y-3">
          {order.items.map((item) => (
            <div key={item.productId} className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-lg overflow-hidden bg-muted shrink-0">
                {item.image && (
                  <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-ink line-clamp-1">{item.name}</p>
                <p className="text-[11px] text-ink-soft">
                  {item.quantity} × {naira(item.price)}
                </p>
              </div>
              <p className="text-sm font-bold text-ink">{naira(item.price * item.quantity)}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 pt-3 border-t border-border space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="text-ink-soft">Subtotal</span>
            <span className="font-semibold text-ink">{naira(order.subtotal)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-soft">Delivery</span>
            <span className="font-semibold text-ink">{naira(order.deliveryFee)}</span>
          </div>
          <div className="flex justify-between pt-1">
            <span className="font-bold text-ink">Total paid</span>
            <span className="font-extrabold text-rush">{naira(order.total)}</span>
          </div>
        </div>
      </div>

      {/* Safety / support */}
      <div className="mx-4 mt-4 rounded-xl bg-muted/40 p-3 flex items-start gap-2.5">
        <Shield className="h-4 w-4 text-rush mt-0.5 shrink-0" />
        <div>
          <p className="text-xs font-semibold text-ink">Rush safety</p>
          <p className="text-[11px] text-ink-soft mt-0.5">
            All riders are verified. Your payment is held securely until delivery is confirmed.
          </p>
        </div>
      </div>
    </div>
  );
}
