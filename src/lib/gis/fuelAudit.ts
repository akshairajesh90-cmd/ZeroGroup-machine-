/**
 * Fuel & Haulage Distance Audit Engine (Central Kerala Rural GIS)
 * Compares billed/logged trip fuel against terrain-adjusted road distance.
 * Rule 7: Never accuses field crew; flags items for human review only.
 * Rule 8: Short, simple, operational language.
 */

import { calculateHaversineMeters } from "./dualPointRouter";
import { getYardCoordinatesSync } from "./yardCoordinates";

export interface TripDistanceAuditResult {
  oneWayAirKm: number;
  oneWayRoadKm: number;
  roundTripRoadKm: number;
  expectedLiters: number;
  efficiencyKmPerL: number;
  terrainFactor: number;
  variancePercent?: number;
  isFlaggedForReview: boolean;
  reviewReason?: string;
}

export interface FuelAuditOptions {
  depotLat?: number;
  depotLng?: number;
  terrainFactor?: number;      // Default 1.35 (winding high-range rubber estate roads)
  averageKmPerLiter?: number;  // Default 4.0 km/L for heavy flatbed / carrier truck
  tolerancePercent?: number;   // Default 35% before human review flag
}

/**
 * Calculates terrain-calibrated trip distance and expected fuel consumption from Pala depot.
 */
export function auditTripFuelAndDistance(
  siteLat: number,
  siteLng: number,
  loggedLiters?: number | null,
  options: FuelAuditOptions = {}
): TripDistanceAuditResult {
  const defaultYard = getYardCoordinatesSync();
  const depotLat = options.depotLat ?? defaultYard.latitude;
  const depotLng = options.depotLng ?? defaultYard.longitude;
  const terrainFactor = options.terrainFactor ?? 1.35;
  const efficiencyKmPerL = options.averageKmPerLiter ?? 4.0;
  const tolerancePercent = options.tolerancePercent ?? 35;

  const straightLineMeters = calculateHaversineMeters(depotLat, depotLng, siteLat, siteLng);
  const oneWayAirKm = Math.round((straightLineMeters / 1000) * 10) / 10;
  const oneWayRoadKm = Math.round(oneWayAirKm * terrainFactor * 10) / 10;
  const roundTripRoadKm = Math.round(oneWayRoadKm * 2 * 10) / 10;

  // Expected fuel in liters for two-way round trip
  const expectedLiters = Math.round((roundTripRoadKm / efficiencyKmPerL) * 10) / 10;

  let isFlaggedForReview = false;
  let variancePercent: number | undefined;
  let reviewReason: string | undefined;

  if (loggedLiters != null && loggedLiters > 0) {
    const delta = loggedLiters - expectedLiters;
    variancePercent = Math.round((delta / expectedLiters) * 100);

    if (variancePercent > tolerancePercent) {
      isFlaggedForReview = true;
      reviewReason = `Logged ${loggedLiters}L exceeds estimated ${expectedLiters}L (+${variancePercent}%) for ~${roundTripRoadKm}km round-trip. Check for steep hill climbs, idling, or heavy traffic.`;
    }
  }

  return {
    oneWayAirKm,
    oneWayRoadKm,
    roundTripRoadKm,
    expectedLiters,
    efficiencyKmPerL,
    terrainFactor,
    variancePercent,
    isFlaggedForReview,
    reviewReason,
  };
}
