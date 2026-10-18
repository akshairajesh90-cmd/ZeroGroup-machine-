"use client";

import React, { useState, useEffect, useTransition, useMemo } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import Link from "next/link";
import {
  RefreshCw,
  MapPin,
  Truck,
  Wrench,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Hammer,
  HardHat,
  ExternalLink,
  Navigation,
  Phone,
} from "lucide-react";
import DateRangeFilterBar from "@/components/live/DateRangeFilterBar";
import MultiEntitySearchBar, {
  MultiSearchFilters,
  EntityCategory,
  EntityCounts,
} from "@/components/live/MultiEntitySearchBar";
import PersonRouteModal, {
  RoutePerson,
  RouteDestination,
} from "@/components/live/PersonRouteModal";

// Dynamic import for Leaflet map to prevent SSR issues with 'window'
const LiveMap = dynamic(() => import("@/components/LiveMap"), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-[500px] bg-slate-900/50 rounded-3xl border border-slate-800 animate-pulse flex items-center justify-center">
      <MapPin className="w-8 h-8 text-slate-700" />
    </div>
  )
});

interface DeployedSite {
  location: string;
  dispatches: any[];
}

interface LiveOperationsClientProps {
  deployedSites: DeployedSite[];
  idleMachines: any[];
  idleEmployees: any[];
  idleTools: any[];
  idleVehicles: any[];
  currentView?: "today" | "yesterday" | "tomorrow" | "week" | "all" | "custom";
  selectedDateStr?: string;
  dateLabel?: string;
  totalDispatchesCount?: number;
  basePath?: string;
}

export default function LiveOperationsClient({ 
  deployedSites, 
  idleMachines, 
  idleEmployees, 
  idleTools,
  idleVehicles,
  currentView = "today",
  selectedDateStr,
  dateLabel = "Today",
  totalDispatchesCount,
  basePath = "/staff/live",
}: LiveOperationsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Multi-Entity Search & Filter State
  const [filters, setFilters] = useState<MultiSearchFilters>({
    activeCategory: "ALL",
    generalQuery: "",
    vehicleQuery: "",
    machineQuery: "",
    toolQuery: "",
    driverQuery: "",
    operatorQuery: "",
    siteQuery: "",
  });

  // Selected Route Modal State
  const [routeModalData, setRouteModalData] = useState<{
    person: RoutePerson;
    destination?: RouteDestination | null;
  } | null>(null);

  // Map camera focus state
  const [focusCoords, setFocusCoords] = useState<[number, number] | null>(null);
  const [routeDestCoords, setRouteDestCoords] = useState<[number, number] | null>(null);

  // Auto-refresh radar every 30s to pick up live worker pings & route updates
  useEffect(() => {
    const timer = setInterval(() => {
      startTransition(() => {
        router.refresh();
      });
    }, 30000);
    return () => clearInterval(timer);
  }, [router]);

  const handleRefresh = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  // Helper to open Route Modal
  const openRouteModal = (person: any, destination?: any) => {
    setRouteModalData({
      person: {
        id: person.id,
        name: person.name,
        role: person.role,
        phone: person.phone,
        profilePhotoUrl: person.profilePhotoUrl,
        operatorType: person.operatorType,
        lastLatitude: person.lastLatitude ? Number(person.lastLatitude) : null,
        lastLongitude: person.lastLongitude ? Number(person.lastLongitude) : null,
        lastLocationUpdate: person.lastLocationUpdate,
      },
      destination: destination
        ? {
            location: destination.location,
            latitude: destination.latitude ? Number(destination.latitude) : null,
            longitude: destination.longitude ? Number(destination.longitude) : null,
            customerName: destination.customerName || destination.customer?.name,
            dispatchStatus: destination.dispatchStatus || destination.status,
            machineName: destination.machineName,
          }
        : null,
    });
  };

  // ─── CONJUNCTIVE FILTERING ENGINE ──────────────────────────────────────────
  const { filteredSites, filteredVehicles, filteredMachines, filteredTools, filteredEmployees, counts } = useMemo(() => {
    const gq = filters.generalQuery.trim().toLowerCase();
    const vq = filters.vehicleQuery.trim().toLowerCase();
    const mq = filters.machineQuery.trim().toLowerCase();
    const tq = filters.toolQuery.trim().toLowerCase();
    const dq = filters.driverQuery.trim().toLowerCase();
    const oq = filters.operatorQuery.trim().toLowerCase();
    const sq = filters.siteQuery.trim().toLowerCase();
    const cat = filters.activeCategory;

    // 1. Filter Deployed Sites & Dispatches
    const matchingSites: DeployedSite[] = [];
    let deployedVehiclesCount = 0;
    let deployedMachinesCount = 0;
    let deployedToolsCount = 0;
    let deployedDriversCount = 0;
    let deployedOperatorsCount = 0;

    deployedSites.forEach((site) => {
      const siteLocLower = site.location.toLowerCase();

      // Check site query filter
      if (sq && !siteLocLower.includes(sq)) {
        return;
      }

      const matchingDispatches = site.dispatches.filter((d) => {
        // Category exclusivity
        if (cat === "VEHICLES" && !d.assignedVehicle && !d.driverId) return false;
        if (cat === "MACHINES" && !d.machine && (!d.dispatchAssets || d.dispatchAssets.length === 0)) return false;
        if (cat === "TOOLS" && (!d.dispatchTools || d.dispatchTools.length === 0)) return false;
        if (cat === "DRIVERS" && !d.driver) return false;
        if (cat === "OPERATORS" && !d.operator && (!d.crewAssignments || d.crewAssignments.length === 0)) return false;

        // Discrete Conjunctive AND filters
        if (vq) {
          const matchVeh =
            d.assignedVehicle?.licensePlate?.toLowerCase().includes(vq) ||
            d.assignedVehicle?.type?.toLowerCase().includes(vq);
          if (!matchVeh) return false;
        }

        if (mq) {
          const matchMach =
            d.machine?.machineId?.toLowerCase().includes(mq) ||
            d.machine?.type?.toLowerCase().includes(mq) ||
            d.dispatchAssets?.some((da: any) =>
              da.machine?.machineId?.toLowerCase().includes(mq) || da.machine?.type?.toLowerCase().includes(mq)
            );
          if (!matchMach) return false;
        }

        if (tq) {
          const matchTool = d.dispatchTools?.some((dt: any) =>
            dt.tool?.name?.toLowerCase().includes(tq) || dt.tool?.toolId?.toLowerCase().includes(tq)
          );
          if (!matchTool) return false;
        }

        if (dq) {
          const matchDrv =
            d.driver?.name?.toLowerCase().includes(dq) ||
            (d.driver?.phone && d.driver.phone.includes(dq));
          if (!matchDrv) return false;
        }

        if (oq) {
          const matchOp =
            d.operator?.name?.toLowerCase().includes(oq) ||
            d.crewAssignments?.some((ca: any) =>
              ca.employee?.name?.toLowerCase().includes(oq) || ca.assignedRole?.toLowerCase().includes(oq)
            ) ||
            d.dispatchLabor?.some((dl: any) =>
              dl.employee?.name?.toLowerCase().includes(oq) || dl.externalWorkerName?.toLowerCase().includes(oq)
            );
          if (!matchOp) return false;
        }

        // Universal general query
        if (gq) {
          const matchGeneral =
            siteLocLower.includes(gq) ||
            d.customer?.name?.toLowerCase().includes(gq) ||
            d.status?.toLowerCase().includes(gq) ||
            d.siteBundleId?.toLowerCase().includes(gq) ||
            d.machine?.machineId?.toLowerCase().includes(gq) ||
            d.machine?.type?.toLowerCase().includes(gq) ||
            d.operator?.name?.toLowerCase().includes(gq) ||
            d.driver?.name?.toLowerCase().includes(gq) ||
            d.assignedVehicle?.licensePlate?.toLowerCase().includes(gq) ||
            d.crewAssignments?.some((ca: any) => ca.employee?.name?.toLowerCase().includes(gq)) ||
            d.dispatchTools?.some((dt: any) => dt.tool?.name?.toLowerCase().includes(gq));
          if (!matchGeneral) return false;
        }

        // Increment counts
        if (d.assignedVehicle) deployedVehiclesCount++;
        if (d.machine || d.dispatchAssets?.length > 0) deployedMachinesCount++;
        if (d.dispatchTools?.length > 0) deployedToolsCount += d.dispatchTools.length;
        if (d.driver) deployedDriversCount++;
        if (d.operator || d.crewAssignments?.length > 0) deployedOperatorsCount++;

        return true;
      });

      if (matchingDispatches.length > 0) {
        matchingSites.push({ ...site, dispatches: matchingDispatches });
      }
    });

    // 2. Filter Idle Yard Assets
    const hideNonVehicle = mq || tq || dq || oq || sq || (cat !== "ALL" && cat !== "VEHICLES");
    const matchedVehicles = hideNonVehicle
      ? []
      : idleVehicles.filter((v) => {
          const matchPlate = v.licensePlate?.toLowerCase().includes(vq || gq) || v.type?.toLowerCase().includes(vq || gq);
          return vq || gq ? matchPlate : true;
        });

    const hideNonMachine = vq || tq || dq || oq || sq || (cat !== "ALL" && cat !== "MACHINES");
    const matchedMachines = hideNonMachine
      ? []
      : idleMachines.filter((m) => {
          const matchId = m.machineId?.toLowerCase().includes(mq || gq) || m.type?.toLowerCase().includes(mq || gq);
          return mq || gq ? matchId : true;
        });

    const hideNonTool = vq || mq || dq || oq || sq || (cat !== "ALL" && cat !== "TOOLS");
    const matchedTools = hideNonTool
      ? []
      : idleTools.filter((t) => {
          const matchT = t.name?.toLowerCase().includes(tq || gq) || t.toolId?.toLowerCase().includes(tq || gq);
          return tq || gq ? matchT : true;
        });

    const hideNonEmployee = vq || mq || tq || sq || (cat !== "ALL" && cat !== "DRIVERS" && cat !== "OPERATORS");
    const matchedEmployees = hideNonEmployee
      ? []
      : idleEmployees.filter((e) => {
          if (cat === "DRIVERS" && e.role !== "DRIVER") return false;
          if (cat === "OPERATORS" && e.role !== "OPERATOR" && e.role !== "WORKER") return false;

          const query = dq || oq || gq;
          if (!query) return true;
          return (
            e.name.toLowerCase().includes(query) ||
            e.role.toLowerCase().includes(query) ||
            (e.phone && e.phone.includes(query)) ||
            (e.defaultCrewRole && e.defaultCrewRole.toLowerCase().includes(query))
          );
        });

    const countsObj: EntityCounts = {
      sites: matchingSites.length,
      machines: deployedMachinesCount + matchedMachines.length,
      tools: deployedToolsCount + matchedTools.length,
      drivers: deployedDriversCount + matchedEmployees.filter((e) => e.role === "DRIVER").length,
      operators: deployedOperatorsCount + matchedEmployees.filter((e) => e.role !== "DRIVER").length,
      vehicles: deployedVehiclesCount + matchedVehicles.length,
    };

    return {
      filteredSites: matchingSites,
      filteredVehicles: matchedVehicles,
      filteredMachines: matchedMachines,
      filteredTools: matchedTools,
      filteredEmployees: matchedEmployees,
      counts: countsObj,
    };
  }, [filters, deployedSites, idleVehicles, idleMachines, idleTools, idleEmployees]);

  return (
    <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <MapPin className="w-8 h-8 text-indigo-400" />
            Live Operations Command Center
          </h1>
          <p className="text-slate-400 mt-2 text-sm font-medium">
            Real-time logical tracking of all deployed assets, chain operations, and personnel routes.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isPending}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all disabled:opacity-50 shadow-lg shadow-indigo-500/20"
        >
          <RefreshCw className={`w-5 h-5 ${isPending ? "animate-spin" : ""}`} />
          Refresh Radar
        </button>
      </div>

      {/* TIME HORIZON & DATE RANGE FILTER BAR */}
      <DateRangeFilterBar
        currentView={currentView}
        selectedDateStr={selectedDateStr}
        dateLabel={dateLabel}
        totalDispatchesCount={totalDispatchesCount ?? deployedSites.reduce((acc, s) => acc + s.dispatches.length, 0)}
        totalSitesCount={deployedSites.length}
        basePath={basePath}
      />

      {/* SEPARATE MULTI-ENTITY SEARCH CONTROL BAR */}
      <MultiEntitySearchBar
        filters={filters}
        onChange={setFilters}
        counts={counts}
      />

      {/* INTERACTIVE RADAR MAP WITH ROUTES */}
      <div className="w-full mb-8">
        <LiveMap
          sites={filteredSites}
          focusCoords={focusCoords}
          routeDestCoords={routeDestCoords}
          onSelectPerson={(p, d) => openRouteModal(p, d)}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* ZONE 1: ACTIVE SITES (Deployed Chain Operations) */}
        <div className="xl:col-span-2 space-y-6">
          <h2 className="text-xl font-bold text-white flex items-center justify-between">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              Active Chain Operations ({filteredSites.length})
            </span>
            {filteredSites.length !== deployedSites.length && (
              <span className="text-xs text-slate-500 font-normal">
                (Filtered from {deployedSites.length} total)
              </span>
            )}
          </h2>
          
          {filteredSites.length === 0 ? (
            <div className="bg-slate-900/50 border border-slate-800 rounded-3xl p-12 text-center text-slate-500 space-y-3">
              <MapPin className="w-10 h-10 mx-auto text-slate-600" />
              <p className="font-bold text-slate-300">No active operations match current search filters.</p>
              <button
                type="button"
                onClick={() =>
                  setFilters({
                    activeCategory: "ALL",
                    generalQuery: "",
                    vehicleQuery: "",
                    machineQuery: "",
                    toolQuery: "",
                    driverQuery: "",
                    operatorQuery: "",
                    siteQuery: "",
                  })
                }
                className="text-xs text-indigo-400 hover:underline font-bold"
              >
                Reset All Filters
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              {filteredSites.map((site, idx) => (
                <div key={idx} className="bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-3xl p-6 shadow-xl relative overflow-hidden group hover:border-slate-600 transition-all">
                  <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
                    <h3 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-emerald-400 shrink-0" />
                      {site.location}
                    </h3>
                    <a
                      href={`https://www.google.com/maps?q=${encodeURIComponent(site.location)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-slate-400 hover:text-emerald-400 flex items-center gap-1 font-semibold transition-colors"
                    >
                      Map View <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  
                  <div className="space-y-6">
                    {site.dispatches.map((d, dIdx) => {
                      const isPendingVehicle = d.driverId && !d.assignedVehicle;
                      
                      return (
                        <div key={dIdx} className="space-y-3">
                          <div className="flex items-center gap-3">
                            <span className={`text-xs font-bold px-3 py-1.5 rounded-lg ${
                              d.status === 'PENDING' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/20' : 
                              d.status === 'EN_ROUTE' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/20' : 
                              'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                            }`}>
                              {d.status.replace("_", " ")}
                            </span>
                            {d.siteBundleId && (
                              <span className="text-xs font-semibold text-slate-400 px-2 py-1 rounded bg-slate-800 border border-slate-700">
                                Bundle: {d.siteBundleId}
                              </span>
                            )}
                          </div>
                          
                          {/* CHAIN OPERATION UI */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            
                            {/* 1. TRANSPORT & DRIVER */}
                            <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800/80 flex flex-col justify-between">
                              <div>
                                <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                  <Truck className="w-3.5 h-3.5" /> Transport
                                </h4>
                                {d.driver ? (
                                  <div className="space-y-2">
                                    <div className="flex items-center justify-between gap-2">
                                      <div className="flex items-center gap-2 min-w-0">
                                        <div className="w-6 h-6 rounded-md bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold shrink-0">
                                          {d.driver.name.charAt(0)}
                                        </div>
                                        <Link
                                          href={`/staff/operators/${d.driver.id}`}
                                          className="text-sm font-semibold text-white hover:text-indigo-400 hover:underline truncate"
                                        >
                                          {d.driver.name}
                                        </Link>
                                      </div>

                                      {/* Person Route Button */}
                                      <button
                                        type="button"
                                        onClick={() =>
                                          openRouteModal(d.driver, {
                                            location: site.location,
                                            latitude: d.latitude,
                                            longitude: d.longitude,
                                            customerName: d.customer?.name,
                                            dispatchStatus: d.status,
                                            machineName: d.machine?.machineId,
                                          })
                                        }
                                        className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500 hover:text-white transition-all shrink-0"
                                        title="View Driver Route to Site"
                                      >
                                        <Navigation className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                    
                                    {d.assignedVehicle ? (
                                      <div className="text-xs font-medium text-slate-400 flex items-center gap-1.5">
                                        <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                        {d.assignedVehicle.licensePlate} ({d.assignedVehicle.type})
                                      </div>
                                    ) : isPendingVehicle ? (
                                      <div className="text-xs font-bold text-amber-400 flex items-center gap-1 bg-amber-500/10 px-2 py-1 rounded-md border border-amber-500/20 w-fit">
                                        <AlertTriangle className="w-3 h-3" />
                                        Vehicle Pending
                                      </div>
                                    ) : (
                                      <div className="text-xs text-slate-500">No Vehicle Assigned</div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="text-xs text-slate-500 italic">External / No Transport</div>
                                )}
                              </div>
                            </div>

                            {/* 2. CARGO (Machines + Tools) */}
                            <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800/80">
                              <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                <Wrench className="w-3.5 h-3.5" /> Cargo
                              </h4>
                              
                              <div className="space-y-3">
                                {d.machine && (
                                  <div className="text-sm font-semibold text-white flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                    {d.machine.id ? (
                                      <Link
                                        href={`/staff/fleet/machine/${d.machine.id}`}
                                        className="hover:text-emerald-400 hover:underline"
                                      >
                                        {d.machine.machineId}
                                      </Link>
                                    ) : (
                                      d.machine.machineId
                                    )}
                                    <span className="text-xs text-slate-500 font-normal">({d.machine.type})</span>
                                  </div>
                                )}
                                {d.dispatchAssets?.map((da: any) => (
                                  <div key={da.id} className="text-sm font-semibold text-white flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                    {da.machine?.id ? (
                                      <Link
                                        href={`/staff/fleet/machine/${da.machine.id}`}
                                        className="hover:text-emerald-400 hover:underline"
                                      >
                                        {da.machine.machineId}
                                      </Link>
                                    ) : (
                                      da.machine?.machineId
                                    )}
                                    <span className="text-xs text-slate-500 font-normal">({da.machine?.type})</span>
                                  </div>
                                ))}

                                {d.dispatchTools?.length > 0 && (
                                  <div className="pt-2 border-t border-slate-800/50 mt-2 space-y-1">
                                    {d.dispatchTools.map((dt: any) => (
                                      <div key={dt.id} className="text-xs text-slate-300 flex items-center gap-2">
                                        <Hammer className="w-3 h-3 text-slate-500" />
                                        {dt.quantity}x {dt.tool?.name} {dt.variant ? `(${dt.variant})` : ''}
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {!d.machine && (!d.dispatchAssets || d.dispatchAssets.length === 0) && (!d.dispatchTools || d.dispatchTools.length === 0) && (
                                  <div className="text-xs text-slate-500 italic">No cargo assigned</div>
                                )}
                              </div>
                            </div>

                            {/* 3. OPERATIONS (Operators & Crew) */}
                            <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800/80">
                              <h4 className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                <Users className="w-3.5 h-3.5" /> Operations
                              </h4>
                              
                              <div className="space-y-2.5">
                                {/* Primary Operator */}
                                {d.operator && (
                                  <div className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <div className="w-6 h-6 rounded-md bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold shrink-0">
                                        <HardHat className="w-3.5 h-3.5" />
                                      </div>
                                      <Link
                                        href={`/staff/operators/${d.operator.id}`}
                                        className="text-sm font-semibold text-white hover:text-amber-400 hover:underline truncate"
                                      >
                                        {d.operator.name}
                                      </Link>
                                      <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 rounded">OP</span>
                                    </div>

                                    {/* Route Action Button */}
                                    <button
                                      type="button"
                                      onClick={() =>
                                        openRouteModal(d.operator, {
                                          location: site.location,
                                          latitude: d.latitude,
                                          longitude: d.longitude,
                                          customerName: d.customer?.name,
                                          dispatchStatus: d.status,
                                          machineName: d.machine?.machineId,
                                        })
                                      }
                                      className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500 hover:text-white transition-all shrink-0"
                                      title="View Operator Route to Site"
                                    >
                                      <Navigation className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}

                                {/* Multi-Role Crew Assignments */}
                                {d.crewAssignments?.map((mo: any) => (
                                  <div key={mo.id} className="flex items-center justify-between gap-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                      <div className="w-6 h-6 rounded-md bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold shrink-0">
                                        <HardHat className="w-3.5 h-3.5" />
                                      </div>
                                      {mo.employee?.id ? (
                                        <Link
                                          href={`/staff/operators/${mo.employee.id}`}
                                          className="text-sm font-semibold text-white hover:text-amber-400 hover:underline truncate"
                                        >
                                          {mo.employee.name}
                                        </Link>
                                      ) : (
                                        <span className="text-sm font-semibold text-white truncate">
                                          {mo.employee ? mo.employee.name : mo.externalName}
                                        </span>
                                      )}
                                      <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 rounded">
                                        {mo.assignedRole || "CREW"}
                                      </span>
                                    </div>

                                    {mo.employee && (
                                      <button
                                        type="button"
                                        onClick={() =>
                                          openRouteModal(mo.employee, {
                                            location: site.location,
                                            latitude: d.latitude,
                                            longitude: d.longitude,
                                            customerName: d.customer?.name,
                                            dispatchStatus: d.status,
                                          })
                                        }
                                        className="p-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500 hover:text-white transition-all shrink-0"
                                        title="View Crew Route to Site"
                                      >
                                        <Navigation className="w-3.5 h-3.5" />
                                      </button>
                                    )}
                                  </div>
                                ))}

                                {/* Labor / Helpers */}
                                {d.dispatchLabor?.length > 0 && (
                                  <div className="pt-2 border-t border-slate-800/50 mt-2 space-y-1">
                                    {d.dispatchLabor.map((dl: any) => (
                                      <div key={dl.id} className="text-xs text-slate-300 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                          <Users className="w-3 h-3 text-slate-500" />
                                          <span className="font-semibold">{dl.employee ? dl.employee.name : dl.externalWorkerName}</span>
                                          <span className="text-slate-500">+{dl.helperCount}</span>
                                        </div>
                                        {dl.employee && (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              openRouteModal(dl.employee, {
                                                location: site.location,
                                                latitude: d.latitude,
                                                longitude: d.longitude,
                                                customerName: d.customer?.name,
                                                dispatchStatus: d.status,
                                              })
                                            }
                                            className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white"
                                          >
                                            <Navigation className="w-3 h-3" />
                                          </button>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {!d.operator && (!d.crewAssignments || d.crewAssignments.length === 0) && (!d.dispatchLabor || d.dispatchLabor.length === 0) && (
                                  <div className="text-xs text-slate-500 italic">No operators assigned</div>
                                )}
                              </div>
                            </div>

                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ZONE 2: THE YARD (Idle Assets) */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-400" />
            The Yard (Idle Inventory)
          </h2>

          <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-3xl p-5 shadow-xl space-y-6">
            
            {/* IDLE VEHICLES */}
            <div>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-800 pb-2 flex items-center justify-between">
                <span className="flex items-center gap-2"><Truck className="w-4 h-4 text-blue-400" /> Available Vehicles</span>
                <span className="text-slate-500 font-mono">({filteredVehicles.length})</span>
              </h3>
              {filteredVehicles.length === 0 ? (
                <p className="text-slate-600 text-xs italic">No matching idle vehicles.</p>
              ) : (
                <ul className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {filteredVehicles.map((v, i) => (
                    <li key={i} className="flex justify-between items-center text-xs bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60 hover:border-slate-700 transition-colors">
                      <span className="text-white font-bold">{v.licensePlate}</span>
                      <span className="text-slate-500">{v.type}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* IDLE MACHINES */}
            <div>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-800 pb-2 flex items-center justify-between">
                <span className="flex items-center gap-2"><Wrench className="w-4 h-4 text-emerald-400" /> Available Machines</span>
                <span className="text-slate-500 font-mono">({filteredMachines.length})</span>
              </h3>
              {filteredMachines.length === 0 ? (
                <p className="text-slate-600 text-xs italic">No matching idle machines.</p>
              ) : (
                <ul className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {filteredMachines.map((m, i) => (
                    <li key={i} className="flex justify-between items-center text-xs bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60 hover:border-slate-700 transition-colors">
                      <Link
                        href={`/staff/fleet/machine/${m.id}`}
                        className="text-white font-bold hover:text-emerald-400 hover:underline"
                      >
                        {m.machineId}
                      </Link>
                      <span className="text-slate-500">{m.type}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* IDLE TOOLS */}
            <div>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-800 pb-2 flex items-center justify-between">
                <span className="flex items-center gap-2"><Hammer className="w-4 h-4 text-violet-400" /> Available Tools</span>
                <span className="text-slate-500 font-mono">({filteredTools.length})</span>
              </h3>
              {filteredTools.length === 0 ? (
                <p className="text-slate-600 text-xs italic">No matching idle tools.</p>
              ) : (
                <ul className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                  {filteredTools.map((t, i) => (
                    <li key={i} className="flex justify-between items-center text-xs bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60">
                      <span className="text-white font-bold">{t.name}</span>
                      <span className="text-slate-500">{t.toolId}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* IDLE CREW */}
            <div>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-800 pb-2 flex items-center justify-between">
                <span className="flex items-center gap-2"><Users className="w-4 h-4 text-amber-400" /> Available Personnel</span>
                <span className="text-slate-500 font-mono">({filteredEmployees.length})</span>
              </h3>
              {filteredEmployees.length === 0 ? (
                <p className="text-slate-600 text-xs italic">No matching idle personnel.</p>
              ) : (
                <ul className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {filteredEmployees.map((e, i) => (
                    <li key={i} className="flex justify-between items-center text-xs bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60 hover:border-slate-700 transition-colors">
                      <div className="flex items-center gap-2 min-w-0">
                        <Link
                          href={`/staff/operators/${e.id}`}
                          className="text-white font-bold truncate max-w-[140px] hover:text-blue-400 hover:underline flex items-center gap-1"
                        >
                          {e.name}
                        </Link>
                        <span className="text-slate-400 px-1.5 py-0.5 bg-slate-800 rounded font-medium text-[10px]">
                          {e.role}
                        </span>
                      </div>

                      {/* Route trigger for idle employee */}
                      <button
                        type="button"
                        onClick={() => openRouteModal(e)}
                        className="p-1 rounded bg-slate-800/80 text-slate-400 hover:text-white"
                        title="View Location & Route"
                      >
                        <Navigation className="w-3 h-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

          </div>
        </div>

      </div>

      {/* PERSON ROUTE MODAL */}
      {routeModalData && (
        <PersonRouteModal
          person={routeModalData.person}
          destination={routeModalData.destination}
          onClose={() => setRouteModalData(null)}
          onFocusMap={(workerCoords, destCoords) => {
            setFocusCoords(workerCoords);
            setRouteDestCoords(destCoords || null);
            // Smooth scroll up to map
            window.scrollTo({ top: 100, behavior: "smooth" });
          }}
        />
      )}

    </div>
  );
}
