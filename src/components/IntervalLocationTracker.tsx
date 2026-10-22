"use client";

import { useEffect, useRef } from "react";
import { updateEmployeeLocation } from "@/actions/location";

// Track last ping globally across route navigation to avoid re-pinging on every page mount
let globalLastPingTime = 0;

export default function IntervalLocationTracker({ intervalMs = 300000 }: { intervalMs?: number }) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !navigator.geolocation) {
      return;
    }

    const pingLocation = () => {
      const now = Date.now();
      // If we pinged recently (within intervalMs), skip
      if (globalLastPingTime > 0 && now - globalLastPingTime < intervalMs) {
        return;
      }
      globalLastPingTime = now;

      navigator.geolocation.getCurrentPosition(
        (position) => {
          updateEmployeeLocation(position.coords.latitude, position.coords.longitude)
            .catch((err) => console.error("Location sync failed:", err));
        },
        (error) => {
          console.warn("Interval GPS capture notice:", error.message);
        },
        {
          // enableHighAccuracy: false prevents mobile OS from freezing UI to spin up cold satellite GPS
          enableHighAccuracy: false,
          timeout: 15000,
          maximumAge: 60000, // Reuse cached position within 60s
        }
      );
    };

    // Defer initial ping by 3 seconds so page navigation & initial UI rendering is 100% instant
    const now = Date.now();
    if (globalLastPingTime === 0 || now - globalLastPingTime >= intervalMs) {
      timeoutRef.current = setTimeout(pingLocation, 3000);
    }

    // Then ping periodically on the specified interval
    intervalRef.current = setInterval(pingLocation, intervalMs);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [intervalMs]);

  return null; // Silent component
}
