"use client";

import React, { useState, useEffect, useMemo, useRef, useTransition } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import useSWR from "swr";
import {
  MapPin,
  Truck,
  Wrench,
  Search,
  Filter,
  PhoneCall,
  Clock,
  ArrowRight,
  HardHat,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Shield,
  Layers,
  ArrowLeft,
  Pencil,
  Play,
  Pause,
  RotateCcw,
  Navigation,
  Compass,
} from "lucide-react";
import { updateDispatchStatus } from "@/actions/dispatch";
import type { MapDriverPin, MapSitePin, MapRouteWaypoint } from "./UnifiedMapInner";

// Dynamic import for Leaflet (prevent SSR window errors)
const UnifiedMapInner = dynamic(() => import("./UnifiedMapInner"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[520px] bg-slate-900/60 rounded-3xl border border-slate-800 animate-pulse flex flex-col items-center justify-center text-slate-500 gap-3">
      <Compass className="w-10 h-10 animate-spin text-emerald-400" />
      <span className="font-bold text-sm text-slate-300">Initializing Live Radar Map...</span>
    </div>
  ),
});

const fetcher = (url: string) => fetch(url).then((res) => res.json());

// Haversine distance in km
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
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
  return Math.round(R * c * 10) / 10;
}

export interface UnifiedDispatch {
  id: string;
  customerId?: string;
  customerName: string;
  customerPhone: string | null;
  location: string;
  mapLink: string | null;
  latitude: number | null;
  longitude: number | null;
  status: string;
  workType: string;
  machineId: string | null;
  machineType: string | null;
  liftId: string | null;
  liftType: string | null;
  vehiclePlate: string | null;
  vehicleType: string | null;
  driverId: string | null;
  driverName: string | null;
  driverPhone: string | null;
  operatorId: string | null;
  operatorName: string | null;
  operatorPhone: string | null;
  operatorType: string;
  tools: { id: string; name: string; quantity: number }[];
  dateOfService: string;
}

interface UnifiedLiveOperationsClientProps {
  initialDispatches: UnifiedDispatch[];
  initialFieldEmployees: any[];
  initialPings: Record<string, MapRouteWaypoint[]>;
}

export default function UnifiedLiveOperationsClient({
  initialDispatches,
  initialFieldEmployees,
  initialPings,
}: UnifiedLiveOperationsClientProps) {
  const [dispatches, setDispatches] = useState<UnifiedDispatch[]>(initialDispatches);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedDispatchId, setSelectedDispatchId] = useState<string | null>(null);
  const [flyToCenter, setFlyToCenter] = useState<[number, number] | null>(null);
  const [routeTrails, setRouteTrails] = useState<Record<string, MapRouteWaypoint[]>>(initialPings);

  const [isPending, startTransition] = useTransition();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Playback Scrubber State
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState<1 | 2 | 5>(1);
  const [scrubberIndex, setScrubberIndex] = useState<number>(0);
  const cardListRef = useRef<HTMLDivElement>(null);

  // 1. SWR 5-SECOND BACKGROUND MICRO-POLL
  const { data: liveStream } = useSWR("/api/admin/location/live", fetcher, {
    refreshInterval: 5000,
    revalidateOnFocus: true,
  });

  // Merge live stream coordinates into drivers & route trails
  const liveDrivers: MapDriverPin[] = useMemo(() => {
    if (liveStream?.data && Array.isArray(liveStream.data) && liveStream.data.length > 0) {
      return liveStream.data.map((d: any) => ({
        id: d.id,
        name: d.name,
        role: d.role,
        phone: d.phone,
        lat: d.lat,
        lng: d.lng,
        speed: d.speed || 0,
        bearing: d.bearing || 0,
        lastUpdate: d.lastUpdate,
        dispatchId: d.dispatch?.id || null,
        customerName: d.dispatch?.customerName || null,
        location: d.dispatch?.location || null,
        machineId: d.dispatch?.machineId || null,
        vehiclePlate: d.dispatch?.vehiclePlate || null,
      }));
    }

    // Fallback to initial employees
    return initialFieldEmployees.map((e: any) => ({
      id: e.id,
      name: e.name,
      role: e.role,
      phone: e.phone,
      lat: Number(e.lastLatitude),
      lng: Number(e.lastLongitude),
      speed: 0,
      bearing: 0,
      lastUpdate: e.lastLocationUpdate || new Date().toISOString(),
      dispatchId: e.driverDispatches?.[0]?.id || e.operatorDispatches?.[0]?.id || null,
      customerName: e.driverDispatches?.[0]?.customer?.name || null,
      machineId: e.driverDispatches?.[0]?.machine?.machineId || null,
    }));
  }, [liveStream, initialFieldEmployees]);

  // Continuously extend active route trail as new pings arrive
  useEffect(() => {
    if (!liveDrivers.length) return;

    setRouteTrails((prev) => {
      const updated = { ...prev };
      liveDrivers.forEach((driver) => {
        if (!updated[driver.id]) updated[driver.id] = [];
        const existing = updated[driver.id];
        const lastP = existing[existing.length - 1];

        // Only append if moved > 15m or > 30s elapsed
        if (
          !lastP ||
          Math.abs(lastP.lat - driver.lat) > 0.00015 ||
          Math.abs(lastP.lng - driver.lng) > 0.00015
        ) {
          updated[driver.id] = [
            ...existing,
            {
              lat: driver.lat,
              lng: driver.lng,
              time: driver.lastUpdate,
              speed: driver.speed,
            },
          ];
        }
      });
      return updated;
    });
  }, [liveDrivers]);

  // Compute active site pins from dispatches with coordinates
  const sitePins: MapSitePin[] = useMemo(() => {
    return dispatches
      .filter((d) => d.latitude !== null && d.longitude !== null)
      .map((d) => ({
        id: d.id,
        location: d.location,
        lat: Number(d.latitude),
        lng: Number(d.longitude),
        customerName: d.customerName,
        customerPhone: d.customerPhone,
        status: d.status,
        machineId: d.machineId,
        driverName: d.driverName,
        operatorName: d.operatorName,
        vehiclePlate: d.vehiclePlate,
      }));
  }, [dispatches]);

  // Active trail for the currently selected job or driver
  const activeTrail: MapRouteWaypoint[] = useMemo(() => {
    if (!selectedDispatchId) {
      // Return combined trail of first active driver
      const firstDriver = liveDrivers[0];
      return firstDriver && routeTrails[firstDriver.id] ? routeTrails[firstDriver.id] : [];
    }

    const selectedJob = dispatches.find((d) => d.id === selectedDispatchId);
    if (!selectedJob) return [];

    const driverId = selectedJob.driverId;
    if (driverId && routeTrails[driverId]) {
      return routeTrails[driverId];
    }
    const operatorId = selectedJob.operatorId;
    if (operatorId && routeTrails[operatorId]) {
      return routeTrails[operatorId];
    }
    return [];
  }, [selectedDispatchId, dispatches, liveDrivers, routeTrails]);

  // Trip Scrubber Timer Effect
  useEffect(() => {
    if (!isPlaying || activeTrail.length <= 1) return;

    const interval = setInterval(() => {
      setScrubberIndex((prev) => {
        if (prev >= activeTrail.length - 1) {
          setIsPlaying(false);
          return 0;
        }
        return prev + 1;
      });
    }, 1000 / playbackSpeed);

    return () => clearInterval(interval);
  }, [isPlaying, playbackSpeed, activeTrail.length]);

  const playbackPoint: MapRouteWaypoint | null = useMemo(() => {
    if (activeTrail.length > 0 && scrubberIndex < activeTrail.length) {
      return activeTrail[scrubberIndex];
    }
    return null;
  }, [activeTrail, scrubberIndex]);

  // Bidirectional Selection: Focus on card
  const handleSelectDispatch = (dispatchId: string) => {
    setSelectedDispatchId(dispatchId);
    const targetJob = dispatches.find((d) => d.id === dispatchId);

    if (targetJob) {
      // Find matching live driver position
      const matchedDriver = liveDrivers.find((d) => d.dispatchId === dispatchId || d.id === targetJob.driverId);
      if (matchedDriver) {
        setFlyToCenter([matchedDriver.lat, matchedDriver.lng]);
      } else if (targetJob.latitude && targetJob.longitude) {
        setFlyToCenter([Number(targetJob.latitude), Number(targetJob.longitude)]);
      }
    }

    // Scroll card into view
    const cardEl = document.getElementById(`dispatch-card-${dispatchId}`);
    if (cardEl) {
      cardEl.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  // Status Advance Handler
  const handleAdvanceStatus = async (dispatchId: string, nextStatus: string) => {
    setUpdatingId(dispatchId);
    startTransition(async () => {
      const res = await updateDispatchStatus({
        dispatchId,
        status: nextStatus,
        reason: "Advanced status via Unified Live Command Center",
      });
      if (res?.success) {
        setDispatches((prev) =>
          prev.map((d) => (d.id === dispatchId ? { ...d, status: nextStatus } : d))
        );
      } else {
        alert(res?.error || "Failed to advance dispatch status");
      }
      setUpdatingId(null);
    });
  };

  // 4-Stage helper
  const getStageNumber = (status: string) => {
    switch (status) {
      case "PENDING":
      case "ACCEPTED":
        return 1;
      case "EN_ROUTE":
        return 2;
      case "IN_PROGRESS":
        return 3;
      case "DELIVERED":
      case "COMPLETED":
      case "PICKED_UP":
        return 4;
      default:
        return 1;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
      case "ACCEPTED":
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">🏬 Store Loaded</span>;
      case "EN_ROUTE":
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">🚚 En Route</span>;
      case "IN_PROGRESS":
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">🏗️ On Site</span>;
      case "DELIVERED":
      case "COMPLETED":
      case "PICKED_UP":
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">🔄 Completed</span>;
      default:
        return <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-800 text-slate-300">{status}</span>;
    }
  };

  // Filter Dispatches
  const filteredDispatches = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return dispatches.filter((d) => {
      const matchesSearch =
        d.customerName.toLowerCase().includes(term) ||
        d.location.toLowerCase().includes(term) ||
        (d.machineId && d.machineId.toLowerCase().includes(term)) ||
        (d.driverName && d.driverName.toLowerCase().includes(term)) ||
        (d.operatorName && d.operatorName.toLowerCase().includes(term)) ||
        (d.vehiclePlate && d.vehiclePlate.toLowerCase().includes(term)) ||
        d.tools.some((t) => t.name.toLowerCase().includes(term));

      const matchesStatus =
        statusFilter === "ALL"
          ? true
          : statusFilter === "STORE"
          ? d.status === "PENDING" || d.status === "ACCEPTED"
          : statusFilter === "EN_ROUTE"
          ? d.status === "EN_ROUTE"
          : statusFilter === "ON_SITE"
          ? d.status === "IN_PROGRESS"
          : statusFilter === "RETURNING"
          ? d.status === "DELIVERED" || d.status === "COMPLETED" || d.status === "PICKED_UP"
          : true;

      return matchesSearch && matchesStatus;
    });
  }, [dispatches, searchTerm, statusFilter]);

  return (
    <div className="p-3 sm:p-6 space-y-6 max-w-[1600px] mx-auto min-h-screen">
      
      {/* ── TOPBAR HEADER ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/staff/dashboard"
              className="p-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Live Fleet Telemetry Command
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <Truck className="w-8 h-8 text-emerald-400 shrink-0" />
            Unified Live Fleet & Site Command Center
          </h1>
          <p className="text-slate-400 mt-1 text-xs sm:text-sm font-medium">
            Real-time GPS tracking, store-to-site transit pipeline, trip playback, and automated site arrivals.
          </p>
        </div>

        {/* Live Status Indicator & Quick Links */}
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-emerald-500/30 text-emerald-400 text-xs font-bold shadow">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            <span>Live Stream (5s Sync)</span>
          </div>

          <Link
            href="/staff/dispatch"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 border border-amber-500/30 text-xs font-bold transition-all shadow"
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>Dispatch Board</span>
          </Link>
        </div>
      </div>

      {/* ── DUAL-PANE COMMAND CENTER ───────────────────────────────────────────── */}
      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 items-start">
        
        {/* ═══ LEFT PANE: 7 COLS (LEAFLET MAP + TRIP PLAYBACK + TELEMETRY STATS) ═══ */}
        <div className="w-full lg:col-span-7 flex flex-col gap-4 lg:sticky lg:top-4">
          
          {/* Main Leaflet Radar Map */}
          <UnifiedMapInner
            drivers={liveDrivers}
            sites={sitePins}
            selectedDispatchId={selectedDispatchId}
            onSelectDispatch={handleSelectDispatch}
            flyToCenter={flyToCenter}
            activeTrail={activeTrail}
            playbackPoint={playbackPoint}
          />

          {/* Trip Replay & Scrubber Bar */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-xl backdrop-blur-md">
            <div className="flex items-center justify-between mb-2.5">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-white uppercase tracking-wider">
                  Trip Playback & Route Scrubber
                </span>
                <span className="text-[10px] text-slate-500">
                  ({activeTrail.length} waypoints recorded today)
                </span>
              </div>

              {/* Playback Speed Toggles */}
              <div className="flex items-center gap-1 text-[10px] font-bold">
                <span className="text-slate-400 mr-1">Speed:</span>
                {[1, 2, 5].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => setPlaybackSpeed(spd as 1 | 2 | 5)}
                    className={`px-2 py-0.5 rounded-md ${
                      playbackSpeed === spd
                        ? "bg-amber-500 text-slate-950 font-black"
                        : "bg-slate-800 text-slate-400 hover:text-white"
                    }`}
                  >
                    {spd}x
                  </button>
                ))}
              </div>
            </div>

            {/* Slider & Controls */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsPlaying(!isPlaying)}
                disabled={activeTrail.length <= 1}
                className="p-2 rounded-xl bg-amber-500 text-slate-950 hover:bg-amber-400 disabled:opacity-40 transition-colors shadow font-black"
                title={isPlaying ? "Pause Trip Replay" : "Play Trip Replay"}
              >
                {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
              </button>

              <button
                onClick={() => {
                  setIsPlaying(false);
                  setScrubberIndex(0);
                }}
                disabled={activeTrail.length <= 1}
                className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white disabled:opacity-40 transition-colors"
                title="Reset to Start"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              {/* Interactive Range Input */}
              <div className="flex-1 flex flex-col gap-1">
                <input
                  type="range"
                  min="0"
                  max={Math.max(0, activeTrail.length - 1)}
                  value={scrubberIndex}
                  disabled={activeTrail.length <= 1}
                  onChange={(e) => {
                    setIsPlaying(false);
                    setScrubberIndex(Number(e.target.value));
                  }}
                  className="w-full accent-amber-500 h-2 bg-slate-800 rounded-lg cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>
                    {activeTrail[0]
                      ? new Date(activeTrail[0].time).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })
                      : "Start"}
                  </span>
                  {playbackPoint && (
                    <span className="text-amber-400 font-bold">
                      {new Date(playbackPoint.time).toLocaleTimeString("en-IN")} •{" "}
                      {playbackPoint.speed ? `${playbackPoint.speed.toFixed(0)} km/h` : "Parked"}
                    </span>
                  )}
                  <span>
                    {activeTrail[activeTrail.length - 1]
                      ? new Date(activeTrail[activeTrail.length - 1].time).toLocaleTimeString(
                          "en-IN",
                          { hour: "2-digit", minute: "2-digit" }
                        )
                      : "Current"}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
              <div className="text-xl font-black text-white">{liveDrivers.length}</div>
              <div className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Active Crew</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
              <div className="text-xl font-black text-violet-400">{sitePins.length}</div>
              <div className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Sites on Radar</div>
            </div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
              <div className="text-xl font-black text-emerald-400">{dispatches.length}</div>
              <div className="text-[10px] text-slate-400 font-bold uppercase mt-0.5">Today's Jobs</div>
            </div>
          </div>
        </div>

        {/* ═══ RIGHT PANE: 5 COLS (SEARCH, FILTERS & ACTIVE DISPATCH CARDS) ═════ */}
        <div className="w-full lg:col-span-5 flex flex-col gap-4">
          
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search site, customer, driver, machine, tool..."
              className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 text-xs font-semibold custom-scrollbar">
            <button
              onClick={() => setStatusFilter("ALL")}
              className={`px-2.5 py-1 rounded-xl transition-all whitespace-nowrap ${
                statusFilter === "ALL"
                  ? "bg-emerald-600 text-white font-bold shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              All ({dispatches.length})
            </button>
            <button
              onClick={() => setStatusFilter("STORE")}
              className={`px-2.5 py-1 rounded-xl transition-all whitespace-nowrap ${
                statusFilter === "STORE"
                  ? "bg-amber-600 text-white font-bold shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              🏬 In Store
            </button>
            <button
              onClick={() => setStatusFilter("EN_ROUTE")}
              className={`px-2.5 py-1 rounded-xl transition-all whitespace-nowrap ${
                statusFilter === "EN_ROUTE"
                  ? "bg-cyan-600 text-white font-bold shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              🚚 En Route
            </button>
            <button
              onClick={() => setStatusFilter("ON_SITE")}
              className={`px-2.5 py-1 rounded-xl transition-all whitespace-nowrap ${
                statusFilter === "ON_SITE"
                  ? "bg-emerald-600 text-white font-bold shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              🏗️ On Site
            </button>
            <button
              onClick={() => setStatusFilter("RETURNING")}
              className={`px-2.5 py-1 rounded-xl transition-all whitespace-nowrap ${
                statusFilter === "RETURNING"
                  ? "bg-indigo-600 text-white font-bold shadow"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              🔄 Completed
            </button>
          </div>

          {/* Scrollable Active Dispatch Cards Container */}
          <div ref={cardListRef} className="space-y-4 max-h-[820px] overflow-y-auto pr-1">
            {filteredDispatches.length === 0 ? (
              <div className="py-16 text-center bg-slate-900/40 rounded-3xl border border-slate-800 text-slate-500">
                <Truck className="w-10 h-10 mx-auto text-slate-600 mb-2" />
                <p className="font-semibold text-slate-300 text-sm">No matching active jobs</p>
                <p className="text-xs text-slate-500 mt-0.5">Try clearing your search terms or filters.</p>
              </div>
            ) : (
              filteredDispatches.map((job) => {
                const stage = getStageNumber(job.status);
                const isSelected = selectedDispatchId === job.id;
                const isUpdating = updatingId === job.id && isPending;

                // Live ETA calculation
                let etaBadge: string | null = null;
                const matchedDriver = liveDrivers.find(
                  (d) => d.dispatchId === job.id || d.id === job.driverId
                );
                if (matchedDriver && job.latitude && job.longitude) {
                  const distKm = calculateDistanceKm(
                    matchedDriver.lat,
                    matchedDriver.lng,
                    Number(job.latitude),
                    Number(job.longitude)
                  );
                  const estMins = Math.max(1, Math.round((distKm / 30) * 60));
                  etaBadge = `~${estMins} mins (${distKm} km)`;
                }

                return (
                  <div
                    key={job.id}
                    id={`dispatch-card-${job.id}`}
                    onClick={() => handleSelectDispatch(job.id)}
                    className={`bg-slate-900/90 border rounded-3xl p-5 shadow-xl transition-all cursor-pointer relative overflow-hidden ${
                      isSelected
                        ? "border-emerald-500 ring-2 ring-emerald-500/20"
                        : "border-slate-800 hover:border-slate-700"
                    }`}
                  >
                    {/* Top Bar: Customer & Status */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div>
                        <h2 className="text-lg font-black text-white hover:text-emerald-400 transition-colors">
                          {job.customerName}
                        </h2>
                        <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-400">
                          <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="truncate max-w-[220px]">{job.location}</span>
                          {job.mapLink && (
                            <a
                              href={job.mapLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="text-emerald-400 hover:underline font-bold inline-flex items-center gap-0.5 ml-1"
                            >
                              Map <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        {getStatusBadge(job.status)}
                        <p className="text-[10px] text-slate-500 font-mono mt-1">Job #{job.id.slice(-6)}</p>
                      </div>
                    </div>

                    {/* LIVE ETA BADGE IF EN ROUTE */}
                    {etaBadge && job.status === "EN_ROUTE" && (
                      <div className="mb-3 px-3 py-1.5 rounded-xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 flex items-center justify-between text-xs font-bold">
                        <span className="flex items-center gap-1.5">
                          <Navigation className="w-3.5 h-3.5" />
                          <span>Live Site ETA:</span>
                        </span>
                        <span className="font-mono">{etaBadge}</span>
                      </div>
                    )}

                    {/* 4-STAGE PIPELINE */}
                    <div className="bg-slate-950/80 rounded-2xl p-3 border border-slate-800/80 mb-3.5">
                      <div className="grid grid-cols-4 gap-1 text-center text-xs">
                        <div className="flex flex-col items-center">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] mb-1 ${
                              stage >= 1 ? "bg-emerald-500 text-slate-950" : "bg-slate-800 text-slate-500"
                            }`}
                          >
                            1
                          </div>
                          <span className={`text-[9px] font-bold ${stage >= 1 ? "text-emerald-400" : "text-slate-500"}`}>
                            Store
                          </span>
                        </div>
                        <div className="flex flex-col items-center">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] mb-1 ${
                              stage >= 2 ? "bg-cyan-500 text-slate-950" : "bg-slate-800 text-slate-500"
                            }`}
                          >
                            2
                          </div>
                          <span className={`text-[9px] font-bold ${stage >= 2 ? "text-cyan-400" : "text-slate-500"}`}>
                            En Route
                          </span>
                        </div>
                        <div className="flex flex-col items-center">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] mb-1 ${
                              stage >= 3 ? "bg-blue-500 text-white" : "bg-slate-800 text-slate-500"
                            }`}
                          >
                            3
                          </div>
                          <span className={`text-[9px] font-bold ${stage >= 3 ? "text-blue-400" : "text-slate-500"}`}>
                            On Site
                          </span>
                        </div>
                        <div className="flex flex-col items-center">
                          <div
                            className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-[10px] mb-1 ${
                              stage >= 4 ? "bg-indigo-500 text-white" : "bg-slate-800 text-slate-500"
                            }`}
                          >
                            4
                          </div>
                          <span className={`text-[9px] font-bold ${stage >= 4 ? "text-indigo-400" : "text-slate-500"}`}>
                            Done
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* MACHINERY & LOADED TOOLS */}
                    <div className="grid grid-cols-2 gap-2 text-xs mb-3">
                      <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800/80">
                        <p className="text-[9px] font-bold uppercase text-slate-500 flex items-center gap-1 mb-1">
                          <Truck className="w-3 h-3 text-amber-400" />
                          Machinery
                        </p>
                        <p className="font-bold text-white truncate">
                          {job.machineId || "Standard Mixer"}
                        </p>
                        {job.vehiclePlate && (
                          <p className="text-[10px] text-slate-400 font-mono truncate">
                            {job.vehiclePlate}
                          </p>
                        )}
                      </div>

                      <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800/80">
                        <p className="text-[9px] font-bold uppercase text-slate-500 flex items-center gap-1 mb-1">
                          <Wrench className="w-3 h-3 text-rose-400" />
                          Loaded Tools ({job.tools.length})
                        </p>
                        {job.tools.length === 0 ? (
                          <p className="text-slate-500 italic text-[11px]">No tools</p>
                        ) : (
                          <p className="text-slate-300 font-medium text-[11px] truncate">
                            {job.tools.map((t) => `${t.name} (x${t.quantity})`).join(", ")}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* CREW (DRIVER & OPERATOR WITH ONE-TAP CALL) */}
                    <div className="grid grid-cols-2 gap-2 text-xs mb-3.5">
                      <div className="p-2 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-between">
                        <div className="min-w-0 pr-1">
                          <p className="text-[9px] font-bold text-slate-500 uppercase">Driver</p>
                          <p className="font-bold text-white truncate text-[11px]">{job.driverName || "Unassigned"}</p>
                        </div>
                        {job.driverPhone && (
                          <a
                            href={`tel:${job.driverPhone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 rounded-lg bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-600 hover:text-white transition-colors shrink-0"
                            title="Call Driver"
                          >
                            <PhoneCall className="w-3 h-3" />
                          </a>
                        )}
                      </div>

                      <div className="p-2 bg-slate-950 rounded-xl border border-slate-800/80 flex items-center justify-between">
                        <div className="min-w-0 pr-1">
                          <p className="text-[9px] font-bold text-slate-500 uppercase">Operator</p>
                          <p className="font-bold text-white truncate text-[11px]">{job.operatorName || "Unassigned"}</p>
                        </div>
                        {job.operatorPhone && (
                          <a
                            href={`tel:${job.operatorPhone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 rounded-lg bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600 hover:text-white transition-colors shrink-0"
                            title="Call Operator"
                          >
                            <PhoneCall className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>

                    {/* BOTTOM ACTIONS: 1-CLICK STAGE PROGRESSION & MORE WORK */}
                    <div className="pt-2.5 border-t border-slate-800 flex items-center justify-between gap-2 text-xs flex-wrap">
                      {/* Permanent Site Recording: Book Next Phase / More Work */}
                      <Link
                        href={`/staff/dispatch?customer=${encodeURIComponent(
                          job.customerName
                        )}&location=${encodeURIComponent(job.location)}&lat=${
                          job.latitude || ""
                        }&lng=${job.longitude || ""}`}
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold transition-all shadow-sm"
                        title="Book next phase or repeat work for this verified customer site"
                      >
                        <Sparkles className="w-3 h-3 text-emerald-400" />
                        <span>+ More Work (Next Phase)</span>
                      </Link>

                      {/* Stage Progression Buttons */}
                      <div className="flex items-center gap-1.5">
                        {stage === 1 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAdvanceStatus(job.id, "EN_ROUTE");
                            }}
                            disabled={isUpdating}
                            className="px-2.5 py-1 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all text-[11px] shadow"
                          >
                            Depart Store →
                          </button>
                        )}
                        {stage === 2 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAdvanceStatus(job.id, "IN_PROGRESS");
                            }}
                            disabled={isUpdating}
                            className="px-2.5 py-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all text-[11px] shadow"
                          >
                            Arrived On Site →
                          </button>
                        )}
                        {stage === 3 && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAdvanceStatus(job.id, "DELIVERED");
                            }}
                            disabled={isUpdating}
                            className="px-2.5 py-1 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all text-[11px] shadow"
                          >
                            Complete & Return →
                          </button>
                        )}
                        {stage >= 4 && (
                          <span className="text-emerald-400 font-bold flex items-center gap-1 text-[11px]">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Job Complete
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
