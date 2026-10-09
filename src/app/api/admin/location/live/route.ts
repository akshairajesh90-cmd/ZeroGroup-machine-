import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES: Role[] = [Role.ADMIN, Role.OWNER, Role.STAFF];

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = await prisma.user.findUnique({ where: { email: session.user.email } });
    if (!user || !ALLOWED_ROLES.includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Get the latest ping for each employee from the last 15 minutes
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60000);
    
    // Prisma doesn't have a simple DISTINCT ON for this without raw queries,
    // so we'll fetch recent pings and group in memory
    const recentPings = await prisma.locationPing.findMany({
      where: {
        timestamp: { gte: fifteenMinutesAgo }
      },
      orderBy: { timestamp: "desc" },
      include: {
        employee: {
          select: { name: true, role: true, profilePhotoUrl: true }
        },
        dispatch: {
          include: {
            customer: { select: { name: true } },
            machine: { select: { machineId: true, type: true } },
            operator: { select: { name: true, profilePhotoUrl: true } },
            crewAssignments: {
              include: { employee: { select: { name: true, role: true, profilePhotoUrl: true } } }
            },
            dispatchTools: {
              include: { tool: { select: { toolId: true, toolType: true } } }
            }
          }
        }
      }
    });

    const uniqueEmployeePings = new Map();
    for (const ping of recentPings) {
      if (!uniqueEmployeePings.has(ping.employeeId)) {
        uniqueEmployeePings.set(ping.employeeId, ping);
      }
    }

    const liveData = Array.from(uniqueEmployeePings.values()).map(ping => {
      const activeEmployee = ping.employee;
      const d = ping.dispatch;
      
      return {
        id: ping.id,
        dispatchId: ping.dispatchId,
        lat: Number(ping.latitude),
        lng: Number(ping.longitude),
        accuracy: ping.accuracy,
        timestamp: ping.timestamp.toISOString(),
        source: ping.source,
        employee: {
          name: activeEmployee.name,
          role: activeEmployee.role,
          profilePhotoUrl: activeEmployee.profilePhotoUrl,
        },
        dispatch: d ? {
          location: d.location,
          customerName: d.customer?.name || "Unknown Customer",
          machine: d.machine ? `${d.machine.machineId} (${d.machine.type})` : null,
          operator: d.operator ? d.operator.name : null,
          crew: d.crewAssignments.map((c: any) => ({
            name: c.employee.name,
            role: c.assignedRole
          })),
          tools: d.dispatchTools.map((t: any) => `${t.tool.toolId} (${t.tool.toolType})`)
        } : null
      };
    });

    return NextResponse.json({ success: true, data: liveData });
  } catch (error: any) {
    console.error("Live map error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
