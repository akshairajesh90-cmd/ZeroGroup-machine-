"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
  CircleMarker,
  useMap,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import {
  MapPin,
  Truck,
  PhoneCall,
  ExternalLink,
  Navigation,
  Clock,
  Sparkles,
  Layers,
  Route,
  X,
} from "lucide-react";

// Fix Leaflet's default icon path issues in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const siteMarkerIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const operatorMarkerIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Dedicated Store / Base Yard Building Icon (Emerald Warehouse)
const storeMarkerIcon = L.divIcon({
  className: "custom-store-marker",
  html: `
    <div style="position: relative; width: 42px; height: 42px; display: flex; align-items: center; justify-content: center;">
      <div style="width: 38px; height: 38px; background: #059669; border: 3px solid #ffffff; box-shadow: 0 4px 16px rgba(0,0,0,0.5); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white;">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
      </div>
      <span style="position: absolute; top: -3px; right: -3px; width: 12px; height: 12px; background: #fbbf24; border: 2.5px solid #ffffff; border-radius: 50%; box-shadow: 0 0 6px #fbbf24;"></span>
    </div>
  `,
  iconSize: [42, 42],
  iconAnchor: [21, 21],
  popupAnchor: [0, -21],
});

// Dynamic Heading-Bearing Rotated Vehicle Icon
function createVehicleIcon(bearing: number = 0, speed: number = 0, isSelected: boolean = false) {
  const isMoving = speed >= 3;
  const bgColor = isSelected ? "#10b981" : isMoving ? "#0284c7" : "#475569";

  return L.divIcon({
    className: "custom-bearing-marker",
    html: `
      <div style="position: relative; width: 38px; height: 38px; display: flex; align-items: center; justify-content: center;">
        <div style="transform: rotate(${bearing}deg); transition: transform 0.4s ease-out; width: 36px; height: 36px; background: ${bgColor}; border: 2.5px solid #ffffff; box-shadow: 0 4px 14px rgba(0,0,0,0.45); border-radius: 50%; display: flex; align-items: center; justify-content: center;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#ffffff" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="12 2 19 21 12 17 5 21 12 2"></polygon>
          </svg>
        </div>
        ${
          isMoving
            ? '<span style="position: absolute; top: -1px; right: -1px; width: 10px; height: 10px; background: #10b981; border: 2px solid #ffffff; border-radius: 50%; box-shadow: 0 0 6px #10b981;"></span>'
            : ""
        }
      </div>
    `,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
    popupAnchor: [0, -19],
  });
}

// Scrubber Ghost Replay Icon
const playbackMarkerIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gold.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

function MapResizer() {
  const map = useMap();
  useEffect(() => {
    map.invalidateSize();
    const t1 = setTimeout(() => map.invalidateSize(), 250);
    const t2 = setTimeout(() => map.invalidateSize(), 800);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [map]);
  return null;
}

function MapCameraController({
  targetCenter,
  zoom,
}: {
  targetCenter: [number, number] | null;
  zoom?: number;
}) {
  const map = useMap();
  useEffect(() => {
    if (targetCenter && Math.abs(targetCenter[0]) > 1 && Math.abs(targetCenter[1]) > 1) {
      map.flyTo(targetCenter, zoom || 14, { duration: 1.2 });
    }
  }, [targetCenter, zoom, map]);
  return null;
}

export interface MapDriverPin {
  id: string;
  name: string;
  role: string;
  phone?: string | null;
  lat: number;
  lng: number;
  speed: number;
  bearing: number;
  lastUpdate: string;
  dispatchId?: string | null;
  customerName?: string | null;
  location?: string | null;
  machineId?: string | null;
  vehiclePlate?: string | null;
}

export interface MapSitePin {
  id: string;
  location: string;
  lat: number;
  lng: number;
  customerName: string;
  customerPhone?: string | null;
  status: string;
  machineId?: string | null;
  driverName?: string | null;
  operatorName?: string | null;
  vehiclePlate?: string | null;
}

export interface MapRouteWaypoint {
  lat: number;
  lng: number;
  time: string;
  speed?: number | null;
}

export interface StoreLocationProps {
  storeName: string;
  storeAddress: string;
  storeLatitude: number;
  storeLongitude: number;
}

interface UnifiedMapInnerProps {
  drivers: MapDriverPin[];
  sites: MapSitePin[];
  storeLocation?: StoreLocationProps | null;
  onOpenEditStore?: () => void;
  onOpenEditSite?: (siteId: string) => void;
  selectedDispatchId: string | null;
  onSelectDispatch: (id: string) => void;
  flyToCenter: [number, number] | null;
  activeTrail: MapRouteWaypoint[];
  playbackPoint: MapRouteWaypoint | null;
}

export default function UnifiedMapInner({
  drivers,
  sites,
  storeLocation,
  onOpenEditStore,
  onOpenEditSite,
  selectedDispatchId,
  onSelectDispatch,
  flyToCenter,
  activeTrail,
  playbackPoint,
}: UnifiedMapInnerProps) {
  // 100% FREE Map Tile Style: "osm" (Standard OpenStreetMap - Zero API Key, Zero Watermark) | "hot" (OSM High-Contrast Roads) | "satellite" (Esri Satellite)
  const [tileStyle, setTileStyle] = useState<"osm" | "hot" | "satellite">("osm");

  // Road-snapped GPS trail coordinates (hugs real street curves)
  const [snappedTrail, setSnappedTrail] = useState<[number, number][]>([]);

  // Road-snapped Turn-by-Turn Driving Route between origin (truck/store) and customer site
  const [navRoute, setNavRoute] = useState<{
    coordinates: [number, number][];
    distanceKm: number;
    durationMins: number;
    destName: string;
    originName: string;
  } | null>(null);

  // Default map center (Pala / Kottayam, Central Kerala) - strictly validated against Null Island [0, 0]
  const defaultCenter: [number, number] = useMemo(() => {
    if (storeLocation && typeof storeLocation.storeLatitude === "number" && typeof storeLocation.storeLongitude === "number" && Math.abs(storeLocation.storeLatitude) > 1) {
      return [storeLocation.storeLatitude, storeLocation.storeLongitude];
    }
    const validSite = sites.find((s) => s.lat && s.lng && Math.abs(s.lat) > 1);
    if (validSite) return [validSite.lat, validSite.lng];

    const validDriver = drivers.find((d) => d.lat && d.lng && Math.abs(d.lat) > 1);
    if (validDriver) return [validDriver.lat, validDriver.lng];

    return [9.5916, 76.5222];
  }, [storeLocation, sites, drivers]);

  // Fetch Road-Snapped Driving Navigation Route for active dispatch or first site
  useEffect(() => {
    // If a dispatch is selected, use it; otherwise use the first site with coordinates
    const targetSite = selectedDispatchId
      ? sites.find((s) => s.id === selectedDispatchId)
      : sites.find((s) => s.lat && s.lng && Math.abs(s.lat) > 1);

    if (!targetSite || !targetSite.lat || !targetSite.lng) {
      setNavRoute(null);
      return;
    }
    const site = targetSite;

    // Determine Origin: assigned driver if active with coordinates, otherwise Store Base Yard
    const assignedDriver = drivers.find((d) => d.dispatchId === selectedDispatchId);
    let originLat: number | null = null;
    let originLng: number | null = null;
    let originName = "Base Yard";

    if (assignedDriver && assignedDriver.lat && assignedDriver.lng) {
      originLat = assignedDriver.lat;
      originLng = assignedDriver.lng;
      originName = assignedDriver.name || "Fleet Truck";
    } else if (storeLocation && storeLocation.storeLatitude && storeLocation.storeLongitude) {
      originLat = storeLocation.storeLatitude;
      originLng = storeLocation.storeLongitude;
      originName = storeLocation.storeName || "Main Yard";
    }

    if (originLat === null || originLng === null) {
      setNavRoute(null);
      return;
    }

    let isSubscribed = true;

    fetch("/api/routing/directions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        origin: [originLat, originLng],
        destination: [site.lat, site.lng],
      }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isSubscribed) return;
        if (data && data.success && Array.isArray(data.coordinates) && data.coordinates.length > 0) {
          setNavRoute({
            coordinates: data.coordinates,
            distanceKm: data.distanceKm || 0,
            durationMins: data.durationMins || data.durationMin || 0,
            destName: site.customerName || site.location || "Customer Site",
            originName,
          });
        } else {
          // Fallback to direct coordinates if offline or outside boundary
          setNavRoute({
            coordinates: [
              [originLat!, originLng!],
              [site.lat, site.lng],
            ],
            distanceKm: 0,
            durationMins: 0,
            destName: site.customerName || site.location || "Customer Site",
            originName,
          });
        }
      })
      .catch((err) => {
        console.warn("[UnifiedMap] Directions fetch failed:", err);
      });

    return () => {
      isSubscribed = false;
    };
  }, [selectedDispatchId, sites, drivers, storeLocation]);

  // Fetch Road-Snapped coordinates for driver's GPS trail (OSRM street matching)
  useEffect(() => {
    if (!activeTrail || activeTrail.length < 2) {
      setSnappedTrail([]);
      return;
    }

    let isSubscribed = true;

    fetch("/api/routing/directions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        waypoints: activeTrail.map((p) => [p.lat, p.lng]),
      }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isSubscribed) return;
        if (data && data.success && Array.isArray(data.coordinates) && data.coordinates.length > 0) {
          setSnappedTrail(data.coordinates);
        } else {
          setSnappedTrail(activeTrail.map((p) => [p.lat, p.lng]));
        }
      })
      .catch((err) => {
        console.warn("[UnifiedMap] Trail snapping failed:", err);
        if (isSubscribed) {
          setSnappedTrail(activeTrail.map((p) => [p.lat, p.lng]));
        }
      });

    return () => {
      isSubscribed = false;
    };
  }, [activeTrail]);

  return (
    <div className="w-full h-full min-h-[520px] rounded-3xl overflow-hidden relative border border-slate-800 shadow-2xl">
      {/* 🗺️ 100% FREE TILE LAYER SWITCHER (Zero API Key, Zero Watermark, 100% Free Forever) */}
      <div className="absolute top-3 right-3 z-[400] bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl p-1 shadow-2xl flex items-center gap-1 text-[11px] font-bold">
        <button
          type="button"
          onClick={() => setTileStyle("osm")}
          className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
            tileStyle === "osm"
              ? "bg-blue-600 text-white shadow-md shadow-blue-600/40 font-black"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/70"
          }`}
          title="OpenStreetMap Standard (100% Free, No Watermarks, No API Key)"
        >
          <span>🗺️ Street</span>
          <span className="text-[9px] px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 rounded font-bold">100% Free</span>
        </button>
        <button
          type="button"
          onClick={() => setTileStyle("hot")}
          className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
            tileStyle === "hot"
              ? "bg-blue-600 text-white shadow-md shadow-blue-600/40 font-black"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/70"
          }`}
          title="OSM High-Contrast Roads & Streets (100% Free, No API Key)"
        >
          <span>🛣️ Roads</span>
        </button>
        <button
          type="button"
          onClick={() => setTileStyle("satellite")}
          className={`px-3 py-1.5 rounded-xl transition-all flex items-center gap-1.5 ${
            tileStyle === "satellite"
              ? "bg-blue-600 text-white shadow-md shadow-blue-600/40 font-black"
              : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/70"
          }`}
          title="Esri Satellite aerial photography"
        >
          <span>🛰️ Satellite</span>
        </button>
      </div>

      {/* 🚗 FLOATING ROAD NAVIGATION ROUTE HUD (Turn-by-turn road geometry details) */}
      {navRoute && (
        <div className="absolute top-3 left-14 z-[400] bg-slate-900/95 backdrop-blur-md border border-blue-500/50 rounded-2xl px-3.5 py-2 shadow-2xl flex items-center gap-3 text-xs text-white max-w-[80%] animate-in fade-in slide-in-from-top-2 duration-300">
          <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-blue-400 border border-blue-500/40 flex items-center justify-center shrink-0">
            <Navigation className="w-4 h-4 animate-pulse" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="font-black text-slate-100 truncate">{navRoute.destName}</span>
              <span className="px-1.5 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded font-bold text-[10px] shrink-0">
                ✓ Road Snapped
              </span>
            </div>
            <p className="text-slate-300 text-[11px] flex items-center gap-2 flex-wrap">
              <span className="font-bold text-sky-400">🛣️ {navRoute.distanceKm} km</span>
              <span className="text-slate-500">•</span>
              <span className="font-bold text-emerald-400">⏱️ ~{navRoute.durationMins} mins drive</span>
              <span className="text-slate-500">•</span>
              <span className="text-slate-400 text-[10px] hidden sm:inline">From {navRoute.originName}</span>
            </p>
          </div>
          <button
            type="button"
            onClick={() => setNavRoute(null)}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 shrink-0 ml-1 transition-colors"
            title="Dismiss navigation route"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      <MapContainer
        center={defaultCenter}
        zoom={11}
        scrollWheelZoom={true}
        className="w-full h-full min-h-[520px] z-0"
      >
        <MapResizer />
        <MapCameraController targetCenter={flyToCenter} />

        {/* 🗺️ 100% FREE TILES (No API Keys, No Watermarks, Zero Costs) */}
        {tileStyle === "osm" && (
          <TileLayer
            key="tile-osm"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
          />
        )}
        {tileStyle === "hot" && (
          <TileLayer
            key="tile-hot"
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles style by Humanitarian OpenStreetMap Team'
            url="https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png"
            maxZoom={19}
          />
        )}
        {tileStyle === "satellite" && (
          <TileLayer
            key="tile-satellite"
            attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and GIS User Community'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{x}/{y}"
            maxZoom={18}
          />
        )}

        {/* 🏬 CENTRAL STORE / BASE YARD MARKER */}
        {storeLocation && (
          <Marker
            position={[storeLocation.storeLatitude, storeLocation.storeLongitude]}
            icon={storeMarkerIcon}
          >
            <Popup className="custom-popup">
              <div className="p-1 min-w-[210px] text-xs space-y-1.5">
                <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                  <h4 className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                    🏬 {storeLocation.storeName}
                  </h4>
                  <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                    Base Yard
                  </span>
                </div>
                <p className="text-slate-600 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>{storeLocation.storeAddress}</span>
                </p>
                <div className="text-[10px] text-slate-400 font-mono">
                  GPS: {storeLocation.storeLatitude.toFixed(4)}, {storeLocation.storeLongitude.toFixed(4)}
                </div>
                {onOpenEditStore && (
                  <div className="pt-1.5 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => onOpenEditStore()}
                      className="w-full py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-center text-xs transition-colors shadow"
                    >
                      ✏️ Edit Store Location
                    </button>
                  </div>
                )}
              </div>
            </Popup>
          </Marker>
        )}

        {/* 🚗 ROAD-SNAPPED DRIVING NAVIGATION ROUTE (Turn-by-turn road geometry hugging curves) */}
        {navRoute && navRoute.coordinates.length > 1 && (
          <>
            {/* Outer high-contrast roadway glow */}
            <Polyline
              positions={navRoute.coordinates}
              pathOptions={{
                color: "#0369a1",
                weight: 7,
                opacity: 0.6,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
            {/* Inner electric-blue road line */}
            <Polyline
              positions={navRoute.coordinates}
              pathOptions={{
                color: "#38bdf8",
                weight: 4,
                opacity: 1,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
          </>
        )}

        {/* 1. TODAY'S ROUTE TRAIL (Road-snapped emerald/cyan trail hugging real streets) */}
        {activeTrail.length > 1 && (
          <>
            <Polyline
              positions={
                snappedTrail.length > 1
                  ? snappedTrail
                  : (activeTrail.map((p) => [p.lat, p.lng]) as [number, number][])
              }
              pathOptions={{
                color: "#059669",
                weight: 6,
                opacity: 0.5,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
            <Polyline
              positions={
                snappedTrail.length > 1
                  ? snappedTrail
                  : (activeTrail.map((p) => [p.lat, p.lng]) as [number, number][])
              }
              pathOptions={{
                color: "#10b981",
                weight: 3.5,
                opacity: 0.95,
                lineCap: "round",
                lineJoin: "round",
              }}
            />
            {/* Numbered checkpoint dots along the trail */}
            {activeTrail.map((wp, idx) => (
              <CircleMarker
                key={`wp-${idx}`}
                center={[wp.lat, wp.lng]}
                radius={idx === activeTrail.length - 1 ? 6 : 4}
                pathOptions={{
                  color: "#ffffff",
                  weight: 1.5,
                  fillColor: idx === activeTrail.length - 1 ? "#10b981" : "#0284c7",
                  fillOpacity: 1,
                }}
              >
                <Popup className="custom-popup">
                  <div className="p-1 text-xs">
                    <p className="font-bold text-slate-900 border-b pb-1 mb-1">
                      Checkpoint #{idx + 1}
                    </p>
                    <p className="text-slate-600">
                      Time:{" "}
                      <strong>
                        {new Date(wp.time).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </strong>
                    </p>
                    {wp.speed !== undefined && wp.speed !== null && (
                      <p className="text-slate-600">
                        Speed: <strong>{wp.speed.toFixed(1)} km/h</strong>
                      </p>
                    )}
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </>
        )}

        {/* 2. PLAYBACK SCRUBBER GHOST MARKER (Golden Pin) */}
        {playbackPoint && (
          <Marker
            position={[playbackPoint.lat, playbackPoint.lng]}
            icon={playbackMarkerIcon}
          >
            <Popup className="custom-popup">
              <div className="p-1 text-xs">
                <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-bold">
                  Historical Trip Replay
                </span>
                <p className="mt-1 font-bold text-slate-900">
                  Time: {new Date(playbackPoint.time).toLocaleTimeString("en-IN")}
                </p>
                <p className="text-slate-600">
                  Speed: {playbackPoint.speed ? `${playbackPoint.speed.toFixed(1)} km/h` : "Stationary"}
                </p>
              </div>
            </Popup>
          </Marker>
        )}

        {/* 3. SITE PINS (Violet Markers) */}
        {sites.map((site) => {
          const isSelected = selectedDispatchId === site.id;
          return (
            <Marker
              key={`site-${site.id}`}
              position={[site.lat, site.lng]}
              icon={siteMarkerIcon}
              eventHandlers={{
                click: () => onSelectDispatch(site.id),
              }}
            >
              <Popup className="custom-popup">
                <div className="p-1 min-w-[210px] text-xs space-y-1.5">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                    <h4 className="font-black text-slate-900 text-sm">{site.customerName}</h4>
                    <span className="px-2 py-0.5 rounded bg-violet-100 text-violet-800 font-bold text-[10px]">
                      {site.status}
                    </span>
                  </div>
                  <p className="text-slate-600 flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-emerald-600" />
                    <span>{site.location}</span>
                  </p>
                  {site.machineId && (
                    <p className="text-slate-700">
                      Machine: <strong>{site.machineId}</strong>
                    </p>
                  )}
                  {site.driverName && (
                    <p className="text-slate-700">
                      Driver: <strong>{site.driverName}</strong>
                    </p>
                  )}
                  <div className="pt-1.5 border-t flex justify-between items-center gap-1.5 flex-wrap">
                    <a
                      href={`https://www.google.com/maps/search/?api=1&query=${site.lat},${site.lng}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-600 hover:underline font-bold inline-flex items-center gap-1 text-[11px]"
                    >
                      Maps <ExternalLink className="w-3 h-3" />
                    </a>
                    <div className="flex items-center gap-1">
                      {onOpenEditSite && (
                        <button
                          type="button"
                          onClick={() => onOpenEditSite(site.id)}
                          className="px-2 py-0.5 bg-amber-500/10 text-amber-800 border border-amber-300 rounded font-bold hover:bg-amber-500/20 text-[11px]"
                          title="Edit GPS Coordinates"
                        >
                          ✏️ Edit
                        </button>
                      )}
                      <button
                        onClick={() => onSelectDispatch(site.id)}
                        className="px-2 py-0.5 bg-slate-900 text-white rounded font-bold hover:bg-slate-800 text-[11px]"
                      >
                        Card →
                      </button>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          );
        })}

        {/* 4. DRIVER & OPERATOR PINS (Smooth Moving Vehicles with Heading Bearing) */}
        {drivers.map((driver) => {
          const isSelected = driver.dispatchId && selectedDispatchId === driver.dispatchId;
          const markerIcon =
            driver.role === "OPERATOR"
              ? operatorMarkerIcon
              : createVehicleIcon(driver.bearing, driver.speed, !!isSelected);

          return (
            <Marker
              key={`driver-${driver.id}`}
              position={[driver.lat, driver.lng]}
              icon={markerIcon}
              eventHandlers={{
                click: () => {
                  if (driver.dispatchId) onSelectDispatch(driver.dispatchId);
                },
              }}
            >
              <Popup className="custom-popup">
                <div className="p-1 min-w-[200px] text-xs space-y-1.5">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-1">
                    <h4 className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                      <Truck className="w-3.5 h-3.5 text-blue-600" />
                      {driver.name}
                    </h4>
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        driver.speed >= 3
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {driver.speed >= 3 ? `${driver.speed.toFixed(0)} km/h` : "Parked"}
                    </span>
                  </div>

                  <div className="space-y-1 text-slate-600">
                    <p>
                      Role: <strong className="text-slate-800">{driver.role}</strong>
                    </p>
                    {driver.customerName && (
                      <p>
                        Current Job: <strong>{driver.customerName}</strong>
                      </p>
                    )}
                    {driver.vehiclePlate && (
                      <p>
                        Vehicle: <strong className="font-mono">{driver.vehiclePlate}</strong>
                      </p>
                    )}
                    <p className="text-[10px] text-slate-400">
                      Updated: {new Date(driver.lastUpdate).toLocaleTimeString("en-IN")}
                    </p>
                  </div>

                  {driver.phone && (
                    <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between">
                      <a
                        href={`tel:${driver.phone}`}
                        className="px-2.5 py-1 rounded-lg bg-emerald-600 text-white font-bold flex items-center gap-1 hover:bg-emerald-500"
                      >
                        <PhoneCall className="w-3 h-3" />
                        Call
                      </a>
                      {driver.dispatchId && (
                        <button
                          onClick={() => onSelectDispatch(driver.dispatchId!)}
                          className="text-blue-600 hover:underline font-bold text-xs"
                        >
                          Focus Card →
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}
