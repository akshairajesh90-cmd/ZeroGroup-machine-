// ============================================================================
// SW SESSION PATCH — JWT Session Validation Before Queue Drain
// ============================================================================

/**
 * Validates the active NextAuth session server-side before the offline sync
 * queue attempts to drain. If the session is expired or invalid, draining is
 * paused to prevent a flood of 401 responses incrementing retry counters.
 *
 * @returns true  — session is valid, proceed with drain
 * @returns false — session expired or network down, abort drain
 */
export async function refreshSessionBeforeSync(): Promise<boolean> {
  if (typeof window === "undefined") return false;

  try {
    const res = await fetch("/api/auth/session", {
      method: "GET",
      credentials: "include", // include cookies so NextAuth can validate
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      console.warn("[swSessionPatch] /api/auth/session returned", res.status, "— aborting sync.");
      return false;
    }

    const session = await res.json();

    // A valid session always has a `user` object
    if (!session?.user) {
      console.warn("[swSessionPatch] Session exists but has no user — expired or logged out.");
      return false;
    }

    return true;
  } catch (err) {
    // Network failure — don't penalise the queue, just skip this drain cycle
    console.warn("[swSessionPatch] Could not reach session endpoint:", err);
    return false;
  }
}

/**
 * Posts a message to the active Service Worker to register a session caching
 * route, allowing offline operators to remain authenticated when /api/auth/session
 * is unavailable.
 */
export async function registerSessionCacheRoutes(): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

  try {
    const reg = await navigator.serviceWorker.ready;
    reg.active?.postMessage({ type: "CACHE_SESSION_ROUTE" });
  } catch (err) {
    console.warn("[swSessionPatch] Could not reach service worker:", err);
  }
}
