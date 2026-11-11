import { getSaturdayWeek } from "../dateUtils";

describe("Date Utilities (Saturday Week Calculation)", () => {
  it("computes weekStart on Monday and weekEnd on Saturday for a midweek date", () => {
    // 2026-03-11 is a Wednesday
    const wednesday = new Date("2026-03-11T10:00:00Z");
    const { weekStart, weekEnd } = getSaturdayWeek(wednesday);

    // Monday should be day 1
    expect(weekStart.getDay()).toBe(1);
    // Saturday should be day 6
    expect(weekEnd.getDay()).toBe(6);

    // Difference between weekEnd and weekStart should be 5 days
    const diffDays = Math.round(
      (weekEnd.getTime() - weekStart.getTime()) / (1000 * 60 * 60 * 24)
    );
    expect(diffDays).toBe(5);
  });

  it("handles Sunday correctly by keeping Monday-Saturday boundary", () => {
    // 2026-03-15 is a Sunday
    const sunday = new Date("2026-03-15T12:00:00Z");
    const { weekStart, weekEnd } = getSaturdayWeek(sunday);

    expect(weekStart.getDay()).toBe(1);
    expect(weekEnd.getDay()).toBe(6);
  });
});
