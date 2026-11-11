import {
  GEOFENCE_CENTER,
  GEOFENCE_RADIUS_METERS,
  haversineDistance,
  isWithinGeofence,
  evaluateGeofence,
} from "../geofence";

describe("Geofence Engine (Haversine)", () => {
  it("calculates zero distance for exact center point", () => {
    const dist = haversineDistance(
      GEOFENCE_CENTER.lat,
      GEOFENCE_CENTER.lon,
      GEOFENCE_CENTER.lat,
      GEOFENCE_CENTER.lon
    );
    expect(dist).toBe(0);
  });

  it("calculates realistic distance between Pala and Kottayam (~25-30 km)", () => {
    // Kottayam town coordinates: ~9.5916, 76.5222
    const distMeters = haversineDistance(
      GEOFENCE_CENTER.lat,
      GEOFENCE_CENTER.lon,
      9.5916,
      76.5222
    );
    const distKm = distMeters / 1000;
    expect(distKm).toBeGreaterThan(20);
    expect(distKm).toBeLessThan(35);
  });

  it("confirms Kottayam site is within 50km geofence radius", () => {
    const isInside = isWithinGeofence(9.5916, 76.5222);
    expect(isInside).toBe(true);
  });

  it("rejects coordinates outside 50km geofence (e.g. Kasaragod)", () => {
    // Kasaragod: ~12.5102, 74.9852
    const isInside = isWithinGeofence(12.5102, 74.9852);
    expect(isInside).toBe(false);
  });

  it("evaluateGeofence returns detailed report with center metadata", () => {
    const report = evaluateGeofence(9.5916, 76.5222);
    expect(report.isInside).toBe(true);
    expect(report.distanceMeters).toBeGreaterThan(0);
    expect(report.center.label).toBe("Pala, Kerala");
    expect(report.radiusMeters).toBe(GEOFENCE_RADIUS_METERS);
  });
});
