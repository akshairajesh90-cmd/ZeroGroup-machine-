import {
  calculateDistanceMeters,
  SlidingWindowGpsFilter,
  GpsFilterReading,
} from "../geoCapture";

describe("SlidingWindowGpsFilter & Kerala Multipath Glitch Rejection", () => {
  let filter: SlidingWindowGpsFilter;

  beforeEach(() => {
    filter = new SlidingWindowGpsFilter({
      windowSize: 5,
      maxVelocityKmH: 120,
      accuracyThresholdM: 50,
      degradationTimeoutMs: 30000,
    });
  });

  test("calculateDistanceMeters calculates accurate distance between Kerala coordinates", () => {
    // Erattupetta (9.6914, 76.7828) to Pala (9.7074, 76.6836) ~ 10.9 km
    const dist = calculateDistanceMeters(9.6914, 76.7828, 9.7074, 76.6836);
    expect(dist).toBeGreaterThan(10000);
    expect(dist).toBeLessThan(12000);
  });

  test("High accuracy GPS readings (<= 50m) are accepted directly", () => {
    const reading: GpsFilterReading = {
      latitude: 9.6914,
      longitude: 76.7828,
      accuracy: 12,
      timestamp: 1000000,
    };
    const res = filter.filter(reading);
    expect(res.accepted).toBe(true);
    expect(res.reason).toBe("ACCEPTED");
    expect(res.latitude).toBeCloseTo(9.6914, 4);
    expect(res.longitude).toBeCloseTo(76.7828, 4);
  });

  test("Sliding window median filter smooths jitter over 3 readings", () => {
    // 3 readings with small GPS bounce (~5-8m jitter, 5s intervals)
    filter.filter({ latitude: 9.69140, longitude: 76.78280, accuracy: 10, timestamp: 5000 });
    filter.filter({ latitude: 9.69148, longitude: 76.78286, accuracy: 10, timestamp: 10000 });
    const res3 = filter.filter({ latitude: 9.69144, longitude: 76.78283, accuracy: 10, timestamp: 15000 });

    expect(res3.accepted).toBe(true);
    // Median of [9.69140, 9.69144, 9.69148] is 9.69144
    expect(res3.latitude).toBeCloseTo(9.69144, 5);
    expect(res3.longitude).toBeCloseTo(76.78283, 5);
  });

  test("Velocity guard rejects sudden GPS multipath teleportation (> 120 km/h)", () => {
    // Base point at timestamp 10000
    filter.filter({ latitude: 9.6914, longitude: 76.7828, accuracy: 15, timestamp: 10000 });

    // Glitch jump: 2 km displacement in 5 seconds = 1440 km/h!
    const glitchReading: GpsFilterReading = {
      latitude: 9.7100, // ~2.1 km away
      longitude: 76.7828,
      accuracy: 20,
      timestamp: 15000, // 5 seconds later
    };

    const glitchResult = filter.filter(glitchReading);
    expect(glitchResult.accepted).toBe(false);
    expect(glitchResult.reason).toBe("VELOCITY_EXCEEDED");
    expect(glitchResult.rawSpeedKmH).toBeGreaterThan(120);
  });

  test("Degraded accuracy (> 50m) is rejected initially", () => {
    const degradedReading: GpsFilterReading = {
      latitude: 9.6914,
      longitude: 76.7828,
      accuracy: 75, // > 50m
      timestamp: 10000,
    };
    const res = filter.filter(degradedReading);
    expect(res.accepted).toBe(false);
    expect(res.reason).toBe("ACCURACY_EXCEEDED");
  });

  test("Canopy & quarry override: degraded accuracy (> 50m) is accepted after persisting > 30 seconds", () => {
    // Start of degradation at t = 10000
    const firstDegraded: GpsFilterReading = {
      latitude: 9.6914,
      longitude: 76.7828,
      accuracy: 65,
      timestamp: 10000,
    };
    expect(filter.filter(firstDegraded).accepted).toBe(false);

    // Midpoint at t = 25000 (15s in): still rejected
    const midDegraded: GpsFilterReading = {
      latitude: 9.6914,
      longitude: 76.7828,
      accuracy: 68,
      timestamp: 25000,
    };
    expect(filter.filter(midDegraded).accepted).toBe(false);

    // After 35 seconds (t = 45000): should trigger DEGRADED_OVERRIDE and be accepted!
    const overrideReading: GpsFilterReading = {
      latitude: 9.6914,
      longitude: 76.7828,
      accuracy: 70,
      timestamp: 45000,
    };
    const overrideRes = filter.filter(overrideReading);
    expect(overrideRes.accepted).toBe(true);
    expect(overrideRes.reason).toBe("DEGRADED_OVERRIDE");
  });
});
