"use client";

import { useState, useEffect } from "react";
import { startShiftAction, endShiftAction } from "./actions";
import { Clock, Play, Square, Loader2 } from "lucide-react";

type ActiveShift = {
  id: string;
  startTime: string; // ISO String
  vehicleName: string;
} | null;

type Vehicle = {
  id: string;
  type: string;
  licensePlate: string;
};

export default function ShiftTracker({ activeShift, availableVehicles = [] }: { activeShift: ActiveShift, availableVehicles?: Vehicle[] }) {
  const [loading, setLoading] = useState(false);
  const [elapsed, setElapsed] = useState("00h 00m 00s");
  const [selectedVehicleId, setSelectedVehicleId] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    if (!activeShift) return;

    // Bulletproof timekeeping: Calculate delta from absolute startTime, not relative state ticking
    const updateTimer = () => {
      const startMs = new Date(activeShift.startTime).getTime();
      const nowMs = Date.now();
      const diffMs = nowMs - startMs;
      
      const hours = Math.floor(diffMs / 3600000);
      const minutes = Math.floor((diffMs % 3600000) / 60000);
      const seconds = Math.floor((diffMs % 60000) / 1000);
      
      setElapsed(`${hours.toString().padStart(2, '0')}h ${minutes.toString().padStart(2, '0')}m ${seconds.toString().padStart(2, '0')}s`);
    };

    updateTimer(); // Init
    
    // Trigger UI re-render every second
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [activeShift]);

  const handleStart = async () => {
    if (!selectedVehicleId) {
      setErrorMsg("Please select a vehicle to start your shift.");
      return;
    }
    setErrorMsg("");
    setLoading(true);
    try {
      const res = await startShiftAction(selectedVehicleId);
      if (!res?.success && res?.error) {
        setErrorMsg(res.error);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEnd = async () => {
    if (!activeShift) return;
    setLoading(true);
    try {
      await endShiftAction(activeShift.id);
    } finally {
      setLoading(false);
    }
  };

  if (activeShift) {
    return (
      <div className="w-full bg-zinc-900 border-2 border-cyan-500 p-4 rounded-xl flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2 text-cyan-400">
              <Clock className="w-5 h-5 animate-pulse" />
              <span className="font-bold uppercase tracking-widest text-xs">Shift Active</span>
            </div>
            <span className="text-[11px] text-slate-400 font-bold">Currently Driving: <span className="text-white">{activeShift.vehicleName}</span></span>
          </div>
          <span className="text-xl font-black text-white font-mono">{elapsed}</span>
        </div>
        <button
          onClick={handleEnd}
          disabled={loading}
          className="w-full bg-red-600 active:bg-red-700 text-white font-black py-4 rounded-lg uppercase tracking-wider flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Square className="w-5 h-5" fill="currentColor" />}
          CLOCK OUT
        </button>
      </div>
    );
  }

  return (
    <div className="w-full bg-zinc-900 border-2 border-zinc-800 p-4 rounded-xl space-y-3">
       {errorMsg && (
         <div className="p-2 text-xs font-bold text-red-400 bg-red-950/40 border border-red-500/30 rounded-lg text-center">
           {errorMsg}
         </div>
       )}
       
       <select
         value={selectedVehicleId}
         onChange={(e) => {
           setSelectedVehicleId(e.target.value);
           setErrorMsg("");
         }}
         className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-3 text-sm text-slate-300 outline-none"
         disabled={loading}
       >
         <option value="">Select a Vehicle...</option>
         {availableVehicles.map(v => (
           <option key={v.id} value={v.id}>{v.licensePlate} ({v.type})</option>
         ))}
       </select>

       <button
          onClick={handleStart}
          disabled={loading || !selectedVehicleId}
          className="w-full bg-emerald-600 active:bg-emerald-700 text-white font-black py-4 rounded-lg uppercase tracking-wider flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" fill="currentColor" />}
          CLOCK IN & START SHIFT
        </button>
    </div>
  );
}
