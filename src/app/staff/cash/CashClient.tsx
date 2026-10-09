"use client";

import { useState, useTransition } from "react";
import { clearCashDrop } from "@/actions/cash";
import { Plus, CheckCircle2, IndianRupee } from "lucide-react";
import { format } from "date-fns";
import DirectPaymentModal from "@/components/forms/DirectPaymentModal";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export default function CashClient({ drops, customers }: { drops: any[], customers: any[] }) {
  const [isPending, startTransition] = useTransition();
  const [showModal, setShowModal] = useState(false);

  const handleClear = (id: string) => {
    if (confirm("Confirm that this cash has been deposited to the bank?")) {
      startTransition(async () => {
        await clearCashDrop(id);
      });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button 
          onClick={() => setShowModal(true)}
          className="bg-emerald-500 hover:bg-emerald-600 text-emerald-950 px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors shadow-lg shadow-emerald-500/20"
        >
          <Plus className="h-4 w-4" /> Log Direct Payment
        </button>
      </div>

      <div className="bg-amber-500/5 border border-amber-500/20 rounded-2xl overflow-hidden backdrop-blur-xl shadow-xl">
        <div className="overflow-x-auto">
        <table className="w-full text-left text-sm text-zinc-400">
          <thead className="bg-zinc-900/80 text-xs uppercase font-bold text-zinc-500 border-b border-zinc-800">
            <tr>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4">Receipt #</th>
              <th className="px-6 py-4">Collector</th>
              <th className="px-6 py-4">Customer</th>
              <th className="px-6 py-4">Amount</th>
              <th className="px-6 py-4 text-right">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-800/50">
            {drops.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-zinc-500">No pending cash drops. All clear!</td>
              </tr>
            ) : (
              drops.map((drop) => (
                <tr key={drop.id} className="hover:bg-zinc-800/30 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-bold text-white">{format(new Date(drop.paymentDate), "dd MMM yyyy")}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="text-zinc-500 text-xs font-mono">{drop.receiptNumber}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-bold text-amber-100">{drop.collector?.name || "Unknown"}</span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-zinc-300 block font-bold">{drop.customer?.name}</span>
                    {drop.discrepancy && (
                      <div className="mt-1 flex flex-col gap-1">
                        {drop.discrepancy.isShortPaid && (
                          <span className="inline-flex items-center w-max px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 text-[10px] font-bold border border-rose-500/20">
                            ⚠️ Short Paid: Expected ₹{drop.discrepancy.expectedCharge.toLocaleString("en-IN")}
                          </span>
                        )}
                        {drop.discrepancy.isCargoMismatch && (
                          <span className="inline-flex items-center w-max px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 text-[10px] font-bold border border-amber-500/20">
                            📦 Cargo Shortage: Delivered {drop.discrepancy.deliveredToolsCount} / {drop.discrepancy.plannedToolsCount} Tools
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="font-black text-amber-400">₹{Number(drop.amount).toLocaleString("en-IN")}</span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <button
                      onClick={() => handleClear(drop.id)}
                      disabled={isPending}
                      className="inline-flex items-center gap-2 bg-amber-500/20 hover:bg-amber-500 text-amber-400 hover:text-amber-950 px-4 py-2 rounded-xl text-xs font-bold transition-colors disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-4 w-4" /> Deposit to Bank
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      </div>
      {showModal && (
        <DirectPaymentModal 
          customers={customers} 
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setShowModal(false);
          }}
        />
      )}
    </div>
  );
}
