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
  revalidatePath("/staff/live");
  revalidatePath("/admin/live");
  revalidatePath("/admin/live/map");
}

export async function uploadDispatchPhotoAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.employeeId) throw new Error("Unauthorized");

  const dispatchId = formData.get("dispatchId") as string;
  const caption = formData.get("caption") as string | null;
  const file = formData.get("photo") as File | null;

  if (!dispatchId || !file) throw new Error("Missing required fields");

  // Mock Upload logic
  const mockUrl = "https://picsum.photos/seed/" + Math.random().toString(36).substring(7) + "/800/600";

  await prisma.dispatchPhoto.create({
    data: {
      dispatchId,
      uploadedById: session.user.employeeId,
      photoUrl: mockUrl,
      caption: caption || "Photo uploaded by driver",
    }
  });

  revalidatePath(`/driver/orders/${dispatchId}`);
}

export async function logTollAction(formData: FormData) {
  const session = await auth();
  if (!session?.user?.employeeId) throw new Error("Unauthorized");

  const empId     = session.user.employeeId;
  const vehicleId = formData.get("vehicleId") as string | null;
  const totalCost = parseFloat(formData.get("totalCost") as string);
  const dateStr   = formData.get("date") as string;
  const notes     = formData.get("notes") as string;

  if (!totalCost || !dateStr) throw new Error("Missing required fields");

  await prisma.expense.create({
    data: {
      loggerId: empId,
      amount: totalCost,
      category: "TRAVEL",
      date: new Date(dateStr),
      vehicleId: vehicleId || null,
      notes: notes || "Toll / Travel"
    }
  });

  revalidatePath("/driver/expenses");
}

export async function pingDriverLocationAction({
  dispatchId,
  latitude,
  longitude,
  accuracy,
  siteAddress,
}: {
  dispatchId?: string;
  latitude: number;
  longitude: number;
  accuracy?: number;
  siteAddress?: string;
}) {
  const session = await auth();
  if (!session?.user?.employeeId && !session?.user?.id) throw new Error("Unauthorized");

  const empId = session.user.employeeId || session.user.id;
  const employee = await prisma.employee.findFirst({
    where: {
      OR: [
        { id: empId },
        { userId: session.user.id || "" }
      ]
    }
  });

  if (!employee) throw new Error("Employee record not found");

  // 1. Record LocationPing telemetry
  const ping = await prisma.locationPing.create({
    data: {
      employeeId: employee.id,
      dispatchId: dispatchId || null,
      latitude: Number(latitude),
      longitude: Number(longitude),
      accuracy: accuracy ? Number(accuracy) : null,
      source: "DRIVER_APP",
      timestamp: new Date(),
    },
  });

  // 2. Update employee's live coordinates and status
  await prisma.employee.update({
    where: { id: employee.id },
    data: {
      lastLatitude: Number(latitude),
      lastLongitude: Number(longitude),
      lastLocationUpdate: new Date(),
      lastSyncStatus: "ONLINE",
    },
  });

  // 3. If dispatch is specified, sync mapLink or verify geofence distance
  let distanceMeters: number | null = null;
  if (dispatchId) {
    const dispatch = await prisma.dailyDispatch.findUnique({
      where: { id: dispatchId },
      select: { id: true, latitude: true, longitude: true, mapLink: true, status: true }
    });

    if (dispatch) {
      const gmapLink = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
      const updateData: any = {};
      if (!dispatch.mapLink) {
        updateData.mapLink = gmapLink;
      }
      if (!dispatch.latitude || !dispatch.longitude) {
        updateData.latitude = Number(latitude);
        updateData.longitude = Number(longitude);
      }

      if (dispatch.latitude && dispatch.longitude) {
        const R = 6371000;
        const toRad = (v: number) => (v * Math.PI) / 180;
        const dLat = toRad(Number(dispatch.latitude) - Number(latitude));
        const dLon = toRad(Number(dispatch.longitude) - Number(longitude));
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(toRad(Number(latitude))) *
          Math.cos(toRad(Number(dispatch.latitude))) *
          Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        distanceMeters = Math.round(R * c);
      }

      if (Object.keys(updateData).length > 0) {
        await prisma.dailyDispatch.update({
          where: { id: dispatchId },
          data: updateData,
        });
      }
    }

    revalidatePath(`/driver/orders/${dispatchId}`);
  }

  revalidatePath("/driver/home");
  revalidatePath("/staff/live");
  revalidatePath("/admin/live");
  revalidatePath("/admin/live/map");

  return {
    success: true,
    pingId: ping.id,
    timestamp: new Date().toISOString(),
    distanceMeters,
  };
}
