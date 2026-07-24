import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/serverAuth";
import { Role } from "@prisma/client";
import FleetManagerClient from "./FleetManagerClient";

export const dynamic = "force-dynamic";

export default async function FleetPage() {
  await requireAuth({ allowedRoles: [Role.OWNER, Role.STAFF] });

  // 1. Fetch data
  const [allMachines, allVehicles] = await Promise.all([
    prisma.machine.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        dispatches: {
          orderBy: { dateOfService: "desc" },
          take: 1,
        }
      }
    }),
    prisma.vehicle.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        shiftLogs: {
          orderBy: { date: "desc" },
          take: 1,
          include: { driver: true }
        }
      }
    })
  ]);

  const machines = allMachines.filter(m => m.status !== "RETIRED" && m.type !== "INDEPENDENT");
  const vehicles = allVehicles.filter(v => v.status !== "RETIRED");

  // 2. Serialize decimals
  const serializedMachines = machines.map(m => ({
    ...m,
    operatorDailyPayout: Number(m.operatorDailyPayout),
    fuelConsumptionThreshold: Number(m.fuelConsumptionThreshold),
  }));

  return (
    <FleetManagerClient 
      initialMachines={serializedMachines}
      initialVehicles={vehicles}
    />
  );
}
