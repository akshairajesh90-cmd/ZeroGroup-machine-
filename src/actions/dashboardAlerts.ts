"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";

export interface DashboardAlertsData {
  highFuelExpenses: Array<{
    id: string;
    amount: number;
    description: string;
    date: string;
    assetName: string;
    loggerName: string;
  }>;
  pendingAdjustments: Array<{
    id: string;
    amount: number;
    type: string;
    reason: string;
    date: string;
    employeeName: string;
    creatorName: string;
  }>;
  flaggedDispatches: Array<{
    id: string;
    customerName: string;
    location: string;
    date: string;
    conflictReport: string;
    driverName: string;
  }>;
}

/**
 * Fetches critical alert exceptions for the top-priority Management by Exception Alert Row.
 * If all 3 arrays are empty, the dashboard is completely clean.
 */
export async function getDashboardAlerts(): Promise<{ success: boolean; data?: DashboardAlertsData; error?: string }> {
  const session = await auth();
  if (!session?.user || (session.user.role !== "OWNER" && session.user.role !== "STAFF")) {
    return { success: false, error: "Unauthorized access to alerts." };
  }

  try {
    // 1. High Fuel Alerts
    const triggeredExpenses = await prisma.expense.findMany({
      where: { isAlertTriggered: true },
      include: {
        machine: true,
        vehicle: true,
        logger: true,
      },
      orderBy: { date: "desc" },
    });

    const highFuelExpenses = triggeredExpenses.map((e) => ({
      id: e.id,
      amount: Number(e.amount),
      description: e.description || `${e.category} over threshold`,
      date: e.date.toISOString().split("T")[0],
      assetName: e.machine?.machineId || e.vehicle?.licensePlate || "General Asset",
      loggerName: e.logger.name,
    }));

    // 2. Pending Adjustments (Adjustments requiring OWNER approval, typically > ₹500)
    const pendingAdj = await prisma.manualAdjustment.findMany({
      where: { status: "PENDING" },
      include: {
        employee: true,
        createdBy: true,
      },
      orderBy: { createdAt: "desc" },
    });

    const pendingAdjustments = pendingAdj.map((a) => ({
      id: a.id,
      amount: Number(a.amount),
      type: a.type,
      reason: a.reason,
      date: a.date.toISOString().split("T")[0],
      employeeName: a.employee.name,
      creatorName: a.createdBy.name,
    }));

    // 3. Flagged Field Conflict Reports
    const flaggedDisp = await prisma.dailyDispatch.findMany({
      where: { isFlagged: true },
      include: {
        customer: true,
        driver: true,
      },
      orderBy: { dateOfService: "desc" },
    });

    const flaggedDispatches = flaggedDisp.map((d) => ({
      id: d.id,
      customerName: d.customer.name,
      location: d.location,
      date: d.dateOfService.toISOString().split("T")[0],
      conflictReport: d.conflictReport || "Driver flagged dispute on-site",
      driverName: d.driver?.name || "Public Transport / Outside",
    }));

    return {
      success: true,
      data: {
        highFuelExpenses,
        pendingAdjustments,
        flaggedDispatches,
      },
    };
  } catch (err: any) {
    console.error("Error fetching dashboard alerts:", err);
    return { success: false, error: err.message || "Failed to fetch alerts." };
  }
}
