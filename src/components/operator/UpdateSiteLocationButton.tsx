"use client";

import { useState } from "react";
import { MapPin, Loader2, Check } from "lucide-react";
import { updateDispatchLocation } from "@/actions/location";
import { captureCurrentPosition } from "@/lib/geoCapture";

export default function UpdateSiteLocationButton({
  dispatchId,
  initialMapLink,
}: {
  dispatchId: string;
  initialMapLink?: string | null;
}) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [status, setStatus] = useState<"idle" | "success" | "error">(
    initialMapLink ? "success" : "idle"
  );
  const [errorMsg, setErrorMsg] = useState("");

  const handleUpdateLocation = async () => {
    setIsUpdating(true);
    setStatus("idle");
    setErrorMsg("");

    try {
      const pos = await captureCurrentPosition({
        timeout: 10000,
        maximumAge: 30000,
        allowSimulationFallback: false,
      });

      const res = await updateDispatchLocation(dispatchId, pos.latitude, pos.longitude, pos.accuracy);

      if (res?.success) {
        setStatus("success");
      } else {
        setErrorMsg(res?.error || "Failed to save location");
        setStatus("error");
      }
    } catch (err: any) {
      console.error("GPS error:", err);
      setErrorMsg(err.message || "Could not acquire location");
      setStatus("error");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <div className="flex flex-col items-start gap-1 mt-2">
      <button
        onClick={handleUpdateLocation}
        disabled={isUpdating}
        className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 shadow-sm ${
          status === "success"
            ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
            : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700 border border-zinc-700"
        }`}
      >
        {isUpdating ? (
          <Loader2 className="h-4 w-4 animate-spin text-cyan-400" />
        ) : status === "success" ? (
          <Check className="h-4 w-4 text-emerald-400" />
        ) : (
          <MapPin className="h-4 w-4 text-cyan-400" />
        )}
        <span>{isUpdating ? "Capturing GPS..." : status === "success" ? "Location Saved" : "Update Site Location"}</span>
        <span className="text-[10px] text-zinc-400 normal-case font-medium ml-1">
          {status === "success" ? "സേവ് ചെയ്തു" : "(സൈറ്റ് ലൊക്കേഷൻ)"}
        </span>
      </button>
      {status === "error" && (
        <span className="text-[9px] text-red-400 font-bold ml-1">{errorMsg}</span>
      )}
    </div>
  );
}
