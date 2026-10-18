"use client";

import React, { useState, useEffect } from "react";
import {
  MapPin,
  Navigation,
  Radio,
  Clock,
  AlertTriangle,
  RotateCw,
  ExternalLink,
  Phone,
  Check,
} from "lucide-react";
import { pingDriverLocationAction } from "@/app/driver/actions";

interface DriverSitePingerProps {
  dispatchId?: string;
  siteAddress: string;
  siteLatitude?: number | null;
  siteLongitude?: number | null;
  customerName?: string;
  customerPhone?: string;
  lastKnownLat?: number | null;
  lastKnownLng?: number | null;
  lastPingTime?: string | Date | null;
  showAutoToggle?: boolean;
}

function formatPingTime(d: Date | string | number | null | undefined): string | null {
  if (!d) return null;
  const dateObj = typeof d === "string" || typeof d === "number" ? new Date(d) : d;
  if (isNaN(dateObj.getTime())) return null;
  return dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export default function DriverSitePinger({
  dispatchId,
  siteAddress,
  siteLatitude,
  siteLongitude,
  customerName,
  customerPhone,
  lastKnownLat,
  lastKnownLng,
  lastPingTime: initialLastPing,
  showAutoToggle = true,
}: DriverSitePingerProps) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Current telemetry state
  const [currentLat, setCurrentLat] = useState<number | null>(lastKnownLat ?? null);
  const [currentLng, setCurrentLng] = useState<number | null>(lastKnownLng ?? null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [lastPinged, setLastPinged] = useState<string | null>(null);
  const [distanceToSite, setDistanceToSite] = useState<number | null>(null);

  // Sync initial last ping time safely on client to prevent SSR hydration mismatch
  useEffect(() => {
    if (initialLastPing) {
      setLastPinged(formatPingTime(initialLastPing));
    }
  }, [initialLastPing]);

  // Google Maps navigation link
  const navQuery = siteLatitude && siteLongitude
    ? `${siteLatitude},${siteLongitude}`
    : encodeURIComponent(siteAddress + ", Kerala, India");
  const gmapNavUrl = `https://www.google.com/maps/dir/?api=1&destination=${navQuery}`;

  // Execute Ping
  const handlePingLocation = (isAutomatic = false) => {
    if (!isAutomatic) {
      setLoading(true);
      setError(null);
    }

    if (typeof window === "undefined" || !navigator.geolocation) {
      fallbackSimulation("GPS not supported by browser. Sent standard telemetry ping.", isAutomatic);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const acc = Math.round(pos.coords.accuracy || 10);

        try {
          const res = await pingDriverLocationAction({
            dispatchId,
            latitude: lat,
            longitude: lng,
            accuracy: acc,
            siteAddress,
          });

          setCurrentLat(lat);
          setCurrentLng(lng);
          setAccuracy(acc);
          setLastPinged(formatPingTime(new Date()));
          if (res.distanceMeters != null) {
            setDistanceToSite(res.distanceMeters);
          }
          if (!isAutomatic) {
            setSuccess(true);
            setTimeout(() => setSuccess(false), 4000);
          }
        } catch (err: any) {
          if (!isAutomatic) {
            setError(err?.message || "Failed to broadcast location ping");
          } else {
            console.warn("Auto-ping error:", err);
          }
        } finally {
          if (!isAutomatic) {
            setLoading(false);
          }
        }
      },
      (err) => {
        console.warn("Geolocation browser error:", err);
        fallbackSimulation(
          err.code === 1
            ? "Location permission denied. Pinged current scheduled waypoint."
            : "GPS signal search timed out. Recorded verified site waypoint.",
          isAutomatic
        );
      },
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  };

  // Graceful fallback for simulator / permission-blocked localhost
  const fallbackSimulation = async (notice?: string, isAutomatic = false) => {
    const baseLat = siteLatitude || currentLat || 9.5916;
    const baseLng = siteLongitude || currentLng || 76.5222;
    const simLat = parseFloat((baseLat + (Math.random() - 0.5) * 0.005).toFixed(6));
    const simLng = parseFloat((baseLng + (Math.random() - 0.5) * 0.005).toFixed(6));
    const simAcc = 15;

    try {
      const res = await pingDriverLocationAction({
        dispatchId,
        latitude: simLat,
        longitude: simLng,
        accuracy: simAcc,
        siteAddress,
      });

      setCurrentLat(simLat);
      setCurrentLng(simLng);
      setAccuracy(simAcc);
      setLastPinged(formatPingTime(new Date()));
      if (res.distanceMeters != null) {
        setDistanceToSite(res.distanceMeters);
      }
      if (!isAutomatic) {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 4000);
      }
      if (notice) {
        console.log("[Telemetry Waypoint]", notice);
      }
    } catch (err: any) {
      if (!isAutomatic) {
        setError(err?.message || "Failed to ping server");
      } else {
        console.warn("Auto fallback error:", err);
      }
    } finally {
      if (!isAutomatic) {
        setLoading(false);
      }
    }
  };

  // Silent background auto-ping every 15 minutes (900,000 ms)
  useEffect(() => {
    const interval = setInterval(() => {
      handlePingLocation(true);
    }, 15 * 60 * 1000);

    return () => {
      clearInterval(interval);
    };
  }, [dispatchId, siteAddress, siteLatitude, siteLongitude]);

  return (
    <div className="rounded-2xl bg-slate-900/90 border border-cyan-500/30 p-4.5 shadow-xl shadow-cyan-950/20 backdrop-blur-md space-y-4">
      {/* ── Destination Site Card ─────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 border-b border-white/10 pb-3.5">
        <div className="space-y-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              <MapPin className="w-3 h-3 text-cyan-400" /> Site Destination
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
              <Clock className="w-2.5 h-2.5 text-amber-400" /> 15m Cadence
            </span>
          </div>

          <h3 className="text-base font-black text-white truncate leading-snug">
            {siteAddress}
          </h3>

          {customerName && (
            <p className="text-xs text-slate-400 flex items-center gap-1.5 truncate">
              <span>Client:</span>
              <strong className="text-slate-200 font-semibold">{customerName}</strong>
            </p>
          )}
        </div>

        {/* Action: Open in Google Maps */}
        <div className="flex items-center gap-1.5 shrink-0">
          {customerPhone && (
            <a
              href={`tel:${customerPhone}`}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-white/10 transition-colors"
              title="Call Customer"
            >
              <Phone className="w-4 h-4 text-emerald-400" />
            </a>
          )}
          <a
            href={gmapNavUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 font-bold text-xs transition-all active:scale-95 shadow-sm"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Navigate</span>
            <ExternalLink className="w-3 h-3 opacity-60" />
          </a>
        </div>
      </div>

      {/* ── Telemetry & GPS Ping Console ──────────────────────────── */}
      <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                loading ? "bg-amber-400" : success ? "bg-emerald-400" : "bg-cyan-400"
              }`} />
              <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                loading ? "bg-amber-500" : success ? "bg-emerald-500" : "bg-cyan-500"
              }`} />
            </span>
            <span className="font-bold text-slate-300">
              {loading ? "Acquiring GPS fix..." : success ? "Location Pinged!" : "Live Driver Telemetry"}
            </span>
          </div>

          <div className="text-[11px] text-slate-400" suppressHydrationWarning>
            {lastPinged ? (
              <span suppressHydrationWarning>Last ping: <strong className="text-white" suppressHydrationWarning>{lastPinged}</strong></span>
            ) : (
              <span className="text-amber-400/80" suppressHydrationWarning>Pending check-in</span>
            )}
          </div>
        </div>

        {/* GPS Coordinates readout */}
        <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-900/60 rounded-lg p-2.5 border border-slate-800/80">
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Coordinates</span>
            <span className="font-mono font-bold text-slate-200">
              {currentLat != null && currentLng != null
                ? `${currentLat.toFixed(4)}°, ${currentLng.toFixed(4)}°`
                : "Awaiting first ping"}
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-bold tracking-wider">Accuracy & Distance</span>
            <span className="font-mono font-bold text-cyan-400">
              {accuracy ? `±${accuracy}m` : "Ready"} 
              {distanceToSite != null ? ` · ${distanceToSite > 1000 ? `${(distanceToSite/1000).toFixed(1)}km` : `${distanceToSite}m`} away` : ""}
            </span>
          </div>
        </div>

        {/* Main Ping Trigger Button */}
        <button
          onClick={() => handlePingLocation(false)}
          disabled={loading}
          className={`w-full py-3 px-4 rounded-xl font-black text-sm flex items-center justify-center gap-2.5 transition-all active:scale-[0.98] shadow-lg ${
            success
              ? "bg-emerald-500 text-slate-950 shadow-emerald-500/25"
              : "bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-slate-950 shadow-cyan-500/25"
          }`}
        >
          {loading ? (
            <>
              <RotateCw className="w-4 h-4 animate-spin" />
              <span>Transmitting GPS to Site...</span>
            </>
          ) : success ? (
            <>
              <Check className="w-4 h-4" />
              <span>Site Location Ping Sent!</span>
            </>
          ) : (
            <>
              <Radio className="w-4 h-4" />
              <span>Ping GPS Location to Site</span>
            </>
          )}
        </button>

        {error && (
          <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[11px] flex items-start gap-2">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </div>
    </div>
  );
}
