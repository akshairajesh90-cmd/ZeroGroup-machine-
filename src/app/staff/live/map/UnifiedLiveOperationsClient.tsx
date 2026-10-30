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
  ShieldCheck,
  Layers,
  ArrowLeft,
  Pencil,
  Play,
  Pause,
  RotateCcw,
  Navigation,
  Compass,
  Building2,
  Crosshair,
  X,
  Save,
  Loader2,
} from "lucide-react";
import { updateDispatchStatus } from "@/actions/dispatch";
import {
  type StoreLocationData,
  updateStoreLocation,
  updateDispatchSiteLocation,
} from "@/actions/storeSettings";
import type { MapDriverPin, MapSitePin, MapRouteWaypoint, StoreLocationProps } from "./UnifiedMapInner";

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

// Coordinate extractor from Google Maps URL or raw "lat, lng" string
function parseCoordinates(input: string): { lat: number; lng: number } | null {
  if (!input) return null;
  const trimmed = input.trim();
  // Match @lat,lng e.g. @9.591600,76.522200
  const atMatch = trimmed.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (atMatch) {
    return { lat: parseFloat(atMatch[1]), lng: parseFloat(atMatch[2]) };
  }
  // Match ?q=lat,lng or &q=lat,lng or ll=
  const qMatch = trimmed.match(/[?&](?:q|query|ll)=(-?\d+\.\d+),(-?\d+\.\d+)/);
  if (qMatch) {
    return { lat: parseFloat(qMatch[1]), lng: parseFloat(qMatch[2]) };
  }
  // Match comma-separated "9.5916, 76.5222"
  const rawMatch = trimmed.match(/^(-?\d+\.\d+)\s*,\s*(-?\d+\.\d+)$/);
  if (rawMatch) {
    return { lat: parseFloat(rawMatch[1]), lng: parseFloat(rawMatch[2]) };
  }
  return null;
}

interface UnifiedLiveOperationsClientProps {
  initialDispatches: UnifiedDispatch[];
  initialFieldEmployees: any[];
  initialPings: Record<string, MapRouteWaypoint[]>;
  initialStoreLocation?: StoreLocationProps | null;
}

export default function UnifiedLiveOperationsClient({
  initialDispatches,
  initialFieldEmployees,
  initialPings,
  initialStoreLocation,
}: UnifiedLiveOperationsClientProps) {
  const [dispatches, setDispatches] = useState<UnifiedDispatch[]>(initialDispatches);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedDispatchId, setSelectedDispatchId] = useState<string | null>(null);
  const [flyToCenter, setFlyToCenter] = useState<[number, number] | null>(null);
  const [routeTrails, setRouteTrails] = useState<Record<string, MapRouteWaypoint[]>>(initialPings);

  // Store Location State & Modal
  const [storeLocation, setStoreLocation] = useState<StoreLocationProps | null>(
    initialStoreLocation || {
      storeName: "Zero Group Main Yard & Store",
      storeAddress: "Pala, Kottayam, Kerala",
      storeLatitude: 9.5916,
      storeLongitude: 76.5222,
    }
  );
  const [isStoreModalOpen, setIsStoreModalOpen] = useState(false);
  const [storeForm, setStoreForm] = useState({
    storeName: "",
    storeAddress: "",
    storeLatitude: "",
    storeLongitude: "",
    googleLink: "",
  });
  const [isSavingStore, setIsSavingStore] = useState(false);
  const [storeError, setStoreError] = useState<string | null>(null);

  // Dispatch Site Location Modal
  const [editingDispatch, setEditingDispatch] = useState<UnifiedDispatch | null>(null);
  const [siteForm, setSiteForm] = useState({
    location: "",
    latitude: "",
    longitude: "",
    googleLink: "",
  });
  const [isSavingSite, setIsSavingSite] = useState(false);
  const [siteError, setSiteError] = useState<string | null>(null);

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

  // Detected trucks returned to Base Yard
  const returnedTrucks = useMemo(() => {
    if (!storeLocation || !liveDrivers.length) return [];
    return liveDrivers
      .filter((driver) => {
        if (!driver.dispatchId) return false;
        const job = dispatches.find((d) => d.id === driver.dispatchId);
        if (!job || !["IN_PROGRESS", "DELIVERED"].includes(job.status)) return false;
        const distKm = calculateDistanceKm(
          driver.lat,
          driver.lng,
          storeLocation.storeLatitude,
          storeLocation.storeLongitude
        );
        return distKm <= 0.35; // within 350m of Base Yard
      })
      .map((d) => ({
        driverName: d.name,
        plate: d.vehiclePlate || "Fleet Truck",
        dispatchId: d.dispatchId!,
      }));
  }, [storeLocation, liveDrivers, dispatches]);

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

  // ── STORE LOCATION HANDLERS ────────────────────────────────────────────────
  const handleOpenStoreModal = () => {
    setStoreForm({
      storeName: storeLocation?.storeName || "Zero Group Main Yard & Store",
      storeAddress: storeLocation?.storeAddress || "Pala, Kottayam, Kerala",
      storeLatitude: storeLocation?.storeLatitude ? String(storeLocation.storeLatitude) : "9.591600",
      storeLongitude: storeLocation?.storeLongitude ? String(storeLocation.storeLongitude) : "76.522200",
      googleLink: "",
    });
    setStoreError(null);
    setIsStoreModalOpen(true);
  };

  const handleDetectStoreGps = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setStoreError("Geolocation is not supported by your browser");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setStoreForm((prev) => ({
          ...prev,
          storeLatitude: pos.coords.latitude.toFixed(6),
          storeLongitude: pos.coords.longitude.toFixed(6),
        }));
        setStoreError(null);
      },
      (err) => {
        setStoreError(`Failed to detect GPS: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleStoreGoogleUrlChange = (value: string) => {
    setStoreForm((prev) => {
      const next = { ...prev, googleLink: value };
      const parsed = parseCoordinates(value);
      if (parsed) {
        next.storeLatitude = parsed.lat.toFixed(6);
        next.storeLongitude = parsed.lng.toFixed(6);
      }
      return next;
    });
  };

  const handleSaveStore = async (e: React.FormEvent) => {
    e.preventDefault();
    const lat = parseFloat(storeForm.storeLatitude);
    const lng = parseFloat(storeForm.storeLongitude);

    if (isNaN(lat) || isNaN(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      setStoreError("Please enter valid decimal coordinates (e.g., 9.5916, 76.5222)");
      return;
    }

    setIsSavingStore(true);
    setStoreError(null);

    const payload: StoreLocationData = {
      storeName: storeForm.storeName.trim() || "Zero Group Main Yard & Store",
      storeAddress: storeForm.storeAddress.trim() || "Pala, Kottayam, Kerala",
      storeLatitude: lat,
      storeLongitude: lng,
    };

    const res = await updateStoreLocation(payload);
    setIsSavingStore(false);

    if (res?.success) {
      setStoreLocation(payload);
      setFlyToCenter([payload.storeLatitude, payload.storeLongitude]);
      setIsStoreModalOpen(false);
    } else {
      setStoreError(res?.error || "Failed to update store location");
    }
  };

  // ── DISPATCH SITE LOCATION HANDLERS ───────────────────────────────────────
  const handleOpenSiteModal = (job: UnifiedDispatch) => {
    setEditingDispatch(job);
    setSiteForm({
      location: job.location || "",
      latitude: job.latitude !== null ? String(job.latitude) : "",
      longitude: job.longitude !== null ? String(job.longitude) : "",
      googleLink: job.mapLink || "",
    });
    setSiteError(null);
  };

  const handleDetectSiteGps = () => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      setSiteError("Geolocation is not supported by your browser");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setSiteForm((prev) => ({
          ...prev,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        }));
        setSiteError(null);
      },
      (err) => {
        setSiteError(`Failed to detect GPS: ${err.message}`);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSiteGoogleUrlChange = (value: string) => {
    setSiteForm((prev) => {
      const next = { ...prev, googleLink: value };
      const parsed = parseCoordinates(value);
      if (parsed) {
        next.latitude = parsed.lat.toFixed(6);
        next.longitude = parsed.lng.toFixed(6);
      }
      return next;
    });
  };

  const handleSaveSite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingDispatch) return;

    let lat: number | null = null;
    let lng: number | null = null;

    if (siteForm.latitude.trim() || siteForm.longitude.trim()) {
      const parsedLat = parseFloat(siteForm.latitude);
      const parsedLng = parseFloat(siteForm.longitude);
      if (
        isNaN(parsedLat) ||
        isNaN(parsedLng) ||
        parsedLat < -90 ||
        parsedLat > 90 ||
        parsedLng < -180 ||
        parsedLng > 180
      ) {
        setSiteError("Please enter valid decimal coordinates (e.g., 9.5916, 76.5222)");
        return;
      }
      lat = parsedLat;
      lng = parsedLng;
    }

    setIsSavingSite(true);
    setSiteError(null);

    const res = await updateDispatchSiteLocation({
      dispatchId: editingDispatch.id,
      location: siteForm.location.trim() || editingDispatch.location,
      latitude: lat,
      longitude: lng,
      mapLink: siteForm.googleLink.trim() || undefined,
    });

    setIsSavingSite(false);

    if (res?.success) {
      // Optimistically update dispatch list
      setDispatches((prev) =>
        prev.map((d) =>
          d.id === editingDispatch.id
            ? {
                ...d,
                location: res.dispatch.location,
                latitude: res.dispatch.latitude,
                longitude: res.dispatch.longitude,
                mapLink: res.dispatch.mapLink,
              }
            : d
        )
      );

      if (lat !== null && lng !== null) {
        setFlyToCenter([lat, lng]);
      }
      setEditingDispatch(null);
    } else {
      setSiteError(res?.error || "Failed to update job site location");
    }
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

          {/* Edit Store Location Button */}
          <button
            type="button"
            onClick={handleOpenStoreModal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all shadow"
            title="Edit Central Store / Base Yard Location & Coordinates"
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Store Yard GPS</span>
          </button>

          <Link
            href="/staff/dispatch"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-amber-400 border border-amber-500/30 text-xs font-bold transition-all shadow"
          >
            <Pencil className="w-3.5 h-3.5" />
            <span>Dispatch Board</span>
          </Link>
        </div>
      </div>

      {/* 🏬 TRUCK YARD RETURN ALERT BANNER */}
      {returnedTrucks.length > 0 && (
        <div className="p-3.5 bg-emerald-500/10 border-2 border-emerald-500/40 rounded-2xl flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-3">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-bold text-white">
              🏬 <strong>Truck {returnedTrucks.map((t) => t.plate).join(", ")}</strong> has arrived back at the Base Yard!
            </span>
          </div>
          <span className="px-2.5 py-1 rounded-xl bg-emerald-500 text-slate-950 font-black text-[11px] shadow">
            Ready to Complete & Return
          </span>
        </div>
      )}

      {/* ── DUAL-PANE COMMAND CENTER ───────────────────────────────────────────── */}
      <div className="flex flex-col lg:grid lg:grid-cols-12 gap-6 items-start">
        
        {/* ═══ LEFT PANE: 7 COLS (LEAFLET MAP + TRIP PLAYBACK + TELEMETRY STATS) ═══ */}
        <div className="w-full lg:col-span-7 flex flex-col gap-4 lg:sticky lg:top-4">
          
          {/* Main Leaflet Radar Map */}
          <UnifiedMapInner
            drivers={liveDrivers}
            sites={sitePins}
            storeLocation={storeLocation}
            onOpenEditStore={handleOpenStoreModal}
            onOpenEditSite={(siteId) => {
              const j = dispatches.find((d) => d.id === siteId);
              if (j) handleOpenSiteModal(j);
            }}
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
                        <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-400 flex-wrap">
                          <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span className="truncate max-w-[180px]">{job.location}</span>

                          {/* Edit Site GPS Button */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenSiteModal(job);
                            }}
                            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-[10px] font-bold transition-all"
                            title="Edit site address and GPS coordinates"
                          >
                            <Pencil className="w-2.5 h-2.5" />
                            <span>Edit GPS</span>
                          </button>

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

                    {/* LIVE WORK TIMER & ETA ROW */}
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 flex items-center justify-between text-xs font-bold">
                        <span className="flex items-center gap-1.5 text-slate-400">
                          <Clock className="w-3.5 h-3.5 text-amber-400" />
                          <span>Work Timer:</span>
                        </span>
                        <span className="font-mono text-amber-400">
                          {job.status === "EN_ROUTE"
                            ? "En Route"
                            : job.status === "IN_PROGRESS"
                            ? "On Site"
                            : job.status === "COMPLETED" || job.status === "DELIVERED"
                            ? "Completed"
                            : "In Store"}
                        </span>
                      </div>

                      <div className="px-2.5 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-cyan-400 flex items-center justify-between text-xs font-bold">
                        <span className="flex items-center gap-1.5 text-slate-400">
                          <Navigation className="w-3.5 h-3.5 text-cyan-400" />
                          <span>Site ETA:</span>
                        </span>
                        <span className="font-mono truncate">{etaBadge || (job.status === "IN_PROGRESS" ? "Arrived" : "Standby")}</span>
                      </div>
                    </div>

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
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-[9px] font-bold uppercase text-slate-500 flex items-center gap-1">
                            <Truck className="w-3 h-3 text-amber-400" />
                            Machinery
                          </p>
                          {job.vehiclePlate && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 text-[9px] font-bold border border-emerald-500/30">
                              🔒 Locked
                            </span>
                          )}
                        </div>
                        <p className="font-bold text-white truncate text-xs">
                          {job.machineId || "Standard Mixer"}
                        </p>
                        {job.vehiclePlate && (
                          <p className="text-[10px] text-emerald-400 font-mono truncate font-bold flex items-center gap-1 mt-0.5">
                            <ShieldCheck className="w-3 h-3 text-emerald-400" />
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

      {/* 🏬 EDIT STORE & BASE YARD MODAL */}
      {isStoreModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div
            className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsStoreModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Edit Store & Base Yard Location</h3>
                <p className="text-xs text-slate-400">
                  Update home base coordinates where vehicles dispatch from.
                </p>
              </div>
            </div>

            {storeError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{storeError}</span>
              </div>
            )}

            <form onSubmit={handleSaveStore} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Store / Main Yard Name</label>
                <input
                  type="text"
                  value={storeForm.storeName}
                  onChange={(e) => setStoreForm({ ...storeForm, storeName: e.target.value })}
                  placeholder="e.g. Zero Group Main Yard & Store"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Store Address</label>
                <input
                  type="text"
                  value={storeForm.storeAddress}
                  onChange={(e) => setStoreForm({ ...storeForm, storeAddress: e.target.value })}
                  placeholder="e.g. Pala, Kottayam, Kerala"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-300 font-bold">Google Maps Link or "lat, lng"</label>
                  <span className="text-[10px] text-emerald-400 font-semibold">Auto-fills Lat / Lng</span>
                </div>
                <input
                  type="text"
                  value={storeForm.googleLink}
                  onChange={(e) => handleStoreGoogleUrlChange(e.target.value)}
                  placeholder="Paste Google Maps URL or '9.5916, 76.5222'..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono text-[11px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={storeForm.storeLatitude}
                    onChange={(e) => setStoreForm({ ...storeForm, storeLatitude: e.target.value })}
                    placeholder="e.g. 9.591600"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                    required
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={storeForm.storeLongitude}
                    onChange={(e) => setStoreForm({ ...storeForm, storeLongitude: e.target.value })}
                    placeholder="e.g. 76.522200"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
                    required
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={handleDetectStoreGps}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center gap-1.5 transition-colors text-xs"
                >
                  <Crosshair className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Use Device GPS</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsStoreModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingStore}
                    className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black flex items-center gap-1.5 transition-all shadow disabled:opacity-50"
                  >
                    {isSavingStore ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    <span>Save Location</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 📍 EDIT DISPATCH JOB SITE MODAL */}
      {editingDispatch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in">
          <div
            className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl relative"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setEditingDispatch(null)}
              className="absolute top-5 right-5 p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400">
                <MapPin className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Edit Job Site Location</h3>
                <p className="text-xs text-slate-400">
                  Customer: <strong className="text-white">{editingDispatch.customerName}</strong> • Job #{editingDispatch.id.slice(-6)}
                </p>
              </div>
            </div>

            {siteError && (
              <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{siteError}</span>
              </div>
            )}

            <form onSubmit={handleSaveSite} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Site Address / Landmark</label>
                <input
                  type="text"
                  value={siteForm.location}
                  onChange={(e) => setSiteForm({ ...siteForm, location: e.target.value })}
                  placeholder="e.g. Kottayam Bypass, Near Reliance Petrol Pump"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500"
                  required
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-slate-300 font-bold">Google Maps Link or "lat, lng"</label>
                  <span className="text-[10px] text-amber-400 font-semibold">Auto-fills Lat / Lng</span>
                </div>
                <input
                  type="text"
                  value={siteForm.googleLink}
                  onChange={(e) => handleSiteGoogleUrlChange(e.target.value)}
                  placeholder="Paste Google Maps URL or '9.5916, 76.5222'..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono text-[11px]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Site Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={siteForm.latitude}
                    onChange={(e) => setSiteForm({ ...siteForm, latitude: e.target.value })}
                    placeholder="e.g. 9.582300"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-bold mb-1">Site Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={siteForm.longitude}
                    onChange={(e) => setSiteForm({ ...siteForm, longitude: e.target.value })}
                    placeholder="e.g. 76.518900"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white placeholder-slate-600 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div className="pt-2 flex items-center justify-between gap-3 flex-wrap">
                <button
                  type="button"
                  onClick={handleDetectSiteGps}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold flex items-center gap-1.5 transition-colors text-xs"
                >
                  <Crosshair className="w-3.5 h-3.5 text-amber-400" />
                  <span>Use Device GPS</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingDispatch(null)}
                    className="px-4 py-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSavingSite}
                    className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black flex items-center gap-1.5 transition-all shadow disabled:opacity-50"
                  >
                    {isSavingSite ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    <span>Save Site GPS</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
