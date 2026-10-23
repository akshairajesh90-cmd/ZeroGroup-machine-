import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay } from "date-fns";
import { requireAuth } from "@/lib/serverAuth";
import { Role } from "@prisma/client";
import StaffLiveTransitClient, { TransitDispatch } from "./StaffLiveTransitClient";

export const dynamic = "force-dynamic";

export default async function StaffLiveMapPage() {
  await requireAuth({ allowedRoles: [Role.OWNER, Role.ADMIN, Role.STAFF] });

  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());

  // Fetch today's dispatches with site, tools, machines, vehicle, driver & operator details
  const rawDispatches = await prisma.dailyDispatch.findMany({
    where: {
      dateOfService: { gte: todayStart, lte: todayEnd },
      isPendingDelete: false,
    },
    include: {
      customer: { select: { name: true, phone: true } },
      machine: { select: { id: true, machineId: true, type: true } },
      lift: { select: { id: true, machineId: true, type: true } },
      vehicle: { select: { id: true, licensePlate: true, type: true } },
      driver: { select: { id: true, name: true, phone: true } },
      operator: { select: { id: true, name: true, phone: true, operatorType: true, baseDailyWage: true } },
      dispatchTools: {
        include: { tool: true }
      }
    },
    orderBy: { createdAt: "desc" }
  });

  const serializedDispatches: TransitDispatch[] = rawDispatches.map((d: any) => ({
    id: d.id,
    customerName: d.customer?.name || "Private Customer",
    customerPhone: d.customer?.phone || null,
    location: d.location || "On Site",
    mapLink: d.mapLink || null,
    status: d.status,
    workType: d.workType || "NORMAL",
    machineId: d.machine?.machineId || null,
    machineType: d.machine?.type || null,
    liftId: d.lift?.machineId || null,
    liftType: d.lift?.type || null,
    vehiclePlate: d.vehicle?.licensePlate || null,
    vehicleType: d.vehicle?.type || null,
    driverName: d.driver?.name || null,
    driverPhone: d.driver?.phone || null,
    operatorName: d.operator?.name || null,
    operatorPhone: d.operator?.phone || null,
    operatorType: d.operator?.operatorType || "INTERNAL",
    operatorRate: d.operatorDailyRate ? Number(d.operatorDailyRate) : null,
    tools: (d.dispatchTools || []).map((dt: any) => ({
      id: dt.toolId,
      name: dt.tool?.name || "Equipment Tool",
      quantity: dt.quantity || 1
    })),
    dateOfService: d.dateOfService.toISOString(),
  }));

  return <StaffLiveTransitClient dispatches={serializedDispatches} />;
}
