"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/serverAuth";
import { revalidatePath } from "next/cache";

export async function startShiftAction(vehicleId: string) {
  const { employeeId } = await requireAuth();

  if (!vehicleId) throw new Error("A vehicle must be selected.");

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Get the vehicle and lock it
      const vehicle = await tx.vehicle.findUnique({
        where: { id: vehicleId }
      });
      if (!vehicle) throw new Error("Vehicle not found.");
      if (vehicle.status !== "AVAILABLE") throw new Error("This vehicle is no longer available.");

      // 2. Mark vehicle IN_USE
      await tx.vehicle.update({
        where: { id: vehicleId },
        data: { status: "IN_USE" }
      });

      // 3. Create the shift
      const shift = await tx.shiftLog.create({
        data: {
          driverId: employeeId,
          vehicleId: vehicle.id,
          date: new Date(),
          startTime: new Date(),
        },
      });

    // 3. Audit log
    await tx.auditLog.create({
      data: {
        actionType: "SHIFT_START",
        entity: "ShiftLog",
        actorId: employeeId,
        actorRole: "DRIVER",
        newPayload: { shiftId: shift.id, detail: "Driver clocked in from mobile dashboard" },
      },
    });
    });
  } catch (err: any) {
    if (err.code === 'P2028' || err.code === 'P2034' || err.message.includes("no longer available")) {
      // Return a friendly payload without crashing the server
      return { success: false, error: "Sorry, another driver just claimed this vehicle. Please select another." };
    }
    console.error("Error starting shift:", err);
    return { success: false, error: "Failed to start shift." };
  }

  revalidatePath("/driver/home");
  return { success: true };
}

export async function endShiftAction(shiftId: string) {
  const { employeeId } = await requireAuth();

  await prisma.$transaction(async (tx) => {
    const shiftLog = await tx.shiftLog.findUnique({ where: { id: shiftId } });
    if (!shiftLog) throw new Error("Shift not found");

    const endTime = new Date();
    const durationMs = endTime.getTime() - shiftLog.startTime.getTime();
    const durationHours = durationMs / (1000 * 60 * 60);

    const requiresOfficeApproval = durationHours > 14;

    // 1. Update the shift
    const shift = await tx.shiftLog.update({
      where: { id: shiftId },
      data: { 
        endTime: endTime,
      },
    });

    // 2. Release the vehicle
    await tx.vehicle.update({
      where: { id: shift.vehicleId },
      data: { status: "AVAILABLE" }
    });

    // 2. Audit log
    await tx.auditLog.create({
      data: {
        actionType: "SHIFT_END",
        entity: "ShiftLog",
        actorId: employeeId,
        actorRole: "DRIVER",
        newPayload: { shiftId, detail: "Driver clocked out of shift" },
      },
    });
  });

  revalidatePath("/driver/home");
}
