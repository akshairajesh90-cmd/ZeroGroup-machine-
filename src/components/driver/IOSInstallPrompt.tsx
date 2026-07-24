"use client";

import React, { useEffect, useState } from "react";
import { Share, PlusSquare, X } from "lucide-react";

export function IOSInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const win = window as unknown as {
      MSStream?: unknown;
      navigator: Navigator & { standalone?: boolean };
    };
    const isIOS =
      /iPad|iPhone|iPod/.test(navigator.userAgent) && !win.MSStream;
    const isStandalone =
      ("standalone" in window.navigator && Boolean(win.navigator.standalone)) ||
      window.matchMedia("(display-mode: standalone)").matches;

    // Show if on iOS and not yet installed as a standalone PWA
    if (isIOS && !isStandalone) {
      // Check localStorage so we don't annoy driver if they dismissed it today
      const dismissedAt = localStorage.getItem("zg_ios_prompt_dismissed");
      if (!dismissedAt || Date.now() - Number(dismissedAt) > 24 * 60 * 60 * 1000) {
        const timer = setTimeout(() => setShowPrompt(true), 2000);
        return () => clearTimeout(timer);
      }
    }
  }, []);

  if (!showPrompt) return null;

  const handleDismiss = () => {
    localStorage.setItem("zg_ios_prompt_dismissed", String(Date.now()));
    setShowPrompt(false);
  };

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 animate-in slide-in-from-bottom duration-300">
      <div className="rounded-2xl border border-indigo-500/20 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-md text-white">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <h4 className="font-semibold text-indigo-400 text-sm">
              Install ZERO GROUP Driver App
            </h4>
            <p className="mt-1 text-xs text-slate-300 leading-relaxed">
              Install this app on your iPhone for quick offline access to dispatches and shift logs.
            </p>
          </div>
          <button
            onClick={handleDismiss}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            aria-label="Close prompt"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3.5 flex items-center justify-around rounded-xl bg-slate-800/80 p-2.5 text-xs font-medium text-slate-200 border border-slate-700/50">
          <div className="flex items-center gap-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold">1</span>
            <span>Tap <Share className="inline h-3.5 w-3.5 text-indigo-400 mx-0.5" /> Share</span>
          </div>
          <div className="h-3 w-px bg-slate-700" />
          <div className="flex items-center gap-1.5">
            <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold">2</span>
            <span>Select <PlusSquare className="inline h-3.5 w-3.5 text-indigo-400 mx-0.5" /> Add to Home Screen</span>
          </div>
        </div>
      </div>
    </div>
  );
}
