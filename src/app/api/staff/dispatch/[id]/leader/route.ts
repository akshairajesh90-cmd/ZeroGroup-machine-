import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthForApi } from "@/lib/serverAuth";
import { logAudit } from "@/lib/auditLogger";
import { Role } from "@prisma/client";

export const dynamic = "force-dynamic";

// ─── PATCH: set siteLeaderEmployeeId on a dispatch ───────────────────────────
export async function PATCH(
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
    const { employeeId } = body;

    if (!employeeId) {
      return NextResponse.json(
        { error: "employeeId is required" },
        { status: 400 }
      );
    }

    // Validate: dispatch must exist
    const dispatch = await prisma.dailyDispatch.findUnique({
      where: { id: dispatchId },
    });
    if (!dispatch) {
      return NextResponse.json({ error: "Dispatch not found" }, { status: 404 });
    }

    // Validate: candidate employee must have isCrewLeader === true
    const candidate = await prisma.employee.findUnique({
      where: { id: employeeId },
      select: { id: true, name: true, isCrewLeader: true, role: true },
    });

    if (!candidate) {
      return NextResponse.json(
        { error: "Employee not found" },
        { status: 404 }
      );
    }

    if (!candidate.isCrewLeader) {
      return NextResponse.json(
        {
          error: `Employee "${candidate.name}" is not designated as a crew leader. Set isCrewLeader = true on their profile first.`,
        },
        { status: 422 }
      );
    }

    const previousLeaderId = dispatch.siteLeaderEmployeeId;

    // Perform update
    const updated = await prisma.dailyDispatch.update({
      where: { id: dispatchId },
      data: { siteLeaderEmployeeId: employeeId },
      select: { id: true, siteLeaderEmployeeId: true, location: true, dateOfService: true },
    });

    // Audit log
    await logAudit({
      actorId: ctx!.employeeId,
      actorRole: ctx!.role as Role,
      actionType: "SET_SITE_LEADER",
      modelName: "DailyDispatch",
      oldPayload: { siteLeaderEmployeeId: previousLeaderId },
      newPayload: { siteLeaderEmployeeId: employeeId, employeeName: candidate.name },
    });

    return NextResponse.json({ success: true, dispatch: updated });
  } catch (error: any) {
    console.error("Error setting site leader:", error);
    return NextResponse.json(
      { error: "Failed to set site leader" },
      { status: 500 }
    );
  }
}
