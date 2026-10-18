"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createAdminExpense } from "@/actions/expenses";
import { 
  MAIN_LEDGER_HEADS, 
  MainLedgerKey, 
  ExpenseSubOption 
} from "@/lib/expenseLedgerConfig";
import { 
  Wrench, 
  Truck, 
  Users, 
  PenTool, 
  Building2, 
  Coins, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  Upload, 
  Info,
  Banknote,
  Smartphone,
  Split,
  Calculator,
  Plus,
  Trash2
} from "lucide-react";

export type SubLeaderRow = {
  id: string;
  subLeaderName: string;
  workerCount: string;
  ratePerWorker: string;
  paymentMode: "CASH" | "UPI" | "COMBINED";
  cashAmount: string;
  bankAmount: string;
};

type Props = {
  machines?: { id: string; machineId: string; type: string }[];
  vehicles?: { id: string; licensePlate: string; type: string }[];
  employees?: { id: string; name: string; role: string }[];
  contractors?: { id: string; name: string; companyName: string | null }[];
  tools?: { id: string; toolId: string; toolType: string | null }[];
  dispatches?: Array<{
    id: string;
    location: string;
    dateOfService: string;
    customerName: string;
    machineId: string | null;
    operatorName: string | null;
    helperCount: number;
    alreadyLoggedHelpers?: number;
    previousHelperEntries?: Array<{
      id: string;
      amount: number;
      description: string;
      workerCount: number;
    }>;
  }>;
};

export default function NewExpenseForm({
  machines = [],
  vehicles = [],
  employees = [],
  contractors = [],
  tools = [],
  dispatches = [],
}: Props) {
  const router = useRouter();

  // Step 1: Ledger Head Selection
  const [selectedLedgerKey, setSelectedLedgerKey] = useState<MainLedgerKey>("MACHINES_EQUIPMENT");
  // Step 2: Sub-Option Selection
  const [selectedSubOptionId, setSelectedSubOptionId] = useState<string>("MACHINE_DIESEL");

  // Standard Form Fields
  const [amount, setAmount] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [date, setDate] = useState<string>(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState<string>("");
  const [machineId, setMachineId] = useState<string>("");
  const [vehicleId, setVehicleId] = useState<string>("");
  const [employeeId, setEmployeeId] = useState<string>("");
  const [contractorId, setContractorId] = useState<string>("");
  const [toolId, setToolId] = useState<string>("");
  const [dispatchId, setDispatchId] = useState<string>("");

  // Sub-Leaders & Gang Calculator (Supports multiple sub-leaders working together on same dispatch with separate payments)
  const [subLeaders, setSubLeaders] = useState<SubLeaderRow[]>([
    {
      id: "sub-1",
      subLeaderName: "",
      workerCount: "1",
      ratePerWorker: "700",
      paymentMode: "CASH",
      cashAmount: "",
      bankAmount: "",
    },
  ]);
  const [gangWorkType, setGangWorkType] = useState<string>("Site Slab Pouring & Trolley Work");

  // Standard Payment Mode (For non-gang single expenses: Cash, GPay, Combined Split)
  const [paymentMode, setPaymentMode] = useState<"CASH" | "UPI" | "COMBINED">("CASH");
  const [cashAmount, setCashAmount] = useState<string>("");
  const [bankAmount, setBankAmount] = useState<string>("");

  // Receipt File
  const [receiptUrl, setReceiptUrl] = useState<string>("");
  const [receiptFileName, setReceiptFileName] = useState<string>("");

  // Loading & Feedback
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  // Active Ledger Head & Sub Option
  const activeHead = MAIN_LEDGER_HEADS.find((h) => h.key === selectedLedgerKey) || MAIN_LEDGER_HEADS[0];
  const activeSubOption = activeHead.subOptions.find((s) => s.id === selectedSubOptionId) || activeHead.subOptions[0];
  const isGangCalculatorMode = activeSubOption.requiredEntity === "multi_workers";

  // Gang Calculations
  const totalSessionWorkers = subLeaders.reduce((sum, s) => sum + (Number(s.workerCount) || 0), 0);
  const totalSessionGangPayout = subLeaders.reduce(
    (sum, s) => sum + ((Number(s.workerCount) || 0) * (Number(s.ratePerWorker) || 0)),
    0
  );

  // Effective Total for this form
  const effectiveTotalAmount = isGangCalculatorMode ? totalSessionGangPayout : (Number(amount) || 0);

  // Sub-Leader Management Functions
  const handleAddSubLeader = () => {
    setSubLeaders((prev) => [
      ...prev,
      {
        id: `sub-${Date.now()}`,
        subLeaderName: "",
        workerCount: "1",
        ratePerWorker: "700",
        paymentMode: "CASH",
        cashAmount: "",
        bankAmount: "",
      },
    ]);
  };

  const handleRemoveSubLeader = (id: string) => {
    if (subLeaders.length <= 1) return;
    setSubLeaders((prev) => prev.filter((s) => s.id !== id));
  };

  const handleUpdateSubLeader = (id: string, field: keyof SubLeaderRow, value: any) => {
    setSubLeaders((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        const updated = { ...s, [field]: value };
        // Auto-split if paymentMode is COMBINED and amounts are empty
        if (field === "paymentMode" && value === "COMBINED") {
          const total = (Number(updated.workerCount) || 0) * (Number(updated.ratePerWorker) || 0);
          if (!updated.cashAmount && !updated.bankAmount && total > 0) {
            const half = Math.floor(total / 2);
            updated.cashAmount = half.toString();
            updated.bankAmount = (total - half).toString();
          }
        }
        return updated;
      })
    );
  };

  // Handle Head change
  const handleSelectHead = (key: MainLedgerKey) => {
    setSelectedLedgerKey(key);
    const head = MAIN_LEDGER_HEADS.find((h) => h.key === key);
    if (head && head.subOptions.length > 0) {
      setSelectedSubOptionId(head.subOptions[0].id);
    }
  };

  // Handle Sub-option change
  const handleSelectSubOption = (sub: ExpenseSubOption) => {
    setSelectedSubOptionId(sub.id);
    if (sub.requiredEntity !== "machine") setMachineId("");
    if (sub.requiredEntity !== "vehicle") setVehicleId("");
    if (sub.requiredEntity !== "employee") setEmployeeId("");
    if (sub.requiredEntity !== "contractor") setContractorId("");
    if (sub.requiredEntity !== "tool") setToolId("");
  };

  // Icon mapping
  const renderIcon = (iconName: string, className: string) => {
    switch (iconName) {
      case "Wrench": return <Wrench className={className} />;
      case "Truck": return <Truck className={className} />;
      case "Users": return <Users className={className} />;
      case "PenTool": return <PenTool className={className} />;
      case "Building2": return <Building2 className={className} />;
      case "Coins": return <Coins className={className} />;
      default: return <Wrench className={className} />;
    }
  };

  // Receipt File Selection
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setReceiptFileName(file.name);
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setReceiptUrl(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Auto-fill split amounts if COMBINED selected
  const handleSelectCombined = () => {
    setPaymentMode("COMBINED");
    if (!cashAmount && !bankAmount && effectiveTotalAmount > 0) {
      const half = Math.floor(effectiveTotalAmount / 2);
      setCashAmount(half.toString());
      setBankAmount((effectiveTotalAmount - half).toString());
    }
  };

  // Submit Logic
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (effectiveTotalAmount <= 0) {
        setError("Total expense amount must be greater than zero.");
        setLoading(false);
        return;
      }

      if (isGangCalculatorMode) {
        // Validate each sub-leader entry
        for (const sl of subLeaders) {
          if (!sl.subLeaderName.trim()) {
            setError("Please enter the Sub-Leader / Mestri name for all worker gangs.");
            setLoading(false);
            return;
          }
          const wCount = Number(sl.workerCount) || 0;
          const wRate = Number(sl.ratePerWorker) || 0;
          if (wCount <= 0 || wRate <= 0) {
            setError(`Please enter a valid worker count and wage rate for Sub-Leader ${sl.subLeaderName}.`);
            setLoading(false);
            return;
          }
          if (sl.paymentMode === "COMBINED") {
            const cVal = Number(sl.cashAmount) || 0;
            const bVal = Number(sl.bankAmount) || 0;
            const slTotal = wCount * wRate;
            if (Math.abs((cVal + bVal) - slTotal) > 1) {
              setError(`Split mismatch for ${sl.subLeaderName}: Cash (₹${cVal}) + GPay (₹${bVal}) must equal total ₹${slTotal}.`);
              setLoading(false);
              return;
            }
          }
        }

        // Create separate expense entry for EACH sub-leader so payments and methods remain distinct
        for (const sl of subLeaders) {
          const wCount = Number(sl.workerCount) || 0;
          const wRate = Number(sl.ratePerWorker) || 0;
          const slAmount = wCount * wRate;
          const leaderTitle = `Sub-Leader: ${sl.subLeaderName.trim()}`;
          const gangDescription = `${leaderTitle} (${sl.workerCount} Helpers @ ₹${sl.ratePerWorker}/head) - ${gangWorkType}`;

          const formData = new FormData();
          formData.append("amount", slAmount.toString());
          formData.append("category", "OUTSIDE_HELPER_WAGE");
          formData.append("description", gangDescription);
          formData.append("date", date);
          formData.append("notes", notes);
          formData.append("paymentMode", sl.paymentMode);
          if (sl.paymentMode === "COMBINED") {
            formData.append("cashAmount", sl.cashAmount);
            formData.append("bankAmount", sl.bankAmount);
          }
          if (dispatchId) formData.append("dispatchId", dispatchId);
          if (receiptUrl) formData.append("receiptUrl", receiptUrl);

          const res = await createAdminExpense(formData);
          if (!res.success) {
            throw new Error(res.error || `Failed to log expense for ${sl.subLeaderName}`);
          }
        }

        setSuccess(true);
        setTimeout(() => router.push("/staff/expenses"), 1000);
        return;
      }

      // Standard Non-Gang Single Expense
      if (paymentMode === "COMBINED") {
        const cVal = Number(cashAmount) || 0;
        const bVal = Number(bankAmount) || 0;
        if (Math.abs((cVal + bVal) - effectiveTotalAmount) > 1) {
          setError(`Split mismatch: Cash (₹${cVal}) + GPay (₹${bVal}) must equal total ₹${effectiveTotalAmount}.`);
          setLoading(false);
          return;
        }
      }

      const formData = new FormData();
      formData.append("amount", amount);
      formData.append("category", activeSubOption.dbCategory);
      formData.append("description", description || activeSubOption.label);
      formData.append("date", date);
      formData.append("notes", notes);
      formData.append("paymentMode", paymentMode);
      if (paymentMode === "COMBINED") {
        formData.append("cashAmount", cashAmount);
        formData.append("bankAmount", bankAmount);
      }
      if (machineId) formData.append("machineId", machineId);
      if (vehicleId) formData.append("vehicleId", vehicleId);
      if (employeeId) formData.append("employeeId", employeeId);
      if (contractorId) formData.append("contractorId", contractorId);
      if (toolId) formData.append("toolId", toolId);
      if (dispatchId) formData.append("dispatchId", dispatchId);
      if (receiptUrl) formData.append("receiptUrl", receiptUrl);

      const res = await createAdminExpense(formData);
      if (!res.success) {
        setError(res.error || "Failed to log expense.");
      } else {
        setSuccess(true);
        setTimeout(() => router.push("/staff/expenses"), 1000);
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
        <div>
          <button
            type="button"
            onClick={() => router.back()}
            className="text-zinc-500 hover:text-white flex items-center gap-1.5 text-xs font-bold mb-2 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Expenses Ledger
          </button>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            Log New Company Expense
          </h1>
          <p className="text-xs text-zinc-400 mt-1">
            Guided 2-step financial classification. Ensures exact attribution to machines, vehicles, and payroll ledgers.
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {success && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm flex items-center gap-3">
          <CheckCircle2 className="w-5 h-5 shrink-0" />
          <span>Expense logged successfully! Redirecting to ledger...</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* STEP 1: Main Ledger Head Selection Cards */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-xs font-black uppercase tracking-wider text-zinc-400 flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-zinc-800 text-white flex items-center justify-center text-[10px]">1</span>
              Select Main Ledger Account (Where did money go?)
            </label>
            <span className="text-[11px] text-zinc-500 font-medium">6 Cost Centers</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {MAIN_LEDGER_HEADS.map((head) => {
              const isSelected = selectedLedgerKey === head.key;
              return (
                <button
                  type="button"
                  key={head.key}
                  onClick={() => handleSelectHead(head.key)}
                  className={`p-4 rounded-2xl text-left border transition-all relative overflow-hidden flex flex-col justify-between ${
                    isSelected
                      ? `bg-zinc-900 border-2 ${head.colorScheme.border} shadow-xl ring-2 ring-white/10`
                      : "bg-zinc-950/60 border-zinc-800 hover:border-zinc-700 hover:bg-zinc-900/40"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${head.colorScheme.bg} border ${head.colorScheme.border}`}>
                      {renderIcon(head.iconName, `w-5 h-5 ${head.colorScheme.text}`)}
                    </div>
                    {isSelected && (
                      <CheckCircle2 className={`w-4 h-4 ${head.colorScheme.text}`} />
                    )}
                  </div>
                  <div className="mt-3">
                    <h3 className="text-sm font-bold text-white leading-snug">{head.title}</h3>
                    <p className="text-[11px] text-zinc-500 mt-0.5 line-clamp-1">{head.subtitle}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* STEP 2: Sub-Option & Plain Language Guidance */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 space-y-4">
          <label className="text-xs font-black uppercase tracking-wider text-zinc-400 flex items-center gap-2">
            <span className="w-5 h-5 rounded-full bg-zinc-800 text-white flex items-center justify-center text-[10px]">2</span>
            Specific Expense Type & Guidance
          </label>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {activeHead.subOptions.map((sub) => {
              const isSelected = selectedSubOptionId === sub.id;
              return (
                <button
                  type="button"
                  key={sub.id}
                  onClick={() => handleSelectSubOption(sub)}
                  className={`p-3.5 rounded-xl text-left border transition-all flex flex-col justify-between ${
                    isSelected
                      ? `bg-zinc-800/90 border-white/20 text-white shadow-lg`
                      : "bg-zinc-950/40 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{sub.label}</span>
                      {isSelected && <span className="w-2 h-2 rounded-full bg-emerald-400"></span>}
                    </div>
                    <p className="text-[11px] text-zinc-400 mt-1 leading-relaxed">
                      {sub.description}
                    </p>
                  </div>
                  {sub.helperBadge && (
                    <div className="mt-2 pt-2 border-t border-zinc-800/80">
                      <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1">
                        <Info className="w-3 h-3" /> {sub.helperBadge}
                      </span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* STEP 3: Smart Entity Target (Machine / Vehicle / Staff / Tool / Gang Calculator) */}
        <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-2xl p-6 space-y-6">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 border-b border-zinc-800 pb-3">
            <Calculator className="w-4 h-4 text-emerald-400" />
            Transaction Particulars
          </h3>

          {/* Conditional Asset / Entity Tagging */}
          {activeSubOption.requiredEntity === "machine" && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                Target Machine <span className="text-rose-400">*</span>
              </label>
              <select
                required
                value={machineId}
                onChange={(e) => setMachineId(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-amber-500"
              >
                <option value="">Select Equipment...</option>
                {machines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.machineId} — {m.type}
                  </option>
                ))}
              </select>
            </div>
          )}

          {activeSubOption.requiredEntity === "vehicle" && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                Target Vehicle <span className="text-rose-400">*</span>
              </label>
              <select
                required
                value={vehicleId}
                onChange={(e) => setVehicleId(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-blue-500"
              >
                <option value="">Select Transport Vehicle...</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.licensePlate} ({v.type})
                  </option>
                ))}
              </select>
            </div>
          )}

          {activeSubOption.requiredEntity === "employee" && (
            <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-4 space-y-3">
              <label className="block text-xs font-bold uppercase tracking-wider text-emerald-400">
                Select Internal Employee (Salary Advance Target) <span className="text-rose-400">*</span>
              </label>
              <select
                required
                value={employeeId}
                onChange={(e) => setEmployeeId(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="">Select Staff Member...</option>
                {employees.map((emp) => (
                  <option key={emp.id} value={emp.id}>
                    {emp.name} ({emp.role})
                  </option>
                ))}
              </select>
              <p className="text-xs text-emerald-300/80 flex items-center gap-1.5 font-medium">
                <Info className="w-3.5 h-3.5" />
                This will automatically appear in this week&apos;s Settlement under Advance Deductions.
              </p>
            </div>
          )}

          {activeSubOption.requiredEntity === "contractor" && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                Select Contractor / Mestri <span className="text-rose-400">*</span>
              </label>
              <select
                required
                value={contractorId}
                onChange={(e) => setContractorId(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="">Select Contractor...</option>
                {contractors.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} {c.companyName ? `(${c.companyName})` : ""}
                  </option>
                ))}
              </select>
            </div>
          )}

          {activeSubOption.requiredEntity === "tool" && (
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                Target Tool (Optional)
              </label>
              <select
                value={toolId}
                onChange={(e) => setToolId(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-violet-500"
              >
                <option value="">No specific tool (General Spare)</option>
                {tools.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.toolId} ({t.toolType || "Tool"})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* SUB-LEADER & HEADCOUNT CALCULATOR (FOR OUTSIDE HELPER GANGS) */}
          {isGangCalculatorMode ? (
            <div className="space-y-5 bg-zinc-950/80 border border-amber-500/30 p-5 rounded-2xl">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-zinc-800/80 pb-3 gap-2">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-amber-400 flex items-center gap-2">
                    <Users className="w-4 h-4 text-amber-400" />
                    Sub-Leader Gang Wages Calculator
                  </h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Multiple sub-leaders can work together on the same job dispatch. Payments and payment methods (Cash/GPay/Combined) are tracked separately per sub-leader.
                  </p>
                </div>
                <div className="text-left sm:text-right bg-zinc-900 px-3 py-1.5 rounded-xl border border-zinc-800">
                  <span className="text-[10px] text-zinc-500 block uppercase font-bold">Total Gangs Payout ({totalSessionWorkers} Workers)</span>
                  <span className="text-xl font-black text-emerald-400">
                    ₹{totalSessionGangPayout.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {/* Dispatch Link & Headcount Cumulative Tally */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <label className="text-[11px] font-bold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                    Link & Cumulative Tally With Dispatch (Job Site)
                  </label>
                  {dispatchId && (() => {
                    const matched = dispatches.find((d) => d.id === dispatchId);
                    if (!matched) return null;
                    const planned = matched.helperCount || 0;
                    const previouslyLogged = matched.alreadyLoggedHelpers || 0;
                    const cumulative = previouslyLogged + totalSessionWorkers;
                    const diff = cumulative - planned;

                    return (
                      <span className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border ${
                        diff === 0 
                          ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                          : diff > 0
                          ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                          : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                      }`}>
                        {diff === 0 
                          ? `✓ Perfectly Tallies (${planned} Total Planned: ${previouslyLogged > 0 ? `${previouslyLogged} already recorded + ${totalSessionWorkers} this entry` : `${totalSessionWorkers} helpers`})` 
                          : diff > 0 
                          ? `⚠️ +${diff} Extra Helpers above Plan (${cumulative} Total: ${previouslyLogged} prev + ${totalSessionWorkers} now vs ${planned} planned)`
                          : `ℹ️ ${totalSessionWorkers} helpers this entry (${previouslyLogged > 0 ? `${previouslyLogged} previously recorded, ` : ""}need ${planned - cumulative} more for ${planned} planned)`}
                      </span>
                    );
                  })()}
                </div>

                <select
                  value={dispatchId}
                  onChange={(e) => {
                    const selId = e.target.value;
                    setDispatchId(selId);
                    const matched = dispatches.find((d) => d.id === selId);
                    if (matched) {
                      const remainingToFill = Math.max(1, (matched.helperCount || 0) - (matched.alreadyLoggedHelpers || 0));
                      if (subLeaders.length === 1 && (!subLeaders[0].workerCount || subLeaders[0].workerCount === "1")) {
                        setSubLeaders([{ ...subLeaders[0], workerCount: remainingToFill.toString() }]);
                      }
                      setGangWorkType(`Job at ${matched.location} for ${matched.customerName}`);
                    }
                  }}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="">Select Dispatch to Tally (Job Site)...</option>
                  {dispatches.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.dateOfService} — {d.customerName} @ {d.location} ({d.machineId ? `Machine: ${d.machineId}` : 'No Machine'} | {d.helperCount} Helpers Planned | {d.alreadyLoggedHelpers || 0} already logged)
                    </option>
                  ))}
                </select>

                {/* Previously Logged Sub-Leaders breakdown for this Dispatch */}
                {dispatchId && (() => {
                  const matched = dispatches.find((d) => d.id === dispatchId);
                  if (!matched || !matched.previousHelperEntries || matched.previousHelperEntries.length === 0) return null;
                  return (
                    <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-lg p-3 space-y-2">
                      <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400 block">
                        📋 Previously Recorded Sub-Leaders on this Job:
                      </span>
                      <div className="space-y-1.5">
                        {matched.previousHelperEntries.map((prev, idx) => (
                          <div key={prev.id || idx} className="flex items-center justify-between text-xs text-zinc-300 bg-zinc-900/70 px-3 py-1.5 rounded-lg border border-zinc-800/60">
                            <span className="font-medium text-amber-200/90">{prev.description}</span>
                            <span className="font-black text-emerald-400">₹{prev.amount.toLocaleString("en-IN")}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-zinc-400 mb-1">
                  Site Work Nature / Location Notes
                </label>
                <input
                  type="text"
                  placeholder="e.g. Skyline Project 3rd Floor Slab Concrete Pouring"
                  value={gangWorkType}
                  onChange={(e) => setGangWorkType(e.target.value)}
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3.5 py-2 text-xs text-zinc-300 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Multi-Sub-Leader Cards List */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase tracking-wider text-zinc-300 flex items-center gap-2">
                    <span>Sub-Leader Gangs List ({subLeaders.length})</span>
                    <span className="text-[10px] font-normal text-zinc-500 lowercase">(separate payment recorded for each)</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleAddSubLeader}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Another Sub-Leader (Worked Together)
                  </button>
                </div>

                {subLeaders.map((sl, index) => {
                  const slTotal = (Number(sl.workerCount) || 0) * (Number(sl.ratePerWorker) || 0);
                  return (
                    <div key={sl.id} className="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 space-y-4 relative">
                      <div className="flex items-center justify-between border-b border-zinc-800/60 pb-2.5">
                        <span className="text-xs font-black text-amber-300 uppercase tracking-wide flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center text-[10px] font-bold">
                            {index + 1}
                          </span>
                          Sub-Leader #{index + 1} Details & Separate Payment
                        </span>
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-black text-emerald-400">
                            Subtotal: ₹{slTotal.toLocaleString("en-IN")}
                          </span>
                          {subLeaders.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveSubLeader(sl.id)}
                              className="text-zinc-500 hover:text-rose-400 transition-colors p-1"
                              title="Remove this sub-leader"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Inputs: Name, Workers, Rate */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-zinc-300 uppercase mb-1">
                            Sub-Leader / Mestri Name <span className="text-rose-400">*</span>
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. Mestri Arumugam"
                            value={sl.subLeaderName}
                            onChange={(e) => handleUpdateSubLeader(sl.id, "subLeaderName", e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-zinc-300 uppercase mb-1">
                            Number of Workers <span className="text-rose-400">*</span>
                          </label>
                          <input
                            type="number"
                            required
                            min="1"
                            placeholder="18"
                            value={sl.workerCount}
                            onChange={(e) => handleUpdateSubLeader(sl.id, "workerCount", e.target.value)}
                            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-zinc-300 uppercase mb-1">
                            Daily Wage Rate (₹ / Worker) <span className="text-rose-400">*</span>
                          </label>
                          <div className="relative">
                            <span className="absolute left-3 top-2 text-xs text-zinc-500">₹</span>
                            <input
                              type="number"
                              required
                              min="1"
                              placeholder="700"
                              value={sl.ratePerWorker}
                              onChange={(e) => handleUpdateSubLeader(sl.id, "ratePerWorker", e.target.value)}
                              className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-7 pr-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                            />
                          </div>
                        </div>
                      </div>

                      {/* Separate Payment Channel for this Sub-Leader */}
                      <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3 space-y-2.5">
                        <label className="text-[10px] font-black uppercase tracking-wider text-zinc-400 flex items-center justify-between">
                          <span>Payment Channel for {sl.subLeaderName || `Sub-Leader #${index + 1}`}</span>
                          <span className="text-zinc-500">How will this sub-leader receive his ₹{slTotal.toLocaleString("en-IN")}?</span>
                        </label>

                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { id: "CASH", label: "Cash", icon: Banknote, color: "text-emerald-400" },
                            { id: "UPI", label: "GPay / UPI", icon: Smartphone, color: "text-blue-400" },
                            { id: "COMBINED", label: "Combined Split", icon: Split, color: "text-amber-400" },
                          ].map((m) => {
                            const isSel = sl.paymentMode === m.id;
                            const Icon = m.icon;
                            return (
                              <button
                                type="button"
                                key={m.id}
                                onClick={() => handleUpdateSubLeader(sl.id, "paymentMode", m.id)}
                                className={`p-2 rounded-lg border text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                                  isSel
                                    ? "bg-zinc-800 border-white/30 text-white shadow-md ring-1 ring-white/10"
                                    : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white"
                                }`}
                              >
                                <Icon className={`w-3.5 h-3.5 ${m.color}`} />
                                <span>{m.label}</span>
                              </button>
                            );
                          })}
                        </div>

                        {/* Combined Split for this Sub-Leader */}
                        {sl.paymentMode === "COMBINED" && (
                          <div className="grid grid-cols-2 gap-3 pt-1">
                            <div>
                              <label className="block text-[10px] font-bold text-zinc-400 mb-1">
                                Cash Portion (₹)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={sl.cashAmount}
                                onChange={(e) => handleUpdateSubLeader(sl.id, "cashAmount", e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-bold text-zinc-400 mb-1">
                                GPay Portion (₹)
                              </label>
                              <input
                                type="number"
                                step="0.01"
                                placeholder="0.00"
                                value={sl.bankAmount}
                                onChange={(e) => handleUpdateSubLeader(sl.id, "bankAmount", e.target.value)}
                                className="w-full bg-zinc-900 border border-zinc-800 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500 font-bold"
                              />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Gang Summary Banner */}
              <div className="p-3.5 bg-zinc-900 rounded-xl border border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-2">
                <span className="text-zinc-400">
                  Total Across All Gangs: <strong className="text-white">{totalSessionWorkers} Workers</strong> from <strong className="text-white">{subLeaders.length} Sub-Leader(s)</strong>
                </span>
                <span className="text-emerald-400 font-bold text-sm">
                  = ₹{totalSessionGangPayout.toLocaleString("en-IN")} Total Outlay
                </span>
              </div>
            </div>
          ) : (
            /* Standard Single Amount & Description */
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Amount (₹) <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-3.5 text-zinc-500 font-bold text-sm">₹</span>
                  <input
                    type="number"
                    required
                    min="1"
                    step="0.01"
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-8 pr-4 py-3 text-base font-bold text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                  Particulars / Description <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder={`e.g. ${activeSubOption.label} from City Hardware`}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          )}

          {/* Date & Detailed Custom Notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                Expense Date <span className="text-rose-400">*</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400 mb-1.5">
                Custom Notes & Particulars
              </label>
              <input
                type="text"
                placeholder="e.g. Bill #4829, vendor phone, site location"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        {/* STEP 4: Payment Mode (Cash, GPay, Combined Split) - For Standard Expenses */}
        {!isGangCalculatorMode && (
          <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-2xl p-6 space-y-4">
            <label className="text-xs font-black uppercase tracking-wider text-zinc-400 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Banknote className="w-4 h-4 text-emerald-400" />
                Payment Channel (How was this paid?)
              </span>
              <span className="text-[11px] text-zinc-500">Recorded for Ledger & Cash Flow</span>
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: "CASH", label: "Cash", icon: Banknote, color: "text-emerald-400", desc: "Paid from cash on-hand / wallet" },
                { id: "UPI", label: "GPay / UPI", icon: Smartphone, color: "text-blue-400", desc: "Online scan or UPI transfer" },
                { id: "COMBINED", label: "Combined Split", icon: Split, color: "text-amber-400", desc: "Part Cash + Part GPay" },
              ].map((mode) => {
                const isSelected = paymentMode === mode.id;
                const Icon = mode.icon;
                return (
                  <button
                    type="button"
                    key={mode.id}
                    onClick={() => mode.id === "COMBINED" ? handleSelectCombined() : setPaymentMode(mode.id as any)}
                    className={`p-3.5 rounded-xl border text-left transition-all flex flex-col justify-between ${
                      isSelected
                        ? "bg-zinc-800 border-white/30 text-white shadow-lg ring-1 ring-white/10"
                        : "bg-zinc-950/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Icon className={`w-4 h-4 ${mode.color}`} />
                        <span className="text-xs font-bold text-white">{mode.label}</span>
                      </div>
                      {isSelected && <span className="w-2 h-2 rounded-full bg-emerald-400"></span>}
                    </div>
                    <p className="text-[10px] text-zinc-500 mt-1">{mode.desc}</p>
                  </button>
                );
              })}
            </div>

            {/* Expanded Combined Payment Split Fields */}
            {paymentMode === "COMBINED" && (
              <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/30 space-y-3 mt-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                    <Split className="w-4 h-4" /> Specify Split Amounts (Both will show in Ledger with Rupees)
                  </span>
                  <span className="text-xs text-zinc-400">
                    Target: <strong className="text-white">₹{effectiveTotalAmount.toLocaleString("en-IN")}</strong>
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                      Cash Paid (₹) <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={cashAmount}
                      onChange={(e) => setCashAmount(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-zinc-300 mb-1">
                      GPay / Online (₹) <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0.00"
                      value={bankAmount}
                      onChange={(e) => setBankAmount(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500 font-bold"
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 5: Bill & Receipt Attachment */}
        <div className="bg-zinc-900/90 border border-zinc-800/80 rounded-2xl p-6 space-y-3">
          <label className="text-xs font-black uppercase tracking-wider text-zinc-400 flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Upload className="w-4 h-4 text-emerald-400" />
              Bill & Receipt Photo (Physical Proof)
            </span>
            <span className="text-[11px] text-zinc-500">Optional</span>
          </label>

          <div className="flex items-center gap-4">
            <label className="cursor-pointer bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 border border-zinc-700 transition-colors">
              <Upload className="w-4 h-4" />
              {receiptFileName ? "Change Receipt File" : "Upload Bill / Photo"}
              <input
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
            {receiptFileName && (
              <div className="flex items-center gap-2 text-xs text-emerald-400 font-medium">
                <CheckCircle2 className="w-4 h-4" />
                <span className="truncate max-w-xs">{receiptFileName}</span>
              </div>
            )}
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-zinc-800">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-5 py-3 rounded-xl border border-zinc-700 text-zinc-400 hover:text-white text-xs font-bold transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3.5 rounded-xl font-bold text-sm shadow-xl shadow-emerald-600/20 transition-all flex items-center gap-2 disabled:opacity-50"
          >
            {loading ? "Recording in Ledger..." : `Save ₹${effectiveTotalAmount.toLocaleString("en-IN")} to Ledger`}
          </button>
        </div>
      </form>
    </div>
  );
}
