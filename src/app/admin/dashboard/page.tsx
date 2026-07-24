import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay, subDays } from "date-fns";
import DashboardClient from "./DashboardClient";
import { requireAuth } from "@/lib/serverAuth";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // Enforce auth (Admin/Staff only)
  await requireAuth({ allowedRoles: [Role.OWNER, Role.STAFF] });

  const today = startOfDay(new Date());
  
  // 1. Parallel Execution: Fetch all metrics simultaneously to prevent bottlenecking
  const [
    revenueAgg,
    activeDispatchesToday,
    machineMetrics,
    past7DaysDispatches
  ] = await Promise.all([
    // A. Total Revenue (Sum of CashCollections)
    prisma.cashCollection.aggregate({
      _sum: { amountCollected: true },
      where: { status: "DEPOSITED" }
    }),
    
    // B. Active Dispatches Today (count)
    prisma.dailyDispatch.count({
      where: {
        dateOfService: { gte: today, lte: endOfDay(today) },
        status: { in: ["PENDING", "DELIVERED"] }
      }
    }),
    
    // C. Machine Utilization (groupBy status)
    prisma.machine.groupBy({
      by: ["status"],
      _count: { _all: true }
    }),
    
    // D. 7-Day Volume (Fetch minimal rows and process)
    prisma.dailyDispatch.findMany({
      where: { dateOfService: { gte: subDays(today, 6), lte: today } },
      select: { dateOfService: true }
    })
  ]);

  // 2. Serialization Layer: Convert Prisma Decimals to raw JS Numbers
  // Next.js Server Components WILL crash if raw Decimals cross the Client boundary
  const totalRevenue = revenueAgg._sum.amountCollected 
    ? Number(revenueAgg._sum.amountCollected.toString()) 
    : 0;

  // Process Machine Metrics
  let availableMachines = 0;
  let rentedMachines = 0;
  let repairMachines = 0;

  machineMetrics.forEach((m: any) => {
    if (m.status === "AVAILABLE") availableMachines = m._count._all;
    if (m.status === "RENTED") rentedMachines = m._count._all;
    if (m.status === "REPAIR") repairMachines = m._count._all;
  });

  // Process 7-day volume chart data
  const volumeMap: Record<string, number> = {};
  
  // Initialize the past 7 days to 0
  for (let i = 6; i >= 0; i--) {
    const d = subDays(today, i).toISOString().split('T')[0];
    volumeMap[d] = 0;
  }

  // Aggregate counts
  past7DaysDispatches.forEach((d: any) => {
    const dateStr = d.dateOfService.toISOString().split('T')[0];
    if (volumeMap[dateStr] !== undefined) {
      volumeMap[dateStr]++;
    }
  });

  const chartData = Object.keys(volumeMap).map(date => ({
    date,
    count: volumeMap[date]
  }));

  // Ensure ALL data is strictly JSON-serializable
  const serializedMetrics = {
    totalRevenue,
    activeDispatchesToday,
    availableMachines,
    rentedMachines,
    repairMachines,
    chartData
  };

  return <DashboardClient metrics={serializedMetrics} />;
}
