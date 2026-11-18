"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw, Truck } from "lucide-react";

export default function DriverError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[DRIVER PORTAL ERROR]:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
      <div className="max-w-sm w-full rounded-2xl border border-slate-800 bg-slate-900/95 p-6 shadow-xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-cyan-500/10 border border-cyan-500/25 text-cyan-400 mb-4">
          <AlertCircle className="h-7 w-7" />
        </div>

        <h2 className="text-lg font-black text-white tracking-tight mb-1">
          Shift Screen Offline
        </h2>
        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
          Could not sync live data. Please tap below to refresh or return to your current shift.
        </p>

        <div className="flex flex-col gap-2.5">
          <button
            onClick={() => reset()}
            className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-cyan-500 text-slate-950 font-black text-xs uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-cyan-500/20"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>

          <Link
            href="/driver/home"
            className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-slate-800 text-slate-200 font-bold text-xs uppercase tracking-wider transition-all active:scale-95 border border-slate-700/60"
          >
            <Truck className="h-4 w-4 text-cyan-400" />
            My Shift
          </Link>
        </div>
      </div>
    </div>
  );
}
