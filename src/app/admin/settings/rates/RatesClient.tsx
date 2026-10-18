"use client";

import React, { useState, useTransition } from "react";
import { upsertWorkTypeRate } from "@/actions/rates";
import { Loader2, Save, IndianRupee, HardHat } from "lucide-react";

type Props = {
  initialWorkTypeRates: any[];
  initialEmployeeRoleRates: any[];
  machineTypes: string[];
  workTypes: string[];
  crewRoles: string[];
};

export default function RatesClient({ initialWorkTypeRates, initialEmployeeRoleRates, machineTypes, workTypes, crewRoles }: Props) {
  const [workRates, setWorkRates] = useState(initialWorkTypeRates);
  const [isPending, startTransition] = useTransition();

  const handleWorkRateChange = (machine: string, work: string, field: "payoutRate" | "customerCharge", value: string) => {
    const val = Number(value) || 0;
    const existingIdx = workRates.findIndex(r => r.machineType === machine && r.workType === work);
    
    let newRates = [...workRates];
    if (existingIdx >= 0) {
      newRates[existingIdx] = { ...newRates[existingIdx], [field]: val };
    } else {
      newRates.push({
        id: `temp-${Date.now()}`,
        machineType: machine,
        workType: work,
        payoutRate: field === "payoutRate" ? val : 0,
        customerCharge: field === "customerCharge" ? val : 0,
      });
    }
    setWorkRates(newRates);
  };

  const getRate = (machine: string, work: string) => {
    return workRates.find(r => r.machineType === machine && r.workType === work) || { payoutRate: 0, customerCharge: 0 };
  };

  const saveAll = () => {
    startTransition(async () => {
      for (const rate of workRates) {
        await upsertWorkTypeRate({
          machineType: rate.machineType,
          workType: rate.workType,
          payoutRate: rate.payoutRate,
          customerCharge: rate.customerCharge || 0
        });
      }
      alert("Rates successfully updated!");
    });
  };

  return (
    <div className="space-y-12 pb-24">
      {/* 1. MACHINE & WORK TYPE RATES */}
      <section className="bg-zinc-950 border border-zinc-800 rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-zinc-900 border-b border-zinc-800 p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-lg">
              <IndianRupee className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Machine & Work Type Rates</h2>
              <p className="text-xs text-zinc-500">Configure what to charge customers and what to pay contractors/operators.</p>
            </div>
          </div>
          <button 
            onClick={saveAll}
            disabled={isPending}
            className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-zinc-950 font-bold px-4 py-2 rounded-xl text-sm transition-colors"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Machine Rates
          </button>
        </div>

        <div className="p-6 overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-zinc-400 border-b border-zinc-800">
                <th className="pb-3 font-medium">Machine Type</th>
                <th className="pb-3 font-medium">Work Type</th>
                <th className="pb-3 font-medium">Operator Payout (₹)</th>
                <th className="pb-3 font-medium">Customer Charge (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {machineTypes.map(machine => (
                workTypes.map((work, idx) => {
                  const rate = getRate(machine, work);
                  return (
                    <tr key={`${machine}-${work}`} className="hover:bg-zinc-900/50 transition-colors">
                      <td className="py-4">
                        {idx === 0 ? <span className="font-bold text-white">{machine}</span> : <span className="text-zinc-600 pl-4">â†³</span>}
                      </td>
                      <td className="py-4">
                        <span className="px-2 py-1 bg-zinc-800 text-zinc-300 rounded text-xs font-medium">{work}</span>
                      </td>
                      <td className="py-4 pr-4">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">₹</span>
                          <input 
                            type="number"
                            value={rate.payoutRate || ''}
                            onChange={(e) => handleWorkRateChange(machine, work, "payoutRate", e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-8 pr-3 py-2 text-white outline-none focus:border-emerald-500"
                            placeholder="0"
                          />
                        </div>
                      </td>
                      <td className="py-4">
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500">₹</span>
                          <input 
                            type="number"
                            value={rate.customerCharge || ''}
                            onChange={(e) => handleWorkRateChange(machine, work, "customerCharge", e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-lg pl-8 pr-3 py-2 text-white outline-none focus:border-amber-500"
                            placeholder="0"
                          />
                        </div>
                      </td>
                    </tr>
                  )
                })
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 2. EMPLOYEE BASE WAGES (Informational for now) */}
      <section className="bg-zinc-950 border border-zinc-800 rounded-2xl shadow-xl overflow-hidden opacity-80">
        <div className="bg-zinc-900 border-b border-zinc-800 p-6 flex items-center gap-3">
          <div className="p-2 bg-blue-500/10 rounded-lg">
            <HardHat className="w-5 h-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Employee Role Overrides</h2>
            <p className="text-xs text-zinc-500">Employee-specific base wages. To change these, go to the Employee Directory profile.</p>
          </div>
        </div>
        <div className="p-6">
           <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {initialEmployeeRoleRates.length > 0 ? initialEmployeeRoleRates.map((role) => (
                <div key={role.id} className="p-4 border border-zinc-800 rounded-xl bg-zinc-900/50 flex justify-between items-center">
                   <div>
                      <div className="font-bold text-white text-sm">{role.employee?.name || "Unknown"}</div>
                      <div className="text-xs text-zinc-400 mt-1">{role.crewRole}</div>
                   </div>
                   <div className="font-bold text-blue-400">₹{Number(role.wagePerDay)}/day</div>
                </div>
              )) : (
                <div className="col-span-3 text-center text-zinc-500 text-sm py-4">No role overrides found. Uses default rates.</div>
              )}
           </div>
        </div>
      </section>

    </div>
  );
}
