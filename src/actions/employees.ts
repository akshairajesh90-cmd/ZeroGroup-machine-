"use server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/serverAuth";
import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";

function safeRevalidate(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Ignored in non-request contexts
  }
}
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

  safeRevalidate("/owner/employees");
  safeRevalidate("/staff/operators");
  safeRevalidate("/admin/employees");
  return { success: true, employee: result };
}

// --- ADMIN & OWNER: DELETE & TRASH HUB ACTIONS --------------------------------------

export async function hardDeleteEmployee(targetEmployeeId: string) {
  try {
    const { employeeId } = await requireAuth({ allowedRoles: [Role.OWNER] });

    await prisma.$transaction(async (tx) => {
      const employee = await tx.employee.findUniqueOrThrow({
        where: { id: targetEmployeeId }
      });

      // Clear related child records that can be cleanly removed
      await tx.employeeRoleRate.deleteMany({ where: { employeeId: targetEmployeeId } });
      await tx.employeeDocument.deleteMany({ where: { employeeId: targetEmployeeId } });

      await tx.employee.delete({
        where: { id: targetEmployeeId }
      });

      if (employee.userId) {
        await tx.user.delete({
          where: { id: employee.userId }
        });
      }

      if (employeeId) {
        const actorExists = await tx.employee.findUnique({ where: { id: employeeId }, select: { id: true } });
        if (actorExists) {
          await tx.auditLog.create({
            data: {
              actionType: "HARD_DELETE",
              entity: "EMPLOYEE",
              actorRole: "OWNER",
              newPayload: { id: targetEmployeeId, delta: { name: employee.name, role: employee.role } as any },
              actorId: actorExists.id
            }
          });
        }
      }
    });

    safeRevalidate("/owner/trash");
    safeRevalidate("/admin/trash");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function restoreEmployee(targetEmployeeId: string) {
  try {
    const { employeeId, role } = await requireAuth({ allowedRoles: [Role.OWNER, Role.ADMIN] });

    await prisma.employee.update({
      where: { id: targetEmployeeId },
      data: {
        isPendingDelete: false,
        markedForDeleteBy: null,
      }
    });

    if (employeeId) {
      const actorExists = await prisma.employee.findUnique({ where: { id: employeeId }, select: { id: true } });
      if (actorExists) {
        await prisma.auditLog.create({
          data: {
            actionType: "RESTORE_FROM_TRASH",
            entity: "EMPLOYEE",
            actorRole: role,
            newPayload: { id: targetEmployeeId, delta: {} as any },
            actorId: actorExists.id
          }
        });
      }
    }

    safeRevalidate("/owner/trash");
    safeRevalidate("/admin/trash");
    safeRevalidate("/staff/credentials");
    safeRevalidate("/admin/credentials");
    safeRevalidate("/staff/operators");
    safeRevalidate("/staff/drivers");
    safeRevalidate("/staff/workers");
    safeRevalidate("/staff/employees");
    safeRevalidate("/admin/staff");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function softDeleteEmployee(targetEmployeeId: string) {
  try {
    const caller = await requireAuth({ allowedRoles: [Role.OWNER, Role.ADMIN, Role.STAFF] });
    
    const target = await prisma.employee.findUnique({
      where: { id: targetEmployeeId },
      include: { user: true }
    });

    if (!target) {
      throw new Error("Employee not found");
    }

    // Guard: Prevent self-deletion
    if (caller.employeeId && target.id === caller.employeeId) {
      throw new Error("You cannot delete your own account.");
    }

    // Guard: Prevent deleting the last owner
    if (target.role === Role.OWNER) {
      const activeOwners = await prisma.employee.count({
        where: { role: Role.OWNER, isPendingDelete: false }
      });
      if (activeOwners <= 1) {
        throw new Error("Cannot delete the primary/last Owner account.");
      }
    }

    // Guard: Staff hierarchy protection
    if (caller.role === Role.STAFF && ([Role.OWNER, Role.ADMIN, Role.STAFF] as Role[]).includes(target.role)) {
      throw new Error("Staff members cannot delete administrative or office staff accounts.");
    }

    // Active Dependency Guard: Check for active dispatches
    const activeDispatch = await prisma.dailyDispatch.findFirst({
      where: {
        isPendingDelete: false,
        status: { in: ["PENDING", "ACCEPTED", "EN_ROUTE", "IN_PROGRESS", "DELIVERED", "PICKED_UP"] },
        OR: [
          { driverId: targetEmployeeId },
          { operatorId: targetEmployeeId },
          { workerId: targetEmployeeId },
          { mainHelperId: targetEmployeeId },
          { siteLeaderEmployeeId: targetEmployeeId }
        ]
      },
      select: { id: true, location: true }
    });

    if (activeDispatch) {
      throw new Error(`Cannot delete ${target.name}: Currently assigned to active dispatch #${activeDispatch.id} (${activeDispatch.location}). Please complete or reassign the dispatch first.`);
    }

    await prisma.$transaction(async (tx) => {
      await tx.employee.update({
        where: { id: targetEmployeeId },
        data: { isPendingDelete: true, markedForDeleteBy: caller.employeeId || caller.userId }
      });

      // Instantly revoke active session
      if (target.userId) {
        await tx.user.update({
          where: { id: target.userId },
          data: { sessionTokenVersion: { increment: 1 } }
        });
      }

      let actorEmpId: string | null = caller.employeeId || null;
      if (!actorEmpId && caller.userId) {
        const callerEmp = await tx.employee.findUnique({ where: { userId: caller.userId } });
        actorEmpId = callerEmp?.id || null;
      }
      if (actorEmpId) {
        const actorExists = await tx.employee.findUnique({ where: { id: actorEmpId }, select: { id: true } });
        if (actorExists) {
          await tx.auditLog.create({
            data: {
              actionType: "SOFT_DELETE",
              entity: "EMPLOYEE",
              actorRole: caller.role,
              actorId: actorExists.id,
              newPayload: { id: targetEmployeeId, name: target.name, role: target.role } as any
            }
          });
        }
      }
    });

    safeRevalidate("/staff/credentials");
    safeRevalidate("/admin/credentials");
    safeRevalidate("/staff/operators");
    safeRevalidate("/staff/drivers");
    safeRevalidate("/staff/workers");
    safeRevalidate("/staff/employees");
    safeRevalidate("/admin/staff");
    safeRevalidate("/admin/trash");
    safeRevalidate("/owner/trash");
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

    safeRevalidate("/staff/operators");
    safeRevalidate("/admin/employees");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function toggleEmployeeActiveStatus(targetEmployeeId: string, isActive: boolean) {
  try {
    const caller = await requireAuth({ allowedRoles: [Role.OWNER, Role.ADMIN, Role.STAFF] });

    const target = await prisma.employee.findUnique({
      where: { id: targetEmployeeId },
      select: { id: true, name: true, role: true, userId: true, isActive: true, isPendingDelete: true }
    });

    if (!target) throw new Error("Employee record not found.");
    if (target.isPendingDelete) {
      throw new Error("Cannot change status of a deleted record. Restore the item first from the Trash Hub.");
    }

    // Role Hierarchy & Self-disable guards
    if (caller.role === "STAFF" && (target.role === "ADMIN" || target.role === "OWNER")) {
      throw new Error("Staff members cannot alter the status of Administrator or Owner accounts.");
    }

    if (!isActive && (target.userId === caller.userId || target.id === caller.employeeId)) {
      throw new Error("You cannot disable your own active account.");
    }

    if (!isActive && target.role === "OWNER") {
      const activeOwnerCount = await prisma.user.count({
        where: { role: "OWNER", isActive: true, employee: { isPendingDelete: false } }
      });
      if (activeOwnerCount <= 1) {
        throw new Error("Cannot disable the last active Owner account. The system requires at least one active Owner.");
      }
    }

    // Active workflow guard: cannot disable employee if currently assigned to an active dispatch
    if (!isActive) {
      const activeDispatch = await prisma.dailyDispatch.findFirst({
        where: {
          isPendingDelete: false,
          status: { in: ["PENDING", "ACCEPTED", "EN_ROUTE", "IN_PROGRESS", "DELIVERED", "PICKED_UP"] },
          OR: [
            { driverId: targetEmployeeId },
            { operatorId: targetEmployeeId },
            { workerId: targetEmployeeId },
            { mainHelperId: targetEmployeeId },
            { siteLeaderEmployeeId: targetEmployeeId }
          ]
        },
        select: { id: true, location: true }
      });

      if (activeDispatch) {
        throw new Error(`Cannot disable ${target.name}: Currently assigned to active dispatch #${activeDispatch.id} (${activeDispatch.location}). Please complete or reassign the dispatch first.`);
      }
    }

    await prisma.$transaction(async (tx) => {
      // 1. Update Employee
      await tx.employee.update({
        where: { id: targetEmployeeId },
        data: { isActive }
      });

      // 2. Update User & bump sessionTokenVersion if disabling
      if (target.userId) {
        await tx.user.update({
          where: { id: target.userId },
          data: {
            isActive,
            ...(!isActive ? { sessionTokenVersion: { increment: 1 } } : {})
          }
        });
      }

      // 3. Audit Log
      let actorEmpId: string | null = caller.employeeId || null;
      if (!actorEmpId && caller.userId) {
        const callerEmp = await tx.employee.findUnique({ where: { userId: caller.userId } });
        actorEmpId = callerEmp?.id || null;
      }

      if (actorEmpId) {
        const actorExists = await tx.employee.findUnique({ where: { id: actorEmpId }, select: { id: true } });
        if (actorExists) {
          await tx.auditLog.create({
            data: {
              actionType: isActive ? "ENABLE_EMPLOYEE" : "DISABLE_EMPLOYEE",
              entity: "EMPLOYEE",
              actorRole: caller.role,
              actorId: actorExists.id,
              newPayload: { id: targetEmployeeId, name: target.name, isActive } as any
            }
          });
        }
      }
    });

    safeRevalidate("/staff/employees");
    safeRevalidate("/staff/drivers");
    safeRevalidate("/staff/workers");
    safeRevalidate("/staff/operators");
    safeRevalidate("/staff/credentials");
    safeRevalidate("/admin/credentials");
    safeRevalidate("/admin/staff");

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
