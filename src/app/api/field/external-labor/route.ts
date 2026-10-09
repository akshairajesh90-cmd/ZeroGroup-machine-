import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthForApi } from "@/lib/serverAuth";
import { logAudit } from "@/lib/auditLogger";
import { z } from "zod";

const schema = z.object({
    fieldDiaryLogId: z.string().min(1),
    subLeaderName: z.string().min(1),
    workerCount: z.number().min(1),
    cashPaid: z.number().min(0),
    notes: z.string().optional(),
});

export async function POST(req: Request) {
    try {
        const { ctx, response: authResponse } = await requireAuthForApi({ allowedRoles: ["OPERATOR", "STAFF", "ADMIN", "OWNER"] });
        if (authResponse) return authResponse;
        const actorId = ctx!.employeeId;
        const role = ctx!.role;

        const body = await req.json();
        const parsed = schema.safeParse(body);
        if (!parsed.success) {
            return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
        }

        const data = parsed.data;

        // Verify Diary Log exists and check authorization (must be assigned operator or site leader, OR staff/admin)
        const diary = await prisma.fieldDiaryLog.findUnique({
            where: { id: data.fieldDiaryLogId },
            include: {
                dispatch: {
                    include: { crewAssignments: true }
                }
            }
        });

        if (!diary) {
            return NextResponse.json({ error: "Field diary not found" }, { status: 404 });
        }

        const { dispatch } = diary;
        const isOperator = dispatch.operatorId === actorId;
        const isSiteLeader = dispatch.crewAssignments.some(ca => ca.employeeId === actorId && ca.assignedRole === "WORKER_LEADER");
        const isStaffOrAdmin = ["STAFF", "ADMIN", "OWNER"].includes(role);

        if (!isOperator && !isSiteLeader && !isStaffOrAdmin) {
            return NextResponse.json({ error: "Only the assigned Site Leader, Operator, or Staff can log external labor." }, { status: 403 });
        }

        const externalLabor = await prisma.externalLaborLog.create({
            data: {
                fieldDiaryLogId: data.fieldDiaryLogId,
                subLeaderName: data.subLeaderName,
                workerCount: data.workerCount,
                cashPaid: data.cashPaid,
                notes: data.notes
            }
        });

        await logAudit({
            actorId,
            actorRole: role,
            actionType: "ADD_EXTERNAL_LABOR",
            modelName: "ExternalLaborLog",
            newPayload: externalLabor,
        });

        return NextResponse.json({ success: true, data: externalLabor });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
