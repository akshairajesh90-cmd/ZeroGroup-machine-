"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/serverAuth";
import { revalidatePath } from "next/cache";

export async function logSiteLaborDisbursement(
  prevState: any,
  formData: FormData
) {
  try {
    const { employeeId, role } = await requireAuth();
    
    // Only allow Operator, Driver or Admin/Owner
    if (role === "STAFF") {
      return { success: false, message: "Staff cannot log field disbursements." };
    }

    const dispatchId = formData.get("dispatchId") as string;
    const subLeaderId = formData.get("subLeaderId") as string;
    const totalCashHandedOut = parseFloat(formData.get("totalCashHandedOut") as string);
    const externalWorkerNames = formData.get("externalWorkerNames") as string;

    if (!dispatchId || !subLeaderId || isNaN(totalCashHandedOut)) {
      return { success: false, message: "Missing required fields." };
    }

    const dispatch = await prisma.dailyDispatch.findUnique({
      where: { id: dispatchId },
      select: { dateOfService: true }
    });

    if (!dispatch) {
      return { success: false, message: "Dispatch not found." };
    }

    await prisma.siteLaborDisbursement.create({
      data: {
        dispatchId,
        internalOperatorId: employeeId!,
        subLeaderId,
        date: dispatch.dateOfService,
        totalCashHandedOut,
        externalWorkerNames: externalWorkerNames || null
      }
    });

    revalidatePath("/operator/home");
    return { success: true, message: "External labor cash recorded successfully." };
  } catch (err: any) {
    console.error("Error logging external labor:", err);
    return { success: false, message: err.message || "Failed to log external labor." };
  }
}

export async function updateSiteLaborDisbursement(
  id: string,
  totalCashHandedOut: number,
  externalWorkerNames: string | null
) {
  const { role } = await requireAuth();
  if (role !== "STAFF" && role !== "OWNER" && role !== "ADMIN") {
    throw new Error("Only office staff can edit disbursements.");
  }

  await prisma.siteLaborDisbursement.update({
    where: { id },
    data: {
      totalCashHandedOut,
      externalWorkerNames
    }
  });

  revalidatePath("/staff/dispatch");
}
