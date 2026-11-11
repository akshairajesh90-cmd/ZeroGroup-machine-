import { assignCrewToDispatch, removeCrewFromDispatch } from "../allocation";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/serverAuth";
import { logAudit } from "@/lib/auditLogger";

jest.mock("@/lib/serverAuth", () => ({
  requireAuth: jest.fn(),
}));

jest.mock("@/lib/auditLogger", () => ({
  logAudit: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    dailyDispatch: {
      findUnique: jest.fn(),
    },
    dispatchAssignment: {
      findUnique: jest.fn(),
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    dispatchLabor: {
      deleteMany: jest.fn(),
    },
    employee: {
      findUnique: jest.fn(),
    },
  },
}));

describe("Crew Allocation Server Action Suite", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("assignCrewToDispatch", () => {
    it("assigns crew member with calculated lift operator wage for multi-floor job", async () => {
      (requireAuth as jest.Mock).mockResolvedValue({
        employeeId: "emp-staff-1",
        role: "STAFF",
      });

      // Dispatch has 3 floors
      (prisma.dailyDispatch.findUnique as jest.Mock).mockResolvedValue({
        id: "disp-1",
        liftFloors: 3,
      });

      (prisma.dispatchAssignment.findUnique as jest.Mock).mockResolvedValue(null);

      // Employee is a Lift Operator with base wage 1000
      (prisma.employee.findUnique as jest.Mock).mockResolvedValue({
        id: "emp-lift-1",
        defaultCrewRole: "LIFT_OPERATOR",
        baseDailyWage: 1000,
        roleRates: [],
      });

      (prisma.dispatchAssignment.create as jest.Mock).mockResolvedValue({ id: "asgn-1" });

      const result = await assignCrewToDispatch("disp-1", ["emp-lift-1"]);

      expect(result.success).toBe(true);
      expect(prisma.dispatchAssignment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            dispatchId: "disp-1",
            employeeId: "emp-lift-1",
            assignedRole: "LIFT_OPERATOR",
            // Base 1000 + 2 extra floors * 100 = 1200
            lockedWageRate: 1200,
          }),
        })
      );
      expect(logAudit).toHaveBeenCalledTimes(1);
    });

    it("returns error message if authorization fails", async () => {
      (requireAuth as jest.Mock).mockRejectedValue(new Error("Unauthorized"));

      const result = await assignCrewToDispatch("disp-1", ["emp-1"]);
      expect(result.success).toBe(false);
      expect(result.error).toBe("Unauthorized");
    });
  });

  describe("removeCrewFromDispatch", () => {
    it("deletes assignment and writes audit log", async () => {
      (requireAuth as jest.Mock).mockResolvedValue({
        employeeId: "emp-staff-1",
        role: "STAFF",
      });

      (prisma.dispatchAssignment.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });
      (prisma.dispatchLabor.deleteMany as jest.Mock).mockResolvedValue({ count: 1 });

      const result = await removeCrewFromDispatch("disp-1", "emp-1");

      expect(result.success).toBe(true);
      expect(prisma.dispatchAssignment.deleteMany).toHaveBeenCalledWith({
        where: { dispatchId: "disp-1", employeeId: "emp-1" },
      });
      expect(logAudit).toHaveBeenCalledTimes(1);
    });
  });
});
