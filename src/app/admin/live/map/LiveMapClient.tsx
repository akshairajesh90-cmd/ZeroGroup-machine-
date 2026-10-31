"use client";

import React, { useEffect, useState, useMemo } from "react";
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
  User,
  Truck,
  Settings2,
  Search,
  X,
  Navigation,
  Clock,
  Phone,
  Radio,
  Eye,
  Activity,
  Layers,
  Sparkles,
  ChevronRight,
  Route,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { adminPingEmployeeLocation } from "@/actions/location";

// Fix Leaflet's default icon path issues in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Color-coded icons
const driverIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const operatorIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const siteIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png",
  shadowUrl:
    "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

export interface RouteWaypoint {
  lat: number;
  lng: number;
  time: string;
  speed?: number | null;
}

export interface PinProps {
  id: string;
  name: string;
  role: string;
  phone?: string | null;
  latitude: number;
  longitude: number;
  lastUpdate: string | null;
  cadenceMinutes?: number;
  speed?: number | null;
  routeCount?: number;
  machineId?: string | null;
  machineType?: string | null;
  customerName?: string | null;
  dispatchLocation?: string | null;
  dispatchStatus?: string | null;
  vehiclePlate?: string | null;
  vehicleType?: string | null;
}

export interface SitePinProps {
  id: string;
  location: string;
  latitude: number;
  longitude: number;
  customerName?: string | null;
  status: string;
  machineId?: string | null;
  machineType?: string | null;
  operatorName?: string | null;
  driverName?: string | null;
  crewCount?: number;
  dateOfService?: string;
}

export interface VehicleCardProps {
  shiftId: string;
  vehicleId: string;
  licensePlate: string;
  vehicleType: string;
  vehicleStatus: string;
  driverId: string;
  driverName: string;
  driverLat: number | null;
  driverLng: number | null;
  driverLastUpdate: string | null;
  shiftStart: string;
  shiftEnd: string | null;
}

interface LiveMapClientProps {
  pins?: PinProps[];
  employeePins?: PinProps[];
  sitePins?: SitePinProps[];
  vehicleCards?: VehicleCardProps[];
  routeTrails?: Record<string, RouteWaypoint[]>;
}

// Controller component to pan/zoom map programmatically
function MapController({
  targetCenter,
  bounds,
}: {
  targetCenter: [number, number] | null;
  bounds: L.LatLngBoundsExpression | null;
}) {
  const map = useMap();

  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });
    } else if (targetCenter) {
      map.flyTo(targetCenter, 13, { duration: 1.2 });
    }
  }, [targetCenter, bounds, map]);

  return null;
}

// Automatically invalidate map size on mount to ensure smooth tile rendering
function MapResizer() {
  const map = useMap();
  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 250);
    return () => clearTimeout(timer);
  }, [map]);
  return null;
}

// Helper to determine GPS cadence freshness (15m Driver / 45m Operator)
function computeCadenceStatus(lastUpdate: string | null, cadenceMinutes: number = 15) {
  if (!lastUpdate) {
    return {
      statusText: "NO SIGNAL",
      badgeClass: "bg-slate-800 text-slate-400 border-slate-700",
      dotClass: "bg-slate-500",
      minutesAgo: 999,
      isFresh: false,
    };
  }

  const diffMs = Math.max(0, Date.now() - new Date(lastUpdate).getTime());
  const minutesAgo = Math.floor(diffMs / 60000);

  if (minutesAgo <= cadenceMinutes) {
    return {
      statusText: `LIVE • ${minutesAgo}m ago`,
      badgeClass: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40",
      dotClass: "bg-emerald-400 animate-pulse",
      minutesAgo,
      isFresh: true,
    };
  } else if (minutesAgo <= cadenceMinutes * 2) {
    return {
      statusText: `DUE • ${minutesAgo}m ago`,
      badgeClass: "bg-amber-500/20 text-amber-300 border-amber-500/40",
      dotClass: "bg-amber-400",
      minutesAgo,
      isFresh: false,
    };
  } else {
    return {
      statusText: `OVERDUE • ${minutesAgo}m ago`,
      badgeClass: "bg-rose-500/20 text-rose-300 border-rose-500/40",
      dotClass: "bg-rose-400",
      minutesAgo,
      isFresh: false,
    };
  }
}

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

export default function LiveMapClient({
  pins = [],
  employeePins = [],
  sitePins = [],
  vehicleCards = [],
  routeTrails = {},
}: LiveMapClientProps) {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [localTrails, setLocalTrails] = useState<Record<string, RouteWaypoint[]>>(routeTrails);
  const [isPingingGPS, setIsPingingGPS] = useState(false);
  const [tileStyle, setTileStyle] = useState<"osm" | "hot" | "satellite">("osm");

  // Road Routing States
  const [roadSiteRoute, setRoadSiteRoute] = useState<{
    empId: string;
    siteId: string;
    positions: [number, number][];
    distanceKm: number;
    durationMins: number;
    isRoadSnapped: boolean;
  } | null>(null);
  const [isLoadingSiteRoute, setIsLoadingSiteRoute] = useState(false);

  const [roadTrailRoute, setRoadTrailRoute] = useState<{
    empId: string;
    positions: [number, number][];
    isRoadSnapped: boolean;
  } | null>(null);
  const [isLoadingTrail, setIsLoadingTrail] = useState(false);

  // Search & Filtering State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedSection, setSelectedSection] = useState<
    "ALL" | "DRIVER" | "OPERATOR" | "SITE" | "VEHICLE"
  >("ALL");
  const [selectedLocationFilter, setSelectedLocationFilter] = useState("ALL");

  // Selection & Route Trail State
  const [selectedPin, setSelectedPin] = useState<PinProps | null>(null);
  const [selectedSite, setSelectedSite] = useState<SitePinProps | null>(null);
  const [activeRouteEmpId, setActiveRouteEmpId] = useState<string | null>(null);

  // Map Camera Control State
  const [mapCenter, setMapCenter] = useState<[number, number] | null>(null);
  const [mapBounds, setMapBounds] = useState<L.LatLngBoundsExpression | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setLocalTrails(routeTrails);
  }, [routeTrails]);

  const allEmployees = useMemo(
    () => (employeePins.length > 0 ? employeePins : pins),
    [employeePins, pins]
  );

  // Unique locations list for dropdown
  const locationOptions = useMemo(() => {
    const locs = new Set<string>();
    allEmployees.forEach((e) => {
      if (e.dispatchLocation) locs.add(e.dispatchLocation);
    });
    sitePins.forEach((s) => {
      if (s.location) locs.add(s.location);
    });
    return Array.from(locs).sort();
  }, [allEmployees, sitePins]);

  // Filtered Field Employees
  const filteredEmployees = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return allEmployees.filter((emp) => {
      // Role filter
      if (selectedSection === "DRIVER" && emp.role !== "DRIVER") return false;
      if (selectedSection === "OPERATOR" && emp.role !== "OPERATOR") return false;
      if (selectedSection === "SITE" || selectedSection === "VEHICLE") return false;

      // Location filter
      if (
        selectedLocationFilter !== "ALL" &&
        emp.dispatchLocation !== selectedLocationFilter
      ) {
        return false;
      }

      // Search query filter
      if (!q) return true;
      return (
        emp.name.toLowerCase().includes(q) ||
        emp.role.toLowerCase().includes(q) ||
        (emp.phone && emp.phone.includes(q)) ||
        (emp.dispatchLocation && emp.dispatchLocation.toLowerCase().includes(q)) ||
        (emp.customerName && emp.customerName.toLowerCase().includes(q)) ||
        (emp.machineId && emp.machineId.toLowerCase().includes(q)) ||
        (emp.vehiclePlate && emp.vehiclePlate.toLowerCase().includes(q))
      );
    });
  }, [allEmployees, searchQuery, selectedSection, selectedLocationFilter]);

  // Filtered Job Sites
  const filteredSites = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return sitePins.filter((site) => {
      if (
        selectedSection !== "ALL" &&
        selectedSection !== "SITE"
      ) {
        return false;
      }

      if (
        selectedLocationFilter !== "ALL" &&
        site.location !== selectedLocationFilter
      ) {
        return false;
      }

      if (!q) return true;
      return (
        site.location.toLowerCase().includes(q) ||
        (site.customerName && site.customerName.toLowerCase().includes(q)) ||
        (site.operatorName && site.operatorName.toLowerCase().includes(q)) ||
        (site.driverName && site.driverName.toLowerCase().includes(q)) ||
        (site.machineId && site.machineId.toLowerCase().includes(q)) ||
        site.status.toLowerCase().includes(q)
      );
    });
  }, [sitePins, searchQuery, selectedSection, selectedLocationFilter]);

  // Route points for active selected person (historical breadcrumbs)
  const activeRoute = useMemo(() => {
    if (!activeRouteEmpId) return null;
    const points = localTrails[activeRouteEmpId] || [];
    if (points.length === 0) return null;
    const targetEmp = allEmployees.find((e) => e.id === activeRouteEmpId);
    return {
      employee: targetEmp,
      points,
      positions: points.map((p) => [p.lat, p.lng] as [number, number]),
    };
  }, [activeRouteEmpId, localTrails, allEmployees]);

  // Active person-to-site destination route line
  const activePersonSiteRoute = useMemo(() => {
    if (!selectedPin) return null;
    const matchedSite = sitePins.find(
      (s) =>
        (selectedPin.dispatchLocation && s.location === selectedPin.dispatchLocation) ||
        (s.operatorName && s.operatorName === selectedPin.name) ||
        (s.driverName && s.driverName === selectedPin.name)
    );
    if (!matchedSite) return null;
    const distanceKm = calculateDistanceKm(
      selectedPin.latitude,
      selectedPin.longitude,
      matchedSite.latitude,
      matchedSite.longitude
    );
    return {
      positions: [
        [selectedPin.latitude, selectedPin.longitude],
        [matchedSite.latitude, matchedSite.longitude],
      ] as [number, number][],
      site: matchedSite,
      distanceKm,
    };
  }, [selectedPin, sitePins]);

  // Fetch road-snapped route for Person-to-Site Destination Route
  useEffect(() => {
    if (!activePersonSiteRoute || !selectedPin) {
      setRoadSiteRoute(null);
      return;
    }

    let isMounted = true;
    setIsLoadingSiteRoute(true);

    fetch("/api/routing/directions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        origin: [selectedPin.latitude, selectedPin.longitude],
        destination: [
          activePersonSiteRoute.site.latitude,
          activePersonSiteRoute.site.longitude,
        ],
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.success && data.coordinates && data.coordinates.length > 0) {
          setRoadSiteRoute({
            empId: selectedPin.id,
            siteId: activePersonSiteRoute.site.id,
            positions: data.coordinates,
            distanceKm: data.distanceKm,
            durationMins: data.durationMins,
            isRoadSnapped: data.isRoadSnapped ?? true,
          });
        }
      })
      .catch((err) => {
        console.warn("[LiveMapClient] Failed to fetch road route:", err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingSiteRoute(false);
      });

    return () => {
      isMounted = false;
    };
  }, [selectedPin?.id, selectedPin?.latitude, selectedPin?.longitude, activePersonSiteRoute?.site?.id]);

  // Fetch road-snapped route for Historical GPS Trail
  useEffect(() => {
    if (!activeRoute || activeRoute.points.length < 2 || !activeRouteEmpId) {
      setRoadTrailRoute(null);
      return;
    }

    let isMounted = true;
    setIsLoadingTrail(true);

    fetch("/api/routing/directions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        waypoints: activeRoute.points.map((p) => [p.lat, p.lng]),
      }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (!isMounted) return;
        if (data.success && data.coordinates && data.coordinates.length > 0) {
          setRoadTrailRoute({
            empId: activeRouteEmpId,
            positions: data.coordinates,
            isRoadSnapped: data.isRoadSnapped ?? true,
          });
        }
      })
      .catch((err) => {
        console.warn("[LiveMapClient] Failed to road-snap trail:", err);
      })
      .finally(() => {
        if (isMounted) setIsLoadingTrail(false);
      });

    return () => {
      isMounted = false;
    };
  }, [activeRouteEmpId, activeRoute?.points?.length]);

  // Handler: Ping / Refresh GPS for Employee
  const handleAdminPingLocation = async () => {
    if (!selectedPin) return;
    setIsPingingGPS(true);
    try {
      const res = await adminPingEmployeeLocation(selectedPin.id);
      if (res?.success) {
        const nowIso = res.lastUpdate!;
        setSelectedPin((prev) =>
          prev
            ? {
                ...prev,
                lastUpdate: nowIso,
                latitude: res.latitude!,
                longitude: res.longitude!,
              }
            : null
        );
        setLocalTrails((prev) => {
          const existing = prev[selectedPin.id] || [];
          return {
            ...prev,
            [selectedPin.id]: [
              ...existing,
              {
                lat: res.latitude!,
                lng: res.longitude!,
                time: nowIso,
                speed: selectedPin.role === "DRIVER" ? 28 : 0,
              },
            ],
          };
        });
        setMapCenter([res.latitude!, res.longitude!]);
        router.refresh();
      } else {
        alert(res?.error || "Failed to ping GPS");
      }
    } catch (err: any) {
      console.error("Admin ping error:", err);
    } finally {
      setIsPingingGPS(false);
    }
  };

  // Determine initial center
  const defaultCenter: [number, number] = useMemo(() => {
    if (allEmployees.length > 0 && allEmployees[0].latitude) {
      return [allEmployees[0].latitude, allEmployees[0].longitude];
    }
    if (sitePins.length > 0 && sitePins[0].latitude) {
      return [sitePins[0].latitude, sitePins[0].longitude];
    }
    return [9.5915, 76.5221]; // Kottayam, Kerala
  }, [allEmployees, sitePins]);

  // Handler: Select employee & optionally show route
  const handleSelectEmployee = (emp: PinProps, showRoute = true) => {
    setSelectedPin(emp);
    setSelectedSite(null);
    setMapCenter([emp.latitude, emp.longitude]);

    if (showRoute) {
      setActiveRouteEmpId(emp.id);
      const points = localTrails[emp.id];
      const matchedSite = sitePins.find(
        (s) =>
          (emp.dispatchLocation && s.location === emp.dispatchLocation) ||
          (s.operatorName && s.operatorName === emp.name) ||
          (s.driverName && s.driverName === emp.name)
      );
      if (matchedSite) {
        const bounds = L.latLngBounds([
          [emp.latitude, emp.longitude],
          [matchedSite.latitude, matchedSite.longitude],
        ]);
        setMapBounds(bounds);
      } else if (points && points.length > 1) {
        const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
        setMapBounds(bounds);
      }
    }
  };

  // Handler: Select job site
  const handleSelectSite = (site: SitePinProps) => {
    setSelectedSite(site);
    setSelectedPin(null);
    setMapCenter([site.latitude, site.longitude]);
  };

  // Handler: Toggle route display
  const toggleRoute = (empId: string) => {
    if (activeRouteEmpId === empId) {
      setActiveRouteEmpId(null);
      setMapBounds(null);
    } else {
      setActiveRouteEmpId(empId);
      const points = localTrails[empId];
      if (points && points.length > 1) {
        const bounds = L.latLngBounds(points.map((p) => [p.lat, p.lng]));
        setMapBounds(bounds);
      }
    }
  };

  if (!mounted) {
    return (
      <div className="w-full h-[620px] bg-slate-900 animate-pulse flex items-center justify-center rounded-2xl border border-slate-800">
        <span className="text-slate-500 font-medium flex items-center gap-2">
          <Activity className="w-5 h-5 animate-spin text-indigo-400" />
          Initializing GPS Live Tracking Engine...
        </span>
      </div>
    );
  }

  const driverCount = allEmployees.filter((e) => e.role === "DRIVER").length;
  const operatorCount = allEmployees.filter((e) => e.role === "OPERATOR").length;

  return (
    <div className="space-y-4">
      {/* ─────────────────────────────────────────────────────────────────────────────
          1. SEARCH & SECTION FILTER BAR (HEADER)
      ───────────────────────────────────────────────────────────────────────────── */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-3 sm:p-4 shadow-xl backdrop-blur-md space-y-3">
        {/* Top Search Input & Quick Controls */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          {/* Search Input Box */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search driver, operator, site location, customer, machine ID, vehicle plate..."
              className="w-full bg-slate-950 border border-slate-800 text-white placeholder-slate-500 text-sm rounded-xl pl-10 pr-9 py-2.5 outline-none transition-all focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Location Dropdown */}
          <div className="flex items-center gap-2">
            <select
              value={selectedLocationFilter}
              onChange={(e) => setSelectedLocationFilter(e.target.value)}
              className="bg-slate-950 border border-slate-800 text-slate-300 text-xs sm:text-sm rounded-xl px-3 py-2.5 outline-none focus:border-indigo-500 cursor-pointer"
            >
              <option value="ALL">📍 All Locations ({locationOptions.length})</option>
              {locationOptions.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>

            {/* Clear All Filters Button */}
            {(searchQuery ||
              selectedSection !== "ALL" ||
              selectedLocationFilter !== "ALL" ||
              activeRouteEmpId) && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedSection("ALL");
                  setSelectedLocationFilter("ALL");
                  setActiveRouteEmpId(null);
                  setSelectedPin(null);
                  setSelectedSite(null);
                }}
                className="px-3 py-2.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex items-center gap-1.5"
              >
                <X className="w-3.5 h-3.5" />
                Reset
              </button>
            )}
          </div>
        </div>

        {/* Section / Role Pills + Cadence Badges */}
        <div className="flex items-center justify-between flex-wrap gap-2 pt-1 border-t border-slate-800/60">
          {/* Section Filter Pills */}
          <div className="flex items-center gap-1.5 flex-wrap text-xs">
            <button
              type="button"
              onClick={() => setSelectedSection("ALL")}
              className={`px-3 py-1.5 rounded-lg font-bold transition-all ${
                selectedSection === "ALL"
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/20"
                  : "bg-slate-800/80 text-slate-400 hover:text-white"
              }`}
            >
              All Pins ({allEmployees.length + sitePins.length})
            </button>

            <button
              type="button"
              onClick={() => setSelectedSection("DRIVER")}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                selectedSection === "DRIVER"
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                  : "bg-slate-800/80 text-blue-400 hover:text-blue-300"
              }`}
            >
              <Truck className="w-3.5 h-3.5" />
              Drivers ({driverCount})
              <span className="text-[10px] bg-blue-900/60 text-blue-200 px-1.5 py-0.2 rounded font-mono">
                15m GPS
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedSection("OPERATOR")}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                selectedSection === "OPERATOR"
                  ? "bg-orange-600 text-white shadow-md shadow-orange-500/20"
                  : "bg-slate-800/80 text-orange-400 hover:text-orange-300"
              }`}
            >
              <Settings2 className="w-3.5 h-3.5" />
              Operators ({operatorCount})
              <span className="text-[10px] bg-orange-900/60 text-orange-200 px-1.5 py-0.2 rounded font-mono">
                45m GPS
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedSection("SITE")}
              className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all ${
                selectedSection === "SITE"
                  ? "bg-violet-600 text-white shadow-md shadow-violet-500/20"
                  : "bg-slate-800/80 text-violet-400 hover:text-violet-300"
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              Job Sites ({sitePins.length})
            </button>
          </div>

          {/* GPS Cadence Reminder Note */}
          <div className="flex items-center gap-3 text-[11px] text-slate-400 font-mono">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse inline-block" />
              Driver updates: <strong className="text-white">every 15m</strong>
            </span>
            <span className="text-slate-600">•</span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-orange-400 inline-block" />
              Operator updates: <strong className="text-white">every 45m</strong>
            </span>
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          2. ACTIVE ROUTE TRAIL BANNER (IF ROUTE SELECTED)
      ───────────────────────────────────────────────────────────────────────────── */}
      {activeRoute && activeRoute.employee && (
        <div className="bg-gradient-to-r from-indigo-950/80 via-slate-900 to-slate-900 border border-indigo-500/40 rounded-xl px-4 py-2.5 flex items-center justify-between flex-wrap gap-2 text-xs">
          <div className="flex items-center gap-2">
            <Route className="w-4 h-4 text-cyan-400 animate-pulse" />
            <span className="text-slate-300">
              Active Route Trail:{" "}
              <strong className="text-white font-bold">
                {activeRoute.employee.name}
              </strong>{" "}
              ({activeRoute.employee.role})
            </span>
            <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-full font-mono text-[11px]">
              {activeRoute.points.length} waypoints recorded
            </span>
            {roadTrailRoute?.isRoadSnapped && (
              <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono text-[11px] flex items-center gap-1">
                🛣️ Road-snapped Trail
              </span>
            )}
            {isLoadingTrail && (
              <span className="bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded-full font-mono text-[11px] animate-pulse">
                Snapping to roads...
              </span>
            )}
            <span className="text-slate-500 text-[11px]">
              (Cadence: {activeRoute.employee.role === "DRIVER" ? "15m" : "45m"} pings)
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const bounds = L.latLngBounds(
                  activeRoute.points.map((p) => [p.lat, p.lng])
                );
                setMapBounds(bounds);
              }}
              className="px-2.5 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/30 font-bold transition-colors"
            >
              Zoom to Full Route
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveRouteEmpId(null);
                setMapBounds(null);
              }}
              className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors flex items-center gap-1 font-bold"
            >
              <X className="w-3.5 h-3.5" />
              Close Route
            </button>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────────────────────
          3. INTERACTIVE MAP CANVAS + DETAIL PANEL OVERLAYS
      ───────────────────────────────────────────────────────────────────────────── */}
      <div
        className="rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative isolate"
        style={{ height: "620px" }}
      >
        {/* 🗺️ 100% FREE TILE LAYER SWITCHER (Zero API Key, Zero Watermark, 100% Free Forever) */}
        <div className="absolute top-4 right-4 z-[500] bg-slate-900/95 backdrop-blur-md border border-slate-700/80 rounded-2xl p-1 shadow-2xl flex items-center gap-1 text-[11px] font-bold">
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
            title="Esri Satellite aerial photography with hybrid place names and road network"
          >
            <span>🛰️ Satellite</span>
          </button>
        </div>

        <MapContainer
          center={defaultCenter}
          zoom={11}
          scrollWheelZoom={true}
          className="w-full h-full z-0"
          style={{ height: "100%", width: "100%" }}
        >
          <MapResizer />
          <MapController targetCenter={mapCenter} bounds={mapBounds} />

          {/* 🗺️ 100% FREE TILES (No API Keys, No Watermarks, Zero Costs) */}
          {tileStyle === "osm" && (
            <TileLayer
              key="admin-tile-osm"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              maxZoom={19}
            />
          )}
          {tileStyle === "hot" && (
            <TileLayer
              key="admin-tile-hot"
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, Tiles style by Humanitarian OpenStreetMap Team'
              url="https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png"
              maxZoom={19}
            />
          )}
          {tileStyle === "satellite" && (
            <>
              {/* 🛰️ High-Resolution Aerial Satellite Imagery (100% Free, Zero Watermark, Zero API Key) */}
              <TileLayer
                key="admin-tile-satellite-base"
                attribution='Tiles &copy; Esri &mdash; Source: Esri, i-cubed, USDA, USGS, AEX, GeoEye, Getmapping, Aerogrid, IGN, IGP, UPR-EGP, and GIS User Community'
                url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
                maxZoom={19}
              />
              {/* Transparent Street & Place Labels overlaid on satellite */}
              <TileLayer
                key="admin-tile-satellite-labels"
                url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}"
                maxZoom={19}
              />
              {/* Transparent Highway & Road Network overlaid on satellite */}
              <TileLayer
                key="admin-tile-satellite-roads"
                url="https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}"
                maxZoom={19}
              />
            </>
          )}

          {/* ── DRAW ACTIVE ROUTE POLYLINE & WAYPOINT DOTS ──────────────────────── */}
          {activeRoute && (
            <>
              {/* Glowing Route Polyline (Following Road Network) */}
              <Polyline
                positions={
                  roadTrailRoute && roadTrailRoute.empId === activeRouteEmpId && roadTrailRoute.positions.length > 0
                    ? roadTrailRoute.positions
                    : activeRoute.positions
                }
                pathOptions={{
                  color:
                    activeRoute.employee?.role === "DRIVER"
                      ? "#38bdf8"
                      : "#fb923c",
                  weight: 5,
                  opacity: 0.9,
                  dashArray:
                    roadTrailRoute?.isRoadSnapped
                      ? undefined
                      : activeRoute.employee?.role === "DRIVER"
                      ? "8, 6"
                      : undefined,
                }}
              />

              {/* Waypoint Breadcrumbs along the Trail */}
              {activeRoute.points.map((wp, wIdx) => (
                <CircleMarker
                  key={`wp-${wIdx}`}
                  center={[wp.lat, wp.lng]}
                  radius={wIdx === activeRoute.points.length - 1 ? 7 : 5}
                  pathOptions={{
                    color: "#ffffff",
                    weight: 2,
                    fillColor:
                      wIdx === activeRoute.points.length - 1
                        ? "#10b981"
                        : activeRoute.employee?.role === "DRIVER"
                        ? "#0284c7"
                        : "#ea580c",
                    fillOpacity: 1,
                  }}
                >
                  <Popup className="custom-popup" minWidth={200}>
                    <div className="p-1 text-xs">
                      <div className="font-bold text-slate-900 border-b border-slate-200 pb-1 mb-1 flex items-center justify-between">
                        <span>Waypoint #{wIdx + 1}</span>
                        <span className="text-[10px] text-slate-500 font-mono">
                          {new Date(wp.time).toLocaleTimeString("en-IN", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <div className="text-slate-600 space-y-1">
                        <div>
                          {activeRoute.employee?.role === "DRIVER"
                            ? "⏱️ 15-Minute Driver Cadence Checkpoint"
                            : "⏱️ 45-Minute Operator Cadence Checkpoint"}
                        </div>
                        {wp.speed !== undefined && wp.speed !== null && (
                          <div className="font-mono text-slate-700">
                            Speed: <strong>{wp.speed.toFixed(1)} km/h</strong>
                          </div>
                        )}
                        <div className="text-[10px] text-slate-400 font-mono">
                          {wp.lat.toFixed(5)}, {wp.lng.toFixed(5)}
                        </div>
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              ))}
            </>
          )}

          {/* ── DRAW PERSON-TO-SITE DESTINATION ROUTE LINE (FOLLOWING ROAD NETWORK) ── */}
          {activePersonSiteRoute && (
            <Polyline
              positions={
                roadSiteRoute && roadSiteRoute.empId === selectedPin?.id && roadSiteRoute.positions.length > 0
                  ? roadSiteRoute.positions
                  : activePersonSiteRoute.positions
              }
              pathOptions={{
                color: "#2563eb",
                weight: 5,
                opacity: 0.95,
                dashArray: roadSiteRoute?.isRoadSnapped ? undefined : "6, 8",
              }}
            >
              <Popup className="custom-popup" minWidth={220}>
                <div className="p-1 text-xs space-y-1">
                  <span className="font-bold text-blue-600 block">
                    Route: {selectedPin?.name} → {activePersonSiteRoute.site.location}
                  </span>
                  <div className="text-slate-600 font-mono space-y-0.5">
                    <div>
                      Distance:{" "}
                      <strong>
                        {roadSiteRoute && roadSiteRoute.empId === selectedPin?.id
                          ? roadSiteRoute.distanceKm
                          : activePersonSiteRoute.distanceKm}{" "}
                        km
                      </strong>{" "}
                      <span className="text-[10px] text-emerald-600 font-semibold">
                        {roadSiteRoute?.isRoadSnapped ? "(Road Routed)" : "(Direct)"}
                      </span>
                    </div>
                    {roadSiteRoute && roadSiteRoute.empId === selectedPin?.id && roadSiteRoute.durationMins > 0 && (
                      <div className="text-slate-500">
                        Est. Driving Time: ~{roadSiteRoute.durationMins} mins
                      </div>
                    )}
                  </div>
                </div>
              </Popup>
            </Polyline>
          )}

          {/* ── FIELD PERSONNEL MARKERS (DRIVERS & OPERATORS) ─────────────────── */}
          {filteredEmployees.map((pin) => {
            const cadenceMins = pin.cadenceMinutes || (pin.role === "DRIVER" ? 15 : 45);
            const cadence = computeCadenceStatus(pin.lastUpdate, cadenceMins);

            return (
              <Marker
                key={`emp-${pin.id}`}
                position={[pin.latitude, pin.longitude]}
                icon={pin.role === "DRIVER" ? driverIcon : operatorIcon}
                eventHandlers={{
                  click: () => {
                    handleSelectEmployee(pin, true);
                  },
                }}
              >
                <Popup className="custom-popup" minWidth={240}>
                  <div className="p-1">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2">
                      <div className="flex items-center gap-1.5">
                        {pin.role === "DRIVER" ? (
                          <Truck className="w-4 h-4 text-blue-500" />
                        ) : (
                          <Settings2 className="w-4 h-4 text-orange-500" />
                        )}
                        <h3 className="font-black text-slate-900 text-sm">{pin.name}</h3>
                      </div>
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          pin.role === "DRIVER"
                            ? "bg-blue-100 text-blue-700"
                            : "bg-orange-100 text-orange-700"
                        }`}
                      >
                        {pin.role}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs text-slate-600">
                      {/* Cadence Freshness Badge */}
                      <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                        <span className="text-[10px] text-slate-500 font-mono">
                          Tracking: Every {cadenceMins}m
                        </span>
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${cadence.badgeClass}`}
                        >
                          {cadence.statusText}
                        </span>
                      </div>

                      {pin.phone && (
                        <div className="flex items-center gap-1.5">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <a
                            href={`tel:${pin.phone}`}
                            className="text-indigo-600 font-mono hover:underline font-bold"
                          >
                            {pin.phone}
                          </a>
                        </div>
                      )}

                      {pin.vehiclePlate && (
                        <div className="flex items-center gap-1.5">
                          <Truck className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span className="font-bold text-amber-700">{pin.vehiclePlate}</span>
                          {pin.vehicleType && (
                            <span className="text-slate-400">({pin.vehicleType})</span>
                          )}
                        </div>
                      )}

                      {pin.machineId && (
                        <div className="flex items-center gap-1.5">
                          <Settings2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="font-semibold text-indigo-700">{pin.machineId}</span>
                          {pin.machineType && (
                            <span className="text-slate-400">({pin.machineType})</span>
                          )}
                        </div>
                      )}

                      {pin.customerName && (
                        <div className="flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{pin.customerName}</span>
                          {pin.dispatchLocation && (
                            <span className="text-slate-400">– {pin.dispatchLocation}</span>
                          )}
                        </div>
                      )}

                      {pin.speed !== undefined && pin.speed !== null && (
                        <div className="text-[11px] text-slate-500 font-mono">
                          Speed: <strong>{pin.speed.toFixed(1)} km/h</strong>
                        </div>
                      )}

                      <div className="flex items-center gap-1.5 border-t border-slate-100 pt-1.5 mt-1.5 justify-between">
                        <span className="font-mono text-[10px] text-slate-400">
                          {pin.latitude.toFixed(5)}, {pin.longitude.toFixed(5)}
                        </span>
                        <button
                          type="button"
                          onClick={() => toggleRoute(pin.id)}
                          className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors"
                        >
                          {activeRouteEmpId === pin.id ? "Hide Route" : "Show Route"}
                        </button>
                      </div>
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* ── JOB SITE MARKERS ──────────────────────────────────────────────── */}
          {filteredSites.map((site) => (
            <Marker
              key={`site-${site.id}`}
              position={[site.latitude, site.longitude]}
              icon={siteIcon}
              eventHandlers={{
                click: () => {
                  handleSelectSite(site);
                },
              }}
            >
              <Popup className="custom-popup" minWidth={240}>
                <div className="p-1">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2">
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-violet-500" />
                      <h3 className="font-black text-slate-900 text-sm truncate max-w-[150px]">
                        {site.location}
                      </h3>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-700">
                      JOB SITE
                    </span>
                  </div>
                  <div className="space-y-1.5 text-xs text-slate-600">
                    {site.customerName && (
                      <div className="font-bold text-slate-800">
                        Customer: {site.customerName}
                      </div>
                    )}
                    {site.machineId && (
                      <div className="flex items-center gap-1.5">
                        <Settings2 className="w-3.5 h-3.5 text-slate-400" />
                        <span>
                          {site.machineId} {site.machineType ? `(${site.machineType})` : ""}
                        </span>
                      </div>
                    )}
                    {site.operatorName && (
                      <div>
                        Operator: <span className="font-medium text-slate-800">{site.operatorName}</span>
                      </div>
                    )}
                    {site.driverName && (
                      <div>
                        Driver: <span className="font-medium text-slate-800">{site.driverName}</span>
                      </div>
                    )}
                    <div className="border-t border-slate-100 pt-1.5 mt-1.5 flex justify-between items-center text-[10px]">
                      <span className="font-semibold text-violet-600">{site.status}</span>
                      <span className="font-mono text-slate-400">
                        {site.latitude.toFixed(4)}, {site.longitude.toFixed(4)}
                      </span>
                    </div>
                  </div>
                </div>
              </Popup>
            </Marker>
          ))}
        </MapContainer>

        {/* ── FLOATING DETAIL CARD OVERLAY (ON SELECTION) ───────────────────── */}
        {selectedPin && (
          <div className="absolute top-16 right-4 z-[1000] w-80 max-w-[calc(100%-2rem)] bg-slate-950/95 backdrop-blur-md border border-slate-700/80 rounded-2xl p-4 shadow-2xl text-white space-y-3 animate-in fade-in slide-in-from-right-4 duration-200">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm shadow-md ${
                    selectedPin.role === "DRIVER"
                      ? "bg-blue-600 text-white"
                      : "bg-orange-600 text-white"
                  }`}
                >
                  {selectedPin.name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-black text-sm leading-tight">{selectedPin.name}</h4>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                        selectedPin.role === "DRIVER"
                          ? "bg-blue-500/20 text-blue-400"
                          : "bg-orange-500/20 text-orange-400"
                      }`}
                    >
                      {selectedPin.role}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      ⏱️ {selectedPin.role === "DRIVER" ? "15m" : "45m"} GPS
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedPin(null)}
                className="text-slate-400 hover:text-white p-1 transition-colors"
                title="Close detail"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Cadence & Status Bar */}
            {(() => {
              const cadenceMins = selectedPin.cadenceMinutes || (selectedPin.role === "DRIVER" ? 15 : 45);
              const cadence = computeCadenceStatus(selectedPin.lastUpdate, cadenceMins);
              return (
                <div className="space-y-2">
                  <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 flex items-center justify-between text-xs">
                    <div>
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                        GPS Status
                      </div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className={`w-2 h-2 rounded-full ${cadence.dotClass}`} />
                        <span className="font-bold text-white">{cadence.statusText}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-slate-500 uppercase tracking-wider font-bold">
                        Cadence Window
                      </div>
                      <div className="font-mono text-indigo-400 font-bold mt-0.5">
                        Every {cadenceMins} min
                      </div>
                    </div>
                  </div>

                  {/* Ping Fresh GPS Fix Action Button */}
                  <button
                    type="button"
                    disabled={isPingingGPS}
                    onClick={handleAdminPingLocation}
                    className="w-full py-2 px-3 rounded-xl text-xs font-bold bg-indigo-600/30 hover:bg-indigo-600/50 text-indigo-300 border border-indigo-500/40 transition-all flex items-center justify-center gap-1.5 shadow-md shadow-indigo-500/10 disabled:opacity-50"
                    title="Send an on-demand live GPS ping to refresh position and update status to LIVE"
                  >
                    {isPingingGPS ? (
                      <>
                        <Activity className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                        <span>Pinging Live GPS Fix...</span>
                      </>
                    ) : (
                      <>
                        <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                        <span>Ping Fresh GPS Fix Now</span>
                      </>
                    )}
                  </button>
                </div>
              );
            })()}

            {/* Quick Details List */}
            <div className="space-y-1.5 text-xs text-slate-300 divide-y divide-slate-800/80">
              {selectedPin.phone && (
                <div className="pt-1.5 flex items-center justify-between">
                  <span className="text-slate-500">Phone:</span>
                  <a
                    href={`tel:${selectedPin.phone}`}
                    className="text-cyan-400 hover:underline font-mono font-bold flex items-center gap-1"
                  >
                    <Phone className="w-3 h-3" />
                    {selectedPin.phone}
                  </a>
                </div>
              )}

              {selectedPin.vehiclePlate && (
                <div className="pt-1.5 flex items-center justify-between">
                  <span className="text-slate-500">Assigned Vehicle:</span>
                  <span className="font-bold text-amber-400 font-mono">
                    🚛 {selectedPin.vehiclePlate}
                  </span>
                </div>
              )}

              {selectedPin.machineId && (
                <div className="pt-1.5 flex items-center justify-between">
                  <span className="text-slate-500">Assigned Machine:</span>
                  <span className="font-bold text-indigo-400">
                    ⚙ {selectedPin.machineId}
                  </span>
                </div>
              )}

              {selectedPin.customerName && (
                <div className="pt-1.5 flex items-center justify-between">
                  <span className="text-slate-500">Customer Site:</span>
                  <span className="font-medium text-slate-200">
                    {selectedPin.customerName}
                  </span>
                </div>
              )}

              {selectedPin.dispatchLocation && (
                <div className="pt-1.5 flex items-center justify-between">
                  <span className="text-slate-500">Location:</span>
                  <span className="font-bold text-slate-200">
                    📍 {selectedPin.dispatchLocation}
                  </span>
                </div>
              )}

              <div className="pt-1.5 flex items-center justify-between font-mono text-[11px] text-slate-400">
                <span>Coordinates:</span>
                <span>
                  {selectedPin.latitude.toFixed(4)}, {selectedPin.longitude.toFixed(4)}
                </span>
              </div>
            </div>

            {/* Person-to-Site Driving Route Section */}
            {activePersonSiteRoute ? (
              <div className="bg-blue-950/40 border border-blue-500/30 rounded-xl p-3 text-xs space-y-1.5">
                <div className="flex items-center justify-between text-blue-400 font-bold">
                  <span className="flex items-center gap-1">
                    <Route className="w-3.5 h-3.5" /> Route to Job Site:
                  </span>
                  <span className="font-mono text-emerald-400 font-black">
                    {roadSiteRoute && roadSiteRoute.empId === selectedPin.id
                      ? roadSiteRoute.distanceKm
                      : activePersonSiteRoute.distanceKm}{" "}
                    km
                    {roadSiteRoute && roadSiteRoute.empId === selectedPin.id && roadSiteRoute.durationMins > 0
                      ? ` (~${roadSiteRoute.durationMins}m)`
                      : ""}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-white font-semibold truncate max-w-[190px]">
                    📍 {activePersonSiteRoute.site.location}
                  </p>
                  {roadSiteRoute?.isRoadSnapped ? (
                    <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 font-mono">
                      Road Route
                    </span>
                  ) : isLoadingSiteRoute ? (
                    <span className="text-[10px] text-cyan-400 animate-pulse font-mono">
                      Routing roads...
                    </span>
                  ) : null}
                </div>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&origin=${selectedPin.latitude},${selectedPin.longitude}&destination=${activePersonSiteRoute.site.latitude},${activePersonSiteRoute.site.longitude}&travelmode=driving`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-1 w-full py-2 px-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/20"
                >
                  <Navigation className="w-3.5 h-3.5" /> Google Maps Turn-by-Turn Route
                </a>
              </div>
            ) : selectedPin.dispatchLocation ? (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-2.5 text-xs space-y-1">
                <span className="text-slate-400 font-bold">Assigned Site: {selectedPin.dispatchLocation}</span>
                <a
                  href={`https://www.google.com/maps/dir/?api=1&origin=${selectedPin.latitude},${selectedPin.longitude}&destination=${encodeURIComponent(selectedPin.dispatchLocation)}&travelmode=driving`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-1.5 px-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 mt-1"
                >
                  <Navigation className="w-3.5 h-3.5" /> Get Driving Directions
                </a>
              </div>
            ) : null}

            {/* Actions: Show Route / Center */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => toggleRoute(selectedPin.id)}
                className={`w-full py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  activeRouteEmpId === selectedPin.id
                    ? "bg-cyan-600 text-white shadow-md shadow-cyan-500/25"
                    : "bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700"
                }`}
              >
                <Route className="w-3.5 h-3.5" />
                {activeRouteEmpId === selectedPin.id ? "Hide Trail" : "GPS Trail"}
              </button>

              <button
                type="button"
                onClick={() =>
                  setMapCenter([selectedPin.latitude, selectedPin.longitude])
                }
                className="w-full py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors flex items-center justify-center gap-1.5"
              >
                <Navigation className="w-3.5 h-3.5" />
                Center Map
              </button>
            </div>

            <Link
              href={`/staff/operators/${selectedPin.id}`}
              className="w-full py-2 text-center text-xs text-indigo-400 hover:text-indigo-300 hover:underline block font-bold border border-slate-800 rounded-xl bg-slate-900/60 transition-colors"
            >
              View Full Operator Profile & Dispatches →
            </Link>
          </div>
        )}

        {/* ── MAP LEGEND OVERLAY ────────────────────────────────────────────── */}
        <div className="absolute bottom-4 left-4 z-[1000] bg-slate-950/90 backdrop-blur-md border border-slate-800 rounded-xl px-3.5 py-2.5 flex items-center gap-4 text-xs font-bold shadow-lg">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-blue-500 inline-block ring-2 ring-blue-500/30" />
            <span className="text-slate-300">Driver</span>
            <span className="text-[10px] text-slate-500 font-mono">(15m)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-orange-500 inline-block ring-2 ring-orange-500/30" />
            <span className="text-slate-300">Operator</span>
            <span className="text-[10px] text-slate-500 font-mono">(45m)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-purple-500 inline-block ring-2 ring-purple-500/30" />
            <span className="text-slate-300">Job Site</span>
          </div>
        </div>

        {/* Results Counter Badge */}
        <div className="absolute top-4 left-4 z-[1000] bg-slate-950/90 backdrop-blur-md border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-300 font-bold shadow-lg flex items-center gap-2">
          <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
          <span>
            Showing{" "}
            <strong className="text-white">
              {filteredEmployees.length + filteredSites.length}
            </strong>{" "}
            locations on map
          </span>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────────────
          4. FILTERED FIELD PERSONNEL TABLE / CARDS (SYNCHRONIZED WITH SEARCH)
      ───────────────────────────────────────────────────────────────────────────── */}
      {filteredEmployees.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
                📡 Field Personnel Directory — GPS Tracking Details
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Click any row or &quot;View Route&quot; to inspect live trajectory and breadcrumb checkpoints.
              </p>
            </div>
            <span className="text-xs text-indigo-400 font-bold bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-full font-mono">
              {filteredEmployees.length} active in field
            </span>
          </div>

          <div className="divide-y divide-slate-800/60 max-h-[420px] overflow-y-auto">
            {filteredEmployees.map((pin) => {
              const cadenceMins = pin.cadenceMinutes || (pin.role === "DRIVER" ? 15 : 45);
              const cadence = computeCadenceStatus(pin.lastUpdate, cadenceMins);
              const hasRoute = (routeTrails[pin.id]?.length || 0) > 0;
              const isRouteActive = activeRouteEmpId === pin.id;

              return (
                <div
                  key={pin.id}
                  className={`flex flex-col sm:flex-row sm:items-center justify-between px-5 py-3.5 transition-colors gap-3 ${
                    selectedPin?.id === pin.id
                      ? "bg-slate-800/80 border-l-4 border-indigo-500"
                      : "hover:bg-slate-800/40"
                  }`}
                >
                  {/* Left: Info */}
                  <div className="flex items-center gap-3">
                    <span
                      className={`text-[10px] font-black px-2.5 py-1 rounded-lg shrink-0 ${
                        pin.role === "DRIVER"
                          ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30"
                          : "bg-orange-500/20 text-orange-300 border border-orange-500/30"
                      }`}
                    >
                      {pin.role}
                    </span>

                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold text-sm">
                          {pin.name}
                        </span>
                        {pin.phone && (
                          <a
                            href={`tel:${pin.phone}`}
                            className="text-xs text-slate-400 hover:text-cyan-400 font-mono"
                          >
                            📞 {pin.phone}
                          </a>
                        )}
                      </div>

                      <div className="flex items-center gap-2 flex-wrap text-xs text-slate-400 mt-0.5">
                        {pin.dispatchLocation && (
                          <span className="text-slate-300 font-medium">
                            📍 {pin.dispatchLocation}
                          </span>
                        )}
                        {pin.customerName && <span>· @ {pin.customerName}</span>}
                        {pin.vehiclePlate && (
                          <span className="text-amber-400 font-mono font-bold bg-amber-500/10 px-1.5 py-0.2 rounded">
                            🚛 {pin.vehiclePlate}
                          </span>
                        )}
                        {pin.machineId && (
                          <span className="text-indigo-400 font-medium">
                            ⚙ {pin.machineId}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Cadence Status & Action Buttons */}
                  <div className="flex items-center gap-3 self-end sm:self-center">
                    {/* Cadence Badge */}
                    <div className="text-right">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded border inline-block ${cadence.badgeClass}`}
                      >
                        {cadence.statusText}
                      </span>
                      <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                        Cadence: Every {cadenceMins}m
                      </div>
                    </div>

                    {/* Action: Route Button */}
                    {hasRoute && (
                      <button
                        type="button"
                        onClick={() => {
                          handleSelectEmployee(pin, true);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                          isRouteActive
                            ? "bg-cyan-600 text-white shadow-md shadow-cyan-500/20"
                            : "bg-slate-800 hover:bg-slate-700 text-cyan-400 border border-slate-700"
                        }`}
                        title="Display full GPS trajectory and checkpoints on map"
                      >
                        <Route className="w-3.5 h-3.5" />
                        {isRouteActive ? "Route Active" : "View Route"}
                      </button>
                    )}

                    {/* Action: Locate on Map Button */}
                    <button
                      type="button"
                      onClick={() => handleSelectEmployee(pin, false)}
                      className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition-colors flex items-center gap-1"
                      title="Fly map to person"
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      Locate
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
