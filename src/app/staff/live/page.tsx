import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay, subDays, addDays, startOfWeek, endOfWeek, parseISO, isValid, format } from "date-fns";
import LiveOperationsClient from "./LiveOperationsClient";
import { requireAuth } from "@/lib/serverAuth";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function LiveOperationsPage({
  searchParams,
}: {
  searchParams?: { view?: string; date?: string };
}) {
  // Enforce security
  await requireAuth({ allowedRoles: [Role.OWNER, Role.ADMIN, Role.STAFF] });

  const view = (searchParams?.view || "today") as "today" | "yesterday" | "tomorrow" | "week" | "all" | "custom";
  const customDateStr = searchParams?.date;

  let rangeStart: Date;
  let rangeEnd: Date;
  let dateLabel: string;

  if (view === "yesterday") {
    rangeStart = startOfDay(subDays(new Date(), 1));
    rangeEnd = endOfDay(subDays(new Date(), 1));
    dateLabel = `Yesterday (${format(rangeStart, "dd MMM yyyy")})`;
  } else if (view === "tomorrow") {
    rangeStart = startOfDay(addDays(new Date(), 1));
    rangeEnd = endOfDay(addDays(new Date(), 1));
    dateLabel = `Tomorrow (${format(rangeStart, "dd MMM yyyy")})`;
  } else if (view === "week") {
    rangeStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    rangeEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
    dateLabel = `This Week (${format(rangeStart, "dd MMM")} - ${format(rangeEnd, "dd MMM yyyy")})`;
  } else if (view === "all") {
    rangeStart = new Date("2026-01-01T00:00:00.000Z");
    rangeEnd = new Date("2027-12-31T23:59:59.999Z");
    dateLabel = "All Time (Full 28-Day Schedule · All 236 Dispatches)";
  } else if (view === "custom" && customDateStr) {
    const parsed = parseISO(customDateStr);
    if (isValid(parsed)) {
      rangeStart = startOfDay(parsed);
      rangeEnd = endOfDay(parsed);
      dateLabel = format(rangeStart, "EEEE, dd MMM yyyy");
    } else {
      rangeStart = startOfDay(new Date());
      rangeEnd = endOfDay(new Date());
      dateLabel = `Today (${format(rangeStart, "EEEE, dd MMM yyyy")})`;
    }
  } else {
    rangeStart = startOfDay(new Date());
    rangeEnd = endOfDay(new Date());
    dateLabel = `Today (${format(rangeStart, "EEEE, dd MMM yyyy")})`;
  }

  // 2. Parallel Fetching for Zero N+1 Queries
  const [activeDispatches, allMachines, allEmployees, allTools, allVehicles, shiftsInRange] = await Promise.all([
    prisma.dailyDispatch.findMany({
      where: {
        dateOfService: { gte: rangeStart, lte: rangeEnd },
        status: { in: ["PENDING", "ACCEPTED", "EN_ROUTE", "IN_PROGRESS", "DELIVERED", "COMPLETED"] }
      },
      include: {
        machine: true,
        operator: true,
        driver: true,
        worker: true,
        mainHelper: true,
        customer: true,
        dispatchAssets: { include: { machine: true } },
        dispatchTools: { include: { tool: true } },
        crewAssignments: { include: { employee: true } },
        dispatchLabor: { include: { employee: true } },
      }
    }),
    prisma.machine.findMany({ where: { isPendingDelete: false } }),
    prisma.employee.findMany({
      where: {
        role: { in: ["OPERATOR", "DRIVER", "WORKER"] },
        isPendingDelete: false
      }
    }),
    prisma.tool.findMany({ where: { isPendingDelete: false } }),
    prisma.vehicle.findMany({ where: { isPendingDelete: false } }),
    prisma.shiftLog.findMany({
      where: {
        date: { gte: rangeStart, lte: rangeEnd }
      },
      include: { vehicle: true }
    })
  ]);

  // 3. Server-Side Data Transformation & Logical Tracking
  const deployedMachineIds = new Set<string>();
  const deployedEmployeeIds = new Set<string>();
  const deployedToolIds = new Set<string>();
  const deployedVehicleIds = new Set<string>();

  const locationMap = new Map<string, any>();

  // Driver -> Vehicle map from shifts
  const driverToVehicleMap = new Map<string, any>();
  shiftsInRange.forEach(s => {
    if (s.driverId && s.vehicle) {
      driverToVehicleMap.set(s.driverId, s.vehicle);
      deployedVehicleIds.add(s.vehicle.id);
    }
  });

  // Process Active Dispatches
  activeDispatches.forEach(dispatch => {
    const loc = dispatch.location;
    if (!locationMap.has(loc)) {
      locationMap.set(loc, {
        location: loc,
        latitude: dispatch.latitude ? Number(dispatch.latitude) : null,
        longitude: dispatch.longitude ? Number(dispatch.longitude) : null,
        dispatches: []
      });
    }

    // Logical deployment tracking
    if (dispatch.machineId) deployedMachineIds.add(dispatch.machineId);
    if (dispatch.operatorId) deployedEmployeeIds.add(dispatch.operatorId);
    if (dispatch.driverId) deployedEmployeeIds.add(dispatch.driverId);
    if (dispatch.workerId) deployedEmployeeIds.add(dispatch.workerId);
    if (dispatch.mainHelperId) deployedEmployeeIds.add(dispatch.mainHelperId);

    dispatch.dispatchAssets.forEach(da => deployedMachineIds.add(da.machineId));
    dispatch.dispatchTools.forEach(dt => deployedToolIds.add(dt.toolId));
    dispatch.crewAssignments.forEach(ca => {
      if (ca.employeeId) deployedEmployeeIds.add(ca.employeeId);
    });
    dispatch.dispatchLabor.forEach(dl => {
      if (dl.internalEmployeeId) deployedEmployeeIds.add(dl.internalEmployeeId);
    });

    // Attach Vehicle from ShiftLog
    let vehicle = null;
    if (dispatch.driverId && driverToVehicleMap.has(dispatch.driverId)) {
      vehicle = driverToVehicleMap.get(dispatch.driverId);
    }

    locationMap.get(loc).dispatches.push({
      ...dispatch,
      latitude: dispatch.latitude ? Number(dispatch.latitude) : null,
      longitude: dispatch.longitude ? Number(dispatch.longitude) : null,
      dateOfService: dispatch.dateOfService.toISOString(),
      assignedVehicle: vehicle,
      operator: dispatch.operator ? {
        id: dispatch.operator.id,
        name: dispatch.operator.name,
        phone: dispatch.operator.phone,
        role: dispatch.operator.role,
        operatorType: dispatch.operator.operatorType,
        profilePhotoUrl: dispatch.operator.profilePhotoUrl,
        lastLatitude: dispatch.operator.lastLatitude ? Number(dispatch.operator.lastLatitude) : null,
        lastLongitude: dispatch.operator.lastLongitude ? Number(dispatch.operator.lastLongitude) : null,
        lastLocationUpdate: dispatch.operator.lastLocationUpdate ? dispatch.operator.lastLocationUpdate.toISOString() : null,
      } : null,
      driver: dispatch.driver ? {
        id: dispatch.driver.id,
        name: dispatch.driver.name,
        phone: dispatch.driver.phone,
        role: dispatch.driver.role,
        operatorType: dispatch.driver.operatorType,
        profilePhotoUrl: dispatch.driver.profilePhotoUrl,
        lastLatitude: dispatch.driver.lastLatitude ? Number(dispatch.driver.lastLatitude) : null,
        lastLongitude: dispatch.driver.lastLongitude ? Number(dispatch.driver.lastLongitude) : null,
        lastLocationUpdate: dispatch.driver.lastLocationUpdate ? dispatch.driver.lastLocationUpdate.toISOString() : null,
      } : null,
      operatorDailyRate: dispatch.operatorDailyRate ? Number(dispatch.operatorDailyRate) : null,
      customerCharge: dispatch.customerCharge ? Number(dispatch.customerCharge) : null,
      customOperatorWage: dispatch.customOperatorWage ? Number(dispatch.customOperatorWage) : null,
      actualWagePaid: dispatch.actualWagePaid ? Number(dispatch.actualWagePaid) : null,
      dispatchLabor: dispatch.dispatchLabor.map((dl: any) => ({
        ...dl,
        lumpSumWage: Number(dl.lumpSumWage),
        actualWagePaid: dl.actualWagePaid ? Number(dl.actualWagePaid) : null,
        outsideWagePaid: Number(dl.outsideWagePaid),
        employee: dl.employee ? {
          id: dl.employee.id,
          name: dl.employee.name,
          phone: dl.employee.phone,
          role: dl.employee.role,
          lastLatitude: dl.employee.lastLatitude ? Number(dl.employee.lastLatitude) : null,
          lastLongitude: dl.employee.lastLongitude ? Number(dl.employee.lastLongitude) : null,
          lastLocationUpdate: dl.employee.lastLocationUpdate ? dl.employee.lastLocationUpdate.toISOString() : null,
        } : null,
      })),
      crewAssignments: dispatch.crewAssignments.map((mo: any) => ({
        ...mo,
        lockedWageRate: mo.lockedWageRate ? Number(mo.lockedWageRate) : null,
        employee: mo.employee ? {
          id: mo.employee.id,
          name: mo.employee.name,
          phone: mo.employee.phone,
          role: mo.employee.role,
          lastLatitude: mo.employee.lastLatitude ? Number(mo.employee.lastLatitude) : null,
          lastLongitude: mo.employee.lastLongitude ? Number(mo.employee.lastLongitude) : null,
          lastLocationUpdate: mo.employee.lastLocationUpdate ? mo.employee.lastLocationUpdate.toISOString() : null,
        } : null,
      }))
    });
  });

  const deployedSites = Array.from(locationMap.values());

  // Calculate Idle Assets (The Yard)
  const idleMachines = allMachines
    .filter(m => !deployedMachineIds.has(m.id))
    .map(m => ({
      id: m.id,
      machineId: m.machineId,
      type: m.type,
      status: m.status,
      operatorDailyPayout: Number(m.operatorDailyPayout),
      fuelConsumptionThreshold: Number(m.fuelConsumptionThreshold)
    }));

  const idleEmployees = allEmployees
    .filter(e => !deployedEmployeeIds.has(e.id))
    .map(e => ({
      id: e.id,
      name: e.name,
      role: e.role,
      phone: e.phone,
      operatorType: e.operatorType,
      defaultCrewRole: e.defaultCrewRole,
      capableRoles: e.capableRoles || [],
      profilePhotoUrl: e.profilePhotoUrl,
      lastLatitude: e.lastLatitude ? Number(e.lastLatitude) : null,
      lastLongitude: e.lastLongitude ? Number(e.lastLongitude) : null,
      lastLocationUpdate: e.lastLocationUpdate ? e.lastLocationUpdate.toISOString() : null,
      fixedSalary: e.fixedSalary ? Number(e.fixedSalary) : null,
      baseDailyWage: e.baseDailyWage ? Number(e.baseDailyWage) : null,
      dailyBataRate: e.dailyBataRate ? Number(e.dailyBataRate) : null,
      hourlyRate: e.hourlyRate ? Number(e.hourlyRate) : null
    }));

  const idleTools = allTools.filter(t => !deployedToolIds.has(t.id)).map(t => ({
    id: t.id,
    toolId: t.toolId,
    name: t.name,
    toolType: t.toolType,
    status: t.status,
    totalInventory: t.totalInventory,
  }));

  const idleVehicles = allVehicles.filter(v => !deployedVehicleIds.has(v.id)).map(v => ({
    id: v.id,
    licensePlate: v.licensePlate,
    type: v.type,
    status: v.status,
  }));

  return (
    <LiveOperationsClient 
      deployedSites={deployedSites} 
      idleMachines={idleMachines} 
      idleEmployees={idleEmployees} 
      idleTools={idleTools}
      idleVehicles={idleVehicles}
      currentView={view}
      selectedDateStr={customDateStr}
      dateLabel={dateLabel}
      totalDispatchesCount={activeDispatches.length}
      basePath="/staff/live"
    />
  );
}
