"use client";

import { useState, useTransition } from "react";
import {
  X,
  BookOpen,
  Loader2,
  ChevronDown,
  Gift,
  AlertTriangle,
  Lock,
} from "lucide-react";
import { format } from "date-fns";
import {
  calculateOperatorSettlement,
  finalizeSettlement,
} from "@/actions/settlement";
import { useRouter } from "next/navigation";

interface Props {
  settlementId: string;
  currentVersion: number;
  operatorId: string;
  operatorName: string;
  weekStartDate: string; // yyyy-MM-dd
  weekEndDate: string;   // yyyy-MM-dd
  isFinalized: boolean;
  onClose: () => void;
}

export function OperatorDiaryModal({
  settlementId,
  currentVersion,
  operatorId,
  operatorName,
  weekStartDate,
  weekEndDate,
  isFinalized,
  onClose,
}: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [diary, setDiary]   = useState<any>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError]   = useState<string | null>(null);

  // Inline Bonus / Penalty state
  const [bonusAmount, setBonusAmount]   = useState("");
  const [bonusReason, setBonusReason]   = useState("");
  const [penaltyAmount, setPenaltyAmount] = useState("");
  const [penaltyReason, setPenaltyReason] = useState("");
  const [finalNotes, setFinalNotes] = useState("");

  const [finalizeSuccess, setFinalizeSuccess] = useState(false);
  const [finalizeError, setFinalizeError]     = useState<string | null>(null);

  // Load diary on mount
  if (!loaded && !isPending) {
    startTransition(async () => {
      const res = await calculateOperatorSettlement({ operatorId, startDate: weekStartDate, endDate: weekEndDate });
      if (res.success && res.data) {
        setDiary(res.data);
      } else {
        setError(res.error || "Failed to load diary.");
      }
      setLoaded(true);
    });
  }

  const handleFinalize = () => {
    if (!confirm(`âš ï¸ Finalize and lock the settlement for ${operatorName}? This cannot be undone.`)) return;
    startTransition(async () => {
      setFinalizeError(null);
      const res = await finalizeSettlement({
        settlementId,
        currentVersion,
      });
      if (res.success) {
        setFinalizeSuccess(true);
        router.refresh();
        setTimeout(onClose, 1500);
      } else {
        setFinalizeError(res.error || "Finalization failed.");
      }
    });
  };

  const typeColor = (type: string) => {
    switch (type) {
      case "WORK":    return "bg-emerald-500/60";
      case "ADVANCE": return "bg-amber-500/60";
      case "BONUS":   return "bg-blue-500/60";
      case "PENALTY": return "bg-red-500/60";
      default:        return "bg-zinc-600";
    }
  };

  const amountColor = (type: string) => {
    switch (type) {
      case "WORK":    return "text-emerald-400";
      case "BONUS":   return "text-blue-400";
      case "ADVANCE": return "text-amber-500";
      case "PENALTY": return "text-red-400";
      default:        return "text-white";
    }
  };

  const amountPrefix = (type: string) =>
    type === "WORK" || type === "BONUS" ? "+" : "-";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-sm">
      <div className="bg-zinc-950 border border-zinc-800 rounded-t-3xl sm:rounded-3xl w-full sm:max-w-lg max-h-[92vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-amber-500/10 rounded-xl flex items-center justify-center">
              <BookOpen className="h-4 w-4 text-amber-400" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white">{operatorName}</h2>
              <p className="text-[10px] text-zinc-500 font-mono">
                Daily Diary â€” {weekStartDate} to {weekEndDate}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors p-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-5 py-4 space-y-4">
          {/* Loading state */}
          {isPending && !diary && (
            <div className="flex items-center justify-center py-12 gap-3">
              <Loader2 className="h-5 w-5 animate-spin text-zinc-500" />
              <span className="text-sm text-zinc-500 font-bold">Loading diaryâ€¦</span>
            </div>
          )}

          {error && (
            <div className="bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold p-3 rounded-xl">
              {error}
            </div>
          )}

          {/* Summary bar */}
          {diary && (
            <>
              <div className="grid grid-cols-3 gap-2">
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-center">
                  <p className="text-[10px] font-bold uppercase text-zinc-500">Earned</p>
                  <p className="text-base font-black text-emerald-400">
                    â‚¹{diary.totalEarned.toLocaleString("en-IN")}
                  </p>
                </div>
                <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-center">
                  <p className="text-[10px] font-bold uppercase text-amber-600">Deducted</p>
                  <p className="text-base font-black text-amber-500">
                    -â‚¹{diary.totalDeducted.toLocaleString("en-IN")}
                  </p>
                </div>
                <div className={`rounded-xl p-3 text-center border ${
                  diary.estimatedPayout >= 0
                    ? "bg-emerald-500/10 border-emerald-500/30"
                    : "bg-red-500/10 border-red-500/30"
                }`}>
                  <p className="text-[10px] font-bold uppercase text-zinc-500">Payout</p>
                  <p className={`text-base font-black ${diary.estimatedPayout >= 0 ? "text-emerald-400" : "text-red-400"}`}>
                    â‚¹{diary.estimatedPayout.toLocaleString("en-IN")}
                  </p>
                </div>
              </div>

              {/* Daily Diary entries */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                <div className="px-4 py-2.5 border-b border-zinc-800 flex items-center gap-2">
                  <BookOpen className="h-3.5 w-3.5 text-zinc-500" />
                  <span className="text-xs font-black text-zinc-400 uppercase tracking-widest">
                    Chronological Diary ({diary.diary.length} entries)
                  </span>
                </div>

                {diary.diary.length === 0 ? (
                  <div className="px-4 py-6 text-center">
                    <p className="text-xs text-zinc-500 font-bold">No entries this week.</p>
                  </div>
                ) : (
                  <div className="divide-y divide-zinc-800/60">
                    {diary.diary.map((entry: any, idx: number) => {
                      const d = new Date(entry.date);
                      return (
                        <div key={idx} className="flex items-center gap-3 px-4 py-3">
                          {/* Date */}
                          <div className="w-10 shrink-0 text-center">
                            <p className="text-[9px] font-black text-zinc-500 uppercase">
                              {format(d, "MMM")}
                            </p>
                            <p className="text-sm font-black text-white leading-none">
                              {format(d, "dd")}
                            </p>
                            <p className="text-[8px] text-zinc-600 font-bold">
                              {format(d, "EEE")}
                            </p>
                          </div>

                          {/* Color bar */}
                          <div className={`w-0.5 h-9 rounded-full shrink-0 ${typeColor(entry.type)}`} />

                          {/* Label */}
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-zinc-200 truncate">{entry.label}</p>
                            <p className="text-[9px] font-black uppercase tracking-widest text-zinc-500 mt-0.5">
                              {entry.type}
                              {entry.status === "SETTLED" ? " â€¢ Settled" : ""}
                            </p>
                          </div>

                          {/* Amount */}
                          <span className={`text-sm font-black font-mono shrink-0 ${amountColor(entry.type)}`}>
                            {amountPrefix(entry.type)}â‚¹{entry.amount.toLocaleString("en-IN")}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* â”€â”€ Inline Bonus / Penalty (only for non-finalized settlements) â”€â”€ */}
              {!isFinalized && (
                <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
                  <div className="px-4 py-2.5 border-b border-zinc-800">
                    <p className="text-xs font-black text-zinc-400 uppercase tracking-widest">
                      Final Adjustments Before Locking
                    </p>
                  </div>
                  <div className="p-4 space-y-3">
                    {/* Bonus */}
                    <div className="flex gap-2 items-start">
                      <div className="w-7 h-7 bg-blue-500/10 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                        <Gift className="h-3.5 w-3.5 text-blue-400" />
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">
                          Bonus (â‚¹) â€” Optional
                        </label>
                        <input
                          type="number"
                          placeholder="0"
                          value={bonusAmount}
                          onChange={(e) => setBonusAmount(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 focus:border-blue-500 rounded-xl px-3 py-2 text-sm text-white font-bold outline-none transition-colors"
                        />
                        <input
                          type="text"
                          placeholder="Reason (e.g. Extra effort, festival gift)"
                          value={bonusReason}
                          onChange={(e) => setBonusReason(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 focus:border-blue-500 rounded-xl px-3 py-2 text-xs text-zinc-300 outline-none transition-colors"
                        />
                      </div>
                    </div>

                    {/* Penalty */}
                    <div className="flex gap-2 items-start">
                      <div className="w-7 h-7 bg-red-500/10 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                        <AlertTriangle className="h-3.5 w-3.5 text-red-400" />
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <label className="text-[10px] font-black uppercase text-zinc-500 tracking-widest">
                          Penalty (â‚¹) â€” Optional
                        </label>
                        <input
                          type="number"
                          placeholder="0"
                          value={penaltyAmount}
                          onChange={(e) => setPenaltyAmount(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 focus:border-red-500 rounded-xl px-3 py-2 text-sm text-white font-bold outline-none transition-colors"
                        />
                        <input
                          type="text"
                          placeholder="Reason (e.g. Equipment damage, absence)"
                          value={penaltyReason}
                          onChange={(e) => setPenaltyReason(e.target.value)}
                          className="w-full bg-zinc-950 border border-zinc-800 focus:border-red-500 rounded-xl px-3 py-2 text-xs text-zinc-300 outline-none transition-colors"
                        />
                      </div>
                    </div>

                    {/* Notes */}
                    <input
                      type="text"
                      placeholder="Settlement notes (optional)"
                      value={finalNotes}
                      onChange={(e) => setFinalNotes(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 focus:border-zinc-600 rounded-xl px-3 py-2 text-xs text-zinc-400 outline-none transition-colors"
                    />
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        {!isFinalized && diary && (
          <div className="px-5 py-4 border-t border-zinc-800 shrink-0 space-y-2">
            {finalizeError && (
              <p className="text-xs text-red-400 font-bold text-center">{finalizeError}</p>
            )}
            {finalizeSuccess ? (
              <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black p-3 rounded-xl text-center">
                ðŸ”’ Settlement Finalized & Locked!
              </div>
            ) : (
              <button
                onClick={handleFinalize}
                disabled={isPending}
                className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-500 hover:to-emerald-600 disabled:opacity-50 text-white font-black py-3 rounded-2xl text-sm flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-900/30"
              >
                {isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Lock className="h-4 w-4" />
                )}
                Lock Saturday Settlement for {operatorName}
              </button>
            )}
          </div>
        )}

        {isFinalized && (
          <div className="px-5 py-4 border-t border-zinc-800 shrink-0">
            <div className="bg-zinc-900 border border-zinc-800 text-zinc-500 text-xs font-black p-3 rounded-xl text-center flex items-center justify-center gap-2">
              <Lock className="h-3.5 w-3.5" /> This settlement is finalized and locked.
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
