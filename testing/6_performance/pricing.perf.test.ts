/**
 * ═══════════════════════════════════════════════════════════════
 * TEST TYPE 6 — PERFORMANCE TESTING
 * ═══════════════════════════════════════════════════════════════
 * What: Measures speed, throughput, and memory usage of critical
 *       functions under load. Sets hard SLA thresholds.
 * Why:  A correct but SLOW pricing engine breaks real-time UX
 *       when dispatch boards render 500+ rows simultaneously.
 * Tool: Jest + Node.js performance APIs (no external library needed)
 * Target: calculateDispatchPricing bulk throughput
 * ═══════════════════════════════════════════════════════════════
 */

import { calculateDispatchPricing, calculateLiftCharge } from "@/lib/pricingEngine";
import { getSaturdayWeek } from "@/lib/dateUtils";

// ─── SLA Thresholds (Performance Budget) ────────────────────────────────────
const THRESHOLDS = {
  PRICING_100K_MAX_MS:   500,   // 100,000 calculations must complete in < 500ms
  PRICING_SINGLE_MAX_US: 50,    // Single call must take < 50 microseconds
  LIFT_1M_MAX_MS:        750,   // 1,000,000 lift calculations < 750ms (hardware dependent)
  DATE_100K_MAX_MS:      200,   // 100,000 date calculations < 200ms
  MEMORY_MAX_MB:         20,    // Heap growth during 100k run < 20MB
};

// ─── Helper ──────────────────────────────────────────────────────────────────
function getHeapMB(): number {
  return process.memoryUsage().heapUsed / 1024 / 1024;
}

// ─── PERFORMANCE TESTS ───────────────────────────────────────────────────────

describe("[PERFORMANCE] calculateDispatchPricing() — Throughput & Speed", () => {

  test(`Single call completes in < ${THRESHOLDS.PRICING_SINGLE_MAX_US}μs (after warm-up)`, () => {
    // Warm-up: first call has module-init overhead in Jest; measure the steady-state time
    for (let i = 0; i < 100; i++) {
      calculateDispatchPricing({ hasMixer: true });
    }
    // Now measure a single call in steady state
    const start = performance.now();
    calculateDispatchPricing({ hasMixer: true, hasLift: true, liftFloors: 3, isExternalWorker: true });
    const end = performance.now();
    const elapsedMicroseconds = (end - start) * 1000;

    console.log(`  ⚡ Single pricing call (warm): ${elapsedMicroseconds.toFixed(2)}μs`);
    expect(elapsedMicroseconds).toBeLessThan(THRESHOLDS.PRICING_SINGLE_MAX_US);
  });

  test(`100,000 pricing calculations complete in < ${THRESHOLDS.PRICING_100K_MAX_MS}ms`, () => {
    const iterations = 100_000;
    const inputs = [
      { hasMixer: true },
      { hasLift: true, liftFloors: 2 },
      { hasTrolly1Wheel: true, isExternalWorker: true },
      { hasPetrolVibrator: true },
      { hasMixer: true, hasLift: true, liftFloors: 3, hasTrolly2Wheel: true },
    ];

    const start = performance.now();
    for (let i = 0; i < iterations; i++) {
      calculateDispatchPricing(inputs[i % inputs.length]);
    }
    const elapsed = performance.now() - start;
    const throughput = Math.round(iterations / (elapsed / 1000));

    console.log(`  🏎  100k runs: ${elapsed.toFixed(1)}ms | Throughput: ${throughput.toLocaleString()}/sec`);
    expect(elapsed).toBeLessThan(THRESHOLDS.PRICING_100K_MAX_MS);
  });

  test(`Memory: Heap growth during 100,000 calls < ${THRESHOLDS.MEMORY_MAX_MB}MB`, () => {
    // Warm-up (avoid cold-start bias)
    for (let i = 0; i < 1000; i++) calculateDispatchPricing({ hasMixer: true });

    const heapBefore = getHeapMB();
    for (let i = 0; i < 100_000; i++) {
      calculateDispatchPricing({ hasMixer: true, hasLift: true, liftFloors: i % 10 });
    }
    const heapAfter = getHeapMB();
    const growth = heapAfter - heapBefore;

    console.log(`  🧠 Heap before: ${heapBefore.toFixed(1)}MB | After: ${heapAfter.toFixed(1)}MB | Growth: ${growth.toFixed(1)}MB`);
    expect(growth).toBeLessThan(THRESHOLDS.MEMORY_MAX_MB);
  });

});

describe("[PERFORMANCE] calculateLiftCharge() — 1,000,000 iterations", () => {

  test(`1,000,000 lift charge calculations < ${THRESHOLDS.LIFT_1M_MAX_MS}ms`, () => {
    const start = performance.now();
    for (let i = 0; i < 1_000_000; i++) {
      calculateLiftCharge(i % 20); // floors 0-19
    }
    const elapsed = performance.now() - start;
    const throughput = Math.round(1_000_000 / (elapsed / 1000));

    console.log(`  🏗  1M lift calcs: ${elapsed.toFixed(1)}ms | ${throughput.toLocaleString()}/sec`);
    expect(elapsed).toBeLessThan(THRESHOLDS.LIFT_1M_MAX_MS);
  });

});

describe("[PERFORMANCE] getSaturdayWeek() — Date Utility", () => {

  test(`100,000 date range calculations < ${THRESHOLDS.DATE_100K_MAX_MS}ms`, () => {
    const baseDate = new Date(2026, 0, 1); // Jan 1 2026

    const start = performance.now();
    for (let i = 0; i < 100_000; i++) {
      const d = new Date(baseDate.getTime() + i * 86_400_000); // each day
      getSaturdayWeek(d);
    }
    const elapsed = performance.now() - start;

    console.log(`  📅 100k date calcs: ${elapsed.toFixed(1)}ms`);
    expect(elapsed).toBeLessThan(THRESHOLDS.DATE_100K_MAX_MS);
  });

});

describe("[PERFORMANCE] Dispatch Pricing — Worst-case scenario (all equipment)", () => {

  test("10,000 worst-case (all equipment set) calls complete in < 100ms", () => {
    const worst = {
      hasMixer: true,
      hasLift: true,
      liftFloors: 10,
      hasTrolly1Wheel: true,
      hasTrolly2Wheel: true,
      hasPetrolVibrator: false,
      hasElectricVibrator: true,
      isExternalWorker: true,
    };

    const start = performance.now();
    for (let i = 0; i < 10_000; i++) {
      calculateDispatchPricing(worst);
    }
    const elapsed = performance.now() - start;
    console.log(`  💪 10k worst-case runs: ${elapsed.toFixed(1)}ms`);
    expect(elapsed).toBeLessThan(100);
  });

});
