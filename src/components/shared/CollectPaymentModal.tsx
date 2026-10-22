"use client";

import { useState } from "react";
import { logPayment } from "@/actions/payments";
import { IndianRupee, CreditCard, Loader2 } from "lucide-react";

interface Props {
  dispatchId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function CollectPaymentModal({ dispatchId, isOpen, onClose }: Props) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"CASH" | "UPI">("CASH");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!amount || isNaN(Number(amount))) {
      setError("Please enter a valid amount");
      return;
    }
    
    setIsSubmitting(true);
    setError("");
    
    const res = await logPayment({
      dispatchId,
      amount: Number(amount),
      method
    });
    
    setIsSubmitting(false);
    if (res.success) {
      onClose();
      setAmount("");
    } else {
      setError(res.error || "Failed to save payment");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
      <div className="bg-zinc-900 border border-zinc-800 rounded-xl w-full max-w-md shadow-2xl max-h-[90dvh] overflow-y-auto overscroll-contain">
        <div className="p-6">
          <h2 className="text-xl font-bold text-white mb-2">Collect Payment</h2>
          <p className="text-zinc-400 text-sm mb-6">Log field payment collections to reconcile with the office.</p>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Amount Collected</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <IndianRupee className="h-5 w-5 text-zinc-500" />
                </div>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="block w-full pl-10 bg-black border border-zinc-800 rounded-lg py-3 text-white placeholder-zinc-500 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all"
                  placeholder="0.00"
                  min="1"
                  step="0.01"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Payment Method</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setMethod("CASH")}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg border transition-all ${
                    method === "CASH" 
                      ? "bg-emerald-500/10 border-emerald-500 text-emerald-400" 
                      : "bg-black border-zinc-800 text-zinc-400 hover:border-zinc-700"
                  }`}
                >
                  <IndianRupee className="h-4 w-4" /> Cash
                </button>
                <button
                  type="button"
                  onClick={() => setMethod("UPI")}
                  className={`flex items-center justify-center gap-2 py-3 px-4 rounded-lg border transition-all ${
                    method === "UPI" 
                      ? "bg-blue-500/10 border-blue-500 text-blue-400" 
                      : "bg-black border-zinc-800 text-zinc-400 hover:border-zinc-700"
                  }`}
                >
                  <CreditCard className="h-4 w-4" /> UPI
                </button>
              </div>
            </div>

            {error && <p className="text-red-400 text-sm font-medium">{error}</p>}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-zinc-800 hover:bg-zinc-700 text-white font-semibold py-3 px-4 rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-semibold py-3 px-4 rounded-lg transition-colors flex items-center justify-center disabled:opacity-50"
              >
                {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : "Save Payment"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
