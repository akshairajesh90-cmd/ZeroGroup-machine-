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

export async function editTool(toolId: string, data: { name?: string; toolId?: string; toolType?: string; totalInventory?: number }) {
  await requireAuth({ allowedRoles: ["OWNER", "STAFF", "ADMIN"] });
  await prisma.tool.update({
    where: { id: toolId },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.toolId && { toolId: data.toolId }),
      ...(data.toolType !== undefined && { toolType: data.toolType }),
      ...(data.totalInventory !== undefined && { totalInventory: data.totalInventory }),
    }
  });
  revalidatePath(`/staff/tools`);
  return { success: true };
}

export async function addTool(data: { name: string; toolId: string; toolType: string; totalInventory: number }) {
  await requireAuth({ allowedRoles: ["OWNER", "ADMIN", "STAFF"] });
  
  await prisma.tool.create({
    data: {
      name: data.name,
      toolId: data.toolId,
      toolType: data.toolType,
      totalInventory: data.totalInventory
    }
  });

  revalidatePath("/staff/tools");
}
