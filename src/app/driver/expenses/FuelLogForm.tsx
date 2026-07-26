"use client";

import { useRef, useState, useTransition } from "react";
import { logFuelAction } from "../actions";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface Machine { id: string; machineId: string; type: string; notes: string | null }
interface Vehicle { id: string; licensePlate: string; type: string }

export default function FuelLogForm({ machines, vehicles }: { machines: Machine[]; vehicles: Vehicle[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [assetType, setAssetType] = useState<"machine" | "vehicle">("machine");

  const today = format(new Date(), "yyyy-MM-dd");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const fd = new FormData(formRef.current!);
    startTransition(async () => {
      try {
        await logFuelAction(fd);
        setSuccess(true);
        formRef.current?.reset();
        setTimeout(() => setSuccess(false), 3000);
      } catch (err: any) {
        setError(err.message ?? "Failed to save. Try again.");
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="bg-slate-900/70 border border-white/5 rounded-2xl p-5 space-y-4">
      {/* Asset Type Toggle */}
      <div>
        <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Asset Type</label>
        <div className="flex bg-slate-950 rounded-xl p-1 border border-slate-800">
          <button
            type="button"
            onClick={() => setAssetType("machine")}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${assetType === "machine" ? "bg-orange-600 text-white shadow" : "text-slate-400"}`}
          >
            🔧 Machine
          </button>
          <button
            type="button"
            onClick={() => setAssetType("vehicle")}
            className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${assetType === "vehicle" ? "bg-cyan-600 text-white shadow" : "text-slate-400"}`}
          >
            🚛 Vehicle
          </button>
        </div>
      </div>

      {/* Machine or Vehicle selector */}
      {assetType === "machine" ? (
        <div>
          <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">Select Machine *</label>
          <select name="machineId" required className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50">
            <option value="">— Choose machine —</option>
            {machines.map((m) => (
              <option key={m.id} value={m.id}>{m.machineId} · {m.type}</option>
            ))}
          </select>
        </div>
      ) : (
        <div>
          <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">Select Vehicle *</label>
          <select name="vehicleId" required className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50">
            <option value="">— Choose vehicle —</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>{v.licensePlate} · {v.type}</option>
            ))}
          </select>
        </div>
      )}

      {/* Liters + Cost row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">Liters *</label>
          <input name="liters" type="number" step="0.1" min="0.1" required placeholder="e.g. 12.5"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50" />
        </div>
        <div>
          <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">Total Cost ₹ *</label>
          <input name="totalCost" type="number" step="0.01" min="1" required placeholder="e.g. 1250"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50" />
        </div>
      </div>

      {/* Odometer + Date row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">Odometer km</label>
          <input name="odometer" type="number" min="0" placeholder="Optional"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50" />
        </div>
        <div>
          <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">Date *</label>
          <input name="date" type="date" defaultValue={today} required
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50" />
        </div>
      </div>

      {/* Receipt reminder */}
      <div className="flex items-center gap-3 bg-amber-500/8 border border-amber-500/20 rounded-xl px-4 py-3">
        <span className="text-lg shrink-0">🧾</span>
        <p className="text-xs text-amber-300">Keep the physical receipt safe — office may ask for it during settlement.</p>
      </div>

      {/* Feedback */}
      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <p className="text-xs text-emerald-400 font-bold">Fuel log saved successfully!</p>
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-black text-sm transition-all active:scale-[0.98]"
      >
        {isPending ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : "Save Fuel Log"}
      </button>
    </form>
  );
}
