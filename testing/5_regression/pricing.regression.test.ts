/**
 * ═══════════════════════════════════════════════════════════════
 * TEST TYPE 5 — REGRESSION TESTING
 * ═══════════════════════════════════════════════════════════════
 * What: Ensures previously working features never silently BREAK
 *       after new code changes. Uses "golden values" + snapshots.
 * Why:  If someone edits pricingEngine.ts rates accidentally,
 *       every downstream calculation silently changes. This test
 *       FREEZES the expected output. Any change = test FAILS.
 * Tool: Jest snapshots + explicit golden value assertions
 * ═══════════════════════════════════════════════════════════════
 */

import {
  calculateDispatchPricing,
  calculateLiftCharge,
  calculateOperatorWage,
  DEFAULT_PRICING,
} from "@/lib/pricingEngine";

// ─── GOLDEN VALUES: these are the KNOWN CORRECT values ──────────────────────
// If ANY of these change, there is a REGRESSION in the pricing engine.

describe("[REGRESSION] Rate Table — DEFAULT_PRICING constants never change", () => {

  test("INTERNAL_WORKER_WAGE is exactly ₹1100", () => {
    expect(DEFAULT_PRICING.INTERNAL_WORKER_WAGE).toBe(1100);
  });

  test("EXTERNAL_WORKER_WAGE is exactly ₹1200", () => {
    expect(DEFAULT_PRICING.EXTERNAL_WORKER_WAGE).toBe(1200);
  });

  test("MIXER rate is exactly ₹1000", () => {
    expect(DEFAULT_PRICING.MIXER).toBe(1000);
  });

  test("LIFT_BASE is exactly ₹1700", () => {
    expect(DEFAULT_PRICING.LIFT_BASE).toBe(1700);
  });

  test("LIFT_PER_FLOOR is exactly ₹500", () => {
    expect(DEFAULT_PRICING.LIFT_PER_FLOOR).toBe(500);
  });

  test("TROLLY_1_WHEEL is exactly ₹1500", () => {
    expect(DEFAULT_PRICING.TROLLY_1_WHEEL).toBe(1500);
  });

  test("TROLLY_2_WHEEL is exactly ₹1100", () => {
    expect(DEFAULT_PRICING.TROLLY_2_WHEEL).toBe(1100);
  });

  test("PETROL_VIBRATOR_OPERATOR_WAGE is exactly ₹1000", () => {
    expect(DEFAULT_PRICING.PETROL_VIBRATOR_OPERATOR_WAGE).toBe(1000);
  });

  test("PETROL_VIBRATOR_CUSTOMER_CHARGE is exactly ₹0", () => {
    expect(DEFAULT_PRICING.PETROL_VIBRATOR_CUSTOMER_CHARGE).toBe(0);
  });

  test("ELECTRIC_VIBRATOR_CUSTOMER_CHARGE is exactly ₹0", () => {
    expect(DEFAULT_PRICING.ELECTRIC_VIBRATOR_CUSTOMER_CHARGE).toBe(0);
  });

});

// ─── SNAPSHOT TESTS: Full output is frozen ───────────────────────────────────

describe("[REGRESSION] Dispatch Pricing — Snapshot Tests (output never silently changes)", () => {

  test("Full mixer+lift+worker scenario snapshot", () => {
    const result = calculateDispatchPricing({
      hasMixer: true,
      hasLift: true,
      liftFloors: 2,
      isExternalWorker: true,
    });
    expect(result).toMatchSnapshot();
  });

  test("Petrol vibrator scenario snapshot", () => {
    const result = calculateDispatchPricing({
      hasPetrolVibrator: true,
    });
    expect(result).toMatchSnapshot();
  });

  test("All equipment combined snapshot", () => {
    const result = calculateDispatchPricing({
      hasMixer: true,
      hasLift: true,
      liftFloors: 3,
      hasTrolly1Wheel: true,
      hasTrolly2Wheel: true,
      hasElectricVibrator: true,
    });
    expect(result).toMatchSnapshot();
  });

  test("Lift charge across all floors — golden value table", () => {
    const goldenTable = [
      { floors: 0, expected: 1700 },
      { floors: 1, expected: 2200 },
      { floors: 2, expected: 2700 },
      { floors: 3, expected: 3200 },
      { floors: 5, expected: 4200 },
      { floors: 10, expected: 6700 },
    ];

    for (const { floors, expected } of goldenTable) {
      expect(calculateLiftCharge(floors)).toBe(expected);
    }
  });

});

// ─── BEHAVIORAL REGRESSION: key business rules never change ─────────────────

describe("[REGRESSION] Business Rule: Petrol vibrator does NOT add extra worker wage", () => {
  test("Petrol vibrator operator wage is exactly ₹1000 (not ₹1000 + ₹1100)", () => {
    const result = calculateDispatchPricing({ hasPetrolVibrator: true });
    expect(result.operatorWage).toBe(1000);
    // Confirm: Internal worker wage (1100) was NOT added on top
    expect(result.operatorWage).not.toBe(2100);
  });
});

describe("[REGRESSION] Business Rule: Electric vibrator adds NO customer charge", () => {
  test("Electric vibrator alone → customerCharge = ₹0", () => {
    const result = calculateDispatchPricing({ hasElectricVibrator: true });
    expect(result.customerCharge).toBe(0);
  });
});
