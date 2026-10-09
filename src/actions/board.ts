"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

/**
 * Fetch dispatches bounded by a date range for the calendar board.
 */
export async function getBoardDispatches(startDate: Date, endDate: Date) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  const dispatches = await prisma.dailyDispatch.findMany({
    where: {
      dateOfService: {
        gte: startDate,
        lte: endDate,
      },
      isPendingDelete: false,
    },
    include: {
      machine: true,
      operator: true,
      customer: true,
      project: true,
    },
    orderBy: {
      dateOfService: "asc",
    },
  });

  return dispatches;
}

/**
 * Update dispatch date and/or machine assignment via drag-and-drop.
 * Protected by a Prisma transaction to prevent double booking.
 */
export async function updateDispatchAssignment(
  dispatchId: string,
  newDate: Date,
  newMachineId?: string
) {
  const session = await auth();
  if (!session || (session.user?.role !== "ADMIN" && session.user?.role !== "STAFF" && session.user?.role !== "OWNER")) {
    throw new Error("Unauthorized: Only Owner, Admin or Staff can reschedule dispatches");
  }

  return await prisma.$transaction(async (tx: any) => {
    // 1. Fetch current dispatch
    const currentDispatch = await tx.dailyDispatch.findUnique({
      where: { id: dispatchId },
    });

    if (!currentDispatch) throw new Error("Dispatch not found");

    const targetMachineId = newMachineId || currentDispatch.machineId;

    // 2. Check double booking if a machine is assigned
    if (targetMachineId) {
      const overlapping = await tx.dailyDispatch.findFirst({
        where: {
          machineId: targetMachineId,
          dateOfService: newDate,
          id: { not: dispatchId },
          status: { notIn: ["CANCELLED", "POSTPONED"] },
          isPendingDelete: false,
        },
      });

      if (overlapping) {
        throw new Error("Double booking detected: Machine is already assigned on this date.");
      }
    }

    // 3. Update the dispatch
    const updated = await tx.dailyDispatch.update({
      where: { id: dispatchId },
      data: {
        dateOfService: newDate,
        machineId: targetMachineId,
      },
    });

    const changerEmp = await tx.employee.findUnique({
      where: { userId: session.user?.id || "" },
    });

    // 4. Create AuditLog
    await tx.auditLog.create({
      data: {
        actorId: changerEmp?.id || "SYSTEM",
        actorRole: session.user?.role || "ADMIN",
        actionType: "UPDATE_BOARD_DISPATCH",
        modelName: "DailyDispatch",
        oldPayload: JSON.stringify({
          dateOfService: currentDispatch.dateOfService,
          machineId: currentDispatch.machineId,
        }),
        newPayload: JSON.stringify({
          dateOfService: newDate,
          machineId: targetMachineId,
        }),
      },
    });

    return updated;
  });
}

