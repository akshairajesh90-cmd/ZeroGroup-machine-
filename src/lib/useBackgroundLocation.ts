import { useEffect } from 'react';
import { registerPlugin } from '@capacitor/core';
const BackgroundGeolocation = registerPlugin<any>('BackgroundGeolocation');
import { offlineDb } from './offlineDb';

export function useBackgroundLocation(employeeId: string, dispatchId?: string, isEnabled: boolean = true) {
  useEffect(() => {
    if (!isEnabled || !employeeId) {
        return;
    }

    let watcherId: string | null = null;

    const setupBackgroundLocation = async () => {
      try {
        watcherId = await BackgroundGeolocation.addWatcher(
          {
            backgroundMessage: "Tracking active site route.",
            backgroundTitle: "IronRent Route Tracking",
            requestPermissions: true,
            stale: false,
            distanceFilter: 50, // update every 50 meters
          },
          async function (location: any, error: any) {
            if (error) {
              if (error.code === "NOT_AUTHORIZED") {
                 console.warn("Background location not authorized by user");
              }
              return console.error(error);
            }

            if(location) {
               console.log("Got location", location);
               
               // Save to local offline queue
               await offlineDb.locationPings.add({
                 employeeId,
                 dispatchId,
                 latitude: location.latitude,
                 longitude: location.longitude,
                 accuracy: location.accuracy,
                 altitude: location.altitude,
                 speed: location.speed,
                 timestamp: location.time || Date.now(),
                 synced: false
               });

               // Optional: we can also add a fetchWithOfflineQueue call here to POST it immediately to our API,
               // but a background worker syncing the locationPings table periodically might be more robust 
               // for pure background operation.
            }
          }
        );
        console.log("Background location watcher added with ID", watcherId);
      } catch (e) {
        console.error("Failed to setup background location", e);
      }
    };

    setupBackgroundLocation();

    return () => {
      if (watcherId) {
        BackgroundGeolocation.removeWatcher({ id: watcherId });
      }
    };
  }, [employeeId, dispatchId, isEnabled]);
}
