"use client";

import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Navigation, ExternalLink } from "lucide-react";

// Fix Leaflet's default icon path issues in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Custom distinct icons for Origin Depot and Job Site
const depotMarkerIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const siteMarkerIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function calculateHaversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Number((R * c).toFixed(1));
}

// Automatically fits map bounds to contain both Depot and Site + Road Polyline
function MapBoundsUpdater({ bounds }: { bounds: L.LatLngBoundsExpression | null }) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      try {
        map.fitBounds(bounds, { padding: [45, 45], maxZoom: 14 });
      } catch (e) {
        // Safe fallback if map is unmounting
      }
    }
  }, [map, bounds]);
  return null;
}

interface AssetMapClientProps {
  latitude?: number | null;
  longitude?: number | null;
  label?: string;
  depotLatitude?: number | null;
  depotLongitude?: number | null;
  depotName?: string | null;
}

export default function AssetMapClient({
  latitude,
  longitude,
  label = "Customer Job Site",
  depotLatitude = 9.5916,
  depotLongitude = 76.5222,
  depotName = "Zero Group Main Yard & Store",
}: AssetMapClientProps) {
  const [mounted, setMounted] = useState(false);
  const [roadCoordinates, setRoadCoordinates] = useState<[number, number][] | null>(null);
  const [roadDistanceKm, setRoadDistanceKm] = useState<number | null>(null);
  const [roadDurationMins, setRoadDurationMins] = useState<number | null>(null);
  const [isRoadSnapped, setIsRoadSnapped] = useState<boolean>(false);
  const [isRoadLoading, setIsRoadLoading] = useState<boolean>(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const originLat = depotLatitude ?? 9.5916;
  const originLng = depotLongitude ?? 76.5222;

  const hasSiteCoords =
    latitude != null &&
    longitude != null &&
    !isNaN(Number(latitude)) &&
    !isNaN(Number(longitude)) &&
    (Number(latitude) !== 0 || Number(longitude) !== 0);

  const siteLat = hasSiteCoords ? Number(latitude) : null;
  const siteLng = hasSiteCoords ? Number(longitude) : null;

  // Asynchronously fetch actual road navigation geometry from OSRM via /api/routing/directions
  useEffect(() => {
    if (!hasSiteCoords || siteLat === null || siteLng === null) {
      setRoadCoordinates(null);
      setRoadDistanceKm(null);
      setRoadDurationMins(null);
      setIsRoadSnapped(false);
      setIsRoadLoading(false);
      return;
    }

    let isSubscribed = true;
    setIsRoadLoading(true);

    fetch("/api/routing/directions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        origin: [originLat, originLng],
        destination: [siteLat, siteLng],
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!isSubscribed) return;
        if (data.success && Array.isArray(data.coordinates) && data.coordinates.length >= 2) {
          setRoadCoordinates(data.coordinates);
          if (typeof data.distanceKm === "number") {
            setRoadDistanceKm(data.distanceKm);
          }
          if (typeof data.durationMins === "number" || typeof data.durationMin === "number") {
            setRoadDurationMins(data.durationMins ?? data.durationMin);
          }
          setIsRoadSnapped(Boolean(data.isRoadSnapped));
        }
      })
      .catch((err) => {
        console.warn("[AssetMapClient] Road routing fetch failed, fallback to straight line:", err);
      })
      .finally(() => {
        if (isSubscribed) setIsRoadLoading(false);
      });

    return () => {
      isSubscribed = false;
    };
  }, [hasSiteCoords, originLat, originLng, siteLat, siteLng]);

  if (!mounted) return null;

  // Center on midpoint if both points exist, otherwise depot
  const center: [number, number] =
    hasSiteCoords && siteLat !== null && siteLng !== null
      ? [(originLat + siteLat) / 2, (originLng + siteLng) / 2]
      : [originLat, originLng];

  // Calculated Haversine straight-line distance as baseline
  const straightDistanceKm =
    hasSiteCoords && siteLat !== null && siteLng !== null
      ? calculateHaversineKm(originLat, originLng, siteLat, siteLng)
      : null;

  const displayDistanceKm = roadDistanceKm ?? straightDistanceKm;

  // Use real road geometry when available; fallback to straight line
  const activePolyline: [number, number][] =
    hasSiteCoords && siteLat !== null && siteLng !== null
      ? (roadCoordinates && roadCoordinates.length >= 2
          ? roadCoordinates
          : [
              [originLat, originLng],
              [siteLat, siteLng],
            ])
      : [];

  // Bounding box for auto-framing
  const mapBounds: L.LatLngBoundsExpression | null =
    hasSiteCoords && siteLat !== null && siteLng !== null
      ? [
          [Math.min(originLat, siteLat), Math.min(originLng, siteLng)],
          [Math.max(originLat, siteLat), Math.max(originLng, siteLng)],
        ]
      : null;

  const directionsUrl =
    hasSiteCoords && siteLat !== null && siteLng !== null
      ? `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${siteLat},${siteLng}`
      : `https://www.google.com/maps/search/?api=1&query=${originLat},${originLng}`;

  return (
    <div className="relative w-full h-[400px] z-0 rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
      {/* Route & Status Floating HUD */}
      <div className="absolute top-3 left-3 right-3 z-[400] flex flex-wrap items-center justify-between gap-2 pointer-events-none">
        <div className="bg-slate-950/90 border border-slate-800 backdrop-blur-md px-3.5 py-1.5 rounded-xl text-xs shadow-xl flex items-center gap-2 pointer-events-auto">
          {hasSiteCoords ? (
            <>
              <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-slate-400 font-medium">Route:</span>
              <span className="text-cyan-300 font-bold truncate max-w-[200px] sm:max-w-[300px]">
                Main Yard ➔ {label}
              </span>
              {displayDistanceKm !== null && (
                <span className="font-mono text-emerald-400 font-bold bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 text-[11px] flex items-center gap-1">
                  <span>{isRoadSnapped ? "🛣️ Road" : "📏"}</span>
                  <span>{displayDistanceKm} km</span>
                  {roadDurationMins !== null && (
                    <span className="text-slate-400 font-normal">
                      (~{roadDurationMins} min)
                    </span>
                  )}
                </span>
              )}
            </>
          ) : (
            <>
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-slate-400 font-medium">Asset Status:</span>
              <span className="text-emerald-300 font-bold">
                Stationed at Yard / Base ({depotName})
              </span>
            </>
          )}
        </div>

        <a
          href={directionsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-slate-950/90 hover:bg-slate-900 border border-slate-800 text-blue-400 hover:text-blue-300 backdrop-blur-md px-3 py-1.5 rounded-xl text-xs font-bold shadow-xl flex items-center gap-1.5 transition-all pointer-events-auto"
        >
          <Navigation className="w-3.5 h-3.5 text-blue-400" />
          <span>{hasSiteCoords ? "Turn-by-turn Navigation" : "View Depot on Maps"}</span>
          <ExternalLink className="w-3 h-3 opacity-60" />
        </a>
      </div>

      <MapContainer
        center={center}
        zoom={hasSiteCoords ? 12 : 14}
        scrollWheelZoom={true}
        className="w-full h-full z-0"
      >
        <MapBoundsUpdater bounds={mapBounds} />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* 1. Origin Depot / Yard Marker */}
        <Marker position={[originLat, originLng]} icon={depotMarkerIcon}>
          <Popup className="custom-popup">
            <div className="p-1 min-w-[180px] space-y-1">
              <span className="text-[10px] font-black uppercase text-emerald-600 tracking-wider flex items-center gap-1">
                🏢 Company Origin Yard / Depot
              </span>
              <h3 className="font-bold text-slate-900 text-sm">{depotName}</h3>
              <p className="text-xs text-slate-500 font-mono">
                {originLat.toFixed(4)}, {originLng.toFixed(4)}
              </p>
              {!hasSiteCoords && (
                <p className="text-[11px] text-emerald-700 bg-emerald-50 p-1 rounded font-medium mt-1">
                  Asset is currently stationed at Yard storage.
                </p>
              )}
            </div>
          </Popup>
        </Marker>

        {/* 2. Destination Job Site Marker (when dispatched) */}
        {hasSiteCoords && siteLat !== null && siteLng !== null && (
          <Marker position={[siteLat, siteLng]} icon={siteMarkerIcon}>
            <Popup className="custom-popup">
              <div className="p-1 min-w-[180px] space-y-1">
                <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider flex items-center gap-1">
                  📍 Active Job Site Destination
                </span>
                <h3 className="font-bold text-slate-900 text-sm">{label}</h3>
                <p className="text-xs text-slate-500 font-mono">
                  {siteLat.toFixed(4)}, {siteLng.toFixed(4)}
                </p>
                {displayDistanceKm !== null && (
                  <p className="text-[11px] text-cyan-700 bg-cyan-50 p-1 rounded font-medium mt-1">
                    Route distance: ~{displayDistanceKm} km {isRoadSnapped ? "(driving)" : "(direct)"}
                    {roadDurationMins ? ` • ~${roadDurationMins} min drive` : ""}
                  </p>
                )}
              </div>
            </Popup>
          </Marker>
        )}

        {/* 3. Route Polyline: Real road geometry when snapped, or dashed direct line */}
        {activePolyline.length >= 2 && (
          <>
            {/* Outer Glow Line */}
            <Polyline
              positions={activePolyline}
              pathOptions={{
                color: isRoadSnapped ? "#0284c7" : "#38bdf8",
                weight: isRoadSnapped ? 7 : 6,
                opacity: 0.4,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
            {/* Core Road Navigation Line */}
            <Polyline
              positions={activePolyline}
              pathOptions={{
                color: isRoadSnapped ? "#2563eb" : "#0284c7",
                weight: isRoadSnapped ? 4.5 : 3.5,
                dashArray: isRoadSnapped ? undefined : "8, 10",
                opacity: 0.95,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
          </>
        )}
      </MapContainer>
    </div>
  );
}
