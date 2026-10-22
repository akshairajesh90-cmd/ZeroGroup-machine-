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
        allowSimulationFallback: true,
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
        className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors active:scale-95 ${
          status === "success"
            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
            : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700 border border-zinc-700"
        }`}
      >
        {isUpdating ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : status === "success" ? (
          <Check className="h-3.5 w-3.5" />
        ) : (
          <MapPin className="h-3.5 w-3.5" />
        )}
        {isUpdating ? "Capturing GPS..." : status === "success" ? "Location Saved" : "Update Site Location"}
      </button>
      {status === "error" && (
        <span className="text-[9px] text-red-400 font-bold ml-1">{errorMsg}</span>
      )}
    </div>
  );
}
