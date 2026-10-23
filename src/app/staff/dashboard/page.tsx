import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay, subDays } from "date-fns";
import nextDynamic from "next/dynamic";
const DashboardClient = nextDynamic(() => import("./DashboardClient"), { ssr: false });
import { requireAuth } from "@/lib/serverAuth";
import { Role, CashDepositStatus, DispatchStatus, MachineStatus, VehicleStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  // Enforce auth (Admin/Staff only)
  await requireAuth({ allowedRoles: [Role.OWNER, Role.ADMIN, Role.STAFF] });

  const today = startOfDay(new Date());

  // Parallel Execution: Fetch all metrics simultaneously to prevent bottlenecking
  const [
    revenueAgg,
    dispatchesToday,
    machineMetrics,
    past7DaysDispatches,
    pendingReceiptsAgg,
    expensesTodayList,
    unbilledDispatchesCount,
    invoicedTodayAgg,
    totalToolsCount,
    deployedToolsCount,
    vehicleMetrics,
    totalEmployeesCount,
    openMaintenanceCount,
    complianceAlertsCount,
    sampleRates
  ] = await Promise.all([
    // A. Total Verified Revenue (Sum of CashCollections)
    prisma.cashCollection.aggregate({
      _sum: { amountCollected: true },
      where: { status: CashDepositStatus.DEPOSITED }
    }),

    // B. Today's Dispatches with Customer & Crew details
    prisma.dailyDispatch.findMany({
      where: {
        dateOfService: { gte: today, lte: endOfDay(today) },
        isPendingDelete: false
      },
      include: {
        customer: { select: { name: true } },
        crewAssignments: true
      },
      orderBy: { createdAt: "desc" }
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
    }),

    // E. Pending Cash Drops (Driver receipts pending deposit)
    prisma.paymentReceipt.aggregate({
      _sum: { amount: true },
      _count: { _all: true },
      where: { depositStatus: "PENDING_DEPOSIT", isPendingDelete: false }
    }),

    // F. Today's Expenses List for Breakdown
    prisma.expense.findMany({
      where: { date: { gte: today, lte: endOfDay(today) } },
      select: { amount: true, category: true, description: true }
    }),

    // G. Unbilled Dispatches Count (delivered without invoice)
    prisma.dailyDispatch.count({
      where: {
        status: { in: [DispatchStatus.DELIVERED, DispatchStatus.PICKED_UP] },
        invoiceId: null,
        isPendingDelete: false
      }
    }),

    // H. Invoices Created Today
    prisma.invoice.aggregate({
      _sum: { totalAmount: true },
      _count: { _all: true },
      where: { createdAt: { gte: today, lte: endOfDay(today) } }
    }),

    // I. Tools Inventory Counts
    prisma.tool.count({ where: { isPendingDelete: false } }),
    prisma.dispatchTool.count({
      where: {
        dispatch: {
          status: { in: [DispatchStatus.ACCEPTED, DispatchStatus.EN_ROUTE, DispatchStatus.IN_PROGRESS, DispatchStatus.DELIVERED] },
          isPendingDelete: false
        }
      }
    }),

    // J. Vehicles Breakdown
    prisma.vehicle.groupBy({
      by: ["status"],
      _count: { _all: true },
      where: { status: { not: "RETIRED" }, isPendingDelete: false }
    }),

    // K. Workforce & Support Counts
    prisma.employee.count({ where: { isPendingDelete: false } }),
    prisma.maintenanceTicket.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    prisma.vehicleDocument.count({ where: { status: "EXPIRED" } }),

    // L. Sample Work Type Rates
    prisma.workTypeRate.findMany({
      take: 3,
      orderBy: { payoutRate: "desc" },
      select: { machineType: true, workType: true, payoutRate: true }
    })
  ]);

  // 1. Serialization Layer: Convert Prisma Decimals to raw JS Numbers
  const totalRevenue = revenueAgg._sum?.amountCollected
    ? Number(revenueAgg._sum.amountCollected.toString())
    : 0;

  // 2. Process Bookings Status Breakdown
  let pendingDispatches = 0;
  let enRouteDispatches = 0;
  let onSiteDispatches = 0;
  let completedDispatches = 0;
  let pnlRevenue = 0;
  let pnlLabor = 0;

  dispatchesToday.forEach((d: any) => {
    if (d.status === DispatchStatus.PENDING) pendingDispatches++;
    else if (d.status === DispatchStatus.EN_ROUTE) enRouteDispatches++;
    else if (d.status === DispatchStatus.ACCEPTED || d.status === DispatchStatus.IN_PROGRESS) onSiteDispatches++;
    else if (d.status === DispatchStatus.DELIVERED || d.status === DispatchStatus.PICKED_UP) completedDispatches++;

    // Calculate daily P&L components
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

  // Recent jobs preview (up to 4 jobs)
  const recentJobsPreview = dispatchesToday.slice(0, 4).map((d: any) => ({
    id: d.id,
    customerName: d.customer?.name || "Standard Booking",
    location: d.location || "On Site",
    status: d.status,
    charge: Number(d.customerCharge || 0)
  }));

  // 3. Process Expenses Breakdown
  let dieselExpense = 0;
  let outsideLaborExpense = 0;
  let storeMaterialExpense = 0;
  let otherExpense = 0;
  let totalExpensesToday = 0;

  expensesTodayList.forEach((exp: any) => {
    const val = Number(exp.amount || 0);
    totalExpensesToday += val;
    if (exp.category === "DIESEL") dieselExpense += val;
    else if (exp.category === "OUTSIDE_HELPER_WAGE" || exp.category === "CONTRACTOR_ADVANCE") outsideLaborExpense += val;
    else if (exp.category === "TOOL_PARTS" || exp.category === "WORKSHOP" || exp.category === "REPAIR") storeMaterialExpense += val;
    else otherExpense += val;
  });

  const dailyGrossMargin = pnlRevenue - pnlLabor - totalExpensesToday;

  // 4. Process Machine Metrics
  let availableMachines = 0;
  let rentedMachines = 0;
  let repairMachines = 0;
  machineMetrics.forEach((m: any) => {
    if (m.status === MachineStatus.AVAILABLE) availableMachines = m._count._all;
    if (m.status === MachineStatus.RENTED) rentedMachines = m._count._all;
    if (m.status === MachineStatus.REPAIR) repairMachines = m._count._all;
  });
  const totalMachines = availableMachines + rentedMachines + repairMachines;

  // 5. Process Vehicle Metrics
  let availableVehicles = 0;
  let inUseVehicles = 0;
  let repairVehicles = 0;
  vehicleMetrics.forEach((v: any) => {
    if (v.status === VehicleStatus.AVAILABLE) availableVehicles = v._count._all;
    if (v.status === VehicleStatus.IN_USE) inUseVehicles = v._count._all;
    if (v.status === VehicleStatus.REPAIR) repairVehicles = v._count._all;
  });
  const totalVehicles = availableVehicles + inUseVehicles + repairVehicles;

  // 6. Process 7-day volume chart data
  const volumeMap: Record<string, number> = {};
  for (let i = 6; i >= 0; i--) {
    const d = subDays(today, i).toISOString().split("T")[0];
    volumeMap[d] = 0;
  }
  past7DaysDispatches.forEach((d: any) => {
    const dateStr = d.dateOfService.toISOString().split("T")[0];
    if (volumeMap[dateStr] !== undefined) {
      volumeMap[dateStr]++;
    }
  });
  const chartData = Object.keys(volumeMap).map((date) => ({
    date,
    count: volumeMap[date]
  }));

  // Serialized metrics structure passed strictly JSON-safe
  const serializedMetrics = {
    heading1: {
      bookings: {
        totalToday: dispatchesToday.length,
        pending: pendingDispatches,
        enRoute: enRouteDispatches,
        onSite: onSiteDispatches,
        completed: completedDispatches,
        recentJobs: recentJobsPreview
      },
      cashCollections: {
        totalVerifiedDeposits: totalRevenue,
        pendingDropsCount: pendingReceiptsAgg._count?._all || 0,
        pendingDropsAmount: Number(pendingReceiptsAgg._sum?.amount || 0)
      },
      expenses: {
        totalToday: totalExpensesToday,
        diesel: dieselExpense,
        outsideLabor: outsideLaborExpense,
        storeMaterials: storeMaterialExpense,
        other: otherExpense,
        dailyBudgetLimit: 35000
      },
      billing: {
        invoicedToday: Number(invoicedTodayAgg._sum?.totalAmount || 0),
        invoicesCountToday: invoicedTodayAgg._count?._all || 0,
        unbilledDispatchesCount
      },
      pnl: {
        revenue: pnlRevenue,
        labor: pnlLabor,
        expenses: totalExpensesToday,
        margin: dailyGrossMargin
      }
    },
    heading2: {
      tools: {
        totalInventory: totalToolsCount,
        deployedOnSite: deployedToolsCount,
        availableInStore: Math.max(0, totalToolsCount - deployedToolsCount)
      },
      fleet: {
        machines: {
          total: totalMachines,
          available: availableMachines,
          rented: rentedMachines,
          repair: repairMachines
        },
        vehicles: {
          total: totalVehicles,
          available: availableVehicles,
          inUse: inUseVehicles,
          repair: repairVehicles
        }
      }
    },
    heading3: {
      userCredentialsCount: totalEmployeesCount,
      openMaintenanceTickets: openMaintenanceCount,
      complianceAlerts: complianceAlertsCount,
      sampleRates: sampleRates.map((r: any) => ({
        machineType: r.machineType,
        workType: r.workType,
        payoutRate: Number(r.payoutRate)
      })),
      chartData
    }
  };

  return <DashboardClient metrics={serializedMetrics} />;
}
