import React from "react";

export default function RootLoading() {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="relative flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-2 border-amber-500/20 border-t-amber-400 animate-spin" />
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[10px] font-black text-amber-400">ZG</span>
        </div>
      </div>
      <p className="mt-3 text-[11px] font-bold text-slate-500 uppercase tracking-widest animate-pulse">
        Zero Group
      </p>
    </div>
  );
}
