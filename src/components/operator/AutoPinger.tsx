"use client";

import { useEffect, useRef } from "react";

export default function AutoPinger({ dispatchId, employeeId }: { dispatchId: string, employeeId: string }) {
  const isPinging = useRef(false);

  useEffect(() => {
    const pingLocation = async () => {
      if (isPinging.current) return;
      if (!navigator.geolocation) return;

      isPinging.current = true;
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
          console.warn("Auto ping GPS error:", error.message);
          isPinging.current = false;
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    };

    // Ping immediately on mount
    pingLocation();

    // Ping every 5 minutes (300,000 ms)
    const interval = setInterval(pingLocation, 300000);

    return () => clearInterval(interval);
  }, [dispatchId, employeeId]);

  return null; // Silent component
}
