import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthForApi } from "@/lib/serverAuth";
import { logAudit } from "@/lib/auditLogger";
import { CrewRole, Role } from "@prisma/client";

export const dynamic = "force-dynamic";

// ─── GET: fetch all DispatchAssignment[] for a dispatch ──────────────────────
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { ctx, response } = await requireAuthForApi({
      allowedRoles: [Role.STAFF, Role.ADMIN, Role.OWNER],
    });
    if (response) return response;

    const dispatchId = params.id;

    const dispatch = await prisma.dailyDispatch.findUnique({
      where: { id: dispatchId },
    });
    if (!dispatch) {
      return NextResponse.json({ error: "Dispatch not found" }, { status: 404 });
    }

    const assignments = await prisma.dispatchAssignment.findMany({
      where: { dispatchId },
      include: {
        employee: { select: { id: true, name: true, role: true, defaultCrewRole: true, profilePhotoUrl: true, operatorType: true } },
        contractor: { select: { id: true, name: true, companyName: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ success: true, assignments });
  } catch (error: any) {
    console.error("Error fetching crew assignments:", error);
    return NextResponse.json(
      { error: "Failed to fetch crew assignments" },
      { status: 500 }
    );
  }
}

// ─── POST: batch upsert crew assignments ─────────────────────────────────────
// Body: { assignments: Array<{ employeeId?, contractorId?, assignedRole, lockedWageRate, headcount? }> }
export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { ctx, response } = await requireAuthForApi({
      allowedRoles: [Role.STAFF, Role.ADMIN, Role.OWNER],
    });
    if (response) return response;

    const dispatchId = params.id;
    const body = await request.json();
    const assignments: Array<{
      employeeId?: string;
      contractorId?: string;
      assignedRole: CrewRole;
      lockedWageRate: number;
      headcount?: number;
    }> = body.assignments;

    if (!Array.isArray(assignments) || assignments.length === 0) {
      return NextResponse.json(
        { error: "assignments must be a non-empty array" },
        { status: 400 }
      );
    }

    for (const a of assignments) {
      if (!a.assignedRole) {
        return NextResponse.json(
          { error: "Each assignment must include assignedRole" },
          { status: 400 }
        );
      }
      if (!a.employeeId && !a.contractorId) {
        return NextResponse.json(
          { error: "Each assignment must have either employeeId or contractorId" },
          { status: 400 }
        );
      }
      if (!Object.values(CrewRole).includes(a.assignedRole)) {
        return NextResponse.json(
          { error: `Invalid assignedRole: ${a.assignedRole}` },
          { status: 400 }
        );
      }
    }

    const dispatch = await prisma.dailyDispatch.findUnique({
      where: { id: dispatchId },
    });
    if (!dispatch) {
      return NextResponse.json({ error: "Dispatch not found" }, { status: 404 });
    }

    const oldAssignments = await prisma.dispatchAssignment.findMany({
      where: { dispatchId },
    });

    const upserted = await prisma.$transaction(
      assignments.map((a) => {
        const whereClause = a.employeeId
          ? { dispatchId_employeeId: { dispatchId, employeeId: a.employeeId } }
          : { dispatchId_contractorId: { dispatchId, contractorId: a.contractorId! } };

        const sharedData = {
          assignedRole: a.assignedRole,
          lockedWageRate: a.lockedWageRate ?? 0,
          headcount: a.headcount ?? 1,
        };

        return prisma.dispatchAssignment.upsert({
          where: whereClause,
          update: sharedData,
          create: {
            dispatchId,
            employeeId: a.employeeId ?? null,
            contractorId: a.contractorId ?? null,
            ...sharedData,
          },
        });
      })
    );

    await logAudit({
      actorId: ctx!.employeeId,
      actorRole: ctx!.role as Role,
      actionType: "CREW_BATCH_UPSERT",
      modelName: "DispatchAssignment",
      oldPayload: oldAssignments,
      newPayload: assignments,
    });

    return NextResponse.json({ success: true, upserted });
  } catch (error: any) {
    console.error("Error batch-upserting crew assignments:", error);
    return NextResponse.json(
      { error: "Failed to update crew assignments" },
      { status: 500 }
    );
  }
}

// ─── DELETE: remove a single crew assignment by assignmentId ─────────────────
// Body: { assignmentId: string }
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { ctx, response } = await requireAuthForApi({
      allowedRoles: [Role.STAFF, Role.ADMIN, Role.OWNER],
    });
    if (response) return response;

    const dispatchId = params.id;
    const body = await request.json();
    const { assignmentId } = body;

    if (!assignmentId) {
      return NextResponse.json({ error: "assignmentId is required" }, { status: 400 });
    }

    const assignment = await prisma.dispatchAssignment.findFirst({
      where: { id: assignmentId, dispatchId },
    });

    if (!assignment) {
      return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
    }

    await prisma.dispatchAssignment.delete({ where: { id: assignmentId } });

    await logAudit({
      actorId: ctx!.employeeId,
      actorRole: ctx!.role as Role,
      actionType: "CREW_REMOVED",
      modelName: "DispatchAssignment",
      oldPayload: assignment,
      newPayload: null,
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Error deleting crew assignment:", error);
    return NextResponse.json(
      { error: "Failed to remove crew member" },
      { status: 500 }
    );
  }
}
