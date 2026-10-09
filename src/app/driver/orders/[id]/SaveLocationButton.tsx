"use client";

import { useState } from "react";
import { updateDispatchMapLinkAction } from "../../actions";
import { MapPin, Loader2, CheckCircle2 } from "lucide-react";

export default function SaveLocationButton({ dispatchId }: { dispatchId: string }) {
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSaveLocation = () => {
    if (!navigator.geolocation) {
      setError("Geolocation is not supported by your browser");
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        const gmapLink = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
        
        try {
          await updateDispatchMapLinkAction(dispatchId, gmapLink, latitude, longitude);
          setSuccess(true);
          setTimeout(() => setSuccess(false), 3000);
        } catch (err) {
          setError("Failed to save location");
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        let errorMsg = err.message;
        if (err.code === 1) errorMsg = "Permission Denied: Please allow location access in your browser settings.";
        if (err.code === 2) errorMsg = "Position Unavailable: GPS signal not found.";
        if (err.code === 3) errorMsg = "Timeout: Took too long to find GPS signal.";
        
        // Browsers block GPS on non-HTTPS (except localhost)
        if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
           errorMsg = "GPS requires HTTPS! It will work automatically once deployed to production. For local network testing, use localhost.";
        }
        
        setError(errorMsg);
        setLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <div className="w-full">
      <button
        onClick={handleSaveLocation}
        disabled={loading || success}
        className="flex items-center justify-center gap-2 w-full py-4 rounded-xl bg-cyan-600/20 text-cyan-400 border border-cyan-500/30 hover:bg-cyan-500/30 font-black text-sm transition-all active:scale-[0.98]"
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : success ? (
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
        ) : (
          <MapPin className="w-4 h-4" />
        )}
        {loading ? "Getting GPS..." : success ? "Location Saved!" : "Pin My Current GPS Location"}
      </button>
      {error && <p className="text-red-400 text-[10px] font-bold text-center mt-2">{error}</p>}
    </div>
  );
}
