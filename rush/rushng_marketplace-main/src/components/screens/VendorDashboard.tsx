"use client";

import { useState } from "react";
import { ChevronLeft, Plus, Package, ShoppingCart, TrendingUp, Star, Store, Eye, Settings, ChevronRight, Wallet, Pencil, Trash2, ArrowRight, XCircle, ShieldCheck, Banknote } from "lucide-react";
import { useRush } from "@/lib/store";
import { useOrders, useStores, useProducts, useDeleteProduct, useUpdateOrderStatus } from "@/lib/hooks";
import { naira } from "@/lib/data";
import { BackHeader } from "./CartScreen";
import { ProductFormSheet } from "@/components/vendor/ProductFormSheet";
import { RiderPickerSheet } from "@/components/vendor/RiderPickerSheet";
import { StoreSettingsSheet } from "@/components/vendor/StoreSettingsSheet";
import { KycVerificationSheet } from "@/components/vendor/KycVerificationSheet";
import { VendorPayoutsSheet } from "@/components/vendor/VendorPayoutsSheet";
import { VerifiedBadgeLarge } from "@/components/vendor/VerifiedBadge";
import { getNextStep, isTerminal, canCancel, getStepOwner } from "@/lib/order-status";
import { ApiError } from "@/lib/api-client";
import { DataState } from "@/components/shared/DataState";
import type { Product, Order } from "@/lib/types";

export function VendorDashboard() {
  const { back, navigate, user, pushToast } = useRush();
  const vendorProfile = (user as any)?.vendorProfile;
  const vendorId = vendorProfile?.id;

  const ordersQ = useOrders("vendor");
  const productsQ = useProducts({ vendorId });
  const allStoresQ = useStores();
  const deleteProduct = useDeleteProduct();
  const updateOrderStatus = useUpdateOrderStatus();

  // Find this vendor's record from the public API (includes full data)
  const vendor = (allStoresQ.data?.vendors || []).find((v) => v.id === vendorId) || vendorProfile;
  const vendorProducts = productsQ.data?.products || [];
  const orders = ordersQ.data?.orders || [];

  const [productSheetOpen, setProductSheetOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [riderPickerOrder, setRiderPickerOrder] = useState<Order | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [kycOpen, setKycOpen] = useState(false);
  const [payoutsOpen, setPayoutsOpen] = useState(false);

  function openAddProduct() {
    setEditingProduct(null);
    setProductSheetOpen(true);
  }

  function openEditProduct(p: Product) {
    setEditingProduct(p);
    setProductSheetOpen(true);
  }

  async function handleDeleteProduct(p: Product) {
    if (!window.confirm(`Remove "${p.name}" from your store? This can't be undone.`)) return;
    try {
      await deleteProduct.mutateAsync(p.id);
      pushToast({ title: "Product removed" });
    } catch (err) {
      pushToast({ title: "Couldn't remove product", description: err instanceof ApiError ? err.message : undefined });
    }
  }

  async function handleAdvanceOrder(order: Order) {
    const next = getNextStep(order.fulfilment, order.status);
    if (!next) return;
    if (next.requiresRider) {
      setRiderPickerOrder(order);
      return;
    }
    try {
      await updateOrderStatus.mutateAsync({ id: order.id, status: next.status });
      pushToast({ title: next.timelineLabel });
    } catch (err) {
      pushToast({ title: "Couldn't update order", description: err instanceof ApiError ? err.message : undefined });
    }
  }

  async function handleAssignRider(riderId: string) {
    if (!riderPickerOrder) return;
    const next = getNextStep(riderPickerOrder.fulfilment, riderPickerOrder.status);
    if (!next) return;
    try {
      await updateOrderStatus.mutateAsync({ id: riderPickerOrder.id, status: next.status, riderId });
      pushToast({ title: "Rider assigned" });
      setRiderPickerOrder(null);
    } catch (err) {
      pushToast({ title: "Couldn't assign rider", description: err instanceof ApiError ? err.message : undefined });
    }
  }

  async function handleCancelOrder(order: Order) {
    if (!window.confirm(`Cancel order ${order.code}?`)) return;
    try {
      await updateOrderStatus.mutateAsync({ id: order.id, status: "CANCELLED" });
      pushToast({ title: "Order cancelled" });
    } catch (err) {
      pushToast({ title: "Couldn't cancel order", description: err instanceof ApiError ? err.message : undefined });
    }
  }

  if (!vendorProfile) {
    return (
      <div className="pb-6">
        <BackHeader title="Vendor dashboard" onBack={back} />
        <div className="p-6 text-center">
          <p className="text-sm text-ink-soft mb-3">You don't have a vendor profile yet.</p>
          <button
            type="button"
            onClick={() => navigate("onboarding-vendor")}
            className="px-5 py-2.5 rounded-xl rush-gradient text-white font-bold text-sm shadow-rush"
          >
            Open a store
          </button>
        </div>
      </div>
    );
  }

  const loading = ordersQ.isLoading || productsQ.isLoading;
  const error = ordersQ.error || productsQ.error;

  return (
    <div className="pb-6">
      <BackHeader title="Vendor dashboard" onBack={back} />

      {/* Store banner */}
      <div className="px-4 pt-3">
        <div className="rounded-2xl rush-gradient p-4 text-white shadow-rush relative overflow-hidden">
          <div className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/10" />
          <div className="relative flex items-center gap-3">
            <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center overflow-hidden">
              {vendor?.logo && (
                <img src={vendor.logo} alt={vendor.businessName} className="w-full h-full object-cover" />
              )}
            </div>
            <div className="flex-1">
              <p className="text-sm font-bold">{vendorProfile.businessName}</p>
              <p className="text-[11px] opacity-90">rush.com/store/{vendorProfile.slug}</p>
            </div>
            <button
              type="button"
              onClick={() => navigate("store", { storeSlug: vendorProfile.slug })}
              className="px-3 py-1.5 rounded-lg bg-white/20 text-xs font-semibold backdrop-blur-sm"
            >
              View
            </button>
          </div>
          {!vendorProfile.verified && (
            <div className="mt-3 px-3 py-1.5 rounded-lg bg-white/15 text-[11px] backdrop-blur-sm">
              ⏳ Verification pending — your store is live but not yet "Verified"
            </div>
          )}

          {vendorProfile.kyc && (vendorProfile.kyc.kycStatus === "APPROVED" || vendorProfile.kyc.kycStatus === "PENDING") && (
            <div className="mt-3">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/20 backdrop-blur-sm text-[11px] font-semibold">
                {vendorProfile.kyc.kycStatus === "APPROVED" ? (
                  <>
                    <ShieldCheck className="h-3.5 w-3.5" />
                    {vendorProfile.kyc.verificationTier === "STUDENT_LASU" && "Verified LASU Student"}
                    {vendorProfile.kyc.verificationTier === "STAFF_LASU" && "Verified LASU Staff"}
                    {vendorProfile.kyc.verificationTier === "COMMUNITY_EXTERNAL" && "ID-Verified Merchant"}
                  </>
                ) : (
                  <>
                    <span className="inline-block h-2 w-2 rounded-full bg-amber-300 animate-pulse" />
                    Verification in review
                  </>
                )}
              </div>
            </div>
          )}
          {(!vendorProfile.kyc || vendorProfile.kyc.kycStatus === "UNSUBMITTED" || vendorProfile.kyc.kycStatus === "REJECTED") && (
            <button
              type="button"
              onClick={() => setKycOpen(true)}
              className="mt-3 w-full text-left px-3 py-2 rounded-lg bg-white/15 backdrop-blur-sm hover:bg-white/20 transition-colors"
            >
              <p className="text-[11px] font-semibold flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5" />
                {vendorProfile.kyc?.kycStatus === "REJECTED"
                  ? "Verification rejected — re-submit to unlock unlimited listings"
                  : "Get the Verified LASU Merchant badge — confirm your student or staff status"}
              </p>
              <p className="text-[10px] opacity-80 mt-0.5">
                Unverified vendors are capped at 5 product listings.
              </p>
            </button>
          )}
        </div>
      </div>

      <DataState
        isLoading={loading}
        error={error}
        isEmpty={false}
        onRetry={() => { void ordersQ.refetch(); void productsQ.refetch(); }}
      >
        <>
          {/* Stats */}
          <div className="px-4 pt-4 grid grid-cols-2 gap-2.5">
            <StatCard
              icon={<Wallet className="h-4 w-4" />}
              label="Earnings (today)"
              value={naira(orders.reduce((s, o) => s + o.total, 0))}
              delta={`${orders.length} orders`}
              deltaTone="muted"
            />
            <StatCard
              icon={<ShoppingCart className="h-4 w-4" />}
              label="Orders"
              value={`${orders.length}`}
              delta={orders.filter((o) => o.status !== "DELIVERED" && o.status !== "CANCELLED").length + " active"}
              deltaTone="success"
            />
            <StatCard
              icon={<Eye className="h-4 w-4" />}
              label="Followers"
              value={`${vendor?.followers || 0}`}
              delta="+0"
              deltaTone="muted"
            />
            <StatCard
              icon={<Star className="h-4 w-4" />}
              label="Rating"
              value={vendor?.rating ? `${vendor.rating}` : "New"}
              delta={`${vendor?.reviewCount || 0} reviews`}
              deltaTone="muted"
            />
          </div>

          {/* Quick actions */}
          <div className="px-4 pt-4 grid grid-cols-4 gap-2.5">
            <ActionTile
              icon={<Plus className="h-5 w-5" />}
              label="Add product"
              tone="rush"
              onClick={openAddProduct}
            />
            <ActionTile
              icon={<Package className="h-5 w-5" />}
              label="Inventory"
              tone="ink"
              onClick={() => {
                const el = document.getElementById("vendor-products-section");
                el?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            />
            <ActionTile
              icon={<Banknote className="h-5 w-5" />}
              label="Payouts"
              tone="rush-deep"
              onClick={() => setPayoutsOpen(true)}
            />
            <ActionTile
              icon={<Settings className="h-5 w-5" />}
              label="Settings"
              tone="rush-deep"
              onClick={() => setSettingsOpen(true)}
            />
          </div>

          {/* Recent orders */}
          <section className="px-4 pt-5">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-ink">Recent orders</h2>
            </div>
            {orders.length === 0 ? (
              <div className="rounded-2xl bg-muted/40 p-6 text-center">
                <ShoppingCart className="h-8 w-8 text-ink-soft mx-auto mb-2" />
                <p className="text-sm font-semibold text-ink">No orders yet</p>
                <p className="text-xs text-ink-soft mt-1">
                  Add products and share your store to start receiving orders.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {orders.map((o) => {
                  const next = getNextStep(o.fulfilment, o.status);
                  const stepOwner = getStepOwner(o.fulfilment, o.status);
                  const mutating = updateOrderStatus.isPending;
                  return (
                    <div key={o.id} className="rounded-xl bg-card border border-border p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-ink">{o.code}</p>
                          <p className="text-[10px] text-ink-soft">{o.items.length} items · {o.customerName}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-rush">{naira(o.total)}</p>
                          <StatusPill status={o.status} />
                        </div>
                      </div>
                      {!isTerminal(o.status) && (
                        <div className="mt-2.5 flex items-center gap-2">
                          {next && stepOwner === "VENDOR" && (
                            <button
                              type="button"
                              disabled={mutating}
                              onClick={() => handleAdvanceOrder(o)}
                              className="flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-lg rush-gradient text-white text-[11px] font-bold shadow-rush disabled:opacity-60"
                            >
                              {next.actionLabel} <ArrowRight className="h-3 w-3" />
                            </button>
                          )}
                          {next && stepOwner === "RIDER" && (
                            <p className="flex-1 text-[11px] text-ink-soft italic py-1.5">
                              Waiting on the rider to {next.actionLabel.toLowerCase()}…
                            </p>
                          )}
                          {canCancel(o.status) && (
                            <button
                              type="button"
                              disabled={mutating}
                              onClick={() => handleCancelOrder(o)}
                              className="flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg bg-destructive/10 text-destructive text-[11px] font-bold disabled:opacity-60"
                            >
                              <XCircle className="h-3 w-3" /> Cancel
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Products table */}
          <section id="vendor-products-section" className="px-4 pt-5">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-sm font-bold text-ink">Your products ({vendorProducts.length})</h2>
              <button type="button" onClick={openAddProduct} className="text-xs font-semibold text-rush">
                + Add
              </button>
            </div>
            {vendorProducts.length === 0 ? (
              <div className="rounded-2xl bg-muted/40 p-6 text-center">
                <Package className="h-8 w-8 text-ink-soft mx-auto mb-2" />
                <p className="text-sm font-semibold text-ink">No products yet</p>
                <p className="text-xs text-ink-soft mt-1 mb-3">
                  Add your first product to start selling.
                </p>
                <button
                  type="button"
                  onClick={openAddProduct}
                  className="px-4 py-2 rounded-xl rush-gradient text-white text-xs font-bold shadow-rush"
                >
                  + Add product
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {vendorProducts.map((p) => (
                  <div
                    key={p.id}
                    className="w-full flex items-center gap-3 p-2.5 rounded-xl bg-card border border-border"
                  >
                    <button
                      type="button"
                      onClick={() => navigate("product", { productId: p.id })}
                      className="flex items-center gap-3 flex-1 min-w-0 text-left"
                    >
                      <div className="h-12 w-12 rounded-lg overflow-hidden bg-muted shrink-0">
                        <img src={p.images[0]} alt={p.name} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-ink line-clamp-1">{p.name}</p>
                        <p className="text-[10px] text-ink-soft mt-0.5">
                          {naira(p.price)} · Stock: {p.stock}
                        </p>
                      </div>
                    </button>
                    <button
                      type="button"
                      onClick={() => openEditProduct(p)}
                      aria-label="Edit product"
                      className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0"
                    >
                      <Pencil className="h-3.5 w-3.5 text-ink-soft" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteProduct(p)}
                      aria-label="Delete product"
                      className="h-8 w-8 rounded-lg bg-destructive/10 flex items-center justify-center shrink-0"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </>
      </DataState>

      <ProductFormSheet
        open={productSheetOpen}
        onOpenChange={setProductSheetOpen}
        product={editingProduct}
        defaultLocation={vendorProfile?.location}
      />
      <RiderPickerSheet
        open={!!riderPickerOrder}
        onOpenChange={(o) => !o && setRiderPickerOrder(null)}
        onSelect={handleAssignRider}
        assigning={updateOrderStatus.isPending}
      />
      <StoreSettingsSheet
        open={settingsOpen}
        onOpenChange={setSettingsOpen}
        slug={vendorProfile.slug}
        initialData={vendor || vendorProfile}
      />
      <KycVerificationSheet
        open={kycOpen}
        onOpenChange={setKycOpen}
        kyc={vendorProfile.kyc ?? null}
      />
      <VendorPayoutsSheet
        open={payoutsOpen}
        onOpenChange={setPayoutsOpen}
      />
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
  delta,
  deltaTone = "success",
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  delta: string;
  deltaTone?: "success" | "muted";
}) {
  return (
    <div className="rounded-2xl bg-card border border-border p-3">
      <div className="flex items-center justify-between">
        <div className="h-7 w-7 rounded-lg bg-rush-soft text-rush flex items-center justify-center">
          {icon}
        </div>
        <span
          className={`text-[10px] font-semibold ${
            deltaTone === "success" ? "text-success" : "text-ink-soft"
          }`}
        >
          {delta}
        </span>
      </div>
      <p className="text-base font-extrabold text-ink mt-2">{value}</p>
      <p className="text-[10px] text-ink-soft">{label}</p>
    </div>
  );
}

function ActionTile({
  icon,
  label,
  tone,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  tone: "rush" | "ink" | "rush-deep";
  onClick: () => void;
}) {
  const toneCls = {
    rush: "rush-gradient text-white shadow-rush",
    ink: "bg-ink text-white",
    "rush-deep": "bg-rush-deep text-white",
  }[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl ${toneCls}`}
    >
      {icon}
      <span className="text-[10px] font-bold text-center leading-tight">{label}</span>
    </button>
  );
}

function StatusPill({ status }: { status: string }) {
  const tone = {
    PLACED: "bg-muted text-ink-soft",
    CONFIRMED: "bg-warning/15 text-warning",
    PREPARING: "bg-warning/15 text-warning",
    RIDER_ASSIGNED: "bg-rush-soft text-rush-deep",
    ON_THE_WAY: "bg-rush-soft text-rush-deep",
    DELIVERED: "bg-success/10 text-success",
    PICKED_UP: "bg-success/10 text-success",
    CANCELLED: "bg-destructive/10 text-destructive",
  }[status] || "bg-muted text-ink-soft";

  return (
    <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold ${tone}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}
