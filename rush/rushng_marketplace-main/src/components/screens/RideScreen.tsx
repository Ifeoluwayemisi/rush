"use client";

import { useState, useEffect } from "react";
import dynamic from "next/dynamic";
import { ChevronLeft, MapPin, Navigation, Bike, Car, Truck, Clock, Star, Shield, X, CreditCard, Loader2, XCircle } from "lucide-react";
import { useRush } from "@/lib/store";
import { CONTENT_WIDTH } from "@/lib/layout";
import { useRequestRide, useRide, useCancelRide } from "@/lib/hooks";
import { naira } from "@/lib/data";
import type { RideType } from "@/lib/types";
import { ApiError } from "@/lib/api-client";
import { BackHeader } from "./CartScreen";

// Leaflet references `window` at module-load time, so we must load
// RideMap only on the client. The `ssr: false` option means the
// homepage prerender won't try to execute Leaflet's code.
const RideMap = dynamic(
  () => import("@/components/maps/RideMap").then((m) => m.RideMap),
  { ssr: false, loading: () => (
    <div className="rounded-2xl bg-muted/40 flex items-center justify-center text-ink-soft text-xs" style={{ height: 240 }}>
      <Loader2 className="h-4 w-4 animate-spin" />
    </div>
  ) },
);

/**
 * Geocode an address string to [lat, lng] via Nominatim (free OSM
 * geocoder). Returns null on failure or if the address is empty.
 *
 * Nominatim's usage policy requires:
 *   - A valid HTTP Referer or User-Agent
 *   - Max 1 request/sec
 *   - No heavy usage (we only call this when the user clicks "use
 *     this location" or submits the form, never on keystroke)
 *
 * We don't debounce — caller is responsible for calling sparingly.
 */
async function geocodeAddress(address: string): Promise<[number, number] | null> {
  if (!address.trim()) return null;
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(address)}`;
    const res = await fetch(url, {
      headers: { "Accept-Language": "en" },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (!Array.isArray(data) || data.length === 0) return null;
    const { lat, lon } = data[0];
    return [parseFloat(lat), parseFloat(lon)];
  } catch {
    return null;
  }
}

const RIDE_OPTIONS: Array<{
  type: RideType;
  label: string;
  icon: typeof Bike;
  multiplier: number;
  etaMin: number;
  description: string;
}> = [
  { type: "BIKE", label: "Bike", icon: Bike, multiplier: 1, etaMin: 4, description: "Fastest · beats traffic" },
  { type: "CAR", label: "Car", icon: Car, multiplier: 2.2, etaMin: 7, description: "Comfort · A/C" },
  { type: "KEKE", label: "Keke", icon: Truck, multiplier: 1.5, etaMin: 9, description: "Affordable · 3 seats" },
  { type: "VAN", label: "Van", icon: Truck, multiplier: 3.5, etaMin: 12, description: "For groups · 6 seats" },
];

const BASE_FARE = 800;
const PER_KM = 120;

// Lagos landmarks for default pickup/destination — gives the user a
// working map as soon as they open the screen without having to type
// first.
const DEFAULT_PICKUP_COORDS: [number, number] = [6.5059, 3.3779]; // Yaba
const DEFAULT_DESTINATION_COORDS: [number, number] = [6.5531, 3.3634]; // Maryland

export function RideScreen() {
  const { back, navigate, pushToast } = useRush();
  const [pickup, setPickup] = useState("Yaba Market, Lagos");
  const [destination, setDestination] = useState("Maryland Mall, Lagos");
  const [selectedType, setSelectedType] = useState<RideType>("BIKE");
  const [pickupCoords, setPickupCoords] = useState<[number, number] | undefined>(DEFAULT_PICKUP_COORDS);
  const [destinationCoords, setDestinationCoords] = useState<[number, number] | undefined>(DEFAULT_DESTINATION_COORDS);
  const requestRideMut = useRequestRide();

  const distanceKm = 6.4; // TODO: compute from coords using haversine
  const baseFare = BASE_FARE + distanceKm * PER_KM;
  const selectedOpt = RIDE_OPTIONS.find((r) => r.type === selectedType)!;
  const fare = Math.round(baseFare * selectedOpt.multiplier);

  const handleRequest = async () => {
    try {
      const res = await requestRideMut.mutateAsync({
        type: selectedType,
        pickup,
        destination,
        fare,
        distanceKm,
        estimatedMin: Math.round(distanceKm * 4),
      });
      pushToast({ title: "Ride requested", description: `Code: ${res.ride.code}` });
      navigate("ride-tracking", { rideId: res.ride.id });
    } catch (err: any) {
      pushToast({ title: "Failed to request ride", description: err.message });
    }
  };

  return (
    <div className="pb-28 min-h-screen">
      <BackHeader title="Book a ride" onBack={back} />

      {/* Real map — OpenStreetMap tiles via Leaflet */}
      <div className="px-4 pt-3">
        <RideMap
          pickup={pickupCoords}
          destination={destinationCoords}
          height={240}
          className="rounded-2xl overflow-hidden border border-border shadow-card"
        />
      </div>

      {/* Address fields */}
      <div className="px-4 pt-4">
        <div className="rounded-2xl bg-card border border-border shadow-card p-3 space-y-2">
          <AddressRow
            color="bg-rush"
            value={pickup}
            onChange={setPickup}
            placeholder="Pickup location"
            onGeocode={async (addr) => {
              const c = await geocodeAddress(addr);
              if (c) {
                setPickupCoords(c);
                pushToast({ title: "Pickup found on map" });
              } else {
                pushToast({ title: "Couldn't find that address" });
              }
            }}
          />
          <div className="border-t border-border" />
          <AddressRow
            color="bg-ink"
            value={destination}
            onChange={setDestination}
            placeholder="Where are you going?"
            onGeocode={async (addr) => {
              const c = await geocodeAddress(addr);
              if (c) {
                setDestinationCoords(c);
                pushToast({ title: "Destination found on map" });
              } else {
                pushToast({ title: "Couldn't find that address" });
              }
            }}
          />
        </div>
      </div>

      {/* Ride options */}
      <div className="px-4 pt-5">
        <h3 className="text-sm font-bold text-ink mb-2">Choose ride type</h3>
        <div className="space-y-2">
          {RIDE_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            const optFare = Math.round(baseFare * opt.multiplier);
            const isActive = selectedType === opt.type;
            return (
              <button
                key={opt.type}
                onClick={() => setSelectedType(opt.type)}
                className={`w-full flex items-center gap-3 p-3 rounded-2xl border-2 text-left transition-all ${
                  isActive ? "border-rush bg-rush-soft/40" : "border-border bg-card hover:border-ink-soft/30"
                }`}
              >
                <div
                  className={`h-11 w-11 rounded-xl flex items-center justify-center ${
                    isActive ? "rush-gradient text-white" : "bg-muted text-ink-soft"
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-ink">{opt.label}</p>
                    <span className="flex items-center gap-0.5 text-[10px] text-ink-soft">
                      <Clock className="h-2.5 w-2.5" /> {opt.etaMin} min away
                    </span>
                  </div>
                  <p className="text-[11px] text-ink-soft">{opt.description}</p>
                </div>
                <p className="text-sm font-extrabold text-rush">{naira(optFare)}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Payment + safety */}
      <div className="px-4 pt-4 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-muted/40 p-3 flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-rush" />
          <div className="leading-tight">
            <p className="text-[10px] text-ink-soft">Pay with</p>
            <p className="text-xs font-bold text-ink">Rush Wallet</p>
          </div>
        </div>
        <div className="rounded-xl bg-muted/40 p-3 flex items-center gap-2">
          <Shield className="h-4 w-4 text-success" />
          <div className="leading-tight">
            <p className="text-[10px] text-ink-soft">Safety</p>
            <p className="text-xs font-bold text-ink">Verified riders</p>
          </div>
        </div>
      </div>

      {/* Ride summary */}
      <div className="px-4 pt-4">
        <div className="rounded-xl bg-rush-soft/40 p-3 text-xs space-y-1">
          <div className="flex justify-between">
            <span className="text-ink-soft">Estimated distance</span>
            <span className="font-semibold text-ink">{distanceKm} km</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-soft">Estimated time</span>
            <span className="font-semibold text-ink">~{Math.round(distanceKm * 4)} min</span>
          </div>
        </div>
      </div>

      {/* Sticky CTA */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-background border-t border-border safe-bottom">
        <div className={`mx-auto ${CONTENT_WIDTH} px-4 py-3 flex items-center gap-3`}>
          <div className="flex-1">
            <p className="text-[10px] text-ink-soft">
              {selectedOpt.label} · {distanceKm} km
            </p>
            <p className="text-base font-extrabold text-ink">{naira(fare)}</p>
          </div>
          <button
            onClick={handleRequest}
            disabled={requestRideMut.isPending}
            className="h-12 px-6 rounded-xl rush-gradient text-white font-bold text-sm shadow-rush disabled:opacity-60 flex items-center gap-2"
          >
            {requestRideMut.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {requestRideMut.isPending ? "Requesting…" : "Request ride"}
          </button>
        </div>
      </div>
    </div>
  );
}

function AddressRow({
  color,
  value,
  onChange,
  onGeocode,
  placeholder,
}: {
  color: string;
  value: string;
  onChange: (v: string) => void;
  onGeocode?: (addr: string) => void | Promise<void>;
  placeholder: string;
}) {
  const [locating, setLocating] = useState(false);
  return (
    <div className="flex items-center gap-2.5">
      <span className={`h-2.5 w-2.5 rounded-full ${color} shrink-0`} />
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="flex-1 bg-transparent text-sm text-ink focus:outline-none placeholder:text-ink-soft"
      />
      {onGeocode && value && (
        <button
          onClick={async () => {
            setLocating(true);
            try {
              await onGeocode(value);
            } finally {
              setLocating(false);
            }
          }}
          disabled={locating}
          className="text-rush hover:text-rush-deep disabled:opacity-50 shrink-0"
          aria-label="Find on map"
          title="Find on map"
        >
          {locating ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Navigation className="h-3.5 w-3.5" />
          )}
        </button>
      )}
      {value && (
        <button onClick={() => onChange("")} className="text-ink-soft hover:text-ink shrink-0" aria-label="Clear">
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

export function RideTrackingScreen() {
  const { back, params, pushToast } = useRush();
  const { data, isLoading } = useRide(params.rideId);
  const cancelRide = useCancelRide();
  // Geocoded pickup/destination coords — set on ride load so the
  // map shows the right markers without needing lat/lng on the ride
  // model itself.
  const [pickupCoords, setPickupCoords] = useState<[number, number] | null>(null);
  const [destinationCoords, setDestinationCoords] = useState<[number, number] | null>(null);

  // Once we have the ride, geocode pickup & destination in parallel.
  // Nominatim usage policy asks for ≤1 req/sec; we fire both at once
  // on mount (which is a single user-initiated event) — acceptable.
  useEffect(() => {
    if (!data?.ride) return;
    let cancelled = false;
    (async () => {
      const [p, d] = await Promise.all([
        geocodeAddress(data.ride.pickup),
        geocodeAddress(data.ride.destination),
      ]);
      if (cancelled) return;
      if (p) setPickupCoords(p);
      if (d) setDestinationCoords(d);
    })();
    return () => { cancelled = true; };
  }, [data?.ride]);

  if (isLoading) {
    return (
      <div className="pb-6 min-h-screen">
        <BackHeader title="Ride tracking" onBack={back} />
        <div className="pt-16 flex items-center justify-center text-ink-soft">
          <Loader2 className="h-6 w-6 animate-spin" />
        </div>
      </div>
    );
  }

  const ride = data?.ride;

  if (!ride) {
    return (
      <div className="pb-6 min-h-screen">
        <BackHeader title="Ride tracking" onBack={back} />
        <p className="p-6 text-center text-sm text-ink-soft">Ride not found.</p>
      </div>
    );
  }

  const canCancel = ride.status === "SEARCHING" || ride.status === "ASSIGNED";

  async function handleCancel() {
    if (!window.confirm("Cancel this ride?")) return;
    try {
      await cancelRide.mutateAsync(ride!.id);
      pushToast({ title: "Ride cancelled" });
    } catch (err) {
      pushToast({ title: "Couldn't cancel ride", description: err instanceof ApiError ? err.message : undefined });
    }
  }

  return (
    <div className="pb-6 min-h-screen">
      <BackHeader title={`Ride ${ride.code}`} onBack={back} />

      {/* Real map — geocode the ride's pickup/destination on mount */}
      <div className="px-4 pt-3">
        <RideMap
          pickup={pickupCoords ?? undefined}
          destination={destinationCoords ?? undefined}
          rideStatus={ride.status}
          height={280}
          className="rounded-2xl overflow-hidden border border-border shadow-card"
        />

        <div className="mt-2 flex items-center justify-center">
          <div className="px-3 py-1.5 rounded-full bg-background/90 backdrop-blur-sm shadow-sm flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full bg-success animate-pulse" />
            <span className="text-xs font-bold text-ink">
              {ride.status === "SEARCHING" ? "Finding rider…" : `En route · ${ride.estimatedMin} min`}
            </span>
          </div>
        </div>
      </div>

      {/* Rider info */}
      {ride.rider && (
        <div className="px-4 pt-4">
          <div className="rounded-2xl rush-gradient p-4 text-white shadow-rush">
            <p className="text-[11px] font-semibold uppercase tracking-wider opacity-90">Your rider</p>
            <div className="flex items-center gap-3 mt-2">
              <div className="h-14 w-14 rounded-full bg-white/20 ring-2 ring-white/40 overflow-hidden">
                {ride.rider.avatar && (
                  <img src={ride.rider.avatar} alt={ride.rider.name} className="w-full h-full object-cover" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-base font-bold">{ride.rider.name}</p>
                <p className="text-xs opacity-90 flex items-center gap-1.5">
                  {ride.rider.vehicleModel || "Vehicle"} · {ride.rider.vehiclePlate || ""}
                  <span className="flex items-center gap-0.5">
                    <Star className="h-3 w-3 fill-white" /> {ride.rider.rating}
                  </span>
                </p>
              </div>
              <button
                onClick={() => pushToast({ title: "Calling rider…" })}
                className="h-9 w-9 rounded-full bg-white/20 flex items-center justify-center"
                aria-label="Call"
              >
                <svg className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Trip details */}
      <div className="px-4 pt-4">
        <div className="rounded-2xl bg-card border border-border shadow-card p-4">
          <h3 className="text-sm font-bold text-ink mb-3">Trip details</h3>
          <div className="space-y-3">
            <Stop dot="bg-rush" label="Pickup" address={ride.pickup} />
            <div className="ml-1.5 border-l-2 border-dashed border-border h-4" />
            <Stop dot="bg-ink" label="Destination" address={ride.destination} />
          </div>
          <div className="mt-3 pt-3 border-t border-border grid grid-cols-3 gap-2 text-center">
            <Detail value={`${ride.distanceKm} km`} label="Distance" />
            <Detail value={`${ride.estimatedMin} min`} label="ETA" />
            <Detail value={naira(ride.fare)} label="Fare" />
          </div>
        </div>
      </div>

      {/* Cancel */}
      {canCancel && (
        <div className="px-4 pt-3">
          <button
            onClick={handleCancel}
            disabled={cancelRide.isPending}
            className="w-full flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-destructive/10 text-destructive text-sm font-bold disabled:opacity-60"
          >
            {cancelRide.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
            Cancel ride
          </button>
        </div>
      )}

      {/* Safety */}
      <div className="px-4 pt-3">
        <button
          onClick={() => pushToast({ title: "Trip shared with emergency contact" })}
          className="w-full flex items-center gap-2.5 p-3 rounded-xl bg-muted/40 text-left"
        >
          <Shield className="h-4 w-4 text-success" />
          <div className="flex-1">
            <p className="text-xs font-semibold text-ink">Share trip status</p>
            <p className="text-[10px] text-ink-soft">Let a contact follow your ride in real-time</p>
          </div>
        </button>
      </div>
    </div>
  );
}

function Stop({ dot, label, address }: { dot: string; label: string; address: string }) {
  return (
    <div className="flex items-start gap-2.5">
      <span className={`h-3 w-3 rounded-full ${dot} ring-2 ring-background shrink-0 mt-0.5`} />
      <div className="flex-1 min-w-0">
        <p className="text-[10px] text-ink-soft uppercase tracking-wider">{label}</p>
        <p className="text-sm font-semibold text-ink line-clamp-1">{address}</p>
      </div>
    </div>
  );
}

function Detail({ value, label }: { value: string; label: string }) {
  return (
    <div>
      <p className="text-sm font-bold text-ink">{value}</p>
      <p className="text-[10px] text-ink-soft">{label}</p>
    </div>
  );
}
