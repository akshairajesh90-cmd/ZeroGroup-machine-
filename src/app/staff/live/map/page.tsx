import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay } from "date-fns";
import { requireAuth } from "@/lib/serverAuth";
import { Role } from "@prisma/client";
import { getStoreLocation } from "@/actions/storeSettings";
import UnifiedLiveOperationsClient, { UnifiedDispatch } from "./UnifiedLiveOperationsClient";
import type { MapRouteWaypoint } from "./UnifiedMapInner";

export const dynamic = "force-dynamic";

export default async function StaffLiveMapPage() {
  await requireAuth({ allowedRoles: [Role.OWNER, Role.ADMIN, Role.STAFF] });

  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());

  // Fetch today's dispatches. If none exist today (e.g. test environment), gracefully load the most recent active dispatches
  let whereClause: any = {
    dateOfService: { gte: todayStart, lte: todayEnd },
    isPendingDelete: false,
  };

  const countToday = await prisma.dailyDispatch.count({ where: whereClause });
  if (countToday === 0) {
    whereClause = { isPendingDelete: false };
  }

  // Parallel server fetch for zero N+1 latency
  const [rawDispatches, rawEmployees, rawPings, storeLocation] = await Promise.all([
    // 1. Dispatches with all site, equipment, and crew associations
    prisma.dailyDispatch.findMany({
      where: whereClause,
      take: 20,
      include: {
        customer: { select: { id: true, name: true, phone: true } },
        machine: { select: { id: true, machineId: true, type: true } },
        lift: { select: { id: true, machineId: true, type: true } },
        vehicle: { select: { id: true, licensePlate: true, type: true } },
        driver: { select: { id: true, name: true, phone: true, lastLatitude: true, lastLongitude: true } },
        operator: { select: { id: true, name: true, phone: true, operatorType: true, lastLatitude: true, lastLongitude: true } },
        dispatchTools: {
          include: { tool: true },
        },
      },
      orderBy: { createdAt: "desc" },
    }),

    // 2. Active field personnel with known GPS coordinates
    prisma.employee.findMany({
      where: {
        role: { in: ["DRIVER", "OPERATOR", "WORKER"] },
        lastLatitude: { not: null },
        lastLongitude: { not: null },
        isPendingDelete: false,
      },
      select: {
        id: true,
        name: true,
        role: true,
        phone: true,
        lastLatitude: true,
        lastLongitude: true,
        lastLocationUpdate: true,
      },
    }),

    // 3. Today's route telemetry breadcrumb waypoints
    prisma.locationPing.findMany({
      where: {
        timestamp: { gte: todayStart, lte: todayEnd },
      },
      orderBy: { timestamp: "asc" },
      select: {
        employeeId: true,
        latitude: true,
        longitude: true,
        speed: true,
        timestamp: true,
      },
    }),

    // 4. Central Store / Base Yard location
    getStoreLocation(),
  ]);

  // Serialize Dispatches
  const serializedDispatches: UnifiedDispatch[] = rawDispatches.map((d: any) => ({
    id: d.id,
    customerId: d.customer?.id,
    customerName: d.customer?.name || "Private Customer",
    customerPhone: d.customer?.phone || null,
    location: d.location || "On Site",
    mapLink: d.mapLink || null,
    latitude: d.latitude ? Number(d.latitude) : null,
    longitude: d.longitude ? Number(d.longitude) : null,
    status: d.status,
    workType: d.workType || "NORMAL",
    machineId: d.machine?.machineId || null,
    machineType: d.machine?.type || null,
    liftId: d.lift?.machineId || null,
    liftType: d.lift?.type || null,
    vehiclePlate: d.vehicle?.licensePlate || null,
    vehicleType: d.vehicle?.type || null,
    driverId: d.driver?.id || null,
    driverName: d.driver?.name || null,
    driverPhone: d.driver?.phone || null,
    operatorId: d.operator?.id || null,
    operatorName: d.operator?.name || null,
    operatorPhone: d.operator?.phone || null,
    operatorType: d.operator?.operatorType || "INTERNAL",
    tools: (d.dispatchTools || []).map((dt: any) => ({
      id: dt.toolId,
      name: dt.tool?.name || "Equipment Tool",
      quantity: dt.quantity || 1,
    })),
    dateOfService: d.dateOfService.toISOString(),
  }));

  // Group historical pings by employee ID for route trails
  const initialPings: Record<string, MapRouteWaypoint[]> = {};
  rawPings.forEach((p) => {
    if (!initialPings[p.employeeId]) {
      initialPings[p.employeeId] = [];
    }
    initialPings[p.employeeId].push({
      lat: Number(p.latitude),
      lng: Number(p.longitude),
      time: p.timestamp.toISOString(),
      speed: p.speed !== null && p.speed !== undefined ? Number(p.speed) : null,
    });
  });

  return (
    <UnifiedLiveOperationsClient
      initialDispatches={serializedDispatches}
      initialFieldEmployees={rawEmployees.map((e) => ({
        ...e,
        lastLatitude: Number(e.lastLatitude),
        lastLongitude: Number(e.lastLongitude),
        lastLocationUpdate: e.lastLocationUpdate?.toISOString() || null,
      }))}
      initialPings={initialPings}
      initialStoreLocation={storeLocation}
    />
  );
}
