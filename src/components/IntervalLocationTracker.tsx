"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { captureCurrentPosition } from "@/lib/geoCapture";
import { offlineDb, CachedLocationPing } from "@/lib/offlineDb";
import { getGeoSessionId, getNextPingSequence } from "@/lib/geoSession";

let isPingingInProgress = false;
let isFlushingInProgress = false;

interface IntervalLocationTrackerProps {
  intervalMs?: number;
  movingIntervalMs?: number;
  idleIntervalMs?: number;
  employeeId?: string;
}

export default function IntervalLocationTracker({
  intervalMs = 15000,
  movingIntervalMs = 15000,
  idleIntervalMs = 120000,
  employeeId,
}: IntervalLocationTrackerProps) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const wakeLockRef = useRef<any>(null);
  const [currentCadence, setCurrentCadence] = useState<number>(movingIntervalMs);
  const lastCoordsRef = useRef<{ lat: number; lng: number; time: number } | null>(null);

  // Replay & Flush offline queued pings to Route Handler atomically
  const flushOfflineQueue = useCallback(async () => {
    if (isFlushingInProgress) return;
    if (typeof navigator !== "undefined" && !navigator.onLine) return;

    try {
      isFlushingInProgress = true;
      const unsynced = await offlineDb.locationPings
        .filter((p) => p.synced === false)
        .toArray();

      if (!unsynced || unsynced.length === 0) return;

      // Sort strictly by seq ascending, fallback to timestamp
      const sorted = unsynced.sort(
        (a, b) => (a.seq ?? 0) - (b.seq ?? 0) || a.timestamp - b.timestamp
      );

      const payload = {
        pings: sorted.map((p) => ({
          employeeId: p.employeeId,
          dispatchId: p.dispatchId,
          latitude: p.latitude,
          longitude: p.longitude,
          accuracy: p.accuracy,
          altitude: p.altitude,
          speed: p.speed,
          heading: p.heading,
          timestamp: p.timestamp,
          source: "OFFLINE_REPLAY",
          sessionId: p.sessionId,
          seq: p.seq,
        })),
      };

      const res = await fetch("/api/location/ping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        keepalive: true,
      });

      if (res.ok) {
        const idsToRemove = sorted.map((p) => p.id).filter(Boolean) as number[];
        await offlineDb.locationPings.bulkDelete(idsToRemove);
        console.log(`[IntervalLocationTracker] Replayed ${idsToRemove.length} offline pings.`);
      }
    } catch (err: any) {
      console.warn("[IntervalLocationTracker] Flush offline queue notice:", err.message);
    } finally {
      isFlushingInProgress = false;
    }
  }, []);

  // 1. Screen Wake Lock & Visibility Focus Flusher
  useEffect(() => {
    if (typeof window === "undefined") return;

    const requestWakeLock = async () => {
      if (!("wakeLock" in navigator)) return;
      try {
        if ("getBattery" in navigator) {
          const battery: any = await (navigator as any).getBattery();
          if (battery.level < 0.2 && !battery.charging) {
            console.warn("[WakeLock] Battery low (<20%) without charger. Skipping WakeLock.");
            return;
          }
        }

        if (document.visibilityState === "visible" && !wakeLockRef.current) {
          wakeLockRef.current = await (navigator as any).wakeLock.request("screen");
          wakeLockRef.current.addEventListener("release", () => {
            wakeLockRef.current = null;
          });
        }
      } catch (err: any) {
        console.warn("[WakeLock] Could not acquire screen lock:", err.message);
      }
    };

    requestWakeLock();

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        requestWakeLock();
        flushOfflineQueue();
      }
    };

    const handleOnline = () => {
      flushOfflineQueue();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("online", handleOnline);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("online", handleOnline);
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, [flushOfflineQueue]);

  // 2. Adaptive GPS Ping Loop
  useEffect(() => {
    if (typeof window === "undefined") return;

    let isDestroyed = false;

    const executePingCycle = async () => {
      if (isDestroyed || isPingingInProgress) return;

      const now = Date.now();
      isPingingInProgress = true;

      try {
        // Try flushing any queued pings first if online
        if (navigator.onLine) {
          flushOfflineQueue().catch(() => {});
        }

        const pos = await captureCurrentPosition({
          timeout: 10000,
          maximumAge: 15000,
          allowSimulationFallback: true,
          applyJitterFilter: true,
        });

        // Determine if moving or stationary to adjust next cadence
        const speed = pos.speed !== undefined && pos.speed !== null ? pos.speed : 0;
        let isMoving = speed >= 5;

        if (lastCoordsRef.current) {
          const dLat = Math.abs(pos.latitude - lastCoordsRef.current.lat);
          const dLng = Math.abs(pos.longitude - lastCoordsRef.current.lng);
          // Roughly > 25 meters displacement
          if (dLat > 0.00025 || dLng > 0.00025) {
            isMoving = true;
          }
        }

        lastCoordsRef.current = { lat: pos.latitude, lng: pos.longitude, time: now };
        const nextCadence = isMoving ? movingIntervalMs : idleIntervalMs;
        setCurrentCadence(nextCadence);

        const sessionId = getGeoSessionId();
        const seq = getNextPingSequence();

        const pingPayload = {
          employeeId,
          latitude: pos.latitude,
          longitude: pos.longitude,
          accuracy: pos.accuracy,
          speed: pos.speed || undefined,
          heading: pos.heading || undefined,
          timestamp: pos.timestamp,
          source: pos.source || "BROWSER",
          sessionId,
          seq,
        };

        // If offline, store in Dexie directly
        if (!navigator.onLine) {
          if (employeeId) {
            await offlineDb.locationPings.add({
              ...pingPayload,
              employeeId,
              synced: false,
            });
            console.log(`[IntervalLocationTracker] Offline: Queued ping #${seq} in Dexie.`);
          }
        } else {
          // Direct HTTP POST to lean stateless Route Handler
          const res = await fetch("/api/location/ping", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(pingPayload),
            keepalive: true,
          });

          if (!res.ok) {
            console.warn("[IntervalLocationTracker] Server returned non-200. Queuing in Dexie.");
            if (employeeId) {
              await offlineDb.locationPings.add({
                ...pingPayload,
                employeeId,
                synced: false,
              }).catch(() => {});
            }
          }
        }
      } catch (err: any) {
        console.warn("[IntervalLocationTracker] GPS capture notice:", err.message);
      } finally {
        isPingingInProgress = false;
        if (!isDestroyed) {
          timeoutRef.current = setTimeout(executePingCycle, currentCadence);
        }
      }
    };

    // First ping after 2 seconds
    timeoutRef.current = setTimeout(executePingCycle, 2000);

    return () => {
      isDestroyed = true;
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [movingIntervalMs, idleIntervalMs, employeeId, currentCadence, flushOfflineQueue]);

  return null;
}
