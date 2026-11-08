import { z } from "zod";

export const dispatchSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  vehicleId: z.string().nullable().optional(),
  routeStopOrder: z.number().int().min(1).default(1).optional(),
  machineId: z.string().nullable().optional(), // Primary machine or nullable for independent labor
  machineIds: z.array(z.string()).optional(), // Site-Job V6.0: Multiple machines/assets
  driverId: z.string().nullable().optional(), // Nullable if public transport or outside conveyance
  operatorId: z.string().nullable().optional(), // Nullable if Electric Vibrator (no op) or optional
  workerId: z.string().nullable().optional(),
  mainHelperId: z.string().nullable().optional(),
  mainHelperName: z.string().optional(),
  helperCount: z.number().min(0).default(0), // Numeric helper count (displayed on Bill #1583)
  trollyWorkerCount: z.number().min(0).default(0), // Workers specifically for one-wheel trolly
  multiOperatorIds: z.array(z.string()).optional(),
  multiWorkerIds: z.array(z.string()).optional(),
  paniLaborCount: z.number().min(0).default(0),
  siteBundleId: z.string().optional(),
  location: z.string().min(2, "Construction site location is required"),
  mapLink: z.string().optional(), // Driver GPS Map Pin link for return drivers / forgotten tools
  subLocality: z.string().optional().nullable(),
  structuralAnchor: z.string().optional().nullable(),
  accessLatitude: z.number().optional().nullable(),
  accessLongitude: z.number().optional().nullable(),
  isOffRoad: z.boolean().optional().nullable(),
  offRoadBearingDeg: z.number().optional().nullable(),
  offRoadDistanceM: z.number().optional().nullable(),
  dateOfService: z.string().min(1, "Service date is required"),
  workType: z.enum(["NORMAL", "TROLLY", "LATE"]).default("NORMAL"),

  // V15.0 Equipment & Travel Guardrails
  liftFloors: z.number().min(1).default(1),
  mixerCategory: z.enum(["STANDARD", "HYDRAULIC"]).default("STANDARD"),
  vibratorType: z.enum(["PETROL", "ELECTRIC"]).nullable().optional(),
  hasTrollyBench: z.boolean().default(false),
  publicTransportUsed: z.boolean().default(false),
  machineNumberTag: z.string().optional(),

  toolIds: z.array(z.string()).default([]),
  toolItems: z.array(
    z.object({
      toolId: z.string(),
      quantity: z.number().min(1, "Quantity must be at least 1"),
      variant: z.string().optional(),
    })
  ).optional(),
  notes: z.string().optional(),
});

export const updateStatusSchema = z.object({
  dispatchId: z.string().min(1, "Dispatch ID required"),
  status: z.enum(["PENDING", "EN_ROUTE", "IN_PROGRESS", "DELIVERED", "PICKED_UP", "COMPLETED", "CANCELLED", "POSTPONED"]),
  reason: z.string().optional(),
  newDateOfService: z.string().optional(),
});

export const reportIncidentSchema = z.object({
  dispatchId: z.string().min(1, "Dispatch ID required"),
  conflictReport: z.string().min(3, "Detailed incident description required (e.g. 'Customer refused payment over hose burst')"),
});

export const finalizeScopeSchema = z.object({
  dispatchId: z.string().min(1, "Dispatch ID required"),
  finalWorkType: z.enum(["NORMAL", "TROLLY", "LATE"]).optional(),
  adjustedOperatorRate: z.number().optional(),
  adjustedCustomerCharge: z.number().optional(),
  closingNotes: z.string().min(3, "Must describe closing scope (e.g. 'Pani finished late at 8 PM - extra 3 hours')"),
});

export const updateDailyDispatchSchema = z.object({
  id: z.string().min(1, "Dispatch ID required"),
  version: z.number().int().optional(),
  customerId: z.string().min(1, "Customer is required"),
  vehicleId: z.string().nullable().optional(),
  routeStopOrder: z.number().int().min(1).default(1).optional(),
  machineId: z.string().nullable().optional(),
  machineIds: z.array(z.string()).optional(),
  driverId: z.string().nullable().optional(),
  operatorId: z.string().nullable().optional(),
  workerId: z.string().nullable().optional(),
  siteLeaderEmployeeId: z.string().nullable().optional(),
  mainHelperId: z.string().nullable().optional(),
  mainHelperName: z.string().optional(),
  helperCount: z.number().min(0).default(0),
  trollyWorkerCount: z.number().min(0).default(0),
  multiOperatorIds: z.array(z.string()).optional(),
  multiWorkerIds: z.array(z.string()).optional(),
  crewAssignments: z.array(
    z.object({
      employeeId: z.string(),
      assignedRole: z.string(),
      lockedWageRate: z.number().optional(),
    })
  ).optional(),
  siteBundleId: z.string().optional().nullable(),
  location: z.string().min(2, "Location is required"),
  mapLink: z.string().optional().nullable(),
  subLocality: z.string().optional().nullable(),
  structuralAnchor: z.string().optional().nullable(),
  accessLatitude: z.number().optional().nullable(),
  accessLongitude: z.number().optional().nullable(),
  isOffRoad: z.boolean().optional().nullable(),
  offRoadBearingDeg: z.number().optional().nullable(),
  offRoadDistanceM: z.number().optional().nullable(),
  dateOfService: z.string().min(1, "Service date is required"),
  status: z.enum(["PENDING", "EN_ROUTE", "IN_PROGRESS", "DELIVERED", "PICKED_UP", "COMPLETED", "CANCELLED", "POSTPONED"]).optional(),
  statusReason: z.string().optional().nullable(),
  workType: z.enum(["NORMAL", "TROLLY", "LATE"]).default("NORMAL"),
  liftFloors: z.number().min(1).default(1),
  mixerCategory: z.enum(["STANDARD", "HYDRAULIC"]).default("STANDARD"),
  vibratorType: z.enum(["PETROL", "ELECTRIC"]).nullable().optional(),
  hasTrollyBench: z.boolean().default(false),
  publicTransportUsed: z.boolean().default(false),
  machineNumberTag: z.string().optional().nullable(),
  toolIds: z.array(z.string()).default([]),
  toolItems: z.array(
    z.object({
      toolId: z.string(),
      quantity: z.number().min(1),
      variant: z.string().optional(),
    })
  ).optional(),
  notes: z.string().optional().nullable(),
});
