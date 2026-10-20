import { calculateHaversineDistance } from '../geo';

describe('calculateHaversineDistance', () => {
  test('calculates correct distance between two known coordinates', () => {
    // Coordinates for two known points
    // New York, USA
    const lat1 = 40.7128;
    const lon1 = -74.0060;
    // Los Angeles, USA
    const lat2 = 34.0522;
    const lon2 = -118.2437;

    const distance = calculateHaversineDistance(lat1, lon1, lat2, lon2);
    
    // Distance should be approximately 3,935,746 meters
    // Giving a small delta for floating point precision and earth radius variations
    expect(distance).toBeGreaterThan(3900000);
    expect(distance).toBeLessThan(4000000);
  });

  test('returns 0 for the exact same coordinates', () => {
    const lat = 12.9716;
    const lon = 77.5946;
    const distance = calculateHaversineDistance(lat, lon, lat, lon);
    expect(distance).toBe(0);
  });

  test('calculates a short distance accurately (e.g. 500m geofence)', () => {
    // Base point
    const lat1 = 12.9716;
    const lon1 = 77.5946;
    
    // A point very close
    const lat2 = 12.9761;
    const lon2 = 77.5946;
    
    const distance = calculateHaversineDistance(lat1, lon1, lat2, lon2);
    // Approximately 500 meters delta in latitude is ~0.0045 degrees
    expect(distance).toBeGreaterThan(450);
    expect(distance).toBeLessThan(550);
  });
});
