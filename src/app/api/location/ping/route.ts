import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthForApi } from "@/lib/serverAuth";
import { checkRateLimit } from "@/lib/rate-limiter";

function calculateDistanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Radius of Earth in meters
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

interface IncomingPing {
  employeeId?: string;
  dispatchId?: string | null;
  latitude: number | string;
  longitude: number | string;
  accuracy?: number | null;
  altitude?: number | null;
  speed?: number | null;
  heading?: number | null;
  timestamp?: number | string | Date;
  source?: string;
  sessionId?: string | null;
  seq?: number | null;
}

export async function POST(request: Request) {
  try {
    // 1. Session Authentication
    const { ctx, response } = await requireAuthForApi();
    if (response) return response;
    if (!ctx) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 2. Sliding-window Rate Limiter (60 requests per minute per user)
    const rateLimitKey = `loc_ping_${ctx.userId}`;
    if (!checkRateLimit(rateLimitKey, 60, 60000)) {
      return NextResponse.json({ error: "Too many telemetry requests" }, { status: 429 });
    }

    const body = await request.json();
    const rawPings: IncomingPing[] = Array.isArray(body?.pings) ? body.pings : [body];

    // Filter valid pings
    const validPings = rawPings.filter(
      (p) =>
        p &&
        p.latitude !== undefined &&
        p.latitude !== null &&
        p.longitude !== undefined &&
        p.longitude !== null
    );

    if (validPings.length === 0) {
      return NextResponse.json({ error: "Missing required location coordinates" }, { status: 400 });
    }

    // 3. Monotonic Sequence Sorting (Sort strictly by seq ASC, fallback to timestamp ASC)
    validPings.sort((a, b) => {
      if (a.seq !== undefined && a.seq !== null && b.seq !== undefined && b.seq !== null) {
        return Number(a.seq) - Number(b.seq);
      }
      const tA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
      const tB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
      return tA - tB;
    });

    // Determine target employee
    const targetEmployeeId = validPings[0].employeeId || ctx.employeeId;

    // 4. ATOMIC TRANSACTION: Ingest pings, update employee live cache, and evaluate forward-only geofence
    const result = await prisma.$transaction(async (tx) => {
      const emp = await tx.employee.findUnique({
        where: { id: targetEmployeeId },
      });

      if (!emp) {
        throw new Error(`Target employee not found: ${targetEmployeeId}`);
      }

      // Bulk create LocationPing records
      const pingData = validPings.map((p) => ({
        employeeId: targetEmployeeId,
        dispatchId: p.dispatchId || null,
        latitude: Number(p.latitude),
        longitude: Number(p.longitude),
        accuracy: p.accuracy !== undefined && p.accuracy !== null ? Number(p.accuracy) : null,
        altitude: p.altitude !== undefined && p.altitude !== null ? Number(p.altitude) : null,
        speed: p.speed !== undefined && p.speed !== null ? Number(p.speed) : null,
        timestamp: p.timestamp ? new Date(p.timestamp) : new Date(),
        source: p.source || "BROWSER",
        sessionId: p.sessionId || null,
        seq: p.seq !== undefined && p.seq !== null ? Number(p.seq) : null,
      }));

      await tx.locationPing.createMany({
        data: pingData,
      });

      // Update employee live coordinates from the latest ping
      const latestPing = validPings[validPings.length - 1];
      const latestTimestamp = latestPing.timestamp ? new Date(latestPing.timestamp) : new Date();

      await tx.employee.update({
        where: { id: targetEmployeeId },
        data: {
          lastLatitude: Number(latestPing.latitude),
          lastLongitude: Number(latestPing.longitude),
          lastLocationUpdate: latestTimestamp,
          lastSeenAt: new Date(),
          lastSyncStatus: "ONLINE",
        },
      });

      // 5. Autopilot Geofence Automation with STRICT FORWARD-ONLY State Transition
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const activeDispatch = await tx.dailyDispatch.findFirst({
        where: {
          driverId: targetEmployeeId,
          dateOfService: { gte: todayStart },
          isPendingDelete: false,
          status: { in: ["PENDING", "ACCEPTED", "EN_ROUTE", "IN_PROGRESS"] },
        },
        orderBy: { updatedAt: "desc" },
      });

      if (activeDispatch) {
        const currentStatus = activeDispatch.status;
        const curLat = Number(latestPing.latitude);
        const curLng = Number(latestPing.longitude);
        const curSpeed = latestPing.speed ? Number(latestPing.speed) : 0;

        // Trigger 1: PENDING / ACCEPTED -> EN_ROUTE (Yard exit > 250m, speed >= 15 km/h)
        if (["PENDING", "ACCEPTED"].includes(currentStatus) && curSpeed >= 15) {
          const settings = await tx.systemSettings.findFirst();
          const yardLat = settings?.storeLatitude ? Number(settings.storeLatitude) : 9.5916;
          const yardLng = settings?.storeLongitude ? Number(settings.storeLongitude) : 76.5222;

          const distFromYard = calculateDistanceMeters(yardLat, yardLng, curLat, curLng);
          if (distFromYard > 250) {
            await tx.dailyDispatch.update({
              where: { id: activeDispatch.id },
              data: { status: "EN_ROUTE" },
            });

            await tx.dispatchStatusHistory.create({
              data: {
                dispatchId: activeDispatch.id,
                oldStatus: currentStatus,
                newStatus: "EN_ROUTE",
                changedById: targetEmployeeId,
                reason: `Auto-Departed Store Yard (${Math.round(distFromYard)}m from yard, ${curSpeed} km/h)`,
              },
            });

            if (activeDispatch.vehicleId) {
              await tx.vehicle.update({
                where: { id: activeDispatch.vehicleId },
                data: { status: "IN_USE" },
              });

              const existingShift = await tx.shiftLog.findFirst({
                where: { driverId: targetEmployeeId, endTime: null },
              });
              if (!existingShift) {
                await tx.shiftLog.create({
                  data: {
                    driverId: targetEmployeeId,
                    vehicleId: activeDispatch.vehicleId,
                    date: new Date(),
                    startTime: latestTimestamp,
                  },
                });
              }
            }
          }
        }
        // Trigger 2: EN_ROUTE -> IN_PROGRESS (Customer site arrival <= 100m)
        else if (currentStatus === "EN_ROUTE" && activeDispatch.latitude && activeDispatch.longitude) {
          const distToSite = calculateDistanceMeters(
            Number(activeDispatch.latitude),
            Number(activeDispatch.longitude),
            curLat,
            curLng
          );

          if (distToSite <= 100) {
            await tx.dailyDispatch.update({
              where: { id: activeDispatch.id },
              data: { status: "IN_PROGRESS", isCentroidVerified: true },
            });

            await tx.dispatchStatusHistory.create({
              data: {
                dispatchId: activeDispatch.id,
                oldStatus: "EN_ROUTE",
                newStatus: "IN_PROGRESS",
                changedById: targetEmployeeId,
                reason: `Auto-Arrived On Site (${Math.round(distToSite)}m from customer site)`,
              },
            });
          }
        }
        // FORWARD-ONLY GUARD:
        // If currentStatus is already IN_PROGRESS or DELIVERED, ignore older yard pings. Never regress status!
      }

      return { count: validPings.length };
    });

    // Return minimal HTTP 200 JSON response
    return NextResponse.json({ success: true, count: result.count });
  } catch (error: any) {
    console.error("Telemetry ping error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to process location telemetry" },
      { status: 500 }
    );
  }
}
