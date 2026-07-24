"use client";

// ============================================================================
// ZERO GROUP — LOCAL-FIRST INDEXEDDB OFFLINE QUEUE (MODULE A PWA RESILIENCE)
// ============================================================================

const DB_NAME = "zero_group_offline_db";
const STORE_NAME = "offline_actions_queue";
const DB_VERSION = 1;

export interface QueuedAction {
  id: string;
  actionName: string; // e.g. "UPDATE_DISPATCH_STATUS", "REPORT_INCIDENT", "CREATE_EXPENSE"
  payload: any;
  timestamp: number;
  retryCount: number;
}

/**
 * Open or initialize IndexedDB store
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === "undefined" || !window.indexedDB) {
      return reject(new Error("IndexedDB not supported in this browser/environment."));
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: "id" });
      }
    };
  });
}

/**
 * Queue an action locally when offline or when a network request fails on site
 */
export async function queueOfflineAction(actionName: string, payload: any): Promise<string> {
  try {
    const db = await openDB();
    const id = `action_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const queuedItem: QueuedAction = {
      id,
      actionName,
      payload,
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

/**
 * Retrieve all currently pending queued items
 */
export async function getPendingOfflineActions(): Promise<QueuedAction[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], "readonly");
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const results = (request.result as QueuedAction[]) || [];
        resolve(results.sort((a, b) => a.timestamp - b.timestamp));
      };
      request.onerror = () => reject(request.error);
    });
  } catch (err) {
    console.error("Failed to read offline queue:", err);
    return [];
  }
}

/**
 * Remove a specific item from the queue after successful sync to Postgres
 */
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

/**
 * Sync all pending queued items using provided Server Action handler callbacks
 */
export async function syncOfflineQueue(
  handlers: Record<string, (payload: any) => Promise<{ success: boolean; error?: string }>>
): Promise<{ syncedCount: number; failedCount: number }> {
  if (typeof window === "undefined" || !navigator.onLine) {
    return { syncedCount: 0, failedCount: 0 };
  }

  const actions = await getPendingOfflineActions();
  if (actions.length === 0) {
    return { syncedCount: 0, failedCount: 0 };
  }

  let syncedCount = 0;
  let failedCount = 0;

  for (const item of actions) {
    const handler = handlers[item.actionName];
    if (!handler) {
      console.warn(`No sync handler defined for action: ${item.actionName}`);
      failedCount++;
      continue;
    }

    try {
      const result = await handler(item.payload);
      if (result && result.success) {
        await removeOfflineAction(item.id);
        syncedCount++;
      } else {
        console.warn(`Sync failed for action ${item.id}:`, result?.error);
        failedCount++;
      }
    } catch (err) {
      console.error(`Network or server error syncing action ${item.id}:`, err);
      failedCount++;
    }
  }

  return { syncedCount, failedCount };
}
