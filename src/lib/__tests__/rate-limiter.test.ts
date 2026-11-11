import {
  checkRateLimit,
  rateLimitMap,
  pruneExpiredRateLimits,
} from "../rate-limiter";

describe("Sliding Window Rate Limiter", () => {
  beforeEach(() => {
    rateLimitMap.clear();
  });

  it("allows requests under the specified limit", () => {
    const key = "user-driver-1";
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit(key, 5, 60000)).toBe(true);
    }
  });

  it("blocks requests once the limit is exceeded within window", () => {
    const key = "user-driver-2";
    const limit = 3;
    expect(checkRateLimit(key, limit, 60000)).toBe(true);
    expect(checkRateLimit(key, limit, 60000)).toBe(true);
    expect(checkRateLimit(key, limit, 60000)).toBe(true);
    // 4th request must be blocked
    expect(checkRateLimit(key, limit, 60000)).toBe(false);
  });

  it("allows new requests after the window expires", () => {
    const key = "user-driver-3";
    const now = Date.now();
    // Simulate 3 old timestamps from 70 seconds ago
    rateLimitMap.set(key, [now - 70000, now - 65000, now - 62000]);

    // Should allow because all old timestamps are outside the 60s window
    expect(checkRateLimit(key, 2, 60000)).toBe(true);
  });

  it("pruneExpiredRateLimits removes stale map entries to prevent memory leaks", () => {
    const now = Date.now();
    rateLimitMap.set("stale-user", [now - 120000, now - 90000]);
    rateLimitMap.set("active-user", [now - 10000]);

    pruneExpiredRateLimits(60000, now);

    expect(rateLimitMap.has("stale-user")).toBe(false);
    expect(rateLimitMap.has("active-user")).toBe(true);
  });
});
