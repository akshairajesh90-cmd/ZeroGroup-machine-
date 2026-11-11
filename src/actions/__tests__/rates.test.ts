import { getWorkTypeRates, upsertWorkTypeRate, getEmployeeRoleRates } from "../rates";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/serverAuth";

jest.mock("@/lib/serverAuth", () => ({
  requireAuth: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    workTypeRate: {
      findMany: jest.fn(),
      upsert: jest.fn(),
    },
    employeeRoleRate: {
      findMany: jest.fn(),
    },
  },
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

describe("Rates Configuration Action Suite", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("getWorkTypeRates", () => {
    it("fetches ordered work type rates when authorized", async () => {
      (requireAuth as jest.Mock).mockResolvedValue({ id: "staff-1", role: "STAFF" });
      (prisma.workTypeRate.findMany as jest.Mock).mockResolvedValue([
        { id: "w-1", machineType: "CONCRETE_MIXER", workType: "NORMAL", payoutRate: 1100, customerCharge: 1000 },
        { id: "w-2", machineType: "LIFT", workType: "NORMAL", payoutRate: 1000, customerCharge: 1700 },
      ]);

      const rates = await getWorkTypeRates();

      expect(rates).toHaveLength(2);
      expect(prisma.workTypeRate.findMany).toHaveBeenCalledTimes(1);
    });
  });

  describe("upsertWorkTypeRate", () => {
    it("upserts rate and revalidates admin and dispatch paths", async () => {
      (requireAuth as jest.Mock).mockResolvedValue({ id: "admin-1", role: "ADMIN" });
      (prisma.workTypeRate.upsert as jest.Mock).mockResolvedValue({ id: "w-3" });

      const result = await upsertWorkTypeRate({
        machineType: "CONCRETE_MIXER",
        workType: "TROLLY",
        payoutRate: 1250,
        customerCharge: 1600,
      });

      expect(result.success).toBe(true);
      expect(prisma.workTypeRate.upsert).toHaveBeenCalledTimes(1);
    });
  });

  describe("getEmployeeRoleRates", () => {
    it("fetches employee role rates with employee details", async () => {
      (requireAuth as jest.Mock).mockResolvedValue({ id: "admin-1", role: "ADMIN" });
      (prisma.employeeRoleRate.findMany as jest.Mock).mockResolvedValue([
        { id: "err-1", crewRole: "MIXER_OPERATOR", employee: { name: "Rajan" } },
      ]);

      const roleRates = await getEmployeeRoleRates();

      expect(roleRates).toHaveLength(1);
      expect(roleRates[0].employee.name).toBe("Rajan");
    });
  });
});
