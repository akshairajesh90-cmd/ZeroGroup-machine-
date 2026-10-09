"use client";
import React, { useState } from "react";
import { Users, AlertCircle, Edit2, ShieldAlert } from "lucide-react";
import EditWageModal from "./EditWageModal";

interface EmployeeUI {
  id: string;
  name: string;
  role: string;
  baseDailyWage: number;
  dailyBataRate: number;
  fixedSalary: number;
  defaultCrewRole?: string | null;
}

export default function EmployeeDashboardClient({ employees }: { employees: EmployeeUI[] }) {
  const [editingEmployee, setEditingEmployee] = useState<EmployeeUI | null>(null);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 pb-20">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-xl gap-4">
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
              <Users className="w-6 h-6 text-blue-400" />
              Employee Financial Management
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Manage workforce base wages and daily bata rates. All changes are strictly audited.
            </p>
          </div>
          
          <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-4 py-2 rounded-xl">
            <ShieldAlert className="w-4 h-4 text-blue-400" />
            <span className="text-xs text-blue-300 font-bold">Ghost Raise Prevention Active</span>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md bg-white/5">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 text-[10px] font-black uppercase tracking-wider">
                  <th className="p-4">Name</th>
                  <th className="p-4">Role</th>
                  <th className="p-4 text-right">Base Daily Wage (₹)</th>
                  <th className="p-4 text-right">Daily Bata Rate (₹)</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {employees.map(emp => {
                  const isFieldWorker = emp.role === "OPERATOR" || emp.role === "DRIVER" || emp.role === "HELPER" || emp.role === "WORKER";
                  const missingWage = isFieldWorker && emp.baseDailyWage === 0;

                  return (
                    <tr key={emp.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="p-4 font-bold text-slate-200 text-sm flex items-center gap-2">
                        {emp.name}
                        {missingWage && (
                          <span title="Missing base daily wage"><AlertCircle className="w-4 h-4 text-red-500" /></span>
                        )}
                      </td>
                      <td className="p-4 font-mono text-[11px] text-slate-400">
                        {emp.role}<br/>
                        <span className="text-emerald-500 font-bold">{emp.defaultCrewRole?.replace('_', ' ') || '-'}</span>
                      </td>
                      <td className={`p-4 text-right font-mono font-bold text-sm ${missingWage ? "bg-red-500/10 text-red-400 border-l border-red-500/50" : "text-emerald-400"}`}>
                        ₹{emp.baseDailyWage.toLocaleString()}
                      </td>
                      <td className="p-4 text-right font-mono text-slate-300">
                        ₹{emp.dailyBataRate.toLocaleString()}
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => setEditingEmployee(emp)}
                          className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-blue-400 rounded-lg flex items-center gap-1.5 mx-auto font-bold text-[11px] transition-colors"
                        >
                          <Edit2 className="w-3.5 h-3.5" /> Edit Rates
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {editingEmployee && (
        <EditWageModal
          employee={editingEmployee}
          onClose={() => setEditingEmployee(null)}
        />
      )}
    </div>
  )
}
