import { createManualAdjustment, reverseManualAdjustment } from "../adjustments";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/serverAuth";

jest.mock("@/lib/serverAuth", () => ({
  requireAuth: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    manualAdjustment: {
      create: jest.fn(),
      findUnique: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  },
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

describe("Manual Adjustments & Double-Entry Reversals", () => {
  let logSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    logSpy = jest.spyOn(console, "log").mockImplementation(() => {});
    errorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
  });

  describe("createManualAdjustment", () => {
    it("creates approved bonus adjustment with audit record", async () => {
      (requireAuth as jest.Mock).mockResolvedValue({
        employeeId: "emp-admin-1",
        role: "ADMIN",
      });
      (prisma.manualAdjustment.create as jest.Mock).mockResolvedValue({
        id: "adj-101",
        amount: 500,
        type: "BONUS",
      });
      (prisma.auditLog.create as jest.Mock).mockResolvedValue({ id: "aud-101" });

      const result = await createManualAdjustment({
        employeeId: "emp-op-1",
        amount: 500,
        type: "BONUS",
        reason: "Excellent machine cleaning and maintenance",
      });

      expect(result.success).toBe(true);
      expect(result.adjustmentId).toBe("adj-101");
      expect(prisma.manualAdjustment.create).toHaveBeenCalledTimes(1);
      expect(prisma.auditLog.create).toHaveBeenCalledTimes(1);
    });

    it("rejects non-positive amounts", async () => {
      (requireAuth as jest.Mock).mockResolvedValue({
        employeeId: "emp-admin-1",
        role: "ADMIN",
      });

      await expect(
        createManualAdjustment({
          employeeId: "emp-op-1",
          amount: -200,
          type: "PENALTY",
          reason: "Damaged hose",
        })
      ).rejects.toThrow();
    });
  });

  describe("reverseManualAdjustment", () => {
    it("throws error if adjustment to reverse does not exist", async () => {
      (requireAuth as jest.Mock).mockResolvedValue({
        employeeId: "emp-admin-1",
        role: "ADMIN",
      });
      (prisma.manualAdjustment.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(reverseManualAdjustment("non-existent-adj")).rejects.toThrow(
        "Adjustment not found."
      );
    });

    it("creates an offsetting PENALTY when reversing an original BONUS", async () => {
      (requireAuth as jest.Mock).mockResolvedValue({
        employeeId: "emp-admin-1",
        role: "ADMIN",
      });
      const originalAdj = {
        id: "adj-bonus-1",
        employeeId: "emp-op-2",
        amount: 750,
        type: "BONUS",
        reason: "Accidental double-credit",
      };
      (prisma.manualAdjustment.findUnique as jest.Mock).mockResolvedValue(originalAdj);
      (prisma.manualAdjustment.create as jest.Mock).mockResolvedValue({
        id: "adj-penalty-reversal",
        type: "PENALTY",
        amount: 750,
      });
      (prisma.auditLog.create as jest.Mock).mockResolvedValue({ id: "aud-rev-1" });

      const result = await reverseManualAdjustment("adj-bonus-1");

      expect(result.success).toBe(true);
      expect(result.reversalId).toBe("adj-penalty-reversal");

      // Verify offsetting type PENALTY was passed to create
      expect(prisma.manualAdjustment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: "PENALTY",
            amount: 750,
            employeeId: "emp-op-2",
          }),
        })
      );
    });
  });
});
