"use client";

import { useEffect, useRef } from "react";
import { updateEmployeeLocation } from "@/actions/location";
import { captureCurrentPosition } from "@/lib/geoCapture";

let globalLastPingTime = 0;
let isPingingInProgress = false;

export default function IntervalLocationTracker({ intervalMs = 300000 }: { intervalMs?: number }) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const pingLocation = async () => {
      if (isPingingInProgress) return;

      const now = Date.now();
      if (globalLastPingTime > 0 && now - globalLastPingTime < intervalMs) {
        return;
      }

      isPingingInProgress = true;
      try {
        const pos = await captureCurrentPosition({
          timeout: 10000,
          maximumAge: 30000,
          allowSimulationFallback: true,
        });

        const res = await updateEmployeeLocation(
          pos.latitude,
          pos.longitude,
          pos.accuracy,
          pos.source
        );

        if (res?.success) {
          globalLastPingTime = Date.now();
        } else {
          console.warn("[IntervalLocationTracker] Server location sync warning:", res?.error);
        }
      } catch (err: any) {
        console.warn("[IntervalLocationTracker] Location capture warning:", err.message);
      } finally {
        isPingingInProgress = false;
      }
    };

    // First ping after 2 seconds so page navigation is instant, then repeat on intervalMs
    const now = Date.now();
    if (globalLastPingTime === 0 || now - globalLastPingTime >= intervalMs) {
      timeoutRef.current = setTimeout(pingLocation, 2000);
    }

    intervalRef.current = setInterval(pingLocation, intervalMs);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [intervalMs]);

  return null;
}
