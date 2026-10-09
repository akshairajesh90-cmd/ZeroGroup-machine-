import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/serverAuth";
import { Role } from "@prisma/client";
import { notFound } from "next/navigation";
import MachineDetailClient from "./MachineDetailClient";

export const dynamic = "force-dynamic";

export default async function MachineReportPage({ params }: { params: { id: string } }) {
  const session = await requireAuth({ allowedRoles: [Role.OWNER, Role.STAFF, Role.ADMIN] });
  const isFinancialAuth = session.role === Role.OWNER || session.role === "ADMIN";

  const machine = await prisma.machine.findUnique({
    where: { id: params.id },
    include: {
      dispatches: {
        orderBy: { dateOfService: "desc" },
        take: 10,
      },
      fuelLogs: {
        orderBy: { date: "desc" },
        take: 10,
      },
      maintenanceTickets: {
        orderBy: { createdAt: "desc" },
        take: 10,
      }
    }
  });

  if (!machine) {
    notFound();
  }

  const latestDispatch = machine.dispatches[0];
  const latitude = latestDispatch?.latitude ? Number(latestDispatch.latitude) : null;
  const longitude = latestDispatch?.longitude ? Number(latestDispatch.longitude) : null;

  return (
    <MachineDetailClient 
      machine={machine} 
      latitude={latitude} 
      longitude={longitude} 
      latestLocation={latestDispatch?.location}
      isFinancialAuth={isFinancialAuth}
    />
  );
}
