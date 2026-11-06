import { submitPasswordResetRequestAction } from "../credentials";
import { prisma } from "@/lib/prisma";

jest.mock("@/lib/serverAuth", () => ({
  requireAuth: jest.fn().mockResolvedValue({ id: "mock-staff", role: "STAFF" }),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    employee: {
      findMany: jest.fn(),
    },
    user: {
      update: jest.fn(),
    },
  },
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

describe("submitPasswordResetRequestAction - Multi-role Operator Selection", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const mockOperatorEmp = {
    id: "emp-101",
    name: "Rajan Pillai",
    phone: "9847111003",
    role: "OPERATOR",
    defaultCrewRole: "MIXER_OPERATOR",
    capableRoles: ["MIXER_OPERATOR", "LIFT_OPERATOR", "VIBRATOR_OPERATOR"],
    user: {
      id: "user-101",
      email: "rajan@zerogroup.in",
      role: "OPERATOR",
    },
  };

  it("verifies and accepts request when operator selects multiple matching roles", async () => {
    (prisma.employee.findMany as jest.Mock).mockResolvedValue([mockOperatorEmp]);
    (prisma.user.update as jest.Mock).mockResolvedValue({ id: "user-101", resetRequested: true });

    const result = await submitPasswordResetRequestAction({
      name: "Rajan Pillai",
      phone: "9847111003",
      roles: ["MIXER_OPERATOR", "LIFT_OPERATOR"],
      notes: "Need password reset for new phone",
    });

    expect(result.success).toBe(true);
    expect(result.employeeName).toBe("Rajan Pillai");
    expect(prisma.user.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-101" },
        data: expect.objectContaining({
          resetRequested: true,
          resetRequestNotes: expect.stringContaining("Roles: MIXER_OPERATOR, LIFT_OPERATOR"),
        }),
      })
    );
  });

  it("verifies and accepts request when at least one of the selected roles matches capableRoles", async () => {
    (prisma.employee.findMany as jest.Mock).mockResolvedValue([mockOperatorEmp]);
    (prisma.user.update as jest.Mock).mockResolvedValue({ id: "user-101", resetRequested: true });

    const result = await submitPasswordResetRequestAction({
      name: "Rajan Pillai",
      phone: "9847111003",
      roles: ["DRIVER", "VIBRATOR_OPERATOR"], // DRIVER doesn't match, but VIBRATOR_OPERATOR does
    });

    expect(result.success).toBe(true);
    expect(prisma.user.update).toHaveBeenCalled();
  });

  it("rejects request when none of the selected roles match the operator record", async () => {
    (prisma.employee.findMany as jest.Mock).mockResolvedValue([mockOperatorEmp]);

    const result = await submitPasswordResetRequestAction({
      name: "Rajan Pillai",
      phone: "9847111003",
      roles: ["DRIVER", "STAFF"], // Neither matches
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("None of the selected roles");
    expect(prisma.user.update).not.toHaveBeenCalled();
  });

  it("maintains backward compatibility with single role argument", async () => {
    (prisma.employee.findMany as jest.Mock).mockResolvedValue([mockOperatorEmp]);
    (prisma.user.update as jest.Mock).mockResolvedValue({ id: "user-101", resetRequested: true });

    const result = await submitPasswordResetRequestAction({
      name: "Rajan Pillai",
      phone: "9847111003",
      role: "MIXER_OPERATOR",
    });

    expect(result.success).toBe(true);
    expect(prisma.user.update).toHaveBeenCalled();
  });
});
