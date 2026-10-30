"use client";

import React, { useEffect, useMemo } from "react";
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

function MapCameraController({
  targetCenter,
  zoom,
}: {
  targetCenter: [number, number] | null;
  zoom?: number;
}) {
  const map = useMap();
  useEffect(() => {
    if (targetCenter) {
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
  // Default map center (Central Kerala: Alappuzha/Kottayam corridor)
  const defaultCenter: [number, number] = useMemo(() => {
    if (drivers.length > 0) return [drivers[0].lat, drivers[0].lng];
    if (sites.length > 0) return [sites[0].lat, sites[0].lng];
    return [9.5916, 76.5222];
  }, [drivers, sites]);

  return (
    <div className="w-full h-full min-h-[520px] rounded-3xl overflow-hidden relative border border-slate-800 shadow-2xl">
      <MapContainer
        center={defaultCenter}
        zoom={11}
        scrollWheelZoom={true}
        className="w-full h-full min-h-[520px] z-0"
      >
        <MapCameraController targetCenter={flyToCenter} />

        {/* Free OpenStreetMap Tiles */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

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

        {/* 1. TODAY'S ROUTE TRAIL (Glowing blue polyline) */}
        {activeTrail.length > 1 && (
          <>
            <Polyline
              positions={activeTrail.map((p) => [p.lat, p.lng] as [number, number])}
              pathOptions={{
                color: "#38bdf8",
                weight: 5,
                opacity: 0.9,
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
