import { createOrderWithAssets } from "../orders";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    machine: {
      findUnique: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

describe("Orders & Dispatch Intake Action Suite", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("blocks unauthenticated or unauthorized users", async () => {
    (auth as jest.Mock).mockResolvedValue(null);

    const result = await createOrderWithAssets({});
    expect(result.success).toBe(false);
    expect(result.error).toContain("Unauthorized");
  });

  it("rejects invalid order payload (missing customer and location)", async () => {
    (auth as jest.Mock).mockResolvedValue({
      user: { id: "staff-1", role: "STAFF" },
    });

    const result = await createOrderWithAssets({
      customerId: "",
      location: "",
      dateOfService: "2026-03-15",
    });

    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
  });

  it("prevents double-booking when selected machine is not AVAILABLE", async () => {
    (auth as jest.Mock).mockResolvedValue({
      user: { id: "staff-1", role: "STAFF" },
    });
    (prisma.machine.findUnique as jest.Mock).mockResolvedValue({
      id: "mach-1",
      machineId: "MIXER-01",
      type: "CONCRETE_MIXER",
      status: "MAINTENANCE",
    });

    const payload = {
      customerId: "cust-1",
      location: "Aluva Highway",
      dateOfService: "2026-03-15",
      primaryMachineId: "mach-1",
    };

    const result = await createOrderWithAssets(payload);

    expect(result.success).toBe(false);
    expect(result.error).toContain("currently MAINTENANCE. Choose another.");
  });
});
