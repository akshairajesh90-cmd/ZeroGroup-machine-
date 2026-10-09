import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthForApi } from "@/lib/serverAuth";
import { Role, CrewRole } from "@prisma/client";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
    try {
        const { ctx, response } = await requireAuthForApi({
            allowedRoles: [Role.STAFF, Role.ADMIN, Role.OWNER],
        });
        if (response) return response;

        const payload = await request.json();
        const { dispatches } = payload;

        if (!dispatches || !Array.isArray(dispatches)) {
            return NextResponse.json(
                { success: false, error: "Invalid payload: expected dispatches array" },
                { status: 400 }
            );
        }

        await prisma.$transaction(async (tx) => {
            for (const d of dispatches) {
                const { dispatchId, siteLeaderEmployeeId, crewAssignments, dispatchTools } = d;

                if (!dispatchId) continue;

                // 1. Update Site Leader
                if (siteLeaderEmployeeId !== undefined) {
                    await tx.dailyDispatch.update({
                        where: { id: dispatchId },
                        data: { siteLeaderEmployeeId: siteLeaderEmployeeId || null },
                    });
                }

                // 2. Replace Crew Assignments
                if (crewAssignments && Array.isArray(crewAssignments)) {
                    await tx.dispatchAssignment.deleteMany({
                        where: { dispatchId },
                    });

                    for (const assignment of crewAssignments) {
                        if (!assignment.employeeId || !assignment.assignedRole) continue;

                        const emp = await tx.employee.findUnique({
                            where: { id: assignment.employeeId },
                            select: { baseDailyWage: true },
                        });

                        await tx.dispatchAssignment.create({
                            data: {
                                dispatchId,
                                employeeId: assignment.employeeId,
                                assignedRole: assignment.assignedRole as CrewRole,
                                lockedWageRate:
                                    typeof assignment.lockedWageRate === "number"
                                        ? assignment.lockedWageRate
                                        : Number(emp?.baseDailyWage || 0),
                            },
                        });
                    }
                }

                // 3. Replace Dispatch Tools
                if (dispatchTools && Array.isArray(dispatchTools)) {
                    await tx.dispatchTool.deleteMany({
                        where: { dispatchId },
                    });

                    for (const toolItem of dispatchTools) {
                        if (!toolItem.toolId) continue;
                        await tx.dispatchTool.create({
                            data: {
                                dispatchId,
                                toolId: toolItem.toolId,
                                quantity: Number(toolItem.quantity) || 1,
                                variant: toolItem.variant || null,
                            },
                        });
                    }
                }
            }
        });

        return NextResponse.json({
            success: true,
            message: `Batch crew & tool allocation updated for ${dispatches.length} dispatches`,
        });
    } catch (error: any) {
        console.error("Batch Crew Allocation API Error:", error);
        return NextResponse.json(
            { success: false, error: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}
