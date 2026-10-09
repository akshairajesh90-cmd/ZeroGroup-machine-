"use client";

import { useEffect, useRef } from "react";
import { registerPlugin } from "@capacitor/core";
import { offlineDb } from "@/lib/offlineDb";
import { BackgroundGeolocationPlugin } from "@capacitor-community/background-geolocation";

const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>("BackgroundGeolocation");

export function useBackgroundLocation(employeeId?: string, dispatchId?: string) {
  const isTracking = useRef(false);
  const watcherId = useRef<string | null>(null);

  useEffect(() => {
    if (!employeeId || typeof window === "undefined") return;

    const startTracking = async () => {
      try {
        if (isTracking.current) return;
        
        // Ensure plugin is available (this will fail gracefully in pure web without capacitor)
        if (!BackgroundGeolocation) {
            console.warn("BackgroundGeolocation plugin not available. True background tracking disabled.");
            return;
        }

        isTracking.current = true;
        
        watcherId.current = await BackgroundGeolocation.addWatcher(
          {
            backgroundMessage: "Cancel to prevent location tracking.",
            backgroundTitle: "IronRent Tracking Active",
            requestPermissions: true,
            stale: false,
            distanceFilter: 50 // Update every 50 meters
          },
          async (location: any, error: any) => {
            if (error) {
              if (error.code === "NOT_AUTHORIZED") {
                if (window.confirm("This app needs your location for dispatch tracking. Open Settings?")) {
                  BackgroundGeolocation.openSettings();
                }
              }
              return console.error("Background geolocation error:", error);
            }
            
            if (location) {
               // Write immediately to Dexie. The background sync worker in syncQueue.ts will pick this up
               // and send to the server when online.
               await offlineDb.locationPings.add({
                 employeeId,
                 dispatchId: dispatchId || undefined,
                 latitude: location.latitude,
                 longitude: location.longitude,
                 accuracy: location.accuracy || undefined,
                 altitude: location.altitude || undefined,
                 speed: location.speed || undefined,
                 timestamp: location.time || Date.now(),
                 synced: false
               });
            }
          }
        );
        console.log("Capacitor background location watcher added:", watcherId.current);
      } catch (err) {
        console.warn("Could not start capacitor background tracking", err);
      }
    };

    startTracking();

    return () => {
      if (watcherId.current) {
        BackgroundGeolocation.removeWatcher({ id: watcherId.current });
        watcherId.current = null;
        isTracking.current = false;
        console.log("Capacitor background location watcher removed.");
      }
    };
  }, [employeeId, dispatchId]);
}
