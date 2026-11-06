import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/serverAuth";
import { Role } from "@prisma/client";
import { notFound } from "next/navigation";
import MachineDetailClient from "./MachineDetailClient";

export const dynamic = "force-dynamic";

export default async function MachineReportPage({ params }: { params: { id: string } }) {
  const session = await requireAuth({ allowedRoles: [Role.OWNER, Role.STAFF, Role.ADMIN] });
  const isFinancialAuth = session.role === Role.OWNER || session.role === "ADMIN";

  const [machine, settings] = await Promise.all([
    prisma.machine.findUnique({
      where: { id: params.id },
      include: {
        dispatches: {
          orderBy: { dateOfService: "desc" },
          take: 15,
          include: {
            customer: true,
            driver: true,
            operator: true,
            vehicle: true,
            dispatchTools: {
              include: {
                tool: true,
              },
            },
          },
        },
        fuelLogs: {
          orderBy: { date: "desc" },
          take: 10,
        },
        maintenanceTickets: {
          orderBy: { createdAt: "desc" },
          take: 10,
        },
      },
    }),
    prisma.systemSettings.findFirst({
      select: {
        storeName: true,
        storeLatitude: true,
        storeLongitude: true,
        storeAddress: true,
      },
    }),
  ]);

  if (!machine) {
    notFound();
  }

  const latestDispatch = machine.dispatches[0];
  const latitude = latestDispatch?.latitude ? Number(latestDispatch.latitude) : null;
  const longitude = latestDispatch?.longitude ? Number(latestDispatch.longitude) : null;
  const depotLatitude = settings?.storeLatitude ? Number(settings.storeLatitude) : 9.5916;
  const depotLongitude = settings?.storeLongitude ? Number(settings.storeLongitude) : 76.5222;
  const depotName = settings?.storeName || "Zero Group Main Yard & Store";

  return (
    <MachineDetailClient 
      machine={JSON.parse(JSON.stringify(machine))} 
      latitude={latitude} 
      longitude={longitude} 
      latestLocation={latestDispatch?.location}
      isFinancialAuth={isFinancialAuth}
      depotLatitude={depotLatitude}
      depotLongitude={depotLongitude}
      depotName={depotName}
    />
  );
}
