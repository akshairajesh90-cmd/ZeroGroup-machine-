export type LocationSource =
  | "STAFF_BOOKING"
  | "DRIVER_PIN"
  | "OPERATOR_PIN"
  | "VERIFIED_CENTROID"
  | "STAFF_OVERRIDE";

export const SOURCE_PRIORITY_WEIGHT: Record<LocationSource, number> = {
  STAFF_BOOKING: 1,
  DRIVER_PIN: 2,
  OPERATOR_PIN: 3,
  VERIFIED_CENTROID: 4,
  STAFF_OVERRIDE: 5,
};

export interface SetDispatchLocationParams {
  dispatchId: string;
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  source: LocationSource;
  overrideReason?: string | null;
}
