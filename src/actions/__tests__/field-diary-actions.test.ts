import { syncFieldDiaryBatch, syncFuelLogBatch } from "../field-diary-actions";
import { prisma } from "@/lib/prisma";

jest.mock("@/lib/prisma", () => ({
  prisma: {
    fieldDiaryLog: {
      upsert: jest.fn(),
    },
    fuelLog: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

describe("Field Diary & Fuel Log Offline Sync Actions", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("syncFieldDiaryBatch", () => {
    it("upserts field diary entries idempotently", async () => {
      (prisma.fieldDiaryLog.upsert as jest.Mock).mockResolvedValue({ id: "fd-1" });

      const entries = [
        {
          clientId: "client-uuid-1",
          dispatchId: "disp-101",
          loggedByLeaderId: "emp-lead-1",
          date: "2026-03-12",
          notes: "Concrete slab pour finished on schedule",
          internalHelperCount: 2,
          arrivalTime: "2026-03-12T07:30:00Z",
          departureTime: "2026-03-12T16:00:00Z",
        },
      ];

      const result = await syncFieldDiaryBatch(entries);

      expect(result.synced).toBe(1);
      expect(result.skipped).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(prisma.fieldDiaryLog.upsert).toHaveBeenCalledTimes(1);
    });

    it("captures and returns database errors without failing the entire batch", async () => {
      (prisma.fieldDiaryLog.upsert as jest.Mock).mockRejectedValue(
        new Error("Connection timeout")
      );

      const entries = [
        {
          clientId: "client-uuid-fail",
          dispatchId: "disp-101",
          date: "2026-03-12",
        },
      ];

      const result = await syncFieldDiaryBatch(entries);

      expect(result.synced).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain("Connection timeout");
    });
  });

  describe("syncFuelLogBatch", () => {
    it("skips entries that have already been synced using clientId idempotency key", async () => {
      (prisma.fuelLog.findUnique as jest.Mock).mockResolvedValue({
        id: "client-fuel-uuid-already-synced",
      });

      const entries = [
        {
          clientId: "client-fuel-uuid-already-synced",
          machineId: "mach-10-7",
          driverId: "emp-drv-1",
          liters: 25,
          totalCost: 2450,
          date: "2026-03-12",
        },
      ];

      const result = await syncFuelLogBatch(entries);

      expect(result.synced).toBe(0);
      expect(result.skipped).toBe(1);
      expect(prisma.fuelLog.create).not.toHaveBeenCalled();
    });

    it("creates fuel log for new offline queue entries", async () => {
      (prisma.fuelLog.findUnique as jest.Mock).mockResolvedValue(null);
      (prisma.fuelLog.create as jest.Mock).mockResolvedValue({ id: "client-fuel-uuid-new" });

      const entries = [
        {
          clientId: "client-fuel-uuid-new",
          vehicleId: "veh-flatbed-1",
          driverId: "emp-drv-1",
          liters: 45,
          totalCost: 4400,
          date: "2026-03-12",
        },
      ];

      const result = await syncFuelLogBatch(entries);

      expect(result.synced).toBe(1);
      expect(result.skipped).toBe(0);
      expect(prisma.fuelLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            id: "client-fuel-uuid-new",
            liters: 45,
            totalCost: 4400,
          }),
        })
      );
    });
  });
});
