"use client";

// ============================================================================
// ZERO GROUP — LOCAL-FIRST INDEXEDDB OFFLINE QUEUE (MODULE A PWA RESILIENCE)
// v2: Dead-Letter Queue + Retry Cap + Session-Aware Failure Events
// ============================================================================

const DB_NAME = "zero_group_offline_db";
const STORE_NAME = "offline_actions_queue";
const DEAD_LETTER_STORE = "dead_letter_queue";
const DB_VERSION = 2; // bumped from 1 → 2 to add dead_letter_queue store
const MAX_RETRIES = 5;

export interface QueuedAction {
  id: string;
  actionName: string; // e.g. "UPDATE_DISPATCH_STATUS", "REPORT_INCIDENT", "CREATE_EXPENSE"
  payload: any;
  isFormData?: boolean;
  timestamp: number;
  retryCount: number;
}

export interface DeadLetterAction extends QueuedAction {
  failedAt: number;
  finalError?: string;
}

// ─── IndexedDB Initialization ────────────────────────────────────────────────

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB not supported in this environment."));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // v1 store — preserved across upgrade
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }

      // v2 store — added in this upgrade
      if (!db.objectStoreNames.contains(DEAD_LETTER_STORE)) {
        db.createObjectStore(DEAD_LETTER_STORE, { keyPath: "id" });
      }
    };
  });
}

// ─── Queue an action locally when offline ────────────────────────────────────

export async function queueOfflineAction(actionName: string, payload: any): Promise<string> {
  try {
    const db = await openDB();
    const id = `action_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;

    let isFormData = false;
    let serializedPayload = payload;

    if (payload instanceof FormData) {
      isFormData = true;
      serializedPayload = [];
      payload.forEach((value: any, key: string) => {
        serializedPayload.push({ key, value });
      });
    }

    const queuedItem: QueuedAction = {
      id,
      actionName,
      payload: serializedPayload,
      isFormData,
      timestamp: Date.now(),
      retryCount: 0,
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.add(queuedItem);
      request.onsuccess = () => resolve(id);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error("Failed to save to offline queue:", err);
    throw err;
  }
}

// ─── Retrieve all pending items ───────────────────────────────────────────────

export async function getPendingOfflineActions(): Promise<QueuedAction[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error("Failed to get pending actions:", err);
    return [];
  }
}

// ─── Remove a successfully synced item ───────────────────────────────────────

export async function removeOfflineAction(id: string): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error("Failed to delete from queue:", err);
  }
}

// ─── Update retry count for a queued item ────────────────────────────────────

async function updateRetryCount(id: string, newRetryCount: number): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readwrite");
      const store = transaction.objectStore(STORE_NAME);
      const getReq = store.get(id);
      getReq.onsuccess = () => {
        const item = getReq.result;
        if (!item) return resolve();
        item.retryCount = newRetryCount;
        const putReq = store.put(item);
        putReq.onsuccess = () => resolve();
        putReq.onerror = () => reject(putReq.error);
      };
      getReq.onerror = () => reject(getReq.error);
    });
  } catch (err) {
    console.error("Failed to update retryCount:", err);
  }
}

// ─── Move a permanently failing item to dead letter queue ────────────────────

async function promoteToDeadLetter(item: QueuedAction, finalError?: string): Promise<void> {
  try {
    const db = await openDB();
    const deadItem: DeadLetterAction = {
      ...item,
      failedAt: Date.now(),
      finalError,
    };
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([DEAD_LETTER_STORE], "readwrite");
      const store = transaction.objectStore(DEAD_LETTER_STORE);
      const request = store.put(deadItem);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error("Failed to write to dead letter queue:", err);
  }
}

// ─── Retrieve dead letter queue items ────────────────────────────────────────

export async function getDeadLetterActions(): Promise<DeadLetterAction[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([DEAD_LETTER_STORE], "readonly");
      const store = transaction.objectStore(DEAD_LETTER_STORE);
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error("Failed to read dead letter queue:", err);
    return [];
  }
}

// ─── Dispatches a window-level toast event for UI rendering ──────────────────

function dispatchFailureToast(actionName: string, finalError?: string): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("offline-sync-failure", {
      detail: {
        actionName,
        finalError: finalError ?? "Max retries exceeded. Action permanently failed.",
        timestamp: Date.now(),
      },
    })
  );
}

// ─── Handle a single sync failure: increment or promote to dead letter ────────

export async function handleSyncFailure(item: QueuedAction, error?: string): Promise<void> {
  const newRetryCount = (item.retryCount || 0) + 1;

  if (newRetryCount >= MAX_RETRIES) {
    await promoteToDeadLetter(item, error);
    await removeOfflineAction(item.id);
    dispatchFailureToast(item.actionName, error);
    console.error(
      `[OfflineQueue] Action "${item.actionName}" (${item.id}) moved to dead letter after ${MAX_RETRIES} retries.`
    );
  } else {
    await updateRetryCount(item.id, newRetryCount);
    console.warn(
      `[OfflineQueue] Action "${item.actionName}" (${item.id}) failed. Retry ${newRetryCount}/${MAX_RETRIES}.`
    );
  }
}

// ─── Main sync drain: Session-aware, retry-gated, FIFO ───────────────────────

export async function syncOfflineQueue(
  handlers: Record<string, (payload: any) => Promise<{ success: boolean; error?: string }>>
): Promise<{ syncedCount: number; failedCount: number; deadLetterCount: number }> {
  if (typeof window === "undefined" || !navigator.onLine) {
    return { syncedCount: 0, failedCount: 0, deadLetterCount: 0 };
  }

  // ── 1. Validate session before attempting any sync ─────────────────────────
  const swSessionPatch = (await import("./swSessionPatch")) as any;
  const sessionValid = await swSessionPatch.refreshSessionBeforeSync();
  if (!sessionValid) {
    console.warn("[OfflineQueue] Session invalid or expired. Pausing sync until re-authentication.");
    window.dispatchEvent(
      new CustomEvent("offline-sync-session-expired", {
        detail: { message: "Your session has expired. Please re-login to sync queued actions." },
      })
    );
    return { syncedCount: 0, failedCount: 0, deadLetterCount: 0 };
  }

  // ── 2. Retrieve and sort items FIFO (oldest first) ─────────────────────────
  const actions = (await getPendingOfflineActions()).sort((a, b) => a.timestamp - b.timestamp);
  if (actions.length === 0) {
    return { syncedCount: 0, failedCount: 0, deadLetterCount: 0 };
  }

  let syncedCount = 0;
  let failedCount = 0;
  let deadLetterCount = 0;

  // ── 3. FIFO drain — each item is independent (no break on failure) ──────────
  for (const item of actions) {
    // Skip items already at max retries (will be promoted in handleSyncFailure)
    if (item.retryCount >= MAX_RETRIES) {
      await handleSyncFailure(item, "Max retries gate");
      deadLetterCount++;
      continue;
    }

    const handler = handlers[item.actionName];
    if (!handler) {
      console.warn(`[OfflineQueue] No handler for action: ${item.actionName}. Skipping.`);
      await handleSyncFailure(item, `No handler registered for "${item.actionName}"`);
      failedCount++;
      continue;
    }

    try {
      let finalPayload = item.payload;

      // Rehydrate FormData from serialized key-value pairs
      if (item.isFormData && Array.isArray(item.payload)) {
        const fd = new FormData();
        for (const entry of item.payload) {
          fd.append(entry.key, entry.value);
        }
        finalPayload = fd;
      }

      const result = await handler(finalPayload);

      if (result?.success) {
        await removeOfflineAction(item.id);
        syncedCount++;
      } else {
        const errMsg = result?.error ?? "Unknown server error";
        await handleSyncFailure(item, errMsg);
        failedCount++;
      }
    } catch (err: any) {
      // Network or unexpected error — increment retry but keep in queue
      await handleSyncFailure(item, err?.message ?? "Network error");
      failedCount++;
    }
  }

  return { syncedCount, failedCount, deadLetterCount };
}
