import { createAdminExpense } from "../expenses";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/serverAuth";

jest.mock("@/lib/serverAuth", () => ({
  requireAuth: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: jest.fn(),
  },
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

describe("Expenses Server Action Suite", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("requires a description for OTHER category expenses", async () => {
    (requireAuth as jest.Mock).mockResolvedValue({ employeeId: "emp-staff-1", role: "STAFF" });

    const formData = new FormData();
    formData.append("amount", "250");
    formData.append("category", "OTHER");
    formData.append("date", "2026-03-12");

    const result = await createAdminExpense(formData);

    expect(result.success).toBe(false);
    expect(result.error).toContain("Description is required for OTHER");
  });

  it("requires an employeeId for STAFF_ADVANCE", async () => {
    (requireAuth as jest.Mock).mockResolvedValue({ employeeId: "emp-staff-1", role: "STAFF" });

    const formData = new FormData();
    formData.append("amount", "1000");
    formData.append("category", "STAFF_ADVANCE");
    formData.append("date", "2026-03-12");

    const result = await createAdminExpense(formData);

    expect(result.success).toBe(false);
    expect(result.error).toContain("You must select an employee for a Salary Advance");
  });

  it("requires a contractorId for CONTRACTOR_ADVANCE", async () => {
    (requireAuth as jest.Mock).mockResolvedValue({ employeeId: "emp-staff-1", role: "STAFF" });

    const formData = new FormData();
    formData.append("amount", "2000");
    formData.append("category", "CONTRACTOR_ADVANCE");
    formData.append("date", "2026-03-12");

    const result = await createAdminExpense(formData);

    expect(result.success).toBe(false);
    expect(result.error).toContain("You must select a contractor for a Contractor Advance");
  });

  it("creates standard expense inside transaction and writes audit log", async () => {
    (requireAuth as jest.Mock).mockResolvedValue({ employeeId: "emp-staff-1", role: "STAFF" });

    const mockTx = {
      expense: {
        create: jest.fn().mockResolvedValue({ id: "exp-1" }),
      },
      auditLog: {
        create: jest.fn().mockResolvedValue({ id: "aud-1" }),
      },
    };
    (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
      return callback(mockTx);
    });

    const formData = new FormData();
    formData.append("amount", "1800");
    formData.append("category", "DIESEL");
    formData.append("date", "2026-03-12");
    formData.append("machineId", "mach-10-7");
    formData.append("paymentMode", "CASH");

    const result = await createAdminExpense(formData);

    expect(result.success).toBe(true);
    expect(mockTx.expense.create).toHaveBeenCalledTimes(1);
    expect(mockTx.auditLog.create).toHaveBeenCalledTimes(1);
  });
});
