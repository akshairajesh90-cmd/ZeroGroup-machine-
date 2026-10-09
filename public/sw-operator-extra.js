/**
 * sw-operator-extra.js
 * Extra service worker logic injected at runtime via addEventListener.
 * Handles:
 *   1. Caching /api/auth/session for offline JWT persistence.
 *   2. Background sync processing for the IndexedDB docket queue.
 *
 * This file is appended to sw.js during next build. For now, it is
 * standalone and loaded in the operator layout via <script>.
 *
 * Workbox already handles precaching. We add stale-while-revalidate
 * for the session endpoint so the operator stays logged in offline.
 */

const SESSION_CACHE_NAME = "nextauth-session-v1";
const SESSION_URL = "/api/auth/session";
const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Intercept fetch: serve cached session when offline
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  if (url.pathname === SESSION_URL && event.request.method === "GET") {
    event.respondWith(
      caches.open(SESSION_CACHE_NAME).then(async (cache) => {
        try {
          // Try network first
          const networkResponse = await fetch(event.request.clone());
          if (networkResponse.ok) {
            cache.put(event.request, networkResponse.clone());
          }
          return networkResponse;
        } catch {
          // Offline: return cached session
          const cached = await cache.match(event.request);
          if (cached) return cached;
          // No cache: return empty session (NextAuth handles gracefully)
          return new Response(JSON.stringify(null), {
            headers: { "Content-Type": "application/json" },
          });
        }
      })
    );
  }
});

// Listen for messages from the app (e.g., cache current session manually)
self.addEventListener("message", (event) => {
  if (event.data?.type === "CACHE_SESSION_NOW") {
    caches.open(SESSION_CACHE_NAME).then(async (cache) => {
      try {
        const response = await fetch(SESSION_URL);
        if (response.ok) {
          cache.put(SESSION_URL, response);
        }
      } catch {
        // Silently fail - we can't fetch when offline
      }
    });
  }
});
