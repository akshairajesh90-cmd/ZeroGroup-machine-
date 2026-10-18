"use client";

import React, { useState } from "react";
import { editMachine } from "@/actions/assets";
import { Settings2, X } from "lucide-react";

export function EditMachineModal({ machine }: { machine: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    machineId: machine.machineId,
    type: machine.type,
    operatorDailyPayout: machine.operatorDailyPayout,
    fuelConsumptionThreshold: machine.fuelConsumptionThreshold,
    notes: machine.notes || "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await editMachine(machine.id, {
        machineId: formData.machineId,
        type: formData.type,
        operatorDailyPayout: parseFloat(formData.operatorDailyPayout as any),
        fuelConsumptionThreshold: parseFloat(formData.fuelConsumptionThreshold as any),
        notes: formData.notes,
      });
      setIsOpen(false);
    } catch (error) {
      console.error(error);
      alert("Failed to edit machine");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="flex items-center gap-2 rounded-xl bg-indigo-500/10 px-4 py-2 text-sm font-bold text-indigo-400 border border-indigo-500/30 hover:bg-indigo-500/20 transition-all"
      >
        <Settings2 className="h-4 w-4" />
        Edit Settings
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-xl font-bold text-white mb-4">Edit Machine</h2>
            <form onSubmit={handleSubmit} className="space-y-4 text-left">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Internal Machine ID</label>
                <input
                  type="text"
                  required
                  value={formData.machineId}
                  onChange={(e) => setFormData({ ...formData, machineId: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="EXCAVATOR">Excavator</option>
                  <option value="BOOM_PUMP">Boom Pump</option>
                  <option value="LINE_PUMP">Line Pump</option>
                  <option value="CRANE">Crane</option>
                  <option value="ROLLER">Roller</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Operator Payout (₹)</label>
                <input
                  type="number"
                  required
                  step="0.01"
                  value={formData.operatorDailyPayout}
                  onChange={(e) => setFormData({ ...formData, operatorDailyPayout: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Fuel Threshold</label>
                <input
                  type="number"
                  required
                  step="0.01"
                  value={formData.fuelConsumptionThreshold}
                  onChange={(e) => setFormData({ ...formData, fuelConsumptionThreshold: e.target.value as any })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase mb-1">Notes</label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-white focus:outline-none focus:border-indigo-500"
                  rows={2}
                />
              </div>
              <div className="pt-4 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 text-sm font-bold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-bold rounded-xl disabled:opacity-50"
                >
                  {isLoading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
