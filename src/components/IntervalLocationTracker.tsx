"use client";

import { useEffect, useRef } from "react";
import { updateEmployeeLocation } from "@/actions/location";

export default function IntervalLocationTracker({ intervalMs = 300000 }: { intervalMs?: number }) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      console.warn("Geolocation not supported by this browser.");
      return;
    }

    const pingLocation = () => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          updateEmployeeLocation(position.coords.latitude, position.coords.longitude)
            .catch((err) => console.error("Location sync failed:", err));
        },
        (error) => {
          console.warn("Interval GPS capture failed:", error.message);
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        }
      );
    };

    // Ping immediately on mount
    pingLocation();

    // Then ping on the specified interval
    intervalRef.current = setInterval(pingLocation, intervalMs);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [intervalMs]);

  return null; // Silent component
}
