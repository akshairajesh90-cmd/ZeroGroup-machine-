"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/serverAuth";
import { Role, MaintenanceStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function createMaintenanceTicket(data: {
  machineId?: string;
  vehicleId?: string;
  issueDescription: string;
}) {
  const { employeeId } = await requireAuth({ allowedRoles: [Role.OWNER, Role.ADMIN, Role.STAFF] });

  const result = await prisma.$transaction(async (tx) => {
    const ticket = await tx.maintenanceTicket.create({ data });

    if (data.machineId) {
      await tx.machine.update({
        where: { id: data.machineId },
        data: { status: "REPAIR" }
      });
    } else if (data.vehicleId) {
      await tx.vehicle.update({
        where: { id: data.vehicleId },
        data: { status: "REPAIR" }
      });
    }

    await tx.auditLog.create({
      data: {
        entity: "MAINTENANCE_TICKET",
        entityId: ticket.id,
        action: "CREATE_AND_LOCK_ASSET",
        delta: data as any,
        actorId: employeeId
      }
    });

    return ticket;
  });

  revalidatePath("/admin/fleet");
  revalidatePath("/admin/fleet/expenses");
  return { success: true, ticket: result };
}

export async function resolveMaintenanceTicket(id: string, data: {
  partsCost: number;
  laborCost: number;
  mechanicName?: string;
}) {
  const { employeeId } = await requireAuth({ allowedRoles: [Role.OWNER, Role.ADMIN] });

  const result = await prisma.$transaction(async (tx) => {
    const existingTicket = await tx.maintenanceTicket.findUniqueOrThrow({ where: { id } });

    // 1. Resolve Ticket
    const ticket = await tx.maintenanceTicket.update({
      where: { id },
      data: {
        status: MaintenanceStatus.RESOLVED,
        resolvedAt: new Date(),
        partsCost: data.partsCost,
        laborCost: data.laborCost,
        mechanicName: data.mechanicName
      }
    });

    // 2. Strict State Sync: Only release if currently REPAIR (Prevent Zombie Asset Resurrection)
    if (existingTicket.machineId) {
      const machine = await tx.machine.findUniqueOrThrow({ where: { id: existingTicket.machineId } });
      if (machine.status === "REPAIR") {
        await tx.machine.update({
          where: { id: existingTicket.machineId },
          data: { status: "AVAILABLE" }
        });
      }
    } else if (existingTicket.vehicleId) {
      const vehicle = await tx.vehicle.findUniqueOrThrow({ where: { id: existingTicket.vehicleId } });
      if (vehicle.status === "REPAIR") {
        await tx.vehicle.update({
          where: { id: existingTicket.vehicleId },
          data: { status: "AVAILABLE" }
        });
      }
    }

    await tx.auditLog.create({
      data: {
        entity: "MAINTENANCE_TICKET",
        entityId: ticket.id,
        action: "RESOLVE_AND_FREE_ASSET",
        delta: { ...data, status: "RESOLVED" } as any,
        actorId: employeeId
      }
    });

    return ticket;
  });

  revalidatePath("/admin/fleet");
  revalidatePath("/admin/fleet/expenses");
  return { success: true, ticket: result };
}

export async function addFuelLog(data: {
  machineId?: string;
  vehicleId?: string;
  liters: number;
  totalCost: number;
  odometerReading?: number;
  receiptUrl: string;
  localDateString: string; // e.g. "2026-07-25" (Strict YYYY-MM-DD from client UI)
}) {
  const { employeeId } = await requireAuth({ allowedRoles: [Role.OWNER, Role.ADMIN, Role.STAFF, Role.DRIVER] });

  // Fix Prisma @db.Date Shift: Append T00:00:00.000Z to lock the exact local date at UTC midnight
  const safeDate = new Date(`${data.localDateString}T00:00:00.000Z`);

  const result = await prisma.$transaction(async (tx) => {
    const log = await tx.fuelLog.create({
      data: {
        machineId: data.machineId,
        vehicleId: data.vehicleId,
        liters: data.liters,
        totalCost: data.totalCost,
        odometerReading: data.odometerReading,
        receiptUrl: data.receiptUrl,
        date: safeDate,
        driverId: employeeId
      }
    });

    await tx.auditLog.create({
      data: {
        entity: "FUEL_LOG",
        entityId: log.id,
        action: "CREATE",
        delta: data as any,
        actorId: employeeId
      }
    });

    return log;
  });

  revalidatePath("/admin/fleet");
  revalidatePath("/admin/fleet/expenses");
  return { success: true, log: result };
}
