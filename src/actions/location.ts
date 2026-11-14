"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { evaluateSiteDwellCluster, TelemetryPing } from "@/lib/gis/dwellClusterFilter";
import { logAudit } from "@/lib/auditLogger";
import { Role } from "@prisma/client";

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

    const currentSpeed = speed !== undefined && speed !== null ? Number(speed) : 0;

    // 2. Drop impossible GPS jumps (teleportation > 140 km/h)
    if (lastPing && secondsSinceLastPing > 1 && secondsSinceLastPing < 60) {
      const calculatedSpeedKmH = (displacementMeters / secondsSinceLastPing) * 3.6;
      if (calculatedSpeedKmH > 140) {
        console.warn(`[GPS Filter] Dropped glitch jump of ${displacementMeters}m in ${secondsSinceLastPing}s (${calculatedSpeedKmH.toFixed(1)} km/h)`);
        return { success: true, filtered: true, reason: "SPEED_GLITCH" };
      }
    }

    // 3. Always update live Employee location in-place
    // Live Map reads employee.lastLatitude/lastLongitude so stationary workers never vanish or show stale
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

    // 4. Stationary Filter with 10-Minute Cadence (User Decision Q2):
    // In rubber estates/rural Kerala, tree canopy GPS jitter is 5-25m.
    // When stationary (displacement < 25m and speed < 3 km/h), insert 1 LocationPing every 10 mins (600s).
    const isStationary = lastPing && displacementMeters < 25 && currentSpeed < 3;
    let shouldInsertPing = false;

    if (!lastPing) {
      shouldInsertPing = true;
    } else if (isStationary) {
      shouldInsertPing = secondsSinceLastPing >= 600;
    } else {
      // In transit: record if moved >= 35m, or >= 120s elapsed, or moving fast (> 10 km/h with >= 30s)
      shouldInsertPing =
        displacementMeters >= 35 ||
        secondsSinceLastPing >= 120 ||
        (currentSpeed > 10 && secondsSinceLastPing >= 30);
    }

    // Fetch active dispatch to link if available
    const activeDispatch = await prisma.dailyDispatch.findFirst({
      where: {
        OR: [
          { driverId: employee.id },
          { operatorId: employee.id },
          { siteLeaderEmployeeId: employee.id },
        ],
        status: { in: ["EN_ROUTE", "IN_PROGRESS", "DELIVERED"] },
        isPendingDelete: false,
      },
      orderBy: { updatedAt: "desc" },
    });

    if (shouldInsertPing) {
      await prisma.locationPing.create({
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

    // 5. Stage 3 Kerala GIS: Passive Dwell & Centroid Verification for active jobs
    try {
      if (activeDispatch && !activeDispatch.isCentroidVerified) {
        const settings = await prisma.systemSettings.findFirst();
        const yardLat = settings?.storeLatitude ? Number(settings.storeLatitude) : 9.7118;
        const yardLng = settings?.storeLongitude ? Number(settings.storeLongitude) : 76.6853;

        const distFromYard = calculateDistanceMeters(yardLat, yardLng, latitude, longitude);

        // Guard: Never lock depot/base yard as customer site centroid
        if (distFromYard > 300) {
          let distToSite = 999999;
          if (activeDispatch.latitude && activeDispatch.longitude) {
            distToSite = calculateDistanceMeters(
              Number(activeDispatch.latitude),
              Number(activeDispatch.longitude),
              latitude,
              longitude
            );
          }

          const isOperationallyActive =
            ["IN_PROGRESS", "DELIVERED"].includes(activeDispatch.status) ||
            (activeDispatch.status === "EN_ROUTE" && (!activeDispatch.latitude || distToSite <= 300));

          const crewEmployeeIds = [
            activeDispatch.driverId,
            activeDispatch.operatorId,
            activeDispatch.siteLeaderEmployeeId,
            employee.id,
          ].filter(Boolean) as string[];

          // Query recent telemetry pings from this dispatch or assigned crew within the last 30 minutes
          const thirtyMinsAgo = new Date(now.getTime() - 30 * 60 * 1000);
          const recentPings = await prisma.locationPing.findMany({
            where: {
              OR: [
                { dispatchId: activeDispatch.id },
                { employeeId: { in: crewEmployeeIds }, timestamp: { gte: thirtyMinsAgo } },
              ],
              timestamp: { gte: thirtyMinsAgo },
            },
            orderBy: { timestamp: "asc" },
          });

          if (recentPings && recentPings.length >= 2) {
            const telemetryPings: TelemetryPing[] = recentPings.map((p) => ({
              latitude: Number(p.latitude),
              longitude: Number(p.longitude),
              timestamp: p.timestamp,
              accuracy: p.accuracy ? Number(p.accuracy) : null,
              speed: p.speed != null ? Number(p.speed) / 3.6 : 0, // km/h to m/s
            }));

            const evalResult = evaluateSiteDwellCluster(telemetryPings, {
              minDurationMinutes: 10,
              maxClusterRadiusMeters: 30, // 30m accommodates tree canopy drift
              maxSpeedThresholdMs: 1.0,   // ~3.6 km/h
              isOperationallyActive,
            });

            if (evalResult.isVerified && evalResult.centroid) {
              const [cLat, cLng] = evalResult.centroid;
              await prisma.$transaction(async (tx) => {
                await tx.dailyDispatch.update({
                  where: { id: activeDispatch.id },
                  data: {
                    latitude: cLat,
                    longitude: cLng,
                    mapLink: `https://www.google.com/maps/search/?api=1&query=${cLat},${cLng}`,
                    isCentroidVerified: true,
                    dwellConfidence: evalResult.confidence,
                    dwellDurationMins: evalResult.durationMinutes,
                    locationSource: "VERIFIED_CENTROID",
                    locationUpdatedById: employee.id,
                    locationUpdatedAt: now,
                  },
                });

                await tx.siteDwellCluster.create({
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

                await tx.auditLog.create({
                  data: {
                    actorId: employee.id,
                    actorRole: employee.role,
                    action: "SITE_CENTROID_VERIFIED",
                    targetEntity: "DailyDispatch",
                    targetId: activeDispatch.id,
                    meta: {
                      latitude: cLat,
                      longitude: cLng,
                      confidence: evalResult.confidence,
                      durationMinutes: evalResult.durationMinutes,
                      clusterRadiusMeters: evalResult.clusterRadiusMeters,
                      pingCount: evalResult.pingCount,
                      reason: "10-minute stationary dwell cluster mathematically verified",
                    },
                  },
                });
              });
            }
          }
        }
      }
    } catch (gisErr) {
      console.warn("[KeralaGIS] Dwell cluster check non-blocking error:", gisErr);
    }

    // 6. Zero-Click Autopilot Geofence Automation Engine
    try {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      // A. TRIGGER 1: Auto-advance PENDING/ACCEPTED -> EN_ROUTE when truck leaves Base Yard (>250m, >=15 km/h)
      const pendingDispatch = await prisma.dailyDispatch.findFirst({
        where: {
          driverId: employee.id,
          status: { in: ["PENDING", "ACCEPTED"] },
          dateOfService: { gte: todayStart },
          isPendingDelete: false,
        },
        orderBy: { createdAt: "desc" },
      });

      if (pendingDispatch && currentSpeed >= 15) {
        const settings = await prisma.systemSettings.findFirst();
        const yardLat = settings?.storeLatitude ? Number(settings.storeLatitude) : 9.7118;
        const yardLng = settings?.storeLongitude ? Number(settings.storeLongitude) : 76.6853;

        const distFromYard = calculateDistanceMeters(yardLat, yardLng, latitude, longitude);
        if (distFromYard > 250) {
          await prisma.$transaction(async (tx) => {
            await tx.dailyDispatch.update({
              where: { id: pendingDispatch.id },
              data: { status: "EN_ROUTE" },
            });
            await tx.dispatchStatusHistory.create({
              data: {
                dispatchId: pendingDispatch.id,
                oldStatus: pendingDispatch.status,
                newStatus: "EN_ROUTE",
                changedById: employee.id,
                reason: `Auto-Departed Store Yard based on GPS displacement (${Math.round(distFromYard)}m from yard, ${currentSpeed} km/h)`,
              },
            });
            if (pendingDispatch.vehicleId) {
              await tx.vehicle.update({
                where: { id: pendingDispatch.vehicleId },
                data: { status: "IN_USE" },
              });
              const existingShift = await tx.shiftLog.findFirst({
                where: { driverId: employee.id, endTime: null },
              });
              if (!existingShift) {
                await tx.shiftLog.create({
                  data: {
                    driverId: employee.id,
                    vehicleId: pendingDispatch.vehicleId,
                    date: new Date(),
                    startTime: now,
                  },
                });
              }
            }
          });
        }
      }

      // B. TRIGGER 2: Auto-advance EN_ROUTE -> IN_PROGRESS when truck arrives at customer site (<=100m)
      const enRouteDispatch = await prisma.dailyDispatch.findFirst({
        where: {
          driverId: employee.id,
          status: "EN_ROUTE",
          latitude: { not: null },
          longitude: { not: null },
          isPendingDelete: false,
        },
        orderBy: { updatedAt: "desc" },
      });

      if (enRouteDispatch && enRouteDispatch.latitude && enRouteDispatch.longitude) {
        const distToSite = calculateDistanceMeters(
          Number(enRouteDispatch.latitude),
          Number(enRouteDispatch.longitude),
          latitude,
          longitude
        );

        if (distToSite <= 100) {
          // If within 100m of customer site, auto-advance to IN_PROGRESS
          // Fraud Lock: isCentroidVerified is NOT set here (must be verified by dwell cluster or explicit priority pin)
          await prisma.$transaction(async (tx) => {
            await tx.dailyDispatch.update({
              where: { id: enRouteDispatch.id },
              data: { status: "IN_PROGRESS" },
            });
            await tx.dispatchStatusHistory.create({
              data: {
                dispatchId: enRouteDispatch.id,
                oldStatus: "EN_ROUTE",
                newStatus: "IN_PROGRESS",
                changedById: employee.id,
                reason: `Auto-Arrived On Site (within ${Math.round(distToSite)}m of customer site coordinates)`,
              },
            });
          });
        }
      }
    } catch (geofenceErr) {
      console.warn("[Autopilot Geofence Engine] Non-blocking evaluation error:", geofenceErr);
    }

    return { success: true, pingInserted: shouldInsertPing, filtered: !shouldInsertPing };
  } catch (err: any) {
    console.error("Failed to update employee location:", err);
    return { success: false, error: err.message };
  }
}

export type LocationSource =
  | "STAFF_BOOKING"
  | "DRIVER_PIN"
  | "OPERATOR_PIN"
  | "VERIFIED_CENTROID"
  | "STAFF_OVERRIDE";

export const SOURCE_PRIORITY_WEIGHT: Record<LocationSource, number> = {
  STAFF_BOOKING: 1,
  DRIVER_PIN: 2,
  OPERATOR_PIN: 3,
  VERIFIED_CENTROID: 4,
  STAFF_OVERRIDE: 5,
};

export interface SetDispatchLocationParams {
  dispatchId: string;
  latitude: number;
  longitude: number;
  accuracy?: number | null;
  source: LocationSource;
  overrideReason?: string | null;
}

/**
 * Unified Single Source of Truth for Site Location:
 * Enforces priority hierarchy, prevents unauthorized overwrites,
 * logs all mutations to AuditLog, and records auxiliary driver check-ins.
 */
export async function setDispatchLocationWithPriority({
  dispatchId,
  latitude,
  longitude,
  accuracy,
  source,
  overrideReason,
}: SetDispatchLocationParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return { success: false, error: "Unauthorized" };
    }

    const empId = session.user.employeeId;
    const employee = await prisma.employee.findFirst({
      where: {
        OR: [
          ...(empId ? [{ id: empId }] : []),
          { userId: session.user.id },
          ...(session.user.email ? [{ user: { email: session.user.email } }] : []),
        ],
      },
    });

    if (!employee) {
      return { success: false, error: "No employee profile found for user" };
    }

    const dispatch = await prisma.dailyDispatch.findUnique({
      where: { id: dispatchId },
      include: {
        crewAssignments: true,
      },
    });

    if (!dispatch) {
      return { success: false, error: "Dispatch not found" };
    }

    const role = session.user.role as Role;
    const isStaffOrAdmin = role === "OWNER" || role === "ADMIN" || role === "STAFF";

    const isAssignedDriver =
      dispatch.driverId === employee.id ||
      dispatch.crewAssignments?.some((ca) => ca.employeeId === employee.id && ca.assignedRole === "DRIVER");

    const isAssignedOperator =
      dispatch.operatorId === employee.id ||
      dispatch.crewAssignments?.some(
        (ca) =>
          ca.employeeId === employee.id &&
          (ca.assignedRole === "MIXER_OPERATOR" || ca.assignedRole === "LIFT_OPERATOR")
      );

    const isAssignedCrew = isAssignedDriver || isAssignedOperator;

    // 1. Role Authorization Check
    if (!isStaffOrAdmin && !isAssignedCrew) {
      return { success: false, error: "You are not assigned to this dispatch" };
    }

    const now = new Date();
    const mapLink = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;

    // 2. Verified Centroid Protection Guard
    if (dispatch.isCentroidVerified) {
      if (isStaffOrAdmin) {
        // Staff/Admin can override a verified centroid ONLY if an explicit reason is supplied
        if (!overrideReason || !overrideReason.trim()) {
          return {
            success: false,
            error: "This site location is already verified on-site. Please provide a reason to override.",
          };
        }
      } else {
        // Drivers or Operators on-site cannot overwrite a mathematically verified centroid.
        // Instead, log their arrival/verification passively.
        await logAudit({
          actorId: employee.id,
          actorRole: role,
          actionType: role === "DRIVER" ? "DRIVER_SITE_VERIFICATION" : "OPERATOR_SITE_VERIFICATION",
          modelName: "DailyDispatch",
          oldPayload: {
            dispatchId,
            latitude: dispatch.latitude ? Number(dispatch.latitude) : null,
            longitude: dispatch.longitude ? Number(dispatch.longitude) : null,
            isCentroidVerified: true,
          },
          newPayload: {
            actorLat: latitude,
            actorLng: longitude,
            accuracy: accuracy || null,
            note: "Site coordinates already verified on-site. Crew check-in recorded.",
          },
        });

        // Still update employee's own position
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
            source: source || "BROWSER",
            timestamp: now,
          },
        });

        return {
          success: true,
          verified: true,
          message: "Site location was already confirmed by on-site crew. Your arrival was logged.",
        };
      }
    }

    // 3. Priority Hierarchy Guard
    // Priority: STAFF_BOOKING (1) < DRIVER_PIN (2) < OPERATOR_PIN (3) < VERIFIED_CENTROID (4) < STAFF_OVERRIDE (5)
    const currentSource = (dispatch.locationSource as LocationSource) || (dispatch.isCentroidVerified ? "VERIFIED_CENTROID" : "STAFF_BOOKING");
    const currentWeight = SOURCE_PRIORITY_WEIGHT[currentSource] || 1;
    const incomingWeight = SOURCE_PRIORITY_WEIGHT[source] || 1;

    if (!isStaffOrAdmin && incomingWeight < currentWeight) {
      // Driver cannot downgrade an Operator pin; secondary driver records arrival check-in
      await logAudit({
        actorId: employee.id,
        actorRole: role,
        actionType: "AUXILIARY_SITE_CHECKIN",
        modelName: "DailyDispatch",
        newPayload: {
          dispatchId,
          incomingSource: source,
          currentSource,
          actorLat: latitude,
          actorLng: longitude,
          note: "Lower-priority source check-in recorded without overwriting site coordinates.",
        },
      });

      return {
        success: true,
        message: `Site location was already set by ${currentSource}. Your check-in was logged.`,
      };
    }

    // 4. Atomic Execution: Update DailyDispatch, Employee Live State, and LocationPing
    await prisma.$transaction(async (tx) => {
      await tx.dailyDispatch.update({
        where: { id: dispatchId },
        data: {
          latitude,
          longitude,
          mapLink,
          locationSource: source,
          locationUpdatedById: employee.id,
          locationUpdatedAt: now,
          locationOverrideReason: overrideReason || null,
        },
      });

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

      await tx.locationPing.create({
        data: {
          employeeId: employee.id,
          dispatchId,
          latitude,
          longitude,
          accuracy: accuracy ? Number(accuracy) : null,
          source: source || "BROWSER",
          timestamp: now,
        },
      });
    });

    // 5. Audit Log Entry
    await logAudit({
      actorId: employee.id,
      actorRole: role,
      actionType: "UPDATE_SITE_LOCATION",
      modelName: "DailyDispatch",
      oldPayload: {
        latitude: dispatch.latitude ? Number(dispatch.latitude) : null,
        longitude: dispatch.longitude ? Number(dispatch.longitude) : null,
        locationSource: dispatch.locationSource,
        isCentroidVerified: dispatch.isCentroidVerified,
      },
      newPayload: {
        dispatchId,
        latitude,
        longitude,
        source,
        overrideReason: overrideReason || null,
      },
    });

    revalidatePath(`/driver/orders/${dispatchId}`);
    revalidatePath(`/staff/dispatch`);
    revalidatePath(`/admin/dispatch`);
    revalidatePath(`/staff/live/map`);
    revalidatePath(`/admin/live/map`);

    return { success: true, mapLink };
  } catch (err: any) {
    console.error("Failed to set dispatch location with priority:", err);
    return { success: false, error: err.message || "Failed to update location" };
  }
}

export async function updateDispatchLocation(
  dispatchId: string,
  latitude: number,
  longitude: number,
  accuracy?: number
) {
  const session = await auth();
  const role = session?.user?.role as Role;
  const isStaffOrAdmin = role === "OWNER" || role === "ADMIN" || role === "STAFF";

  const source: LocationSource = isStaffOrAdmin
    ? "STAFF_OVERRIDE"
    : role === "OPERATOR"
    ? "OPERATOR_PIN"
    : "DRIVER_PIN";

  return setDispatchLocationWithPriority({
    dispatchId,
    latitude,
    longitude,
    accuracy,
    source,
    overrideReason: isStaffOrAdmin ? "Manual location update" : undefined,
  });
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
