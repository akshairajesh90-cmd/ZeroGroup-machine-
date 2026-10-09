/**
 * ═══════════════════════════════════════════════════════════════
 * TEST TYPE 1 — UNIT TESTING (Date Utilities)
 * ═══════════════════════════════════════════════════════════════
 * Target: dateUtils.ts → getSaturdayWeek()
 * ═══════════════════════════════════════════════════════════════
 */

import { getSaturdayWeek } from "@/lib/dateUtils";

describe("[UNIT] getSaturdayWeek()", () => {

  test("Monday → weekStart is same Monday, weekEnd is Saturday of same week", () => {
    // Monday 2026-09-14
    const monday = new Date(2026, 8, 14); // Sep 14 2026 (Monday)
    const { weekStart, weekEnd } = getSaturdayWeek(monday);

    expect(weekStart.getDay()).toBe(1); // Monday = 1
    expect(weekEnd.getDay()).toBe(6);   // Saturday = 6
    expect(weekEnd.getDate() - weekStart.getDate()).toBe(5); // exactly 5 days later
  });

  test("Wednesday → weekStart is Monday of that week", () => {
    const wednesday = new Date(2026, 8, 16); // Sep 16 2026 (Wednesday)
    const { weekStart } = getSaturdayWeek(wednesday);
    expect(weekStart.getDay()).toBe(1); // Monday
    expect(weekStart.getDate()).toBe(14); // Sep 14
  });

  test("Saturday → weekStart is Monday of same week", () => {
    const saturday = new Date(2026, 8, 19); // Sep 19 2026 (Saturday)
    const { weekStart, weekEnd } = getSaturdayWeek(saturday);
    expect(weekStart.getDay()).toBe(1);  // Monday
    expect(weekEnd.getDay()).toBe(6);    // Saturday
  });

  test("Sunday → weekStart is previous Monday (week belongs to last week)", () => {
    // Sunday Sep 20 2026 — week started on Monday Sep 14
    const sunday = new Date(2026, 8, 20);
    const { weekStart } = getSaturdayWeek(sunday);
    expect(weekStart.getDay()).toBe(1); // Monday
    expect(weekStart.getDate()).toBe(14); // previous Monday
  });

  test("weekEnd is always exactly 5 days after weekStart (Mon→Sat)", () => {
    const dates = [
      new Date(2026, 8, 14), // Mon
      new Date(2026, 8, 16), // Wed
      new Date(2026, 8, 18), // Fri
    ];
    for (const d of dates) {
      const { weekStart, weekEnd } = getSaturdayWeek(d);
      const diff = (weekEnd.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24);
      expect(diff).toBe(5);
    }
  });

  test("Returns Date objects (not strings)", () => {
    const { weekStart, weekEnd } = getSaturdayWeek(new Date());
    expect(weekStart).toBeInstanceOf(Date);
    expect(weekEnd).toBeInstanceOf(Date);
  });

});
