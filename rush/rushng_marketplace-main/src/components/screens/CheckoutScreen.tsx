"use client";

import { useState, useMemo, type ReactNode } from "react";
import { Bike, Store, Wallet, CreditCard, Banknote, Landmark, MapPin, ShoppingBag, Loader2 } from "lucide-react";
import { useRush } from "@/lib/store";
import { CONTENT_WIDTH } from "@/lib/layout";
import { useStores, useCreateOrder } from "@/lib/hooks";
import { naira } from "@/lib/data";
import type { FulfilmentType, PaymentMethod } from "@/lib/types";
import { BackHeader } from "./CartScreen";
import { EmptyState } from "@/components/shared/Cards";
import { api } from "@/lib/api-client";

export function CheckoutScreen() {
  const { cart, cartSubtotal, navigate, back, clearCart, user, pushToast } = useRush();
  const [fulfilment, setFulfilment] = useState<FulfilmentType>("DELIVERY");
  const [payment, setPayment] = useState<PaymentMethod>("CARD");
  const [address, setAddress] = useState(user?.location ? `${user.location}` : "14 Adeniran Street, Yaba, Lagos");
  const createOrderMut = useCreateOrder();
  const storesQ = useStores();
  const [paying, setPaying] = useState(false);

  // Find the vendor of the first cart item to get delivery fee
  const firstItem = cart[0];
  const vendor = useMemo(
    () => (storesQ.data?.vendors || []).find((v) => v.id === firstItem?.vendorId),
    [storesQ.data, firstItem],
  );

  const subtotal = cartSubtotal();
  const deliveryFee = fulfilment === "DELIVERY" && vendor ? vendor.deliveryFee : 0;
  // ─── Service fee (5% Rush commission, added on top of subtotal) ──────
  // Vendor receives the full subtotal — never deducted. The service fee
  // covers platform ops + Paystack charges. Delivery fee is excluded
  // from the commission base (it's a pass-through to the rider).
  // Mirrors the server-side calculation in /api/orders so the UI shows
  // the same number the customer will actually be charged.
  const serviceFee = Math.round(subtotal * 0.05);
  const total = subtotal + serviceFee + deliveryFee;

  if (cart.length === 0) {
    return (
      <div className="pb-6">
        <BackHeader title="Checkout" onBack={back} />
        <EmptyState
          icon={<ShoppingBag className="h-6 w-6" />}
          title="Your cart is empty"
          description="Add products to your cart before checking out."
        />
      </div>
    );
  }

  const handlePlaceOrder = async () => {
    if (!firstItem) return;
    setPaying(true);
    try {
      // 1. Create the order (still in PLACED status).
      const res = await createOrderMut.mutateAsync({
        items: cart.map((i) => ({
          productId: i.productId,
          quantity: i.quantity,
        })),
        vendorId: firstItem.vendorId,
        fulfilment,
        paymentMethod: payment,
        deliveryAddress: fulfilment === "DELIVERY" ? address : undefined,
        deliveryFee,
      });

      // 2. Pay. For CARD / TRANSFER we route through Paystack (or mock
      //    when Paystack isn't configured). For WALLET we'd debit the
      //    wallet; for CASH_ON_DELIVERY there's no upfront payment.
      if (payment === "CARD" || payment === "TRANSFER") {
        const init = await api.post<{
          reference: string;
          authorizationUrl: string;
          provider: string;
          isMock: boolean;
        }>("/api/payments/initiate", { orderId: res.order.id });

        if (init.isMock) {
          // Mock mode — auto-succeed and verify.
          pushToast({
            title: "Mock payment",
            description: "Paystack not configured — simulating payment success.",
          });
          await api.post("/api/payments/verify", { reference: init.reference });
        } else {
          // Real Paystack — redirect to the hosted checkout.
          window.location.href = init.authorizationUrl;
          return;
        }
      } else if (payment === "WALLET") {
        // Debit the wallet atomically via /api/wallet/debit. Refuses
        // to overdraw — returns 402 with a clear message if the
        // wallet has less than the order total. On success, the
        // order is auto-CONFIRMED (no Paystack round-trip needed).
        const walletRes = await api.post<{
          ok: boolean;
          orderId: string;
          balance: number;
          amount: number;
        }>("/api/wallet/debit", { orderId: res.order.id });
        pushToast({
          title: "Wallet payment successful",
          description: `₦${walletRes.amount.toLocaleString()} debited. New balance: ₦${walletRes.balance.toLocaleString()}.`,
        });
      } else if (payment === "CASH_ON_DELIVERY") {
        // No upfront payment — the customer pays the rider on delivery.
      }

      clearCart();
      pushToast({
        title: "Order placed!",
        description: `Your order ${res.order.code} has been confirmed.`,
      });
      navigate("order-tracking", { orderId: res.order.id });
    } catch (err) {
      pushToast({
        title: "Failed to place order",
        description: err instanceof Error ? err.message : undefined,
      });
    } finally {
      setPaying(false);
    }
  };

  return (
    <div className="pb-32">
      <BackHeader title="Checkout" onBack={back} />

      <div className="px-4 pt-4 space-y-5">
        {/* Fulfilment method */}
        <section>
          <h2 className="text-sm font-bold text-ink mb-2">How do you want to receive this?</h2>
          <div className="grid grid-cols-2 gap-2.5">
            <OptionTile
              active={fulfilment === "DELIVERY"}
              onClick={() => setFulfilment("DELIVERY")}
              icon={<Bike className="h-5 w-5" />}
              title="Delivery"
              subtitle={vendor ? `~${vendor.deliveryTimeMin} min` : "—"}
              meta={vendor ? naira(vendor.deliveryFee) : "Free"}
            />
            <OptionTile
              active={fulfilment === "PICKUP"}
              onClick={() => setFulfilment("PICKUP")}
              icon={<Store className="h-5 w-5" />}
              title="Pickup"
              subtitle="Pick it up yourself"
              meta="Free"
            />
          </div>
        </section>

        {/* Address */}
        {fulfilment === "DELIVERY" && (
          <section>
            <h2 className="text-sm font-bold text-ink mb-2">Delivery address</h2>
            <div className="rounded-xl border border-border bg-card p-3">
              <div className="flex items-start gap-2">
                <MapPin className="h-4 w-4 text-rush mt-0.5 shrink-0" />
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={2}
                  aria-label="Delivery address"
                  className="flex-1 min-w-0 bg-transparent text-sm text-ink resize-none placeholder:text-ink-soft rounded focus:outline-none focus:ring-2 focus:ring-rush/30"
                  placeholder="Enter full delivery address"
                />
              </div>
              <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border">
                <input
                  type="tel"
                  defaultValue={user?.phone || ""}
                  aria-label="Phone number"
                  className="flex-1 min-w-0 bg-transparent text-xs text-ink-soft placeholder:text-ink-soft rounded focus:outline-none focus:ring-2 focus:ring-rush/30"
                  placeholder="Phone"
                />
                <span className="text-[10px] text-ink-soft shrink-0">Phone</span>
              </div>
            </div>
          </section>
        )}

        {/* Payment method */}
        <section>
          <h2 className="text-sm font-bold text-ink mb-2">Payment method</h2>
          <div className="grid grid-cols-2 gap-2.5">
            <PaymentTile
              active={payment === "WALLET"}
              onClick={() => setPayment("WALLET")}
              icon={<Wallet className="h-4 w-4" />}
              label="Rush Wallet"
              meta={user?.wallet ? naira(user.wallet.balance) : "₦0"}
            />
            <PaymentTile
              active={payment === "CARD"}
              onClick={() => setPayment("CARD")}
              icon={<CreditCard className="h-4 w-4" />}
              label="Card"
              meta="Visa, Verve"
            />
            <PaymentTile
              active={payment === "TRANSFER"}
              onClick={() => setPayment("TRANSFER")}
              icon={<Landmark className="h-4 w-4" />}
              label="Bank Transfer"
              meta="Instant"
            />
            <PaymentTile
              active={payment === "CASH_ON_DELIVERY"}
              onClick={() => setPayment("CASH_ON_DELIVERY")}
              icon={<Banknote className="h-4 w-4" />}
              label="Cash on Delivery"
              meta="Pay rider"
            />
          </div>
        </section>

        {/* Order summary */}
        <section>
          <h2 className="text-sm font-bold text-ink mb-2">Order summary</h2>
          <div className="rounded-2xl bg-card border border-border shadow-card p-4">
            <div className="space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-ink-soft">Items ({cart.reduce((s, i) => s + i.quantity, 0)})</span>
                <span className="font-semibold text-ink">{naira(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-soft">Delivery fee</span>
                <span className="font-semibold text-ink">
                  {deliveryFee === 0 ? "Free" : naira(deliveryFee)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-ink-soft">Service fee (5%)</span>
                <span className="font-semibold text-ink">{naira(serviceFee)}</span>
              </div>
            </div>
            <div className="mt-3 rounded-xl bg-rush-soft/60 px-3 py-2 flex justify-between items-center">
              <span className="text-sm font-bold text-ink">Total</span>
              <span className="text-base font-extrabold text-rush-deep">{naira(total)}</span>
            </div>
          </div>
        </section>
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border safe-bottom">
        <div className={`mx-auto ${CONTENT_WIDTH} px-4 py-3 flex items-center gap-3`}>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-ink-soft truncate">Pay with {payment.replace("_", " ").toLowerCase()}</p>
            <p className="text-base font-extrabold text-ink">{naira(total)}</p>
          </div>
          <button
            onClick={handlePlaceOrder}
            disabled={createOrderMut.isPending || paying}
            className="cta-primary h-12 px-5 sm:px-6 rounded-xl text-sm shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {(createOrderMut.isPending || paying) && <Loader2 className="h-4 w-4 animate-spin" />}
            {createOrderMut.isPending ? "Placing…" : paying ? "Paying…" : "Place order"}
          </button>
        </div>
      </div>
    </div>
  );
}

function OptionTile({
  active,
  onClick,
  icon,
  title,
  subtitle,
  meta,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  title: string;
  subtitle: string;
  meta: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-start gap-3 p-3 rounded-2xl border-2 text-left transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
        active
          ? "border-rush bg-rush-soft/40"
          : "border-border bg-card hover:border-ink-soft/30"
      }`}
    >
      <div
        className={`h-9 w-9 rounded-xl flex items-center justify-center ${
          active ? "bg-rush-deep text-white" : "bg-muted text-ink-soft"
        }`}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-ink">{title}</p>
        <p className="text-[11px] text-ink-soft">{subtitle}</p>
        <p className={`text-[11px] font-semibold mt-0.5 ${active ? "text-rush-deep" : "text-ink"}`}>
          {meta}
        </p>
      </div>
    </button>
  );
}

function PaymentTile({
  active,
  onClick,
  icon,
  label,
  meta,
}: {
  active: boolean;
  onClick: () => void;
  icon: ReactNode;
  label: string;
  meta: string;
}) {
  return (
    <button
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center gap-2.5 p-3 rounded-xl border-2 text-left transition-all cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring ${
        active ? "border-rush bg-rush-soft/40" : "border-border bg-card hover:border-ink-soft/30"
      }`}
    >
      <div
        className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 ${
          active ? "bg-rush-deep text-white" : "bg-muted text-ink-soft"
        }`}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-ink truncate">{label}</p>
        <p className="text-[10px] text-ink-soft">{meta}</p>
      </div>
    </button>
  );
}
