"use client";

import { useEffect, useRef } from "react";
import { captureCurrentPosition } from "@/lib/geoCapture";
import { offlineDb } from "@/lib/offlineDb";

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
      // Cadence guard: 60s
      if (globalLastAutoPingTime > 0 && now - globalLastAutoPingTime < 60000) {
        return;
      }

      isAutoPingingInProgress = true;
      try {
        const pos = await captureCurrentPosition({
          timeout: 10000,
          maximumAge: 30000,
          allowSimulationFallback: false,
        });

        const pingPayload = {
          employeeId: employeeId,
          dispatchId: dispatchId,
          latitude: pos.latitude,
          longitude: pos.longitude,
          accuracy: pos.accuracy,
          speed: pos.speed ?? undefined,
          heading: pos.heading ?? undefined,
          source: pos.source || "OPERATOR_AUTOPING",
          timestamp: pos.timestamp || Date.now(),
        };

        if (navigator.onLine) {
          const res = await fetch("/api/location/ping", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(pingPayload),
          });
          if (res.ok) {
            globalLastAutoPingTime = Date.now();
          }
        } else {
          // Store directly in offlineDb locationPings queue
          await offlineDb.locationPings.add({
            ...pingPayload,
            synced: false,
          });
          globalLastAutoPingTime = Date.now();
        }
      } catch (err: any) {
        console.warn("[AutoPinger] GPS notice:", err.message);
      } finally {
        isAutoPingingInProgress = false;
      }
    };

    // First auto-ping after 3 seconds
    const now = Date.now();
    if (globalLastAutoPingTime === 0 || now - globalLastAutoPingTime >= 60000) {
      timeoutRef.current = setTimeout(pingLocation, 3000);
    }

    // Interval every 60 seconds
    intervalRef.current = setInterval(pingLocation, 60000);

    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [dispatchId, employeeId]);

  return null;
}
