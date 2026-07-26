"use client";

import { useRef, useState, useTransition } from "react";
import { reportBreakdownAction } from "../actions";
import { Loader2, CheckCircle2, AlertCircle, AlertTriangle } from "lucide-react";

interface Machine { id: string; machineId: string; type: string; notes: string | null }

export default function BreakdownForm({ machines }: { machines: Machine[] }) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isPending, startTransition] = useTransition();
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    const fd = new FormData(formRef.current!);
    startTransition(async () => {
      try {
        await reportBreakdownAction(fd);
        setSuccess(true);
        formRef.current?.reset();
      } catch (err: any) {
        setError(err.message ?? "Failed to submit. Try again.");
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="bg-slate-900/70 border border-white/5 rounded-2xl p-5 space-y-4">
      {/* Machine Select */}
      <div>
        <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">
          Which Machine? *
        </label>
        <select
          name="machineId"
          required
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500/50"
        >
          <option value="">— Select machine —</option>
          {machines.map((m) => (
            <option key={m.id} value={m.id}>
              {m.machineId} · {m.type}{m.notes ? ` (${m.notes.split("(")[0].trim()})` : ""}
            </option>
          ))}
        </select>
      </div>

      {/* Issue Description */}
      <div>
        <label className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-1.5 block">
          Describe the Issue *
        </label>
        <textarea
          name="description"
          required
          rows={4}
          placeholder="e.g. Engine making loud knocking noise, belt slipping, won't start..."
          className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-red-500/50 resize-none"
        />
      </div>

      {/* Warning */}
      <div className="flex items-start gap-3 bg-red-500/8 border border-red-500/20 rounded-xl px-4 py-3">
        <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
        <p className="text-xs text-red-300">
          Submitting this will mark the machine as <strong>IN REPAIR</strong> and alert the office immediately. Do not operate until cleared.
        </p>
      </div>

      {/* Feedback */}
      {error && (
        <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-xs text-red-400">{error}</p>
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl px-4 py-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <p className="text-xs text-emerald-400 font-bold">Breakdown reported! Office has been notified.</p>
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-black text-sm transition-all active:scale-[0.98]"
      >
        {isPending
          ? <><Loader2 className="w-4 h-4 animate-spin" /> Reporting…</>
          : <><AlertTriangle className="w-4 h-4" /> Report Breakdown</>
        }
      </button>
    </form>
  );
}
