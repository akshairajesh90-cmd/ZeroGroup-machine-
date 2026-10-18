"use client";

import { useRef, useState, useTransition } from "react";
import { logFuelAction, logTollAction } from "../actions";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { format } from "date-fns";

interface Machine { id: string; machineId: string; type: string; notes: string | null }
interface Vehicle { id: string; licensePlate: string; type: string }

export default function FuelLogForm({ machines, vehicles }: { machines: Machine[]; vehicles: Vehicle[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [type, setType] = useState<"machine" | "vehicle" | "toll">("machine");

  const today = format(new Date(), "yyyy-MM-dd");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const fd = new FormData(formRef.current!);
    
    startTransition(async () => {
      try {
        if (type === "toll") {
          await logTollAction(fd);
        } else {
          await logFuelAction(fd);
        }
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
      <div>
        <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-2 block">Expense Type</label>
        <div className="flex bg-slate-950 rounded-xl p-1 border border-slate-800">
          <button type="button" onClick={() => setType("machine")} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${type === "machine" ? "bg-orange-600 text-white shadow" : "text-slate-400"}`}>
            Machine Fuel
          </button>
          <button type="button" onClick={() => setType("vehicle")} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${type === "vehicle" ? "bg-cyan-600 text-white shadow" : "text-slate-400"}`}>
            Vehicle Fuel
          </button>
          <button type="button" onClick={() => setType("toll")} className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${type === "toll" ? "bg-purple-600 text-white shadow" : "text-slate-400"}`}>
            Toll / Travel
          </button>
        </div>
      </div>

      {type === "machine" && (
        <div>
          <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">Select Machine *</label>
          <select name="machineId" required className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50">
            <option value="">Select...</option>
            {machines.map((m) => <option key={m.id} value={m.id}>{m.machineId} - {m.type}</option>)}
          </select>
        </div>
      )}

      {(type === "vehicle" || type === "toll") && (
        <div>
          <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">Select Vehicle *</label>
          <select name="vehicleId" required className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-cyan-500/50">
            <option value="">Select...</option>
            {vehicles.map((v) => <option key={v.id} value={v.id}>{v.licensePlate} - {v.type}</option>)}
          </select>
        </div>
      )}

      {type === "toll" && (
        <div>
          <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">Notes / Destination</label>
          <input name="notes" type="text" placeholder="e.g. Salik Toll Gate"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {type !== "toll" && (
          <div>
            <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">Liters *</label>
            <input name="liters" type="number" step="0.1" min="0.1" required placeholder="e.g. 12.5"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50" />
          </div>
        )}
        <div className={type === "toll" ? "col-span-2" : ""}>
          <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">Total Cost *</label>
          <input name="totalCost" type="number" step="0.01" min="1" required placeholder="e.g. 1250"
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50" />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {type !== "toll" && (
          <div>
            <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">Odometer</label>
            <input name="odometer" type="number" min="0" placeholder="Optional"
              className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50" />
          </div>
        )}
        <div className={type === "toll" ? "col-span-2" : ""}>
          <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">Date *</label>
          <input name="date" type="date" defaultValue={today} required
            className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-orange-500/50" />
        </div>
      </div>

      {error && <p className="text-xs text-red-400">{error}</p>}
      {success && <p className="text-xs text-emerald-400 font-bold">Saved successfully!</p>}

      <button type="submit" disabled={isPending} className={`w-full py-4 rounded-xl font-black text-sm text-white transition-all ${type === "toll" ? "bg-purple-600" : "bg-orange-600"}`}>
        {isPending ? "Saving..." : "Save Record"}
      </button>
    </form>
  );
}
