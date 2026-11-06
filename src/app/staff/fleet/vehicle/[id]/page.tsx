import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/serverAuth";
import { Role } from "@prisma/client";
import { notFound } from "next/navigation";
import VehicleDetailClient from "./VehicleDetailClient";

export const dynamic = "force-dynamic";

export default async function VehicleReportPage({ params }: { params: { id: string } }) {
  await requireAuth({ allowedRoles: [Role.OWNER, Role.STAFF, Role.ADMIN] });

  const vehicle = await prisma.vehicle.findUnique({
    where: { id: params.id },
    include: {
      dispatches: {
        orderBy: { dateOfService: "desc" },
        take: 20,
        include: {
          customer: true,
          driver: true,
          machine: true,
          lift: true,
          vibrator: true,
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
        include: { driver: true },
      },
      maintenanceTickets: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
      documents: {
        orderBy: { expiryDate: "asc" },
      },
    },
  });

  if (!vehicle) {
    notFound();
  }

  return (
    <VehicleDetailClient vehicle={JSON.parse(JSON.stringify(vehicle))} />
  );
}
