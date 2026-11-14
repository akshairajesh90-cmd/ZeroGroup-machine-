import { createDailyDispatch, updateDailyDispatch } from "../manage";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/auditLogger", () => ({
  logAudit: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

jest.mock("@/lib/geo-server", () => ({
  resolveGoogleMapsLink: jest.fn().mockImplementation(async (url: string) => {
    if (url.includes("maps.app.goo.gl/valid-short")) {
      return { lat: 9.6850, lng: 76.7550 };
    }
    return null;
  }),
}));

jest.mock("@/lib/prisma", () => {
  const mockTx = {
    dailyDispatch: {
      create: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    dispatchMachine: {
      createMany: jest.fn(),
      deleteMany: jest.fn(),
    },
    dispatchAssignment: {
      deleteMany: jest.fn(),
      create: jest.fn(),
    },
    dispatchTool: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
    machine: {
      updateMany: jest.fn(),
      update: jest.fn(),
    },
    tool: {
      updateMany: jest.fn(),
    },
    employee: {
      findUnique: jest.fn(),
      findFirst: jest.fn(),
    },
    dispatchStatusHistory: {
      create: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  };

  return {
    prisma: {
      workTypeRate: {
        findUnique: jest.fn(),
      },
      employee: {
        findFirst: jest.fn(),
      },
      dailyDispatch: {
        findUnique: jest.fn(),
      },
      $transaction: jest.fn((callback) => callback(mockTx)),
      _mockTx: mockTx,
    },
  };
});

describe("Dispatch MapLink Coordinate Extraction and Centroid Protection", () => {
  const mockStaffSession = {
    user: { id: "user-staff-1", role: "STAFF" },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (auth as jest.Mock).mockResolvedValue(mockStaffSession);
    (prisma.workTypeRate.findUnique as jest.Mock).mockResolvedValue({
      payoutRate: 800,
      customerCharge: 2300,
    });
    (prisma.employee.findFirst as jest.Mock).mockResolvedValue({
      id: "emp-staff-1",
    });
  });

  it("extracts coordinates from direct Google Maps link on dispatch creation", async () => {
    const mockTx = (prisma as any)._mockTx;
    mockTx.dailyDispatch.create.mockResolvedValue({ id: "disp-created-1" });

    const formData = {
      customerId: "cust-1",
      location: "Kattachira, Pala",
      mapLink: "https://www.google.com/maps?q=9.7150,76.6920",
      dateOfService: "2026-11-20",
      workType: "NORMAL",
    };

    const res = await createDailyDispatch(formData);

    expect(res.success).toBe(true);
    expect(mockTx.dailyDispatch.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          latitude: 9.715,
          longitude: 76.692,
          locationSource: "STAFF_BOOKING",
          mapLink: "https://www.google.com/maps?q=9.7150,76.6920",
        }),
      })
    );
  });

  it("resolves short Google Maps link (maps.app.goo.gl) on dispatch creation", async () => {
    const mockTx = (prisma as any)._mockTx;
    mockTx.dailyDispatch.create.mockResolvedValue({ id: "disp-created-2" });

    const formData = {
      customerId: "cust-1",
      location: "Ayyampara, Teekoy",
      mapLink: "https://maps.app.goo.gl/valid-short",
      dateOfService: "2026-11-20",
      workType: "NORMAL",
    };

    const res = await createDailyDispatch(formData);

    expect(res.success).toBe(true);
    expect(mockTx.dailyDispatch.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          latitude: 9.685,
          longitude: 76.755,
          locationSource: "STAFF_BOOKING",
        }),
      })
    );
  });

  it("updates coordinates from mapLink on edit if centroid is NOT verified", async () => {
    const mockTx = (prisma as any)._mockTx;
    mockTx.dailyDispatch.findUnique.mockResolvedValue({
      id: "disp-edit-1",
      status: "PENDING",
      isCentroidVerified: false,
      latitude: null,
      longitude: null,
      dispatchMachines: [],
      dispatchTools: [],
      crewAssignments: [],
    });
    mockTx.dailyDispatch.update.mockResolvedValue({ id: "disp-edit-1" });

    const editData = {
      id: "disp-edit-1",
      customerId: "cust-1",
      location: "Poonjar Vadakkekara",
      mapLink: "https://www.google.com/maps?q=9.6810,76.7810",
      dateOfService: "2026-11-20",
      workType: "NORMAL",
      version: 1,
    };

    const res = await updateDailyDispatch(editData);

    expect(res.success).toBe(true);
    expect(mockTx.dailyDispatch.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "disp-edit-1" },
        data: expect.objectContaining({
          latitude: 9.681,
          longitude: 76.781,
          locationSource: "STAFF_BOOKING",
        }),
      })
    );
  });

  it("DOES NOT overwrite verified centroid coordinates when staff edits other fields with coarse mapLink", async () => {
    const mockTx = (prisma as any)._mockTx;
    mockTx.dailyDispatch.findUnique.mockResolvedValue({
      id: "disp-verified-1",
      status: "IN_PROGRESS",
      isCentroidVerified: true,
      latitude: 9.68005,
      longitude: 76.78005,
      locationSource: "VERIFIED_CENTROID",
      dispatchMachines: [],
      dispatchTools: [],
      crewAssignments: [],
    });
    mockTx.dailyDispatch.update.mockResolvedValue({ id: "disp-verified-1" });

    const editData = {
      id: "disp-verified-1",
      customerId: "cust-1",
      location: "Poonjar Site Updated Notes",
      mapLink: "https://www.google.com/maps?q=9.7000,76.7000", // Coarse town center link
      dateOfService: "2026-11-20",
      workType: "NORMAL",
      notes: "Customer requested 3 extra cement bags",
      version: 2,
    };

    const res = await updateDailyDispatch(editData);

    expect(res.success).toBe(true);
    // Verified: latitude and longitude are NOT overwritten with 9.7000, 76.7000
    const updateCall = mockTx.dailyDispatch.update.mock.calls[0][0];
    expect(updateCall.data.latitude).toBeUndefined();
    expect(updateCall.data.longitude).toBeUndefined();
    expect(updateCall.data.notes).toBe("Customer requested 3 extra cement bags");
  });
});
