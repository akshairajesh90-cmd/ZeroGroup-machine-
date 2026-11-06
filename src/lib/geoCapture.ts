// ZERO GROUP — Robust Universal Geolocation Capture Engine
// Handles high-accuracy GPS with automatic low-accuracy network fallback,
// permission detection, client-side sliding-window median jitter filter,
// velocity sanity check, and graceful development simulation.

export interface GeoLocationResult {
  latitude: number;
  longitude: number;
  accuracy: number;
  source: "GPS_HIGH" | "NETWORK_LOW" | "CACHED" | "SIMULATED";
  timestamp: number;
  speed?: number | null; // in km/h
  heading?: number | null; // in degrees 0-360
  filtered?: boolean;
  filterReason?: string;
}

export interface GeoCaptureOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
  allowSimulationFallback?: boolean;
  fallbackLatitude?: number;
  fallbackLongitude?: number;
  applyJitterFilter?: boolean;
}

export interface GpsFilterReading {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
  speed?: number | null;
  heading?: number | null;
}

export interface GpsFilterResult {
  accepted: boolean;
  latitude: number;
  longitude: number;
  accuracy: number;
  reason?: "ACCURACY_EXCEEDED" | "VELOCITY_EXCEEDED" | "DEGRADED_OVERRIDE" | "ACCEPTED";
  rawSpeedKmH?: number | null;
}

/**
 * Calculates great-circle distance between two points in meters using Haversine formula
 */
export function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Radius of Earth in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Client-Side Sliding-Window Median Filter with Velocity Guard and Degradation Override
 */
export class SlidingWindowGpsFilter {
  private window: GpsFilterReading[] = [];
  private windowSize: number;
  private maxVelocityKmH: number;
  private accuracyThresholdM: number;
  private degradationTimeoutMs: number;
  private degradationStartTime: number | null = null;
  private lastAccepted: GpsFilterReading | null = null;

  constructor(options?: {
    windowSize?: number;
    maxVelocityKmH?: number;
    accuracyThresholdM?: number;
    degradationTimeoutMs?: number;
  }) {
    this.windowSize = options?.windowSize || 5;
    this.maxVelocityKmH = options?.maxVelocityKmH || 120;
    this.accuracyThresholdM = options?.accuracyThresholdM || 50;
    this.degradationTimeoutMs = options?.degradationTimeoutMs || 30000; // 30s
  }

  public filter(raw: GpsFilterReading): GpsFilterResult {
    const now = raw.timestamp || Date.now();

    // 1. Accuracy Check & Canopy / Quarry Degradation Override
    let isDegradedOverride = false;
    if (raw.accuracy > this.accuracyThresholdM) {
      if (this.degradationStartTime === null) {
        this.degradationStartTime = now;
      }
      const degradationDuration = now - this.degradationStartTime;
      if (degradationDuration <= this.degradationTimeoutMs) {
        return {
          accepted: false,
          latitude: raw.latitude,
          longitude: raw.longitude,
          accuracy: raw.accuracy,
          reason: "ACCURACY_EXCEEDED",
        };
      }
      // Over 30 seconds of persistent degraded signal (canopy / quarry)
      isDegradedOverride = true;
    } else {
      this.degradationStartTime = null;
    }

    // 2. Velocity Jump Check (Reject multipath reflection glitches > 120 km/h)
    if (this.lastAccepted) {
      const dtSec = (now - this.lastAccepted.timestamp) / 1000;
      if (dtSec > 0.5 && dtSec < 180) {
        const dist = calculateDistanceMeters(
          this.lastAccepted.latitude,
          this.lastAccepted.longitude,
          raw.latitude,
          raw.longitude
        );
        const speedKmH = (dist / dtSec) * 3.6;
        if (speedKmH > this.maxVelocityKmH) {
          return {
            accepted: false,
            latitude: raw.latitude,
            longitude: raw.longitude,
            accuracy: raw.accuracy,
            reason: "VELOCITY_EXCEEDED",
            rawSpeedKmH: speedKmH,
          };
        }
      }
    }

    // 3. Sliding-window Median Filter
    this.window.push(raw);
    if (this.window.length > this.windowSize) {
      this.window.shift();
    }

    let finalLat = raw.latitude;
    let finalLng = raw.longitude;

    if (this.window.length >= 3) {
      const sortedLats = [...this.window.map((p) => p.latitude)].sort((a, b) => a - b);
      const sortedLngs = [...this.window.map((p) => p.longitude)].sort((a, b) => a - b);
      const mid = Math.floor(sortedLats.length / 2);
      finalLat = sortedLats[mid];
      finalLng = sortedLngs[mid];
    }

    const acceptedReading: GpsFilterReading = {
      ...raw,
      latitude: finalLat,
      longitude: finalLng,
    };
    this.lastAccepted = acceptedReading;

    return {
      accepted: true,
      latitude: finalLat,
      longitude: finalLng,
      accuracy: raw.accuracy,
      reason: isDegradedOverride ? "DEGRADED_OVERRIDE" : "ACCEPTED",
    };
  }

  public getLastAccepted(): GpsFilterReading | null {
    return this.lastAccepted;
  }

  public reset() {
    this.window = [];
    this.degradationStartTime = null;
    this.lastAccepted = null;
  }
}

// Global default singleton filter for app-wide continuity
export const defaultGpsFilter = new SlidingWindowGpsFilter();

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
 * Captures current position with automatic high → low accuracy fallback,
 * optional sliding-window filter, and graceful simulated fallback.
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
    applyJitterFilter = false,
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

    const rawSpeed = pos.coords.speed;
    const speedKmH =
      rawSpeed !== null && rawSpeed !== undefined && !isNaN(rawSpeed) && rawSpeed >= 0
        ? Math.round(rawSpeed * 3.6 * 10) / 10
        : null;
    const rawHeading = pos.coords.heading;
    const headingDeg =
      rawHeading !== null && rawHeading !== undefined && !isNaN(rawHeading) && rawHeading >= 0
        ? Math.round(rawHeading)
        : null;

    const rawResult: GeoLocationResult = {
      latitude: pos.coords.latitude,
      longitude: pos.coords.longitude,
      accuracy: Math.round(pos.coords.accuracy || 10),
      source: "GPS_HIGH",
      timestamp: pos.timestamp || Date.now(),
      speed: speedKmH,
      heading: headingDeg,
    };

    if (applyJitterFilter) {
      const filtered = defaultGpsFilter.filter({
        latitude: rawResult.latitude,
        longitude: rawResult.longitude,
        accuracy: rawResult.accuracy,
        timestamp: rawResult.timestamp,
        speed: rawResult.speed,
        heading: rawResult.heading,
      });

      if (!filtered.accepted) {
        return {
          ...rawResult,
          filtered: true,
          filterReason: filtered.reason,
        };
      }

      return {
        ...rawResult,
        latitude: filtered.latitude,
        longitude: filtered.longitude,
        filtered: false,
        filterReason: filtered.reason,
      };
    }

    return rawResult;
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
