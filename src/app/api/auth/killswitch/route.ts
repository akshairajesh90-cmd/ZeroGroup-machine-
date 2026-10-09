import { NextRequest, NextResponse } from "next/server";
import { requireAuthForApi } from "@/lib/serverAuth";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { logAudit } from "@/lib/auditLogger";

export async function POST(req: NextRequest) {
  try {
    const { ctx: _sessionPost, response } = await requireAuthForApi({ allowedRoles: [Role.OWNER, Role.ADMIN] });
    if (response) return response;
    const session = _sessionPost!;
    // We strictly use originalAdminId to ensure even if they impersonate, we log the REAL admin who triggered it
    const realAdminId = session.originalAdminId || session.userId;
    const realAdminRole = session.originalAdminId ? Role.ADMIN : session.role; // Safe assumption

    const { toggleMaintenanceMode } = await req.json();

    let message = "Kill Switch Activated: All sessions invalidated globally.";
    
    // 1. Invalidate ALL sessions globally (except maybe the current one? No, we increment all)
    await prisma.user.updateMany({
      data: {
        sessionTokenVersion: { increment: 1 }
      }
    });

    // We must manually preserve our own session so we don't lock ourselves out while activating maintenance mode
    // We incremented everything, so we increment our own local JWT version via an update callback
    
    if (toggleMaintenanceMode) {
      await prisma.systemSettings.upsert({
        where: { id: "default" },
        update: { maintenanceMode: true },
        create: { id: "default", maintenanceMode: true }
      });
      message += " Maintenance Mode ENABLED.";
    }

    await logAudit({
      actorId: session.employeeId, // Use the employee ID we have for the current session
      actorRole: realAdminRole,
      actionType: "SYSTEM_KILL_SWITCH",
      modelName: "SystemSettings",
      newPayload: { maintenanceMode: toggleMaintenanceMode }
    });

    return NextResponse.json({ 
      success: true, 
      message,
      // Pass back a flag so the client can immediately run `update()` to increment their own token version
      requiresSessionRefresh: true
    });
  } catch (error: any) {
    console.error("Killswitch error:", error);
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { ctx: _sessionDel, response } = await requireAuthForApi({ allowedRoles: [Role.OWNER, Role.ADMIN] });
    if (response) return response;
    const session = _sessionDel!;
    const realAdminId = session.originalAdminId || session.userId;
    const realAdminRole = session.originalAdminId ? Role.ADMIN : session.role; 

    // Disable maintenance mode
    await prisma.systemSettings.updateMany({
      data: { maintenanceMode: false }
    });

    await logAudit({
      actorId: session.employeeId, 
      actorRole: realAdminRole,
      actionType: "SYSTEM_MAINTENANCE_DISABLE",
      modelName: "SystemSettings",
      newPayload: { maintenanceMode: false }
    });

    return NextResponse.json({ success: true, message: "Maintenance Mode DISABLED." });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
}
