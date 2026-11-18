"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw, ShieldAlert } from "lucide-react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[ADMIN CONSOLE ERROR]:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-6 text-center">
      <div className="max-w-md w-full rounded-2xl border border-slate-800 bg-slate-900/95 p-6 shadow-xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-rose-500/10 border border-rose-500/25 text-rose-400 mb-4">
          <AlertCircle className="h-7 w-7" />
        </div>

        <h2 className="text-lg font-black text-white tracking-tight mb-1">
          Admin Console Error
        </h2>
        <p className="text-xs text-slate-400 mb-6 leading-relaxed">
          An error occurred rendering this administrative view. You can reload the view or return to the management overview.
        </p>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={() => reset()}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-rose-500 text-white font-black text-xs uppercase tracking-wider transition-all active:scale-95 shadow-lg shadow-rose-500/20"
          >
            <RefreshCw className="h-4 w-4" />
            Reload
          </button>

          <Link
            href="/admin/dispatch-board"
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-800 text-slate-200 font-bold text-xs uppercase tracking-wider transition-all active:scale-95 border border-slate-700/60"
          >
            <ShieldAlert className="h-4 w-4 text-rose-400" />
            Dispatch Board
          </Link>
        </div>
      </div>
    </div>
  );
}
