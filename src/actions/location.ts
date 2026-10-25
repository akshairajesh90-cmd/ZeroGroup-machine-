"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export async function updateEmployeeLocation(
  latitude: number,
  longitude: number,
  accuracy?: number,
  source?: string
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthenticated" };
    }

    const empId = session.user.employeeId;
    const employee = await prisma.employee.findFirst({
      where: {
        OR: [
          ...(empId ? [{ id: empId }] : []),
          { userId: session.user.id },
          ...(session.user.email ? [{ user: { email: session.user.email } }] : [])
        ],
      },
    });

    if (!employee) {
      return { success: false, error: "No employee profile found for user" };
    }

    const now = new Date();

    // 1. Update Employee record for LiveMap markers and status
    await prisma.employee.update({
      where: { id: employee.id },
      data: {
        lastLatitude: latitude,
        lastLongitude: longitude,
        lastLocationUpdate: now,
        lastSeenAt: now,
        lastSyncStatus: "ONLINE",
      },
    });

    // 2. Insert into LocationPing for telemetry trail & live breadcrumbs
    await prisma.locationPing.create({
      data: {
        employeeId: employee.id,
        latitude,
        longitude,
        accuracy: accuracy ? Number(accuracy) : null,
        source: source || "BROWSER",
        timestamp: now,
      },
    });

    return { success: true };
  } catch (err: any) {
    console.error("Failed to update employee location:", err);
    return { success: false, error: err.message };
  }
}

export async function updateDispatchLocation(
  dispatchId: string,
  latitude: number,
  longitude: number,
  accuracy?: number
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const mapLink = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    const now = new Date();

    // 1. Update Dispatch coordinates and Google Maps link
    await prisma.dailyDispatch.update({
      where: { id: dispatchId },
      data: {
        latitude,
        longitude,
        mapLink,
      },
    });

    // 2. Also update the reporting employee's coordinates (they are physically at the site)
    const empId = session.user.employeeId;
    const employee = await prisma.employee.findFirst({
      where: {
        OR: [
          ...(empId ? [{ id: empId }] : []),
          { userId: session.user.id },
        ],
      },
    });

    if (employee) {
      await prisma.employee.update({
        where: { id: employee.id },
        data: {
          lastLatitude: latitude,
          lastLongitude: longitude,
          lastLocationUpdate: now,
          lastSeenAt: now,
          lastSyncStatus: "ONLINE",
        },
      });

      await prisma.locationPing.create({
        data: {
          employeeId: employee.id,
          dispatchId,
          latitude,
          longitude,
          accuracy: accuracy ? Number(accuracy) : null,
          source: "SITE_UPDATE",
          timestamp: now,
        },
      });
    }

    return { success: true, mapLink };
  } catch (err: any) {
    console.error("Failed to update dispatch location:", err);
    return { success: false, error: err.message };
  }
}

export async function adminPingEmployeeLocation(
  employeeId: string,
  latitude?: number,
  longitude?: number
) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthenticated" };
    }

    const allowedRoles = ["ADMIN", "OWNER", "STAFF"];
    if (!allowedRoles.includes(session.user.role)) {
      return { success: false, error: "Unauthorized" };
    }

    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    });

    if (!employee) {
      return { success: false, error: "Employee not found" };
    }

    const now = new Date();
    // Default to provided coords, or existing coords (or depot fallback)
    const targetLat = latitude ?? (employee.lastLatitude ? Number(employee.lastLatitude) : 9.5915);
    const targetLng = longitude ?? (employee.lastLongitude ? Number(employee.lastLongitude) : 76.5234);

    await prisma.employee.update({
      where: { id: employeeId },
      data: {
        lastLatitude: targetLat,
        lastLongitude: targetLng,
        lastLocationUpdate: now,
        lastSeenAt: now,
        lastSyncStatus: "ONLINE",
      },
    });

    await prisma.locationPing.create({
      data: {
        employeeId: employee.id,
        latitude: targetLat,
        longitude: targetLng,
        accuracy: 8,
        source: "ADMIN_REFRESH",
        timestamp: now,
      },
    });

    revalidatePath("/admin/live/map");
    revalidatePath("/staff/live/map");

    return {
      success: true,
      lastUpdate: now.toISOString(),
      latitude: targetLat,
      longitude: targetLng,
    };
  } catch (err: any) {
    console.error("Failed to admin-ping employee location:", err);
    return { success: false, error: err.message };
  }
}
