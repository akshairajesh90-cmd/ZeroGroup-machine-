/**
 * IronRent Haversine Geofence Engine
 * Geofence center: Pala, Kerala — Lat: 9.7117, Lon: 76.6853
 */

export const GEOFENCE_CENTER = {
    lat: 9.7117,
    lon: 76.6853,
    label: "Pala, Kerala",
};

/** Default operational radius in meters (50 km) */
export const GEOFENCE_RADIUS_METERS = 50_000;

/**
 * Calculates the great‑circle distance between two GPS coordinates
 * using the Haversine formula.
 * @returns distance in metres
 */
export function haversineDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
): number {
    const R = 6_371_000; // Earth radius in metres
    const toRad = (v: number) => (v * Math.PI) / 180;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Returns true when the given coordinate lies within the operational
 * geofence radius from the Pala centre point.
 */
export function isWithinGeofence(
    lat: number,
    lon: number,
    radiusMeters = GEOFENCE_RADIUS_METERS
): boolean {
    return (
        haversineDistance(GEOFENCE_CENTER.lat, GEOFENCE_CENTER.lon, lat, lon) <=
        radiusMeters
    );
}

export interface GeofenceResult {
    distanceMeters: number;
    isInside: boolean;
    center: typeof GEOFENCE_CENTER;
    radiusMeters: number;
}

/**
 * Full evaluation result including computed distance.
 */
export function evaluateGeofence(
    lat: number,
    lon: number,
    radiusMeters = GEOFENCE_RADIUS_METERS
): GeofenceResult {
    const distanceMeters = haversineDistance(
        GEOFENCE_CENTER.lat,
        GEOFENCE_CENTER.lon,
        lat,
        lon
    );
    return {
        distanceMeters,
        isInside: distanceMeters <= radiusMeters,
        center: GEOFENCE_CENTER,
        radiusMeters,
    };
}
