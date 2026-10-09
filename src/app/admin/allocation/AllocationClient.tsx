"use client";

import { useState, useEffect } from "react";
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear, subYears } from "date-fns";
import { getAssetPnL, getCustomerSitePnL } from "@/actions/allocation";
import { Loader2, TrendingUp, TrendingDown, Briefcase, Truck, Calendar, MapPin, Building2, Banknote } from "lucide-react";
import { Role } from "@prisma/client";

export default function AllocationClient({ userRole }: { userRole: Role }) {
  const [activeTab, setActiveTab] = useState<"ASSET" | "CUSTOMER">("ASSET");
  
  // Date Filters
  const [dateRange, setDateRange] = useState({
    start: format(startOfMonth(new Date()), "yyyy-MM-dd"),
    end: format(endOfMonth(new Date()), "yyyy-MM-dd")
  });

  const [assetData, setAssetData] = useState<any[]>([]);
  const [customerData, setCustomerData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        if (activeTab === "ASSET") {
          const data = await getAssetPnL(dateRange.start, dateRange.end);
          setAssetData(data);
        } else {
          const data = await getCustomerSitePnL(dateRange.start, dateRange.end);
          setCustomerData(data);
        }
      } catch (err) {
        console.error("Failed to load allocation data", err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [dateRange, activeTab]);

  const handleQuickDate = (preset: "THIS_MONTH" | "LAST_MONTH" | "YTD" | "LAST_YEAR") => {
    const today = new Date();
    switch (preset) {
      case "THIS_MONTH":
        setDateRange({ start: format(startOfMonth(today), "yyyy-MM-dd"), end: format(endOfMonth(today), "yyyy-MM-dd") });
        break;
      case "LAST_MONTH":
        const lastMonth = subMonths(today, 1);
        setDateRange({ start: format(startOfMonth(lastMonth), "yyyy-MM-dd"), end: format(endOfMonth(lastMonth), "yyyy-MM-dd") });
        break;
      case "YTD":
        setDateRange({ start: format(startOfYear(today), "yyyy-MM-dd"), end: format(endOfYear(today), "yyyy-MM-dd") });
        break;
      case "LAST_YEAR":
        const lastYear = subYears(today, 1);
        setDateRange({ start: format(startOfYear(lastYear), "yyyy-MM-dd"), end: format(endOfYear(lastYear), "yyyy-MM-dd") });
        break;
    }
  };

  const isFinancialAuth = userRole === "OWNER" || userRole === "ADMIN";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-8 font-sans">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header & Global Filters */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
          <div>
            <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400 flex items-center gap-3">
              <Briefcase className="w-8 h-8 text-emerald-400" /> Job Costing & P&L
            </h1>
            <p className="text-slate-400 mt-2 text-sm font-medium max-w-xl">
              Track the exact profitability of your operations by allocating fuel, maintenance, and direct costs against billed revenue.
            </p>
          </div>

          <div className="bg-slate-900/80 backdrop-blur border border-slate-800 p-4 rounded-2xl flex flex-col gap-4 shadow-xl">
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              <button onClick={() => handleQuickDate("THIS_MONTH")} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-lg text-slate-300 transition-colors whitespace-nowrap">This Month</button>
              <button onClick={() => handleQuickDate("LAST_MONTH")} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-lg text-slate-300 transition-colors whitespace-nowrap">Last Month</button>
              <button onClick={() => handleQuickDate("YTD")} className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-bold rounded-lg text-slate-300 transition-colors whitespace-nowrap">Year to Date</button>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1 block">Start Date</label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input type="date" value={dateRange.start} onChange={e => setDateRange(prev => ({...prev, start: e.target.value}))} className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:border-emerald-500 outline-none" />
                </div>
              </div>
              <div className="flex-1">
                <label className="text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1 block">End Date</label>
                <div className="relative">
                  <Calendar className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input type="date" value={dateRange.end} onChange={e => setDateRange(prev => ({...prev, end: e.target.value}))} className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-sm text-white focus:border-emerald-500 outline-none" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex gap-2 p-1.5 bg-slate-900 border border-slate-800 rounded-2xl w-fit">
          <button 
            onClick={() => setActiveTab("ASSET")} 
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "ASSET" ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}
          >
            <Truck className="w-4 h-4" /> Asset P&L
          </button>
          <button 
            onClick={() => setActiveTab("CUSTOMER")} 
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === "CUSTOMER" ? "bg-emerald-600 text-white shadow-lg shadow-emerald-500/20" : "text-slate-400 hover:text-white hover:bg-slate-800"}`}
          >
            <Building2 className="w-4 h-4" /> Customer & Site P&L
          </button>
        </div>

        {/* Content Area */}
        <div className="bg-slate-900/60 backdrop-blur border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative min-h-[500px]">
          {loading && (
            <div className="absolute inset-0 bg-slate-950/50 backdrop-blur-sm z-10 flex flex-col items-center justify-center">
              <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mb-4" />
              <p className="text-sm font-bold text-slate-300 animate-pulse">Calculating Profitability...</p>
            </div>
          )}

          {!isFinancialAuth ? (
             <div className="flex flex-col items-center justify-center h-[500px] text-center p-8">
               <div className="w-16 h-16 bg-rose-500/10 rounded-full flex items-center justify-center mb-4 border border-rose-500/20">
                 <Banknote className="w-8 h-8 text-rose-400" />
               </div>
               <h2 className="text-xl font-black text-white mb-2">Restricted Access</h2>
               <p className="text-slate-400 max-w-sm">
                 You do not have the required permissions to view company profitability, revenue, or margins. Please contact an Administrator.
               </p>
             </div>
          ) : (
            <div className="overflow-x-auto">
              {activeTab === "ASSET" && (
                <table className="w-full text-sm text-left">
                  <thead className="text-xs uppercase bg-slate-950/80 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="px-6 py-5 font-black">Asset Name</th>
                      <th className="px-6 py-5 font-black">Type</th>
                      <th className="px-6 py-5 font-black text-right text-indigo-300">Gross Revenue</th>
                      <th className="px-6 py-5 font-black text-right text-amber-300">Fuel Costs</th>
                      <th className="px-6 py-5 font-black text-right text-rose-300">Repair Costs</th>
                      <th className="px-6 py-5 font-black text-right text-white">Net Profit</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {assetData.length === 0 && !loading && (
                      <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500">No asset data found for this period.</td></tr>
                    )}
                    {assetData.map((asset) => (
                      <tr key={asset.id} className="hover:bg-slate-800/50 transition-colors group">
                        <td className="px-6 py-4">
                          <div className="font-bold text-white text-base group-hover:text-indigo-400 transition-colors">{asset.name}</div>
                          <div className="text-[10px] uppercase font-black tracking-widest text-slate-500 mt-1">{asset.assetType}</div>
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-300">{asset.type}</td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-indigo-400">
                          ₹{asset.grossRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-amber-400">
                          - ₹{asset.fuelCosts.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-rose-400">
                          - ₹{asset.repairCosts.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono font-black text-sm border ${
                            asset.netProfit >= 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          }`}>
                            {asset.netProfit >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                            {asset.netProfit >= 0 ? '+' : '-'} ₹{Math.abs(asset.netProfit).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {activeTab === "CUSTOMER" && (
                <table className="w-full text-sm text-left">
                  <thead className="text-xs uppercase bg-slate-950/80 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="px-6 py-5 font-black">Customer Name</th>
                      <th className="px-6 py-5 font-black">Site Location</th>
                      <th className="px-6 py-5 font-black text-right text-indigo-300">Total Billed</th>
                      <th className="px-6 py-5 font-black text-right text-rose-300">Direct Costs</th>
                      <th className="px-6 py-5 font-black text-right text-white">Net Margin (₹)</th>
                      <th className="px-6 py-5 font-black text-right text-white">Margin %</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/50">
                    {customerData.length === 0 && !loading && (
                      <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-500">No job costing data found for this period.</td></tr>
                    )}
                    {customerData.map((job, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/50 transition-colors group">
                        <td className="px-6 py-4 font-bold text-white text-base group-hover:text-emerald-400 transition-colors">
                          {job.customerName}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4 text-slate-500" />
                            <span className="font-medium text-slate-300">{job.siteLocation}</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-indigo-400">
                          ₹{job.totalBilled.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-right font-mono font-bold text-rose-400">
                          - ₹{job.directCosts.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono font-black text-sm border ${
                            job.netMargin >= 0 ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          }`}>
                            {job.netMargin >= 0 ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                            {job.netMargin >= 0 ? '+' : '-'} ₹{Math.abs(job.netMargin).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </div>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <span className={`font-mono font-black ${
                            job.marginPercentage > 20 ? 'text-emerald-400' : 
                            job.marginPercentage > 0 ? 'text-amber-400' : 
                            'text-rose-400'
                          }`}>
                            {job.marginPercentage.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
