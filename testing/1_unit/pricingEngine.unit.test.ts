/**
 * ═══════════════════════════════════════════════════════════════
 * TEST TYPE 1 — UNIT TESTING
 * ═══════════════════════════════════════════════════════════════
 * What: Tests the smallest isolatable pieces of logic in total
 *       isolation — no network, no DB, no framework.
 * Why:  Catches bugs at the source before they propagate.
 * Tool: Jest + ts-jest
 * Target: pricingEngine.ts → calculateDispatchPricing,
 *         calculateOperatorWage, calculateLiftCharge
 * ═══════════════════════════════════════════════════════════════
 */

import {
  calculateDispatchPricing,
  calculateOperatorWage,
  calculateLiftCharge,
  DEFAULT_PRICING,
} from "@/lib/pricingEngine";

// ─── GROUP 1: Lift Charge Calculator ────────────────────────────────────────

describe("[UNIT] calculateLiftCharge()", () => {

  test("Ground floor (0 extra floors) → base price ₹1700", () => {
    expect(calculateLiftCharge(0)).toBe(1700);
  });

  test("1 floor above ground → ₹1700 + 1×500 = ₹2200", () => {
    expect(calculateLiftCharge(1)).toBe(2200);
  });

  test("2 floors above ground → ₹1700 + 2×500 = ₹2700", () => {
    expect(calculateLiftCharge(2)).toBe(2700);
  });

  test("3 floors above ground → ₹1700 + 3×500 = ₹3200", () => {
    expect(calculateLiftCharge(3)).toBe(3200);
  });

  test("Negative floor input is clamped to 0 (no negative charges)", () => {
    expect(calculateLiftCharge(-5)).toBe(1700);
  });

  test("Very high floor (10 floors) → ₹1700 + 10×500 = ₹6700", () => {
    expect(calculateLiftCharge(10)).toBe(6700);
  });

});

// ─── GROUP 2: Operator Wage Calculator ──────────────────────────────────────

describe("[UNIT] calculateOperatorWage()", () => {

  test("Internal worker gets ₹1100/day", () => {
    expect(calculateOperatorWage({ isInternalWorker: true })).toBe(1100);
  });

  test("External worker (isInternalWorker=false) gets ₹1200/day", () => {
    expect(calculateOperatorWage({ isInternalWorker: false })).toBe(1200);
  });

  test("No isInternalWorker flag defaults to external wage ₹1200", () => {
    // When isInternalWorker is undefined → not internal → external rate
    expect(calculateOperatorWage({})).toBe(1200);
  });

});

// ─── GROUP 3: Full Dispatch Pricing Engine ───────────────────────────────────

describe("[UNIT] calculateDispatchPricing()", () => {

  test("Empty input → ₹0 customer charge, ₹1100 internal worker wage", () => {
    const result = calculateDispatchPricing({});
    expect(result.customerCharge).toBe(0);
    expect(result.operatorWage).toBe(DEFAULT_PRICING.INTERNAL_WORKER_WAGE);
  });

  test("Mixer only → ₹1000 customer charge", () => {
    const result = calculateDispatchPricing({ hasMixer: true });
    expect(result.customerCharge).toBe(1000);
    expect(result.breakdown.some(b => b.label.includes("Mixer"))).toBe(true);
  });

  test("Lift on ground floor → ₹1700 customer charge", () => {
    const result = calculateDispatchPricing({ hasLift: true, liftFloors: 0 });
    expect(result.customerCharge).toBe(1700);
  });

  test("Lift on 3rd floor → ₹3200 customer charge", () => {
    const result = calculateDispatchPricing({ hasLift: true, liftFloors: 3 });
    expect(result.customerCharge).toBe(3200);
  });

  test("1-wheel trolly → ₹1500 customer charge", () => {
    const result = calculateDispatchPricing({ hasTrolly1Wheel: true });
    expect(result.customerCharge).toBe(1500);
  });

  test("2-wheel trolly → ₹1100 customer charge", () => {
    const result = calculateDispatchPricing({ hasTrolly2Wheel: true });
    expect(result.customerCharge).toBe(1100);
  });

  test("Petrol vibrator → ₹0 customer charge, ₹1000 operator wage (no extra worker wage)", () => {
    const result = calculateDispatchPricing({ hasPetrolVibrator: true });
    expect(result.customerCharge).toBe(0);
    expect(result.operatorWage).toBe(1000);
    // Should NOT add extra worker wage on top of vibrator wage
    expect(result.breakdown.some(b => b.label.includes("Internal Worker Wage"))).toBe(false);
  });

  test("Electric vibrator → ₹0 customer charge, ₹1100 internal worker wage still added", () => {
    const result = calculateDispatchPricing({ hasElectricVibrator: true });
    expect(result.customerCharge).toBe(0);
    // Electric vibrator doesn't override worker wage
    expect(result.operatorWage).toBe(1100);
  });

  test("Combined: Mixer + Lift(2F) + External worker", () => {
    // Customer charge: 1000 + 2700 = 3700
    // Operator wage: 1200 (external)
    const result = calculateDispatchPricing({
      hasMixer: true,
      hasLift: true,
      liftFloors: 2,
      isExternalWorker: true,
    });
    expect(result.customerCharge).toBe(3700);
    expect(result.operatorWage).toBe(1200);
    expect(result.breakdown).toHaveLength(3); // Mixer + Lift + External Worker
  });

  test("All equipment combined — breakdown has correct number of entries", () => {
    const result = calculateDispatchPricing({
      hasMixer: true,
      hasLift: true,
      liftFloors: 1,
      hasTrolly1Wheel: true,
      hasTrolly2Wheel: true,
      hasElectricVibrator: true,
    });
    // Mixer, Lift, Trolly1, Trolly2, ElectricVibrator, InternalWorker = 6 items
    expect(result.breakdown).toHaveLength(6);
    expect(result.customerCharge).toBe(1000 + 2200 + 1500 + 1100);
  });

  test("Breakdown array has the correct labels", () => {
    const result = calculateDispatchPricing({ hasMixer: true, hasLift: true, liftFloors: 1 });
    const labels = result.breakdown.map(b => b.label);
    expect(labels).toContain("Mixer (Machine)");
    expect(labels).toContain("Lift (1 floor above ground)");
  });

  test("Lift floor label is pluralized correctly for 1 floor", () => {
    const result = calculateDispatchPricing({ hasLift: true, liftFloors: 1 });
    expect(result.breakdown[0].label).toBe("Lift (1 floor above ground)");
  });

  test("Lift floor label uses 'floors' for 2+ floors", () => {
    const result = calculateDispatchPricing({ hasLift: true, liftFloors: 3 });
    expect(result.breakdown[0].label).toBe("Lift (3 floors above ground)");
  });

});
