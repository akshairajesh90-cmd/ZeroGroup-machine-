"use client";

/**
 * @file DriverPortalClient.tsx
 * @description
 * Client Component rendering the Mobile Driver Portal UI.
 * 
 * Architectural Why:
 * 1. Zero Group Branding: Uses a glassmorphic header and dark mode (`bg-zinc-950`).
 * 2. Fat Finger UI: In field conditions (dust, vibration, glare), tiny buttons fail.
 *    We use massive, full-width touch targets with maximum contrast.
 * 3. Silent GPS Capture & Network Resilience: Implements a 5-second timeout on 
 *    `navigator.geolocation`. Construction sites have notorious dead zones. If GPS 
 *    fails, we degrade gracefully by sending `null` rather than blocking the UI,
 *    ensuring the trip status can still be updated.
 */

import { useState } from "react";
import { updateDispatchStatus } from "./actions";
import { DispatchStatus } from "@prisma/client";
import { AlertTriangle, MapPin, CheckCircle, Navigation } from "lucide-react";
import { toast } from "sonner";

// Explicitly type the serialized dispatch because Decimal fields were converted to numbers
type SerializedDispatch = {
  id: string;
  status: DispatchStatus;
  location: string;
  customer: { name: string; phone: string; address: string };
  // Add other properties if needed
};

export default function DriverPortalClient({ initialDispatch }: { initialDispatch: SerializedDispatch }) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<DispatchStatus>(initialDispatch.status);

  // Helper to silently capture GPS with a strict 5-second timeout
  const captureGps = (): Promise<{ lat: number | null; lng: number | null }> => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        console.warn("Geolocation not supported by this browser.");
        resolve({ lat: null, lng: null });
        return;
      }

      // Graceful degradation: 5-second timeout
      const timeoutId = setTimeout(() => {
        console.warn("GPS timeout exceeded. Degrading gracefully.");
        resolve({ lat: null, lng: null });
      }, 5000);

      navigator.geolocation.getCurrentPosition(
        (position) => {
          clearTimeout(timeoutId);
          resolve({ lat: position.coords.latitude, lng: position.coords.longitude });
        },
        (error) => {
          clearTimeout(timeoutId);
          console.warn("GPS capture failed:", error.message);
          resolve({ lat: null, lng: null });
        },
        { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
      );
    });
  };

  const handleStatusUpdate = async (newStatus: DispatchStatus) => {
    if (isUpdating) return;
    setIsUpdating(true);
    
    // Optimistic UI could be implemented here, but we wait for the Server Action to ensure Audit Logs succeed
    try {
      const { lat, lng } = await captureGps();
      const result = await updateDispatchStatus(initialDispatch.id, newStatus, lat, lng);
      
      if (!result.success) {
        toast.error("Failed to update status. Please try again.");
      } else {
        toast.success("Status updated successfully.");
        // We track the status client-side temporarily in case Server Components take a moment to re-render
        setCurrentStatus(newStatus);
      }
    } catch (error) {
      console.error(error);
      toast.error("Network error. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  const renderActionButton = () => {
    switch (currentStatus) {
      case "PENDING":
        return (
          <button
            onClick={() => handleStatusUpdate("EN_ROUTE")}
            disabled={isUpdating}
            className="w-full py-8 bg-yellow-500 hover:bg-yellow-400 text-zinc-950 font-bold text-2xl rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
          >
            <Navigation className="w-8 h-8" />
            START TRIP
          </button>
        );
      case "EN_ROUTE":
        return (
          <button
            onClick={() => handleStatusUpdate("IN_PROGRESS")}
            disabled={isUpdating}
            className="w-full py-8 bg-green-500 hover:bg-green-400 text-zinc-950 font-bold text-2xl rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
          >
            <MapPin className="w-8 h-8" />
            ARRIVED AT SITE
          </button>
        );
      case "IN_PROGRESS":
        return (
          <button
            onClick={() => handleStatusUpdate("COMPLETED")}
            disabled={isUpdating}
            className="w-full py-8 bg-blue-500 hover:bg-blue-400 text-zinc-950 font-bold text-2xl rounded-2xl shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
          >
            <CheckCircle className="w-8 h-8" />
            COMPLETE & RETURN
          </button>
        );
      default:
        // Completed / Cancelled handled by the server component (won't render this page)
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white flex flex-col font-sans selection:bg-zinc-800">
      {/* Zero Group Glassmorphic Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-zinc-900/60 border-b border-zinc-800/80 p-4 flex flex-col items-center justify-center">
        <h1 className="text-2xl font-black tracking-tight text-white drop-shadow-sm">IronRent</h1>
        <span className="text-[10px] font-bold text-zinc-400 tracking-[0.2em] uppercase mt-1">
          Powered by Zero Group
        </span>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 p-6 flex flex-col">
        <div className="mb-8">
          <h2 className="text-zinc-500 text-xs font-bold uppercase tracking-widest mb-3">
            Current Mission
          </h2>
          <div className="bg-zinc-900/80 backdrop-blur-sm rounded-2xl p-6 border border-zinc-800/80 shadow-2xl">
            <h3 className="text-2xl font-black text-white mb-2 tracking-tight">
              {initialDispatch.customer.name}
            </h3>
            <p className="text-zinc-400 font-medium text-lg leading-relaxed mb-6">
              {initialDispatch.location}
            </p>
            <div className="flex items-center">
              <span className="bg-zinc-800/80 px-4 py-2 rounded-xl border border-zinc-700/80 font-bold text-sm tracking-wide text-zinc-300">
                STATUS: {currentStatus}
              </span>
            </div>
          </div>
        </div>

        {/* Massive Touch Targets */}
        <div className="mt-auto space-y-4">
          {renderActionButton()}
          
          <button
            disabled={isUpdating}
            className="w-full py-6 bg-red-950/20 hover:bg-red-900/40 text-red-500 border border-red-900/30 font-bold text-xl rounded-2xl transition-all active:scale-95 flex items-center justify-center gap-3 disabled:opacity-50"
          >
            <AlertTriangle className="w-7 h-7" />
            REPORT ISSUE
          </button>
        </div>
      </main>
    </div>
  );
}
