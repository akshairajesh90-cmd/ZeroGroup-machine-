"use client";

import React, { useState, useTransition } from "react";
import { X, Receipt, Loader2, AlertCircle } from "lucide-react";
import { logDirectOfficePayment } from "@/actions/cash";

interface DirectPaymentModalProps {
  customers: { id: string; name: string; phone: string | null }[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function DirectPaymentModal({ customers, onClose, onSuccess }: DirectPaymentModalProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [customerId, setCustomerId] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"CASH" | "UPI" | "BANK_TRANSFER">("CASH");
  const [notes, setNotes] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!customerId) {
      setError("Please select a customer.");
      return;
    }

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError("Please enter a valid amount.");
      return;
    }

    startTransition(async () => {
      const result = await logDirectOfficePayment({
        customerId,
        amount: numAmount,
        paymentMethod,
        notes: notes.trim()
      });

      if (result.success) {
        onSuccess();
      } else {
        setError(result.error || "Failed to log payment.");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        <div className="px-6 py-5 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-500">
              <Receipt className="h-5 w-5" />
            </div>
            <h2 className="text-lg font-black text-white tracking-tight uppercase">Log Direct Payment</h2>
          </div>
          <button 
            onClick={onClose}
            className="text-zinc-500 hover:text-white bg-zinc-900 hover:bg-zinc-800 p-2 rounded-full transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {error && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl flex items-start gap-2 text-red-500 text-sm font-bold">
              <AlertCircle className="h-5 w-5 shrink-0" />
              <p>{error}</p>
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-xs font-black tracking-widest text-zinc-500 uppercase">Customer</label>
            <select
              value={customerId}
              onChange={(e) => setCustomerId(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all appearance-none"
            >
              <option value="" disabled>Select Customer...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name} {c.phone ? `(${c.phone})` : ""}</option>
              ))}
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-black tracking-widest text-zinc-500 uppercase">Amount (₹)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-zinc-600"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-black tracking-widest text-zinc-500 uppercase">Payment Method</label>
            <div className="grid grid-cols-3 gap-2">
              {(["CASH", "UPI", "BANK_TRANSFER"] as const).map((method) => (
                <button
                  key={method}
                  type="button"
                  onClick={() => setPaymentMethod(method)}
                  className={`py-3 px-2 rounded-xl text-[11px] font-bold tracking-wider uppercase transition-all border ${
                    paymentMethod === method 
                      ? "bg-emerald-500/20 border-emerald-500 text-emerald-400" 
                      : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-white"
                  }`}
                >
                  {method.replace("_", " ")}
                </button>
              ))}
            </div>
            {paymentMethod === "CASH" && (
              <p className="text-[10px] text-amber-500 font-bold mt-2 bg-amber-500/10 p-2 rounded-lg border border-amber-500/20">
                Note: Physical cash will be added to the Pending Deposit queue.
              </p>
            )}
            {paymentMethod !== "CASH" && (
              <p className="text-[10px] text-emerald-500 font-bold mt-2 bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                Note: Digital payments bypass the queue and are instantly marked as deposited.
              </p>
            )}
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-black tracking-widest text-zinc-500 uppercase">Notes (Optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="E.g., Walk-in payment for last week's invoice."
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-all placeholder:text-zinc-600 resize-none h-20"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={isPending}
              className="w-full bg-emerald-500 hover:bg-emerald-600 text-emerald-950 font-black uppercase tracking-widest py-3.5 rounded-xl transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isPending ? "Saving..." : "Record Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
