"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Fleet page crashed:", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] p-8 text-center bg-slate-950 text-slate-100 rounded-2xl border border-red-500/30">
      <h2 className="text-2xl font-black text-red-500 mb-4">Something went wrong!</h2>
      <p className="text-sm text-slate-400 mb-6 max-w-md font-mono bg-black/50 p-4 rounded-xl border border-white/10 break-all">
        {error.message || "Unknown rendering error"}
      </p>
      <button
        onClick={() => reset()}
        className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl transition-all active:scale-95 shadow-lg shadow-red-500/20"
      >
        Try again
      </button>
    </div>
  );
}
