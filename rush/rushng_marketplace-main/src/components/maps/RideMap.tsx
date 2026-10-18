"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Polyline,
  useMap,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

/**
 * RideMap — a real OpenStreetMap-backed map for ride booking/tracking.
 *
 * Replaces the previous SVG fake map in RideScreen. Uses Leaflet via
 * react-leaflet (no API key, no billing). Tiles are OSM Standard —
 * free, no rate-limit issues at our scale.
 *
 * Usage:
 *   <RideMap pickup={[6.5, 3.3]} destination={[6.6, 3.4]} />
 *   <RideMap pickup={[6.5, 3.3]} destination={[6.6, 3.4]} rideStatus="ASSIGNED" />
 *
 * If pickup/destination are missing, falls back to a default Lagos
 * viewport so the map renders even before the user types addresses.
 */

// Default center: Lagos island. Used before the user types addresses.
const LAGOS_CENTER: [number, number] = [6.4541, 3.3947];

// Custom marker icons — Leaflet's default marker images don't load
// when bundled (URLs are wrong). We use divIcons instead, which
// render as pure CSS — no asset dependency.
const pickupIcon = L.divIcon({
  className: "rush-map-marker",
  html: `<div style="
    width:18px;height:18px;border-radius:9999px;background:#FF6B1A;
    border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const destinationIcon = L.divIcon({
  className: "rush-map-marker",
  html: `<div style="
    width:18px;height:18px;border-radius:9999px;background:#171717;
    border:3px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);
  "></div>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const riderIcon = L.divIcon({
  className: "rush-map-marker",
  html: `<div style="
    width:22px;height:22px;border-radius:9999px;background:white;
    border:3px solid #FF6B1A;display:flex;align-items:center;justify-content:center;
    box-shadow:0 2px 8px rgba(0,0,0,0.3);
  ">
    <div style="width:8px;height:8px;border-radius:9999px;background:#FF6B1A;animation:rush-pulse 1.4s ease-in-out infinite;"></div>
  </div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
});

interface RideMapProps {
  pickup?: [number, number];
  destination?: [number, number];
  rider?: [number, number];
  rideStatus?:
    | "SEARCHING"
    | "ASSIGNED"
    | "EN_ROUTE_PICKUP"
    | "IN_PROGRESS"
    | "COMPLETED"
    | "CANCELLED";
  className?: string;
  height?: number;
}

/**
 * Helper component — gives us access to the map instance so we can
 * imperatively flyTo / fitBounds when props change.
 */
function MapController({
  pickup,
  destination,
  rider,
}: {
  pickup?: [number, number];
  destination?: [number, number];
  rider?: [number, number];
}) {
  const map = useMap();

  useEffect(() => {
    // If we have both pickup & destination, fit the bounds to show
    // both. Otherwise, fly to whichever point we have.
    if (pickup && destination) {
      const bounds = L.latLngBounds([pickup, destination]);
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
    } else if (rider) {
      map.flyTo(rider, 15, { duration: 1 });
    } else if (pickup) {
      map.flyTo(pickup, 15, { duration: 1 });
    }
  }, [map, pickup, destination, rider]);

  return null;
}

export function RideMap({
  pickup,
  destination,
  rider,
  rideStatus,
  className,
  height = 240,
}: RideMapProps) {
  // Compute the polyline points. If we have a rider mid-ride, draw
  // pickup→rider→destination; otherwise pickup→destination.
  const polylinePoints: [number, number][] = useMemo(() => {
    const pts: [number, number][] = [];
    if (pickup) pts.push(pickup);
    if (rider && rideStatus === "IN_PROGRESS") pts.push(rider);
    if (destination) pts.push(destination);
    return pts;
  }, [pickup, destination, rider, rideStatus]);

  // Center: midpoint between pickup and destination, or whichever
  // point we have, or Lagos.
  const center: [number, number] = useMemo(() => {
    if (pickup && destination) {
      return [(pickup[0] + destination[0]) / 2, (pickup[1] + destination[1]) / 2];
    }
    return pickup ?? destination ?? LAGOS_CENTER;
  }, [pickup, destination]);

  // Stable key — MapContainer should not re-mount on prop changes.
  const mapKey = useRef("ride-map").current;

  return (
    <div
      className={className ?? "rounded-2xl overflow-hidden border border-border shadow-card"}
      style={{ height, width: "100%" }}
    >
      <MapContainer
        key={mapKey}
        center={center}
        zoom={13}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%", background: "#e5e7eb" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {pickup && <Marker position={pickup} icon={pickupIcon} />}
        {destination && <Marker position={destination} icon={destinationIcon} />}
        {rider && rideStatus !== "COMPLETED" && (
          <Marker position={rider} icon={riderIcon} />
        )}
        {polylinePoints.length >= 2 && (
          <Polyline
            positions={polylinePoints}
            pathOptions={{
              color: "#FF6B1A",
              weight: 4,
              opacity: 0.85,
              dashArray: rider && rideStatus === "IN_PROGRESS" ? undefined : "8 8",
            }}
          />
        )}
        <MapController pickup={pickup} destination={destination} rider={rider} />
      </MapContainer>
    </div>
  );
}
