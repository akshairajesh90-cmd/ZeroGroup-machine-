"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import {
  TrendingUp,
  Truck,
  Wrench,
  ShieldAlert,
  Search,
  Clock,
  User,
  FileText,
  Users,
  KeyRound,
  ShieldCheck,
  Wallet,
  Receipt,
  CalendarDays,
  Briefcase,
  MapPin,
  ArrowUpRight,
  Plus,
  HardHat,
  ChevronRight,
  AlertCircle,
  CheckCircle2,
  SlidersHorizontal,
  DollarSign,
  Sparkles
} from "lucide-react";
import { getAuditLogs } from "@/actions/audit";

interface ChartData {
  date: string;
  count: number;
}

interface RecentJob {
  id: string;
  customerName: string;
  location: string;
  status: string;
  charge: number;
}

interface DashboardMetrics {
  heading1: {
    bookings: {
      totalToday: number;
      pending: number;
      enRoute: number;
      onSite: number;
      completed: number;
      recentJobs: RecentJob[];
    };
    cashCollections: {
      totalVerifiedDeposits: number;
      pendingDropsCount: number;
      pendingDropsAmount: number;
    };
    expenses: {
      totalToday: number;
      diesel: number;
      outsideLabor: number;
      storeMaterials: number;
      other: number;
      dailyBudgetLimit: number;
    };
    billing: {
      invoicedToday: number;
      invoicesCountToday: number;
      unbilledDispatchesCount: number;
    };
    pnl: {
      revenue: number;
      labor: number;
      expenses: number;
      margin: number;
    };
  };
  heading2: {
    tools: {
      totalInventory: number;
      deployedOnSite: number;
      availableInStore: number;
    };
    fleet: {
      machines: {
        total: number;
        available: number;
        rented: number;
        repair: number;
      };
      vehicles: {
        total: number;
        available: number;
        inUse: number;
        repair: number;
      };
    };
  };
  heading3: {
    userCredentialsCount: number;
    openMaintenanceTickets: number;
    complianceAlerts: number;
    sampleRates: { machineType: string; workType: string; payoutRate: number }[];
    chartData: ChartData[];
  };
}

export default function DashboardClient({ metrics }: { metrics: DashboardMetrics }) {
  const { heading1, heading2, heading3 } = metrics;

  // --- Audit Log State ---
  const [timeframe, setTimeframe] = useState<"DAY" | "WEEK" | "MONTH">("DAY");
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [logs, setLogs] = useState<any[]>([]);
  const [isLogsLoading, setIsLogsLoading] = useState(false);

  // Format Currency (INR)
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  // Date Formatting for Tooltips
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(d);
  };

  const formatLogTime = (dateStr: string) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "numeric"
    }).format(new Date(dateStr));
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
      if (result?.success && result.data) {
        setLogs(result.data as any[]);
      } else {
        console.error("Audit log fetch failed or returned undefined:", result);
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "PENDING":
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/30">Pending</span>;
      case "EN_ROUTE":
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">En Route</span>;
      case "ACCEPTED":
      case "IN_PROGRESS":
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/30">On Site</span>;
      case "DELIVERED":
      case "COMPLETED":
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">Delivered</span>;
      default:
        return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">{status}</span>;
    }
  };

  // Calculate percentage of budget used
  const budgetPercent = Math.min(100, Math.round((heading1.expenses.totalToday / (heading1.expenses.dailyBudgetLimit || 35000)) * 100));

  return (
    <div className="p-4 md:p-8 space-y-10 animate-in fade-in duration-500 max-w-7xl mx-auto">
      
      {/* ========================================================================= */}
      {/* TOP HEADER SECTION */}
      {/* ========================================================================= */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">Zero Group Operations</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-emerald-400" />
            Staff Operations Dashboard
          </h1>
          <p className="text-slate-400 mt-1 text-sm font-medium">
            Real-time daily operations, end-to-end money flow, equipment logistics, and workforce command center.
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            href="/staff/dispatch/new"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/20 border border-emerald-400/30 transition-all active:scale-95"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Dispatch</span>
          </Link>
          <Link
            href="/staff/credentials"
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs border border-slate-700 transition-all active:scale-95"
          >
            <KeyRound className="w-3.5 h-3.5 text-amber-400" />
            <span>IDs & Logins</span>
          </Link>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* HEADING 1: DAILY BOOKINGS, COLLECTING MONEY, EXPENSES & BILLING */}
      {/* ========================================================================= */}
      <section className="space-y-5">
        
        {/* Heading 1 Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/70 border-l-4 border-emerald-500 p-4 rounded-2xl border border-slate-800 shadow-lg">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Heading 1 • Core Engine
              </span>
            </div>
            <h2 className="text-xl font-black text-white mt-1 flex items-center gap-2">
              <CalendarDays className="w-5 h-5 text-emerald-400" />
              Daily Bookings, Collecting Money, Expenses & Billing
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Live dispatches, driver cash collections, site fuel & store expenses (money out), and customer billing.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/staff/orders"
              className="text-xs font-bold text-emerald-400 hover:text-emerald-300 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-1.5 transition-colors"
            >
              <Briefcase className="w-3.5 h-3.5" />
              Dispatch Board
            </Link>
            <Link
              href="/staff/dispatch"
              className="text-xs font-bold text-slate-300 hover:text-white px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-1.5 transition-colors"
            >
              Daily Dispatches
            </Link>
          </div>
        </div>

        {/* 1. Active Jobs Status Bar */}
        <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-4 shadow-xl">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              Today's Jobs Status Pipeline ({heading1.bookings.totalToday} Total)
            </span>
            <span className="text-xs text-slate-400">Real-time status</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-slate-950/80 p-3 rounded-xl border border-amber-500/20 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">Pending</p>
                <p className="text-2xl font-black text-white">{heading1.bookings.pending}</p>
              </div>
              <span className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center text-amber-400 font-bold text-xs">
                ⏳
              </span>
            </div>

            <div className="bg-slate-950/80 p-3 rounded-xl border border-cyan-500/20 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider">En-Route</p>
                <p className="text-2xl font-black text-white">{heading1.bookings.enRoute}</p>
              </div>
              <span className="h-8 w-8 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400 font-bold text-xs">
                🚚
              </span>
            </div>

            <div className="bg-slate-950/80 p-3 rounded-xl border border-blue-500/20 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider">On-Site / Pouring</p>
                <p className="text-2xl font-black text-white">{heading1.bookings.onSite}</p>
              </div>
              <span className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400 font-bold text-xs">
                🏗️
              </span>
            </div>

            <div className="bg-slate-950/80 p-3 rounded-xl border border-emerald-500/20 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Completed / Delivered</p>
                <p className="text-2xl font-black text-white">{heading1.bookings.completed}</p>
              </div>
              <span className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-400 font-bold text-xs">
                ✅
              </span>
            </div>
          </div>
        </div>

        {/* 2. Grid of 4 Core Money Flow & Bookings Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Daily Bookings & Dispatches */}
          <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-5 shadow-xl hover:border-emerald-500/40 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase text-slate-400 flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5 text-emerald-400" />
                  Daily Bookings
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {heading1.bookings.totalToday} Today
                </span>
              </div>
              <h3 className="text-3xl font-black text-white">{heading1.bookings.totalToday} Dispatches</h3>
              <p className="text-xs text-slate-400 mt-1">Booked for today&apos;s operations</p>

              {/* Recent Jobs Preview */}
              <div className="mt-4 space-y-1.5">
                {heading1.bookings.recentJobs.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-2">No active jobs scheduled for today.</p>
                ) : (
                  heading1.bookings.recentJobs.map((job) => (
                    <div key={job.id} className="p-2 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between text-xs">
                      <div className="truncate max-w-[130px]">
                        <p className="font-bold text-slate-200 truncate">{job.customerName}</p>
                        <p className="text-[10px] text-slate-500 truncate">{job.location}</p>
                      </div>
                      {getStatusBadge(job.status)}
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center gap-2">
              <Link
                href="/staff/dispatch/new"
                className="flex-1 py-1.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs text-center transition-all shadow"
              >
                + New Dispatch
              </Link>
              <Link
                href="/staff/orders"
                className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs transition-colors"
              >
                Board
              </Link>
            </div>
          </div>

          {/* Card 2: Collecting Money (Cash Collections) */}
          <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-5 shadow-xl hover:border-emerald-500/40 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase text-slate-400 flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                  Collecting Money
                </span>
                {heading1.cashCollections.pendingDropsCount > 0 ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    {heading1.cashCollections.pendingDropsCount} Drops Pending
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                    Balanced
                  </span>
                )}
              </div>
              <h3 className="text-3xl font-black text-white">{formatCurrency(heading1.cashCollections.totalVerifiedDeposits)}</h3>
              <p className="text-xs text-emerald-400 font-medium mt-1">Verified cash deposited</p>

              <div className="mt-4 p-3 rounded-xl bg-slate-950/80 border border-amber-500/20 space-y-1.5">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Driver Site Drops:</span>
                  <span className="font-bold text-amber-400">{formatCurrency(heading1.cashCollections.pendingDropsAmount)}</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Pending Verification:</span>
                  <span className="font-bold text-slate-200">{heading1.cashCollections.pendingDropsCount} receipts</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800">
              <Link
                href="/staff/cash"
                className="w-full py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold text-xs border border-emerald-500/20 flex items-center justify-center gap-1.5 transition-all"
              >
                Cash Collections Hub <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Card 3: Expenses & Store (USER HIGHLIGHTED PRIMARY MONEY FLOW) */}
          <div className="bg-slate-900/90 backdrop-blur-md border-2 border-indigo-500/40 rounded-2xl p-5 shadow-xl hover:border-indigo-500 transition-all flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 bg-indigo-600 text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-bl-lg text-white">
              Primary Money Flow Out
            </div>
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase text-indigo-300 flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-indigo-400" />
                  Expenses & Store
                </span>
              </div>
              <h3 className="text-3xl font-black text-white">{formatCurrency(heading1.expenses.totalToday)}</h3>
              <p className="text-xs text-rose-400 font-medium mt-1">Total money spent today</p>

              {/* Expense Breakdown */}
              <div className="mt-3 space-y-1.5 text-xs">
                <div className="flex justify-between py-1 border-b border-slate-800/80 text-slate-300">
                  <span>• Diesel / Site Fuel</span>
                  <span className="font-bold text-rose-400">{formatCurrency(heading1.expenses.diesel)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/80 text-slate-300">
                  <span>• External Labor / Helpers</span>
                  <span className="font-bold text-rose-400">{formatCurrency(heading1.expenses.outsideLabor)}</span>
                </div>
                <div className="flex justify-between py-1 border-b border-slate-800/80 text-slate-300">
                  <span>• Store Parts / Workshop</span>
                  <span className="font-bold text-rose-400">{formatCurrency(heading1.expenses.storeMaterials)}</span>
                </div>
              </div>

              {/* Budget tracker progress */}
              <div className="mt-3">
                <div className="flex justify-between text-[10px] text-slate-400 mb-1">
                  <span>Daily Budget (₹35k)</span>
                  <span>{budgetPercent}% Used</span>
                </div>
                <div className="w-full bg-slate-950 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      budgetPercent > 90 ? "bg-rose-500" : budgetPercent > 70 ? "bg-amber-500" : "bg-emerald-500"
                    }`}
                    style={{ width: `${budgetPercent}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800">
              <Link
                href="/staff/expenses"
                className="w-full py-1.5 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md"
              >
                Manage Expenses & Store <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Card 4: Billing, Invoices & Settlements */}
          <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-5 shadow-xl hover:border-emerald-500/40 transition-all flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase text-slate-400 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-400" />
                  Billing & Invoices
                </span>
                {heading1.billing.unbilledDispatchesCount > 0 ? (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    {heading1.billing.unbilledDispatchesCount} Unbilled
                  </span>
                ) : (
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                    Up to date
                  </span>
                )}
              </div>
              <h3 className="text-3xl font-black text-white">{formatCurrency(heading1.billing.invoicedToday)}</h3>
              <p className="text-xs text-slate-400 mt-1">Invoiced today ({heading1.billing.invoicesCountToday} bills)</p>

              <div className="mt-4 space-y-2 text-xs">
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                  <span className="text-slate-400">Delivered Unbilled Jobs:</span>
                  <span className="font-bold text-amber-400">{heading1.billing.unbilledDispatchesCount} Dispatches</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                  <span className="text-slate-400">Weekly Settlements:</span>
                  <Link href="/staff/settlements" className="font-bold text-indigo-400 hover:underline">
                    View Ledger →
                  </Link>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-800 flex items-center gap-2">
              <Link
                href="/staff/invoices"
                className="flex-1 py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs text-center transition-all"
              >
                Invoices Hub
              </Link>
              <Link
                href="/staff/settlements"
                className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs text-center transition-all"
              >
                Settlements
              </Link>
            </div>
          </div>

        </div>

        {/* 3. Real-Time Daily P&L Command Center Widget */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-indigo-950/40 border border-slate-800 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="flex-1">
              <p className="text-indigo-400 text-xs font-bold uppercase tracking-wider mb-2 flex items-center gap-2">
                <Sparkles className="w-4 h-4" /> Real-Time Daily P&L Command Center
              </p>
              <h2 className="text-4xl font-black text-white">{formatCurrency(heading1.pnl.margin)}</h2>
              <p className="text-slate-400 text-sm mt-1">Real-time Net Gross Margin Today (Revenue - Labor - Expenses)</p>
            </div>
            
            <div className="flex-1 w-full flex flex-wrap items-center justify-between md:justify-end gap-6 border-t md:border-t-0 md:border-l border-slate-700/50 pt-4 md:pt-0 md:pl-8">
              <div>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Est. Revenue</p>
                <p className="text-emerald-400 font-bold text-xl">{formatCurrency(heading1.pnl.revenue)}</p>
              </div>
              <div className="text-slate-600 text-xl font-bold">-</div>
              <div>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Labor Wages</p>
                <p className="text-amber-400 font-bold text-xl">{formatCurrency(heading1.pnl.labor)}</p>
              </div>
              <div className="text-slate-600 text-xl font-bold">-</div>
              <div>
                <p className="text-slate-500 text-xs font-bold uppercase tracking-wider">Expenses & Store</p>
                <p className="text-rose-400 font-bold text-xl">{formatCurrency(heading1.pnl.expenses)}</p>
              </div>
            </div>
          </div>
        </div>

      </section>


      {/* ========================================================================= */}
      {/* HEADING 2: TOOLS INVENTORY & FLEET MANAGEMENT */}
      {/* ========================================================================= */}
      <section className="space-y-5">
        
        {/* Heading 2 Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/70 border-l-4 border-amber-500 p-4 rounded-2xl border border-slate-800 shadow-lg">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                Heading 2 • Physical Assets & Logistics
              </span>
            </div>
            <h2 className="text-xl font-black text-white mt-1 flex items-center gap-2">
              <Wrench className="w-5 h-5 text-amber-400" />
              Tools Inventory & Fleet Management
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Small tools and equipment tracking, heavy machinery utilization, and fleet vehicles on-road status.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/staff/tools"
              className="text-xs font-bold text-amber-400 hover:text-amber-300 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-1.5 transition-colors"
            >
              <Wrench className="w-3.5 h-3.5" />
              Tools Registry
            </Link>
            <Link
              href="/staff/fleet"
              className="text-xs font-bold text-slate-300 hover:text-white px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-1.5 transition-colors"
            >
              <Truck className="w-3.5 h-3.5" />
              Fleet Manager
            </Link>
          </div>
        </div>

        {/* Heading 2 Grid (Tools & Fleet) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

          {/* Tools Inventory Card */}
          <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase text-slate-400 flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-amber-400" />
                  Small Tools & Asset Inventory
                </span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  {heading2.tools.totalInventory} Assets Registered
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-6">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800/80 text-center">
                  <p className="text-[10px] text-slate-500 uppercase font-bold">Total Items</p>
                  <p className="text-2xl font-black text-white mt-1">{heading2.tools.totalInventory}</p>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-blue-500/20 text-center">
                  <p className="text-[10px] text-blue-400 uppercase font-bold">On Active Sites</p>
                  <p className="text-2xl font-black text-blue-400 mt-1">{heading2.tools.deployedOnSite}</p>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-emerald-500/20 text-center">
                  <p className="text-[10px] text-emerald-400 uppercase font-bold">In Store</p>
                  <p className="text-2xl font-black text-emerald-400 mt-1">{heading2.tools.availableInStore}</p>
                </div>
              </div>

              <p className="text-xs text-slate-400">
                Track small site equipment (vibrator needles, floaters, tamping bars, testing cones) deployed across live jobs.
              </p>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between gap-3">
              <Link
                href="/staff/tools"
                className="flex-1 py-2 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs text-center transition-all shadow"
              >
                Open Tools Inventory Registry →
              </Link>
            </div>
          </div>

          {/* Fleet Management (Machines & Vehicles) */}
          <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-bold uppercase text-slate-400 flex items-center gap-2">
                  <Truck className="w-4 h-4 text-emerald-400" />
                  Fleet & Machinery Logistics
                </span>
                <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  {heading2.fleet.machines.total + heading2.fleet.vehicles.total} Total Fleet Assets
                </span>
              </div>

              {/* Machinery & Vehicles Status Breakdown */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                {/* Heavy Machines */}
                <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800/80">
                  <p className="text-xs font-bold text-white flex items-center gap-1.5 mb-2">
                    <span className="text-amber-400">🏗️</span> Heavy Machines ({heading2.fleet.machines.total})
                  </p>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between py-0.5">
                      <span className="text-slate-400">Available:</span>
                      <span className="font-bold text-emerald-400">{heading2.fleet.machines.available}</span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-slate-400">Rented on site:</span>
                      <span className="font-bold text-blue-400">{heading2.fleet.machines.rented}</span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-slate-400">In Repair:</span>
                      <span className="font-bold text-rose-400">{heading2.fleet.machines.repair}</span>
                    </div>
                  </div>
                </div>

                {/* Transport Vehicles */}
                <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800/80">
                  <p className="text-xs font-bold text-white flex items-center gap-1.5 mb-2">
                    <span className="text-cyan-400">🚚</span> Transport Vehicles ({heading2.fleet.vehicles.total})
                  </p>
                  <div className="space-y-1 text-xs">
                    <div className="flex justify-between py-0.5">
                      <span className="text-slate-400">Available / Idle:</span>
                      <span className="font-bold text-emerald-400">{heading2.fleet.vehicles.available}</span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-slate-400">Active On-Road:</span>
                      <span className="font-bold text-cyan-400">{heading2.fleet.vehicles.inUse}</span>
                    </div>
                    <div className="flex justify-between py-0.5">
                      <span className="text-slate-400">In Service:</span>
                      <span className="font-bold text-rose-400">{heading2.fleet.vehicles.repair}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-800 flex items-center gap-2">
              <Link
                href="/staff/fleet"
                className="flex-1 py-2 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs text-center transition-all border border-slate-700"
              >
                Fleet Manager →
              </Link>
            </div>
          </div>

        </div>

      </section>


      {/* ========================================================================= */}
      {/* HEADING 3: OTHERS & OPERATIONS SUPPORT */}
      {/* ========================================================================= */}
      <section className="space-y-5">
        
        {/* Heading 3 Header Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/70 border-l-4 border-indigo-500 p-4 rounded-2xl border border-slate-800 shadow-lg">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                Heading 3 • Operations Support & Activity
              </span>
            </div>
            <h2 className="text-xl font-black text-white mt-1 flex items-center gap-2">
              <SlidersHorizontal className="w-5 h-5 text-indigo-400" />
              Others & Operations Support
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Staff & driver login credentials, crew directory with operator rate cards, asset maintenance, live map, and compliance.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/staff/crew"
              className="text-xs font-bold text-indigo-400 hover:text-indigo-300 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-1.5 transition-colors"
            >
              <Users className="w-3.5 h-3.5" />
              Crew & Rates Hub
            </Link>
            <Link
              href="/staff/live/map"
              className="text-xs font-bold text-slate-300 hover:text-white px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-1.5 transition-colors"
            >
              <MapPin className="w-3.5 h-3.5" />
              Live Map
            </Link>
          </div>
        </div>

        {/* 4 Quick Support Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Support 1: User Credentials Hub */}
          <Link
            href="/staff/credentials"
            className="bg-slate-900/80 border border-slate-800 hover:border-amber-500/50 rounded-2xl p-4 transition-all shadow group"
          >
            <div className="flex items-center justify-between mb-2">
              <KeyRound className="w-5 h-5 text-amber-400 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                {heading3.userCredentialsCount} Accounts
              </span>
            </div>
            <h4 className="font-bold text-white text-sm">ID & Passwords Hub</h4>
            <p className="text-[11px] text-slate-400 mt-1">
              Lookup official IDs, PINs and role credentials for staff, drivers and operators.
            </p>
          </Link>

          {/* Support 2: Crew Directory & Operator Rates */}
          <Link
            href="/staff/crew"
            className="bg-slate-900/80 border border-slate-800 hover:border-emerald-500/50 rounded-2xl p-4 transition-all shadow group"
          >
            <div className="flex items-center justify-between mb-2">
              <Users className="w-5 h-5 text-emerald-400 group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Directory & Rates
              </span>
            </div>
            <h4 className="font-bold text-white text-sm">Crew Directory & Rates</h4>
            <p className="text-[11px] text-slate-400 mt-1">
              Field phone numbers, operator wage rate cards (₹1,000/day base) & crew contacts.
            </p>
          </Link>

          {/* Support 3: Asset Maintenance Tickets */}
          <Link
            href="/staff/maintenance"
            className="bg-slate-900/80 border border-slate-800 hover:border-rose-500/50 rounded-2xl p-4 transition-all shadow group"
          >
            <div className="flex items-center justify-between mb-2">
              <ShieldAlert className="w-5 h-5 text-rose-400 group-hover:scale-110 transition-transform" />
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                heading3.openMaintenanceTickets > 0 ? "bg-rose-500/20 text-rose-400 border border-rose-500/30" : "bg-emerald-500/10 text-emerald-400"
              }`}>
                {heading3.openMaintenanceTickets} Open Tickets
              </span>
            </div>
            <h4 className="font-bold text-white text-sm">Asset Maintenance</h4>
            <p className="text-[11px] text-slate-400 mt-1">
              Repair orders and mechanical issue tracking for machines & transport trucks.
            </p>
          </Link>

          {/* Support 4: Compliance Documents & Live Map */}
          <Link
            href="/staff/documents"
            className="bg-slate-900/80 border border-slate-800 hover:border-blue-500/50 rounded-2xl p-4 transition-all shadow group"
          >
            <div className="flex items-center justify-between mb-2">
              <ShieldCheck className="w-5 h-5 text-blue-400 group-hover:scale-110 transition-transform" />
              {heading3.complianceAlerts > 0 ? (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  {heading3.complianceAlerts} Expired
                </span>
              ) : (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400">
                  Compliant
                </span>
              )}
            </div>
            <h4 className="font-bold text-white text-sm">Compliance Documents</h4>
            <p className="text-[11px] text-slate-400 mt-1">
              RC, fitness certificates, vehicle insurance & driver license renewals.
            </p>
          </Link>

        </div>

        {/* 7-Day Dispatch Volume Chart & Live Team Activity Feed */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
          
          {/* Charts Section */}
          <div className="lg:col-span-2 bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-indigo-400" />
              7-Day Dispatch Volume
            </h3>
            
            <div className="h-[360px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={heading3.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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

          {/* Team Activity Log Feed */}
          <div className="lg:col-span-1 bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-2xl flex flex-col h-[460px]">
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
                  placeholder="Search action, actor, model..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-sm text-white placeholder-slate-600 focus:outline-none focus:border-indigo-500/50"
                />
              </div>
            </div>

            {/* Log Feed Items */}
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

      </section>

    </div>
  );
}
