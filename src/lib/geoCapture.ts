// ZERO GROUP — Robust Universal Geolocation Capture Engine
// Handles high-accuracy GPS with automatic low-accuracy network fallback,
// permission detection, and graceful development simulation.

export interface GeoLocationResult {
  latitude: number;
  longitude: number;
  accuracy: number;
  source: "GPS_HIGH" | "NETWORK_LOW" | "CACHED" | "SIMULATED";
  timestamp: number;
}

export interface GeoCaptureOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  allowSimulationFallback?: boolean;
  fallbackLatitude?: number;
  fallbackLongitude?: number;
}

/**
 * Checks if geolocation is supported and running in a secure origin
 */
export function isGeolocationAvailable(): { available: boolean; reason?: string } {
  if (typeof window === "undefined") {
    return { available: false, reason: "Server environment" };
  }
  if (!navigator.geolocation) {
    return { available: false, reason: "Geolocation API not supported by browser" };
  }
  // Modern browsers block Geolocation on non-secure origins (except localhost)
  const isSecure =
    window.location.protocol === "https:" ||
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1";
  if (!isSecure) {
    return {
      available: false,
      reason: "Geolocation requires HTTPS or localhost. Insecure HTTP origin blocked by browser.",
    };
  }
  return { available: true };
}

/**
 * Captures current position with automatic high → low accuracy fallback
 */
export async function captureCurrentPosition(
  options: GeoCaptureOptions = {}
): Promise<GeoLocationResult> {
  const {
    timeout = 10000,
    maximumAge = 30000,
    allowSimulationFallback = true,
    fallbackLatitude,
    fallbackLongitude,
  } = options;

  const check = isGeolocationAvailable();

  // If in insecure origin (e.g. testing http://192.168.1.X:3000 on mobile)
  if (!check.available) {
    console.warn(`[GeoCapture] ${check.reason}`);
    if (allowSimulationFallback) {
      return getSimulatedPosition(fallbackLatitude, fallbackLongitude);
    }
    throw new Error(check.reason || "Geolocation unavailable");
  }

  // Attempt 1: High Accuracy GPS (Satellite fix)
  try {
    const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: Math.min(timeout, 8000), // Max 8s for satellite lock
        maximumAge: maximumAge,
      });
    });

    return {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: Math.round(pos.coords.accuracy || 10),
      source: "GPS_HIGH",
      timestamp: pos.timestamp || Date.now(),
    };
  } catch (err: any) {
    console.warn("[GeoCapture] High accuracy GPS fix failed or timed out:", err.message);

    // If permission was explicitly denied, don't attempt fallback
    if (err.code === 1 /* PERMISSION_DENIED */) {
      if (allowSimulationFallback) {
        console.warn("[GeoCapture] Permission denied. Providing verified waypoint fallback.");
        return getSimulatedPosition(fallbackLatitude, fallbackLongitude);
      }
      throw new Error("Location permission denied. Please enable Location in browser/device settings.");
    }

    // Attempt 2: Standard / Low Accuracy (Wi-Fi / Cell tower triangulation)
    try {
      const lowPos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: false,
          timeout: timeout,
          maximumAge: 120000, // Accept position cached within 2 minutes
        });
      });

      return {
        latitude: lowPos.coords.latitude,
        longitude: lowPos.coords.longitude,
        accuracy: Math.round(lowPos.coords.accuracy || 50),
        source: "NETWORK_LOW",
        timestamp: lowPos.timestamp || Date.now(),
      };
    } catch (fallbackErr: any) {
      console.warn("[GeoCapture] Low accuracy positioning also failed:", fallbackErr.message);

      if (allowSimulationFallback) {
        return getSimulatedPosition(fallbackLatitude, fallbackLongitude);
      }

      throw new Error(`Unable to acquire GPS coordinates: ${fallbackErr.message}`);
    }
  }
}

/**
 * Provides a verified central Kerala waypoint if hardware GPS fails or runs in a simulator/LAN test
 */
function getSimulatedPosition(fallbackLat?: number, fallbackLng?: number): GeoLocationResult {
  const baseLat = fallbackLat || 9.5916; // Kottayam/Pala central depot
  const baseLng = fallbackLng || 76.5222;
  const jitterLat = parseFloat((baseLat + (Math.random() - 0.5) * 0.003).toFixed(6));
  const jitterLng = parseFloat((baseLng + (Math.random() - 0.5) * 0.003).toFixed(6));

  return {
    latitude: jitterLat,
    longitude: jitterLng,
    accuracy: 25,
    source: "SIMULATED",
    timestamp: Date.now(),
  };
}
