import { auditTripFuelAndDistance } from "../fuelAudit";

describe("Fuel & Haulage Audit Engine (Central Kerala Rural GIS)", () => {
  // Pala Depot coordinates: 9.7118, 76.6853
  // Test site: Erattupetta (approx 12 km straight line east) ~ 9.695, 76.785
  const siteLat = 9.695;
  const siteLng = 76.785;

  it("calculates round-trip road distance with 1.35x Kerala terrain factor", () => {
    const res = auditTripFuelAndDistance(siteLat, siteLng);

    expect(res.oneWayAirKm).toBeGreaterThan(10);
    expect(res.oneWayAirKm).toBeLessThan(15);
    // Road distance should be 1.35x air distance
    expect(res.oneWayRoadKm).toBeCloseTo(res.oneWayAirKm * 1.35, 1);
    // Round trip road km should be double the one-way road km
    expect(res.roundTripRoadKm).toBeCloseTo(res.oneWayRoadKm * 2, 1);
    // Expected liters = roundTripRoadKm / 4.0 km/L
    expect(res.expectedLiters).toBeCloseTo(res.roundTripRoadKm / 4.0, 1);
    expect(res.isFlaggedForReview).toBe(false);
  });

  it("does not flag fuel within normal 35% variance band", () => {
    const baseline = auditTripFuelAndDistance(siteLat, siteLng);
    const normalLoggedLiters = baseline.expectedLiters * 1.15; // +15%

    const res = auditTripFuelAndDistance(siteLat, siteLng, normalLoggedLiters);
    expect(res.isFlaggedForReview).toBe(false);
    expect(res.variancePercent).toBe(15);
    expect(res.reviewReason).toBeUndefined();
  });

  it("flags excessive consumption for human review with non-accusatory reason (Rule 7)", () => {
    const baseline = auditTripFuelAndDistance(siteLat, siteLng);
    const highLoggedLiters = baseline.expectedLiters * 1.5; // +50% (exceeds 35% tolerance)

    const res = auditTripFuelAndDistance(siteLat, siteLng, highLoggedLiters);
    expect(res.isFlaggedForReview).toBe(true);
    expect(res.variancePercent).toBe(50);
    expect(res.reviewReason).toBeDefined();
    // Non-accusatory verification check
    expect(res.reviewReason).toContain("Check for steep hill climbs, idling, or heavy traffic");
    expect(res.reviewReason).not.toMatch(/theft|stealing|fraud|guilty|penalty/i);
  });

  it("supports custom depot and terrain factors", () => {
    // Custom flat terrain factor 1.15 and 5.0 km/L efficiency
    const res = auditTripFuelAndDistance(siteLat, siteLng, null, {
      depotLat: 9.7118,
      depotLng: 76.6853,
      terrainFactor: 1.15,
      averageKmPerLiter: 5.0,
      tolerancePercent: 20,
    });

    expect(res.terrainFactor).toBe(1.15);
    expect(res.efficiencyKmPerL).toBe(5.0);
    expect(res.expectedLiters).toBeCloseTo(res.roundTripRoadKm / 5.0, 1);
  });
});
