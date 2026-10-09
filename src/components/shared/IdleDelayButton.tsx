"use client";

import { useState } from "react";
import { Clock } from "lucide-react";

export function IdleDelayButton({ dispatchId }: { dispatchId: string }) {
  const [isDelayed, setIsDelayed] = useState(false);

  return (
    <button 
      onClick={() => setIsDelayed(!isDelayed)}
      className={`w-full flex items-center justify-center gap-2 mt-3 py-3 rounded-xl border font-bold transition-colors ${
        isDelayed 
          ? "bg-amber-500/20 text-amber-400 border-amber-500/40 hover:bg-amber-500/30" 
          : "bg-zinc-800/50 text-zinc-400 border-zinc-700/50 hover:bg-zinc-800 hover:text-white"
      }`}
    >
      <Clock className="w-5 h-5" /> {isDelayed ? "Stop Delay (Resume Work)" : "Report Idle / Weather Delay"}
    </button>
  );
}
