import { successResult, errorResult, safeAction, ActionResult } from "../action-result";

describe("ActionResult Utility", () => {
  describe("successResult", () => {
    it("creates a standardized success result with data", () => {
      const data = { id: "mach-1", name: "10/7 Mixer" };
      const res = successResult(data);

      expect(res.success).toBe(true);
      expect(res.data).toEqual(data);
      expect((res as any).error).toBeUndefined();
    });

    it("handles void or undefined data", () => {
      const res = successResult(undefined);
      expect(res.success).toBe(true);
      expect(res.data).toBeUndefined();
    });
  });

  describe("errorResult", () => {
    it("creates a standardized error result from string", () => {
      const res = errorResult("Machine not available", "RESOURCE_UNAVAILABLE");

      expect(res.success).toBe(false);
      expect(res.error).toBe("Machine not available");
      expect(res.code).toBe("RESOURCE_UNAVAILABLE");
      expect((res as any).data).toBeUndefined();
    });

    it("creates an error result from Error object", () => {
      const error = new Error("Database timeout");
      const res = errorResult(error);

      expect(res.success).toBe(false);
      expect(res.error).toBe("Database timeout");
    });
  });

  describe("safeAction wrapper", () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it("wraps resolved promise into successResult", async () => {
      const fn = async () => ({ status: "OK", count: 42 });
      const result = await safeAction(fn);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual({ status: "OK", count: 42 });
      }
    });

    it("catches thrown Error and returns errorResult", async () => {
      const fn = async () => {
        throw new Error("Unauthorized machine allocation");
      };
      const result = await safeAction(fn);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Unauthorized machine allocation");
      }
    });

    it("catches non-Error thrown values and uses fallback message", async () => {
      const fn = async () => {
        throw "string error";
      };
      const result = await safeAction(fn, "Custom fallback error");

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe("Custom fallback error");
      }
    });
  });
});
