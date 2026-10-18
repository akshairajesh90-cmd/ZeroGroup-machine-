"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Layers,
  CalendarDays,
  Globe,
  Filter,
} from "lucide-react";
import { format, addDays, subDays, parseISO, isValid } from "date-fns";

export interface DateRangeFilterBarProps {
  currentView: "today" | "yesterday" | "tomorrow" | "week" | "all" | "custom";
  selectedDateStr?: string; // YYYY-MM-DD
  dateLabel: string;
  totalDispatchesCount: number;
  totalSitesCount: number;
  basePath?: string;
}

export default function DateRangeFilterBar({
  currentView = "today",
  selectedDateStr,
  dateLabel,
  totalDispatchesCount,
  totalSitesCount,
  basePath,
}: DateRangeFilterBarProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [customInputDate, setCustomInputDate] = useState<string>(
    selectedDateStr || format(new Date(), "yyyy-MM-dd")
  );

  const navigateTo = (view: string, dateVal?: string) => {
    const params = new URLSearchParams(searchParams ? searchParams.toString() : "");
    params.set("view", view);
    if (dateVal) {
      params.set("date", dateVal);
    } else {
      params.delete("date");
    }
    const targetPath = basePath || pathname;
    router.push(`${targetPath}?${params.toString()}`);
  };

  // Step prev / next day
  const handleStepDay = (delta: number) => {
    let base: Date;
    if (currentView === "custom" && selectedDateStr) {
      const parsed = parseISO(selectedDateStr);
      base = isValid(parsed) ? parsed : new Date();
    } else if (currentView === "yesterday") {
      base = subDays(new Date(), 1);
    } else if (currentView === "tomorrow") {
      base = addDays(new Date(), 1);
    } else {
      base = new Date();
    }

    const nextDate = delta > 0 ? addDays(base, delta) : subDays(base, Math.abs(delta));
    const nextStr = format(nextDate, "yyyy-MM-dd");
    setCustomInputDate(nextStr);
    navigateTo("custom", nextStr);
  };

  const handleCustomDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setCustomInputDate(val);
    if (val) {
      navigateTo("custom", val);
    }
  };

  const presets = [
    { id: "today", label: "Today", icon: Sparkles },
    { id: "yesterday", label: "Yesterday", icon: Clock },
    { id: "tomorrow", label: "Tomorrow", icon: CalendarDays },
    { id: "week", label: "This Week", icon: Layers },
    { id: "all", label: "All Time (28 Days)", icon: Globe },
  ] as const;

  return (
    <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-3xl p-4 md:p-5 shadow-2xl space-y-4">
      {/* TOP ROW: Presets & Step Navigation */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        
        {/* PRESET CHIPS */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-black uppercase tracking-wider text-slate-500 mr-1 flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-indigo-400" /> Time Horizon:
          </span>

          {presets.map((p) => {
            const Icon = p.icon;
            const isActive = currentView === p.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => navigateTo(p.id)}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                  isActive
                    ? "bg-indigo-600 text-white border-indigo-500 shadow-md shadow-indigo-600/30 scale-[1.02]"
                    : "bg-slate-800/80 text-slate-300 border-slate-700 hover:bg-slate-700/80 hover:text-white"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-indigo-200" : "text-slate-400"}`} />
                {p.label}
              </button>
            );
          })}
        </div>

        {/* RIGHT CONTROLS: Day Stepper & Custom Date Picker */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Step Prev Day */}
          <button
            type="button"
            onClick={() => handleStepDay(-1)}
            title="Step Back 1 Day"
            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-xl text-xs font-bold transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Prev Day</span>
          </button>

          {/* Custom Date Input */}
          <div className="relative flex items-center">
            <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              type="date"
              value={customInputDate}
              onChange={handleCustomDateChange}
              className={`bg-slate-950 border pl-8 pr-3 py-1.5 rounded-xl text-xs font-bold text-white transition-all outline-none focus:ring-2 focus:ring-indigo-500 ${
                currentView === "custom"
                  ? "border-indigo-500 shadow-sm shadow-indigo-500/20 text-indigo-200"
                  : "border-slate-700 hover:border-slate-600"
              }`}
            />
          </div>

          {/* Step Next Day */}
          <button
            type="button"
            onClick={() => handleStepDay(1)}
            title="Step Forward 1 Day"
            className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 rounded-xl text-xs font-bold transition-all"
          >
            <span className="hidden sm:inline">Next Day</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* BOTTOM ROW: ACTIVE SCOPE SUMMARY BANNER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 border-t border-slate-800/80 text-xs">
        <div className="flex items-center gap-2.5 text-slate-300 font-semibold">
          <span className="flex h-2.5 w-2.5 relative">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span className="text-slate-400">Inspecting Window:</span>
          <span className="font-bold text-white bg-slate-800/90 px-2.5 py-0.5 rounded-lg border border-slate-700/60 font-mono">
            {dateLabel}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-indigo-300 font-bold bg-indigo-950/60 border border-indigo-800/50 px-2.5 py-0.5 rounded-lg">
            <span>{totalDispatchesCount}</span>
            <span className="text-indigo-400/80 font-medium">Dispatches Loaded</span>
          </div>

          <div className="flex items-center gap-1.5 text-emerald-300 font-bold bg-emerald-950/60 border border-emerald-800/50 px-2.5 py-0.5 rounded-lg">
            <span>{totalSitesCount}</span>
            <span className="text-emerald-400/80 font-medium">Active Sites</span>
          </div>
        </div>
      </div>
    </div>
  );
}
