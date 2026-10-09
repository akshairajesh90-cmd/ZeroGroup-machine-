/**
 * ═══════════════════════════════════════════════════════════════
 * TEST TYPE 2 — INTEGRATION TESTING
 * ═══════════════════════════════════════════════════════════════
 * What: Tests how MULTIPLE modules/functions work TOGETHER.
 *       Unlike unit tests, we let real internal wiring run,
 *       but we mock EXTERNAL dependencies (DB, network, browser APIs).
 * Why:  A unit can pass alone but fail when composed with another.
 * Tool: Jest with manual mocks
 * Target: syncOfflineQueue() + handler callback integration
 *         (from offlineQueue.ts logic — pure JS, no IndexedDB needed)
 * ═══════════════════════════════════════════════════════════════
 */

// ─── We test the LOGIC of sync coordination without IndexedDB ────────────────
// We replicate the syncOfflineQueue algorithm in a testable pure-function form
// (the real module uses IndexedDB which is browser-only).

// Pure version of the sync coordination logic (extracted from offlineQueue.ts)
async function runSyncCoordinator(
  actions: Array<{
    id: string;
    actionName: string;
    payload: any;
    isFormData?: boolean;
    retryCount: number;
  }>,
  handlers: Record<string, (payload: any) => Promise<{ success: boolean; error?: string }>>
): Promise<{ syncedCount: number; failedCount: number; syncedIds: string[] }> {
  let syncedCount = 0;
  let failedCount = 0;
  const syncedIds: string[] = [];

  for (const item of actions) {
    const handler = handlers[item.actionName];
    if (!handler) {
      failedCount++;
      continue;
    }
    try {
      const result = await handler(item.payload);
      if (result && result.success) {
        syncedIds.push(item.id);
        syncedCount++;
      } else {
        failedCount++;
      }
    } catch {
      failedCount++;
    }
  }
  return { syncedCount, failedCount, syncedIds };
}

// ─── INTEGRATION TESTS ────────────────────────────────────────────────────────

describe("[INTEGRATION] Offline Queue Sync Coordinator", () => {

  // Mock server-action handlers (simulate network calls)
  const mockUpdateDispatch = jest.fn();
  const mockReportIncident = jest.fn();
  const mockCreateExpense = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("All actions succeed → syncedCount = total, failedCount = 0", async () => {
    mockUpdateDispatch.mockResolvedValue({ success: true });
    mockReportIncident.mockResolvedValue({ success: true });

    const actions = [
      { id: "a1", actionName: "UPDATE_DISPATCH_STATUS", payload: { dispatchId: "d1", status: "COMPLETE" }, retryCount: 0 },
      { id: "a2", actionName: "REPORT_INCIDENT",        payload: { machineId: "m1", note: "flat tyre" }, retryCount: 0 },
    ];

    const handlers = {
      UPDATE_DISPATCH_STATUS: mockUpdateDispatch,
      REPORT_INCIDENT: mockReportIncident,
    };

    const result = await runSyncCoordinator(actions, handlers);
    expect(result.syncedCount).toBe(2);
    expect(result.failedCount).toBe(0);
    expect(result.syncedIds).toEqual(["a1", "a2"]);
  });

  test("One handler fails → that action counted as failed, others still sync", async () => {
    mockUpdateDispatch.mockResolvedValue({ success: true });
    mockReportIncident.mockResolvedValue({ success: false, error: "Server error" });

    const actions = [
      { id: "a1", actionName: "UPDATE_DISPATCH_STATUS", payload: {}, retryCount: 0 },
      { id: "a2", actionName: "REPORT_INCIDENT",        payload: {}, retryCount: 0 },
    ];

    const handlers = {
      UPDATE_DISPATCH_STATUS: mockUpdateDispatch,
      REPORT_INCIDENT: mockReportIncident,
    };

    const result = await runSyncCoordinator(actions, handlers);
    expect(result.syncedCount).toBe(1);
    expect(result.failedCount).toBe(1);
    expect(result.syncedIds).toContain("a1");
    expect(result.syncedIds).not.toContain("a2");
  });

  test("No handler registered for an action → counted as failed (no crash)", async () => {
    const actions = [
      { id: "a1", actionName: "UNKNOWN_ACTION", payload: {}, retryCount: 0 },
    ];

    const result = await runSyncCoordinator(actions, {});
    expect(result.syncedCount).toBe(0);
    expect(result.failedCount).toBe(1);
  });

  test("Handler throws exception → caught, counted as failed, does not abort other syncs", async () => {
    mockUpdateDispatch.mockRejectedValue(new Error("Network timeout"));
    mockCreateExpense.mockResolvedValue({ success: true });

    const actions = [
      { id: "a1", actionName: "UPDATE_DISPATCH_STATUS", payload: {}, retryCount: 0 },
      { id: "a2", actionName: "CREATE_EXPENSE",         payload: { amount: 500 }, retryCount: 0 },
    ];

    const handlers = {
      UPDATE_DISPATCH_STATUS: mockUpdateDispatch,
      CREATE_EXPENSE: mockCreateExpense,
    };

    const result = await runSyncCoordinator(actions, handlers);
    expect(result.syncedCount).toBe(1);
    expect(result.failedCount).toBe(1);
    expect(result.syncedIds).toContain("a2");
  });

  test("Empty action queue → returns 0/0 immediately (no handler calls)", async () => {
    const result = await runSyncCoordinator([], {
      UPDATE_DISPATCH_STATUS: mockUpdateDispatch,
    });
    expect(result.syncedCount).toBe(0);
    expect(result.failedCount).toBe(0);
    expect(mockUpdateDispatch).not.toHaveBeenCalled();
  });

  test("Each handler is called with the correct payload from the queue", async () => {
    mockUpdateDispatch.mockResolvedValue({ success: true });

    const payload = { dispatchId: "disp_999", status: "IN_PROGRESS" };
    const actions = [
      { id: "a1", actionName: "UPDATE_DISPATCH_STATUS", payload, retryCount: 0 },
    ];

    await runSyncCoordinator(actions, { UPDATE_DISPATCH_STATUS: mockUpdateDispatch });

    expect(mockUpdateDispatch).toHaveBeenCalledTimes(1);
    expect(mockUpdateDispatch).toHaveBeenCalledWith(payload);
  });

  test("Multiple retries of same action type all go to same handler", async () => {
    mockUpdateDispatch.mockResolvedValue({ success: true });

    const actions = [
      { id: "r1", actionName: "UPDATE_DISPATCH_STATUS", payload: { dispatchId: "d1" }, retryCount: 2 },
      { id: "r2", actionName: "UPDATE_DISPATCH_STATUS", payload: { dispatchId: "d2" }, retryCount: 1 },
    ];

    const result = await runSyncCoordinator(actions, { UPDATE_DISPATCH_STATUS: mockUpdateDispatch });

    expect(mockUpdateDispatch).toHaveBeenCalledTimes(2);
    expect(result.syncedCount).toBe(2);
  });

  test("Sync is sequential — actions are processed in order (FIFO)", async () => {
    const callOrder: string[] = [];
    const orderedHandler = jest.fn(async (payload: any) => {
      callOrder.push(payload.id);
      return { success: true };
    });

    const actions = [
      { id: "a1", actionName: "ACTION", payload: { id: "first" }, retryCount: 0 },
      { id: "a2", actionName: "ACTION", payload: { id: "second" }, retryCount: 0 },
      { id: "a3", actionName: "ACTION", payload: { id: "third" }, retryCount: 0 },
    ];

    await runSyncCoordinator(actions, { ACTION: orderedHandler });
    expect(callOrder).toEqual(["first", "second", "third"]);
  });

});
