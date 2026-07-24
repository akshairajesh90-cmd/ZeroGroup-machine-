"use client";

import React from "react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { TrendingUp, Truck, Wrench, ShieldAlert } from "lucide-react";

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

  return (
    <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-emerald-400" />
            Executive Analytics
          </h1>
          <p className="text-slate-400 mt-2 text-sm font-medium">
            Real-time operations, fleet utilization, and financial overview.
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

      {/* CHARTS SECTION - STRICTLY 2D */}
      <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-2xl">
        <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-indigo-400" />
          7-Day Dispatch Volume
        </h3>
        
        <div className="h-[300px] w-full">
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
      
    </div>
  );
}
