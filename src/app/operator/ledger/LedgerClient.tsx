"use client";

import React, { useState } from "react";
import { format, startOfWeek, endOfWeek, parseISO, isSameWeek, isWithinInterval } from "date-fns";
import { 
  Banknote, Calendar, Briefcase, MapPin, BadgeIndianRupee, CheckCircle2 
} from "lucide-react";

interface LedgerClientProps {
  workerSummary: any;
  rawShifts: any[];
  advances: any[];
  settlements: any[];
}

export default function LedgerClient({ workerSummary, rawShifts, advances, settlements }: LedgerClientProps) {
  const [activeTab, setActiveTab] = useState<"DAILY" | "WEEKLY">("DAILY");

  if (!workerSummary && rawShifts.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl text-center">
        <p className="text-slate-400 font-bold">No ledger history found for the last 30 days.</p>
      </div>
    );
  }

  // 1. DAILY VIEW
  const renderDaily = () => {
    if (rawShifts.length === 0) {
      return <div className="text-center text-slate-400 py-6 font-bold">No shifts recorded.</div>;
    }

    return (
      <div className="space-y-4">
        {rawShifts.map((shift, i) => (
          <div key={i} className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex items-center justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-400">
                <Calendar className="w-3.5 h-3.5" />
                {format(new Date(shift.date), "EEE, MMM do yyyy")}
              </div>
              <h3 className="text-sm font-black text-white">{shift.jobDescription || "Independent Shift"}</h3>
              {shift.siteLocation && (
                <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500">
                  <MapPin className="w-3 h-3" />
                  {shift.siteLocation}
                </div>
              )}
            </div>
            <div className="text-right">
              <div className="text-sm font-black text-emerald-400">
                ₹{shift.wageEarned}
              </div>
              <div className="text-[10px] font-bold text-slate-500 uppercase">Wage Earned</div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // 2. WEEKLY VIEW
  const renderWeekly = () => {
    // Group shifts into weeks (Sunday - Saturday)
    const weeksMap = new Map<string, { start: Date, end: Date, shifts: any[], advances: any[], settled: any }>();

    rawShifts.forEach(shift => {
      const date = new Date(shift.date);
      const weekStart = startOfWeek(date, { weekStartsOn: 0 }); // Sunday start
      const weekEnd = endOfWeek(date, { weekStartsOn: 0 });
      const weekKey = `${format(weekStart, "yyyy-MM-dd")}_${format(weekEnd, "yyyy-MM-dd")}`;

      if (!weeksMap.has(weekKey)) {
        weeksMap.set(weekKey, { start: weekStart, end: weekEnd, shifts: [], advances: [], settled: null });
      }
      weeksMap.get(weekKey)!.shifts.push(shift);
    });

    // Attach advances to the correct week
    advances.forEach(adv => {
      const date = new Date(adv.date);
      const weekStart = startOfWeek(date, { weekStartsOn: 0 });
      const weekEnd = endOfWeek(date, { weekStartsOn: 0 });
      const weekKey = `${format(weekStart, "yyyy-MM-dd")}_${format(weekEnd, "yyyy-MM-dd")}`;
      
      if (weeksMap.has(weekKey)) {
        weeksMap.get(weekKey)!.advances.push(adv);
      } else {
        // Advance occurred on a week with no shifts, still create it
        weeksMap.set(weekKey, { start: weekStart, end: weekEnd, shifts: [], advances: [adv], settled: null });
      }
    });

    // Check for settlements matching the period
    settlements.forEach(set => {
      const weekStart = startOfWeek(new Date(set.periodStart), { weekStartsOn: 0 });
      const weekEnd = endOfWeek(new Date(set.periodEnd), { weekStartsOn: 0 });
      const weekKey = `${format(weekStart, "yyyy-MM-dd")}_${format(weekEnd, "yyyy-MM-dd")}`;
      if (weeksMap.has(weekKey)) {
        weeksMap.get(weekKey)!.settled = set;
      }
    });

    const weeks = Array.from(weeksMap.values()).sort((a, b) => b.start.getTime() - a.start.getTime());

    if (weeks.length === 0) {
      return <div className="text-center text-slate-400 py-6 font-bold">No weekly data recorded.</div>;
    }

    return (
      <div className="space-y-6">
        {weeks.map((week, idx) => {
          const totalEarned = week.shifts.reduce((acc, s) => acc + (s.wageEarned || 0), 0);
          const totalAdvances = week.advances.reduce((acc, a) => acc + (a.amount || 0), 0);
          const netBalance = totalEarned - totalAdvances;

          return (
            <div key={idx} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl relative overflow-hidden">
              {week.settled && (
                <div className="absolute top-0 right-0 bg-emerald-600 text-white font-black text-[10px] uppercase px-3 py-1 rounded-bl-xl flex items-center gap-1 shadow-lg">
                  <CheckCircle2 className="w-3 h-3" />
                  PAID on {format(new Date(week.settled.settledAt), "MMM do")}
                </div>
              )}

              <div className="mb-4 border-b border-slate-800 pb-3">
                <h3 className="text-sm font-bold text-blue-400">
                  {format(week.start, "MMM do")} - {format(week.end, "MMM do, yyyy")}
                </h3>
                <p className="text-xs text-slate-400 font-semibold">{week.shifts.length} Shifts Recorded</p>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-300">Total Wages Earned</span>
                  <span className="text-sm font-black text-white">₹{totalEarned}</span>
                </div>
                
                {week.advances.length > 0 && (
                  <div className="flex justify-between items-center text-rose-400">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold">Mid-Week Advances</span>
                      <span className="text-[10px] px-1.5 py-0.5 bg-rose-500/20 rounded font-black border border-rose-500/30">
                        ({week.advances.length})
                      </span>
                    </div>
                    <span className="text-sm font-black">- ₹{totalAdvances}</span>
                  </div>
                )}
                
                <div className="pt-3 border-t border-slate-800 flex justify-between items-center">
                  <span className="text-xs font-black text-emerald-400 uppercase tracking-wide">Net Weekly Balance</span>
                  <span className={`text-xl font-black ${netBalance >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    ₹{netBalance}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <div className="bg-blue-600 rounded-3xl p-6 text-white shadow-xl shadow-blue-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-6 opacity-20">
          <BadgeIndianRupee className="w-24 h-24" />
        </div>
        <div className="relative z-10">
          <h2 className="text-sm font-bold text-blue-200 mb-1">Total Labor Earned (30 Days)</h2>
          <p className="text-4xl font-black">₹{workerSummary?.laborEarned || 0}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-slate-900 border border-slate-800 rounded-full p-1 shadow-lg">
        <button
          onClick={() => setActiveTab("DAILY")}
          className={`flex-1 py-2.5 rounded-full text-xs font-black uppercase transition-all ${
            activeTab === "DAILY" ? "bg-slate-700 text-white shadow" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Daily View
        </button>
        <button
          onClick={() => setActiveTab("WEEKLY")}
          className={`flex-1 py-2.5 rounded-full text-xs font-black uppercase transition-all ${
            activeTab === "WEEKLY" ? "bg-slate-700 text-white shadow" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Weekly Settlements
        </button>
      </div>

      {/* Content */}
      <div className="pt-2">
        {activeTab === "DAILY" ? renderDaily() : renderWeekly()}
      </div>
    </div>
  );
}
