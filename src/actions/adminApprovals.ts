"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/serverAuth";
import { Role } from "@prisma/client";

export async function approveItem(type: "FUEL" | "ADJUSTMENT", id: string) {
  await requireAuth({ allowedRoles: [Role.OWNER, Role.ADMIN] });

  if (type === "FUEL") {
    await prisma.fuelLog.update({
      where: { id },
      data: { approvalStatus: "APPROVED" },
    });
  } else {
    await prisma.manualAdjustment.update({
      where: { id },
      data: { approvalStatus: "APPROVED" },
    });
  }
  return { success: true };
}

export async function rejectItem(type: "FUEL" | "ADJUSTMENT", id: string) {
  await requireAuth({ allowedRoles: [Role.OWNER, Role.ADMIN] });

  if (type === "FUEL") {
    await prisma.fuelLog.update({
      where: { id },
      data: { approvalStatus: "REJECTED" },
    });
  } else {
    await prisma.manualAdjustment.update({
      where: { id },
      data: { approvalStatus: "REJECTED" },
    });
  }
  return { success: true };
}

import { revalidatePath } from "next/cache";

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Ignored in non-request contexts
  }
}

/**
 * Called by Staff or Admin to soft-delete a record.
 * Sets isPendingDelete = true and logs the actor's ID.
 */
export async function softDelete(
  model: "DISPATCH" | "FUEL" | "EXPENSE" | "MACHINE" | "VEHICLE" | "EMPLOYEE" | "TOOL",
  id: string,
  staffId?: string
) {
  const session = await requireAuth({ allowedRoles: [Role.OWNER, Role.ADMIN, Role.STAFF] });
  const actorId = staffId || session.employeeId || session.userId;

  // Active Dependency Guards
  if (model === "TOOL") {
    const activeToolDispatch = await prisma.dispatchTool.findFirst({
      where: {
        toolId: id,
        dispatch: {
          isPendingDelete: false,
          status: { in: ["PENDING", "ACCEPTED", "EN_ROUTE", "IN_PROGRESS", "DELIVERED", "PICKED_UP"] }
        }
      }
    });
    if (activeToolDispatch) {
      throw new Error(`Cannot delete tool: Currently deployed on an active on-site dispatch.`);
    }
  }

  if (model === "MACHINE") {
    const activeMachineDispatch = await prisma.dailyDispatch.findFirst({
      where: {
        isPendingDelete: false,
        status: { in: ["PENDING", "ACCEPTED", "EN_ROUTE", "IN_PROGRESS", "DELIVERED", "PICKED_UP"] },
        OR: [{ machineId: id }, { liftId: id }, { vibratorId: id }]
      }
    });
    if (activeMachineDispatch) {
      throw new Error(`Cannot delete machine: Currently allocated to an active dispatch.`);
    }
  }

  if (model === "VEHICLE") {
    const activeVehicleDispatch = await prisma.dailyDispatch.findFirst({
      where: {
        isPendingDelete: false,
        status: { in: ["PENDING", "ACCEPTED", "EN_ROUTE", "IN_PROGRESS", "DELIVERED", "PICKED_UP"] },
        vehicleId: id
      }
    });
    if (activeVehicleDispatch) {
      throw new Error(`Cannot delete vehicle: Currently assigned to an active dispatch.`);
    }
  }

  if (model === "EMPLOYEE") {
    const activeEmpDispatch = await prisma.dailyDispatch.findFirst({
      where: {
        isPendingDelete: false,
        status: { in: ["PENDING", "ACCEPTED", "EN_ROUTE", "IN_PROGRESS", "DELIVERED", "PICKED_UP"] },
        OR: [
          { driverId: id },
          { operatorId: id },
          { workerId: id },
          { mainHelperId: id },
          { siteLeaderEmployeeId: id }
        ]
      }
    });
    if (activeEmpDispatch) {
      throw new Error(`Cannot delete employee: Currently assigned to an active dispatch.`);
    }
  }

  const updateData = { isPendingDelete: true, markedForDeleteBy: actorId };

  switch (model) {
    case "DISPATCH":
      await prisma.dailyDispatch.update({ where: { id }, data: updateData });
      break;
    case "FUEL":
      await prisma.fuelLog.update({ where: { id }, data: updateData });
      break;
    case "EXPENSE":
      await prisma.expense.update({ where: { id }, data: updateData });
      break;
    case "MACHINE":
      await prisma.machine.update({ where: { id }, data: updateData });
      break;
    case "VEHICLE":
      await prisma.vehicle.update({ where: { id }, data: updateData });
      break;
    case "EMPLOYEE": {
      const emp = await prisma.employee.findUnique({ where: { id }, select: { userId: true } });
      await prisma.employee.update({ where: { id }, data: updateData });
      if (emp?.userId) {
        await prisma.user.update({
          where: { id: emp.userId },
          data: { sessionTokenVersion: { increment: 1 } }
        });
      }
      break;
    }
    case "TOOL":
      await prisma.tool.update({ where: { id }, data: updateData });
      break;
  }

  safeRevalidate("/admin/trash");
  safeRevalidate("/owner/trash");
  safeRevalidate("/staff/fleet");
  safeRevalidate("/staff/tools");
  safeRevalidate("/staff/expenses");
  safeRevalidate("/staff/employees");
  safeRevalidate("/staff/credentials");
  return { success: true };
}

/**
 * Called by Admin or Owner to permanently delete a record that was soft-deleted.
 */
export async function hardDelete(
  model: "DISPATCH" | "FUEL" | "EXPENSE" | "MACHINE" | "VEHICLE" | "EMPLOYEE" | "TOOL",
  id: string
) {
  await requireAuth({ allowedRoles: [Role.OWNER, Role.ADMIN] });

  switch (model) {
    case "DISPATCH":
      await prisma.dailyDispatch.delete({ where: { id } });
      break;
    case "FUEL":
      await prisma.fuelLog.delete({ where: { id } });
      break;
    case "EXPENSE":
      await prisma.expense.delete({ where: { id } });
      break;
    case "MACHINE":
      await prisma.machine.delete({ where: { id } });
      break;
    case "VEHICLE":
      await prisma.vehicle.delete({ where: { id } });
      break;
    case "EMPLOYEE": {
      const emp = await prisma.employee.findUnique({ where: { id }, select: { userId: true } });
      await prisma.employeeRoleRate.deleteMany({ where: { employeeId: id } });
      await prisma.employeeDocument.deleteMany({ where: { employeeId: id } });
      await prisma.employee.delete({ where: { id } });
      if (emp?.userId) {
        await prisma.user.delete({ where: { id: emp.userId } }).catch(() => {});
      }
      break;
    }
    case "TOOL":
      await prisma.tool.delete({ where: { id } });
      break;
  }

  safeRevalidate("/admin/trash");
  safeRevalidate("/owner/trash");
  return { success: true };
}

/**
 * Called by Admin to restore a soft-deleted record.
 */
export async function restoreRecord(
  model: "DISPATCH" | "FUEL" | "EXPENSE" | "MACHINE" | "VEHICLE" | "EMPLOYEE" | "TOOL",
  id: string
) {
  await requireAuth({ allowedRoles: [Role.OWNER, Role.ADMIN] });

  const updateData = { isPendingDelete: false, markedForDeleteBy: null };

  switch (model) {
    case "DISPATCH":
      await prisma.dailyDispatch.update({ where: { id }, data: updateData });
      break;
    case "FUEL":
      await prisma.fuelLog.update({ where: { id }, data: updateData });
      break;
    case "EXPENSE":
      await prisma.expense.update({ where: { id }, data: updateData });
      break;
    case "MACHINE":
      await prisma.machine.update({ where: { id }, data: updateData });
      break;
    case "VEHICLE":
      await prisma.vehicle.update({ where: { id }, data: updateData });
      break;
    case "EMPLOYEE":
      await prisma.employee.update({ where: { id }, data: updateData });
      break;
    case "TOOL":
      await prisma.tool.update({ where: { id }, data: updateData });
      break;
  }

  safeRevalidate("/admin/trash");
  safeRevalidate("/owner/trash");
  safeRevalidate("/staff/fleet");
  safeRevalidate("/staff/tools");
  safeRevalidate("/staff/expenses");
  safeRevalidate("/staff/employees");
  safeRevalidate("/staff/credentials");
  return { success: true };
}
