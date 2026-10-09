"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/serverAuth";
import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function logPayment(data: {
  dispatchId: string;
  amount: number;
  method: "CASH" | "UPI" | "BANK_TRANSFER";
}) {
  try {
    const session = await requireAuth({ allowedRoles: [Role.DRIVER, Role.OPERATOR, Role.OWNER, Role.STAFF] });
    
    // Create the new PaymentRecord
    const record = await prisma.paymentRecord.create({
      data: {
        dispatchId: data.dispatchId,
        amount: data.amount,
        method: data.method,
        collectedById: session.employeeId as string,
        verifiedByStaff: false,
      }
    });

    // Update the DailyDispatch cashCollected total
    const dispatch = await prisma.dailyDispatch.findUnique({ where: { id: data.dispatchId } });
    if (dispatch) {
      const newTotal = Number(dispatch.cashCollected || 0) + Number(data.amount);
      const paymentStatus = newTotal > 0 ? "PARTIAL" : "PENDING"; // Can be expanded for PAID logic later
      
      await prisma.dailyDispatch.update({
        where: { id: data.dispatchId },
        data: { 
          cashCollected: newTotal,
          paymentStatus
        }
      });
    }

    revalidatePath("/admin/dashboard");
    revalidatePath("/staff/dashboard");
    revalidatePath("/staff/reconciliation");
    revalidatePath("/driver/home");
    revalidatePath("/operator/home");
    
    return { success: true, recordId: record.id };
  } catch (error: any) {
    console.error("Log payment error:", error);
    return { success: false, error: error.message || "Failed to log payment" };
  }
}

export async function verifyPayment(recordId: string) {
  try {
    await requireAuth({ allowedRoles: [Role.OWNER, Role.ADMIN, Role.STAFF] });

    await prisma.paymentRecord.update({
      where: { id: recordId },
      data: { verifiedByStaff: true }
    });

    revalidatePath("/staff/reconciliation");
    revalidatePath("/admin/dashboard");
    return { success: true };
  } catch (error: any) {
    console.error("Verify payment error:", error);
    return { success: false, error: error.message || "Failed to verify payment" };
  }
}
