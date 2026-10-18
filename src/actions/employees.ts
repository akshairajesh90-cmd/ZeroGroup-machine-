"use server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/serverAuth";
import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const updateFinancialsSchema = z.object({
  targetEmployeeId: z.string().min(1),
  baseDailyWage: z.number().min(0),
  dailyBataRate: z.number().min(0),
  defaultCrewRole: z.string().nullable().optional(),
});

export async function updateEmployeeFinancials(
  targetEmployeeId: string,
  baseDailyWage: number,
  dailyBataRate: number,
  defaultCrewRole?: string | null
) {
  const { employeeId } = await requireAuth({ allowedRoles: [Role.OWNER, Role.ADMIN, Role.STAFF] });

  const parsed = updateFinancialsSchema.safeParse({ targetEmployeeId, baseDailyWage, dailyBataRate, defaultCrewRole });
  if (!parsed.success) {
    throw new Error("Invalid input data for employee financials.");
  }

  const result = await prisma.$transaction(async (tx) => {
    const currentEmployee = await tx.employee.findUniqueOrThrow({
      where: { id: targetEmployeeId },
      select: { baseDailyWage: true, dailyBataRate: true, name: true, role: true, defaultCrewRole: true }
    });

    const updatedEmployee = await tx.employee.update({
      where: { id: targetEmployeeId },
      data: {
        baseDailyWage,
        dailyBataRate,
        defaultCrewRole: defaultCrewRole as any,
      }
    });

    await tx.auditLog.create({
      data: {
        actionType: "UPDATE_FINANCIALS",
        entity: "EMPLOYEE",
        actorRole: "ADMIN",
        newPayload: { id: targetEmployeeId, delta: { baseDailyWage, dailyBataRate, defaultCrewRole } as any },
        actorId: employeeId
      }
    });

    return updatedEmployee;
  });

  revalidatePath("/owner/employees");
  revalidatePath("/staff/operators");
  revalidatePath("/admin/employees");
  return { success: true, employee: result };
}

// --- ADMIN ONLY: RED DELETE HUB ACTIONS --------------------------------------

export async function hardDeleteEmployee(targetEmployeeId: string) {
  try {
    const { employeeId } = await requireAuth({ allowedRoles: [Role.OWNER] });

    await prisma.$transaction(async (tx) => {
      const employee = await tx.employee.findUniqueOrThrow({
        where: { id: targetEmployeeId }
      });

      await tx.employee.delete({
        where: { id: targetEmployeeId }
      });

      await tx.user.delete({
        where: { id: employee.userId }
      });

      await tx.auditLog.create({
        data: {
          actionType: "HARD_DELETE",
          entity: "EMPLOYEE",
          actorRole: "ADMIN",
          newPayload: { id: targetEmployeeId, delta: { name: employee.name, role: employee.role } as any },
          actorId: employeeId
        }
      });
    });

    revalidatePath("/owner/trash");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function restoreEmployee(targetEmployeeId: string) {
  try {
    const { employeeId } = await requireAuth({ allowedRoles: [Role.OWNER, Role.ADMIN] });

    await prisma.employee.update({
      where: { id: targetEmployeeId },
      data: {
        isPendingDelete: false,
        markedForDeleteBy: null,
      }
    });

    await prisma.auditLog.create({
      data: {
        actionType: "RESTORE_FROM_TRASH",
        entity: "EMPLOYEE",
        actorRole: "ADMIN",
        newPayload: { id: targetEmployeeId, delta: {} as any },
        actorId: employeeId
      }
    });

    revalidatePath("/owner/trash");
    revalidatePath("/staff/operators");
    revalidatePath("/admin/employees");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function softDeleteEmployee(targetEmployeeId: string) {
  try {
    const { employeeId } = await requireAuth({ allowedRoles: [Role.OWNER, Role.ADMIN, Role.STAFF] });
    
    await prisma.employee.update({
      where: { id: targetEmployeeId },
      data: { isPendingDelete: true, markedForDeleteBy: employeeId }
    });

    revalidatePath("/staff/operators");
    revalidatePath("/admin/employees");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function editEmployeeDetails(targetEmployeeId: string, data: any) {
  try {
    const { employeeId } = await requireAuth({ allowedRoles: [Role.OWNER, Role.ADMIN, Role.STAFF] });
    
    const target = await prisma.employee.findUnique({
      where: { id: targetEmployeeId },
      select: { userId: true }
    });

    if (!target) throw new Error("Employee not found");

    const { roleRates, ...employeeData } = data;

    await prisma.$transaction(async (tx) => {
      await tx.employee.update({
        where: { id: targetEmployeeId },
        data: {
          ...employeeData,
          capableRoles: Array.isArray(employeeData.capableRoles) ? { set: employeeData.capableRoles } : undefined,
        }
      });

      if (employeeData.role) {
        await tx.user.update({
          where: { id: target.userId },
          data: { role: employeeData.role }
        });
      }

      if (Array.isArray(roleRates)) {
        await tx.employeeRoleRate.deleteMany({
          where: { employeeId: targetEmployeeId }
        });

        if (roleRates.length > 0) {
          await tx.employeeRoleRate.createMany({
            data: roleRates.map((rr: any) => ({
              employeeId: targetEmployeeId,
              crewRole: rr.crewRole,
              wagePerDay: Number(rr.wagePerDay)
            }))
          });
        }
      }
    });

    revalidatePath("/staff/operators");
    revalidatePath("/admin/employees");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
