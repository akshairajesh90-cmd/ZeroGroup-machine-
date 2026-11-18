"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw, ClipboardList } from "lucide-react";

export default function OperatorError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[OPERATOR PORTAL ERROR]:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
      <div className="max-w-sm w-full rounded-2xl border border-zinc-800 bg-zinc-900/95 p-6 shadow-xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-500/10 border border-orange-500/25 text-orange-400 mb-4">
          <AlertCircle className="h-7 w-7" />
        </div>

        <h2 className="text-lg font-black text-white tracking-tight mb-1">
          Field Screen Notice
        </h2>
        <p className="text-xs text-zinc-400 mb-6 leading-relaxed">
          Could not sync live job data. Tap below to refresh or return to your active job.
        </p>

        <div className="flex flex-col gap-2.5">
          <button
            onClick={() => reset()}
            className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-orange-500 text-zinc-950 font-black text-xs uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-orange-500/20"
          >
            <RefreshCw className="h-4 w-4" />
            Retry
          </button>

          <Link
            href="/operator/home"
            className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-zinc-800 text-zinc-200 font-bold text-xs uppercase tracking-wider transition-all active:scale-95 border border-zinc-700/60"
          >
            <ClipboardList className="h-4 w-4 text-orange-400" />
            My Job
          </Link>
        </div>
      </div>
    </div>
  );
}
