export interface Coordinates {
  lat: number;
  lng: number;
}

/**
 * Calculates haversine distance between two points in meters.
 */
export function calculateHaversineDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const toRad = (value: number) => (value * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const phi1 = toRad(lat1);
  const phi2 = toRad(lat2);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(phi1) * Math.cos(phi2) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c; // Distance in meters
}

export function isValidCoordinate(lat: unknown, lng: unknown): boolean {
  if (typeof lat !== "number" || typeof lng !== "number") return false;
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
  if (Number.isNaN(lat) || Number.isNaN(lng)) return false;
  return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

/**
 * Maximum acceptable horizontal GPS accuracy in meters.
 * Readings with accuracy > 100m are rejected to eliminate coarse cell-tower triangulation errors.
 */
export const MAX_GPS_HORIZONTAL_ACCURACY_METERS = 100;

/**
 * Maximum acceptable velocity in km/h for heavy machinery and logistics fleet.
 * Pings indicating velocity > 130 km/h are rejected as satellite multipath bounce.
 */
export const MAX_GPS_VELOCITY_KMH = 130;

export interface GpsTelemetryPoint {
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  speed?: number | null; // in km/h
  timestamp?: number | Date | string;
}

export interface TelemetrySanitizationResult {
  valid: boolean;
  reason?: "INVALID_COORDINATES" | "ACCURACY_EXCEEDED" | "VELOCITY_EXCEEDED" | "ACCEPTED";
  speedKmH?: number;
  reading: GpsTelemetryPoint;
}

/**
 * Validates horizontal GPS accuracy: rejects accuracy > 100 meters.
 */
export function isGpsAccuracyAcceptable(accuracy?: number | null): boolean {
  if (accuracy === undefined || accuracy === null) return true;
  if (typeof accuracy !== "number" || Number.isNaN(accuracy) || !Number.isFinite(accuracy)) return false;
  return accuracy <= MAX_GPS_HORIZONTAL_ACCURACY_METERS;
}

/**
 * Validates velocity sanity: rejects speed > 130 km/h.
 */
export function isGpsVelocityAcceptable(speedKmH?: number | null): boolean {
  if (speedKmH === undefined || speedKmH === null) return true;
  if (typeof speedKmH !== "number" || Number.isNaN(speedKmH) || !Number.isFinite(speedKmH)) return false;
  return speedKmH <= MAX_GPS_VELOCITY_KMH;
}

/**
 * Sanitizes and verifies a GPS telemetry reading against coordinates sanity,
 * horizontal accuracy filter (<= 100m), and velocity sanity filter (<= 130 km/h).
 */
export function sanitizeGpsReading(
  current: GpsTelemetryPoint,
  previous?: GpsTelemetryPoint | null
): TelemetrySanitizationResult {
  if (!isValidCoordinate(current.latitude, current.longitude)) {
    return { valid: false, reason: "INVALID_COORDINATES", reading: current };
  }

  // 1. Horizontal Accuracy Guard (> 100m reject)
  if (!isGpsAccuracyAcceptable(current.accuracy)) {
    return { valid: false, reason: "ACCURACY_EXCEEDED", reading: current };
  }

  // 2. Direct Reported Velocity Guard (> 130 km/h reject)
  if (current.speed != null && !isGpsVelocityAcceptable(current.speed)) {
    return { valid: false, reason: "VELOCITY_EXCEEDED", speedKmH: current.speed, reading: current };
  }

  // 3. Computed Velocity between consecutive pings (> 130 km/h reject)
  if (previous && isValidCoordinate(previous.latitude, previous.longitude)) {
    const tCurrent = current.timestamp ? new Date(current.timestamp).getTime() : Date.now();
    const tPrev = previous.timestamp ? new Date(previous.timestamp).getTime() : 0;
    const dtSec = (tCurrent - tPrev) / 1000;

    if (dtSec > 0.5 && dtSec < 300) {
      const distMeters = calculateHaversineDistance(
        previous.latitude,
        previous.longitude,
        current.latitude,
        current.longitude
      );
      const computedSpeedKmH = (distMeters / dtSec) * 3.6;
      if (computedSpeedKmH > MAX_GPS_VELOCITY_KMH) {
        return {
          valid: false,
          reason: "VELOCITY_EXCEEDED",
          speedKmH: Math.round(computedSpeedKmH * 10) / 10,
          reading: current,
        };
      }
    }
  }

  return { valid: true, reason: "ACCEPTED", reading: current };
}

/**
 * Extracts coordinates from Google Maps URLs or raw "lat, lng" strings.
 * Priority hierarchy:
 * 1. !3d<lat>!4d<lng> (destination pin marker coordinate - preferred over camera viewport)
 * 2. ?q=<lat>,<lng> or &query= or ll=
 * 3. @<lat>,<lng> (viewport / camera center coordinate)
 * 4. Raw comma-separated "lat, lng"
 */
export function parseGoogleMapsUrl(input: string): Coordinates | null {
  if (!input || typeof input !== "string") return null;

  let trimmed = input.trim();

  // Handle google.com/url?q=... redirect wrapper unnesting
  if (/google\.[a-z.]+\/url\?/i.test(trimmed)) {
    try {
      const qMatch = trimmed.match(/[?&](?:q|url)=([^&]+)/);
      if (qMatch && qMatch[1]) {
        trimmed = decodeURIComponent(qMatch[1]).trim();
      }
    } catch {
      // Fall through to regular regex parsing
    }
  }

  // Priority 1: Modern Google Maps destination pin (!3d<lat>!4d<lng>)
  // Matches !3d9.591600!4d76.522200
  const pinMatch = trimmed.match(/!3d(-?\d+(?:\.\d+)?).*?!4d(-?\d+(?:\.\d+)?)/);
  if (pinMatch) {
    const lat = parseFloat(pinMatch[1]);
    const lng = parseFloat(pinMatch[2]);
    if (isValidCoordinate(lat, lng)) {
      return { lat, lng };
    }
  }

  // Priority 2: Query params ?q=lat,lng or query=lat,lng or ll=lat,lng
  const qMatch = trimmed.match(/[?&](?:q|query|ll)=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (qMatch) {
    const lat = parseFloat(qMatch[1]);
    const lng = parseFloat(qMatch[2]);
    if (isValidCoordinate(lat, lng)) {
      return { lat, lng };
    }
  }

  // Priority 3: Viewport camera fallback @lat,lng
  const atMatch = trimmed.match(/@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  if (atMatch) {
    const lat = parseFloat(atMatch[1]);
    const lng = parseFloat(atMatch[2]);
    if (isValidCoordinate(lat, lng)) {
      return { lat, lng };
    }
  }

  // Priority 4: Plain comma-separated coordinates "9.5916, 76.5222"
  const rawMatch = trimmed.match(/^(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)$/);
  if (rawMatch) {
    const lat = parseFloat(rawMatch[1]);
    const lng = parseFloat(rawMatch[2]);
    if (isValidCoordinate(lat, lng)) {
      return { lat, lng };
    }
  }

  return null;
}
