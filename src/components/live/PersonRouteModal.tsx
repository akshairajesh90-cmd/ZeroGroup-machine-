"use client";

import React from "react";
import Link from "next/link";
import {
  X,
  MapPin,
  Navigation,
  Phone,
  MessageSquare,
  ExternalLink,
  Clock,
  HardHat,
  Truck,
  Building2,
  Activity,
  ArrowRight,
  Shield,
  LocateFixed,
} from "lucide-react";

export interface RoutePerson {
  id: string;
  name: string;
  role: string;
  phone?: string | null;
  profilePhotoUrl?: string | null;
  operatorType?: "INTERNAL" | "SUBCONTRACTOR" | string | null;
  lastLatitude?: number | null;
  lastLongitude?: number | null;
  lastLocationUpdate?: string | null;
}

export interface RouteDestination {
  location: string;
  latitude?: number | null;
  longitude?: number | null;
  customerName?: string | null;
  dispatchId?: string | null;
  dispatchStatus?: string | null;
  machineName?: string | null;
  assignedRole?: string | null;
}

interface PersonRouteModalProps {
  person: RoutePerson;
  destination?: RouteDestination | null;
  onClose: () => void;
  onFocusMap?: (coords: [number, number], destCoords?: [number, number]) => void;
}

/**
 * Calculates straight-line distance in kilometers using the Haversine formula.
 */
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

/**
 * Generates Google Maps directions URL with robust fallbacks:
 * 1. Worker GPS Coords -> Site Coords
 * 2. Worker GPS Coords -> Site Address string
 * 3. Fallback to location search if only one endpoint exists.
 */
function getDirectionsUrl(
  originLat?: number | null,
  originLng?: number | null,
  destLat?: number | null,
  destLng?: number | null,
  destAddress?: string | null
): string {
  const hasOrigin = originLat != null && originLng != null;
  const hasDestCoords = destLat != null && destLng != null;

  if (hasOrigin && hasDestCoords) {
    return `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${destLat},${destLng}&travelmode=driving`;
  }
  if (hasOrigin && destAddress) {
    return `https://www.google.com/maps/dir/?api=1&origin=${originLat},${originLng}&destination=${encodeURIComponent(destAddress)}&travelmode=driving`;
  }
  if (hasDestCoords) {
    return `https://www.google.com/maps/search/?api=1&query=${destLat},${destLng}`;
  }
  if (destAddress) {
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(destAddress)}`;
  }
  if (hasOrigin) {
    return `https://www.google.com/maps/search/?api=1&query=${originLat},${originLng}`;
  }
  return "https://www.google.com/maps";
}

export default function PersonRouteModal({
  person,
  destination,
  onClose,
  onFocusMap,
}: PersonRouteModalProps) {
  const hasWorkerCoords = person.lastLatitude != null && person.lastLongitude != null;
  const hasSiteCoords = destination?.latitude != null && destination?.longitude != null;

  const distanceKm =
    hasWorkerCoords && hasSiteCoords
      ? calculateDistanceKm(
          person.lastLatitude!,
          person.lastLongitude!,
          destination!.latitude!,
          destination!.longitude!
        )
      : null;

  const [roadInfo, setRoadInfo] = React.useState<{ distanceKm: number; durationMin: number } | null>(null);

  React.useEffect(() => {
    if (!hasWorkerCoords || !hasSiteCoords) return;
    let isCancelled = false;
    fetch("/api/routing/directions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        coordinates: [
          [person.lastLongitude!, person.lastLatitude!],
          [destination!.longitude!, destination!.latitude!],
        ],
      }),
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!isCancelled && data && typeof data.distanceKm === "number") {
          setRoadInfo({
            distanceKm: data.distanceKm,
            durationMin: data.durationMin,
          });
        }
      })
      .catch(() => {});
    return () => {
      isCancelled = true;
    };
  }, [person.lastLatitude, person.lastLongitude, destination?.latitude, destination?.longitude]);

  const directionsUrl = getDirectionsUrl(
    person.lastLatitude,
    person.lastLongitude,
    destination?.latitude,
    destination?.longitude,
    destination?.location
  );

  const cleanPhone = person.phone ? person.phone.replace(/\D/g, "") : "";
  const waPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

  const minutesAgo = person.lastLocationUpdate
    ? Math.max(0, Math.floor((Date.now() - new Date(person.lastLocationUpdate).getTime()) / 60000))
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="relative w-full max-w-xl bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow Header Accent */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500" />

        {/* Modal Top Bar */}
        <div className="p-6 border-b border-zinc-800/80 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Navigation className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-white">Live Route & Navigation</h2>
              <p className="text-xs text-zinc-400">Personnel-to-Site GPS Tracking</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 max-h-[80vh] overflow-y-auto custom-scrollbar">
          
          {/* 1. Worker Profile Summary Header */}
          <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="relative w-12 h-12 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center text-lg font-black text-white overflow-hidden shrink-0">
                {person.profilePhotoUrl ? (
                  <img src={person.profilePhotoUrl} alt="" className="w-full h-full object-cover" />
                ) : (
                  person.name.charAt(0).toUpperCase()
                )}
                <span
                  className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border border-zinc-900 ${
                    hasWorkerCoords ? "bg-emerald-500 animate-pulse" : "bg-zinc-600"
                  }`}
                />
              </div>

              <div className="min-w-0">
                <h3 className="text-base font-bold text-white truncate">{person.name}</h3>
                <div className="flex flex-wrap items-center gap-2 mt-0.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 uppercase">
                    {person.role}
                  </span>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                      person.operatorType === "INTERNAL"
                        ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                        : "bg-purple-500/15 text-purple-400 border border-purple-500/30"
                    }`}
                  >
                    {person.operatorType === "INTERNAL" ? "Company Worker" : "Outside Worker"}
                  </span>
                </div>
              </div>
            </div>

            {/* Direct Contact Buttons */}
            {person.phone && (
              <div className="flex items-center gap-1.5 shrink-0">
                <a
                  href={`tel:${person.phone}`}
                  className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-black border border-emerald-500/20 transition-all"
                  title="Direct Phone Call"
                >
                  <Phone className="w-4 h-4" />
                </a>
                <a
                  href={`https://wa.me/${waPhone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-2 rounded-xl bg-green-500/10 text-green-400 hover:bg-green-500 hover:text-black border border-green-500/20 transition-all"
                  title="WhatsApp Message"
                >
                  <MessageSquare className="w-4 h-4" />
                </a>
              </div>
            )}
          </div>

          {/* 2. Route Step-by-Step Visualization */}
          <div className="space-y-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
              <span>Route Origin & Destination</span>
              {roadInfo ? (
                <span className="text-emerald-400 font-mono text-xs normal-case bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 flex items-center gap-1.5">
                  <span>🛣️ {roadInfo.distanceKm} km driving</span>
                  {roadInfo.durationMin > 0 && <span className="text-zinc-400">• ~{roadInfo.durationMin} mins</span>}
                </span>
              ) : distanceKm !== null ? (
                <span className="text-zinc-400 font-mono text-xs normal-case bg-zinc-800 px-2 py-0.5 rounded-md border border-zinc-700">
                  ~{distanceKm} km straight line
                </span>
              ) : null}
            </h4>

            <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-3 before:bottom-3 before:w-0.5 before:bg-gradient-to-b before:from-blue-500 before:via-indigo-500 before:to-emerald-500">
              
              {/* Origin Point: Worker Live Location */}
              <div className="relative">
                <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-blue-500/20 border-2 border-blue-400 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                </div>
                <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-blue-400 flex items-center gap-1.5">
                      <LocateFixed className="w-3.5 h-3.5" /> Worker Live Location (Origin)
                    </span>
                    {minutesAgo !== null && (
                      <span className="text-[11px] text-zinc-500">
                        {minutesAgo === 0 ? "Just now" : `${minutesAgo}m ago`}
                      </span>
                    )}
                  </div>
                  {hasWorkerCoords ? (
                    <div>
                      <p className="text-xs font-mono text-zinc-300">
                        GPS: {person.lastLatitude!.toFixed(6)}, {person.lastLongitude!.toFixed(6)}
                      </p>
                      <p className="text-[11px] text-emerald-400/90 mt-0.5 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                        Live device telemetry ping active
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-500 italic">
                      No live GPS coordinates received from worker's device yet today.
                    </p>
                  )}
                </div>
              </div>

              {/* Destination Point: Assigned Job Site */}
              <div className="relative">
                <div className="absolute -left-6 top-1 w-5 h-5 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                </div>
                <div className="p-3.5 rounded-xl bg-zinc-900/60 border border-zinc-800 space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-emerald-400 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5" /> Assigned Job Site (Destination)
                    </span>
                    {destination?.dispatchStatus && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 uppercase">
                        {destination.dispatchStatus}
                      </span>
                    )}
                  </div>
                  {destination ? (
                    <div>
                      <p className="text-sm font-bold text-white">{destination.location}</p>
                      {destination.customerName && (
                        <p className="text-xs text-zinc-400">Customer: {destination.customerName}</p>
                      )}
                      {destination.machineName && (
                        <p className="text-xs text-zinc-500">Machine: {destination.machineName}</p>
                      )}
                      {hasSiteCoords && (
                        <p className="text-[11px] font-mono text-zinc-500 mt-1">
                          Site Coords: {destination.latitude!.toFixed(6)}, {destination.longitude!.toFixed(6)}
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-zinc-500 italic">
                      No active dispatch assignment pinned for today.
                    </p>
                  )}
                </div>
              </div>

            </div>
          </div>

          {/* 3. Action Buttons Strip */}
          <div className="space-y-2.5 pt-2">
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3.5 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-600/25 active:scale-[0.99]"
            >
              <Navigation className="w-4 h-4 fill-white" />
              Launch Google Maps Turn-by-Turn Driving Route
              <ExternalLink className="w-3.5 h-3.5 ml-1 opacity-70" />
            </a>

            {onFocusMap && hasWorkerCoords && (
              <button
                type="button"
                onClick={() => {
                  onFocusMap(
                    [person.lastLatitude!, person.lastLongitude!],
                    hasSiteCoords ? [destination!.latitude!, destination!.longitude!] : undefined
                  );
                  onClose();
                }}
                className="w-full py-3 px-4 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-2xl text-xs font-bold transition-colors border border-zinc-800 flex items-center justify-center gap-2"
              >
                <LocateFixed className="w-4 h-4 text-indigo-400" />
                Focus On In-App Radar Map
              </button>
            )}

            <Link
              href={`/staff/operators/${person.id}`}
              className="w-full py-2.5 px-4 text-center text-xs font-semibold text-zinc-400 hover:text-white transition-colors block"
            >
              View Full Operator Profile & Dispatch History →
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
