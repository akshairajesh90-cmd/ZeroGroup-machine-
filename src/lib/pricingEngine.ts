/**
 * ============================================================
 * ZERO GROUP — Centralized Pricing Engine
 * ============================================================
 * Single source of truth for all customer charges & worker wages.
 * Editable by ADMIN/STAFF. Do NOT hardcode rates anywhere else.
 *
 * LIFT MATH: Base ₹1700 covers Ground Floor (Floor 0).
 *   Floor 1 = 1700 + (1 × 500) = 2200
 *   Floor 2 = 1700 + (2 × 500) = 2700
 *   Floor 3 = 1700 + (3 × 500) = 3200
 *   (liftFloors is how many floors ABOVE ground)
 *
 * PETROL VIBRATOR: No separate equipment fee to customer.
 *   The worker operating it is paid ₹1000/day (charged to customer as labor).
 *
 * ELECTRIC VIBRATOR: No operator needed. No extra charge to customer.
 * ============================================================
 */

// ─── Editable Rate Table ──────────────────────────────────────────────────────
export const DEFAULT_PRICING = {
  // Worker Wages (Daily)
  INTERNAL_WORKER_WAGE:  1100,  // Our office operators/workers
  EXTERNAL_WORKER_WAGE:  1200,  // Outside workers

  // Machine Customer Charges (per day)
  MIXER:                 1000,  // Concrete mixer flat rate

  // Lift (charged to customer)
  LIFT_BASE:             1700,  // Ground floor base price
  LIFT_PER_FLOOR:         500,  // Add per additional floor above ground

  // Trolley (charged to customer, includes worker wage)
  TROLLY_1_WHEEL:        1500,
  TROLLY_2_WHEEL:        1100,

  // Vibrator (charged to customer)
  PETROL_VIBRATOR_CUSTOMER_CHARGE: 0,   // No separate equipment charge — worker wage covers it
  PETROL_VIBRATOR_OPERATOR_WAGE:   1000, // Operator gets ₹1000 for petrol vibrator jobs
  ELECTRIC_VIBRATOR_CUSTOMER_CHARGE: 0, // No extra charge, no operator needed
} as const;

// ─── Types ────────────────────────────────────────────────────────────────────

export type PricingInput = {
  hasMixer?:         boolean;
  hasLift?:          boolean;
  liftFloors?:       number;  // floors ABOVE ground (e.g. 3 = third floor)
  hasTrolly1Wheel?:  boolean;
  hasTrolly2Wheel?:  boolean;
  hasPetrolVibrator?:   boolean;
  hasElectricVibrator?: boolean;
  isInternalWorker?:    boolean;
  isExternalWorker?:    boolean;
};

export type PricingResult = {
  customerCharge: number;
  operatorWage:   number;
  breakdown:      { label: string; charge: number; wage?: number }[];
};

// ─── Main Engine Function ─────────────────────────────────────────────────────

/**
 * Given the equipment/labor details of a dispatch,
 * returns the total customer charge and operator wage.
 */
export function calculateDispatchPricing(input: PricingInput): PricingResult {
  let customerCharge = 0;
  let operatorWage   = 0;
  const breakdown: PricingResult["breakdown"] = [];

  // — Mixer ——————————————————————————————————
  if (input.hasMixer) {
    customerCharge += DEFAULT_PRICING.MIXER;
    breakdown.push({ label: "Mixer (Machine)", charge: DEFAULT_PRICING.MIXER });
  }

  // — Lift ———————————————————————————————————
  if (input.hasLift) {
    const floors = Math.max(0, input.liftFloors || 0);
    const liftCharge = DEFAULT_PRICING.LIFT_BASE + (floors * DEFAULT_PRICING.LIFT_PER_FLOOR);
    customerCharge += liftCharge;
    breakdown.push({ label: `Lift (${floors} floor${floors !== 1 ? "s" : ""} above ground)`, charge: liftCharge });
  }

  // — Trolly (1-Wheel) ————————————————————————
  if (input.hasTrolly1Wheel) {
    customerCharge += DEFAULT_PRICING.TROLLY_1_WHEEL;
    breakdown.push({ label: "Trolly (1-Wheel)", charge: DEFAULT_PRICING.TROLLY_1_WHEEL });
  }

  // — Trolly (2-Wheel) ————————————————————————
  if (input.hasTrolly2Wheel) {
    customerCharge += DEFAULT_PRICING.TROLLY_2_WHEEL;
    breakdown.push({ label: "Trolly (2-Wheel)", charge: DEFAULT_PRICING.TROLLY_2_WHEEL });
  }

  // — Petrol Vibrator ——————————————————————————
  if (input.hasPetrolVibrator) {
    // No additional charge to customer — operator wage is the "cost"
    const opWage = DEFAULT_PRICING.PETROL_VIBRATOR_OPERATOR_WAGE;
    operatorWage += opWage;
    breakdown.push({ label: "Petrol Vibrator (Operator)", charge: DEFAULT_PRICING.PETROL_VIBRATOR_CUSTOMER_CHARGE, wage: opWage });
  }

  // — Electric Vibrator ——————————————————————
  if (input.hasElectricVibrator) {
    // No charge, no operator
    breakdown.push({ label: "Electric Vibrator", charge: DEFAULT_PRICING.ELECTRIC_VIBRATOR_CUSTOMER_CHARGE });
  }

  // — Worker Wage (if not already overridden by vibrator) ——————————
  if (!input.hasPetrolVibrator) {
    if (input.isExternalWorker) {
      operatorWage += DEFAULT_PRICING.EXTERNAL_WORKER_WAGE;
      breakdown.push({ label: "External Worker Wage", charge: 0, wage: DEFAULT_PRICING.EXTERNAL_WORKER_WAGE });
    } else {
      // Default: internal worker
      operatorWage += DEFAULT_PRICING.INTERNAL_WORKER_WAGE;
      breakdown.push({ label: "Internal Worker Wage", charge: 0, wage: DEFAULT_PRICING.INTERNAL_WORKER_WAGE });
    }
  }

  return { customerCharge, operatorWage, breakdown };
}

/**
 * Simple helper: just the daily wage for an operator.
 */
export function calculateOperatorWage(input: { isInternalWorker?: boolean }): number {
  return input.isInternalWorker
    ? DEFAULT_PRICING.INTERNAL_WORKER_WAGE
    : DEFAULT_PRICING.EXTERNAL_WORKER_WAGE;
}

/**
 * Simple helper: just the lift charge for a given number of extra floors.
 * liftFloors = floors ABOVE ground (0 = ground floor only).
 */
export function calculateLiftCharge(liftFloors: number): number {
  const floors = Math.max(0, liftFloors || 0);
  return DEFAULT_PRICING.LIFT_BASE + (floors * DEFAULT_PRICING.LIFT_PER_FLOOR);
}
