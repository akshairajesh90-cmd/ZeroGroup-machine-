"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/serverAuth";
import { Role, MachineType, MachineStatus, VehicleStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

// ==========================================
// MACHINES
// ==========================================

export async function createMachine(data: {
  machineId: string;
  type: MachineType;
  status: MachineStatus;
  operatorDailyPayout: number;
  fuelConsumptionThreshold: number;
}) {
  const { employeeId } = await requireAuth({ allowedRoles: [Role.OWNER, Role.STAFF] });

  // Validate unique Machine ID
  const existing = await prisma.machine.findUnique({ where: { machineId: data.machineId } });
  if (existing) throw new Error("A machine with this ID already exists.");

  const machine = await prisma.machine.create({
    data: {
      ...data,
    },
  });

  await prisma.auditLog.create({
    data: {
      actionType: "CREATE_MACHINE",
      entity: "MACHINE",
      actorRole: "ADMIN",
      newPayload: { id: machine.id, delta: data as any },
      actorId: employeeId
    }
  });

  revalidatePath("/admin/fleet");
  revalidatePath("/staff/fleet");
  return { success: true, machine };
}

export async function updateMachine(id: string, data: {
  machineId: string;
  type: MachineType;
  status: MachineStatus;
  operatorDailyPayout: number;
  fuelConsumptionThreshold: number;
}) {
  const auth = await requireAuth({ allowedRoles: [Role.OWNER, Role.STAFF] });
  
  const existingMachine = await prisma.machine.findUnique({ where: { id } });
  if (!existingMachine) throw new Error("Machine not found.");

  // RBAC for financial fields
  const isFinancialUpdate = 
    Number(existingMachine.operatorDailyPayout) !== data.operatorDailyPayout || 
    Number(existingMachine.fuelConsumptionThreshold) !== data.fuelConsumptionThreshold;
    
  if (isFinancialUpdate && auth.role !== Role.OWNER) {
    throw new Error("Only the OWNER can modify financial fields (Payout / Fuel Threshold).");
  }

  // Check ID collision if changing ID
  const collision = await prisma.machine.findUnique({ where: { machineId: data.machineId } });
  if (collision && collision.id !== id) {
    throw new Error("Another machine is already using this ID.");
  }

  const machine = await prisma.machine.update({
    where: { id },
    data,
  });

  await prisma.auditLog.create({
    data: {
      actionType: "UPDATE_MACHINE",
      entity: "MACHINE",
      actorRole: "ADMIN",
      newPayload: { id: machine.id, delta: data as any },
      actorId: auth.employeeId
    }
  });

  revalidatePath("/admin/fleet");
  revalidatePath("/staff/fleet");
  revalidatePath("/admin/dispatch");
  revalidatePath("/admin/live");
  return { success: true, machine };
}

export async function retireMachine(id: string) {
  const { employeeId } = await requireAuth({ allowedRoles: [Role.OWNER] });

  const machine = await prisma.machine.update({ 
    where: { id },
    data: { status: "RETIRED" }
  });

  await prisma.auditLog.create({
    data: {
      actionType: "RETIRE_MACHINE",
      entity: "MACHINE",
      actorRole: "ADMIN",
      newPayload: { id: machine.id, delta: { status: "RETIRED" } },
      actorId: employeeId
    }
  });

  revalidatePath("/admin/fleet");
  revalidatePath("/staff/fleet");
  revalidatePath("/admin/dispatch");
  revalidatePath("/admin/live");
  return { success: true };
}

export async function softDeleteMachine(id: string) {
  const { employeeId } = await requireAuth({ allowedRoles: [Role.OWNER, Role.ADMIN, Role.STAFF] });

  const machine = await prisma.machine.update({
    where: { id },
    data: {
      isPendingDelete: true,
      markedForDeleteBy: employeeId
    }
  });

  await prisma.auditLog.create({
    data: {
      actionType: "SOFT_DELETE_MACHINE",
      entity: "MACHINE",
      actorRole: "STAFF",
      newPayload: { id: machine.id, machineId: machine.machineId },
      actorId: employeeId
    }
  });

  revalidatePath("/staff/fleet");
  revalidatePath("/admin/fleet");
  revalidatePath("/admin/trash");
  return { success: true };
}

// ==========================================
// VEHICLES
// ==========================================

export async function createVehicle(data: {
  licensePlate: string;
  type: string;
  status: VehicleStatus;
}) {
  const { employeeId } = await requireAuth({ allowedRoles: [Role.OWNER, Role.STAFF] });

  const existing = await prisma.vehicle.findUnique({ where: { licensePlate: data.licensePlate } });
  if (existing) throw new Error("A vehicle with this License Plate already exists.");

  const vehicle = await prisma.vehicle.create({
    data: {
      ...data,
    },
  });

  await prisma.auditLog.create({
    data: {
      actionType: "CREATE_VEHICLE",
      entity: "VEHICLE",
      actorRole: "ADMIN",
      newPayload: { id: vehicle.id, delta: data as any },
      actorId: employeeId
    }
  });

  revalidatePath("/admin/fleet");
  revalidatePath("/staff/fleet");
  return { success: true, vehicle };
}

export async function updateVehicle(id: string, data: {
  licensePlate: string;
  type: string;
  status: VehicleStatus;
}) {
  const { employeeId } = await requireAuth({ allowedRoles: [Role.OWNER, Role.STAFF] });

  const existing = await prisma.vehicle.findUnique({ where: { licensePlate: data.licensePlate } });
  if (existing && existing.id !== id) {
    throw new Error("Another vehicle is already using this License Plate.");
  }

  const vehicle = await prisma.vehicle.update({
    where: { id },
    data,
  });

  await prisma.auditLog.create({
    data: {
      actionType: "UPDATE_VEHICLE",
      entity: "VEHICLE",
      actorRole: "ADMIN",
      newPayload: { id: vehicle.id, delta: data as any },
      actorId: employeeId
    }
  });

  revalidatePath("/admin/fleet");
  revalidatePath("/staff/fleet");
  revalidatePath("/admin/dispatch");
  revalidatePath("/admin/live");
  return { success: true, vehicle };
}

export async function retireVehicle(id: string) {
  const { employeeId } = await requireAuth({ allowedRoles: [Role.OWNER] });

  const vehicle = await prisma.vehicle.update({ 
    where: { id },
    data: { status: "RETIRED" }
  });

  await prisma.auditLog.create({
    data: {
      actionType: "RETIRE_VEHICLE",
      entity: "VEHICLE",
      actorRole: "ADMIN",
      newPayload: { id: vehicle.id, delta: { status: "RETIRED" } },
      actorId: employeeId
    }
  });

  revalidatePath("/admin/fleet");
  revalidatePath("/staff/fleet");
  revalidatePath("/admin/dispatch");
  revalidatePath("/admin/live");
  return { success: true };
}

export async function softDeleteVehicle(id: string) {
  const { employeeId } = await requireAuth({ allowedRoles: [Role.OWNER, Role.ADMIN, Role.STAFF] });

  const vehicle = await prisma.vehicle.update({
    where: { id },
    data: {
      isPendingDelete: true,
      markedForDeleteBy: employeeId
    }
  });

  await prisma.auditLog.create({
    data: {
      actionType: "SOFT_DELETE_VEHICLE",
      entity: "VEHICLE",
      actorRole: "STAFF",
      newPayload: { id: vehicle.id, licensePlate: vehicle.licensePlate },
      actorId: employeeId
    }
  });

  revalidatePath("/staff/fleet");
  revalidatePath("/admin/fleet");
  revalidatePath("/admin/trash");
  return { success: true };
}
