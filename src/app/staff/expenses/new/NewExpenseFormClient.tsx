"use client";

import React, { useState, useTransition } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createAdminExpense } from "@/actions/expenses";
import { Loader2, AlertCircle, Sparkles, CheckCircle } from "lucide-react";

type Machine = {
  id: string;
  machineId: string;
  type: string;
};

type Vehicle = {
  id: string;
  licensePlate: string;
  type: string;
};

interface NewExpenseFormClientProps {
  machines: Machine[];
  vehicles: Vehicle[];
}

export default function NewExpenseFormClient({ machines, vehicles }: NewExpenseFormClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEmergency = searchParams.get("emergency") === "true";

  const [category, setCategory] = useState<"DIESEL" | "REPAIR" | "TRAVEL" | "OTHER">(
    isEmergency ? "REPAIR" : "OTHER"
  );
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    if (isEmergency) {
      formData.set("notes", `[EMERGENCY OVERRIDE] ${formData.get("notes") || ""}`.trim());
    }

    startTransition(async () => {
      try {
        const res = await createAdminExpense(formData);
        if (!res.success) {
          setError(res.error || "Failed to create expense");
        } else {
          setSuccess(true);
          setTimeout(() => {
            router.push("/admin/dashboard");
            router.refresh();
          }, 1500);
        }
// eslint-disable-next-line @typescript-eslint/no-unused-vars
      } catch (err: any) {
        setError(err.message || "Failed to create expense");
      }
    });
  };

  if (success) {
    return (
      <div className="rounded-3xl border border-emerald-500/30 bg-slate-900/80 p-8 text-center shadow-2xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-300">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 text-emerald-400 mb-6">
          <CheckCircle className="h-8 w-8 animate-bounce" />
        </div>
        <h2 className="text-2xl font-black text-white">Expense Logged Successfully!</h2>
        <p className="text-zinc-400 text-sm mt-2">Redirecting you back to the Command Center...</p>
      </div>
    );
  }

  return (
    <div className={`rounded-3xl border p-6 sm:p-8 shadow-2xl backdrop-blur-xl transition-all duration-500 ${
      isEmergency 
        ? "border-rose-500/30 bg-rose-950/10" 
        : "border-slate-800/80 bg-slate-900/80"
    }`}>
      {isEmergency && (
        <div className="mb-6 rounded-2xl bg-rose-500/10 border border-rose-500/20 p-4 flex items-center gap-3 text-rose-400">
          <Sparkles className="h-5 w-5 text-rose-400 animate-pulse shrink-0" />
          <p className="text-xs font-bold uppercase tracking-wider leading-relaxed">
            Emergency Override Mode: Attributing immediate operational funds. Notes will be automatically flagged.
          </p>
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-medium flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Amount field */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider">
              Amount (INR) *
            </label>
            <input
              type="number"
              step="0.01"
              name="amount"
              required
              placeholder="0.00"
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl p-3 text-white outline-none transition-all focus:ring-2 focus:ring-indigo-500/25"
            />
          </div>

          {/* Date field */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider">
              Date *
            </label>
            <input
              type="date"
              name="date"
              required
              defaultValue={new Date().toISOString().split("T")[0]}
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl p-3 text-white outline-none transition-all focus:ring-2 focus:ring-indigo-500/25"
            />
          </div>

          {/* Category dropdown */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider">
              Category *
            </label>
            <select
              name="category"
              required
              value={category}
// eslint-disable-next-line @typescript-eslint/no-unused-vars
              onChange={(e) => setCategory(e.target.value as any)}
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl p-3 text-white outline-none transition-all focus:ring-2 focus:ring-indigo-500/25 cursor-pointer"
            >
              <option value="OTHER">Other / General</option>
              <option value="DIESEL">Diesel / Fuel</option>
              <option value="REPAIR">Repair / Maintenance</option>
              <option value="TRAVEL">Travel / Lodging</option>
            </select>
          </div>

          {/* Description field */}
          <div>
            <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider">
              Description *
            </label>
            <input
              type="text"
              name="description"
              required
              placeholder={
                category === "DIESEL" ? "e.g. 50 Liters fuel fill" :
                category === "REPAIR" ? "e.g. Hydraulic line repair" :
                category === "TRAVEL" ? "e.g. Toll and highway expense" :
                "e.g. Office stationary purchases"
              }
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl p-3 text-white outline-none transition-all focus:ring-2 focus:ring-indigo-500/25"
            />
          </div>

          {/* Machine selector (Visible only for fuel / repair) */}
          {(category === "DIESEL" || category === "REPAIR") && (
            <div className="animate-in slide-in-from-top-4 duration-300">
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider">
                Link to Machine (Optional)
              </label>
              <select
                name="machineId"
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl p-3 text-white outline-none transition-all focus:ring-2 focus:ring-indigo-500/25 cursor-pointer"
              >
                <option value="">Select Machine...</option>
                {machines.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.machineId} ({m.type.replace(/_/g, " ")})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Vehicle selector (Visible only for fuel / travel) */}
          {(category === "DIESEL" || category === "TRAVEL") && (
            <div className="animate-in slide-in-from-top-4 duration-300">
              <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider">
                Link to Vehicle (Optional)
              </label>
              <select
                name="vehicleId"
                className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl p-3 text-white outline-none transition-all focus:ring-2 focus:ring-indigo-500/25 cursor-pointer"
              >
                <option value="">Select Vehicle...</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.licensePlate} ({v.type})
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Notes area */}
        <div>
          <label className="block text-xs font-semibold text-zinc-400 mb-1.5 uppercase tracking-wider">
            Internal Audit Notes
          </label>
          <textarea
            name="notes"
            rows={3}
            placeholder="Provide audit context or receipt remarks..."
            className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl p-3 text-white outline-none transition-all focus:ring-2 focus:ring-indigo-500/25 resize-none"
          />
        </div>

        {/* Buttons */}
        <div className="flex justify-end gap-3 pt-4 border-t border-slate-800/80">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-5 py-2.5 text-sm font-semibold text-zinc-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isPending}
            className={`px-6 py-2.5 text-sm font-bold text-white rounded-xl flex items-center gap-2 transition-all shadow-lg ${
              isEmergency 
                ? "bg-rose-600 hover:bg-rose-500 shadow-rose-600/20" 
                : "bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/20"
            }`}
          >
            {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {isEmergency ? "Authorize Override" : "Save Expense"}
          </button>
        </div>
      </form>
    </div>
  );
}
