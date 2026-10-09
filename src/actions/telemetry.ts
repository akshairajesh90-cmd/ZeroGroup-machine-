"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { calculateHaversineDistance } from "@/lib/geo";

export async function pingLocation(dispatchId: string, currentLat: number, currentLng: number) {
  const session = await auth();
  if (!session) throw new Error("Unauthorized");

  return await prisma.$transaction(async (tx: any) => {
    const driverEmp = await tx.employee.findUnique({
      where: { userId: session.user?.id || "" },
    });

    // 1. Log the ping
    const ping = await tx.locationPing.create({
      data: {
        employeeId: driverEmp?.id || "unknown",
        dispatchId,
        latitude: currentLat,
        longitude: currentLng,
        source: "CAPACITOR",
      },
    });

    // 2. Fetch dispatch to check geofence
    const dispatch = await tx.dailyDispatch.findUnique({
      where: { id: dispatchId },
    });

    if (
      dispatch &&
      dispatch.status === "EN_ROUTE" &&
      dispatch.latitude &&
      dispatch.longitude
    ) {
      // 3. Calculate distance
      const distance = calculateHaversineDistance(
        currentLat,
        currentLng,
        Number(dispatch.latitude),
        Number(dispatch.longitude)
      );

      // 4. Auto-transition if within 500 meters
      if (distance <= 500) {
        await tx.dailyDispatch.update({
          where: { id: dispatchId },
          data: {
            status: "IN_PROGRESS",
            deliveredAt: new Date(),
          },
        });

        // 5. Audit Log
        await tx.auditLog.create({
          data: {
            actorId: driverEmp?.id || "SYSTEM",
            actorRole: session.user?.role || "ADMIN",
            actionType: "UPDATE",
            modelName: "DailyDispatch",
            oldPayload: JSON.stringify({ status: "EN_ROUTE" }),
            newPayload: JSON.stringify({ status: "IN_PROGRESS", distance }),
          },
        });
      }
    }

    return { success: true, pingId: ping.id };
  });
}

