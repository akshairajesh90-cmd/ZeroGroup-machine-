import { prisma } from "@/lib/prisma";
import MaintenanceClient from "./MaintenanceClient";
import { requireAuth } from "@/lib/serverAuth";

export default async function MaintenancePage() {
  await requireAuth({ allowedRoles: ["OWNER", "ADMIN", "STAFF"] });

  const tickets = await prisma.maintenanceTicket.findMany({
    take: 50,
    orderBy: { updatedAt: "desc" },
    include: {
      vehicle: true,
      machine: true,
    },
  });

  const vehicles = await prisma.vehicle.findMany({
    where: { isPendingDelete: false },
    orderBy: { licensePlate: "asc" },
  });

  const machines = await prisma.machine.findMany({
    where: { isPendingDelete: false },
    orderBy: { machineId: "asc" },
  });

  return (
    <MaintenanceClient tickets={tickets} vehicles={vehicles} machines={machines} />
  );
}
