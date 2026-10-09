"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/serverAuth";
import { revalidatePath } from "next/cache";
import { DocumentType } from "@prisma/client";

// --- MAINTENANCE ACTIONS ---

export async function createMaintenanceTicket(data: {
  assetId: string;
  assetType: "MACHINE" | "VEHICLE";
  issueDescription: string;
}) {
  const currentUser = await requireAuth({ allowedRoles: ["OWNER", "ADMIN", "STAFF"] });

  try {
    const ticket = await prisma.$transaction(async (tx) => {
      const created = await tx.maintenanceTicket.create({
        data: {
          machineId: data.assetType === "MACHINE" ? data.assetId : null,
          vehicleId: data.assetType === "VEHICLE" ? data.assetId : null,
          issueDescription: data.issueDescription,
          mechanicName: "Pending Assignment",
          status: "OPEN",
          partsCost: 0,
          laborCost: 0,
        }
      });

      // Put asset into REPAIR status
      if (data.assetType === "MACHINE") {
        await tx.machine.update({ where: { id: data.assetId }, data: { status: "REPAIR" } });
      } else {
        await tx.vehicle.update({ where: { id: data.assetId }, data: { status: "REPAIR" } });
      }
      return created;
    });

    revalidatePath("/staff/fleet");
    revalidatePath(`/staff/fleet/${data.assetType.toLowerCase()}/${data.assetId}`);
    return { success: true, data: ticket };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function closeMaintenanceTicket(id: string, data: {
  mechanicName: string;
  partsCost: number;
  laborCost: number;
  resolutionNotes: string;
}) {
  const currentUser = await requireAuth({ allowedRoles: ["OWNER", "ADMIN", "STAFF"] });

  try {
    await prisma.$transaction(async (tx) => {
      const ticket = await tx.maintenanceTicket.update({
        where: { id },
        data: {
          mechanicName: data.mechanicName,
          partsCost: data.partsCost,
          laborCost: data.laborCost,
          status: "RESOLVED",
          resolvedAt: new Date(),
        }
      });

      // Automatically generate the Financial Expense
      const totalCost = Number(data.partsCost) + Number(data.laborCost);
      if (totalCost > 0) {
        await tx.expense.create({
          data: {
            loggerId: currentUser.employeeId!,
            amount: totalCost,
            category: "REPAIR",
            description: `Repair Ticket #${id.slice(-6)}: ${data.resolutionNotes}`,
            machineId: ticket.machineId,
            vehicleId: ticket.vehicleId,
            date: new Date(),
          }
        });
      }

      // Mark asset AVAILABLE
      if (ticket.machineId) {
        await tx.machine.update({ where: { id: ticket.machineId }, data: { status: "AVAILABLE" } });
      } else if (ticket.vehicleId) {
        await tx.vehicle.update({ where: { id: ticket.vehicleId }, data: { status: "AVAILABLE" } });
      }
    });

    revalidatePath("/staff/fleet");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// --- FUEL ACTIONS ---

export async function logStaffFuel(data: {
  assetId: string;
  assetType: "MACHINE" | "VEHICLE";
  liters: number;
  totalCost: number;
  odometerReading?: number;
  date: string;
}) {
  const currentUser = await requireAuth({ allowedRoles: ["OWNER", "ADMIN", "STAFF"] });

  try {
    await prisma.$transaction(async (tx) => {
      await tx.fuelLog.create({
        data: {
          driverId: currentUser.employeeId, // Logged by staff
          machineId: data.assetType === "MACHINE" ? data.assetId : null,
          vehicleId: data.assetType === "VEHICLE" ? data.assetId : null,
          liters: data.liters,
          totalCost: data.totalCost,
          odometerReading: data.odometerReading,
          receiptUrl: "placeholder",
          date: new Date(data.date),
        }
      });

      // Sync with Expenses
      await tx.expense.create({
        data: {
          loggerId: currentUser.employeeId!,
          amount: data.totalCost,
          category: "DIESEL",
          description: `Diesel filled: ${data.liters}L${data.odometerReading ? ` (Odo: ${data.odometerReading})` : ""}`,
          machineId: data.assetType === "MACHINE" ? data.assetId : null,
          vehicleId: data.assetType === "VEHICLE" ? data.assetId : null,
          date: new Date(data.date),
        }
      });
    });

    revalidatePath(`/staff/fleet/${data.assetType.toLowerCase()}/${data.assetId}`);
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// --- DOCUMENT ACTIONS (Vehicles) ---

export async function uploadVehicleDocument(data: {
  vehicleId: string;
  type: DocumentType;
  documentNumber: string;
  issueDate: string;
  expiryDate: string;
}) {
  await requireAuth({ allowedRoles: ["OWNER", "ADMIN", "STAFF"] });

  try {
    const doc = await prisma.vehicleDocument.create({
      data: {
        vehicleId: data.vehicleId,
        type: data.type,
        documentNumber: data.documentNumber,
        issueDate: new Date(data.issueDate),
        expiryDate: new Date(data.expiryDate),
        attachmentUrl: "placeholder", // File upload logic omitted for scope
      }
    });

    revalidatePath(`/staff/fleet/vehicle/${data.vehicleId}`);
    return { success: true, data: doc };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
