"use client";

import { useState } from "react";
import { ShoppingBag, Wrench, Car, Package, ChevronRight } from "lucide-react";
import { useRush } from "@/lib/store";
import { useOrders, useRides, useServiceJobs } from "@/lib/hooks";
import { naira } from "@/lib/data";
import { DataState, EmptyState } from "@/components/shared/DataState";

type Tab = "orders" | "services" | "rides";

export function ActivityScreen() {
  const { navigate } = useRush();
  const [tab, setTab] = useState<Tab>("orders");

  const ordersQ = useOrders();
  const ridesQ = useRides();
  const serviceJobsQ = useServiceJobs();

  const orders = ordersQ.data?.orders || [];
  const rides = ridesQ.data?.rides || [];
  const serviceJobs = serviceJobsQ.data?.jobs || [];

  return (
    <div className="pb-6">
      <div className="px-4 pt-3 pb-2">
        <h1 className="text-xl font-extrabold text-ink tracking-tight">Activity</h1>
        <p className="text-xs text-ink-soft mt-0.5">Your orders, services, and rides</p>
      </div>

      {/* Tabs */}
      <div className="px-4 pt-3">
        <div className="flex gap-1 p-1 bg-muted rounded-xl">
          <TabBtn icon={<ShoppingBag className="h-3.5 w-3.5" />} label="Orders" active={tab === "orders"} onClick={() => setTab("orders")} />
          <TabBtn icon={<Wrench className="h-3.5 w-3.5" />} label="Services" active={tab === "services"} onClick={() => setTab("services")} />
          <TabBtn icon={<Car className="h-3.5 w-3.5" />} label="Rides" active={tab === "rides"} onClick={() => setTab("rides")} />
        </div>
      </div>

      {/* Content */}
      <div className="px-4 pt-4">
        {tab === "orders" && (
          <DataState
            isLoading={ordersQ.isLoading}
            error={ordersQ.error}
            isEmpty={orders.length === 0}
            onRetry={() => void ordersQ.refetch()}
            empty={
              <EmptyState
                icon={<ShoppingBag className="h-8 w-8" />}
                title="No orders yet"
                message="When you place an order, it will appear here."
                action={
                  <button
                    onClick={() => navigate("shop")}
                    className="px-4 py-2 rounded-xl rush-gradient text-white text-xs font-bold shadow-rush"
                  >
                    Start shopping
                  </button>
                }
              />
            }
          >
            <div className="space-y-2.5">
              {orders.map((o) => (
                <button
                  key={o.id}
                  onClick={() => navigate("order-tracking", { orderId: o.id })}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl bg-card border border-border shadow-card text-left hover:shadow-md transition-shadow"
                >
                  <div className="h-12 w-12 rounded-xl overflow-hidden bg-muted shrink-0">
                    {o.items[0]?.image && (
                      <img src={o.items[0].image} alt={o.items[0].name} className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-ink line-clamp-1">{o.vendorName}</p>
                    <p className="text-[11px] text-ink-soft">
                      {o.code} · {o.items.length} items · {naira(o.total)}
                    </p>
                    <span
                      className={`inline-block mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        o.status === "DELIVERED"
                          ? "bg-success/10 text-success"
                          : "bg-rush-soft text-rush-deep"
                      }`}
                    >
                      {o.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-ink-soft shrink-0" />
                </button>
              ))}
            </div>
          </DataState>
        )}

        {tab === "services" && (
          <DataState
            isLoading={serviceJobsQ.isLoading}
            error={serviceJobsQ.error}
            isEmpty={serviceJobs.length === 0}
            onRetry={() => void serviceJobsQ.refetch()}
            empty={
              <EmptyState
                icon={<Package className="h-8 w-8" />}
                title="No service requests yet"
                message="When you book a service, it will appear here."
                action={
                  <button
                    onClick={() => navigate("services")}
                    className="px-4 py-2 rounded-xl rush-gradient text-white text-xs font-bold shadow-rush"
                  >
                    Browse services
                  </button>
                }
              />
            }
          >
            <div className="space-y-2.5">
              {serviceJobs.map((j) => (
                <button
                  key={j.id}
                  onClick={() => navigate("service-job-tracking", { jobId: j.id })}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl bg-card border border-border shadow-card text-left hover:shadow-md transition-shadow"
                >
                  <div className="h-12 w-12 rounded-xl bg-rush-soft flex items-center justify-center shrink-0">
                    <Wrench className="h-5 w-5 text-rush" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-ink line-clamp-1">{j.title}</p>
                    <p className="text-[11px] text-ink-soft">
                      {j.code} · {j.providerName || "Awaiting provider"}
                    </p>
                    <span
                      className={`inline-block mt-1 text-[9px] font-bold px-1.5 py-0.5 rounded ${
                        j.status === "COMPLETED"
                          ? "bg-success/10 text-success"
                          : j.status === "CANCELLED"
                            ? "bg-destructive/10 text-destructive"
                            : "bg-rush-soft text-rush-deep"
                      }`}
                    >
                      {j.status.replace(/_/g, " ")}
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-ink-soft shrink-0" />
                </button>
              ))}
            </div>
          </DataState>
        )}

        {tab === "rides" && (
          <DataState
            isLoading={ridesQ.isLoading}
            error={ridesQ.error}
            isEmpty={rides.length === 0}
            onRetry={() => void ridesQ.refetch()}
            empty={
              <EmptyState
                icon={<Car className="h-8 w-8" />}
                title="No rides yet"
                message="Book your first ride to see it here."
                action={
                  <button
                    onClick={() => navigate("ride")}
                    className="px-4 py-2 rounded-xl rush-gradient text-white text-xs font-bold shadow-rush"
                  >
                    Book a ride
                  </button>
                }
              />
            }
          >
            <div className="space-y-2.5">
              {rides.map((r) => (
                <button
                  key={r.id}
                  onClick={() => navigate("ride-tracking", { rideId: r.id })}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl bg-card border border-border shadow-card text-left"
                >
                  <div className="h-12 w-12 rounded-xl bg-rush-soft flex items-center justify-center text-2xl shrink-0">
                    {r.type === "BIKE" ? "🏍️" : r.type === "CAR" ? "🚗" : "🛺"}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-ink">{r.code}</p>
                    <p className="text-[11px] text-ink-soft line-clamp-1">
                      {r.pickup} → {r.destination}
                    </p>
                    <p className="text-[11px] text-ink-soft mt-0.5">
                      {naira(r.fare)} · {r.distanceKm} km
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-ink-soft shrink-0" />
                </button>
              ))}
            </div>
          </DataState>
        )}
      </div>
    </div>
  );
}

function TabBtn({
  icon,
  label,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-bold transition-all ${
        active ? "bg-background text-rush shadow-sm" : "text-ink-soft"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
