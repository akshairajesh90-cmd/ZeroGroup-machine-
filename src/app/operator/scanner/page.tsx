"use client";

import { useState } from "react";
import { QrCode, Search, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";

export default function AssetScannerPage() {
  const [scannedAsset, setScannedAsset] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  const simulateScan = () => {
    setIsScanning(true);
    setTimeout(() => {
      setScannedAsset("VIBRATOR-007");
      setIsScanning(false);
    }, 1500);
  };

  const checkOutAsset = () => {
    alert(`Asset ${scannedAsset} checked out successfully.`);
    setScannedAsset(null);
  };

  return (
    <div className="space-y-6">
      <div className="pt-2">
        <h1 className="text-2xl font-black text-white mt-0.5 uppercase tracking-wider flex items-center gap-2">
          <QrCode className="w-6 h-6 text-orange-500" /> Scanner
        </h1>
        <p className="text-xs text-zinc-500 mt-1 font-bold">Tool & Asset Checkout</p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-center space-y-4">
        <div className="relative w-48 h-48 mx-auto bg-black rounded-2xl border-4 border-dashed border-zinc-700 flex items-center justify-center overflow-hidden">
          {isScanning ? (
             <div className="absolute inset-0 bg-orange-500/20 animate-pulse flex items-center justify-center">
                <Search className="w-8 h-8 text-orange-500 animate-bounce" />
             </div>
          ) : (
             <QrCode className="w-16 h-16 text-zinc-800" />
          )}
          
          <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-orange-500"></div>
          <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-orange-500"></div>
          <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-orange-500"></div>
          <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-orange-500"></div>
        </div>

        <p className="text-xs font-bold text-zinc-400">Position barcode inside the frame</p>

        <button 
          onClick={simulateScan}
          disabled={isScanning || !!scannedAsset}
          className="w-full py-4 rounded-xl font-black uppercase tracking-wider transition-colors bg-zinc-800 text-white hover:bg-zinc-700 disabled:opacity-50"
        >
          {isScanning ? "Scanning..." : "Simulate Scan"}
        </button>
      </div>

      {scannedAsset && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5 animate-in fade-in slide-in-from-bottom-4">
           <div className="flex items-center gap-3 mb-4">
             <CheckCircle2 className="w-6 h-6 text-emerald-500" />
             <div>
                <h3 className="text-sm font-black text-white">Asset Found</h3>
                <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest">{scannedAsset}</p>
             </div>
           </div>

           <div className="bg-black/50 rounded-xl p-3 mb-4 flex items-center gap-3">
             <AlertTriangle className="w-5 h-5 text-amber-500" />
             <p className="text-[10px] text-zinc-300 font-medium leading-tight">
               By checking this out, you accept responsibility for its condition and safe return at the end of the shift.
             </p>
           </div>

           <button 
              onClick={checkOutAsset}
              className="w-full py-4 rounded-xl font-black uppercase tracking-wider transition-colors bg-emerald-600 text-white hover:bg-emerald-700 flex items-center justify-center gap-2"
           >
             Check Out Asset <ArrowRight className="w-4 h-4" />
           </button>
        </div>
      )}
    </div>
  );
}
