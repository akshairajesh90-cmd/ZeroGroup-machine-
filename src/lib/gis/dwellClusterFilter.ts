/**
 * Passive Dwell & Human Driver Behavior Filtering Engine
 * Evaluates incoming telemetry pings against the strict 4-point verification guard
 * and computes the mathematical centroid to lock permanent site coordinates.
 */

import { calculateHaversineMeters } from "./dualPointRouter";

export interface TelemetryPing {
  latitude: number;
  longitude: number;
  speed?: number | null; // in m/s (or null)
  timestamp: Date | string | number;
  accuracy?: number | null;
}

export interface DwellEvaluationOptions {
  maxSpeedThresholdMs?: number;    // Default: 0.5 m/s (~1.8 km/h)
  maxClusterRadiusMeters?: number; // Default: 25 meters
  minDurationMinutes?: number;     // Default: 10 minutes
  isOperationallyActive?: boolean; // Default: true (active dispatch state)
}

export interface DwellVerificationResult {
  isVerified: boolean;
  centroid: [number, number] | null; // [meanLat, meanLng]
  durationMinutes: number;
  clusterRadiusMeters: number;
  pingCount: number;
  confidence: number; // 0.0 to 1.0
  rejectionReason?: string;
  guardChecks: {
    speedConditionMet: boolean;
    spatialVarianceMet: boolean;
    temporalDurationMet: boolean;
    operationalStateMet: boolean;
  };
}

/**
 * Calculates the mathematical centroid of an array of GPS coordinates:
 * mean(latitude) and mean(longitude)
 */
export function calculateMathematicalCentroid(
  pings: Array<{ latitude: number; longitude: number }>
): [number, number] {
  if (pings.length === 0) return [0, 0];
  let sumLat = 0;
  let sumLng = 0;

  for (const p of pings) {
    sumLat += p.latitude;
    sumLng += p.longitude;
  }

  const meanLat = Math.round((sumLat / pings.length) * 10000000) / 10000000;
  const meanLng = Math.round((sumLng / pings.length) * 10000000) / 10000000;

  return [meanLat, meanLng];
}

/**
 * Evaluates a sequence of chronological telemetry pings against the strict 4-point guard.
 */
export function evaluateSiteDwellCluster(
  pings: TelemetryPing[],
  options: DwellEvaluationOptions = {}
): DwellVerificationResult {
  const maxSpeed = options.maxSpeedThresholdMs ?? 0.5; // < 0.5 m/s
  const maxRadius = options.maxClusterRadiusMeters ?? 25; // < 25m radius
  const minDurationMins = options.minDurationMinutes ?? 10; // >= 10 minutes
  const operationalState = options.isOperationallyActive ?? true;

  if (!pings || pings.length < 2) {
    return {
      isVerified: false,
      centroid: null,
      durationMinutes: 0,
      clusterRadiusMeters: 0,
      pingCount: pings ? pings.length : 0,
      confidence: 0,
      rejectionReason: "Insufficient telemetry pings (at least 2 pings required).",
      guardChecks: {
        speedConditionMet: false,
        spatialVarianceMet: false,
        temporalDurationMet: false,
        operationalStateMet: operationalState,
      },
    };
  }

  // Parse timestamps and sort chronologically
  const normalizedPings = pings
    .map((p) => ({
      latitude: Number(p.latitude),
      longitude: Number(p.longitude),
      speed: p.speed != null ? Number(p.speed) : 0,
      timeMs: new Date(p.timestamp).getTime(),
    }))
    .sort((a, b) => a.timeMs - b.timeMs);

  const startTimeMs = normalizedPings[0].timeMs;
  const endTimeMs = normalizedPings[normalizedPings.length - 1].timeMs;
  const durationMs = Math.max(0, endTimeMs - startTimeMs);
  const durationMinutes = Math.round((durationMs / 60000) * 10) / 10;

  // 1. Guard 1: Temporal Duration (>= 10 minutes)
  const temporalDurationMet = durationMinutes >= minDurationMins;

  // 2. Guard 2: Speed Condition (Vehicle speed near zero < 0.5 m/s)
  // Check both reported telemetry speed and physical delta-distance speed between consecutive pings
  let speedViolations = 0;
  for (let i = 0; i < normalizedPings.length; i++) {
    const current = normalizedPings[i];
    if (current.speed > maxSpeed) {
      speedViolations++;
    }
    if (i > 0) {
      const prev = normalizedPings[i - 1];
      const deltaSec = Math.max(1, (current.timeMs - prev.timeMs) / 1000);
      const deltaMeters = calculateHaversineMeters(
        prev.latitude,
        prev.longitude,
        current.latitude,
        current.longitude
      );
      const computedSpeedMs = deltaMeters / deltaSec;
      if (computedSpeedMs > maxSpeed * 2) {
        speedViolations++;
      }
    }
  }
  const speedConditionMet = speedViolations <= Math.floor(normalizedPings.length * 0.1); // Allow <= 10% transient GPS noise

  // 3. Guard 3: Spatial Variance (Cluster radius < 25m from mathematical centroid)
  const [cLat, cLng] = calculateMathematicalCentroid(normalizedPings);
  let maxDistanceToCentroid = 0;
  for (const p of normalizedPings) {
    const distM = calculateHaversineMeters(cLat, cLng, p.latitude, p.longitude);
    if (distM > maxDistanceToCentroid) {
      maxDistanceToCentroid = distM;
    }
  }
  const spatialVarianceMet = maxDistanceToCentroid <= maxRadius;

  // 4. Guard 4: Operational State Confirmation
  const operationalStateMet = operationalState === true;

  const isVerified =
    temporalDurationMet &&
    speedConditionMet &&
    spatialVarianceMet &&
    operationalStateMet;

  let rejectionReason: string | undefined;
  if (!isVerified) {
    const reasons: string[] = [];
    if (!speedConditionMet) reasons.push(`Speed exceeded threshold (${maxSpeed} m/s)`);
    if (!spatialVarianceMet) reasons.push(`Spatial cluster radius ${maxDistanceToCentroid}m exceeded ${maxRadius}m`);
    if (!temporalDurationMet) reasons.push(`Duration ${durationMinutes}m is less than required ${minDurationMins}m`);
    if (!operationalStateMet) reasons.push("Vehicle is not in an active dispatch state");
    rejectionReason = reasons.join("; ");
  }

  // Calculate confidence score (0.0 to 1.0)
  let confidence = 0;
  if (isVerified) {
    // Tighter clusters and longer verified durations increase confidence towards 1.0
    const varianceFactor = Math.max(0, 1 - maxDistanceToCentroid / maxRadius);
    const timeFactor = Math.min(1, durationMinutes / 20);
    confidence = Math.round((0.7 + varianceFactor * 0.2 + timeFactor * 0.1) * 100) / 100;
  }

  return {
    isVerified,
    centroid: isVerified ? [cLat, cLng] : null,
    durationMinutes,
    clusterRadiusMeters: maxDistanceToCentroid,
    pingCount: normalizedPings.length,
    confidence,
    rejectionReason,
    guardChecks: {
      speedConditionMet,
      spatialVarianceMet,
      temporalDurationMet,
      operationalStateMet,
    },
  };
}
