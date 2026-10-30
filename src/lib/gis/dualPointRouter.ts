/**
 * Dual-Point Off-Road Navigation Engine
 * Handles unmapped private estate lanes, rubber plantation tracks, and quarries
 */

export interface DualPointRouteResult {
  isOffRoad: boolean;
  accessWaypoint: [number, number]; // [lat, lng] on nearest paved highway
  gatePin: [number, number];        // [lat, lng] raw satellite coordinate
  offRoadDistanceM: number;         // Straight-line distance from road to gate in meters
  bearingDeg: number;               // Forward compass azimuth angle (0° to 360°)
  cardinalDirection: string;        // e.g. "NE", "ENE", "SW"
  crawlDurationMins: number;        // Low-gear crawler estimate (8 km/h)
  guidanceText: string;             // Human-readable driver guidance
}

/**
 * Calculates Haversine distance between two coordinates in meters
 */
export function calculateHaversineMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Calculates the forward azimuth / compass bearing in degrees (0° - 360°)
 * from point 1 (Highway Access Point) to point 2 (Estate Gate Pin)
 */
export function calculateCompassBearing(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const y = Math.sin(deltaLambda) * Math.cos(phi2);
  const x =
    Math.cos(phi1) * Math.sin(phi2) -
    Math.sin(phi1) * Math.cos(phi2) * Math.cos(deltaLambda);

  const theta = Math.atan2(y, x);
  const degrees = (theta * 180) / Math.PI;
  return Math.round((degrees + 360) % 360);
}

/**
 * Converts compass degrees to 16-point cardinal compass text
 */
export function degreesToCardinal(degrees: number): string {
  const cardinals = [
    "N", "NNE", "NE", "ENE",
    "E", "ESE", "SE", "SSE",
    "S", "SSW", "SW", "WSW",
    "W", "WNW", "NW", "NNW",
  ];
  const index = Math.round(degrees / 22.5) % 16;
  return cardinals[index];
}

/**
 * Evaluates whether a site is off-road and constructs the dual-point guidance
 * @param accessPoint [lat, lng] snapped point on mapped public road
 * @param rawGatePin [lat, lng] target unmapped gate coordinates
 * @param thresholdMeters Threshold distance in meters beyond which off-road mode triggers (default: 30m)
 */
export function resolveDualPointNavigation(
  accessPoint: [number, number],
  rawGatePin: [number, number],
  thresholdMeters: number = 30
): DualPointRouteResult {
  const distanceM = calculateHaversineMeters(
    accessPoint[0],
    accessPoint[1],
    rawGatePin[0],
    rawGatePin[1]
  );

  const isOffRoad = distanceM > thresholdMeters;
  const bearingDeg = calculateCompassBearing(
    accessPoint[0],
    accessPoint[1],
    rawGatePin[0],
    rawGatePin[1]
  );
  const cardinalDirection = degreesToCardinal(bearingDeg);

  // Heavy truck / tractor crawler speed over unpaved plantation mud tracks ~ 8 km/h (~133 m/min)
  const crawlDurationMins = Math.max(1, Math.ceil(distanceM / 133));

  let guidanceText = "On-road mapped destination.";
  if (isOffRoad) {
    guidanceText = `Turn off public highway at Access Waypoint. Proceed ${distanceM}m off-road on bearing ${bearingDeg}° (${cardinalDirection}) into estate track (~${crawlDurationMins} min low-gear crawl).`;
  }

  return {
    isOffRoad,
    accessWaypoint: accessPoint,
    gatePin: rawGatePin,
    offRoadDistanceM: distanceM,
    bearingDeg,
    cardinalDirection,
    crawlDurationMins,
    guidanceText,
  };
}
