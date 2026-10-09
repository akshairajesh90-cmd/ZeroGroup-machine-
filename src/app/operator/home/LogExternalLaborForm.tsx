"use client";

import { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { logSiteLaborDisbursement } from "@/actions/externalLabor";
import { Users, IndianRupee, Loader2, CheckCircle2 } from "lucide-react";

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full mt-4 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 px-5 py-3.5 text-sm font-black text-white shadow-lg active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
    >
      {pending ? <Loader2 className="w-5 h-5 animate-spin" /> : <IndianRupee className="w-5 h-5" />}
      {pending ? "Logging Disbursement..." : "Log Cash Handed Out"}
    </button>
  );
}

export default function LogExternalLaborForm({
  dispatchId,
  subLeaders
}: {
  dispatchId: string;
  subLeaders: { id: string; name: string }[];
}) {
  const [state, dispatch] = useFormState(logSiteLaborDisbursement, { success: false, message: "" });
  const [isOpen, setIsOpen] = useState(false);

  if (state.success) {
    return (
      <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-5 text-center mt-6">
        <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
        <h3 className="text-sm font-black text-emerald-400 uppercase tracking-widest">Cash Logged</h3>
        <p className="text-xs font-bold text-emerald-500/70 mt-1">
          {state.message}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden mt-6 shadow-xl">
      <div 
        className="p-5 flex items-center justify-between cursor-pointer active:bg-zinc-800/50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center border border-orange-500/20">
            <Users className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white">Log External Helpers</h3>
            <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mt-0.5">Track cash handed to Sub-Leader</p>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="p-5 pt-0 border-t border-zinc-800/50 mt-4">
          <form action={dispatch} className="space-y-4 pt-4">
            <input type="hidden" name="dispatchId" value={dispatchId} />
            
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5">
                Sub-Leader (Mesthiri)
              </label>
              <select 
                name="subLeaderId" 
                required
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm font-bold text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all appearance-none"
              >
                <option value="">Select Sub-Leader...</option>
                {subLeaders.map(sl => (
                  <option key={sl.id} value={sl.id}>{sl.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5">
                Total Cash Handed Out (,1)
              </label>
              <input 
                type="number" 
                name="totalCashHandedOut" 
                required
                min="0"
                step="1"
                placeholder="e.g. 1500"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm font-bold text-white placeholder-zinc-700 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all"
              />
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-zinc-500 mb-1.5">
                External Worker Names (Optional)
              </label>
              <textarea 
                name="externalWorkerNames" 
                rows={2}
                placeholder="e.g. Sadam, plus 2 helpers"
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm font-bold text-white placeholder-zinc-700 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all resize-none"
              />
            </div>
            
            <SubmitButton />
          </form>
        </div>
      )}
    </div>
  );
}
