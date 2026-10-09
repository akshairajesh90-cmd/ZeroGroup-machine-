import { NextRequest, NextResponse } from "next/server";
import { requireAuthForApi } from "@/lib/serverAuth";
import { Role } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { ctx: _sessionCtx, response } = await requireAuthForApi({ allowedRoles: [Role.OWNER, Role.ADMIN] });
    if (response) return response;
    const session = _sessionCtx!;

    // Do not allow double impersonation
    if (session.isImpersonating) {
      return NextResponse.json({ error: "Cannot impersonate while already impersonating" }, { status: 403 });
    }

    const { employeeId } = await req.json();

    if (!employeeId || typeof employeeId !== "string") {
      return NextResponse.json({ error: "Missing or invalid employeeId" }, { status: 400 });
    }

    // Lookup the target user
    const targetEmployee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { user: true }
    });

    if (!targetEmployee || !targetEmployee.user) {
      return NextResponse.json({ error: "User not found or no system account linked" }, { status: 404 });
    }

    // Return the data so the client can call NextAuth update()
    return NextResponse.json({ 
      success: true, 
      target: {
        id: targetEmployee.user.id,
        role: targetEmployee.user.role,
        employeeId: targetEmployee.id
      }
    });
  } catch (error: any) {
    console.error("Impersonate error:", error);
    return NextResponse.json({ error: error.message }, { status: 403 });
  }
}
