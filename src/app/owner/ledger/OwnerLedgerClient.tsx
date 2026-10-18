"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { format, startOfWeek, endOfWeek, subWeeks, addWeeks } from "date-fns";
import { 
  FileSpreadsheet, 
  ArrowLeft, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Calendar, 
  ChevronLeft, 
  ChevronRight, 
  Smartphone, 
  CreditCard, 
  Banknote, 
  Split, 
  AlertCircle, 
  CheckCircle2, 
  ExternalLink, 
  FileText,
  Users,
  Wrench,
  Truck
} from "lucide-react";

export interface CashFlowInflow {
  id: string;
  date: string;
  amount: number;
  paymentMethod: string;
  customerName: string;
  notes: string | null;
  collectorName: string;
}

export interface CashFlowOutflow {
  id: string;
  date: string;
  amount: number;
  category: string;
  description: string | null;
  notes: string | null;
  paymentMode: string;
  splitDetails?: string | null;
  recipientName: string;
  assetTag: string | null;
  receiptUrl: string | null;
}

export interface WeeklyAdvanceItem {
  id: string;
  date: string;
  amount: number;
  employeeName: string;
  employeeRole: string;
  notes: string | null;
}

interface Props {
  initialInflows: CashFlowInflow[];
  initialOutflows: CashFlowOutflow[];
  initialAdvances: WeeklyAdvanceItem[];
}

export default function OwnerLedgerClient({
  initialInflows,
  initialOutflows,
  initialAdvances,
}: Props) {
  // Current Selected Week State (Defaults to current week)
  const [currentDate, setCurrentDate] = useState<Date>(new Date());

  const weekStart = useMemo(() => startOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);
  const weekEnd = useMemo(() => endOfWeek(currentDate, { weekStartsOn: 1 }), [currentDate]);

  const handlePrevWeek = () => setCurrentDate((prev) => subWeeks(prev, 1));
  const handleNextWeek = () => setCurrentDate((prev) => addWeeks(prev, 1));
  const handleCurrentWeek = () => setCurrentDate(new Date());

  // Filter Inflows for this week
  const weekInflows = useMemo(() => {
    return initialInflows.filter((item) => {
      const d = new Date(item.date);
      return d >= weekStart && d <= weekEnd;
    });
  }, [initialInflows, weekStart, weekEnd]);

  // Filter Outflows for this week
  const weekOutflows = useMemo(() => {
    return initialOutflows.filter((item) => {
      const d = new Date(item.date);
      return d >= weekStart && d <= weekEnd;
    });
  }, [initialOutflows, weekStart, weekEnd]);

  // Filter Advances for this week
  const weekAdvances = useMemo(() => {
    return initialAdvances.filter((item) => {
      const d = new Date(item.date);
      return d >= weekStart && d <= weekEnd;
    });
  }, [initialAdvances, weekStart, weekEnd]);

  // Totals
  const totalInflow = weekInflows.reduce((sum, item) => sum + Number(item.amount), 0);
  const totalOutflow = weekOutflows.reduce((sum, item) => sum + Number(item.amount), 0);
  const totalAdvances = weekAdvances.reduce((sum, item) => sum + Number(item.amount), 0);
  const netWeeklyBalance = totalInflow - totalOutflow;

  // Render Payment Badge with exact Rupees for Combined
  const renderPaymentBadge = (method: string, splitDetails?: string | null) => {
    switch (method.toUpperCase()) {
      case "UPI":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Smartphone className="w-3 h-3" /> GPay / Online
          </span>
        );
      case "BANK":
      case "BANK_TRANSFER":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <CreditCard className="w-3 h-3" /> Bank Transfer
          </span>
        );
      case "COMBINED":
        return (
          <div className="flex flex-col gap-0.5">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30 w-max">
              <Split className="w-3 h-3" /> Combined Split
            </span>
            {splitDetails && (
              <span className="text-[10px] text-amber-200/90 font-mono font-bold tracking-tight">
                {splitDetails}
              </span>
            )}
          </div>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Banknote className="w-3 h-3" /> Cash
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Navigation & Week Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-800 pb-5">
        <div>
          <Link
            href="/staff/expenses"
            className="text-zinc-500 hover:text-white flex items-center gap-1.5 text-xs font-bold mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Staff Expenses Ledger
          </Link>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <FileSpreadsheet className="h-8 w-8 text-emerald-400" />
            Owner Weekly Cash Flow & Financial Report
          </h1>
          <p className="text-zinc-400 text-xs mt-1">
            Executive bird’s-eye view of all company earnings, outlays, and pending payroll deductions.
          </p>
        </div>

        {/* Week Selector Bar */}
        <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 p-1.5 rounded-2xl shadow-lg">
          <button
            onClick={handlePrevWeek}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            title="Previous Week"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="px-3 text-center">
            <span className="text-xs font-bold text-white block">
              {format(weekStart, "dd MMM")} — {format(weekEnd, "dd MMM yyyy")}
            </span>
            <span className="text-[10px] text-zinc-500 font-mono">Mon to Sun Calendar</span>
          </div>
          <button
            onClick={handleNextWeek}
            className="p-2 rounded-xl text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            title="Next Week"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <button
            onClick={handleCurrentWeek}
            className="ml-2 px-2.5 py-1 text-[11px] font-bold text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-colors border border-emerald-500/20"
          >
            This Week
          </button>
        </div>
      </div>

      {/* Weekly Executive Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Money In */}
        <div className="bg-zinc-900/90 border border-zinc-800 p-6 rounded-2xl shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4" /> Total Money In (Earnings)
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300">
              {weekInflows.length} Collections
            </span>
          </div>
          <p className="text-3xl font-black text-white mt-3">₹{totalInflow.toLocaleString("en-IN")}</p>
          <p className="text-[11px] text-zinc-500 mt-1">Customer collections & site hire rental receipts</p>
        </div>

        {/* Money Out */}
        <div className="bg-zinc-900/90 border border-zinc-800 p-6 rounded-2xl shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
              <TrendingDown className="w-4 h-4" /> Total Money Out (Expenses)
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-rose-500/10 text-rose-300">
              {weekOutflows.length} Outlays
            </span>
          </div>
          <p className="text-3xl font-black text-rose-400 mt-3">₹{totalOutflow.toLocaleString("en-IN")}</p>
          <p className="text-[11px] text-zinc-500 mt-1">Fuel, machine repairs, advances, and yard overheads</p>
        </div>

        {/* Net Weekly Balance */}
        <div className={`p-6 rounded-2xl shadow-xl border relative overflow-hidden ${
          netWeeklyBalance >= 0 
            ? "bg-emerald-950/20 border-emerald-500/30"
            : "bg-rose-950/20 border-rose-500/30"
        }`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-black uppercase tracking-wider ${
              netWeeklyBalance >= 0 ? "text-emerald-400" : "text-rose-400"
            }`}>
              Net Weekly Cash Balance
            </span>
            <Wallet className={`w-4 h-4 ${netWeeklyBalance >= 0 ? "text-emerald-400" : "text-rose-400"}`} />
          </div>
          <p className={`text-3xl font-black mt-3 ${
            netWeeklyBalance >= 0 ? "text-emerald-300" : "text-rose-300"
          }`}>
            ₹{netWeeklyBalance.toLocaleString("en-IN")}
          </p>
          <p className="text-[11px] text-zinc-400 mt-1">
            {netWeeklyBalance >= 0 ? "Positive Net Cash Surplus" : "Weekly Operating Deficit"}
          </p>
        </div>
      </div>

      {/* SECTION 1: PAYROLL ADVANCE DEDUCTIONS RECONCILIATION */}
      <div className="bg-zinc-900/70 border border-amber-500/30 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Users className="w-4 h-4 text-amber-400" />
              Payroll Salary Advance Deductions (This Week)
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              These cash/bank advances were given to workers this week and must be deducted during weekend settlement.
            </p>
          </div>
          <div className="text-right">
            <span className="text-xs text-zinc-500">Total Deductions: </span>
            <span className="text-base font-black text-amber-400">₹{totalAdvances.toLocaleString("en-IN")}</span>
          </div>
        </div>

        {weekAdvances.length === 0 ? (
          <div className="py-6 text-center text-zinc-500 text-xs">
            No salary advances issued during this calendar week.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
            {weekAdvances.map((adv) => (
              <div key={adv.id} className="p-3.5 rounded-xl bg-zinc-950/60 border border-zinc-800 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-white">{adv.employeeName}</h4>
                  <span className="text-[10px] text-zinc-500">{adv.employeeRole} • {format(new Date(adv.date), "dd MMM")}</span>
                  {adv.notes && <p className="text-[10px] text-zinc-400 mt-0.5 line-clamp-1 italic">{adv.notes}</p>}
                </div>
                <div className="text-right">
                  <span className="text-sm font-black text-amber-400">₹{Number(adv.amount).toLocaleString("en-IN")}</span>
                  <span className="text-[10px] font-bold text-emerald-400 block">Pending Deduction</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* SECTION 2: MONEY OUT (THE "WHO, HOW MUCH, WHY" DETAILED EXPENSES) */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-rose-400" />
              Money Out Breakdown (Who, How Much, Why & Proof)
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Full accountability of all company operational spending for the week.
            </p>
          </div>
          <span className="text-xs font-mono text-rose-400 font-bold">
            Total: ₹{totalOutflow.toLocaleString("en-IN")}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-400">
            <thead className="bg-zinc-950 text-[11px] uppercase font-bold text-zinc-500 border-b border-zinc-800">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Who (Recipient / Vendor / Staff)</th>
                <th className="px-6 py-4">Why (Category & Reason)</th>
                <th className="px-6 py-4">Cost Center Tag</th>
                <th className="px-6 py-4">Payment Mode</th>
                <th className="px-6 py-4 text-right">How Much (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {weekOutflows.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-10 text-center text-zinc-500 text-xs">
                    No money out recorded for this week.
                  </td>
                </tr>
              ) : (
                weekOutflows.map((out) => (
                  <tr key={out.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-white">
                      {format(new Date(out.date), "dd MMM yyyy")}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="text-xs font-bold text-zinc-200 block">{out.recipientName}</span>
                    </td>
                    <td className="px-6 py-4 max-w-sm">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-zinc-800 border border-zinc-700 text-zinc-300">
                        {out.category.replace(/_/g, " ")}
                      </span>
                      <p className="text-xs text-zinc-300 mt-1 font-medium">{out.description || "—"}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {out.assetTag ? (
                        <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 text-[10px] font-bold border border-zinc-700">
                          {out.assetTag}
                        </span>
                      ) : (
                        <span className="text-[11px] text-zinc-600 font-mono">General</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {renderPaymentBadge(out.paymentMode, out.splitDetails)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="text-sm font-black text-rose-400">
                        ₹{Number(out.amount).toLocaleString("en-IN")}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 3: MONEY IN (CUSTOMER COLLECTIONS & INFLOWS) */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="p-5 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              Money In Breakdown (Customer Payments & Collections)
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Verified deposits, site hire receipts, and advance collections.
            </p>
          </div>
          <span className="text-xs font-mono text-emerald-400 font-bold">
            Total: ₹{totalInflow.toLocaleString("en-IN")}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-400">
            <thead className="bg-zinc-950 text-[11px] uppercase font-bold text-zinc-500 border-b border-zinc-800">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Client / Site Project</th>
                <th className="px-6 py-4">Collected By</th>
                <th className="px-6 py-4">Payment Method</th>
                <th className="px-6 py-4 text-right">Amount (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {weekInflows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-zinc-500 text-xs">
                    No customer inflows recorded for this week.
                  </td>
                </tr>
              ) : (
                weekInflows.map((inflow) => (
                  <tr key={inflow.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-white">
                      {format(new Date(inflow.date), "dd MMM yyyy")}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-white block">{inflow.customerName}</span>
                      {inflow.notes && <p className="text-[11px] text-zinc-500 mt-0.5 line-clamp-1 italic">{inflow.notes}</p>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-xs text-zinc-400">
                      {inflow.collectorName}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {renderPaymentBadge(inflow.paymentMethod)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <span className="text-sm font-black text-emerald-400">
                        ₹{Number(inflow.amount).toLocaleString("en-IN")}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
