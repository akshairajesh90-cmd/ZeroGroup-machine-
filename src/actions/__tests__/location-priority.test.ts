import { setDispatchLocationWithPriority, revertToPreviousBest } from "../location";
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
    dailyDispatch: { update: jest.fn(), findUnique: jest.fn() },
    employee: { update: jest.fn() },
    locationPing: { create: jest.fn() },
    dispatchLocationCandidate: {
      create: jest.fn().mockResolvedValue({ id: "cand-1" }),
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
      delete: jest.fn().mockResolvedValue({ id: "cand-1" }),
    },
    $queryRawUnsafe: jest.fn().mockResolvedValue([]),
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
      dispatchLocationCandidate: {
        create: jest.fn().mockResolvedValue({ id: "cand-1" }),
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        delete: jest.fn().mockResolvedValue({ id: "cand-1" }),
      },
      $transaction: jest.fn(async (callback) => callback(mockTx)),
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
  const mockDriverUser2 = {
    user: { id: "user-driver-2", employeeId: "emp-driver-2", role: "DRIVER" },
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
    locationPriority: 1,
    locationUpdatedById: "emp-staff-1",
    isCentroidVerified: false,
    driverId: "emp-driver-1",
    operatorId: "emp-operator-1",
    crewAssignments: [
      { employeeId: "emp-driver-2", assignedRole: "DRIVER" },
    ],
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

  it("allows assigned driver to update site location from STAFF_BOOKING to DRIVER_PIN and records candidate", async () => {
    (auth as jest.Mock).mockResolvedValue(mockDriverUser);
    (prisma.employee.findFirst as jest.Mock).mockResolvedValue({ id: "emp-driver-1" });
    (prisma.dailyDispatch.findUnique as jest.Mock).mockResolvedValue(baseDispatch);
    const mockTx = (prisma as any)._mockTx;
    mockTx.dailyDispatch.findUnique.mockResolvedValue(baseDispatch);

    const result = await setDispatchLocationWithPriority({
      dispatchId: "disp-101",
      latitude: 9.6850,
      longitude: 76.7850,
      accuracy: 12,
      source: "DRIVER_PIN",
    });

    expect(result.success).toBe(true);
    expect(result.winner).toBe(true);
    expect(mockTx.dispatchLocationCandidate.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          dispatchId: "disp-101",
          source: "DRIVER_PIN",
          weight: 2,
          latitude: 9.6850,
          longitude: 76.7850,
          capturedById: "emp-driver-1",
        }),
      })
    );
    expect(mockTx.dailyDispatch.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "disp-101" },
        data: expect.objectContaining({
          locationPriority: 2,
          locationSource: "DRIVER_PIN",
          locationUpdatedById: "emp-driver-1",
        }),
      })
    );
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
    const existingDispatch = {
      ...baseDispatch,
      locationSource: "DRIVER_PIN",
      locationPriority: 2,
      locationUpdatedById: "emp-driver-1",
    };
    (prisma.dailyDispatch.findUnique as jest.Mock).mockResolvedValue(existingDispatch);
    const mockTx = (prisma as any)._mockTx;
    mockTx.dailyDispatch.findUnique.mockResolvedValue(existingDispatch);

    const result = await setDispatchLocationWithPriority({
      dispatchId: "disp-101",
      latitude: 9.6855,
      longitude: 76.7852,
      accuracy: 8,
      source: "OPERATOR_PIN",
    });

    expect(result.success).toBe(true);
    expect(result.winner).toBe(true);
    expect(mockTx.dailyDispatch.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          locationPriority: 3,
          locationSource: "OPERATOR_PIN",
          locationUpdatedById: "emp-operator-1",
        }),
      })
    );
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: "UPDATE_SITE_LOCATION",
        actorRole: "OPERATOR",
      })
    );
  });

  it("prevents driver from downgrading an existing OPERATOR_PIN and logs auxiliary candidate and check-in", async () => {
    (auth as jest.Mock).mockResolvedValue(mockDriverUser);
    (prisma.employee.findFirst as jest.Mock).mockResolvedValue({ id: "emp-driver-1" });
    const operatorPinnedDispatch = {
      ...baseDispatch,
      locationSource: "OPERATOR_PIN",
      locationPriority: 3,
      locationUpdatedById: "emp-operator-1",
    };
    (prisma.dailyDispatch.findUnique as jest.Mock).mockResolvedValue(operatorPinnedDispatch);
    const mockTx = (prisma as any)._mockTx;
    mockTx.dailyDispatch.findUnique.mockResolvedValue(operatorPinnedDispatch);

    const result = await setDispatchLocationWithPriority({
      dispatchId: "disp-101",
      latitude: 9.6900,
      longitude: 76.7900,
      source: "DRIVER_PIN",
    });

    expect(result.success).toBe(true);
    expect(result.winner).toBe(false);
    expect(result.message).toContain("Site location was already set by OPERATOR_PIN");
    // Candidate was still recorded
    expect(mockTx.dispatchLocationCandidate.create).toHaveBeenCalled();
    // DailyDispatch was NOT updated
    expect(mockTx.dailyDispatch.update).not.toHaveBeenCalled();
    expect(logAudit).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: "AUXILIARY_SITE_CHECKIN",
      })
    );
  });

  describe("Equal Weight Pin Semantics", () => {
    it("allows the same driver to re-pin at equal weight (e.g. driving closer to site)", async () => {
      (auth as jest.Mock).mockResolvedValue(mockDriverUser);
      (prisma.employee.findFirst as jest.Mock).mockResolvedValue({ id: "emp-driver-1" });
      const driverPinnedDispatch = {
        ...baseDispatch,
        locationSource: "DRIVER_PIN",
        locationPriority: 2,
        locationUpdatedById: "emp-driver-1",
      };
      (prisma.dailyDispatch.findUnique as jest.Mock).mockResolvedValue(driverPinnedDispatch);
      const mockTx = (prisma as any)._mockTx;
      mockTx.dailyDispatch.findUnique.mockResolvedValue(driverPinnedDispatch);

      const result = await setDispatchLocationWithPriority({
        dispatchId: "disp-101",
        latitude: 9.6860,
        longitude: 76.7860,
        source: "DRIVER_PIN",
      });

      expect(result.success).toBe(true);
      expect(result.winner).toBe(true);
      expect(mockTx.dailyDispatch.update).toHaveBeenCalled();
    });

    it("rejects different actor from overwriting an equal weight pin", async () => {
      (auth as jest.Mock).mockResolvedValue(mockDriverUser2);
      (prisma.employee.findFirst as jest.Mock).mockResolvedValue({ id: "emp-driver-2" });
      const driver1PinnedDispatch = {
        ...baseDispatch,
        locationSource: "DRIVER_PIN",
        locationPriority: 2,
        locationUpdatedById: "emp-driver-1",
      };
      (prisma.dailyDispatch.findUnique as jest.Mock).mockResolvedValue(driver1PinnedDispatch);
      const mockTx = (prisma as any)._mockTx;
      mockTx.dailyDispatch.findUnique.mockResolvedValue(driver1PinnedDispatch);

      const result = await setDispatchLocationWithPriority({
        dispatchId: "disp-101",
        latitude: 9.6870,
        longitude: 76.7870,
        source: "DRIVER_PIN",
      });

      expect(result.success).toBe(false);
      expect(result.rejected).toBe(true);
      expect(result.message).toContain("already set by another team member");
      expect(mockTx.dailyDispatch.update).not.toHaveBeenCalled();
      expect(mockTx.dispatchLocationCandidate.create).toHaveBeenCalled();
      expect(logAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: "AUXILIARY_SITE_CHECKIN",
          newPayload: expect.objectContaining({
            note: expect.stringContaining("Equal-priority pin from different actor rejected"),
          }),
        })
      );
    });
  });

  describe("Verified Centroid Protection & Discrepancy Flagging", () => {
    it("blocks driver from overwriting a VERIFIED_CENTROID and records check-in instead", async () => {
      (auth as jest.Mock).mockResolvedValue(mockDriverUser);
      (prisma.employee.findFirst as jest.Mock).mockResolvedValue({ id: "emp-driver-1" });
      (prisma.dailyDispatch.findUnique as jest.Mock).mockResolvedValue({
        ...baseDispatch,
        isCentroidVerified: true,
        locationSource: "VERIFIED_CENTROID",
        locationPriority: 4,
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

    it("allows admin to override verified centroid with reason; flags review if > 300m discrepancy", async () => {
      (auth as jest.Mock).mockResolvedValue(mockAdminUser);
      (prisma.employee.findFirst as jest.Mock).mockResolvedValue({ id: "emp-admin-1" });
      const verifiedDispatch = {
        ...baseDispatch,
        isCentroidVerified: true,
        latitude: 9.6800,
        longitude: 76.7800,
        locationSource: "VERIFIED_CENTROID",
        locationPriority: 4,
      };
      (prisma.dailyDispatch.findUnique as jest.Mock).mockResolvedValue(verifiedDispatch);
      const mockTx = (prisma as any)._mockTx;
      mockTx.dailyDispatch.findUnique.mockResolvedValue(verifiedDispatch);
      mockTx.dispatchLocationCandidate.findFirst.mockResolvedValue({
        source: "VERIFIED_CENTROID",
        latitude: 9.6800,
        longitude: 76.7800,
      });

      // Shift by ~500m (0.004 degrees lat is approx 440m)
      const result = await setDispatchLocationWithPriority({
        dispatchId: "disp-101",
        latitude: 9.6845,
        longitude: 76.7800,
        source: "STAFF_OVERRIDE",
        overrideReason: "Customer requested entry gate on rubber estate upper boundary",
      });

      expect(result.success).toBe(true);
      expect(result.winner).toBe(true);
      // Discrepancy flag raised on DailyDispatch
      expect(mockTx.dailyDispatch.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            isFlagged: true,
            conflictReport: expect.stringContaining("Staff override coordinates differ by"),
          }),
        })
      );
      // Discrepancy audit log
      expect(logAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: "LOCATION_DISCREPANCY_FLAG",
          newPayload: expect.objectContaining({
            note: expect.stringContaining("Flagged for review"),
          }),
        })
      );
    });
  });

  describe("Revert to Previous Best Candidate (revertToPreviousBest)", () => {
    it("allows staff to revert dispatch to previous best candidate", async () => {
      (auth as jest.Mock).mockResolvedValue(mockAdminUser);
      (prisma.employee.findFirst as jest.Mock).mockResolvedValue({ id: "emp-admin-1" });
      const mockTx = (prisma as any)._mockTx;
      mockTx.dispatchLocationCandidate.findMany.mockResolvedValue([
        {
          id: "cand-override",
          source: "STAFF_OVERRIDE",
          weight: 5,
          latitude: 9.7000,
          longitude: 76.8000,
          capturedById: "emp-admin-1",
          capturedAt: new Date("2026-11-14T10:00:00Z"),
        },
        {
          id: "cand-centroid",
          source: "VERIFIED_CENTROID",
          weight: 4,
          latitude: 9.6820,
          longitude: 76.7820,
          capturedById: "emp-driver-1",
          capturedAt: new Date("2026-11-14T09:30:00Z"),
        },
      ]);

      const result = await revertToPreviousBest("disp-101");

      expect(result.success).toBe(true);
      expect(result.revertedFrom).toBe("STAFF_OVERRIDE");
      expect(result.activeSource).toBe("VERIFIED_CENTROID");
      expect(result.latitude).toBe(9.682);
      expect(result.longitude).toBe(76.782);

      expect(mockTx.dispatchLocationCandidate.delete).toHaveBeenCalledWith({
        where: { id: "cand-override" },
      });
      expect(mockTx.dailyDispatch.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: "disp-101" },
          data: expect.objectContaining({
            locationSource: "VERIFIED_CENTROID",
            locationPriority: 4,
            latitude: 9.6820,
            longitude: 76.7820,
          }),
        })
      );
      expect(logAudit).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: "REVERT_SITE_LOCATION",
        })
      );
    });

    it("rejects revert if caller is not staff or admin", async () => {
      (auth as jest.Mock).mockResolvedValue(mockDriverUser);
      (prisma.employee.findFirst as jest.Mock).mockResolvedValue({ id: "emp-driver-1" });

      const result = await revertToPreviousBest("disp-101");

      expect(result.success).toBe(false);
      expect(result.error).toContain("Only staff or admin");
    });
  });

  describe("Deterministic Concurrency (Parallel Writers)", () => {
    it("ensures deterministic result when two parallel writes occur", async () => {
      // Driver (weight 2) and Operator (weight 3) submit coordinates in parallel
      (auth as jest.Mock).mockImplementation(async () => mockDriverUser);
      (prisma.employee.findFirst as jest.Mock).mockImplementation(async ({ where }) => {
        if (where?.userId === "user-operator-1" || where?.OR?.[0]?.id === "emp-operator-1") {
          return { id: "emp-operator-1" };
        }
        return { id: "emp-driver-1" };
      });
      (prisma.dailyDispatch.findUnique as jest.Mock).mockResolvedValue(baseDispatch);
      const mockTx = (prisma as any)._mockTx;
      mockTx.dailyDispatch.findUnique.mockResolvedValue(baseDispatch);

      // Execute in parallel
      const [driverRes, operatorRes] = await Promise.all([
        setDispatchLocationWithPriority({
          dispatchId: "disp-101",
          latitude: 9.6810,
          longitude: 76.7810,
          source: "DRIVER_PIN",
        }),
        setDispatchLocationWithPriority({
          dispatchId: "disp-101",
          latitude: 9.6820,
          longitude: 76.7820,
          source: "OPERATOR_PIN",
        }),
      ]);

      expect(driverRes.success).toBe(true);
      expect(operatorRes.success).toBe(true);
      // Both inserted their candidates
      expect(mockTx.dispatchLocationCandidate.create).toHaveBeenCalledTimes(2);
    });
  });
});
