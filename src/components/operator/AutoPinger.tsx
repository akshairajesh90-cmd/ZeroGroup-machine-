"use client";

import { useEffect, useRef } from "react";

// Track last auto ping globally
let globalLastAutoPingTime = 0;

export default function AutoPinger({ dispatchId, employeeId }: { dispatchId: string; employeeId: string }) {
  const isPinging = useRef(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !navigator.geolocation) return;

    const pingLocation = async () => {
      if (isPinging.current) return;
      
      const now = Date.now();
      if (globalLastAutoPingTime > 0 && now - globalLastAutoPingTime < 300000) {
        return;
      }

      isPinging.current = true;
      globalLastAutoPingTime = now;

      navigator.geolocation.getCurrentPosition(
        async (position) => {
          try {
            const requestBody = JSON.stringify({
              employeeId: employeeId,
              dispatchId: dispatchId,
              latitude: position.coords.latitude,
              longitude: position.coords.longitude,
              accuracy: position.coords.accuracy,
              source: "AUTO_5MIN"
            });

            if (navigator.onLine) {
              await fetch("/api/location/ping", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: requestBody
              });
            } else {
              const { offlineDb } = await import("@/lib/offlineDb");
              await offlineDb.queuedRequests.add({
                url: "/api/location/ping",
                method: "POST",
                body: requestBody,
                headers: { "Content-Type": "application/json" },
                createdAt: Date.now(),
                retries: 0,
                tag: "location-ping-auto"
              });
            }
          } catch (e) {
            console.warn("Auto ping failed", e);
          } finally {
            isPinging.current = false;
          }
        },
        (error) => {
          console.warn("Auto ping GPS notice:", error.message);
          isPinging.current = false;
        },
        { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
      );
    };

    // Defer initial ping by 5 seconds to guarantee zero UI interference on mount
    const now = Date.now();
    if (globalLastAutoPingTime === 0 || now - globalLastAutoPingTime >= 300000) {
      timeoutRef.current = setTimeout(pingLocation, 5000);
    }

    // Ping every 5 minutes (300,000 ms)
    intervalRef.current = setInterval(pingLocation, 300000);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [dispatchId, employeeId]);

  return null; // Silent component
}
