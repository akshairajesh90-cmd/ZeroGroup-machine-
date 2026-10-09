"use client";

import { useTransition, useState } from "react";
import { createSalaryAdvance } from "@/actions/advances";
import { Plus } from "lucide-react";

export default function NewAdvanceForm({ employees }: { employees: { id: string; name: string; role: string }[] }) {
  const [isPending, startTransition] = useTransition();
  const [employeeId, setEmployeeId] = useState("");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!employeeId || !amount || !reason) {
      setError("All fields are required.");
      return;
    }

    startTransition(async () => {
      try {
        await createSalaryAdvance({
          employeeId,
          amount: Number(amount),
          reason
        });
        setEmployeeId("");
        setAmount("");
        setReason("");
// eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (err: any) {
        setError(err.message || "Failed to create advance.");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl p-6 backdrop-blur-xl shadow-xl flex flex-col gap-4">
      <h2 className="text-lg font-bold text-white mb-2">Issue New Advance</h2>
      
      {error && <p className="text-red-400 text-sm">{error}</p>}
      
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Employee</label>
        <select 
          value={employeeId}
          onChange={(e) => setEmployeeId(e.target.value)}
          className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Select Employee...</option>
          {employees.map(emp => (
            <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Amount (₹)</label>
        <input 
          type="number"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="5000"
          className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Reason</label>
        <input 
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Emergency medical, mid-week fuel, etc."
          className="bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
      </div>

      <button
        type="submit"
        disabled={isPending}
        className="mt-2 w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-3 rounded-xl transition-all shadow-lg shadow-indigo-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
      >
        {isPending ? "Issuing..." : <><Plus className="h-4 w-4" /> Issue Advance</>}
      </button>
    </form>
  );
}
