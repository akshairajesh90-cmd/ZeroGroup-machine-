import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay } from "date-fns";
import LiveOperationsClient from "./LiveOperationsClient";
import { requireAuth } from "@/lib/serverAuth";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function LiveOperationsPage() {
  // Enforce security
  await requireAuth({ allowedRoles: [Role.OWNER, Role.ADMIN, Role.STAFF] });

  // 1. Timezone Safety
  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());

  // 2. Parallel Fetching for Zero N+1 Queries
  const [activeDispatches, allMachines, allEmployees, allTools, allVehicles, todayShifts] = await Promise.all([
    prisma.dailyDispatch.findMany({
      where: {
        dateOfService: { gte: todayStart, lte: todayEnd },
        status: { in: ["PENDING", "ACCEPTED", "EN_ROUTE", "IN_PROGRESS", "DELIVERED"] }
      },
      include: {
        machine: true,
        operator: true,
        driver: true,
        worker: true,
        mainHelper: true,
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
        date: { gte: todayStart, lte: todayEnd }
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

  // Map shift logs by driver for quick vehicle lookup
  const driverToVehicleMap = new Map<string, any>();
  todayShifts.forEach(shift => {
    driverToVehicleMap.set(shift.driverId, shift.vehicle);
    deployedVehicleIds.add(shift.vehicleId);
  });

  activeDispatches.forEach((dispatch: any) => {
    // Collect deployed entities for "Yard" calculation
    if (dispatch.machineId) deployedMachineIds.add(dispatch.machineId);
    if (dispatch.operatorId) deployedEmployeeIds.add(dispatch.operatorId);
    if (dispatch.driverId) deployedEmployeeIds.add(dispatch.driverId);
    if (dispatch.workerId) deployedEmployeeIds.add(dispatch.workerId);
    if (dispatch.mainHelperId) deployedEmployeeIds.add(dispatch.mainHelperId);

    dispatch.dispatchAssets.forEach((da: any) => deployedMachineIds.add(da.machineId));
    dispatch.dispatchTools.forEach((dt: any) => deployedToolIds.add(dt.toolId));
    dispatch.crewAssignments.forEach((mo: any) => {
      if (mo.employeeId) deployedEmployeeIds.add(mo.employeeId);
    });
    dispatch.dispatchLabor.forEach((dl: any) => {
      if (dl.employeeId) deployedEmployeeIds.add(dl.employeeId);
    });

    const loc = dispatch.location || "Unknown Location";
    if (!locationMap.has(loc)) {
      locationMap.set(loc, { location: loc, dispatches: [] });
    }

    // Attach Vehicle from ShiftLog
    let vehicle = null;
    if (dispatch.driverId && driverToVehicleMap.has(dispatch.driverId)) {
      vehicle = driverToVehicleMap.get(dispatch.driverId);
    }

    locationMap.get(loc).dispatches.push({
      ...dispatch,
      assignedVehicle: vehicle, // Send matched vehicle explicitly
      operatorDailyRate: dispatch.operatorDailyRate ? Number(dispatch.operatorDailyRate) : null,
      customerCharge: dispatch.customerCharge ? Number(dispatch.customerCharge) : null,
      customOperatorWage: dispatch.customOperatorWage ? Number(dispatch.customOperatorWage) : null,
      actualWagePaid: dispatch.actualWagePaid ? Number(dispatch.actualWagePaid) : null,
      dispatchLabor: dispatch.dispatchLabor.map((dl: any) => ({
        ...dl,
        lumpSumWage: Number(dl.lumpSumWage),
        actualWagePaid: dl.actualWagePaid ? Number(dl.actualWagePaid) : null,
        outsideWagePaid: Number(dl.outsideWagePaid)
      })),
      crewAssignments: dispatch.crewAssignments.map((mo: any) => ({
        ...mo,
        dayWage: mo.dayWage ? Number(mo.dayWage) : null,
        actualWagePaid: mo.actualWagePaid ? Number(mo.actualWagePaid) : null
      }))
    });
  });

  const deployedSites = Array.from(locationMap.values());

  // Calculate Idle Assets (The Yard)
  const idleMachines = allMachines
    .filter(m => !deployedMachineIds.has(m.id))
    .map(m => ({
      ...m,
      operatorDailyPayout: Number(m.operatorDailyPayout),
      fuelConsumptionThreshold: Number(m.fuelConsumptionThreshold)
    }));

  const idleEmployees = allEmployees
    .filter(e => !deployedEmployeeIds.has(e.id))
    .map(e => ({
      ...e,
      fixedSalary: e.fixedSalary ? Number(e.fixedSalary) : null,
      baseDailyWage: e.baseDailyWage ? Number(e.baseDailyWage) : null,
      dailyBataRate: e.dailyBataRate ? Number(e.dailyBataRate) : null,
      hourlyRate: e.hourlyRate ? Number(e.hourlyRate) : null
    }));

  const idleTools = allTools.filter(t => !deployedToolIds.has(t.id));
  const idleVehicles = allVehicles.filter(v => !deployedVehicleIds.has(v.id));

  return (
    <LiveOperationsClient 
      deployedSites={deployedSites} 
      idleMachines={idleMachines} 
      idleEmployees={idleEmployees} 
      idleTools={idleTools}
      idleVehicles={idleVehicles}
    />
  );
}
