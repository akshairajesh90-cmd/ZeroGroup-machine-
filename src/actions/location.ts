"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { evaluateSiteDwellCluster, TelemetryPing } from "@/lib/gis/dwellClusterFilter";

function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Radius of the Earth in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export async function updateEmployeeLocation(
  latitude: number,
  longitude: number,
  accuracy?: number,
  source?: string,
  speed?: number | null,
  heading?: number | null,
  clientTimestamp?: number
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

    const now = clientTimestamp ? new Date(clientTimestamp) : new Date();

    // 1. Fetch the latest recorded ping for displacement and time diff
    const lastPing = await prisma.locationPing.findFirst({
      where: { employeeId: employee.id },
      orderBy: { timestamp: "desc" },
      select: { latitude: true, longitude: true, timestamp: true, speed: true },
    });

    let displacementMeters = 999999;
    let secondsSinceLastPing = 999999;
    if (lastPing) {
      displacementMeters = calculateDistanceMeters(
        Number(lastPing.latitude),
        Number(lastPing.longitude),
        latitude,
        longitude
      );
      secondsSinceLastPing = (now.getTime() - lastPing.timestamp.getTime()) / 1000;
    }

    // 2. Jitter & Spike Filter:
    // Drop fake GPS bounce if displacement is under 5m and speed is under 3 km/h
    const currentSpeed = speed !== undefined && speed !== null ? Number(speed) : 0;
    if (lastPing && displacementMeters < 5 && currentSpeed < 3 && secondsSinceLastPing < 120) {
      // Just refresh online status without database bloat
      await prisma.employee.update({
        where: { id: employee.id },
        data: { lastSeenAt: now, lastSyncStatus: "ONLINE" },
      });
      return { success: true, filtered: true, reason: "JITTER_FILTER" };
    }

    // Drop impossible GPS jumps (teleportation > 140 km/h)
    if (lastPing && secondsSinceLastPing > 1 && secondsSinceLastPing < 60) {
      const calculatedSpeedKmH = (displacementMeters / secondsSinceLastPing) * 3.6;
      if (calculatedSpeedKmH > 140) {
        console.warn(`[GPS Filter] Dropped glitch jump of ${displacementMeters}m in ${secondsSinceLastPing}s (${calculatedSpeedKmH.toFixed(1)} km/h)`);
        return { success: true, filtered: true, reason: "SPEED_GLITCH" };
      }
    }

    // Determine if this ping should be inserted into historical LocationPing
    // Rule: First ping, OR displacement >= 35m, OR >= 120 seconds elapsed, OR major speed change
    const shouldInsertPing =
      !lastPing ||
      displacementMeters >= 35 ||
      secondsSinceLastPing >= 120 ||
      (currentSpeed > 10 && secondsSinceLastPing >= 30);

    // Fetch active dispatch to link if available
    const activeDispatch = await prisma.dailyDispatch.findFirst({
      where: {
        OR: [
          { driverId: employee.id },
          { operatorId: employee.id },
          { siteLeaderEmployeeId: employee.id },
        ],
        status: { in: ["EN_ROUTE", "IN_PROGRESS", "DELIVERED"] },
      },
      orderBy: { updatedAt: "desc" },
    });

    // 3. ATOMIC TRANSACTION: In-place Employee Live state + Conditional LocationPing
    await prisma.$transaction(async (tx) => {
      await tx.employee.update({
        where: { id: employee.id },
        data: {
          lastLatitude: latitude,
          lastLongitude: longitude,
          lastLocationUpdate: now,
          lastSeenAt: now,
          lastSyncStatus: "ONLINE",
        },
      });

      if (shouldInsertPing) {
        await tx.locationPing.create({
          data: {
            employeeId: employee.id,
            dispatchId: activeDispatch?.id || null,
            latitude,
            longitude,
            accuracy: accuracy ? Number(accuracy) : null,
            speed: currentSpeed > 0 ? currentSpeed : null,
            source: source || "BROWSER",
            timestamp: now,
          },
        });
      }
    });

    // 3. Stage 3 Kerala GIS: Passive Dwell & Centroid Verification for active jobs
    try {
      const activeDispatch = await prisma.dailyDispatch.findFirst({
        where: {
          OR: [
            { driverId: employee.id },
            { operatorId: employee.id },
            { siteLeaderEmployeeId: employee.id },
          ],
          status: { in: ["EN_ROUTE", "IN_PROGRESS", "DELIVERED"] },
          isCentroidVerified: false,
        },
        orderBy: { updatedAt: "desc" },
      });

      if (activeDispatch) {
        // Query recent telemetry pings within the last 20 minutes
        const twentyMinsAgo = new Date(Date.now() - 20 * 60 * 1000);
        const recentPings = await prisma.locationPing.findMany({
          where: {
            employeeId: employee.id,
            timestamp: { gte: twentyMinsAgo },
          },
          orderBy: { timestamp: "asc" },
        });

        if (recentPings.length >= 3) {
          const telemetryPings: TelemetryPing[] = recentPings.map((p) => ({
            latitude: Number(p.latitude),
            longitude: Number(p.longitude),
            timestamp: p.timestamp,
            accuracy: p.accuracy ? Number(p.accuracy) : null,
          }));

          const evalResult = evaluateSiteDwellCluster(telemetryPings, {
            isOperationallyActive: ["IN_PROGRESS", "DELIVERED"].includes(activeDispatch.status),
          });

          if (evalResult.isVerified && evalResult.centroid) {
            const [cLat, cLng] = evalResult.centroid;
            await prisma.dailyDispatch.update({
              where: { id: activeDispatch.id },
              data: {
                latitude: cLat,
                longitude: cLng,
                mapLink: `https://www.google.com/maps/search/?api=1&query=${cLat},${cLng}`,
                isCentroidVerified: true,
                dwellConfidence: evalResult.confidence,
                dwellDurationMins: evalResult.durationMinutes,
              },
            });

            await prisma.siteDwellCluster.create({
              data: {
                dispatchId: activeDispatch.id,
                employeeId: employee.id,
                latitude: cLat,
                longitude: cLng,
                clusterRadiusM: evalResult.clusterRadiusMeters,
                durationMins: evalResult.durationMinutes,
                pingCount: evalResult.pingCount,
                confidence: evalResult.confidence,
                isVerified: true,
              },
            });
          }
        }
      }
    } catch (gisErr) {
      console.warn("[KeralaGIS] Dwell cluster check non-blocking error:", gisErr);
    }

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
