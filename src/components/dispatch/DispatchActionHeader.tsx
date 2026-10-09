import React from "react";
import { Truck, Table, LayoutGrid, PlusCircle, Users } from "lucide-react";

interface DispatchActionHeaderProps {
  dispatchesCount: number;
  viewMode: "TABLE" | "GRID" | "CREW";
  setViewMode: (mode: "TABLE" | "GRID" | "CREW") => void;
  onNewDispatch: () => void;
}

export function DispatchActionHeader({
  dispatchesCount,
  viewMode,
  setViewMode,
  onNewDispatch,
}: DispatchActionHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-900/80 border border-slate-800 p-4 rounded-2xl shadow-xl gap-4">
      <div>
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Truck className="w-5 h-5 text-amber-400" />
          Active Daily Bookings & Dispatch Orders ({dispatchesCount})
        </h2>
        <p className="text-xs text-slate-400">
          Office Booking Page — Staff books Site, Category & Crew. Exact field setting & setup logging are done by the Operator and Driver via their Field Apps.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="bg-slate-950 p-1 rounded-xl border border-slate-800 flex items-center gap-1">
          <button
            onClick={() => setViewMode("CREW")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              viewMode === "CREW" ? "bg-amber-500 text-slate-950 shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            Crew DnD
          </button>
          <button
            onClick={() => setViewMode("TABLE")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              viewMode === "TABLE" ? "bg-amber-500 text-slate-950 shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            <Table className="w-3.5 h-3.5" />
            Ledger
          </button>
          <button
            onClick={() => setViewMode("GRID")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              viewMode === "GRID" ? "bg-amber-500 text-slate-950 shadow" : "text-slate-400 hover:text-white"
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            Cards
          </button>
        </div>

        <button
          onClick={onNewDispatch}
          className="flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl shadow-lg shadow-amber-500/20 transition-all text-sm"
        >
          <PlusCircle className="w-4 h-4" />
          Create New Dispatch
        </button>
      </div>
    </div>
  );
}
