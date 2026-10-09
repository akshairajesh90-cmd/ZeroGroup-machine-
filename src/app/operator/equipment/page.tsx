"use client";

import { useState, useOptimistic } from "react";
import { Wrench, Fuel, AlertTriangle, Droplets } from "lucide-react";
import { logFluid, reportBreakdown } from "@/actions/operator";
import { queueOfflineAction } from "@/lib/offlineQueue";
import { fluidLogSchema, breakdownSchema } from "@/lib/validations/operator";

// Note: In a real component, machineId and isSubcontractor would come from props or a context hook.
export default function EquipmentPage({ searchParams }: { searchParams?: { [key: string]: string | string[] | undefined } }) {
  const machineId = (searchParams?.machineId as string) || "MAC-123";
  const isSubcontractor = true;
  const [fluidForm, setFluidForm] = useState({ fluidType: "", amount: "" });
  const [breakdownForm, setBreakdownForm] = useState({ description: "", isCritical: false, photoDataUrl: "" });
  
  const [optimisticFluid, addOptimisticFluid] = useOptimistic({ status: "idle" });
  const [optimisticBreakdown, addOptimisticBreakdown] = useOptimistic({ status: "idle" });

  const handleFluidSubmit = async (type: string) => {
    const payload = { machineId, fluidType: type, amount: fluidForm.amount };
    const parsed = fluidLogSchema.safeParse(payload);
    if (!parsed.success) {
      alert(parsed.error.issues[0]?.message || "Validation Error");
      return;
    }

    addOptimisticFluid({ status: "submitting" });
    if (!navigator.onLine) {
      await queueOfflineAction('logFluid', parsed.data);
      addOptimisticFluid({ status: "success" });
      setFluidForm({ fluidType: "", amount: "" });
      return;
    }

    try {
      const res = await logFluid(parsed.data);
      if (!res.success) throw new Error(res.error);
      addOptimisticFluid({ status: "success" });
      setFluidForm({ fluidType: "", amount: "" });
    } catch (err) {
      addOptimisticFluid({ status: "idle" });
      alert("Error: " + err);
    }
  };

  const handleBreakdownSubmit = async () => {
    const payload = { ...breakdownForm, machineId };
    const parsed = breakdownSchema.safeParse(payload);
    if (!parsed.success) {
      alert(parsed.error.issues[0]?.message || "Validation Error");
      return;
    }

    addOptimisticBreakdown({ status: "submitting" });
    if (!navigator.onLine) {
      await queueOfflineAction('reportBreakdown', parsed.data);
      addOptimisticBreakdown({ status: "success" });
      setBreakdownForm({ description: "", isCritical: false, photoDataUrl: "" });
      return;
    }

    try {
      const res = await reportBreakdown(parsed.data);
      if (!res.success) throw new Error(res.error);
      addOptimisticBreakdown({ status: "success" });
      setBreakdownForm({ description: "", isCritical: false, photoDataUrl: "" });
    } catch (err) {
      addOptimisticBreakdown({ status: "idle" });
      alert("Error: " + err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="pt-2">
        <h1 className="text-2xl font-black text-white mt-0.5 uppercase tracking-wider">Equipment</h1>
        <p className="text-xs text-zinc-500 mt-1 font-bold">Maintenance & Diagnostics</p>
      </div>

      {/* Log Fluids */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
        <h2 className="text-[11px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
           <Fuel className="w-4 h-4" /> Log Fluids
        </h2>
        
        <input 
           type="number" 
           placeholder="Amount (Liters)" 
           value={fluidForm.amount}
           onChange={(e) => setFluidForm({ ...fluidForm, amount: e.target.value })}
           className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white text-sm outline-none focus:border-orange-500"
        />

        <div className="grid grid-cols-2 gap-3">
          <button onClick={() => handleFluidSubmit("DIESEL")} className="bg-zinc-950 border border-zinc-800 active:border-blue-500 active:bg-zinc-900 rounded-xl p-4 flex flex-col items-center justify-center gap-2 transition-all">
            <Fuel className="w-6 h-6 text-blue-500" />
            <span className="text-xs font-bold text-zinc-300">Diesel</span>
          </button>
          
          <button onClick={() => handleFluidSubmit("HYDRAULIC_OIL")} className="bg-zinc-950 border border-zinc-800 active:border-amber-500 active:bg-zinc-900 rounded-xl p-4 flex flex-col items-center justify-center gap-2 transition-all">
            <Droplets className="w-6 h-6 text-amber-500" />
            <span className="text-xs font-bold text-zinc-300">Hydraulic Oil</span>
          </button>
        </div>
        {optimisticFluid.status === "submitting" && <p className="text-xs text-orange-500">Saving...</p>}
        {optimisticFluid.status === "success" && <p className="text-xs text-emerald-500">Fluid logged successfully!</p>}
      </div>

      {/* Breakdown Report */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4">
        <h2 className="text-[11px] font-black uppercase tracking-widest text-zinc-500 flex items-center gap-2">
           <Wrench className="w-4 h-4" /> Diagnostics
        </h2>

        {isSubcontractor && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-2 flex items-start gap-2">
             <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
             <p className="text-[10px] text-red-400 leading-tight">
               <strong className="uppercase block font-black text-red-500 tracking-wider mb-0.5">Critical Flag</strong>
               As a sub-contractor, breakdowns flag the Fleet Manager with a RED priority.
             </p>
          </div>
        )}

        <textarea 
          placeholder="Describe the issue in detail..."
          value={breakdownForm.description}
          onChange={(e) => setBreakdownForm({ ...breakdownForm, description: e.target.value })}
          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-3 text-white text-sm outline-none focus:border-red-500 min-h-[100px]"
        />

        <button 
          onClick={handleBreakdownSubmit}
          disabled={optimisticBreakdown.status === "submitting"}
          className="w-full py-4 rounded-xl font-black uppercase tracking-wider transition-colors bg-red-600 text-white active:bg-red-700 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <AlertTriangle className="w-5 h-5" />
          {optimisticBreakdown.status === "submitting" ? "Reporting..." : "Report Breakdown"}
        </button>
        {optimisticBreakdown.status === "success" && <p className="text-xs text-emerald-500 text-center">Ticket created successfully.</p>}
      </div>

    </div>
  );
}
