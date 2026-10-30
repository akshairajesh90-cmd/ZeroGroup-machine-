"use client";

import React, { useEffect, useState } from "react";
import {
  Navigation,
  PhoneCall,
  Truck,
  MapPin,
  ShieldCheck,
  Zap,
  Clock,
  Compass,
  AlertTriangle,
} from "lucide-react";

interface SeniorDriverAutopilotProps {
  driverName: string;
  vehiclePlate?: string | null;
  vehicleType?: string | null;
  machineId?: string | null;
  customerName?: string | null;
  location?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  mapLink?: string | null;
  status?: string | null;
  dispatchId?: string | null;
  officePhone?: string | null;
}

export default function SeniorDriverAutopilot({
  driverName,
  vehiclePlate,
  vehicleType,
  machineId,
  customerName,
  location,
  latitude,
  longitude,
  mapLink,
  status = "PENDING",
  dispatchId,
  officePhone = "+919847000000",
}: SeniorDriverAutopilotProps) {
  const [currentTime, setCurrentTime] = useState<string>("");
  const [wakeLockActive, setWakeLockActive] = useState(true);

  // Live ticking clock for senior driver readability
  useEffect(() => {
    const updateTime = () => {
      setCurrentTime(
        new Date().toLocaleTimeString("en-IN", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        })
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  // Compute Voice Navigation Link
  const navUrl = React.useMemo(() => {
    if (latitude && longitude) {
      return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving`;
    }
    if (mapLink) return mapLink;
    if (location) {
      return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(location)}&travelmode=driving`;
    }
    return null;
  }, [latitude, longitude, mapLink, location]);

  const getStatusText = (st: string | null) => {
    switch (st) {
      case "PENDING":
      case "ACCEPTED":
        return { label: "🏬 STORE / YARD LOADED", color: "bg-amber-500/20 text-amber-300 border-amber-500/40" };
      case "EN_ROUTE":
        return { label: "🚚 EN ROUTE TO SITE", color: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40 animate-pulse" };
      case "IN_PROGRESS":
        return { label: "🏗️ ON SITE WORKING", color: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" };
      case "DELIVERED":
      case "COMPLETED":
        return { label: "✅ JOB COMPLETED", color: "bg-indigo-500/20 text-indigo-300 border-indigo-500/40" };
      default:
        return { label: "🏬 BASE YARD STANDBY", color: "bg-slate-800 text-slate-300 border-slate-700" };
    }
  };

  const statusBadge = getStatusText(status);

  return (
    <div className="w-full max-w-xl mx-auto space-y-4 font-sans select-none">
      
      {/* ── 1. RADAR STATUS BAR (HIGH VISIBILITY) ─────────────────────────── */}
      <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-emerald-950/80 border-2 border-emerald-500/50 rounded-3xl p-4 shadow-2xl flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="relative flex h-5 w-5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-5 w-5 bg-emerald-500 border-2 border-white"></span>
          </div>
          <div>
            <div className="text-xs font-black tracking-widest text-emerald-400 uppercase">
              GPS AUTO-TRACKING ACTIVE
            </div>
            <div className="text-[11px] font-bold text-slate-300">
              Screen Awake • Live to Office
            </div>
          </div>
        </div>

        <div className="text-right">
          <div className="text-sm font-black text-white font-mono">{currentTime}</div>
          <div className="text-[10px] text-emerald-400 font-bold">Autopilot Online</div>
        </div>
      </div>

      {/* ── 2. CURRENT JOB ASSIGNMENT CARD ─────────────────────────────────── */}
      {customerName ? (
        <div className="bg-slate-900 border-2 border-slate-700/80 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4">
          
          {/* Status Header */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <span
              className={`px-3 py-1.5 rounded-full text-xs font-black border tracking-wider uppercase ${statusBadge.color}`}
            >
              {statusBadge.label}
            </span>
            <span className="text-xs text-slate-400 font-bold">
              Driver: <strong className="text-white">{driverName}</strong>
            </span>
          </div>

          {/* Assigned Truck Plate (Prominent) */}
          <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                <Truck className="w-6 h-6" />
              </div>
              <div>
                <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Assigned Vehicle</p>
                <p className="text-xl sm:text-2xl font-black text-white font-mono">
                  {vehiclePlate || "KL-05-TRUCK"}
                </p>
                {vehicleType && (
                  <p className="text-xs text-cyan-400 font-bold">{vehicleType}</p>
                )}
              </div>
            </div>

            {machineId && (
              <div className="text-right">
                <p className="text-[10px] uppercase font-bold text-slate-400">Equipment</p>
                <p className="text-sm font-black text-amber-400">{machineId}</p>
              </div>
            )}
          </div>

          {/* Destination & Customer Name */}
          <div className="bg-slate-950 rounded-2xl p-4 border border-slate-800 space-y-1.5">
            <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              Job Destination
            </p>
            <h2 className="text-lg sm:text-xl font-black text-white leading-tight">
              {customerName}
            </h2>
            <p className="text-sm text-slate-300 font-semibold leading-snug">
              {location || "Customer Site"}
            </p>
          </div>

          {/* ── 3. GIANT VOICE NAVIGATION BUTTON (1-TAP INTENT) ───────────── */}
          {navUrl && (
            <a
              href={navUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-5 rounded-2xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-black text-base sm:text-lg flex items-center justify-center gap-3 shadow-xl shadow-emerald-500/20 active:scale-[0.98] transition-all tracking-wider uppercase"
            >
              <Navigation className="w-6 h-6 shrink-0 fill-slate-950" />
              <span>TAP FOR VOICE NAVIGATION</span>
            </a>
          )}

          {/* ── 4. CALL OFFICE DISPATCH (DIRECT BUTTON) ────────────────────── */}
          <a
            href={`tel:${officePhone}`}
            className="w-full py-4 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-black text-sm flex items-center justify-center gap-2 border border-slate-700 transition-colors"
          >
            <PhoneCall className="w-4 h-4 text-cyan-400" />
            <span>Call Office Dispatch</span>
          </a>
        </div>
      ) : (
        /* Standby Yard Screen */
        <div className="bg-slate-900 border-2 border-slate-800 rounded-3xl p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mx-auto">
            <Truck className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white">Base Yard Standby</h2>
            <p className="text-xs text-slate-400 mt-1">
              Hello <strong className="text-white">{driverName}</strong>, you are connected.
            </p>
            <p className="text-xs text-emerald-400 font-bold mt-1">
              Office dispatch will assign your truck and destination shortly.
            </p>
          </div>
          <a
            href={`tel:${officePhone}`}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs"
          >
            <PhoneCall className="w-4 h-4 text-cyan-400" />
            <span>Call Office</span>
          </a>
        </div>
      )}

      {/* Helpful Instructions Banner */}
      <div className="p-3 bg-slate-900/50 rounded-2xl border border-slate-800/80 text-center text-[11px] text-slate-400">
        💡 <strong>Senior Driver Note:</strong> Keep this phone placed on the truck mount connected to the charger. All job stages are managed from the office.
      </div>
    </div>
  );
}
