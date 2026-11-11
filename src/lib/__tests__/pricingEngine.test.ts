import {
  DEFAULT_PRICING,
  calculateDispatchPricing,
  calculateOperatorWage,
  calculateLiftCharge,
  calculateLiftOperatorWage,
  COMPANY_WORKER_ROLE_WAGES,
  OUTSIDE_WORKER_FLAT_WAGE,
  getDefaultWorkerWage,
} from "../pricingEngine";

describe("Pricing Engine Core Mathematical Verification", () => {
  describe("calculateDispatchPricing", () => {
    it("calculates pricing for standard mixer with internal worker", () => {
      const result = calculateDispatchPricing({
        hasMixer: true,
        isInternalWorker: true,
      });

      expect(result.customerCharge).toBe(1000);
      expect(result.operatorWage).toBe(1100);
      expect(result.breakdown).toHaveLength(2);
      expect(result.breakdown[0].label).toContain("Mixing Machine (Standard)");
    });

    it("calculates pricing for hydraulic mixer with lift at 3rd floor above ground", () => {
      const result = calculateDispatchPricing({
        hasHydraulicMixer: true,
        hasLift: true,
        liftFloors: 3, // Base 1700 + (3 * 500) = 3200
        isInternalWorker: true,
      });

      // 1100 (hydraulic) + 3200 (lift 3 floors) = 4300
      expect(result.customerCharge).toBe(4300);
      expect(result.operatorWage).toBe(1100);
      const liftItem = result.breakdown.find((b) => b.label.includes("Lift"));
      expect(liftItem?.charge).toBe(3200);
    });

    it("calculates trolly 1-wheel and 2-wheel customer charges", () => {
      const result = calculateDispatchPricing({
        hasTrolly1Wheel: true,
        hasTrolly2Wheel: true,
      });

      // 1500 + 200 = 1700
      expect(result.customerCharge).toBe(1700);
    });

    it("handles petrol vibrator wage rule (₹1000 operator wage, ₹0 customer equipment fee)", () => {
      const result = calculateDispatchPricing({
        hasPetrolVibrator: true,
      });

      expect(result.customerCharge).toBe(0);
      expect(result.operatorWage).toBe(1000);
    });

    it("handles external subcontractor wage calculation", () => {
      const result = calculateDispatchPricing({
        hasMixer: true,
        isExternalWorker: true,
      });

      expect(result.customerCharge).toBe(1000);
      expect(result.operatorWage).toBe(1200);
    });
  });

  describe("calculateLiftCharge", () => {
    it("returns base rate for 0 extra floors", () => {
      expect(calculateLiftCharge(0)).toBe(1700);
    });

    it("scales correctly per additional floor", () => {
      expect(calculateLiftCharge(1)).toBe(2200);
      expect(calculateLiftCharge(2)).toBe(2700);
      expect(calculateLiftCharge(4)).toBe(3700);
    });

    it("handles negative or invalid floor values safely", () => {
      expect(calculateLiftCharge(-2)).toBe(1700);
    });
  });

  describe("calculateLiftOperatorWage", () => {
    it("returns base wage for 1st floor", () => {
      expect(calculateLiftOperatorWage(1000, 1)).toBe(1000);
    });

    it("adds ₹100 per floor above floor 1", () => {
      // 3 floors = base 1000 + (2 * 100) = 1200
      expect(calculateLiftOperatorWage(1000, 3)).toBe(1200);
      expect(calculateLiftOperatorWage(1000, 5)).toBe(1400);
    });

    it("respects custom per floor addon rate", () => {
      expect(calculateLiftOperatorWage(1000, 3, 150)).toBe(1300);
    });
  });

  describe("getDefaultWorkerWage & Role Matrices", () => {
    it("returns flat subcontractor wage regardless of role", () => {
      expect(getDefaultWorkerWage("SUBCONTRACTOR", "MIXER_OPERATOR")).toBe(OUTSIDE_WORKER_FLAT_WAGE);
      expect(getDefaultWorkerWage("SUBCONTRACTOR", "HELPER")).toBe(1200);
    });

    it("returns role-specific rates for company internal staff", () => {
      expect(getDefaultWorkerWage("INTERNAL", "MIXER_OPERATOR")).toBe(1100);
      expect(getDefaultWorkerWage("INTERNAL", "VIBRATOR_OPERATOR")).toBe(900);
      expect(getDefaultWorkerWage("INTERNAL", "LIFT_OPERATOR")).toBe(1000);
      expect(getDefaultWorkerWage("INTERNAL", "HELPER")).toBe(750);
      expect(getDefaultWorkerWage("INTERNAL", "WORKER_LEADER")).toBe(1200);
    });

    it("falls back to default internal wage for undefined roles", () => {
      expect(getDefaultWorkerWage("INTERNAL", "UNKNOWN_NEW_ROLE")).toBe(DEFAULT_PRICING.INTERNAL_WORKER_WAGE);
    });
  });
});
