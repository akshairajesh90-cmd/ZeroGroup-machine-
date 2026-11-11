import { completeDispatchWithToolReturns } from "../toolReturns";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

jest.mock("@/lib/auth", () => ({
  auth: jest.fn(),
}));

jest.mock("@/lib/prisma", () => ({
  prisma: {
    $transaction: jest.fn(),
  },
}));

jest.mock("next/cache", () => ({
  revalidatePath: jest.fn(),
}));

describe("Tool Returns & Field Accountability Action Suite", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("blocks unauthorized users without proper role", async () => {
    (auth as jest.Mock).mockResolvedValue({
      user: { id: "driver-1", role: "DRIVER" },
    });

    const result = await completeDispatchWithToolReturns({
      dispatchId: "disp-101",
      toolReturns: [
        {
          dispatchToolId: "dt-1",
          toolId: "t-1",
          toolName: "Vibrator Needle 40mm",
          returnStatus: "RETURNED",
        },
      ],
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("Unauthorized");
  });

  it("rejects completion if any tool return status remains PENDING", async () => {
    (auth as jest.Mock).mockResolvedValue({
      user: { id: "staff-1", role: "STAFF" },
    });

    const payload = {
      dispatchId: "disp-101",
      toolReturns: [
        {
          dispatchToolId: "dt-1",
          toolId: "t-1",
          toolName: "Heavy Grease Gun",
          returnStatus: "PENDING",
        },
      ],
    };

    const result = await completeDispatchWithToolReturns(payload);

    expect(result.success).toBe(false);
    expect(result.error).toContain("All tools must be accounted for before completing");
    expect(result.error).toContain("Heavy Grease Gun");
  });

  it("proceeds with transaction when all tools are accounted for (RETURNED or DAMAGED)", async () => {
    (auth as jest.Mock).mockResolvedValue({
      user: { id: "staff-1", role: "STAFF" },
    });

    const mockTx = {
      dailyDispatch: {
        findUnique: jest.fn().mockResolvedValue({
          id: "disp-101",
          status: "IN_PROGRESS",
          dispatchTools: [{ id: "dt-1", toolId: "t-1", quantity: 1 }],
          dispatchMachines: [],
        }),
        update: jest.fn().mockResolvedValue({ id: "disp-101", status: "COMPLETED" }),
      },
      dispatchTool: {
        update: jest.fn().mockResolvedValue({ id: "dt-1" }),
      },
      tool: {
        update: jest.fn().mockResolvedValue({ id: "t-1" }),
      },
    };

    (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
      return callback(mockTx);
    });

    const payload = {
      dispatchId: "disp-101",
      toolReturns: [
        {
          dispatchToolId: "dt-1",
          toolId: "t-1",
          toolName: "Vibrator Needle 40mm",
          returnStatus: "RETURNED",
        },
      ],
    };

    const result = await completeDispatchWithToolReturns(payload);

    expect(result.success).toBe(true);
    expect(mockTx.dailyDispatch.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "disp-101" },
        data: expect.objectContaining({ status: "COMPLETED" }),
      })
    );
  });
});
