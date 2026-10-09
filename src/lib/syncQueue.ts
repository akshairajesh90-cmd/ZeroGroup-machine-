import { offlineDb } from "./offlineDb";
import { refreshSessionBeforeSync } from "./swSessionPatch";

// ─── Constants ────────────────────────────────────────────────────────────────

/** Drop a request permanently after this many failed attempts */
const MAX_FETCH_RETRIES = 3;

// ─── Failure Toast (mirrors offlineQueue.ts pattern) ─────────────────────────

function dispatchFetchDeadLetterToast(tag: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("offline-sync-failure", {
      detail: {
        actionName: tag,
        finalError: `Request permanently failed after ${MAX_FETCH_RETRIES} retries and was dropped.`,
        timestamp: Date.now(),
      },
    })
  );
}

// ─── Main sync drain ──────────────────────────────────────────────────────────

/**
 * Drains the Dexie-backed offline fetch queue in strict FIFO order.
 * - Validates the session first.
 * - Drops 4xx (client error) responses immediately — no retry.
 * - Increments retries for 5xx / network failures.
 * - Permanently drops items exceeding MAX_FETCH_RETRIES and fires a toast event.
 */
export async function syncOfflineQueue(): Promise<void> {
  if (!navigator.onLine) return;

  // ── Session guard ─────────────────────────────────────────────────────────
  const sessionValid = await refreshSessionBeforeSync();
  if (!sessionValid) {
    console.warn("[SyncQueue] Session invalid — aborting fetch queue drain.");
    if (typeof window !== "undefined") {
      window.dispatchEvent(
        new CustomEvent("offline-sync-session-expired", {
          detail: { message: "Session expired. Re-login to resume sync." },
        })
      );
    }
    return;
  }

  // ── FIFO drain: ordered by createdAt (oldest first) ───────────────────────
  const pendingRequests = await offlineDb.queuedRequests.orderBy("createdAt").toArray();

  for (const req of pendingRequests) {
    // ── Retry gate: drop items that have already exceeded the limit ──────────
    if (req.retries >= MAX_FETCH_RETRIES) {
      await offlineDb.queuedRequests.delete(req.id!);
      dispatchFetchDeadLetterToast(req.tag ?? "unknown");
      console.error(
        `[SyncQueue] Request ${req.id} (${req.tag}) permanently dropped after ${MAX_FETCH_RETRIES} retries.`
      );
      continue;
    }

    try {
      const response = await fetch(req.url, {
        method: req.method,
        headers: {
          "Content-Type": "application/json",
          ...req.headers,
        },
        body: req.body,
        credentials: "include",
      });

      if (response.ok) {
        // ── Success: remove from queue ────────────────────────────────────────
        await offlineDb.queuedRequests.delete(req.id!);
        console.log(`[SyncQueue] Synced request ${req.id} (${req.tag})`);
      } else if (response.status >= 400 && response.status < 500) {
        // ── 4xx Client Error: non-retryable — drop immediately ───────────────
        await offlineDb.queuedRequests.delete(req.id!);
        dispatchFetchDeadLetterToast(req.tag ?? "unknown");
        console.error(
          `[SyncQueue] Request ${req.id} (${req.tag}) returned ${response.status} — permanently dropped (non-retryable).`
        );
      } else {
        // ── 5xx Server Error: retryable — increment counter ──────────────────
        const newRetries = req.retries + 1;
        if (newRetries >= MAX_FETCH_RETRIES) {
          await offlineDb.queuedRequests.delete(req.id!);
          dispatchFetchDeadLetterToast(req.tag ?? "unknown");
          console.error(`[SyncQueue] Request ${req.id} exceeded max retries — dropped.`);
        } else {
          await offlineDb.queuedRequests.update(req.id!, { retries: newRetries });
          console.warn(
            `[SyncQueue] Request ${req.id} failed with ${response.status}. Retry ${newRetries}/${MAX_FETCH_RETRIES}.`
          );
        }
      }
    } catch (networkError: any) {
      // ── Network failure: increment retry, continue to next item (no break) ──
      const newRetries = req.retries + 1;
      if (newRetries >= MAX_FETCH_RETRIES) {
        await offlineDb.queuedRequests.delete(req.id!);
        dispatchFetchDeadLetterToast(req.tag ?? "unknown");
        console.error(`[SyncQueue] Request ${req.id} hit network error max retries — dropped.`);
      } else {
        await offlineDb.queuedRequests.update(req.id!, { retries: newRetries });
        console.warn(
          `[SyncQueue] Network error on request ${req.id}. Retry ${newRetries}/${MAX_FETCH_RETRIES}:`,
          networkError?.message
        );
      }
      // ── Continue to next item (do NOT break — FIFO drain continues) ─────────
      continue;
    }
  }
}

// ─── Queue a fetch-based request for offline execution ───────────────────────

/**
 * Drop-in replacement for `fetch()` in write paths that need offline support.
 * If online, executes immediately. If offline or fetch fails, queues to Dexie.
 */
export async function fetchWithOfflineQueue(
  url: string,
  options: {
    method: "POST" | "PATCH" | "PUT" | "DELETE";
    body: any;
    headers?: Record<string, string>;
    tag?: string;
  }
): Promise<any> {
  if (typeof navigator === "undefined") return null;

  if (navigator.onLine) {
    try {
      const res = await fetch(url, {
        method: options.method,
        headers: {
          "Content-Type": "application/json",
          ...options.headers,
        },
        body: JSON.stringify(options.body),
        credentials: "include",
      });

      if (res.ok) {
        return await res.json();
      }

      // 4xx — do NOT queue, surface error immediately
      if (res.status >= 400 && res.status < 500) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody?.error ?? `Client error: ${res.status}`);
      }

      // 5xx — fall through to queue
      throw new Error(`Server error: ${res.status}. Queuing for retry.`);
    } catch (e) {
      console.warn("[SyncQueue] Online fetch failed — falling back to offline queue:", e);
    }
  }

  // Offline or online fetch failed → add to Dexie queue
  const id = await offlineDb.queuedRequests.add({
    url,
    method: options.method,
    body: JSON.stringify(options.body),
    headers: options.headers,
    createdAt: Date.now(),
    retries: 0,
    tag: options.tag ?? "generic",
  });

  console.log(`[SyncQueue] Request queued offline with ID ${id} (${options.tag ?? url})`);
  return { queued: true, localId: id };
}

// ─── Event listeners: sync on reconnect and periodic interval ────────────────

if (typeof window !== "undefined") {
  // Sync when connection is restored
  window.addEventListener("online", () => {
    syncOfflineQueue();
    syncFieldDiaries();
  });

  // Capacitor native network listener (ignored gracefully outside Capacitor)
  import("@capacitor/network").then(({ Network }) => {
    Network.addListener("networkStatusChange", (status) => {
      if (status.connected) {
        syncOfflineQueue();
        syncFieldDiaries();
      }
    });
  }).catch(() => {
    // Not a Capacitor environment — no-op
  });

  // Periodic sync every 60 seconds
  setInterval(async () => {
    if (!navigator.onLine) return;
    await syncOfflineQueue();
    await syncFieldDiaries();

    // Sync location pings
    const unsyncedPings = await offlineDb.locationPings.filter((p) => !p.synced).toArray();
    for (const ping of unsyncedPings) {
      try {
        const res = await fetch("/api/location/ping", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify(ping),
        });
        if (res.ok) {
          await offlineDb.locationPings.delete(ping.id!);
          console.log(`[Location Sync] Synced ping ${ping.id}`);
        }
      } catch (e) {
        console.error("Failed to sync ping", ping.id);
      }
    }
  }, 60_000);
}

// ─── Field Diary Sync ─────────────────────────────────────────────────────────

export async function syncFieldDiaries(): Promise<void> {
  if (!navigator.onLine) return;

  const sessionValid = await refreshSessionBeforeSync();
  if (!sessionValid) return;

  const unsyncedDiaries = await offlineDb.diaryLogs.filter((d) => !d.syncedAt).toArray();
  if (unsyncedDiaries.length === 0) return;

  for (const diary of unsyncedDiaries) {
    try {
      const attendance = await offlineDb.attendance.where({ localDiaryId: diary.localId }).toArray();
      const externalLabor = await offlineDb.externalLabor.where({ localDiaryId: diary.localId }).toArray();
      const equipment = await offlineDb.equipmentVerifications.where({ localDiaryId: diary.localId }).toArray();

      const res = await fetch("/api/field/diary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ diary, attendance, externalLabor, equipment }),
      });

      if (res.ok) {
        const data = await res.json();
        await offlineDb.diaryLogs.update(diary.id!, { syncedAt: Date.now(), serverId: data.serverId });
        for (const att of attendance) await offlineDb.attendance.update(att.id!, { syncedAt: Date.now() });
        for (const ext of externalLabor) await offlineDb.externalLabor.update(ext.id!, { syncedAt: Date.now() });
        for (const eq of equipment) await offlineDb.equipmentVerifications.update(eq.id!, { syncedAt: Date.now() });
        console.log(`[Diary Sync] Synced diary ${diary.localId}`);
      }
    } catch (error) {
      console.error(`[Diary Sync] Error syncing diary ${diary.localId}:`, error);
    }
  }
}
