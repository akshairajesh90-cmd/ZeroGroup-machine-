"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/serverAuth";
import { DispatchStatus, ExpenseCategory } from "@prisma/client";
import { startOfDay } from "date-fns";

// ─── Type Definitions ────────────────────────────────────────────────────────

export interface FuelAlertItem {
  id: string;
  amount: number;
  description: string;
  date: string;
  assetName: string;
  loggerName: string;
}

export interface OverdueDispatchItem {
  id: string;
  customerName: string;
  location: string;
  date: string;
  status: DispatchStatus;
  driverName: string;
  operatorName: string;
}

export interface PendingAdjustmentItem {
  id: string;
  amount: number;
  type: string;
  reason: string;
  date: string;
  employeeName: string;
  creatorName: string;
}

export interface FlaggedDispatchItem {
  id: string;
  customerName: string;
  location: string;
  date: string;
  conflictReport: string;
  driverName: string;
}

export interface DashboardAlertsData {
  highFuelExpenses: FuelAlertItem[];
  overdueDispatches: OverdueDispatchItem[];
  pendingAdjustments: PendingAdjustmentItem[];
  flaggedDispatches: FlaggedDispatchItem[];
}

// ─── Active (non-terminal) dispatch statuses ─────────────────────────────────
const ACTIVE_STATUSES: DispatchStatus[] = [
  DispatchStatus.PENDING,
  DispatchStatus.ACCEPTED,
  DispatchStatus.EN_ROUTE,
  DispatchStatus.IN_PROGRESS,
];

// ─── Standalone: Fuel Alerts ─────────────────────────────────────────────────

export async function getFuelAlerts(): Promise<{ success: boolean; data?: FuelAlertItem[]; error?: string }> {
  try {
    await requireAuth({ allowedRoles: ["ADMIN", "OWNER"], redirectOnFail: false });
  } catch {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const expenses = await prisma.expense.findMany({
      where: {
        category: ExpenseCategory.DIESEL, // DIESEL = fuel category in this schema
        isAlertTriggered: true,
        isPendingDelete: false,
      },
      include: { machine: true, vehicle: true, logger: true },
      orderBy: { date: "desc" },
      take: 20,
    });

    const data: FuelAlertItem[] = expenses.map((e) => ({
      id: e.id,
      amount: Number(e.amount),
      description: e.description ?? `${e.category} alert`,
      date: e.date.toISOString().split("T")[0],
      assetName: e.machine?.machineId ?? e.vehicle?.licensePlate ?? "General Asset",
      loggerName: e.logger.name,
    }));

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Standalone: Overdue Dispatches ──────────────────────────────────────────

export async function getOverdueDispatches(): Promise<{ success: boolean; data?: OverdueDispatchItem[]; error?: string }> {
  try {
    await requireAuth({ allowedRoles: ["ADMIN", "OWNER"], redirectOnFail: false });
  } catch {
    return { success: false, error: "Unauthorized" };
  }

  try {
    const todayStart = startOfDay(new Date());

    const dispatches = await prisma.dailyDispatch.findMany({
      where: {
        dateOfService: { lt: todayStart },
        status: { in: ACTIVE_STATUSES },
      },
      include: {
        customer: true,
        driver: true,
        operator: true, // Employee? directly via OperatorDispatches relation
      },
      orderBy: { dateOfService: "asc" },
      take: 20,
    });

    const data: OverdueDispatchItem[] = dispatches.map((d) => ({
      id: d.id,
      customerName: d.customer?.name ?? "Unknown Customer",
      location: d.location,
      date: d.dateOfService.toISOString().split("T")[0],
      status: d.status,
      driverName: d.driver?.name ?? "Unassigned",
      operatorName: d.operator?.name ?? "Unassigned",
    }));

    return { success: true, data };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

// ─── Consolidated: All Dashboard Alerts ──────────────────────────────────────

export async function getDashboardAlerts(): Promise<{ success: boolean; data?: DashboardAlertsData; error?: string }> {
  try {
    await requireAuth({ allowedRoles: ["ADMIN", "OWNER"], redirectOnFail: false });
  } catch {
    return { success: false, error: "Unauthorized access to alerts." };
  }

  try {
    const todayStart = startOfDay(new Date());

    const [fuelExpenses, overdueDisp, pendingAdj, flaggedDisp] = await Promise.all([
      // 1. Fuel/Diesel Expense Alerts
      prisma.expense.findMany({
        where: {
          category: ExpenseCategory.DIESEL,
          isAlertTriggered: true,
          isPendingDelete: false,
        },
        include: { machine: true, vehicle: true, logger: true },
        orderBy: { date: "desc" },
        take: 20,
      }),

      // 2. Overdue Dispatches
      prisma.dailyDispatch.findMany({
        where: {
          dateOfService: { lt: todayStart },
          status: { in: ACTIVE_STATUSES },
        },
        include: {
          customer: true,
          driver: true,
          operator: true,
        },
        orderBy: { dateOfService: "asc" },
        take: 20,
      }),

      // 3. Pending Manual Adjustments
      prisma.manualAdjustment.findMany({
        where: { status: "PENDING" },
        include: { employee: true, createdBy: true },
        orderBy: { createdAt: "desc" },
        take: 20,
      }),

      // 4. Flagged Field Conflict Reports
      prisma.dailyDispatch.findMany({
        where: { isFlagged: true },
        include: { customer: true, driver: true },
        orderBy: { dateOfService: "desc" },
        take: 20,
      }),
    ]);

    return {
      success: true,
      data: {
        highFuelExpenses: fuelExpenses.map((e) => ({
          id: e.id,
          amount: Number(e.amount),
          description: e.description ?? `${e.category} alert`,
          date: e.date.toISOString().split("T")[0],
          assetName: e.machine?.machineId ?? e.vehicle?.licensePlate ?? "General Asset",
          loggerName: e.logger.name,
        })),

        overdueDispatches: overdueDisp.map((d) => ({
          id: d.id,
          customerName: d.customer?.name ?? "Unknown Customer",
          location: d.location,
          date: d.dateOfService.toISOString().split("T")[0],
          status: d.status,
          driverName: d.driver?.name ?? "Unassigned",
          operatorName: d.operator?.name ?? "Unassigned",
        })),

        pendingAdjustments: pendingAdj.map((a) => ({
          id: a.id,
          amount: Number(a.amount),
          type: a.type,
          reason: a.reason,
          date: a.date.toISOString().split("T")[0],
          employeeName: a.employee.name,
          creatorName: a.createdBy.name,
        })),

        flaggedDispatches: flaggedDisp.map((d) => ({
          id: d.id,
          customerName: d.customer?.name ?? "Unknown",
          location: d.location,
          date: d.dateOfService.toISOString().split("T")[0],
          conflictReport: d.conflictReport ?? "Driver flagged dispute on-site",
          driverName: d.driver?.name ?? "Unassigned",
        })),
      },
    };
  } catch (err: any) {
    console.error("getDashboardAlerts error:", err);
    return { success: false, error: err.message ?? "Failed to fetch alerts." };
  }
}
