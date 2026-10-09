"use client";

import React, { useState, useEffect } from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, Truck, Wrench, ShieldAlert, Search, Filter, Clock, User, FileText } from "lucide-react";
import { getAuditLogs } from "@/actions/audit";

// Strict TypeScript interfaces defining the serialized props
interface ChartData {
  date: string;
  count: number;
}

interface DashboardMetrics {
  totalRevenue: number;
  activeDispatchesToday: number;
  availableMachines: number;
  rentedMachines: number;
  repairMachines: number;
  chartData: ChartData[];
}

export default function DashboardClient({ metrics }: { metrics: DashboardMetrics }) {
  // --- Audit Log State ---
  const [timeframe, setTimeframe] = useState<"DAY" | "WEEK" | "MONTH">("DAY");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [logs, setLogs] = useState<any[]>([]);
  const [isLogsLoading, setIsLogsLoading] = useState(false);

  // 1. Format Currency safely
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(val);
  };

  // 2. Date Formatting for Chart Tooltips
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(d);
  };

  const formatLogTime = (dateStr: string) => {
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "numeric" }).format(new Date(dateStr));
  };

  // Debounce search term
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedSearch(searchTerm), 500);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Fetch logs when timeframe or search changes
  useEffect(() => {
    async function fetchLogs() {
      setIsLogsLoading(true);
      const result = await getAuditLogs({ timeframe, searchTerm: debouncedSearch });
      if (result.success) {
        setLogs(result.data);
      }
      setIsLogsLoading(false);
    }
    fetchLogs();
  }, [timeframe, debouncedSearch]);

  const getBadgeColor = (actionType: string) => {
    if (actionType.includes("CREATE")) return "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30";
    if (actionType.includes("DELETE")) return "bg-rose-500/20 text-rose-400 border border-rose-500/30";
    if (actionType.includes("UPDATE")) return "bg-blue-500/20 text-blue-400 border border-blue-500/30";
    return "bg-slate-700 text-slate-300";
  };

  return (
    <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-emerald-400" />
            Staff Operations Dashboard
          </h1>
          <p className="text-slate-400 mt-2 text-sm font-medium">
            Real-time operations, fleet utilization, and live team activity feed.
          </p>
        </div>
      </div>

      {/* METRICS GRID - Glassmorphic Dark Mode */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Revenue */}
        <div className="bg-slate-900/80 backdrop-blur-md border border-emerald-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden group hover:border-emerald-500/60 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <TrendingUp className="w-24 h-24 text-emerald-500" />
          </div>
          <p className="text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">Confirmed Cash</p>
          <h2 className="text-3xl font-black text-white">{formatCurrency(metrics.totalRevenue)}</h2>
          <p className="text-slate-400 text-xs mt-2">Deposited and verified</p>
        </div>

        {/* Metric 2: Active Dispatches */}
        <div className="bg-slate-900/80 backdrop-blur-md border border-amber-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden group hover:border-amber-500/60 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Truck className="w-24 h-24 text-amber-500" />
          </div>
          <p className="text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">Active Jobs Today</p>
          <h2 className="text-3xl font-black text-white">{metrics.activeDispatchesToday}</h2>
          <p className="text-slate-400 text-xs mt-2">Pending, En-Route, or On-Site</p>
        </div>

        {/* Metric 3: Available Fleet */}
        <div className="bg-slate-900/80 backdrop-blur-md border border-blue-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden group hover:border-blue-500/60 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Wrench className="w-24 h-24 text-blue-500" />
          </div>
          <p className="text-blue-400 text-xs font-bold uppercase tracking-wider mb-2">Available Fleet</p>
          <h2 className="text-3xl font-black text-white">{metrics.availableMachines}</h2>
          <p className="text-slate-400 text-xs mt-2">{metrics.rentedMachines} currently rented</p>
        </div>

        {/* Metric 4: Repairs / Alerts */}
        <div className="bg-slate-900/80 backdrop-blur-md border border-rose-500/30 rounded-2xl p-6 shadow-xl relative overflow-hidden group hover:border-rose-500/60 transition-colors">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <ShieldAlert className="w-24 h-24 text-rose-500" />
          </div>
          <p className="text-rose-400 text-xs font-bold uppercase tracking-wider mb-2">Fleet In Repair</p>
          <h2 className="text-3xl font-black text-white">{metrics.repairMachines}</h2>
          <p className="text-slate-400 text-xs mt-2">Requires immediate attention</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* CHARTS SECTION */}
        <div className="lg:col-span-2 bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-2xl">
          <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-indigo-400" />
            7-Day Dispatch Volume
          </h3>
          
          <div className="h-[400px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={metrics.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                <XAxis 
                  dataKey="date" 
                  stroke="#64748b" 
                  fontSize={12} 
                  tickFormatter={(val: any) => formatDate(val as string)}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis 
                  stroke="#64748b" 
                  fontSize={12}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip 
                  cursor={{ fill: '#1e293b' }}
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '0.75rem', color: '#fff' }}
                  labelFormatter={(label: any) => formatDate(label as string)}
                />
                <Bar 
                  dataKey="count" 
                  fill="#4f46e5" 
                  radius={[4, 4, 0, 0]} 
                  name="Dispatches"
                  animationDuration={1500}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* TEAM ACTIVITY LOG */}
        <div className="lg:col-span-1 bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col h-[500px]">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-indigo-400" />
              Live Team Activity Feed
            </div>
            {isLogsLoading && <div className="w-4 h-4 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />}
          </h3>

          {/* Filters */}
          <div className="space-y-3 mb-4">
            <div className="flex items-center gap-2 bg-slate-950 p-1 rounded-xl">
              <button 
                onClick={() => setTimeframe("DAY")}
                className={`flex-1 text-xs py-1.5 rounded-lg transition-colors ${timeframe === "DAY" ? "bg-slate-800 text-white font-semibold" : "text-slate-400 hover:text-slate-300"}`}
              >
                Today
              </button>
              <button 
                onClick={() => setTimeframe("WEEK")}
                className={`flex-1 text-xs py-1.5 rounded-lg transition-colors ${timeframe === "WEEK" ? "bg-slate-800 text-white font-semibold" : "text-slate-400 hover:text-slate-300"}`}
              >
                Week
              </button>
              <button 
                onClick={() => setTimeframe("MONTH")}
                className={`flex-1 text-xs py-1.5 rounded-lg transition-colors ${timeframe === "MONTH" ? "bg-slate-800 text-white font-semibold" : "text-slate-400 hover:text-slate-300"}`}
              >
                Month
              </button>
            </div>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                type="text" 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search action, name, payload..."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50"
              />
            </div>
          </div>

          {/* Log Feed */}
          <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
            {logs.length === 0 && !isLogsLoading ? (
              <div className="text-center text-slate-500 py-10 text-sm">
                No team activity found for this timeframe/search.
              </div>
            ) : (
              logs.map((log) => (
                <div key={log.id} className="p-3 bg-slate-950 rounded-xl border border-slate-800/50 group hover:border-slate-700 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${getBadgeColor(log.actionType)}`}>
                      {log.actionType}
                    </span>
                    <span className="text-[10px] text-slate-500 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatLogTime(log.timestamp)}
                    </span>
                  </div>
                  
                  <div className="text-sm text-slate-300 mb-1">
                    <span className="text-white font-semibold flex items-center gap-1.5 inline-flex">
                      <User className="w-3 h-3 text-indigo-400" />
                      {log.actor?.name || "System"}
                    </span> modified <span className="text-indigo-300 font-medium">{log.modelName}</span>.
                  </div>

                  {log.newPayload && (
                    <div className="mt-2 bg-slate-900 rounded p-2 text-xs font-mono text-slate-400 overflow-hidden text-ellipsis whitespace-nowrap">
                      {JSON.stringify(log.newPayload)}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>

        </div>
      </div>
      
    </div>
  );
}
