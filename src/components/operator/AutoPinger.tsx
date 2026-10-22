"use client";

import { useEffect, useRef } from "react";
import { captureCurrentPosition } from "@/lib/geoCapture";

let globalLastAutoPingTime = 0;
let isAutoPingingInProgress = false;

export default function AutoPinger({
  dispatchId,
  employeeId,
}: {
  dispatchId: string;
  employeeId: string;
}) {
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const pingLocation = async () => {
      if (isAutoPingingInProgress) return;

      const now = Date.now();
      if (globalLastAutoPingTime > 0 && now - globalLastAutoPingTime < 300000) {
        return;
      }

      isAutoPingingInProgress = true;
      try {
        const pos = await captureCurrentPosition({
          timeout: 10000,
          maximumAge: 30000,
          allowSimulationFallback: true,
        });

        const requestBody = JSON.stringify({
          employeeId: employeeId,
          dispatchId: dispatchId,
          latitude: pos.latitude,
          longitude: pos.longitude,
          accuracy: pos.accuracy,
          source: pos.source,
          timestamp: pos.timestamp,
        });

        if (navigator.onLine) {
          const res = await fetch("/api/location/ping", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: requestBody,
          });
          if (res.ok) {
            globalLastAutoPingTime = Date.now();
          }
        } else {
          const { offlineDb } = await import("@/lib/offlineDb");
          await offlineDb.queuedRequests.add({
            url: "/api/location/ping",
            method: "POST",
            body: requestBody,
            headers: { "Content-Type": "application/json" },
            createdAt: Date.now(),
            retries: 0,
            tag: "location-ping-auto",
          });
          globalLastAutoPingTime = Date.now();
        }
      } catch (err: any) {
        console.warn("[AutoPinger] GPS notice:", err.message);
      } finally {
        isAutoPingingInProgress = false;
      }
    };

    // First auto-ping after 4 seconds to stagger network requests
    const now = Date.now();
    if (globalLastAutoPingTime === 0 || now - globalLastAutoPingTime >= 300000) {
      timeoutRef.current = setTimeout(pingLocation, 4000);
    }

    intervalRef.current = setInterval(pingLocation, 300000);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [dispatchId, employeeId]);

  return null;
}
