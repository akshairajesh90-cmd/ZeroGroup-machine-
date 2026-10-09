"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export async function logFuelAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.employeeId) throw new Error("Unauthorized");

  const empId     = session.user.employeeId;
  const machineId = formData.get("machineId") as string | null;
  const vehicleId = formData.get("vehicleId") as string | null;
  const liters    = parseFloat(formData.get("liters") as string);
  const totalCost = parseFloat(formData.get("totalCost") as string);
  const odometer  = formData.get("odometer") ? parseInt(formData.get("odometer") as string) : undefined;
  const dateStr   = formData.get("date") as string;

  if (!liters || !totalCost || !dateStr) throw new Error("Missing required fields");

  await prisma.$transaction(async (tx) => {
    // 1. Log the Fuel
    await tx.fuelLog.create({
      data: {
        driverId: empId,
        machineId: machineId || null,
        vehicleId: vehicleId || null,
        liters,
        totalCost,
        odometerReading: odometer,
        receiptUrl: "physical-receipt",
        date: new Date(dateStr),
      },
    });

    // 2. Automatically sync to the Global Expenses Tab
    await tx.expense.create({
      data: {
        loggerId: empId, // Driver who logged it
        amount: totalCost,
        category: "DIESEL",
        description: `Diesel filled: ${liters}L${odometer ? ` (Odo: ${odometer})` : ""}`,
        date: new Date(dateStr),
        machineId: machineId || null,
        vehicleId: vehicleId || null,
      }
    });
  });

  revalidatePath("/driver/expenses");
}

export async function reportBreakdownAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.employeeId) throw new Error("Unauthorized");

  const machineId   = formData.get("machineId") as string;
  const description = formData.get("description") as string;

  if (!machineId || !description) throw new Error("Missing required fields");

  await prisma.$transaction([
    prisma.maintenanceTicket.create({
      data: {
        machineId,
        issueDescription: description,
        mechanicName: "Pending Assignment",
        partsCost: 0,
        laborCost: 0,
        status: "OPEN",
      },
    }),
    prisma.machine.update({
      where: { id: machineId },
      data: { status: "REPAIR" },
    }),
  ]);

  revalidatePath("/driver/portal");
}

export async function updateDispatchMapLinkAction(dispatchId: string, mapLink: string, lat?: number, lng?: number) {
  const session = await auth();
  if (!session?.user?.employeeId) throw new Error("Unauthorized");

  await prisma.dailyDispatch.update({
    where: { id: dispatchId },
    data: { 
      mapLink,
      latitude: lat ? Number(lat) : null,
      longitude: lng ? Number(lng) : null
    },
  });

  revalidatePath(`/driver/orders/${dispatchId}`);
}
