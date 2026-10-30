"use client";

import React from "react";
import { MapPin } from "lucide-react";
import { useRouter } from "next/navigation";
import { SiteLocationButtons } from "./SiteLocationButtons";

interface DispatchGridCardsProps {
  dispatches: any[];
  onGenerateBill: (id: string) => void;
  isPending: boolean;
}

export function DispatchGridCards({ dispatches, onGenerateBill, isPending }: DispatchGridCardsProps) {
  const router = useRouter();

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
      {dispatches.map((d) => (
        <div
          key={d.id}
          className={`border rounded-2xl p-5 shadow-xl flex flex-col justify-between ${
            d.incidentType ? "bg-red-950/20 border-red-500/50" : d.status === "FLAGGED_MAINTENANCE" ? "bg-amber-950/10 border-amber-500/50" : "bg-slate-900 border-slate-800"
          }`}
        >
          <div className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="font-bold text-white text-base">{d.customer?.name}</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                d.status === "COMPLETED" ? "bg-emerald-500/20 text-emerald-400" :
                d.status === "DELIVERED" ? "bg-blue-500/20 text-blue-400" :
                d.status === "FLAGGED_MAINTENANCE" ? "bg-amber-500/20 text-amber-400" :
                d.status === "CANCELLED" || d.status === "POSTPONED" ? "bg-red-500/20 text-red-400" :
                "bg-slate-500/20 text-slate-400"
              }`}>
                {d.status === "FLAGGED_MAINTENANCE" ? "🔧 MAINT. HOLD" : d.status}
              </span>
            </div>
            <p className="text-xs text-slate-300 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" /> {d.location}
            </p>
            <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1 text-xs text-slate-300">
              <div><strong className="text-slate-400">Main Caller:</strong> {d.mainHelperName || d.mainHelper?.name || "Direct"}</div>
              <div><strong className="text-slate-400">Helper Count:</strong> {d.helperCount || 0} Workers</div>
              <div><strong className="text-slate-400">Lift Storeys:</strong> {d.liftFloors || 1} Floored</div>
              <div><strong className="text-slate-400">Mixer:</strong> {d.mixerCategory || "STANDARD"}</div>
            </div>

            {/* Dual Location & Turn-by-Turn Navigation Buttons */}
            <SiteLocationButtons
              latitude={d.latitude}
              longitude={d.longitude}
              locationName={d.location}
              customerName={d.customer?.name}
              mapLink={d.mapLink}
              variant="cards"
              isOffRoad={d.isOffRoad}
              accessLatitude={d.accessLatitude}
              accessLongitude={d.accessLongitude}
              offRoadBearingDeg={d.offRoadBearingDeg}
              offRoadDistanceM={d.offRoadDistanceM}
              isCentroidVerified={d.isCentroidVerified}
              dwellConfidence={d.dwellConfidence}
            />
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800">
            {d.invoice ? (
              <button
                onClick={() => router.push(`/admin/billing/${d.invoice.id}`)}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow"
              >
                View Bill #{d.invoice.billNumber}
              </button>
            ) : (
              <button
                disabled={isPending}
                onClick={() => onGenerateBill(d.id)}
                className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow transition-colors disabled:opacity-50"
              >
                Generate Bill Slip
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
