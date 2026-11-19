/**
 * Comprehensive Unit Test Suite for Offline Queue (Dexie / IndexedDB FIFO Engine)
 * Tests:
 * 1. Action queuing and FormData serialization
 * 2. Pending queue retrieval and item deletion
 * 3. FIFO drain replay ordering (oldest timestamp processed first)
 * 4. Retry capping (max 5 retries) and dead letter queue promotion
 * 5. Window toast failure event dispatching
 * 6. Session validity gating via swSessionPatch
 */

import {
  queueOfflineAction,
  getPendingOfflineActions,
  removeOfflineAction,
  handleSyncFailure,
  getDeadLetterActions,
  syncOfflineQueue,
  QueuedAction,
} from "../offlineQueue";

// Mock swSessionPatch
jest.mock("../swSessionPatch", () => ({
  refreshSessionBeforeSync: jest.fn(),
  registerSessionCacheRoutes: jest.fn(),
}));

import { refreshSessionBeforeSync } from "../swSessionPatch";

describe("Offline Queue & FIFO Replay Engine", () => {
  // In-memory IndexedDB simulation
  let stores: Record<string, Map<string, any>> = {};

  beforeEach(() => {
    stores = {
      offline_actions_queue: new Map<string, any>(),
      dead_letter_queue: new Map<string, any>(),
    };

    (refreshSessionBeforeSync as jest.Mock).mockResolvedValue(true);

    const mockDB = {
      objectStoreNames: {
        contains: (name: string) => name in stores,
      },
      createObjectStore: (name: string) => {
        if (!stores[name]) stores[name] = new Map();
        return {};
      },
      transaction: (storeNames: string[], mode: string) => {
        const storeName = storeNames[0];
        return {
          objectStore: () => ({
            add: (item: any) => {
              const req: any = {};
              setTimeout(() => {
                stores[storeName].set(item.id, item);
                if (req.onsuccess) req.onsuccess();
              }, 0);
              return req;
            },
            get: (id: string) => {
              const req: any = {};
              setTimeout(() => {
                req.result = stores[storeName].get(id);
                if (req.onsuccess) req.onsuccess();
              }, 0);
              return req;
            },
            getAll: () => {
              const req: any = {};
              setTimeout(() => {
                req.result = Array.from(stores[storeName].values());
                if (req.onsuccess) req.onsuccess();
              }, 0);
              return req;
            },
            put: (item: any) => {
              const req: any = {};
              setTimeout(() => {
                stores[storeName].set(item.id, item);
                if (req.onsuccess) req.onsuccess();
              }, 0);
              return req;
            },
            delete: (id: string) => {
              const req: any = {};
              setTimeout(() => {
                stores[storeName].delete(id);
                if (req.onsuccess) req.onsuccess();
              }, 0);
              return req;
            },
          }),
        };
      },
    };

    const mockIndexedDB = {
      open: (dbName: string, version: number) => {
        const req: any = {};
        setTimeout(() => {
          if (req.onupgradeneeded) {
            req.onupgradeneeded({
              target: { result: mockDB },
            });
          }
          req.result = mockDB;
          if (req.onsuccess) req.onsuccess();
        }, 0);
        return req;
      },
    };

    // Attach to global window
    (global as any).window = {
      indexedDB: mockIndexedDB,
      dispatchEvent: jest.fn(),
    };

    (global as any).navigator = {
      onLine: true,
    };

    (global as any).CustomEvent = class CustomEvent {
      type: string;
      detail: any;
      constructor(type: string, options: any) {
        this.type = type;
        this.detail = options?.detail;
      }
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("queueOfflineAction queues a standard action and assigns unique id and timestamp", async () => {
    const actionId = await queueOfflineAction("UPDATE_DISPATCH_STATUS", {
      dispatchId: "disp_123",
      status: "DELIVERED",
    });

    expect(actionId).toMatch(/^action_\d+_/);

    const pending = await getPendingOfflineActions();
    expect(pending.length).toBe(1);
    expect(pending[0].actionName).toBe("UPDATE_DISPATCH_STATUS");
    expect(pending[0].payload.dispatchId).toBe("disp_123");
    expect(pending[0].retryCount).toBe(0);
    expect(pending[0].isFormData).toBe(false);
  });

  test("queueOfflineAction serializes FormData objects into key-value entries", async () => {
    // Mock FormData
    class MockFormData {
      private entries: Array<{ key: string; value: any }> = [];
      append(key: string, value: any) {
        this.entries.push({ key, value });
      }
      forEach(cb: (val: any, key: string) => void) {
        this.entries.forEach((e) => cb(e.value, e.key));
      }
    }
    (global as any).FormData = MockFormData;

    const fd = new MockFormData();
    fd.append("receipt", "data:image/png;base64,123");
    fd.append("amount", "450");

    const actionId = await queueOfflineAction("CREATE_EXPENSE", fd);
    const pending = await getPendingOfflineActions();

    expect(pending.length).toBe(1);
    expect(pending[0].id).toBe(actionId);
    expect(pending[0].isFormData).toBe(true);
    expect(Array.isArray(pending[0].payload)).toBe(true);
    expect(pending[0].payload).toEqual([
      { key: "receipt", value: "data:image/png;base64,123" },
      { key: "amount", value: "450" },
    ]);
  });

  test("removeOfflineAction successfully deletes an action from the pending store", async () => {
    const actionId = await queueOfflineAction("TEST_ACTION", { foo: "bar" });
    let pending = await getPendingOfflineActions();
    expect(pending.length).toBe(1);

    await removeOfflineAction(actionId);
    pending = await getPendingOfflineActions();
    expect(pending.length).toBe(0);
  });

  test("handleSyncFailure increments retryCount up to MAX_RETRIES (5)", async () => {
    const actionId = await queueOfflineAction("TEST_RETRY", { step: 1 });
    let pending = await getPendingOfflineActions();
    const item = pending[0];

    // Failure 1
    await handleSyncFailure(item, "Network glitch");
    pending = await getPendingOfflineActions();
    expect(pending[0].retryCount).toBe(1);

    // Failures 2, 3, 4
    await handleSyncFailure(pending[0], "Timeout");
    await handleSyncFailure((await getPendingOfflineActions())[0], "502 Bad Gateway");
    await handleSyncFailure((await getPendingOfflineActions())[0], "503 Unavailable");

    pending = await getPendingOfflineActions();
    expect(pending[0].retryCount).toBe(4);
  });

  test("handleSyncFailure promotes to Dead Letter Queue when reaching 5 retries", async () => {
    const actionId = await queueOfflineAction("FAIL_PERMANENT", { key: "val" });
    const item: QueuedAction = (await getPendingOfflineActions())[0];
    item.retryCount = 4; // next failure will be 5th

    await handleSyncFailure(item, "Database locked");

    // Must be removed from pending queue
    const pending = await getPendingOfflineActions();
    expect(pending.length).toBe(0);

    // Must appear in dead letter queue
    const deadLetters = await getDeadLetterActions();
    expect(deadLetters.length).toBe(1);
    expect(deadLetters[0].id).toBe(actionId);
    expect(deadLetters[0].actionName).toBe("FAIL_PERMANENT");
    expect(deadLetters[0].finalError).toBe("Database locked");

    // Must dispatch offline-sync-failure CustomEvent
    expect(window.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "offline-sync-failure",
        detail: expect.objectContaining({
          actionName: "FAIL_PERMANENT",
          finalError: "Database locked",
        }),
      })
    );
  });

  test("syncOfflineQueue aborts drain if session validity check fails", async () => {
    (refreshSessionBeforeSync as jest.Mock).mockResolvedValue(false);

    await queueOfflineAction("ACTION_1", { num: 1 });
    const handlers = {
      ACTION_1: jest.fn().mockResolvedValue({ success: true }),
    };

    const res = await syncOfflineQueue(handlers);
    expect(res).toEqual({ syncedCount: 0, failedCount: 0, deadLetterCount: 0 });
    expect(handlers.ACTION_1).not.toHaveBeenCalled();
    expect(window.dispatchEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "offline-sync-session-expired",
      })
    );
  });

  test("syncOfflineQueue replays actions in strict FIFO order (oldest timestamp first)", async () => {
    const callOrder: string[] = [];

    // Inject 3 actions with staggered timestamps
    const db = stores.offline_actions_queue;
    db.set("act_2", {
      id: "act_2",
      actionName: "ORDERED_OP",
      payload: { order: 2 },
      timestamp: 2000,
      retryCount: 0,
    });
    db.set("act_1", {
      id: "act_1",
      actionName: "ORDERED_OP",
      payload: { order: 1 },
      timestamp: 1000,
    });
    db.set("act_3", {
      id: "act_3",
      actionName: "ORDERED_OP",
      payload: { order: 3 },
      timestamp: 3000,
      retryCount: 0,
    });

    const handlers = {
      ORDERED_OP: jest.fn().mockImplementation(async (payload) => {
        callOrder.push(`op_${payload.order}`);
        return { success: true };
      }),
    };

    const res = await syncOfflineQueue(handlers);
    expect(res.syncedCount).toBe(3);
    expect(callOrder).toEqual(["op_1", "op_2", "op_3"]);

    // Pending queue should be empty after drain
    const pending = await getPendingOfflineActions();
    expect(pending.length).toBe(0);
  });

  test("syncOfflineQueue continues drain even if an individual handler fails", async () => {
    await queueOfflineAction("ACTION_FAIL", { id: 1 });
    await queueOfflineAction("ACTION_SUCCESS", { id: 2 });

    const handlers = {
      ACTION_FAIL: jest.fn().mockResolvedValue({ success: false, error: "Validation error" }),
      ACTION_SUCCESS: jest.fn().mockResolvedValue({ success: true }),
    };

    const res = await syncOfflineQueue(handlers);
    expect(res.syncedCount).toBe(1);
    expect(res.failedCount).toBe(1);

    const pending = await getPendingOfflineActions();
    expect(pending.length).toBe(1);
    expect(pending[0].actionName).toBe("ACTION_FAIL");
    expect(pending[0].retryCount).toBe(1);
  });
});
