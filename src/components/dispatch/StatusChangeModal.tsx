"use client";

import React, { useState, useTransition } from "react";
import { X, AlertTriangle, Calendar, CheckCircle2, RotateCcw, Loader2 } from "lucide-react";
import { updateDispatchStatus } from "@/actions/dispatch";

interface StatusChangeModalProps {
  dispatch: any;
  targetStatus: "CANCELLED" | "POSTPONED" | "PENDING";
  onClose: () => void;
  onSuccess: (updatedDispatch?: any) => void;
}

export function StatusChangeModal({
  dispatch,
  targetStatus,
  onClose,
  onSuccess,
}: StatusChangeModalProps) {
  const [isPending, startTransition] = useTransition();
  const [reason, setReason] = useState("");
  const [newDate, setNewDate] = useState(() => {
    // Default to tomorrow for postponement
    const d = new Date(dispatch.dateOfService || new Date());
    d.setDate(d.getDate() + 1);
    return d.toISOString().split("T")[0];
  });
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isCancel = targetStatus === "CANCELLED";
  const isPostpone = targetStatus === "POSTPONED";
  const isReactivate = targetStatus === "PENDING";

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if ((isCancel || isPostpone) && (!reason.trim() || reason.trim().length < 3)) {
      setErrorMsg("A clear reason (at least 3 characters) is required.");
      return;
    }

    if (isPostpone && !newDate) {
      setErrorMsg("Please select a new service date to reschedule this job.");
      return;
    }

    startTransition(async () => {
      const res = await updateDispatchStatus({
        dispatchId: dispatch.id,
        status: targetStatus,
        reason: reason.trim() || (isReactivate ? "Re-activated by staff" : undefined),
        newDateOfService: isPostpone ? newDate : undefined,
      });

      if (res.success) {
        onSuccess();
      } else {
        setErrorMsg(res.error || `Failed to update status to ${targetStatus}`);
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-6 shadow-2xl relative">
        <button
          onClick={onClose}
          disabled={isPending}
          className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3 mb-4">
          {isCancel && (
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
              <AlertTriangle className="w-6 h-6" />
            </div>
          )}
          {isPostpone && (
            <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Calendar className="w-6 h-6" />
            </div>
          )}
          {isReactivate && (
            <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <RotateCcw className="w-6 h-6" />
            </div>
          )}

          <div>
            <h2 className="text-xl font-black text-white">
              {isCancel && "Cancel Job Dispatch"}
              {isPostpone && "Postpone / Reschedule Job"}
              {isReactivate && "Re-activate Job Dispatch"}
            </h2>
            <p className="text-xs text-slate-400">
              Job #{dispatch.id.slice(-6)} • {dispatch.customer?.name || "Customer"}
            </p>
          </div>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {isPostpone && (
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                New Rescheduled Service Date
              </label>
              <input
                type="date"
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                The job will be moved to this date on the dispatch board.
              </p>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
              {isReactivate ? "Optional Notes" : "Mandatory Audit Reason"}
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                isCancel
                  ? "e.g. Heavy rain at construction site, customer cancelled pouring..."
                  : isPostpone
                  ? "e.g. Sump not ready, customer requested postponement by 2 days..."
                  : "e.g. Reopening job after site cleared..."
              }
              rows={3}
              required={!isReactivate}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-amber-500 resize-none"
            />
          </div>

          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400 space-y-1">
            <p className="font-bold text-slate-300">
              {isCancel && "Equipment Release Action:"}
              {isPostpone && "Postponement Asset Action:"}
              {isReactivate && "Reactivation Asset Action:"}
            </p>
            {(isCancel || isPostpone) && (
              <p>
                Assigned machines, vehicles, and tools will be released back to{" "}
                <span className="text-emerald-400 font-semibold">AVAILABLE</span> so other sites can book them.
              </p>
            )}
            {isReactivate && (
              <p>
                Status will return to <span className="text-amber-400 font-semibold">PENDING</span> and machines will be marked as <span className="text-blue-400 font-semibold">RENTED</span>.
              </p>
            )}
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className={`px-5 py-2.5 rounded-xl font-bold text-xs flex items-center gap-2 shadow-lg transition-all ${
                isCancel
                  ? "bg-rose-600 hover:bg-rose-500 text-white shadow-rose-600/20"
                  : isPostpone
                  ? "bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-amber-500/20"
                  : "bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20"
              }`}
            >
              {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              {isCancel && "Confirm Cancellation"}
              {isPostpone && "Reschedule & Postpone"}
              {isReactivate && "Re-activate Job"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
