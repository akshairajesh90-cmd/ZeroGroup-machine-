"use client";

import React, { useState, useTransition } from "react";
import { CheckCircle2, AlertTriangle, MapPin, X, Package, Loader2, Wrench } from "lucide-react";
import { completeDispatchWithToolReturns } from "@/actions/toolReturns";
import { ToolReturnStatus } from "@prisma/client";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────────────────
type DispatchToolEntry = {
  id: string;           // DispatchTool.id
  toolId: string;
  quantity: number;
  variant?: string | null;
  tool: {
    name: string;
    toolId: string;
  };
};

type ToolReturnItem = {
  dispatchToolId: string;
  toolId: string;
  toolName: string;
  returnStatus: ToolReturnStatus;
  returnNote: string;
};

type Props = {
  dispatch: {
    id: string;
    dispatchNo?: number | null;
    dispatchTools: DispatchToolEntry[];
    customer?: { name: string } | null;
    location: string;
  };
  onClose: () => void;
  onSuccess: () => void;
};

// ─────────────────────────────────────────────────────────────────────────────
// STATUS CONFIG
// ─────────────────────────────────────────────────────────────────────────────
const STATUS_OPTIONS: {
  value: ToolReturnStatus;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bg: string;
  border: string;
}[] = [
  {
    value: "RETURNED",
    label: "Returned",
    description: "Tool is back in the yard",
    icon: <CheckCircle2 className="h-4 w-4" />,
    color: "text-emerald-400",
    bg: "bg-emerald-500/15",
    border: "border-emerald-500/40",
  },
  {
    value: "DAMAGED",
    label: "Needs Repair",
    description: "Damaged / needs workshop maintenance",
    icon: <Wrench className="h-4 w-4" />,
    color: "text-orange-400",
    bg: "bg-orange-500/15",
    border: "border-orange-500/40",
  },
  {
    value: "LEFT_ON_SITE",
    label: "Left on Site",
    description: "Still at customer location",
    icon: <MapPin className="h-4 w-4" />,
    color: "text-amber-400",
    bg: "bg-amber-500/15",
    border: "border-amber-500/40",
  },
  {
    value: "MISSING",
    label: "Missing",
    description: "Cannot be located — flag for admin",
    icon: <AlertTriangle className="h-4 w-4" />,
    color: "text-rose-400",
    bg: "bg-rose-500/15",
    border: "border-rose-500/40",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// MAIN COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function ToolReturnModal({ dispatch, onClose, onSuccess }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Initialize each tool with PENDING status
  const [returns, setReturns] = useState<ToolReturnItem[]>(
    dispatch.dispatchTools.map((dt) => ({
      dispatchToolId: dt.id,
      toolId: dt.toolId,
      toolName: `${dt.tool.name}${dt.variant ? ` (${dt.variant})` : ""} ×${dt.quantity}`,
      returnStatus: "PENDING" as ToolReturnStatus,
      returnNote: "",
    }))
  );

  const updateStatus = (dispatchToolId: string, status: ToolReturnStatus) => {
    setReturns((prev) =>
      prev.map((r) => (r.dispatchToolId === dispatchToolId ? { ...r, returnStatus: status } : r))
    );
  };

  const updateNote = (dispatchToolId: string, note: string) => {
    setReturns((prev) =>
      prev.map((r) => (r.dispatchToolId === dispatchToolId ? { ...r, returnNote: note } : r))
    );
  };

  const pendingCount = returns.filter((r) => r.returnStatus === "PENDING").length;
  const allAccounted = pendingCount === 0;

  const handleConfirm = () => {
    setError(null);
    startTransition(async () => {
      const res = await completeDispatchWithToolReturns({
        dispatchId: dispatch.id,
        toolReturns: returns,
      });
      if (res.success) {
        onSuccess();
      } else {
        setError(res.error || "Failed to complete dispatch.");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl bg-zinc-950 border border-zinc-800 rounded-2xl shadow-2xl flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">

        {/* ── Header ── */}
        <div className="flex items-start justify-between px-6 pt-6 pb-4 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/20 border border-amber-500/30 flex items-center justify-center">
              <Package className="h-5 w-5 text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Tool Return Checklist</h2>
              <p className="text-xs text-zinc-500 mt-0.5">
                {dispatch.customer?.name} — {dispatch.location}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-600 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ── Info Banner ── */}
        <div className="mx-6 mt-4 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3 shrink-0">
          <p className="text-xs text-amber-300 font-medium">
            Account for every tool before completing this dispatch. Tools left on site or missing will stay flagged in inventory until resolved.
          </p>
        </div>

        {/* ── Tool List ── */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {returns.map((item) => {
            const selectedOption = STATUS_OPTIONS.find((s) => s.value === item.returnStatus);
            const needsNote = item.returnStatus === "LEFT_ON_SITE" || item.returnStatus === "MISSING";

            return (
              <div key={item.dispatchToolId}
                className={`border rounded-2xl p-4 transition-all ${
                  item.returnStatus === "PENDING"
                    ? "border-zinc-700 bg-zinc-900/50"
                    : `${selectedOption?.border} ${selectedOption?.bg}`
                }`}>
                {/* Tool Name */}
                <div className="flex items-center gap-2 mb-3">
                  <div className={`h-2 w-2 rounded-full ${
                    item.returnStatus === "PENDING" ? "bg-zinc-600" :
                    item.returnStatus === "RETURNED" ? "bg-emerald-500" :
                    item.returnStatus === "LEFT_ON_SITE" ? "bg-amber-500" : "bg-rose-500"
                  }`} />
                  <span className="text-sm font-semibold text-white">{item.toolName}</span>
                </div>

                {/* Status Picker */}
                <div className="flex gap-2">
                  {STATUS_OPTIONS.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => updateStatus(item.dispatchToolId, opt.value)}
                      className={`flex-1 flex flex-col items-center gap-1 py-2.5 px-2 rounded-xl border text-xs font-semibold transition-all
                        ${item.returnStatus === opt.value
                          ? `${opt.bg} ${opt.border} ${opt.color}`
                          : "bg-zinc-800 border-zinc-700 text-zinc-500 hover:border-zinc-600 hover:text-zinc-300"
                        }`}
                    >
                      <span className={item.returnStatus === opt.value ? opt.color : "text-zinc-600"}>
                        {opt.icon}
                      </span>
                      {opt.label}
                    </button>
                  ))}
                </div>

                {/* Note field for non-returned tools */}
                {needsNote && (
                  <div className="mt-3">
                    <input
                      type="text"
                      value={item.returnNote}
                      onChange={(e) => updateNote(item.dispatchToolId, e.target.value)}
                      placeholder={
                        item.returnStatus === "LEFT_ON_SITE"
                          ? "Where exactly is it? (e.g. stored in site office)"
                          : "What happened? (e.g. driver cannot find it)"
                      }
                      className={`w-full bg-zinc-900 border rounded-xl px-3 py-2 text-xs text-white placeholder-zinc-600 focus:outline-none focus:ring-1 transition-all
                        ${item.returnStatus === "MISSING"
                          ? "border-rose-500/40 focus:ring-rose-500/30"
                          : "border-amber-500/40 focus:ring-amber-500/30"
                        }`}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* ── Summary Bar ── */}
        <div className="shrink-0 border-t border-zinc-800 px-6 py-4">
          {/* Progress Tally */}
          <div className="flex items-center gap-4 mb-4">
            {STATUS_OPTIONS.map((opt) => {
              const count = returns.filter((r) => r.returnStatus === opt.value).length;
              return (
                <div key={opt.value} className="flex items-center gap-1.5">
                  <span className={`text-sm font-bold ${opt.color}`}>{count}</span>
                  <span className="text-xs text-zinc-600">{opt.label}</span>
                </div>
              );
            })}
            {pendingCount > 0 && (
              <div className="flex items-center gap-1.5 ml-auto">
                <span className="text-sm font-bold text-zinc-500">{pendingCount}</span>
                <span className="text-xs text-zinc-600">Pending</span>
              </div>
            )}
          </div>

          {/* Error */}
          {error && (
            <div className="mb-3 flex items-center gap-2 bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-2.5">
              <AlertTriangle className="h-4 w-4 text-rose-400 shrink-0" />
              <p className="text-xs text-rose-300">{error}</p>
            </div>
          )}

          {/* Incomplete warning */}
          {!allAccounted && (
            <div className="mb-3 flex items-center gap-2 bg-zinc-800/80 border border-zinc-700 rounded-xl px-4 py-2.5">
              <AlertTriangle className="h-4 w-4 text-zinc-500 shrink-0" />
              <p className="text-xs text-zinc-500">Select a status for all {pendingCount} remaining tool(s) to proceed.</p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isPending}
              className="flex-1 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-sm font-medium text-zinc-400 hover:text-white hover:border-zinc-600 transition-all disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleConfirm}
              disabled={!allAccounted || isPending}
              className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-sm font-bold text-white hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2"
            >
              {isPending ? (
                <><Loader2 className="h-4 w-4 animate-spin" /> Completing...</>
              ) : (
                <><CheckCircle2 className="h-4 w-4" /> Complete Dispatch</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
