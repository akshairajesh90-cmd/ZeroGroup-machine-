"use client";

import React, { useState, useTransition } from "react";
import { updateEmployeeFinancials } from "@/actions/employees";
import { Loader2, X, AlertTriangle } from "lucide-react";
import { z } from "zod";

interface EmployeeUI {
  id: string;
  name: string;
  role: string;
  baseDailyWage: number;
  dailyBataRate: number;
  defaultCrewRole?: string | null;
}

const formSchema = z.object({
  baseDailyWage: z.number().min(0, "Must be positive"),
  dailyBataRate: z.number().min(0, "Must be positive"),
});

export default function EditWageModal({ employee, onClose }: { employee: EmployeeUI; onClose: () => void }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [baseWage, setBaseWage] = useState(employee.baseDailyWage.toString());
  const [bataRate, setBataRate] = useState(employee.dailyBataRate.toString());
  const [crewRole, setCrewRole] = useState(employee.defaultCrewRole || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const parsed = formSchema.safeParse({
      baseDailyWage: Number(baseWage),
      dailyBataRate: Number(bataRate),
    });

    if (!parsed.success) {
      setError("Please enter valid positive numbers.");
      return;
    }

    startTransition(async () => {
      try {
        await updateEmployeeFinancials(
          employee.id,
          parsed.data.baseDailyWage,
          parsed.data.dailyBataRate,
          crewRole === "" ? null : crewRole
        );
        onClose();
      } catch (err: any) {
        setError(err.message || "Failed to update rates.");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex justify-between items-center p-5 border-b border-slate-800 bg-slate-950/50">
          <div>
            <h3 className="font-bold text-white text-lg">Edit Profile & Financials</h3>
            <p className="text-[11px] text-slate-400 font-mono mt-0.5">{employee.name} • {employee.role}</p>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="flex items-start gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
              <p className="text-xs text-red-400">{error}</p>
            </div>
          )}

          <div>
            <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">
              Default Crew Role
            </label>
            <select
              value={crewRole}
              onChange={(e) => setCrewRole(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-mono"
            >
              <option value="">No Default</option>
              <option value="MIXER_OPERATOR">Mixer Operator</option>
              <option value="HYDRAULIC_OPERATOR">Hydraulic Operator</option>
              <option value="VIBRATOR_OPERATOR">Vibrator Operator</option>
              <option value="LIFT_OPERATOR">Lift Operator</option>
              <option value="WORKER_LEADER">Worker Leader</option>
              <option value="SUB_LEADER">Sub Leader</option>
              <option value="PANI_HELPER">Helper</option>
              <option value="TROLLY_1_WHEEL">Trolly 1-Wheel</option>
              <option value="TROLLY_2_WHEEL">Trolly 2-Wheel</option>
            </select>
          </div>

          <div>
            <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">
              Base Daily Wage (?) *
            </label>
            <input
              type="number"
              min="0"
              required
              value={baseWage}
              onChange={(e) => setBaseWage(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-mono"
            />
          </div>

          <div>
            <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">
              Daily Bata Rate (?) *
            </label>
            <input
              type="number"
              min="0"
              required
              value={bataRate}
              onChange={(e) => setBataRate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-mono"
            />
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-end gap-3 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl font-bold text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-blue-600/50 text-white rounded-xl font-bold text-sm flex items-center gap-2 transition-colors shadow-lg shadow-blue-500/20"
            >
              {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
