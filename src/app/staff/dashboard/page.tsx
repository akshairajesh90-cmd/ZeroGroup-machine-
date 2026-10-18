import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay, subDays } from "date-fns";
import nextDynamic from "next/dynamic";
const DashboardClient = nextDynamic(() => import("./DashboardClient"), { ssr: false });
import { requireAuth } from "@/lib/serverAuth";
import { Role, CashDepositStatus, DispatchStatus, MachineStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // Enforce auth (Admin/Staff only)
  await requireAuth({ allowedRoles: [Role.OWNER, Role.ADMIN, Role.STAFF] });

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
      where: { status: CashDepositStatus.DEPOSITED }
    }),
    
    // B. Active Dispatches Today (count)
    prisma.dailyDispatch.count({
      where: {
        dateOfService: { gte: today, lte: endOfDay(today) },
        status: { in: [DispatchStatus.PENDING, DispatchStatus.DELIVERED] },
        isPendingDelete: false
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
  const totalRevenue = revenueAgg._sum?.amountCollected 
    ? Number(revenueAgg._sum.amountCollected.toString()) 
    : 0;

  // Process Machine Metrics
  let availableMachines = 0;
  let rentedMachines = 0;
  let repairMachines = 0;

  machineMetrics.forEach((m: any) => {
    if (m.status === MachineStatus.AVAILABLE) availableMachines = m._count._all;
    if (m.status === MachineStatus.RENTED) rentedMachines = m._count._all;
    if (m.status === MachineStatus.REPAIR) repairMachines = m._count._all;
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

  // --- Step 4: Daily P&L Command Center ---
  const dispatchesToday = await prisma.dailyDispatch.findMany({
    where: { dateOfService: { gte: today, lte: endOfDay(today) } },
    include: { crewAssignments: true }
  });

  let pnlRevenue = 0;
  let pnlLabor = 0;
  dispatchesToday.forEach((d: any) => {
     pnlRevenue += Number(d.customerCharge || 0);
     
     if (d.operatorId) pnlLabor += Number(d.actualWagePaid || d.operatorDailyRate || 1000);
     if (d.driverId) pnlLabor += 900; 
     
     if (d.crewAssignments) {
       d.crewAssignments.forEach((a: any) => {
          pnlLabor += Number(a.lockedWageRate || 0) * (a.headcount || 1);
       });
     }
     
     if (d.mainHelperId || d.mainHelperName) {
       pnlLabor += Number(d.helperCount || 1) * 1200;
     }
  });

  const expensesTodayAgg = await prisma.expense.aggregate({
    _sum: { amount: true },
    where: { date: { gte: today, lte: endOfDay(today) } }
  });
  const pnlExpenses = Number(expensesTodayAgg._sum.amount || 0);

  const dailyGrossMargin = pnlRevenue - pnlLabor - pnlExpenses;

  // Ensure ALL data is strictly JSON-serializable
  const serializedMetrics = {
    totalRevenue,
    activeDispatchesToday,
    availableMachines,
    rentedMachines,
    repairMachines,
    chartData,
    pnl: {
      revenue: pnlRevenue,
      labor: pnlLabor,
      expenses: pnlExpenses,
      margin: dailyGrossMargin
    }
  };

  return <DashboardClient metrics={serializedMetrics} />;
}

