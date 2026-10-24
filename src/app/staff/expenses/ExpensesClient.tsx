"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { 
  Receipt, 
  Plus, 
  Search, 
  Filter, 
  Wrench, 
  Truck, 
  Users, 
  PenTool, 
  Building2, 
  Coins, 
  Banknote, 
  Smartphone, 
  CreditCard, 
  Split, 
  FileText, 
  ArrowUpRight,
  Calendar,
  ExternalLink,
  ChevronDown,
  Trash2
} from "lucide-react";
import { softDelete } from "@/actions/adminApprovals";
import { MAIN_LEDGER_HEADS, MainLedgerKey, getLedgerHeadForExpense } from "@/lib/expenseLedgerConfig";

export interface ExpenseRecord {
  id: string;
  date: string;
  amount: number;
  category: string;
  description: string | null;
  notes: string | null;
  logger: {
    name: string;
    role: string;
  };
  machine?: { machineId: string; type: string } | null;
  vehicle?: { licensePlate: string; type: string } | null;
  tool?: { toolId: string; toolType: string | null } | null;
  employee?: { name: string; role: string } | null;
  contractor?: { name: string; companyName: string | null } | null;
  dispatch?: { 
    id: string; 
    location: string;
    dateOfService: string;
    customer?: { name: string } | null;
  } | null;
}

interface Props {
  initialExpenses: ExpenseRecord[];
}

export default function ExpensesClient({ initialExpenses }: Props) {
  const [expenses, setExpenses] = useState(initialExpenses);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);

  // Filters
  const [selectedLedgerTab, setSelectedLedgerTab] = useState<"ALL" | MainLedgerKey>("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<"ALL" | "TODAY" | "WEEK" | "MONTH">("ALL");
  const [selectedReceiptUrl, setSelectedReceiptUrl] = useState<string | null>(null);

  const handleDeleteExpense = async (id: string) => {
    if (!confirm("Are you sure you want to delete this expense? It will be moved to the Trash Hub.")) return;
    setIsDeleting(id);
    try {
      const res = await softDelete("EXPENSE", id);
      if (res.success) {
        setExpenses(prev => prev.filter(e => e.id !== id));
      } else {
        alert("Failed to delete expense.");
      }
    } catch (err: any) {
      alert(err.message || "Failed to delete expense.");
    } finally {
      setIsDeleting(null);
    }
  };

  // Parse notes to extract payment mode, split amounts, and receipt if present
  const parseExpenseMeta = (notes: string | null) => {
    if (!notes) return { paymentBadge: "CASH", splitDetails: null, receiptUrl: null, displayNotes: "" };
    
    let paymentBadge = "CASH";
    let splitDetails: string | null = null;
    let receiptUrl: string | null = null;
    let displayNotes = notes;

    const paymentMatch = notes.match(/\[PAYMENT:\s*([A-Z]+)\]/);
    if (paymentMatch) {
      paymentBadge = paymentMatch[1];
    } else if (notes.includes("Payment Method: BANK") || notes.includes("Payment Method: UPI")) {
      paymentBadge = "UPI";
    }

    // Extract Combined Cash & GPay details (e.g. "(Cash: ₹1,000 | Bank/UPI: ₹1,500)")
    const splitMatch = notes.match(/\(Cash:\s*₹([0-9.,]+)\s*\|\s*Bank\/UPI:\s*₹([0-9.,]+)\)/i);
    if (splitMatch) {
      splitDetails = `Cash: ₹${splitMatch[1]} + GPay: ₹${splitMatch[2]}`;
    }

    const receiptMatch = notes.match(/\[RECEIPT_ATTACHED:\s*([^\]]+)\]/);
    if (receiptMatch) {
      receiptUrl = receiptMatch[1];
      displayNotes = displayNotes.replace(/\[RECEIPT_ATTACHED:[^\]]+\]/, "");
    }

    // Clean up payment tags from display notes
    displayNotes = displayNotes
      .replace(/\[PAYMENT:[^\]]+\]/, "")
      .replace(/\(Cash:[^)]+\)/, "")
      .trim();

    return { paymentBadge, splitDetails, receiptUrl, displayNotes };
  };

  // Filter expenses
  const filteredExpenses = useMemo(() => {
    const now = new Date();
    const todayStr = format(now, "yyyy-MM-dd");

    return expenses.filter((item) => {
      // 1. Ledger Head Tab Filter
      if (selectedLedgerTab !== "ALL") {
        const itemHead = getLedgerHeadForExpense(item);
        if (itemHead !== selectedLedgerTab) return false;
      }

      // 2. Date Filter
      if (dateFilter === "TODAY") {
        if (!item.date.startsWith(todayStr)) return false;
      } else if (dateFilter === "WEEK") {
        const itemDate = new Date(item.date);
        const diffDays = (now.getTime() - itemDate.getTime()) / (1000 * 3600 * 24);
        if (diffDays > 7) return false;
      } else if (dateFilter === "MONTH") {
        const itemDate = new Date(item.date);
        const diffDays = (now.getTime() - itemDate.getTime()) / (1000 * 3600 * 24);
        if (diffDays > 30) return false;
      }

      // 3. Search Query Filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const descMatch = (item.description || "").toLowerCase().includes(query);
        const notesMatch = (item.notes || "").toLowerCase().includes(query);
        const loggerMatch = item.logger.name.toLowerCase().includes(query);
        const machineMatch = (item.machine?.machineId || "").toLowerCase().includes(query);
        const vehicleMatch = (item.vehicle?.licensePlate || "").toLowerCase().includes(query);
        const staffMatch = (item.employee?.name || "").toLowerCase().includes(query);
        const contractorMatch = (item.contractor?.name || "").toLowerCase().includes(query);

        if (!descMatch && !notesMatch && !loggerMatch && !machineMatch && !vehicleMatch && !staffMatch && !contractorMatch) {
          return false;
        }
      }

      return true;
    });
  }, [initialExpenses, selectedLedgerTab, searchQuery, dateFilter]);

  // Aggregate Metrics
  const metrics = useMemo(() => {
    let totalOutflow = 0;
    let staffAdvancesTotal = 0;
    let machineCostsTotal = 0;
    let vehicleCostsTotal = 0;

    filteredExpenses.forEach((exp) => {
      const amt = Number(exp.amount) || 0;
      totalOutflow += amt;
      if (exp.category === "STAFF_ADVANCE") {
        staffAdvancesTotal += amt;
      }
      if (exp.machine) {
        machineCostsTotal += amt;
      }
      if (exp.vehicle) {
        vehicleCostsTotal += amt;
      }
    });

    return { totalOutflow, staffAdvancesTotal, machineCostsTotal, vehicleCostsTotal };
  }, [filteredExpenses]);

  // Render Payment Mode Tag with exact Rupees for Combined
  const renderPaymentModeBadge = (mode: string, splitDetails: string | null) => {
    switch (mode) {
      case "UPI":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-400 border border-blue-500/20">
            <Smartphone className="w-3 h-3" /> GPay / Online
          </span>
        );
      case "BANK":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-500/10 text-purple-400 border border-purple-500/20">
            <CreditCard className="w-3 h-3" /> Bank Transfer
          </span>
        );
      case "COMBINED":
        return (
          <div className="flex flex-col gap-0.5">
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/10 text-amber-300 border border-amber-500/30 w-max">
              <Split className="w-3 h-3" /> Combined (Cash + GPay)
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
      {/* Top Banner & Quick Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <Receipt className="h-8 w-8 text-rose-500" />
            Company Expenses & Operations Ledger
          </h1>
          <p className="text-zinc-400 text-xs mt-1">
            Human-friendly, 2-tier cost ledger. Automatically tracks asset costs, crew salary advances, and vendor outlays.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/owner/ledger"
            className="flex items-center gap-1.5 bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all border border-zinc-700"
          >
            <ArrowUpRight className="w-4 h-4 text-emerald-400" /> Owner Weekly Cash Flow
          </Link>
          <Link
            href="/staff/expenses/new"
            className="flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-white px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-lg shadow-rose-600/20"
          >
            <Plus className="h-4 w-4" /> Log Expense
          </Link>
        </div>
      </div>

      {/* Summary Metrics Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-2xl">
          <span className="text-[10px] font-black uppercase tracking-wider text-zinc-500">Filtered Outflow</span>
          <p className="text-2xl font-black text-white mt-1">₹{metrics.totalOutflow.toLocaleString("en-IN")}</p>
          <span className="text-[10px] text-zinc-500">{filteredExpenses.length} entries matched</span>
        </div>
        <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-2xl">
          <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">Payroll Advances</span>
          <p className="text-2xl font-black text-emerald-400 mt-1">₹{metrics.staffAdvancesTotal.toLocaleString("en-IN")}</p>
          <span className="text-[10px] text-zinc-500">Awaiting payroll deduction</span>
        </div>
        <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-2xl">
          <span className="text-[10px] font-black uppercase tracking-wider text-amber-400">Machine Outlay</span>
          <p className="text-2xl font-black text-amber-400 mt-1">₹{metrics.machineCostsTotal.toLocaleString("en-IN")}</p>
          <span className="text-[10px] text-zinc-500">Mixers & lifts maintenance/fuel</span>
        </div>
        <div className="bg-zinc-900/80 border border-zinc-800 p-4 rounded-2xl">
          <span className="text-[10px] font-black uppercase tracking-wider text-blue-400">Fleet Transport</span>
          <p className="text-2xl font-black text-blue-400 mt-1">₹{metrics.vehicleCostsTotal.toLocaleString("en-IN")}</p>
          <span className="text-[10px] text-zinc-500">Vehicle fuel, service & tolls</span>
        </div>
      </div>

      {/* Quick Ledger Head Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <button
          onClick={() => setSelectedLedgerTab("ALL")}
          className={`px-4 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border ${
            selectedLedgerTab === "ALL"
              ? "bg-zinc-100 text-zinc-900 border-white shadow-md"
              : "bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-white"
          }`}
        >
          📋 All Accounts ({initialExpenses.length})
        </button>
        {MAIN_LEDGER_HEADS.map((head) => {
          const isSelected = selectedLedgerTab === head.key;
          return (
            <button
              key={head.key}
              onClick={() => setSelectedLedgerTab(head.key)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-2 ${
                isSelected
                  ? `bg-zinc-900 border-2 ${head.colorScheme.border} text-white shadow-md`
                  : "bg-zinc-900/60 text-zinc-400 border-zinc-800 hover:border-zinc-700 hover:text-white"
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${head.colorScheme.text} bg-current`} />
              {head.title}
            </button>
          );
        })}
      </div>

      {/* Search & Date Filter Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-zinc-900/50 border border-zinc-800/80 p-3 rounded-2xl backdrop-blur-xl">
        <div className="relative w-full sm:w-96">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3.5 top-3" />
          <input
            type="text"
            placeholder="Search particulars, staff, machine (M-101), vehicle..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <span className="text-xs text-zinc-500 font-medium">Date Range:</span>
          <div className="flex bg-zinc-950 border border-zinc-800 rounded-xl p-1 gap-1">
            {[
              { id: "ALL", label: "All Time" },
              { id: "TODAY", label: "Today" },
              { id: "WEEK", label: "7 Days" },
              { id: "MONTH", label: "30 Days" },
            ].map((d) => (
              <button
                key={d.id}
                onClick={() => setDateFilter(d.id as any)}
                className={`px-3 py-1 rounded-lg text-[11px] font-bold transition-all ${
                  dateFilter === d.id
                    ? "bg-zinc-800 text-white shadow-sm"
                    : "text-zinc-500 hover:text-zinc-300"
                }`}
              >
                {d.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-zinc-900/60 border border-zinc-800/80 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-400">
            <thead className="bg-zinc-950/80 text-[11px] uppercase font-bold text-zinc-500 border-b border-zinc-800">
              <tr>
                <th className="px-6 py-4">Date & Logged By</th>
                <th className="px-6 py-4">Particulars & Reason</th>
                <th className="px-6 py-4">Cost Center / Asset Tag</th>
                <th className="px-6 py-4">Payment Channel</th>
                <th className="px-6 py-4 text-right">Amount</th>
                <th className="px-4 py-4 text-center">Receipt</th>
                <th className="px-4 py-4 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-zinc-500 text-sm">
                    No expense records found matching current ledger filter.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => {
                  const meta = parseExpenseMeta(exp.notes);
                  const isAdvance = exp.category === "STAFF_ADVANCE";

                  return (
                    <tr key={exp.id} className="hover:bg-zinc-800/30 transition-colors">
                      {/* Date & Logger */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-bold text-white block">
                          {format(new Date(exp.date), "dd MMM yyyy")}
                        </span>
                        <span className="text-[11px] text-zinc-500">By {exp.logger.name}</span>
                      </td>

                      {/* Particulars & Description */}
                      <td className="px-6 py-4 max-w-sm">
                        <div className="flex items-center gap-2">
                          <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded border ${
                            isAdvance 
                              ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                              : "bg-zinc-800 text-zinc-300 border-zinc-700/50"
                          }`}>
                            {exp.category.replace(/_/g, " ")}
                          </span>
                        </div>
                        <p className="text-xs font-bold text-white mt-1">
                          {exp.description || "No particulars"}
                        </p>
                        {meta.displayNotes && (
                          <p className="text-[11px] text-zinc-400 mt-0.5 italic leading-relaxed">
                            {meta.displayNotes}
                          </p>
                        )}
                      </td>

                      {/* Cost Center / Asset & Job Site Tags */}
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1.5 max-w-xs">
                          {exp.dispatch && (
                            <span className="px-2.5 py-1 bg-cyan-950/70 text-cyan-300 border border-cyan-500/30 rounded-lg text-[10px] font-bold flex items-center gap-1 shadow-sm">
                              📍 Site: {exp.dispatch.customer?.name} ({exp.dispatch.location})
                            </span>
                          )}
                          {exp.machine && (
                            <span className="px-2 py-0.5 bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded-md text-[10px] font-bold flex items-center gap-1">
                              <Wrench className="w-3 h-3" /> {exp.machine.machineId}
                            </span>
                          )}
                          {exp.vehicle && (
                            <span className="px-2 py-0.5 bg-blue-500/10 text-blue-300 border border-blue-500/20 rounded-md text-[10px] font-bold flex items-center gap-1">
                              <Truck className="w-3 h-3" /> {exp.vehicle.licensePlate}
                            </span>
                          )}
                          {exp.employee && (
                            <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 rounded-md text-[10px] font-bold flex items-center gap-1">
                              <Users className="w-3 h-3" /> {exp.employee.name}
                            </span>
                          )}
                          {exp.contractor && (
                            <span className="px-2 py-0.5 bg-purple-500/10 text-purple-300 border border-purple-500/20 rounded-md text-[10px] font-bold">
                              Contractor: {exp.contractor.name}
                            </span>
                          )}
                          {exp.tool && (
                            <span className="px-2 py-0.5 bg-violet-500/10 text-violet-300 border border-violet-500/20 rounded-md text-[10px] font-bold flex items-center gap-1">
                              <PenTool className="w-3 h-3" /> {exp.tool.toolId}
                            </span>
                          )}
                          {!exp.machine && !exp.vehicle && !exp.employee && !exp.contractor && !exp.tool && !exp.dispatch && (
                            <span className="text-[11px] text-zinc-600 font-mono">Yard / Overhead</span>
                          )}
                        </div>
                      </td>

                      {/* Payment Channel */}
                      <td className="px-6 py-4 whitespace-nowrap">
                        {renderPaymentModeBadge(meta.paymentBadge, meta.splitDetails)}
                      </td>

                      {/* Amount */}
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <span className={`text-sm font-black ${
                          isAdvance ? "text-emerald-400" : "text-rose-400"
                        }`}>
                          ₹{Number(exp.amount).toLocaleString("en-IN")}
                        </span>
                      </td>

                      {/* Receipt Photo Thumbnail */}
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        {meta.receiptUrl ? (
                          <button
                            type="button"
                            onClick={() => setSelectedReceiptUrl(meta.receiptUrl)}
                            className="group relative inline-block focus:outline-none"
                            title="Click to zoom receipt photo"
                          >
                            <div className="w-10 h-10 rounded-lg overflow-hidden border border-zinc-700 hover:border-emerald-500 transition-colors bg-zinc-950 flex items-center justify-center shadow">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img
                                src={meta.receiptUrl}
                                alt="Receipt thumbnail"
                                className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                              />
                            </div>
                          </button>
                        ) : (
                          <span className="text-zinc-600 text-xs">—</span>
                        )}
                      </td>

                      {/* Delete Action */}
                      <td className="px-4 py-4 whitespace-nowrap text-center">
                        <button
                          type="button"
                          onClick={() => handleDeleteExpense(exp.id)}
                          disabled={isDeleting === exp.id}
                          className="p-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 transition-colors disabled:opacity-50"
                          title="Delete Expense (Move to Trash)"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Receipt Preview Modal */}
      {selectedReceiptUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-lg w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" /> Attached Bill / Receipt Proof
              </h3>
              <button
                onClick={() => setSelectedReceiptUrl(null)}
                className="text-zinc-500 hover:text-white text-xs font-bold"
              >
                ✕ Close
              </button>
            </div>
            <div className="rounded-xl overflow-hidden border border-zinc-800 bg-black flex items-center justify-center max-h-96">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={selectedReceiptUrl}
                alt="Receipt proof"
                className="max-h-96 w-auto object-contain"
              />
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => setSelectedReceiptUrl(null)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white rounded-xl text-xs font-bold"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
