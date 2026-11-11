// In-memory sliding window rate limiter: 15 requests per 60 seconds per user
export const rateLimitMap = new Map<string, number[]>();

let lastGlobalPruneTime = 0;
const GLOBAL_PRUNE_INTERVAL_MS = 10000; // Throttled sweep interval to prevent O(N) event loop blocking

/**
 * Prunes expired entries globally across ALL keys in the rate limit map.
 */
export function pruneExpiredRateLimits(windowMs = 60000, now = Date.now()): void {
  for (const [key, timestamps] of rateLimitMap.entries()) {
    const valid = timestamps.filter((t) => now - t < windowMs);
    if (valid.length === 0) {
      rateLimitMap.delete(key);
    } else {
      rateLimitMap.set(key, valid);
    }
  }
  lastGlobalPruneTime = now;
}

export function checkRateLimit(key: string, limit = 15, windowMs = 60000): boolean {
  const now = Date.now();

  // Throttled global sweep: only execute full-map iteration periodically or when capacity exceeds threshold
  if (
    process.env.NODE_ENV === "test" ||
    now - lastGlobalPruneTime > GLOBAL_PRUNE_INTERVAL_MS ||
    rateLimitMap.size > 1000
  ) {
    pruneExpiredRateLimits(windowMs, now);
  }

  const timestamps = rateLimitMap.get(key) || [];
  const validTimestamps = timestamps.filter((t) => now - t < windowMs);

  if (validTimestamps.length >= limit) {
    rateLimitMap.set(key, validTimestamps);
    return false;
  }

  validTimestamps.push(now);
  rateLimitMap.set(key, validTimestamps);
  return true;
}
