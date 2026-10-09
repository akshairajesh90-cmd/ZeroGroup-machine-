"use client";

import { useEffect, useRef } from "react";
import { updateEmployeeLocation } from "@/actions/location";

export default function LiveLocationTracker() {
  const watchIdRef = useRef<number | null>(null);

  useEffect(() => {
    if (!navigator.geolocation) {
      console.warn("Geolocation not supported by this browser.");
      return;
    }

    // Use watchPosition to continuously get location updates
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        updateEmployeeLocation(position.coords.latitude, position.coords.longitude)
          .catch((err) => console.error("Location sync failed:", err));
      },
      (error) => {
        console.warn("Continuous GPS capture failed:", error.message);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 5000, // Update max every 5s if cached, but effectively streams changes
      }
    );

    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return null; // Silent component
}
