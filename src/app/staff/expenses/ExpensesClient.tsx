"use client";

import React, { useRef, useState, useTransition } from "react";
import { format } from "date-fns";
import { Receipt, AlertCircle, Loader2, Plus } from "lucide-react";
import { createAdminExpense } from "@/actions/expenses";

type ExpenseItem = {
  id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  loggerName: string;
  assetReference: string;
  notes: string;
};

export default function ExpensesClient({ expenses }: { expenses: ExpenseItem[] }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        const res = await createAdminExpense(formData);
        if (!res.success) {
          setError(res.error || "Failed to create expense");
        } else {
          setIsFormOpen(false);
        }
// eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (err: any) {
        setError(err.message || "Failed to create expense");
      }
    });
  };

  const totalExpenses = expenses.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Receipt className="h-6 w-6 text-emerald-400" />
            Expenses & Store
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Track fuel, material purchases, and inventory outlays.
          </p>
        </div>
        <button
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-colors shadow-lg shadow-emerald-900/50"
        >
          <Plus className="h-4 w-4" />
          Log Expense
        </button>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}

      {/* Expense Form */}
      {isFormOpen && (
        <form ref={formRef} onSubmit={handleSubmit} className="bg-zinc-900 border border-emerald-500/30 p-6 rounded-2xl shadow-xl space-y-4">
          <h2 className="text-lg font-bold text-white mb-4">Log New Expense</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1 uppercase tracking-wider">Amount (₹)</label>
              <input type="number" step="0.01" name="amount" required className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-white focus:border-emerald-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1 uppercase tracking-wider">Date</label>
              <input type="date" name="date" required defaultValue={new Date().toISOString().split('T')[0]} className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-white focus:border-emerald-500 outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1 uppercase tracking-wider">Category</label>
              <select name="category" required className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-white focus:border-emerald-500 outline-none">
                <option value="OTHER">Other / General</option>
                <option value="DIESEL">Diesel</option>
                <option value="REPAIR">Repair</option>
                <option value="TRAVEL">Travel</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-zinc-400 mb-1 uppercase tracking-wider">Description</label>
              <input type="text" name="description" placeholder="e.g. Office Supplies" required className="w-full bg-zinc-950 border border-zinc-800 rounded-lg p-2.5 text-white focus:border-emerald-500 outline-none" />
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 text-sm font-semibold text-zinc-400 hover:text-white transition-colors">
              Cancel
            </button>
            <button type="submit" disabled={isPending} className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-sm font-bold flex items-center gap-2 transition-colors disabled:opacity-50">
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Save Expense
            </button>
          </div>
        </form>
      )}

      {/* Summary Stat */}
      <div className="bg-zinc-900 border border-zinc-800/80 rounded-2xl p-6 shadow-lg">
        <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-1">Total Expenses (Recent)</p>
        <p className="text-3xl font-black text-white">₹{totalExpenses.toLocaleString("en-IN")}</p>
      </div>

      {/* Table */}
      <div className="bg-zinc-900 border border-zinc-800/80 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-zinc-950/50 text-xs uppercase text-zinc-400 border-b border-zinc-800/80">
              <tr>
                <th className="px-6 py-4 font-semibold">Date & By</th>
                <th className="px-6 py-4 font-semibold">Category</th>
                <th className="px-6 py-4 font-semibold">Details</th>
                <th className="px-6 py-4 font-semibold text-right">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-zinc-500">No expenses logged.</td>
                </tr>
              ) : (
                expenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-white/5 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <p className="text-zinc-300 font-medium">{format(new Date(expense.date), "MMM d, yyyy")}</p>
                      <p className="text-xs text-zinc-500 mt-1">Logged by: {expense.loggerName}</p>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 rounded-md bg-zinc-800/80 px-2 py-1 text-xs font-bold uppercase tracking-wider text-emerald-400 border border-emerald-500/20">
                        {expense.category}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="text-zinc-300">{expense.description || "—"}</p>
                      {expense.assetReference !== "General" && (
                        <p className="text-xs text-zinc-500 font-mono mt-1">Ref: {expense.assetReference}</p>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <p className="font-bold text-white">₹{expense.amount.toLocaleString("en-IN")}</p>
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
