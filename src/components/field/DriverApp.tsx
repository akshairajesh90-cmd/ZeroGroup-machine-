"use client";

import React, { useEffect, useState } from "react";
import { registerPlugin } from "@capacitor/core";
import { BackgroundGeolocationPlugin } from "@capacitor-community/background-geolocation";
import { pingLocation } from "@/actions/telemetry";

const BackgroundGeolocation = registerPlugin<BackgroundGeolocationPlugin>(
  "BackgroundGeolocation"
);

interface DriverAppProps {
  activeDispatchId: string;
}

export default function DriverApp({ activeDispatchId }: DriverAppProps) {
  const [status, setStatus] = useState("Waiting for GPS...");

  useEffect(() => {
    let watcherId: string | undefined;

    const startTracking = async () => {
      try {
        watcherId = await BackgroundGeolocation.addWatcher(
          {
            backgroundMessage: "Cancel to prevent battery drain.",
            backgroundTitle: "Tracking Delivery Route.",
            requestPermissions: true,
            stale: false,
            distanceFilter: 50,
          },
          async (location, error) => {
            if (error) {
              if (error.code === "NOT_AUTHORIZED") {
                setStatus("GPS Permission Denied");
              }
              return;
            }

            if (location) {
              setStatus(`Lat: ${location.latitude.toFixed(4)}, Lng: ${location.longitude.toFixed(4)}`);
              try {
                const res = await pingLocation(activeDispatchId, location.latitude, location.longitude);
                if (res.success) {
                  console.log("Pinged server successfully", res.pingId);
                }
              } catch (e) {
                console.error("Failed to ping location", e);
              }
            }
          }
        );
      } catch (e) {
        setStatus("GPS Tracking Failed");
        console.error(e);
      }
    };

    if (activeDispatchId) {
      startTracking();
    }

    return () => {
      if (watcherId) {
        BackgroundGeolocation.removeWatcher({ id: watcherId });
      }
    };
  }, [activeDispatchId]);

  return (
    <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
      <h2 className="font-semibold text-lg">Active Telemetry</h2>
      <p className="text-sm text-gray-500 mt-2 font-mono bg-slate-50 p-2 rounded">
        {status}
      </p>
    </div>
  );
}
