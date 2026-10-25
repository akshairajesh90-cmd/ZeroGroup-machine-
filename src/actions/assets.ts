"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/serverAuth";
import { revalidatePath } from "next/cache";

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function updateVehicleStatus(vehicleId: string, status: any) {
  await requireAuth({ allowedRoles: ["OWNER", "STAFF", "ADMIN"] });
  await prisma.vehicle.update({
    where: { id: vehicleId },
    data: { status }
  });
  revalidatePath(`/admin/fleet`);
  revalidatePath(`/staff/fleet/vehicle/${vehicleId}`);
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function updateMachineStatus(machineId: string, status: any) {
  await requireAuth({ allowedRoles: ["OWNER", "STAFF", "ADMIN"] });
  await prisma.machine.update({
    where: { id: machineId },
    data: { status }
  });
  revalidatePath(`/admin/fleet`);
  revalidatePath(`/staff/fleet/machine/${machineId}`);
}

export async function editMachine(machineId: string, data: { machineId?: string; type?: any; operatorDailyPayout?: number; fuelConsumptionThreshold?: number; notes?: string }) {
  await requireAuth({ allowedRoles: ["OWNER", "STAFF", "ADMIN"] });
  await prisma.machine.update({
    where: { id: machineId },
    data: {
      ...(data.machineId && { machineId: data.machineId }),
      ...(data.type && { type: data.type }),
      ...(data.operatorDailyPayout !== undefined && { operatorDailyPayout: data.operatorDailyPayout }),
      ...(data.fuelConsumptionThreshold !== undefined && { fuelConsumptionThreshold: data.fuelConsumptionThreshold }),
      ...(data.notes !== undefined && { notes: data.notes }),
    }
  });
  revalidatePath(`/staff/fleet`);
  revalidatePath(`/staff/fleet/machine/${machineId}`);
  return { success: true };
}

export async function editVehicle(vehicleId: string, data: { licensePlate?: string; type?: string }) {
  await requireAuth({ allowedRoles: ["OWNER", "STAFF", "ADMIN"] });
  await prisma.vehicle.update({
    where: { id: vehicleId },
    data: {
      ...(data.licensePlate && { licensePlate: data.licensePlate }),
      ...(data.type && { type: data.type }),
    }
  });
  revalidatePath(`/staff/fleet`);
  revalidatePath(`/staff/fleet/vehicle/${vehicleId}`);
  return { success: true };
}

export async function editTool(toolId: string, data: { name?: string; toolId?: string; toolType?: string; totalInventory?: number; repairCount?: number; dailyRate?: number; isActive?: boolean }) {
  try {
    const authCtx = await requireAuth({ allowedRoles: ["OWNER", "STAFF", "ADMIN"], redirectOnFail: false });
    if (!authCtx) {
      return { success: false, error: "Authentication required to edit assets." };
    }

    const currentTool = await prisma.tool.findUnique({ where: { id: toolId } });
    if (!currentTool) {
      return { success: false, error: "Asset not found." };
    }

    // Check for ID conflict if changing toolId
    if (data.toolId && data.toolId.trim() !== currentTool.toolId) {
      const trimmedNewId = data.toolId.trim();
      const conflict = await prisma.tool.findFirst({
        where: {
          id: { not: toolId },
          toolId: { equals: trimmedNewId, mode: "insensitive" }
        }
      });
      if (conflict) {
        return {
          success: false,
          error: `Asset ID "${trimmedNewId}" is already assigned to "${conflict.name}". Please use a unique ID.`
        };
      }
    }

    await prisma.tool.update({
      where: { id: toolId },
      data: {
        ...(data.name !== undefined && { name: data.name.trim() }),
        ...(data.toolId !== undefined && { toolId: data.toolId.trim() }),
        ...(data.toolType !== undefined && { toolType: data.toolType.trim().toUpperCase() }),
        ...(data.totalInventory !== undefined && { totalInventory: Math.max(0, Number(data.totalInventory)) }),
        ...(data.repairCount !== undefined && { repairCount: Math.max(0, Number(data.repairCount)) }),
        ...(data.dailyRate !== undefined && { dailyRate: Math.max(0, Number(data.dailyRate)) }),
        ...(data.isActive !== undefined && { isActive: data.isActive }),
      }
    });

    try {
      revalidatePath(`/staff/tools`);
      revalidatePath(`/staff/dispatch`);
    } catch {
      // Ignored in non-request contexts
    }

    return { success: true };
  } catch (error: any) {
    console.error("editTool error:", error);
    return { success: false, error: error?.message || "Failed to edit tool" };
  }
}

export async function addTool(data: { name: string; toolId: string; toolType: string; totalInventory: number; dailyRate?: number; repairCount?: number }) {
  try {
    const authCtx = await requireAuth({ allowedRoles: ["OWNER", "ADMIN", "STAFF"], redirectOnFail: false });
    if (!authCtx) {
      return { success: false, error: "Authentication required to add new assets." };
    }

    const trimmedName = data.name?.trim();
    const trimmedToolId = data.toolId?.trim();
    const trimmedToolType = data.toolType?.trim().toUpperCase() || "GENERAL";
    const totalInventory = Math.max(1, Number(data.totalInventory) || 1);
    const repairCount = Math.max(0, Number(data.repairCount) || 0);
    const dailyRate = Math.max(0, Number(data.dailyRate) || 0);

    if (!trimmedName) {
      return { success: false, error: "Asset Name is required." };
    }
    if (!trimmedToolId) {
      return { success: false, error: "Asset ID / Barcode is required." };
    }

    // Check if toolId already exists
    const existingTool = await prisma.tool.findFirst({
      where: {
        toolId: { equals: trimmedToolId, mode: "insensitive" }
      }
    });

    if (existingTool) {
      if (existingTool.isPendingDelete) {
        return {
          success: false,
          error: `Asset ID "${trimmedToolId}" exists in the Trash Hub. Please restore it from Trash or use a new ID.`
        };
      }
      return {
        success: false,
        error: `Asset ID "${trimmedToolId}" already exists ("${existingTool.name}"). Please enter a unique ID or barcode.`
      };
    }

    const newTool = await prisma.tool.create({
      data: {
        name: trimmedName,
        toolId: trimmedToolId,
        toolType: trimmedToolType,
        totalInventory,
        dailyRate,
        repairCount,
        isActive: true,
      }
    });

    try {
      revalidatePath("/staff/tools");
      revalidatePath("/staff/dispatch");
    } catch {
      // Ignored in non-request contexts
    }

    return { success: true, tool: newTool };
  } catch (error: any) {
    console.error("addTool error:", error);
    return {
      success: false,
      error: error?.message || "Failed to add asset. Please check the values and try again."
    };
  }
}

export async function toggleToolActiveStatus(toolId: string, isActive: boolean) {
  try {
    await requireAuth({ allowedRoles: ["OWNER", "ADMIN", "STAFF"] });

    const tool = await prisma.tool.findUnique({
      where: { id: toolId },
      include: {
        dispatchTools: {
          where: {
            dispatch: {
              status: { in: ["ACCEPTED", "EN_ROUTE", "IN_PROGRESS", "DELIVERED"] }
            }
          }
        }
      }
    });

    if (!tool) throw new Error("Tool not found.");

    if (!isActive && tool.dispatchTools.length > 0) {
      throw new Error(`Cannot disable ${tool.name}: Currently deployed across ${tool.dispatchTools.length} active dispatches. Please return equipment first.`);
    }

    await prisma.tool.update({
      where: { id: toolId },
      data: { isActive }
    });

    try {
      revalidatePath("/staff/tools");
    } catch {
      // Ignored in non-request contexts
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
