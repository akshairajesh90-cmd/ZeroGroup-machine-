"use client";

import { useEffect, useRef, useState } from "react";
import { updateEmployeeLocation } from "@/actions/location";
import { captureCurrentPosition } from "@/lib/geoCapture";
import { offlineDb } from "@/lib/offlineDb";

let globalLastPingTime = 0;
let isPingingInProgress = false;

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

  // 1. Screen Wake Lock Management (Keeps screen awake on truck dashboard mount)
  useEffect(() => {
    if (typeof window === "undefined" || !("wakeLock" in navigator)) return;

    let isMounted = true;

    const requestWakeLock = async () => {
      try {
        // Battery check: Don't force wake lock if battery is under 20% and discharging
        if ("getBattery" in navigator) {
          const battery: any = await (navigator as any).getBattery();
          if (battery.level < 0.2 && !battery.charging) {
            console.warn("[WakeLock] Battery low (<20%) without charger. Skipping WakeLock.");
            return;
          }
        }

        if (document.visibilityState === "visible" && !wakeLockRef.current) {
          wakeLockRef.current = await (navigator as any).wakeLock.request("screen");
          console.log("[WakeLock] Screen WakeLock acquired.");
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
      } else {
        console.warn("[IntervalLocationTracker] Driver switched away from app or locked screen.");
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      isMounted = false;
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, []);

  // 2. Adaptive GPS Ping Loop
  useEffect(() => {
    if (typeof window === "undefined") return;

    let isDestroyed = false;

    const executePingCycle = async () => {
      if (isDestroyed || isPingingInProgress) return;

      const now = Date.now();
      isPingingInProgress = true;

      try {
        const pos = await captureCurrentPosition({
          timeout: 10000,
          maximumAge: 15000,
          allowSimulationFallback: true,
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

        // Network check: If offline, save directly to Dexie
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          if (employeeId) {
            await offlineDb.locationPings.add({
              employeeId,
              latitude: pos.latitude,
              longitude: pos.longitude,
              accuracy: pos.accuracy,
              speed: pos.speed || undefined,
              timestamp: pos.timestamp,
              synced: false,
            });
            console.log("[IntervalLocationTracker] Offline: Queued ping in Dexie.");
          }
          globalLastPingTime = now;
        } else {
          // Send to Server
          const res = await updateEmployeeLocation(
            pos.latitude,
            pos.longitude,
            pos.accuracy,
            pos.source,
            pos.speed,
            pos.heading,
            pos.timestamp
          );

          if (res?.success) {
            globalLastPingTime = now;
          } else {
            console.warn("[IntervalLocationTracker] Location sync notice:", res?.error);
            // Save to Dexie on server failure as well
            if (employeeId) {
              await offlineDb.locationPings.add({
                employeeId,
                latitude: pos.latitude,
                longitude: pos.longitude,
                accuracy: pos.accuracy,
                speed: pos.speed || undefined,
                timestamp: pos.timestamp,
                synced: false,
              }).catch(() => {});
            }
          }
        }
      } catch (err: any) {
        console.warn("[IntervalLocationTracker] GPS capture notice:", err.message);
      } finally {
        isPingingInProgress = false;
        // Schedule next execution dynamically
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
  }, [movingIntervalMs, idleIntervalMs, employeeId, currentCadence]);

  return null;
}
