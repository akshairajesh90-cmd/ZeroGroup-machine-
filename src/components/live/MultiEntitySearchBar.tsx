"use client";

import React, { useState } from "react";
import {
  Search,
  X,
  Truck,
  Wrench,
  Hammer,
  Users,
  HardHat,
  MapPin,
  SlidersHorizontal,
  RotateCcw,
  Sparkles,
} from "lucide-react";

export type EntityCategory =
  | "ALL"
  | "VEHICLES"
  | "MACHINES"
  | "TOOLS"
  | "DRIVERS"
  | "OPERATORS"
  | "SITES";

export interface MultiSearchFilters {
  activeCategory: EntityCategory;
  generalQuery: string;
  vehicleQuery: string;
  machineQuery: string;
  toolQuery: string;
  driverQuery: string;
  operatorQuery: string;
  siteQuery: string;
}

export interface EntityCounts {
  sites: number;
  machines: number;
  tools: number;
  drivers: number;
  operators: number;
  vehicles: number;
}

interface MultiEntitySearchBarProps {
  filters: MultiSearchFilters;
  onChange: (newFilters: MultiSearchFilters) => void;
  counts: EntityCounts;
}

export default function MultiEntitySearchBar({
  filters,
  onChange,
  counts,
}: MultiEntitySearchBarProps) {
  const [isAdvancedOpen, setIsAdvancedOpen] = useState(false);

  // Count active filters
  const activeCount = [
    filters.generalQuery,
    filters.vehicleQuery,
    filters.machineQuery,
    filters.toolQuery,
    filters.driverQuery,
    filters.operatorQuery,
    filters.siteQuery,
  ].filter((q) => q.trim().length > 0).length + (filters.activeCategory !== "ALL" ? 1 : 0);

  const handleCategoryClick = (category: EntityCategory) => {
    onChange({
      ...filters,
      activeCategory: category,
    });
  };

  const handleGeneralChange = (val: string) => {
    onChange({
      ...filters,
      generalQuery: val,
    });
  };

  const handleFieldChange = (field: keyof MultiSearchFilters, val: string) => {
    onChange({
      ...filters,
      [field]: val,
    });
  };

  const handleReset = () => {
    onChange({
      activeCategory: "ALL",
      generalQuery: "",
      vehicleQuery: "",
      machineQuery: "",
      toolQuery: "",
      driverQuery: "",
      operatorQuery: "",
      siteQuery: "",
    });
  };

  // Helper placeholder based on active tab
  const getCategoryPlaceholder = (cat: EntityCategory) => {
    switch (cat) {
      case "VEHICLES": return "Search vehicles by plate (KL-07...), type...";
      case "MACHINES": return "Search machines by ID (MIX-01, LIFT-02), type...";
      case "TOOLS": return "Search tools by name, ID (Vibrator needle, trolly)...";
      case "DRIVERS": return "Search drivers by name, phone...";
      case "OPERATORS": return "Search operators by name, role (Mixer, Lift)...";
      case "SITES": return "Search active sites by location, customer...";
      default: return "Universal search across sites, machines, tools, crew, vehicles...";
    }
  };

  return (
    <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
      
      {/* 1. Category Filter Segmented Tabs */}
      <div className="flex items-center justify-between gap-3 overflow-x-auto pb-1 custom-scrollbar">
        <div className="flex items-center gap-1.5 flex-nowrap shrink-0">
          
          <button
            type="button"
            onClick={() => handleCategoryClick("ALL")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
              filters.activeCategory === "ALL"
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/30"
                : "bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            <span>All Assets</span>
          </button>

          <button
            type="button"
            onClick={() => handleCategoryClick("VEHICLES")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
              filters.activeCategory === "VEHICLES"
                ? "bg-blue-600 text-white shadow-md shadow-blue-600/30"
                : "bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            <Truck className="w-3.5 h-3.5 text-blue-400" />
            <span>Vehicles</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800/80 text-slate-300 font-mono">
              {counts.vehicles}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleCategoryClick("MACHINES")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
              filters.activeCategory === "MACHINES"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/30"
                : "bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            <Wrench className="w-3.5 h-3.5 text-emerald-400" />
            <span>Machines</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800/80 text-slate-300 font-mono">
              {counts.machines}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleCategoryClick("TOOLS")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
              filters.activeCategory === "TOOLS"
                ? "bg-violet-600 text-white shadow-md shadow-violet-600/30"
                : "bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            <Hammer className="w-3.5 h-3.5 text-violet-400" />
            <span>Tools</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800/80 text-slate-300 font-mono">
              {counts.tools}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleCategoryClick("DRIVERS")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
              filters.activeCategory === "DRIVERS"
                ? "bg-cyan-600 text-white shadow-md shadow-cyan-600/30"
                : "bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            <Truck className="w-3.5 h-3.5 text-cyan-400" />
            <span>Drivers</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800/80 text-slate-300 font-mono">
              {counts.drivers}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleCategoryClick("OPERATORS")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
              filters.activeCategory === "OPERATORS"
                ? "bg-amber-600 text-white shadow-md shadow-amber-600/30"
                : "bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            <HardHat className="w-3.5 h-3.5 text-amber-400" />
            <span>Operators</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800/80 text-slate-300 font-mono">
              {counts.operators}
            </span>
          </button>

          <button
            type="button"
            onClick={() => handleCategoryClick("SITES")}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shrink-0 ${
              filters.activeCategory === "SITES"
                ? "bg-rose-600 text-white shadow-md shadow-rose-600/30"
                : "bg-slate-950/60 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            <MapPin className="w-3.5 h-3.5 text-rose-400" />
            <span>Sites</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-800/80 text-slate-300 font-mono">
              {counts.sites}
            </span>
          </button>

        </div>

        {/* Action Toggle for Multi-Field Mode */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setIsAdvancedOpen(!isAdvancedOpen)}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all flex items-center gap-1.5 ${
              isAdvancedOpen || activeCount > 1
                ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40"
                : "bg-slate-950 text-slate-400 border-slate-800 hover:text-white"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Multi-Search</span>
            {activeCount > 0 && (
              <span className="w-4 h-4 rounded-full bg-indigo-500 text-white text-[10px] flex items-center justify-center font-bold">
                {activeCount}
              </span>
            )}
          </button>

          {activeCount > 0 && (
            <button
              type="button"
              onClick={handleReset}
              className="px-2.5 py-1.5 rounded-xl text-xs font-bold bg-slate-800 hover:bg-rose-950/40 hover:text-rose-400 text-slate-300 border border-slate-700/60 transition-colors flex items-center gap-1"
              title="Reset all filters"
            >
              <RotateCcw className="w-3 h-3" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Main Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder={getCategoryPlaceholder(filters.activeCategory)}
          value={filters.generalQuery}
          onChange={(e) => handleGeneralChange(e.target.value)}
          className="w-full bg-slate-950 border border-slate-800 rounded-2xl pl-10 pr-9 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors shadow-inner"
        />
        {filters.generalQuery && (
          <button
            onClick={() => handleGeneralChange("")}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* 3. Expandable Dedicated 6-Field Multi-Search Grid */}
      {isAdvancedOpen && (
        <div className="pt-3 border-t border-slate-800/80 animate-in fade-in duration-200 space-y-3">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold px-1">
            <span className="flex items-center gap-1.5 text-indigo-400 font-bold">
              <Sparkles className="w-3.5 h-3.5" /> Separate Dedicated Search Inputs (Conjunctive AND Logic)
            </span>
            <span>Refine any specific asset independently</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            
            {/* Field 1: Vehicles */}
            <div className="relative">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-1 px-1">
                <span className="flex items-center gap-1"><Truck className="w-3 h-3 text-blue-400" /> Vehicles</span>
                <span className="text-[10px] text-slate-500 font-normal">Plate / Type</span>
              </div>
              <input
                type="text"
                placeholder="e.g. KL-07, Pickup, Tipper..."
                value={filters.vehicleQuery}
                onChange={(e) => handleFieldChange("vehicleQuery", e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:border-blue-500 outline-none"
              />
            </div>

            {/* Field 2: Machines */}
            <div className="relative">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-1 px-1">
                <span className="flex items-center gap-1"><Wrench className="w-3 h-3 text-emerald-400" /> Machines</span>
                <span className="text-[10px] text-slate-500 font-normal">ID / Machine Type</span>
              </div>
              <input
                type="text"
                placeholder="e.g. MIX-01, Lift, Vibrator..."
                value={filters.machineQuery}
                onChange={(e) => handleFieldChange("machineQuery", e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:border-emerald-500 outline-none"
              />
            </div>

            {/* Field 3: Tools */}
            <div className="relative">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-1 px-1">
                <span className="flex items-center gap-1"><Hammer className="w-3 h-3 text-violet-400" /> Tools</span>
                <span className="text-[10px] text-slate-500 font-normal">Name / Tool ID</span>
              </div>
              <input
                type="text"
                placeholder="e.g. Needle, Screed, Trolley..."
                value={filters.toolQuery}
                onChange={(e) => handleFieldChange("toolQuery", e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:border-violet-500 outline-none"
              />
            </div>

            {/* Field 4: Drivers */}
            <div className="relative">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-1 px-1">
                <span className="flex items-center gap-1"><Truck className="w-3 h-3 text-cyan-400" /> Drivers</span>
                <span className="text-[10px] text-slate-500 font-normal">Name / Phone</span>
              </div>
              <input
                type="text"
                placeholder="e.g. Suresh, Driver name..."
                value={filters.driverQuery}
                onChange={(e) => handleFieldChange("driverQuery", e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:border-cyan-500 outline-none"
              />
            </div>

            {/* Field 5: Operators & Crew */}
            <div className="relative">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-1 px-1">
                <span className="flex items-center gap-1"><HardHat className="w-3 h-3 text-amber-400" /> Operators</span>
                <span className="text-[10px] text-slate-500 font-normal">Name / Role</span>
              </div>
              <input
                type="text"
                placeholder="e.g. Ramesh, Mixer Operator..."
                value={filters.operatorQuery}
                onChange={(e) => handleFieldChange("operatorQuery", e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:border-amber-500 outline-none"
              />
            </div>

            {/* Field 6: Sites */}
            <div className="relative">
              <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-1 px-1">
                <span className="flex items-center gap-1"><MapPin className="w-3 h-3 text-rose-400" /> Sites</span>
                <span className="text-[10px] text-slate-500 font-normal">Address / Customer</span>
              </div>
              <input
                type="text"
                placeholder="e.g. Kakkanad, Skyline, Kochi..."
                value={filters.siteQuery}
                onChange={(e) => handleFieldChange("siteQuery", e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-600 focus:border-rose-500 outline-none"
              />
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
