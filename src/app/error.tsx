"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

export default function RootError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[APPLICATION ROOT ERROR]:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-slate-950 px-4 text-center text-slate-100 font-sans">
      <div className="max-w-md w-full rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-xl">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 mb-6">
          <AlertTriangle className="h-8 w-8" />
        </div>

        <h1 className="text-xl font-black tracking-tight text-white mb-2">
          Temporary System Notice
        </h1>
        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
          The requested page encountered a transient connection issue. Your data and session remain safe.
        </p>

        {error.digest && (
          <p className="text-[10px] font-mono text-slate-500 mb-6 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800/80 select-all">
            Digest: {error.digest}
          </p>
        )}

        <div className="flex flex-col gap-3">
          <button
            onClick={() => reset()}
            className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm transition-all active:scale-95 shadow-lg shadow-cyan-500/20"
          >
            <RefreshCw className="h-4 w-4" />
            Reload Page
          </button>

          <Link
            href="/"
            className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-sm transition-all active:scale-95 border border-slate-700/60"
          >
            <Home className="h-4 w-4" />
            Return to Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
