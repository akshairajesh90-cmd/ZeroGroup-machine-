/**
 * Pure coordinate constants and synchronous accessors for the Pala Central Depot.
 * Safe for both Client Components and Server Modules (Zero Node.js/DB dependencies).
 */

export const PALA_DEPOT_LATITUDE = 9.7118;
export const PALA_DEPOT_LONGITUDE = 76.6853;

export function getYardCoordinatesSync(): { latitude: number; longitude: number } {
  return {
    latitude: PALA_DEPOT_LATITUDE,
    longitude: PALA_DEPOT_LONGITUDE,
  };
}
