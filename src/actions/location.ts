"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/serverAuth";

export async function updateEmployeeLocation(latitude: number, longitude: number) {
  try {
    const { employeeId } = await requireAuth();
    if (!employeeId) return { success: false, error: "No employee linked to user" };

    await prisma.employee.update({
      where: { id: employeeId },
      data: {
        lastLatitude: latitude,
        lastLongitude: longitude,
        lastLocationUpdate: new Date(),
        lastSeenAt: new Date()
      }
    });
    return { success: true };
  } catch (err: any) {
    console.error("Failed to update location:", err);
    return { success: false, error: err.message };
  }
}

export async function updateDispatchLocation(dispatchId: string, latitude: number, longitude: number) {
  try {
    const { employeeId } = await requireAuth();
    if (!employeeId) return { success: false, error: "Unauthorized" };

    const mapLink = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;

    await prisma.dailyDispatch.update({
      where: { id: dispatchId },
      data: {
        latitude,
        longitude,
        mapLink
      }
    });

    return { success: true, mapLink };
  } catch (err: any) {
    console.error("Failed to update dispatch location:", err);
    return { success: false, error: err.message };
  }
}
