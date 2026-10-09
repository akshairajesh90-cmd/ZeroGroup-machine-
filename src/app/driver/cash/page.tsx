import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/serverAuth";
import { startOfDay, subDays } from "date-fns";
import CashFormClient from "./CashFormClient";

export const dynamic = "force-dynamic";

export default async function CashCollectionPage() {
  const { employeeId } = await requireAuth({ allowedRoles: ["DRIVER", "OPERATOR", "OWNER", "STAFF"] });

  // Fetch recent dispatches for this operator (past 7 days)
  const recentStart = subDays(startOfDay(new Date()), 7);
  
  const dispatches = await prisma.dailyDispatch.findMany({
    where: {
      OR: [
        { operatorId: employeeId },
        { driverId: employeeId },
        { crewAssignments: { some: { employeeId: employeeId } } }
      ],
      dateOfService: { gte: recentStart },
      status: { in: ["COMPLETED", "DELIVERED", "IN_PROGRESS", "ACCEPTED", "PENDING"] }
    },
    include: {
      customer: { select: { name: true } },
      machine: { select: { machineId: true } },
    },
    orderBy: { dateOfService: "desc" }
  });

  return (
    <div className="space-y-6 bg-zinc-950 min-h-screen">
      <div className="pt-2">
        <h1 className="text-2xl font-black text-white">Petty Cash 💵</h1>
        <p className="text-xs text-slate-500 mt-1">
          Record petty cash received from office.
        </p>
      </div>

      <CashFormClient dispatches={dispatches} />
    </div>
  );
}
