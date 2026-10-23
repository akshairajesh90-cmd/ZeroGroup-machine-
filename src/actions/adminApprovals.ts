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

/**
 * Called by Staff to soft-delete a record.
 * Sets isPendingDelete = true and logs the staff member's ID.
 */
export async function softDelete(
  model: "DISPATCH" | "FUEL" | "EXPENSE" | "MACHINE" | "VEHICLE" | "EMPLOYEE" | "TOOL",
  id: string,
  staffId: string
) {
  await requireAuth({ allowedRoles: [Role.OWNER, Role.ADMIN, Role.STAFF] });

  const updateData = { isPendingDelete: true, markedForDeleteBy: staffId };

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
  return { success: true };
}

/**
 * Called by Admin to permanently delete a record that was soft-deleted.
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
    case "EMPLOYEE":
      await prisma.employee.delete({ where: { id } });
      break;
    case "TOOL":
      await prisma.tool.delete({ where: { id } });
      break;
  }
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
  return { success: true };
}
