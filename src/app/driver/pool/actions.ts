"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/serverAuth";
import { revalidatePath } from "next/cache";

export async function claimDispatchAsDriver(dispatchId: string) {
  try {
    const { employeeId } = await requireAuth();

    // Verify employee is a driver (or authorized)
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { role: true },
    });

    if (!employee || !["DRIVER", "OWNER", "ADMIN"].includes(employee.role)) {
      return { success: false, error: "Unauthorized. Must be a Driver." };
    }

    const dispatch = await prisma.dailyDispatch.findUnique({
      where: { id: dispatchId },
    });

    if (!dispatch) {
      return { success: false, error: "Dispatch not found." };
    }

    if (dispatch.status !== "PENDING" && dispatch.status !== "EN_ROUTE") {
      return { success: false, error: "Can only claim pending or en-route dispatches." };
    }

    const previousDriverId = dispatch.driverId;

    await prisma.$transaction(async (tx) => {
      // Update the dispatch with the new driver
      await tx.dailyDispatch.update({
        where: { id: dispatchId },
        data: { driverId: employeeId },
      });

      // Audit log the claim/swap
      await tx.auditLog.create({
        data: {
          actionType: "UPDATE",
          entity: "DISPATCH_DRIVER",
          actorRole: employee.role as any,
          newPayload: { 
            id: dispatchId, 
            newDriverId: employeeId, 
            previousDriverId,
            action: previousDriverId ? "SWAPPED_DRIVER" : "CLAIMED_DRIVER"
          },
          actorId: employeeId,
        }
      });
    });

    revalidatePath("/driver/pool");
    revalidatePath("/driver/home");
    revalidatePath("/admin/orders");
    
    return { success: true };
  } catch (error: any) {
    console.error("Error claiming dispatch:", error);
    return { success: false, error: error.message || "Failed to claim job." };
  }
}
