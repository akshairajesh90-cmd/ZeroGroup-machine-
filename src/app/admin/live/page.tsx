import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay } from "date-fns";
import LiveOperationsClient from "./LiveOperationsClient";
import { requireAuth } from "@/lib/serverAuth";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function LiveOperationsPage() {
  // Enforce security
  await requireAuth({ allowedRoles: [Role.OWNER, Role.STAFF] });

  // 1. Timezone Safety
  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());

  // 2. Parallel Fetching for Zero N+1 Queries
  const [activeDispatches, allMachines, allEmployees] = await Promise.all([
    prisma.dailyDispatch.findMany({
      where: {
        dateOfService: { gte: todayStart, lte: todayEnd },
        status: { in: ["PENDING", "DELIVERED"] }
      },
      include: {
        machine: true,
        operator: true,
        driver: true,
        worker: true,
        mainHelper: true,
      }
    }),
    prisma.machine.findMany(),
    prisma.employee.findMany({
      where: {
        role: { in: ["OPERATOR", "DRIVER", "WORKER"] }
      }
    })
  ]);

  // 3. Server-Side Data Transformation & Logical Tracking

  // Set to keep track of deployed entity IDs
  const deployedMachineIds = new Set<string>();
  const deployedEmployeeIds = new Set<string>();

  // Aggregate by location
  const locationMap = new Map<string, any>();

  activeDispatches.forEach((dispatch: any) => {
    // Mark as deployed
    if (dispatch.machineId) deployedMachineIds.add(dispatch.machineId);
    if (dispatch.operatorId) deployedEmployeeIds.add(dispatch.operatorId);
    if (dispatch.driverId) deployedEmployeeIds.add(dispatch.driverId);
    if (dispatch.workerId) deployedEmployeeIds.add(dispatch.workerId);
    if (dispatch.mainHelperId) deployedEmployeeIds.add(dispatch.mainHelperId);

    const loc = dispatch.location || "Unknown Location";
    if (!locationMap.has(loc)) {
      locationMap.set(loc, { location: loc, dispatches: [] });
    }
    locationMap.get(loc).dispatches.push({
      ...dispatch,
      // Serialize any Decimals
      operatorDailyRate: dispatch.operatorDailyRate ? Number(dispatch.operatorDailyRate) : null,
      customerCharge: dispatch.customerCharge ? Number(dispatch.customerCharge) : null,
      customOperatorWage: dispatch.customOperatorWage ? Number(dispatch.customOperatorWage) : null,
      actualWagePaid: dispatch.actualWagePaid ? Number(dispatch.actualWagePaid) : null,
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
      fixedSalary: e.fixedSalary ? Number(e.fixedSalary) : null
    }));

  return (
    <LiveOperationsClient 
      deployedSites={deployedSites} 
      idleMachines={idleMachines} 
      idleEmployees={idleEmployees} 
    />
  );
}
