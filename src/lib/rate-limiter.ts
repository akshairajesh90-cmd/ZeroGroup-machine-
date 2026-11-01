// In-memory sliding window rate limiter: 15 requests per 60 seconds per user
export const rateLimitMap = new Map<string, number[]>();

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
}

export function checkRateLimit(key: string, limit = 15, windowMs = 60000): boolean {
  // Always perform global cleanup across all keys to prevent unbounded memory growth
  pruneExpiredRateLimits(windowMs);

  const now = Date.now();
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
