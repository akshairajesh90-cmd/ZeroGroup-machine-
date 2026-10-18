"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/serverAuth";
import { revalidatePath } from "next/cache";

// WorkTypeRate actions
export async function getWorkTypeRates() {
  await requireAuth({ allowedRoles: ["OWNER", "ADMIN"] });
  return await prisma.workTypeRate.findMany({
    orderBy: [{ machineType: "asc" }, { workType: "asc" }]
  });
}

export async function upsertWorkTypeRate(data: { machineType: any, workType: any, payoutRate: number, customerCharge: number }) {
  await requireAuth({ allowedRoles: ["OWNER", "ADMIN"] });
  await prisma.workTypeRate.upsert({
    where: {
      machineType_workType: {
        machineType: data.machineType,
        workType: data.workType
      }
    },
    update: {
      payoutRate: data.payoutRate,
      customerCharge: data.customerCharge
    },
    create: {
      machineType: data.machineType,
      workType: data.workType,
      payoutRate: data.payoutRate,
      customerCharge: data.customerCharge
    }
  });
  revalidatePath("/admin/settings/rates");
  revalidatePath("/staff/dispatch/new"); // In case they fetch rates here
  return { success: true };
}

// Global default wage fallback (can be saved in contractor or custom settings)
// For now we'll allow fetching/updating EmployeeRoleRates if needed, or just standard fallback logic.

export async function getEmployeeRoleRates() {
  await requireAuth({ allowedRoles: ["OWNER", "ADMIN"] });
  return await prisma.employeeRoleRate.findMany({
    include: { employee: true },
    orderBy: { crewRole: "asc" }
  });
}
