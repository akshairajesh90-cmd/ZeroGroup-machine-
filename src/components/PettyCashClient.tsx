"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { logCashCollection, clearCashDrop } from "@/actions/cash";
import { Wallet, CheckCircle2, IndianRupee, ArrowDownCircle, ArrowUpCircle } from "lucide-react";

type Dispatch = {
  id: string;
  location: string;
  dateOfService: Date;
  customer: { name: string };
};

type Props = {
  dispatches: Dispatch[];
  receipts: any[]; // PaymentReceipt with relations
};

export default function PettyCashClient({ dispatches, receipts }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<"LOG" | "LEDGER">("LOG");
  
  // Log Form State
  const [loading, setLoading] = useState(false);
  const [dispatchId, setDispatchId] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"GIVEN_TO_FIELD" | "RETURNED_TO_OFFICE">("GIVEN_TO_FIELD");
  const [notes, setNotes] = useState("");

  const handleLogCash = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      const payloadAmount = type === "GIVEN_TO_FIELD" ? Number(amount) : -Math.abs(Number(amount));
      
      const res = await logCashCollection({
        dispatchId,
        amount: payloadAmount,
        paymentMethod: "CASH",
        notes: `[PETTY CASH ${type}] ${notes}`,
      });
      
      if (res.success) {
        setDispatchId("");
        setAmount("");
        setNotes("");
        setTab("LEDGER");
        router.refresh();
      } else {
        alert(res.error);
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async (receiptId: string) => {
    if (!confirm("Mark this cash as handed to office / deposited?")) return;
    try {
      const res = await clearCashDrop(receiptId);
      if (res.success) {
        router.refresh();
      }
    } catch (err: any) {
      alert(err.message || "Failed to clear cash drop");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex space-x-2 border-b border-gray-200">
        <button
          onClick={() => setTab("LOG")}
          className={`py-2 px-4 text-sm font-medium border-b-2 ${
            tab === "LOG" ? "border-indigo-500 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Log Petty Cash
        </button>
        <button
          onClick={() => setTab("LEDGER")}
          className={`py-2 px-4 text-sm font-medium border-b-2 ${
            tab === "LEDGER" ? "border-indigo-500 text-indigo-600" : "border-transparent text-gray-500 hover:text-gray-700"
          }`}
        >
          Petty Cash Ledger
        </button>
      </div>

      {tab === "LOG" && (
        <div className="bg-white rounded-lg shadow max-w-lg w-full p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Log Petty Cash / Advance</h2>
          <form onSubmit={handleLogCash} className="space-y-4">
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Transaction Type</label>
              <div className="flex gap-4">
                <label className="flex items-center space-x-2">
                  <input 
                    type="radio" 
                    checked={type === "GIVEN_TO_FIELD"} 
                    onChange={() => setType("GIVEN_TO_FIELD")}
                    className="text-indigo-600 focus:ring-indigo-500" 
                  />
                  <span className="text-sm font-medium text-red-600 flex items-center gap-1">
                    <ArrowDownCircle className="w-4 h-4" /> Given to Field
                  </span>
                </label>
                <label className="flex items-center space-x-2">
                  <input 
                    type="radio" 
                    checked={type === "RETURNED_TO_OFFICE"} 
                    onChange={() => setType("RETURNED_TO_OFFICE")}
                    className="text-indigo-600 focus:ring-indigo-500" 
                  />
                  <span className="text-sm font-medium text-green-600 flex items-center gap-1">
                    <ArrowUpCircle className="w-4 h-4" /> Returned to Office
                  </span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Dispatch / Job</label>
              <select 
                required 
                value={dispatchId} 
                onChange={e => setDispatchId(e.target.value)}
                className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="">Select an active dispatch...</option>
                {dispatches.map(d => (
                  <option key={d.id} value={d.id}>
                    {new Date(d.dateOfService).toLocaleDateString("en-IN")} - {d.customer.name} ({d.location})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
              <input 
                type="number" 
                required 
                min="1"
                step="0.01"
                value={amount} 
                onChange={e => setAmount(e.target.value)}
                placeholder="e.g. 500 for diesel"
                className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Notes / Reason</label>
              <input 
                type="text" 
                required 
                value={notes} 
                onChange={e => setNotes(e.target.value)}
                placeholder="e.g. Emergency fuel, Tolls"
                className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
            </div>

            <div className="pt-4 border-t">
              <button
                type="submit"
                disabled={loading}
                className="w-full inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700"
              >
                {loading ? "Logging..." : "Log Transaction"}
              </button>
            </div>
          </form>
        </div>
      )}

      {tab === "LEDGER" && (
        <div className="rounded-xl border border-gray-200 bg-white overflow-hidden shadow">
          <div className="p-5 border-b border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="h-5 w-5 text-indigo-500" />
              <h2 className="font-bold text-gray-900 text-sm uppercase tracking-wider">Recent Reconciliations</h2>
            </div>
          </div>
          <div className="divide-y divide-gray-200 max-h-[600px] overflow-y-auto">
            {receipts.map((r) => (
              <div key={r.id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50">
                <div>
                  <p className="font-semibold text-gray-900 text-sm">{r.customer?.name} - {r.dispatch?.location || "General"}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    {r.notes || "No notes"} · {new Date(r.paymentDate).toLocaleDateString("en-IN")}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <span className={`font-bold text-sm ${Number(r.amount) < 0 ? 'text-green-600' : 'text-red-600'}`}>
                    ₹{Math.abs(Number(r.amount)).toLocaleString()}
                  </span>
                  
                  {r.depositStatus === "PENDING_DEPOSIT" && (
                    <button 
                      onClick={() => handleClear(r.id)}
                      className="px-3 py-1 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-lg hover:bg-indigo-100"
                    >
                      Reconcile
                    </button>
                  )}
                  {r.depositStatus !== "PENDING_DEPOSIT" && (
                    <span className="text-[10px] font-bold uppercase px-2 py-1 rounded-lg border text-emerald-700 bg-emerald-50 border-emerald-200">
                      Reconciled
                    </span>
                  )}
                </div>
              </div>
            ))}
            {receipts.length === 0 && (
              <p className="p-5 text-gray-500 text-sm text-center">No petty cash records found.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
