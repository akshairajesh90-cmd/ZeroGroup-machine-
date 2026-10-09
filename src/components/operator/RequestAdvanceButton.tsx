"use client";

import { useState, useTransition } from "react";
import { HandCoins, Loader2, CheckCircle2 } from "lucide-react";
import { requestSalaryAdvance } from "@/actions/operator";

export function RequestAdvanceButton() {
  const [isPending, startTransition] = useTransition();
  const [amount, setAmount] = useState("");
  const [success, setSuccess] = useState(false);

  const handleRequest = () => {
    const num = Number(amount);
    if (!num || num <= 0) return alert("Enter a valid amount.");
    
    startTransition(async () => {
      const res = await requestSalaryAdvance(num);
      if (res.success) {
        setSuccess(true);
        setAmount("");
        setTimeout(() => setSuccess(false), 3000);
      } else {
        alert(res.error || "Failed to request advance.");
      }
    });
  };

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <HandCoins className="h-4 w-4 text-amber-500" /> Need an Advance?
        </h3>
      </div>
      
      {success ? (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-xs font-bold p-3 rounded-xl flex items-center gap-2">
          <CheckCircle2 className="h-4 w-4" /> Request sent to office!
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            type="number"
            placeholder="Amount (₹)"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="flex-1 bg-zinc-950 border border-zinc-800 rounded-xl px-3 text-sm text-white focus:outline-none focus:border-amber-500"
          />
          <button
            onClick={handleRequest}
            disabled={isPending || !amount}
            className="bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-amber-950 font-bold px-4 py-2 rounded-xl text-sm flex items-center gap-2 transition-colors"
          >
            {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Request"}
          </button>
        </div>
      )}
    </div>
  );
}
