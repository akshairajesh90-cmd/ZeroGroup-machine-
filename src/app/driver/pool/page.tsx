import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/serverAuth";
import { redirect } from "next/navigation";
import JobPoolClient from "./JobPoolClient";
import { startOfDay, endOfDay, addDays } from "date-fns";

export const dynamic = "force-dynamic";

export default async function JobPoolPage() {
  const { employeeId, role } = await requireAuth();

  if (!["DRIVER", "OWNER", "ADMIN"].includes(role)) {
    redirect("/");
  }

  const todayStart = startOfDay(new Date());
  const tomorrowEnd = endOfDay(addDays(new Date(), 1));
  const todayDateStr = todayStart.toISOString().split("T")[0];

  // Fetch all pending dispatches for today and tomorrow
  const dispatches = await prisma.dailyDispatch.findMany({
    where: {
      dateOfService: { gte: todayStart, lte: tomorrowEnd },
      status: "PENDING",
      isPendingDelete: false,
    },
    include: {
      customer: { select: { name: true } },
      machine: { select: { machineId: true } },
      driver: { select: { name: true } }
    },
    orderBy: [
      { dateOfService: "asc" },
      { createdAt: "desc" }
    ]
  });

  const jobs = dispatches.map(d => {
    const dispatchDateStr = new Date(d.dateOfService).toISOString().split("T")[0];
    return {
      id: d.id,
      location: d.location,
      dateOfService: d.dateOfService.toISOString(),
      status: d.status,
      driverId: d.driverId,
      driverName: d.driver?.name,
      customerName: d.customer?.name,
      machineId: d.machine?.machineId,
      isToday: dispatchDateStr === todayDateStr
    };
  });

  return <JobPoolClient jobs={jobs} currentEmployeeId={employeeId} />;
}
