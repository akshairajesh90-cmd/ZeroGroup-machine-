import { setDispatchLocationWithPriority } from "../location";
import { SOURCE_PRIORITY_WEIGHT } from "@/types/locationPriority";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { logAudit } from "@/lib/auditLogger";

jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/auditLogger", () => ({
  logAudit: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

jest.mock("@/lib/prisma", () => {
  const mockTx = {
    dailyDispatch: { update: jest.fn() },
    employee: { update: jest.fn() },
    locationPing: { create: jest.fn() },
  };

  return {
    prisma: {
      employee: {
        findFirst: jest.fn(),
        update: jest.fn(),
      },
      dailyDispatch: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      locationPing: {
        create: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(mockTx)),
      _mockTx: mockTx,
    },
  };
});

describe("Single Source of Truth for Site Location & Priority Hierarchy", () => {
  const mockAdminUser = {
    user: { id: "user-admin-1", employeeId: "emp-admin-1", role: "ADMIN" },
  };
  const mockDriverUser = {
    user: { id: "user-driver-1", employeeId: "emp-driver-1", role: "DRIVER" },
  };
  const mockOperatorUser = {
    user: { id: "user-operator-1", employeeId: "emp-operator-1", role: "OPERATOR" },
  };

  const baseDispatch = {
    id: "disp-101",
    location: "Panackapalam, Poonjar",
    latitude: 9.6800,
    longitude: 76.7800,
    locationSource: "STAFF_BOOKING",
    isCentroidVerified: false,
    driverId: "emp-driver-1",
    operatorId: "emp-operator-1",
    crewAssignments: [],
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("verifies the defined priority weights order", () => {
    expect(SOURCE_PRIORITY_WEIGHT.STAFF_BOOKING).toBeLessThan(SOURCE_PRIORITY_WEIGHT.DRIVER_PIN);
    expect(SOURCE_PRIORITY_WEIGHT.DRIVER_PIN).toBeLessThan(SOURCE_PRIORITY_WEIGHT.OPERATOR_PIN);
    expect(SOURCE_PRIORITY_WEIGHT.OPERATOR_PIN).toBeLessThan(SOURCE_PRIORITY_WEIGHT.VERIFIED_CENTROID);
    expect(SOURCE_PRIORITY_WEIGHT.VERIFIED_CENTROID).toBeLessThan(SOURCE_PRIORITY_WEIGHT.STAFF_OVERRIDE);
  });

  it("allows assigned driver to update site location from STAFF_BOOKING to DRIVER_PIN", async () => {
    (auth as jest.Mock).mockResolvedValue(mockDriverUser);
    (prisma.employee.findFirst as jest.Mock).mockResolvedValue({ id: "emp-driver-1" });
    (prisma.dailyDispatch.findUnique as jest.Mock).mockResolvedValue(baseDispatch);

    const result = await setDispatchLocationWithPriority({
      dispatchId: "disp-101",
      latitude: 9.6850,
      longitude: 76.7850,
      accuracy: 12,
      source: "DRIVER_PIN",
    });

    expect(result.success).toBe(true);
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        actorId: "emp-driver-1",
        actorRole: "DRIVER",
        actionType: "UPDATE_SITE_LOCATION",
      })
    );
  });

  it("allows assigned operator to upgrade site location to OPERATOR_PIN", async () => {
    (auth as jest.Mock).mockResolvedValue(mockOperatorUser);
    (prisma.employee.findFirst as jest.Mock).mockResolvedValue({ id: "emp-operator-1" });
    (prisma.dailyDispatch.findUnique as jest.Mock).mockResolvedValue({
      ...baseDispatch,
      locationSource: "DRIVER_PIN",
    });

    const result = await setDispatchLocationWithPriority({
      dispatchId: "disp-101",
      latitude: 9.6855,
      longitude: 76.7852,
      accuracy: 8,
      source: "OPERATOR_PIN",
    });

    expect(result.success).toBe(true);
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: "UPDATE_SITE_LOCATION",
        actorRole: "OPERATOR",
      })
    );
  });

  it("prevents driver from downgrading an existing OPERATOR_PIN and logs auxiliary check-in", async () => {
    (auth as jest.Mock).mockResolvedValue(mockDriverUser);
    (prisma.employee.findFirst as jest.Mock).mockResolvedValue({ id: "emp-driver-1" });
    (prisma.dailyDispatch.findUnique as jest.Mock).mockResolvedValue({
      ...baseDispatch,
      locationSource: "OPERATOR_PIN",
    });

    const result = await setDispatchLocationWithPriority({
      dispatchId: "disp-101",
      latitude: 9.6900,
      longitude: 76.7900,
      source: "DRIVER_PIN",
    });

    expect(result.success).toBe(true);
    expect(result.message).toContain("Site location was already set by OPERATOR_PIN");
    // Site location was NOT modified
    const mockTx = (prisma as any)._mockTx;
    expect(mockTx.dailyDispatch.update).not.toHaveBeenCalled();
    // Auxiliary check-in was logged in AuditLog
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: "AUXILIARY_SITE_CHECKIN",
      })
    );
  });

  it("blocks driver and operator from overwriting a VERIFIED_CENTROID and records check-in instead", async () => {
    (auth as jest.Mock).mockResolvedValue(mockDriverUser);
    (prisma.employee.findFirst as jest.Mock).mockResolvedValue({ id: "emp-driver-1" });
    (prisma.dailyDispatch.findUnique as jest.Mock).mockResolvedValue({
      ...baseDispatch,
      isCentroidVerified: true,
      locationSource: "VERIFIED_CENTROID",
    });

    const result = await setDispatchLocationWithPriority({
      dispatchId: "disp-101",
      latitude: 9.7000,
      longitude: 76.8000,
      source: "DRIVER_PIN",
    });

    expect(result.success).toBe(true);
    expect(result.verified).toBe(true);
    expect(result.message).toContain("Site location was already confirmed by on-site crew");
    const mockTx = (prisma as any)._mockTx;
    expect(mockTx.dailyDispatch.update).not.toHaveBeenCalled();
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: "DRIVER_SITE_VERIFICATION",
      })
    );
  });

  it("blocks admin from overriding a verified centroid if reason is missing", async () => {
    (auth as jest.Mock).mockResolvedValue(mockAdminUser);
    (prisma.employee.findFirst as jest.Mock).mockResolvedValue({ id: "emp-admin-1" });
    (prisma.dailyDispatch.findUnique as jest.Mock).mockResolvedValue({
      ...baseDispatch,
      isCentroidVerified: true,
    });

    const result = await setDispatchLocationWithPriority({
      dispatchId: "disp-101",
      latitude: 9.7000,
      longitude: 76.8000,
      source: "STAFF_OVERRIDE",
      overrideReason: "",
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Please provide a reason to override");
  });

  it("allows admin/staff to override a verified centroid with a valid reason", async () => {
    (auth as jest.Mock).mockResolvedValue(mockAdminUser);
    (prisma.employee.findFirst as jest.Mock).mockResolvedValue({ id: "emp-admin-1" });
    (prisma.dailyDispatch.findUnique as jest.Mock).mockResolvedValue({
      ...baseDispatch,
      isCentroidVerified: true,
    });

    const result = await setDispatchLocationWithPriority({
      dispatchId: "disp-101",
      latitude: 9.7050,
      longitude: 76.8050,
      source: "STAFF_OVERRIDE",
      overrideReason: "Driver called from keypad phone; contractor shifted pour to upper estate lane",
    });

    expect(result.success).toBe(true);
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: "UPDATE_SITE_LOCATION",
        actorRole: "ADMIN",
        newPayload: expect.objectContaining({
          overrideReason: "Driver called from keypad phone; contractor shifted pour to upper estate lane",
        }),
      })
    );
  });

  it("rejects location update if caller is not assigned to the dispatch", async () => {
    (auth as jest.Mock).mockResolvedValue({
      user: { id: "user-stranger-1", employeeId: "emp-stranger-1", role: "DRIVER" },
    });
    (prisma.employee.findFirst as jest.Mock).mockResolvedValue({ id: "emp-stranger-1" });
    (prisma.dailyDispatch.findUnique as jest.Mock).mockResolvedValue(baseDispatch);

    const result = await setDispatchLocationWithPriority({
      dispatchId: "disp-101",
      latitude: 9.6800,
      longitude: 76.7800,
      source: "DRIVER_PIN",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBe("You are not assigned to this dispatch");
  });
});
