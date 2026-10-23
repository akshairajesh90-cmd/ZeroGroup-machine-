"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
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
  ArrowLeft
} from "lucide-react";
import { updateDispatchStatus } from "@/actions/dispatch";

export interface TransitDispatch {
  id: string;
  customerName: string;
  customerPhone: string | null;
  location: string;
  mapLink: string | null;
  status: string;
  workType: string;
  machineId: string | null;
  machineType: string | null;
  liftId: string | null;
  liftType: string | null;
  vehiclePlate: string | null;
  vehicleType: string | null;
  driverName: string | null;
  driverPhone: string | null;
  operatorName: string | null;
  operatorPhone: string | null;
  operatorType: string;
  operatorRate: number | null;
  tools: { id: string; name: string; quantity: number }[];
  dateOfService: string;
}

interface Props {
  dispatches: TransitDispatch[];
}

export default function StaffLiveTransitClient({ dispatches: initialDispatches }: Props) {
  const [dispatches, setDispatches] = useState(initialDispatches);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [isPending, startTransition] = useTransition();
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Map status to a 4-stage store-to-site pipeline
  const getStageNumber = (status: string) => {
    switch (status) {
      case "PENDING":
      case "ACCEPTED":
        return 1; // Loaded at store
      case "EN_ROUTE":
        return 2; // En route from store to site
      case "IN_PROGRESS":
        return 3; // Active on site (pouring)
      case "DELIVERED":
      case "COMPLETED":
      case "PICKED_UP":
        return 4; // Completed / returning to store
      default:
        return 1;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
      case "ACCEPTED":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">🏬 Loaded at Store</span>;
      case "EN_ROUTE":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">🚚 En Route to Site</span>;
      case "IN_PROGRESS":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">🏗️ On Site (Pouring)</span>;
      case "DELIVERED":
      case "COMPLETED":
      case "PICKED_UP":
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">🔄 Completed / Returning</span>;
      default:
        return <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-800 text-slate-300">{status}</span>;
    }
  };

  const handleAdvanceStatus = async (dispatchId: string, nextStatus: string) => {
    setUpdatingId(dispatchId);
    startTransition(async () => {
      const res = await updateDispatchStatus({
        dispatchId,
        status: nextStatus,
        reason: "Advanced stage via Staff Transit Board"
      });
      if (res?.success) {
        setDispatches(prev => prev.map(d => d.id === dispatchId ? { ...d, status: nextStatus } : d));
      } else {
        alert(res?.error || "Failed to update status");
      }
      setUpdatingId(null);
    });
  };

  // Filter & Search logic
  const filteredDispatches = dispatches.filter(d => {
    const term = searchTerm.toLowerCase();
    const matchesSearch =
      d.customerName.toLowerCase().includes(term) ||
      d.location.toLowerCase().includes(term) ||
      (d.machineId && d.machineId.toLowerCase().includes(term)) ||
      (d.driverName && d.driverName.toLowerCase().includes(term)) ||
      (d.operatorName && d.operatorName.toLowerCase().includes(term)) ||
      (d.vehiclePlate && d.vehiclePlate.toLowerCase().includes(term)) ||
      d.tools.some(t => t.name.toLowerCase().includes(term));

    const matchesStatus =
      statusFilter === "ALL"
        ? true
        : statusFilter === "STORE"
        ? (d.status === "PENDING" || d.status === "ACCEPTED")
        : statusFilter === "EN_ROUTE"
        ? d.status === "EN_ROUTE"
        : statusFilter === "ON_SITE"
        ? d.status === "IN_PROGRESS"
        : statusFilter === "RETURNING"
        ? (d.status === "DELIVERED" || d.status === "COMPLETED" || d.status === "PICKED_UP")
        : true;

    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <Link
              href="/staff/dashboard"
              className="p-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
              Live Operations
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <Truck className="w-8 h-8 text-emerald-400" />
            Site Deployments & Transit Board
          </h1>
          <p className="text-slate-400 mt-1 text-sm font-medium">
            Operational tracker: customer site, loaded tools, machinery, driver, operator, and store-to-site route stages.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/admin/live/map"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-indigo-400 border border-indigo-500/30 text-xs font-bold transition-all shadow"
            title="Admin Live GPS Satellite Route Telemetry"
          >
            <MapPin className="w-3.5 h-3.5 text-indigo-400" />
            <span>Admin GPS Telemetry →</span>
          </Link>
        </div>
      </div>

      {/* SEARCH AND FILTER BAR */}
      <div className="flex flex-col md:flex-row gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by customer, site location, machine, driver, operator, or tool..."
            className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto bg-slate-900/90 p-1.5 rounded-2xl border border-slate-800 text-xs font-semibold custom-scrollbar">
          <button
            onClick={() => setStatusFilter("ALL")}
            className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
              statusFilter === "ALL" ? "bg-emerald-600 text-white font-bold shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            All Jobs ({dispatches.length})
          </button>
          <button
            onClick={() => setStatusFilter("STORE")}
            className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
              statusFilter === "STORE" ? "bg-amber-600 text-white font-bold shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            🏬 In Store
          </button>
          <button
            onClick={() => setStatusFilter("EN_ROUTE")}
            className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
              statusFilter === "EN_ROUTE" ? "bg-cyan-600 text-white font-bold shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            🚚 En Route
          </button>
          <button
            onClick={() => setStatusFilter("ON_SITE")}
            className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
              statusFilter === "ON_SITE" ? "bg-emerald-600 text-white font-bold shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            🏗️ On Site
          </button>
          <button
            onClick={() => setStatusFilter("RETURNING")}
            className={`px-3 py-1.5 rounded-xl transition-all whitespace-nowrap ${
              statusFilter === "RETURNING" ? "bg-indigo-600 text-white font-bold shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            🔄 Returning
          </button>
        </div>
      </div>

      {/* DISPATCH TRANSIT CARDS */}
      {filteredDispatches.length === 0 ? (
        <div className="py-20 text-center bg-slate-900/40 rounded-3xl border border-slate-800 text-slate-500">
          <Truck className="w-12 h-12 mx-auto text-slate-600 mb-3" />
          <p className="font-semibold text-slate-300">No matching active dispatches found</p>
          <p className="text-xs text-slate-500 mt-1">Try clearing your search terms or filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredDispatches.map((job) => {
            const stage = getStageNumber(job.status);
            const isUpdating = updatingId === job.id && isPending;

            return (
              <div
                key={job.id}
                className="bg-slate-900/85 backdrop-blur-md border border-slate-800 hover:border-slate-700 rounded-3xl p-6 shadow-xl transition-all flex flex-col justify-between"
              >
                <div>
                  {/* Top Bar: Customer & Status */}
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div>
                      <h2 className="text-xl font-black text-white">{job.customerName}</h2>
                      <div className="flex items-center gap-2 mt-1 text-xs text-slate-400">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="truncate max-w-[260px]">{job.location}</span>
                        {job.mapLink && (
                          <a
                            href={job.mapLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-400 hover:text-emerald-300 font-bold inline-flex items-center gap-1"
                          >
                            Map <ExternalLink className="w-3 h-3" />
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      {getStatusBadge(job.status)}
                      <p className="text-[10px] text-slate-500 mt-1 font-mono">Job #{job.id.slice(-6)}</p>
                    </div>
                  </div>

                  {/* 4-STAGE STORE-TO-SITE ROUTE PIPELINE */}
                  <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800/80 mb-5">
                    <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider mb-3">
                      Route Pipeline from Store
                    </p>

                    <div className="grid grid-cols-4 gap-2 text-center text-xs">
                      {/* Stage 1 */}
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center font-bold mb-1.5 transition-colors ${
                            stage >= 1
                              ? "bg-emerald-500 text-slate-950 shadow-lg shadow-emerald-500/20"
                              : "bg-slate-800 text-slate-500"
                          }`}
                        >
                          1
                        </div>
                        <span className={`text-[10px] font-bold ${stage >= 1 ? "text-emerald-400" : "text-slate-500"}`}>
                          Store Loaded
                        </span>
                      </div>

                      {/* Stage 2 */}
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center font-bold mb-1.5 transition-colors ${
                            stage >= 2
                              ? "bg-cyan-500 text-slate-950 shadow-lg shadow-cyan-500/20"
                              : "bg-slate-800 text-slate-500"
                          }`}
                        >
                          2
                        </div>
                        <span className={`text-[10px] font-bold ${stage >= 2 ? "text-cyan-400" : "text-slate-500"}`}>
                          En Route
                        </span>
                      </div>

                      {/* Stage 3 */}
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center font-bold mb-1.5 transition-colors ${
                            stage >= 3
                              ? "bg-blue-500 text-white shadow-lg shadow-blue-500/20"
                              : "bg-slate-800 text-slate-500"
                          }`}
                        >
                          3
                        </div>
                        <span className={`text-[10px] font-bold ${stage >= 3 ? "text-blue-400" : "text-slate-500"}`}>
                          On Site
                        </span>
                      </div>

                      {/* Stage 4 */}
                      <div className="flex flex-col items-center">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center font-bold mb-1.5 transition-colors ${
                            stage >= 4
                              ? "bg-indigo-500 text-white shadow-lg shadow-indigo-500/20"
                              : "bg-slate-800 text-slate-500"
                          }`}
                        >
                          4
                        </div>
                        <span className={`text-[10px] font-bold ${stage >= 4 ? "text-indigo-400" : "text-slate-500"}`}>
                          Returning
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* DEPLOYMENT DETAILS: MACHINERY & TOOLS */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 text-xs">
                    {/* Machine & Lift */}
                    <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800/80">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 mb-2">
                        <Truck className="w-3.5 h-3.5 text-amber-400" />
                        Machinery & Fleet
                      </p>
                      <div className="space-y-1.5">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Machine:</span>
                          <span className="font-bold text-white">
                            {job.machineId || "Standard Mixer"} {job.machineType && `(${job.machineType})`}
                          </span>
                        </div>
                        {job.liftId && (
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">Lift:</span>
                            <span className="font-bold text-blue-400">{job.liftId}</span>
                          </div>
                        )}
                        {job.vehiclePlate && (
                          <div className="flex justify-between items-center">
                            <span className="text-slate-400">Transport:</span>
                            <span className="font-mono text-slate-300 font-bold">{job.vehiclePlate}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Site Tools Loaded */}
                    <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800/80 flex flex-col justify-between">
                      <div>
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5 mb-2">
                          <Wrench className="w-3.5 h-3.5 text-rose-400" />
                          Loaded Tools ({job.tools.length})
                        </p>
                        {job.tools.length === 0 ? (
                          <p className="text-slate-500 italic">No small tools assigned.</p>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {job.tools.map(tool => (
                              <span
                                key={tool.id}
                                className="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] text-slate-300"
                              >
                                {tool.name} {tool.quantity > 1 && `(x${tool.quantity})`}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* CREW: DRIVER & OPERATOR */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 text-xs">
                    {/* Driver */}
                    <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800/80 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] text-slate-500 font-bold uppercase">Driver</p>
                        <p className="font-bold text-white mt-0.5">{job.driverName || "Unassigned"}</p>
                      </div>
                      {job.driverPhone && (
                        <a
                          href={`tel:${job.driverPhone}`}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 font-bold hover:bg-cyan-600 hover:text-white transition-colors"
                        >
                          <PhoneCall className="w-3 h-3" />
                          Call
                        </a>
                      )}
                    </div>

                    {/* Operator */}
                    <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800/80 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <p className="text-[10px] text-slate-500 font-bold uppercase">Operator</p>
                          <span
                            className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                              job.operatorType === "INTERNAL"
                                ? "bg-emerald-500/10 text-emerald-400"
                                : "bg-blue-500/10 text-blue-400"
                            }`}
                          >
                            {job.operatorType || "INTERNAL"}
                          </span>
                        </div>
                        <p className="font-bold text-white mt-0.5">{job.operatorName || "Unassigned"}</p>
                      </div>
                      {job.operatorPhone && (
                        <a
                          href={`tel:${job.operatorPhone}`}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 font-bold hover:bg-emerald-600 hover:text-white transition-colors"
                        >
                          <PhoneCall className="w-3 h-3" />
                          Call
                        </a>
                      )}
                    </div>
                  </div>
                </div>

                {/* BOTTOM QUICK STATUS ADVANCE ACTIONS */}
                <div className="pt-3 border-t border-slate-800 flex items-center justify-between gap-2 text-xs">
                  <div className="text-slate-400 text-[11px]">
                    Work: <strong className="text-slate-200">{job.workType}</strong>
                  </div>

                  <div className="flex items-center gap-2">
                    {stage === 1 && (
                      <button
                        onClick={() => handleAdvanceStatus(job.id, "EN_ROUTE")}
                        disabled={isUpdating}
                        className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold transition-all flex items-center gap-1.5 shadow"
                      >
                        Depart Store (En Route) →
                      </button>
                    )}
                    {stage === 2 && (
                      <button
                        onClick={() => handleAdvanceStatus(job.id, "IN_PROGRESS")}
                        disabled={isUpdating}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-all flex items-center gap-1.5 shadow"
                      >
                        Arrived On Site →
                      </button>
                    )}
                    {stage === 3 && (
                      <button
                        onClick={() => handleAdvanceStatus(job.id, "DELIVERED")}
                        disabled={isUpdating}
                        className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold transition-all flex items-center gap-1.5 shadow"
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
          })}
        </div>
      )}

    </div>
  );
}
