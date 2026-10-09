"use client";
import React, { useState } from "react";
import { Users, IndianRupee, Edit2, Check, X } from "lucide-react";
import { updateSiteLaborDisbursement } from "@/actions/externalLabor";

export function SiteLaborDisbursementReview({ disbursement }: { disbursement: any }) {
  const [isEditing, setIsEditing] = useState(false);
  const [cash, setCash] = useState(disbursement.totalCashHandedOut);
  const [workers, setWorkers] = useState(disbursement.externalWorkerNames || "");
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await updateSiteLaborDisbursement(disbursement.id, Number(cash), workers);
      setIsEditing(false);
    } catch (err) {
      alert("Failed to update.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="bg-zinc-950 border border-amber-500/20 rounded-xl p-4 mt-4 relative">
      <div className="absolute top-4 right-4">
        {!isEditing ? (
          <button onClick={() => setIsEditing(true)} className="text-zinc-500 hover:text-amber-500">
            <Edit2 className="w-4 h-4" />
          </button>
        ) : (
          <div className="flex gap-2">
            <button onClick={handleSave} disabled={isSaving} className="text-emerald-500 hover:text-emerald-400">
              <Check className="w-5 h-5" />
            </button>
            <button onClick={() => setIsEditing(false)} disabled={isSaving} className="text-red-500 hover:text-red-400">
              <X className="w-5 h-5" />
            </button>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 mb-3">
        <Users className="w-4 h-4 text-amber-500" />
        <h4 className="text-xs font-black text-amber-500 uppercase tracking-widest">Site Labor Disbursement</h4>
      </div>

      <div className="space-y-3">
        <div>
          <span className="text-[10px] uppercase text-zinc-500 font-bold block mb-1">Sub-Leader (Mesthiri)</span>
          <span className="text-sm font-bold text-white">{disbursement.subLeader?.name}</span>
        </div>

        <div>
          <span className="text-[10px] uppercase text-zinc-500 font-bold block mb-1">Total Cash Handed Out</span>
          {isEditing ? (
            <input 
              type="number" 
              value={cash} 
              onChange={e => setCash(e.target.value)}
              className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm text-white w-32"
            />
          ) : (
            <div className="flex items-center gap-1 text-sm font-black text-emerald-400">
              <IndianRupee className="w-3 h-3" /> {Number(disbursement.totalCashHandedOut).toLocaleString()}
            </div>
          )}
        </div>

        <div>
          <span className="text-[10px] uppercase text-zinc-500 font-bold block mb-1">Workers Present</span>
          {isEditing ? (
            <textarea 
              value={workers} 
              onChange={e => setWorkers(e.target.value)}
              rows={2}
              className="bg-zinc-900 border border-zinc-700 rounded px-2 py-1 text-sm text-white w-full resize-none"
            />
          ) : (
            <span className="text-xs text-zinc-300">{disbursement.externalWorkerNames || "Not specified"}</span>
          )}
        </div>
      </div>
    </div>
  );
}
