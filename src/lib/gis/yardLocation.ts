/**
 * Zero Group ERP — Centralized Yard Location Provider (Phase 1 Single Source of Truth)
 * 
 * Guarantees that the central depot location is strictly resolved from SystemSettings,
 * falling back to canonical Pala central depot coordinates (lat: 9.7118, lon: 76.6853).
 * No other file in the repository should hardcode raw depot coordinate literals.
 */

import { prisma } from "@/lib/prisma";
import {
  PALA_DEPOT_LATITUDE,
  PALA_DEPOT_LONGITUDE,
  getYardCoordinatesSync,
} from "./yardCoordinates";

export { PALA_DEPOT_LATITUDE, PALA_DEPOT_LONGITUDE, getYardCoordinatesSync };

export interface YardLocation {
  latitude: number;
  longitude: number;
  source: "DATABASE" | "DEFAULT_PALA_DEPOT";
}

/**
 * Asynchronously retrieves the yard coordinates from the database SystemSettings,
 * falling back to the canonical Pala Depot if unset or unavailable.
 */
export async function getYardLocation(): Promise<YardLocation> {
  try {
    const settings = await prisma.systemSettings.findFirst({
      select: { storeLatitude: true, storeLongitude: true },
    });

    if (settings?.storeLatitude != null && settings?.storeLongitude != null) {
      const lat = Number(settings.storeLatitude);
      const lng = Number(settings.storeLongitude);
      if (!isNaN(lat) && !isNaN(lng) && lat !== 0 && lng !== 0) {
        return {
          latitude: lat,
          longitude: lng,
          source: "DATABASE",
        };
      }
    }
  } catch (err) {
    console.warn("[YardLocation] Failed to read from SystemSettings, using default Pala depot:", err);
  }

  return {
    latitude: PALA_DEPOT_LATITUDE,
    longitude: PALA_DEPOT_LONGITUDE,
    source: "DEFAULT_PALA_DEPOT",
  };
}


