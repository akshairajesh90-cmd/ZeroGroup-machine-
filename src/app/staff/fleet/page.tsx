import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/serverAuth";
import { Role, DocumentStatus, MaintenanceStatus } from "@prisma/client";
import FleetManagerClient from "./FleetManagerClient";
import type { SerializedMachine, SerializedVehicle } from "./FleetManagerClient";

export const dynamic = "force-dynamic";


export default async function FleetPage() {
  await requireAuth({ allowedRoles: [Role.OWNER, Role.ADMIN, Role.STAFF] });

  const today = new Date();

  const [rawMachines, rawVehicles] = await Promise.all([
    prisma.machine.findMany({
      where: {
        status: { not: "RETIRED" },
        isPendingDelete: false,
        type: { in: ["MIXER", "HYDRAULIC_MIXER", "LIFT"] },
      },
      orderBy: { createdAt: "desc" },
      include: {
        maintenanceTickets: {
          where: { status: { in: [MaintenanceStatus.OPEN, MaintenanceStatus.IN_PROGRESS] } },
          select: { id: true, status: true, issueDescription: true },
        },
        // ✅ Last dispatch → gives us last known location + date
        dispatches: {
          orderBy: { dateOfService: "desc" },
          take: 1,
          select: {
            location: true,
            dateOfService: true,
            status: true,
            customer: { select: { name: true } },
          },
        },
      },
    }),
    prisma.vehicle.findMany({
      where: { status: { not: "RETIRED" }, isPendingDelete: false },
      orderBy: { createdAt: "desc" },
      include: {
        maintenanceTickets: {
          where: { status: { in: [MaintenanceStatus.OPEN, MaintenanceStatus.IN_PROGRESS] } },
          select: { id: true, status: true, issueDescription: true },
        },
        documents: {
          where: { status: DocumentStatus.ACTIVE },
          select: { id: true, type: true, expiryDate: true, status: true },
        },
        // ✅ Last shift log → gives us last known active date
        shiftLogs: {
          orderBy: { date: "desc" },
          take: 1,
          select: {
            date: true,
            driver: { select: { name: true } },
          },
        },
      },
    }),
  ]);

  // CRITICAL: Serialize all Prisma Decimal types → Number.
  const machines: SerializedMachine[] = rawMachines.map((m) => {
    const lastDispatch = m.dispatches[0] ?? null;
    return {
      id: m.id,
      machineId: m.machineId,
      type: m.type,
      status: m.status as any,
      notes: m.notes,
      operatorDailyPayout: Number(m.operatorDailyPayout),
      fuelConsumptionThreshold: Number(m.fuelConsumptionThreshold),
      createdAt: m.createdAt.toISOString(),
      activeTickets: m.maintenanceTickets,
      // Last known location from latest dispatch
      lastLocation: lastDispatch?.location ?? null,
      lastDispatchDate: lastDispatch?.dateOfService?.toISOString() ?? null,
      lastCustomer: lastDispatch?.customer?.name ?? null,
    };
  });

  const vehicles: SerializedVehicle[] = rawVehicles.map((v) => {
    const lastShift = v.shiftLogs[0] ?? null;
    return {
      id: v.id,
      licensePlate: v.licensePlate,
      type: v.type,
      status: v.status as any,
      createdAt: v.createdAt.toISOString(),
      activeTickets: v.maintenanceTickets,
      hasExpiredDocs: v.documents.some((d) => new Date(d.expiryDate) < today),
      hasExpiringDocs: v.documents.some((d) => {
        const exp = new Date(d.expiryDate);
        const daysLeft = Math.ceil((exp.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return daysLeft >= 0 && daysLeft <= 30;
      }),
      lastDriver: lastShift?.driver?.name ?? null,
      lastShiftDate: lastShift?.date?.toISOString() ?? null,
    };
  });

  return <FleetManagerClient initialMachines={machines} initialVehicles={vehicles} />;
}
