'use client';

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { logCashCollection } from "@/actions/cash";
import { Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { format } from "date-fns";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function CashFormClient({ dispatches }: { dispatches: any[] }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const [dispatchId, setDispatchId] = useState(dispatches[0]?.id || "");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "UPI">("CASH");
  const [notes, setNotes] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const amt = Number(amount);
    if (!dispatchId) return setErrorMsg("Select a dispatch.");
    if (amt <= 0) return setErrorMsg("Enter a valid amount.");

    startTransition(async () => {
      const res = await logCashCollection({
        dispatchId,
        amount: amt,
        paymentMethod,
        notes
      });
      if (!res.success) {
        setErrorMsg(res.error || "Failed to log cash.");
      } else {
        setSuccessMsg(`Logged ₹${amt} successfully!`);
        setAmount("");
        setNotes("");
        router.refresh();
      }
    });
  };

  if (dispatches.length === 0) {
    return (
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center">
        <p className="text-sm font-bold text-slate-400">No recent jobs found to log cash.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-4 shadow-xl">
      {errorMsg && (
        <div className="p-3 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-xs font-bold flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      <div>
        <label className="text-xs font-bold text-slate-400 block mb-1">Select Job / Site</label>
        <select
          value={dispatchId}
          onChange={(e) => setDispatchId(e.target.value)}
          required
          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm font-bold text-white outline-none focus:border-cyan-500/50"
        >
          {dispatches.map(d => (
            <option key={d.id} value={d.id}>
              {format(new Date(d.dateOfService), "d MMM")} - {d.customer?.name} ({d.machine?.machineId || "Independent"})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-xs font-bold text-slate-400 block mb-1">Amount Collected (₹)</label>
        <input
          type="number"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          required
          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-lg font-black text-emerald-400 outline-none focus:border-cyan-500/50"
          placeholder="0.00"
        />
      </div>

      <div>
        <label className="text-xs font-bold text-slate-400 block mb-1">Payment Method</label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setPaymentMethod("CASH")}
            className={`flex-1 py-3 rounded-xl text-xs font-bold transition-colors border ${
              paymentMethod === "CASH" 
                ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/50" 
                : "bg-zinc-950 text-slate-500 border-zinc-800"
            }`}
          >
            Physical Cash
          </button>
          <button
            type="button"
            onClick={() => setPaymentMethod("UPI")}
            className={`flex-1 py-3 rounded-xl text-xs font-bold transition-colors border ${
              paymentMethod === "UPI" 
                ? "bg-blue-500/20 text-blue-400 border-blue-500/50" 
                : "bg-zinc-950 text-slate-500 border-zinc-800"
            }`}
          >
            UPI Transfer
          </button>
        </div>
      </div>

      <div>
        <label className="text-xs font-bold text-slate-400 block mb-1">Notes (Optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-sm font-medium text-white outline-none focus:border-cyan-500/50"
          placeholder="e.g., Short by 50 Rs"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-4 rounded-xl uppercase tracking-wider flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
      >
        {isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : "Log Collection"}
      </button>
    </form>
  );
}
