/**
 * ═══════════════════════════════════════════════════════════════
 * TEST TYPE 1 — UNIT TESTING (Zod Validation Schemas)
 * ═══════════════════════════════════════════════════════════════
 * Target: src/lib/validations/operator.ts
 *   - docketSchema
 *   - fluidLogSchema
 *   - breakdownSchema
 * ═══════════════════════════════════════════════════════════════
 */

import { docketSchema, fluidLogSchema, breakdownSchema } from "@/lib/validations/operator";

// ─── docketSchema ───────────────────────────────────────────────────────────

describe("[UNIT] docketSchema", () => {

  test("Valid minimal docket passes", () => {
    const result = docketSchema.safeParse({ dispatchId: "disp_abc123" });
    expect(result.success).toBe(true);
  });

  test("Valid full docket passes", () => {
    const result = docketSchema.safeParse({
      dispatchId: "disp_abc123",
      startMeter: 100,
      endMeter: 200,
      waterAdded: 50,
      washoutMinutes: 10,
      standbyMinutes: 5,
      clientName: "Rajesh Constructions",
      signatureUrl: "https://cdn.example.com/sig.png",
    });
    expect(result.success).toBe(true);
  });

  test("Missing dispatchId → validation fails", () => {
    const result = docketSchema.safeParse({ startMeter: 100 });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].path).toContain("dispatchId");
    }
  });

  test("Empty string dispatchId → validation fails", () => {
    const result = docketSchema.safeParse({ dispatchId: "" });
    expect(result.success).toBe(false);
  });

  test("Invalid signatureUrl → validation fails", () => {
    const result = docketSchema.safeParse({
      dispatchId: "disp_001",
      signatureUrl: "not-a-url",
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      const field = result.error.issues[0].path.join(".");
      expect(field).toContain("signatureUrl");
    }
  });

  test("Negative startMeter → validation fails", () => {
    const result = docketSchema.safeParse({
      dispatchId: "disp_001",
      startMeter: -10,
    });
    expect(result.success).toBe(false);
  });

  test("String numbers are coerced (startMeter: '150' → 150)", () => {
    const result = docketSchema.safeParse({
      dispatchId: "disp_001",
      startMeter: "150",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.startMeter).toBe(150);
    }
  });

});

// ─── fluidLogSchema ──────────────────────────────────────────────────────────

describe("[UNIT] fluidLogSchema", () => {

  test("Valid diesel fluid log passes", () => {
    const result = fluidLogSchema.safeParse({
      machineId: "machine_001",
      fluidType: "DIESEL",
      amount: 50,
    });
    expect(result.success).toBe(true);
  });

  test("Valid hydraulic oil fluid log passes", () => {
    const result = fluidLogSchema.safeParse({
      machineId: "machine_002",
      fluidType: "HYDRAULIC_OIL",
      amount: 10,
    });
    expect(result.success).toBe(true);
  });

  test("Invalid fluidType → validation fails", () => {
    const result = fluidLogSchema.safeParse({
      machineId: "machine_001",
      fluidType: "WATER", // not in enum
      amount: 50,
    });
    expect(result.success).toBe(false);
  });

  test("Zero amount → fails (must be > 0)", () => {
    const result = fluidLogSchema.safeParse({
      machineId: "machine_001",
      fluidType: "DIESEL",
      amount: 0,
    });
    expect(result.success).toBe(false);
  });

  test("Negative amount → fails", () => {
    const result = fluidLogSchema.safeParse({
      machineId: "machine_001",
      fluidType: "GREASE",
      amount: -5,
    });
    expect(result.success).toBe(false);
  });

  test("Missing machineId → fails", () => {
    const result = fluidLogSchema.safeParse({ fluidType: "DIESEL", amount: 10 });
    expect(result.success).toBe(false);
  });

});

// ─── breakdownSchema ─────────────────────────────────────────────────────────

describe("[UNIT] breakdownSchema", () => {

  test("Valid breakdown report passes", () => {
    const result = breakdownSchema.safeParse({
      machineId: "machine_003",
      description: "Engine overheating on site",
      isCritical: true,
    });
    expect(result.success).toBe(true);
  });

  test("Description too short (< 5 chars) → fails", () => {
    const result = breakdownSchema.safeParse({
      machineId: "machine_003",
      description: "Hot", // only 3 chars
      isCritical: false,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toMatch(/detailed description/i);
    }
  });

  test("isCritical defaults to false when omitted", () => {
    const result = breakdownSchema.safeParse({
      machineId: "machine_003",
      description: "Hydraulic leak detected",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.isCritical).toBe(false);
    }
  });

  test("Invalid photoUrl → fails", () => {
    const result = breakdownSchema.safeParse({
      machineId: "machine_003",
      description: "Major breakdown on axle",
      photoUrl: "invalid-url-format",
    });
    expect(result.success).toBe(false);
  });

  test("Valid photoUrl passes", () => {
    const result = breakdownSchema.safeParse({
      machineId: "machine_003",
      description: "Cylinder cracked",
      photoUrl: "https://bucket.example.com/photos/breakdown.jpg",
    });
    expect(result.success).toBe(true);
  });

});
