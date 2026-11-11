import {
  calculateSettlementSchema,
  createAdjustmentSchema,
  approveAdjustmentSchema,
  generateSettlementSchema,
  updateSettlementSchema,
  finalizeSettlementSchema,
  finalizeWeeklySettlementSchema,
  multiPlayerBreakdownSchema,
} from "../schemas";

describe("Settlement Zod Schemas", () => {
  describe("calculateSettlementSchema", () => {
    it("accepts valid operator and date range", () => {
      const valid = {
        operatorId: "op-123",
        startDate: "2026-03-01",
        endDate: "2026-03-07",
      };
      const result = calculateSettlementSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("rejects empty operatorId or missing dates", () => {
      const invalid = {
        operatorId: "",
        startDate: "2026-03-01",
        endDate: "",
      };
      const result = calculateSettlementSchema.safeParse(invalid);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThanOrEqual(2);
      }
    });
  });

  describe("createAdjustmentSchema", () => {
    it("validates positive bonus adjustment with audit reason", () => {
      const valid = {
        employeeId: "emp-456",
        amount: 250,
        type: "BONUS",
        reason: "Excellent site preparation performance",
        date: "2026-03-05",
      };
      const result = createAdjustmentSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("rejects negative amount and short reason", () => {
      const invalid = {
        employeeId: "emp-456",
        amount: -50,
        type: "PENALTY",
        reason: "No",
        date: "2026-03-05",
      };
      const result = createAdjustmentSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });

    it("rejects invalid adjustment type", () => {
      const invalid = {
        employeeId: "emp-456",
        amount: 100,
        type: "INVALID_TYPE",
        reason: "Valid reason text",
        date: "2026-03-05",
      };
      const result = createAdjustmentSchema.safeParse(invalid);
      expect(result.success).toBe(false);
    });
  });

  describe("approveAdjustmentSchema", () => {
    it("requires adjustmentId", () => {
      expect(approveAdjustmentSchema.safeParse({ adjustmentId: "adj-1" }).success).toBe(true);
      expect(approveAdjustmentSchema.safeParse({ adjustmentId: "" }).success).toBe(false);
    });
  });

  describe("generateSettlementSchema", () => {
    it("accepts valid generation parameters with optional overrides", () => {
      const valid = {
        operatorId: "op-1",
        weekEnding: "2026-03-07",
        notes: "Approved by manager",
        customEarned: 5000,
        customAdvances: 1000,
        customBonuses: 500,
      };
      const result = generateSettlementSchema.safeParse(valid);
      expect(result.success).toBe(true);
    });

    it("rejects missing weekEnding", () => {
      const result = generateSettlementSchema.safeParse({ operatorId: "op-1", weekEnding: "" });
      expect(result.success).toBe(false);
    });
  });

  describe("updateSettlementSchema & finalizeSettlementSchema", () => {
    it("requires integer version check for optimistic concurrency control", () => {
      const valid = {
        settlementId: "set-001",
        currentVersion: 3,
        customEarned: 6200,
      };
      expect(updateSettlementSchema.safeParse(valid).success).toBe(true);

      const invalidVersion = {
        settlementId: "set-001",
        currentVersion: 3.5, // Not integer
      };
      expect(updateSettlementSchema.safeParse(invalidVersion).success).toBe(false);
    });

    it("validates finalize payload with integer version", () => {
      expect(finalizeSettlementSchema.safeParse({ settlementId: "s-1", currentVersion: 1 }).success).toBe(true);
      expect(finalizeSettlementSchema.safeParse({ settlementId: "s-1" }).success).toBe(false);
    });
  });

  describe("finalizeWeeklySettlementSchema & multiPlayerBreakdownSchema", () => {
    it("validates weekly settlement parameters", () => {
      const valid = {
        employeeId: "emp-789",
        weekEnding: "2026-03-07",
        notes: "Audited payout",
      };
      expect(finalizeWeeklySettlementSchema.safeParse(valid).success).toBe(true);
    });

    it("validates multiplayer date range", () => {
      expect(multiPlayerBreakdownSchema.safeParse({ startDate: "2026-03-01", endDate: "2026-03-07" }).success).toBe(true);
      expect(multiPlayerBreakdownSchema.safeParse({ startDate: "" }).success).toBe(false);
    });
  });
});
