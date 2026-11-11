import { createSalaryAdvance } from "../advances";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/serverAuth";

jest.mock("@/lib/serverAuth", () => ({
  requireAuth: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    salaryAdvance: {
      create: jest.fn(),
    },
    auditLog: {
      create: jest.fn(),
    },
  },
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

describe("Salary Advances Action Suite", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("prevents staff members from creating advances exceeding ₹5,000", async () => {
    (requireAuth as jest.Mock).mockResolvedValue({
      id: "staff-1",
      employeeId: "emp-staff-1",
      role: "STAFF",
    });

    await expect(
      createSalaryAdvance({
        employeeId: "emp-driver-1",
        amount: 8000,
        reason: "Family emergency medical bill",
      })
    ).rejects.toThrow(/Staff members cannot issue advances greater than ₹5,000/i);
  });

  it("rejects non-positive advance amounts via Zod", async () => {
    (requireAuth as jest.Mock).mockResolvedValue({
      id: "admin-1",
      employeeId: "emp-admin-1",
      role: "ADMIN",
    });

    await expect(
      createSalaryAdvance({
        employeeId: "emp-driver-1",
        amount: -500,
        reason: "Invalid negative advance",
      })
    ).rejects.toThrow();
  });

  it("creates advance and logs audit entry successfully for admin", async () => {
    (requireAuth as jest.Mock).mockResolvedValue({
      id: "admin-1",
      employeeId: "emp-admin-1",
      role: "ADMIN",
    });
    (prisma.salaryAdvance.create as jest.Mock).mockResolvedValue({
      id: "adv-100",
      amount: 15000,
      status: "PENDING",
    });
    (prisma.auditLog.create as jest.Mock).mockResolvedValue({ id: "audit-1" });

    const result = await createSalaryAdvance({
      employeeId: "emp-operator-1",
      amount: 15000,
      reason: "Advance for house construction",
    });

    expect(result.success).toBe(true);
    expect(result.advanceId).toBe("adv-100");
    expect(prisma.salaryAdvance.create).toHaveBeenCalledTimes(1);
    expect(prisma.auditLog.create).toHaveBeenCalledTimes(1);
  });
});
