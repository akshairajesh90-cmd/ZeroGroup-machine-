"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/serverAuth";
import { Role } from "@prisma/client";
import { subDays, subWeeks, subMonths, startOfDay } from "date-fns";

export async function getAuditLogs(params: {
  timeframe: "DAY" | "WEEK" | "MONTH";
  searchTerm?: string;
}) {
  try {
    // Admins, Owners, and Staff can view audit logs, but Staff only sees Staff actions
    const session = await requireAuth({ allowedRoles: [Role.OWNER, Role.ADMIN, Role.STAFF] });
    const isStaffUser = session.role === Role.STAFF;

    const now = new Date();
    let startDate: Date;

    switch (params.timeframe) {
      case "DAY":
        startDate = startOfDay(now);
        break;
      case "WEEK":
        startDate = subWeeks(now, 1);
        break;
      case "MONTH":
        startDate = subMonths(now, 1);
        break;
      default:
        startDate = startOfDay(now);
    }

    // Fetch logs from DB
    const logs = await prisma.auditLog.findMany({
      where: {
        timestamp: {
          gte: startDate,
        },
        ...(isStaffUser ? {
          actorRole: {
            notIn: [Role.ADMIN, Role.OWNER]
          }
        } : {})
      },
      include: {
        actor: {
          select: { name: true, role: true },
        },
      },
      orderBy: {
        timestamp: "desc",
      },
      take: 1000, // Limit to 1000 for performance
    });

    // If search term is provided, do a deep text search across the results (including JSON)
    let filteredLogs = logs;
    if (params.searchTerm) {
      const term = params.searchTerm.toLowerCase();
      filteredLogs = logs.filter((log: any) => {
        const actorMatch = log.actor?.name?.toLowerCase().includes(term);
        const actionMatch = log.actionType?.toLowerCase().includes(term);
        const modelMatch = log.modelName?.toLowerCase().includes(term);
        
        // Convert JSON payloads to string to search deep inside them
        const newPayloadStr = log.newPayload ? JSON.stringify(log.newPayload).toLowerCase() : "";
        const oldPayloadStr = log.oldPayload ? JSON.stringify(log.oldPayload).toLowerCase() : "";
        
        return (
          actorMatch ||
          actionMatch ||
          modelMatch ||
          newPayloadStr.includes(term) ||
          oldPayloadStr.includes(term)
        );
      });
    }

    return { success: true, data: filteredLogs };
  } catch (error: any) {
    console.error("Failed to fetch audit logs:", error);
    return { success: false, error: error.message };
  }
}
