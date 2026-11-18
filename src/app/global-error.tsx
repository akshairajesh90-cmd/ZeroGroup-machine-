"use client";

import React, { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[GLOBAL APPLICATION CRASH]:", error);
  }, [error]);

  return (
    <html lang="en">
      <body className="bg-slate-950 text-slate-100 flex min-h-screen items-center justify-center p-4 font-sans">
        <div className="max-w-md w-full rounded-2xl border border-slate-800 bg-slate-900 p-8 text-center shadow-2xl">
          <h1 className="text-xl font-black text-white mb-2">Zero Group Operations</h1>
          <p className="text-xs text-slate-400 mb-6">
            An unexpected application state occurred. Please refresh the app to continue.
          </p>
          <button
            onClick={() => reset()}
            className="w-full py-3 px-4 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 font-black text-sm uppercase tracking-wider transition-all"
          >
            Reload Application
          </button>
        </div>
      </body>
    </html>
  );
}
