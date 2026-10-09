"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/serverAuth";
import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";

// Helpers
const isFieldRole = (role: Role) => ["DRIVER", "OPERATOR", "WORKER"].includes(role);

function checkRbac(currentUserRole: Role, targetRole: Role) {
  if (currentUserRole === "STAFF") {
    if (!isFieldRole(targetRole)) {
      throw new Error("Unauthorized: STAFF members can only manage Field Roles (DRIVER, OPERATOR, WORKER).");
    }
  }
}

export async function createEmployee(data: {
  name: string;
  email: string;
  password?: string;
  phone: string;
  role: Role;
  baseDailyWage?: number;
  fixedSalary?: number;
}) {
  try {
    const currentUser = await requireAuth({ allowedRoles: ["OWNER", "ADMIN", "STAFF"] });
    checkRbac(currentUser.role, data.role);

    const result = await prisma.$transaction(async (tx) => {
      // Create User
      const hashedPassword = await bcrypt.hash(data.password || "zero123", 10);
      const user = await tx.user.create({
        data: {
          email: data.email,
          hashedPassword,
          role: data.role,
        }
      });

      // Create Employee
      const employee = await tx.employee.create({
        data: {
          name: data.name,
          phone: data.phone,
          role: data.role,
          baseDailyWage: data.baseDailyWage,
          fixedSalary: data.fixedSalary,
          userId: user.id,
        }
      });

      // Audit Log
      await tx.auditLog.create({
        data: {
          actionType: "CREATE_EMPLOYEE",
          actorRole: currentUser.role,
          actorId: currentUser.employeeId,
          modelName: "Employee",
          newPayload: { id: employee.id, name: data.name, role: data.role },
          entity: employee.id
        }
      });

      return employee;
    });

    revalidatePath("/admin/staff");
    return { success: true, data: result };
  } catch (error: any) {
    console.error("Create Employee error:", error);
    return { success: false, error: error.message };
  }
}

export async function updateEmployee(
  id: string,
  data: {
    role?: Role;
    phone?: string;
    baseDailyWage?: number;
    fixedSalary?: number;
    capableRoles?: string[];
  }
) {
  try {
    const currentUser = await requireAuth({ allowedRoles: ["OWNER", "ADMIN", "STAFF"] });
    
    const targetEmployee = await prisma.employee.findUnique({ where: { id } });
    if (!targetEmployee) throw new Error("Employee not found.");

    // Check RBAC for existing role
    checkRbac(currentUser.role, targetEmployee.role);
    // Check RBAC for new role
    if (data.role) checkRbac(currentUser.role, data.role);

    const result = await prisma.$transaction(async (tx) => {
      const updatedEmployee = await tx.employee.update({
        where: { id },
        data: {
          phone: data.phone,
          role: data.role,
          baseDailyWage: data.baseDailyWage,
          fixedSalary: data.fixedSalary,
          ...(data.capableRoles !== undefined && { capableRoles: { set: data.capableRoles as any[] } }),
        }
      });

      if (data.role) {
        await tx.user.update({
          where: { id: targetEmployee.userId },
          data: { role: data.role }
        });
      }

      await tx.auditLog.create({
        data: {
          actionType: "UPDATE_EMPLOYEE",
          actorRole: currentUser.role,
          actorId: currentUser.employeeId,
          modelName: "Employee",
          oldPayload: { role: targetEmployee.role, baseDailyWage: targetEmployee.baseDailyWage },
          newPayload: { role: updatedEmployee.role, baseDailyWage: updatedEmployee.baseDailyWage },
          entity: updatedEmployee.id
        }
      });

      return updatedEmployee;
    });

    revalidatePath("/admin/staff");
    return { success: true, data: result };
  } catch (error: any) {
    console.error("Update Employee error:", error);
    return { success: false, error: error.message };
  }
}

// Save per-role wage rates for an employee
// rates: [{ crewRole: "MIXER_OPERATOR", wagePerDay: 1100 }, ...]
export async function saveEmployeeRoleRates(
  employeeId: string,
  rates: { crewRole: string; wagePerDay: number }[]
) {
  try {
    await requireAuth({ allowedRoles: ["OWNER", "ADMIN", "STAFF"] });

    await prisma.$transaction(
      rates.map(r =>
        prisma.employeeRoleRate.upsert({
          where: { employeeId_crewRole: { employeeId, crewRole: r.crewRole as any } },
          update: { wagePerDay: r.wagePerDay },
          create: { employeeId, crewRole: r.crewRole as any, wagePerDay: r.wagePerDay },
        })
      )
    );

    revalidatePath("/admin/staff");
    return { success: true };
  } catch (error: any) {
    console.error("Save Role Rates error:", error);
    return { success: false, error: error.message };
  }
}

export async function getAuditLogs() {
  try {
    const currentUser = await requireAuth({ allowedRoles: ["OWNER", "ADMIN"] });

    const logs = await prisma.auditLog.findMany({
      take: 100,
      orderBy: { timestamp: "desc" },
      include: {
        actor: { select: { name: true } }
      }
    });

    return { success: true, data: logs };
  } catch (error: any) {
    console.error("Fetch Audit Logs error:", error);
    return { success: false, error: error.message };
  }
}
