"use client";

import { useTransition } from "react";
import { reverseManualAdjustment } from "@/actions/adjustments";
import { RotateCcw, Loader2 } from "lucide-react";

export default function ReversalButton({ adjustmentId }: { adjustmentId: string }) {
  const [isPending, startTransition] = useTransition();

  const handleReverse = () => {
    if (confirm("Are you sure you want to reverse this adjustment? This will create an offsetting transaction in the ledger for full audit tracking.")) {
      startTransition(async () => {
        try {
          const res = await reverseManualAdjustment(adjustmentId);
          if (res?.success) {
            alert("Ledger reversal successful! Offsetting entry added.");
          }
        } catch (err: any) {
          alert("Reversal failed: " + err.message);
        }
      });
    }
  };

  return (
    <button
      onClick={handleReverse}
      disabled={isPending}
      className="inline-flex items-center gap-1 bg-zinc-800 hover:bg-rose-500/20 text-zinc-400 hover:text-rose-400 border border-zinc-700/50 px-2 py-1 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
      title="Reverse Adjustment"
    >
      {isPending ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <RotateCcw className="h-3 w-3" />
      )}
      Reverse
    </button>
  );
}
