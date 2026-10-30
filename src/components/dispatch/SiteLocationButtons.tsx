"use client";

import React, { useState } from "react";
import { MapPin, Navigation, ExternalLink } from "lucide-react";
import { SiteLocationPinModal } from "./SiteLocationPinModal";

export interface SiteLocationButtonsProps {
  latitude?: number | string | null;
  longitude?: number | string | null;
  address?: string | null;
  locationName?: string | null;
  mapLink?: string | null;
  customerName?: string | null;
  onOpenMapModal?: () => void;
  variant?: "compact" | "cards" | "modal" | "inline" | "driver";
  className?: string;
  isOffRoad?: boolean | null;
  accessLatitude?: number | string | null;
  accessLongitude?: number | string | null;
  offRoadBearingDeg?: number | null;
  offRoadDistanceM?: number | null;
  isCentroidVerified?: boolean | null;
  dwellConfidence?: number | null;
}

/**
 * Universally resolves Google Maps turn-by-turn driving directions URL:
 * 1. Exact numeric coordinates (latitude, longitude)
 * 2. Existing map link if provided as full URL
 * 3. Text address or location name encoded as destination query
 * 4. Fallback to base Google Maps
 */
export function getGoogleMapsDirectionsUrl({
  latitude,
  longitude,
  address,
  locationName,
  mapLink,
}: {
  latitude?: number | string | null;
  longitude?: number | string | null;
  address?: string | null;
  locationName?: string | null;
  mapLink?: string | null;
}): string {
  const numLat = latitude != null ? Number(latitude) : NaN;
  const numLng = longitude != null ? Number(longitude) : NaN;
  const hasCoords = !isNaN(numLat) && !isNaN(numLng) && (numLat !== 0 || numLng !== 0);

  if (hasCoords) {
    return `https://www.google.com/maps/dir/?api=1&destination=${numLat},${numLng}`;
  }

  if (mapLink && (mapLink.startsWith("http://") || mapLink.startsWith("https://"))) {
    return mapLink;
  }

  const textDestination = address?.trim() || locationName?.trim() || mapLink?.trim();
  if (textDestination) {
    return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(textDestination)}`;
  }

  return "https://www.google.com/maps";
}

export function SiteLocationButtons({
  latitude,
  longitude,
  address,
  locationName,
  mapLink,
  customerName,
  onOpenMapModal,
  variant = "compact",
  className = "",
  isOffRoad,
  accessLatitude,
  accessLongitude,
  offRoadBearingDeg,
  offRoadDistanceM,
  isCentroidVerified,
  dwellConfidence,
}: SiteLocationButtonsProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const directionsUrl = getGoogleMapsDirectionsUrl({
    latitude,
    longitude,
    address,
    locationName,
    mapLink,
  });

  const handleOpenPin = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onOpenMapModal) {
      onOpenMapModal();
    } else {
      setIsModalOpen(true);
    }
  };

  const displayName = locationName || address || "Job Site";

  return (
    <>
      {/* 1. COMPACT VARIANT: For Table Ledger rows */}
      {variant === "compact" && (
        <div className={`flex items-center gap-1.5 pt-1 ${className}`}>
          <button
            type="button"
            onClick={handleOpenPin}
            className="px-2 py-1 rounded-lg bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 transition-all flex items-center gap-1 text-[11px] font-bold shadow-sm"
            title="View pin on map"
          >
            <MapPin className="w-3 h-3 text-blue-400 shrink-0" />
            <span>Pin</span>
          </button>

          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="px-2 py-1 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 transition-all flex items-center gap-1 text-[11px] font-bold shadow-sm font-mono"
            title="Launch turn-by-turn driving directions"
          >
            <Navigation className="w-3 h-3 text-emerald-400 shrink-0" />
            <span>Navigate</span>
            <ExternalLink className="w-2.5 h-2.5 opacity-60" />
          </a>
        </div>
      )}

      {/* 2. CARDS VARIANT: For Grid Cards / Mobile view */}
      {variant === "cards" && (
        <div className={`grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 ${className}`}>
          <button
            type="button"
            onClick={handleOpenPin}
            className="w-full py-2 px-3 rounded-xl bg-slate-950 hover:bg-slate-800 text-blue-400 border border-slate-800 hover:border-blue-500/30 transition-all text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm"
          >
            <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
            <span>View Pin</span>
          </button>

          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="w-full py-2 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 transition-all text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm"
          >
            <Navigation className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>Navigate</span>
            <ExternalLink className="w-3 h-3 opacity-60 ml-0.5" />
          </a>
        </div>
      )}

      {/* 3. MODAL PREVIEW VARIANT: For Edit/Create Dispatch modals */}
      {variant === "modal" && (
        <div className={`p-3 rounded-2xl bg-slate-950/80 border border-slate-800 flex items-center justify-between gap-3 ${className}`}>
          <div className="flex items-center gap-2 min-w-0">
            <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider block">
                Destination Preview
              </span>
              <p className="text-xs font-bold text-white truncate">{displayName}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={handleOpenPin}
              className="px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-blue-400 border border-slate-700 transition-colors text-xs font-bold flex items-center gap-1.5"
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Preview</span>
            </button>
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white transition-all text-xs font-bold flex items-center gap-1.5 shadow-md shadow-emerald-600/20"
            >
              <Navigation className="w-3.5 h-3.5 fill-white" />
              <span>Test Route</span>
              <ExternalLink className="w-3 h-3 opacity-80" />
            </a>
          </div>
        </div>
      )}

      {/* 4. INLINE VARIANT */}
      {variant === "inline" && (
        <span className={`inline-flex items-center gap-1.5 ${className}`}>
          <button
            type="button"
            onClick={handleOpenPin}
            className="p-1 rounded text-blue-400 hover:bg-blue-500/20 transition-colors"
            title="View site on map"
          >
            <MapPin className="w-3.5 h-3.5" />
          </button>
          <a
            href={directionsUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="p-1 rounded text-emerald-400 hover:bg-emerald-500/20 transition-colors"
            title="Navigate to site"
          >
            <Navigation className="w-3.5 h-3.5" />
          </a>
        </span>
      )}

      {/* 5. DRIVER VARIANT: Large, accessible, full-width touch targets */}
      {variant === "driver" && (
        <div className={`space-y-2 pt-2.5 pb-1 ${className}`}>
          <div className="grid grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={handleOpenPin}
              className="w-full py-3.5 px-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-blue-400 border border-slate-700/80 active:scale-95 transition-all text-xs font-bold flex items-center justify-center gap-2 shadow-sm"
            >
              <MapPin className="w-4 h-4 text-blue-400 shrink-0" />
              <span>Inspect GPS Pin</span>
            </button>

            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="w-full py-3.5 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/25 active:scale-95 transition-all"
            >
              <Navigation className="w-4 h-4 fill-white shrink-0" />
              <span>Google Maps</span>
              <ExternalLink className="w-3.5 h-3.5 opacity-80" />
            </a>
          </div>
        </div>
      )}

      {/* Built-in Internal Pin Modal */}
      {!onOpenMapModal && (
        <SiteLocationPinModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          locationName={displayName}
          customerName={customerName}
          latitude={latitude}
          longitude={longitude}
          address={address}
          mapLink={mapLink}
          directionsUrl={directionsUrl}
          isOffRoad={isOffRoad}
          accessLatitude={accessLatitude}
          accessLongitude={accessLongitude}
          offRoadBearingDeg={offRoadBearingDeg}
          offRoadDistanceM={offRoadDistanceM}
          isCentroidVerified={isCentroidVerified}
          dwellConfidence={dwellConfidence}
        />
      )}
    </>
  );
}
