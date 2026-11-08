'use server';

import { prisma } from "@/lib/prisma";
import { DispatchStatus } from "@prisma/client";

/**
 * Get Dispatches with relations for UI boards
 */
export async function getDispatches(filter?: { status?: DispatchStatus; isFlagged?: boolean; siteBundleId?: string }) {
  try {
    const where: any = {};
    if (filter?.status) where.status = filter.status;
    if (filter?.isFlagged !== undefined) where.isFlagged = filter.isFlagged;
    if (filter?.siteBundleId) where.siteBundleId = filter.siteBundleId;

    const dispatches = await prisma.dailyDispatch.findMany({
      where,
      include: {
        customer: true,
        machine: true,
        dispatchMachines: {
          include: { machine: true },
        },
        driver: true,
        vehicle: true,
        operator: true,
        worker: true,
        crewAssignments: {
          include: { employee: true },
        },
        dispatchTools: {
          include: { tool: true },
        },
      },
      orderBy: { dateOfService: "desc" },
    });

    return { success: true, data: dispatches };
  } catch (err: any) {
    console.error("Error fetching dispatches:", err);
    return { success: false, error: "Failed to fetch dispatches", data: [] };
  }
}

/**
 * Fetch dispatches for a specific date range (Calendar View optimization)
 */
export async function fetchDispatchesByRange(startDate: string, endDate: string) {
  try {
    const dispatches = await prisma.dailyDispatch.findMany({
      where: {
        dateOfService: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      include: {
        customer: true,
        machine: true,
        dispatchMachines: {
          include: { machine: true },
        },
        driver: true,
        vehicle: true,
        operator: true,
        worker: true,
        mainHelper: true,
        invoice: true,
        siteDisbursements: {
          include: { subLeader: true },
        },
        crewAssignments: {
          include: {
            employee: { select: { id: true, name: true, role: true, profilePhotoUrl: true, phone: true, operatorType: true } },
            contractor: { select: { id: true, name: true, companyName: true } },
          },
        },
        dispatchTools: {
          include: { tool: true },
        },
      },
      orderBy: { dateOfService: "asc" },
    });
    return { success: true, data: dispatches };
  } catch (err: any) {
    console.error("Error fetching dispatches by range:", err);
    return { success: false, error: "Failed to fetch dispatches", data: [] };
  }
}
