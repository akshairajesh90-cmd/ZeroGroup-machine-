"use client";

import React, { useState } from "react";
import {
  X,
  MapPin,
  Navigation,
  ExternalLink,
  Copy,
  Check,
  Building2,
  Compass,
  Truck,
  User,
  Wrench,
  Clock,
  Cog,
} from "lucide-react";

export interface SiteLocationLogistics {
  vehicle?: {
    id?: string;
    modelName?: string | null;
    licensePlate?: string | null;
    type?: string | null;
  } | null;
  driver?: {
    id?: string;
    fullName?: string | null;
    phone?: string | null;
  } | null;
  operator?: {
    id?: string;
    fullName?: string | null;
    phone?: string | null;
  } | null;
  machine?: {
    id?: string;
    name?: string | null;
    modelNumber?: string | null;
    serialNumber?: string | null;
  } | null;
  tools?: Array<{
    id?: string;
    toolName?: string;
    quantity?: number;
    returnedAt?: Date | string | null;
  }> | null;
  deliveredAt?: Date | string | null;
  status?: string | null;
}

export interface SiteLocationPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  locationName: string;
  customerName?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  address?: string | null;
  mapLink?: string | null;
  directionsUrl: string;
  isOffRoad?: boolean | null;
  accessLatitude?: number | string | null;
  accessLongitude?: number | string | null;
  offRoadBearingDeg?: number | null;
  offRoadDistanceM?: number | null;
  isCentroidVerified?: boolean | null;
  dwellConfidence?: number | null;
  logistics?: SiteLocationLogistics | null;
}

export function SiteLocationPinModal({
  isOpen,
  onClose,
  locationName,
  customerName,
  latitude,
  longitude,
  address,
  mapLink,
  directionsUrl,
  isOffRoad,
  accessLatitude,
  accessLongitude,
  offRoadBearingDeg,
  offRoadDistanceM,
  isCentroidVerified,
  dwellConfidence,
  logistics,
}: SiteLocationPinModalProps) {
  const [copied, setCopied] = useState(false);

  React.useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const numLat = latitude != null ? Number(latitude) : NaN;
  const numLng = longitude != null ? Number(longitude) : NaN;
  const hasCoords = !isNaN(numLat) && !isNaN(numLng) && (numLat !== 0 || numLng !== 0);

  const displayLocation = locationName || address || "Job Site Location";

  const handleCopy = () => {
    const textToCopy = hasCoords
      ? `${numLat.toFixed(6)}, ${numLng.toFixed(6)} (${displayLocation})`
      : displayLocation;

    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Accent Top Stripe */}
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500" />

        {/* Modal Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 rounded-2xl bg-blue-500/10 text-blue-400 border border-blue-500/20 shadow-sm shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h3 className="text-base font-black text-white tracking-tight truncate">
                Site Location & GPS Pin
              </h3>
              <p className="text-xs text-slate-400 mt-0.5 truncate">
                {customerName ? `Client: ${customerName}` : "Dispatch Destination Overview"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Badges Row */}
        {(hasCoords || isCentroidVerified || isOffRoad) && (
          <div className="px-5 py-2.5 bg-slate-950/70 border-b border-slate-800/80 flex items-center gap-2 overflow-x-auto scrollbar-none">
            {hasCoords && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 whitespace-nowrap shadow-sm shrink-0">
                🟢 GPS Locked
              </span>
            )}
            {isCentroidVerified && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-500/15 text-purple-300 border border-purple-500/30 whitespace-nowrap shadow-sm shrink-0">
                🎯 Centroid Verified ({Math.round((dwellConfidence || 0.95) * 100)}%)
              </span>
            )}
            {isOffRoad && (
              <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 whitespace-nowrap shadow-sm shrink-0">
                🌲 Off-Road Track
              </span>
            )}
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Site Location & Coordinates Card */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Designated Jobsite
                </span>
                <p className="text-sm font-bold text-white mt-0.5 break-words">
                  {displayLocation}
                </p>
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold border border-slate-700 transition-colors"
                title="Copy location & coordinates"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="text-emerald-400 font-bold">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy</span>
                  </>
                )}
              </button>
            </div>

            {hasCoords ? (
              <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between text-xs gap-2">
                <div className="font-mono text-slate-300 flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5 text-blue-400" />
                  <span>Lat: {numLat.toFixed(6)}</span>
                  <span className="text-slate-600">•</span>
                  <span>Lng: {numLng.toFixed(6)}</span>
                </div>
                <span className="text-[11px] text-emerald-400 font-medium">
                  Verified Destination Pin
                </span>
              </div>
            ) : (
              <div className="pt-2 border-t border-slate-800/80 text-xs text-amber-400/90 flex items-center gap-1.5">
                <span>⚠️ Coordinates not set — navigating via address lookup</span>
              </div>
            )}
          </div>

          {/* Logistics Journey & Assigned Equipment Card */}
          {logistics && (logistics.vehicle || logistics.driver || logistics.machine || (logistics.tools && logistics.tools.length > 0)) && (
            <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-indigo-400" />
                  Logistics & Dispatched Assets
                </span>
                {logistics.deliveredAt && (
                  <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    <Clock className="w-3 h-3" />
                    Delivered: {new Date(logistics.deliveredAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {logistics.vehicle && (
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <Truck className="w-4 h-4 text-indigo-400 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-[10px] text-slate-500 block">Transport Truck</span>
                      <span className="font-bold text-white truncate block">
                        {logistics.vehicle.licensePlate || logistics.vehicle.modelName || "Delivery Truck"}
                      </span>
                    </div>
                  </div>
                )}

                {logistics.driver && (
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <User className="w-4 h-4 text-blue-400 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-[10px] text-slate-500 block">Transport Driver</span>
                      <span className="font-bold text-white truncate block">
                        {logistics.driver.fullName || "Assigned Driver"}
                      </span>
                    </div>
                  </div>
                )}

                {logistics.machine && (
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <Cog className="w-4 h-4 text-emerald-400 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-[10px] text-slate-500 block">Deployed Machine</span>
                      <span className="font-bold text-white truncate block">
                        {logistics.machine.name || "Primary Machine"}
                      </span>
                    </div>
                  </div>
                )}

                {logistics.operator && (
                  <div className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                    <User className="w-4 h-4 text-purple-400 shrink-0" />
                    <div className="min-w-0">
                      <span className="text-[10px] text-slate-500 block">Site Operator</span>
                      <span className="font-bold text-white truncate block">
                        {logistics.operator.fullName || "Assigned Operator"}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {logistics.tools && logistics.tools.length > 0 && (
                <div className="pt-2 border-t border-slate-800/80">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5 flex items-center gap-1">
                    <Wrench className="w-3 h-3 text-rose-400" />
                    Dispatched Tools & Inventory ({logistics.tools.length})
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {logistics.tools.map((t, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] bg-slate-900 text-slate-300 border border-slate-800 font-medium"
                      >
                        <span className="text-white font-bold">{t.toolName}</span>
                        {t.quantity && t.quantity > 1 ? (
                          <span className="text-slate-500 font-mono">×{t.quantity}</span>
                        ) : null}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Dual-Point Off-Road Navigation Card */}
          {(isOffRoad || accessLatitude != null) && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Compass className="w-3.5 h-3.5" />
                  Dual-Point Off-Road Navigation (Estate / Track)
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-amber-400/20 text-amber-300">
                  Stage 2 GIS
                </span>
              </div>
              <div className="text-xs text-slate-300 space-y-1">
                <p>
                  🛣️ <strong className="text-white">Highway Access Turn-off:</strong> PWD Tarmac road exit point
                  {accessLatitude ? ` (${Number(accessLatitude).toFixed(5)}, ${Number(accessLongitude).toFixed(5)})` : ""}.
                </p>
                <p>
                  🧭 <strong className="text-amber-300">Compass Azimuth Heading:</strong>{" "}
                  {offRoadBearingDeg != null ? `${Math.round(offRoadBearingDeg)}° Heading` : "Forward Azimuth"}{" "}
                  {offRoadDistanceM != null ? `(${Math.round(offRoadDistanceM)}m private track)` : ""}
                </p>
                <p>
                  🚧 <strong className="text-white">Unloading Gate Pin:</strong> Off-road site coordinates.
                </p>
              </div>
            </div>
          )}

          {/* Interactive Map Embed */}
          <div className="relative w-full h-64 rounded-2xl overflow-hidden border border-slate-800 bg-slate-950 shadow-inner">
            {hasCoords ? (
              <iframe
                title="Site Location Map"
                width="100%"
                height="100%"
                frameBorder="0"
                scrolling="no"
                marginHeight={0}
                marginWidth={0}
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${numLng - 0.012}%2C${numLat - 0.012}%2C${numLng + 0.012}%2C${numLat + 0.012}&layer=mapnik&marker=${numLat}%2C${numLng}`}
                className="w-full h-full filter saturate-[1.1] contrast-[1.05]"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-slate-950 text-slate-400 space-y-2">
                <MapPin className="w-10 h-10 text-slate-600 mb-1" />
                <p className="text-sm font-bold text-white">{displayLocation}</p>
                <p className="text-xs text-slate-500 max-w-sm">
                  Exact GPS coordinates are not yet recorded for this ticket. Click the button below to locate on Google Maps.
                </p>
              </div>
            )}
          </div>

          {/* Actions Strip */}
          <div className="space-y-2 pt-1">
            <a
              href={directionsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-3 px-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-xl shadow-emerald-600/25 active:scale-[0.99]"
            >
              <Navigation className="w-4 h-4 fill-white" />
              <span>Launch Turn-by-Turn Driving Navigation</span>
              <ExternalLink className="w-3.5 h-3.5 ml-0.5 opacity-80" />
            </a>

            {mapLink && (
              <a
                href={mapLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded-2xl text-xs font-semibold transition-colors border border-slate-800 flex items-center justify-center gap-2"
              >
                <ExternalLink className="w-3.5 h-3.5 text-blue-400" />
                <span>Open Original Map Link</span>
              </a>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
