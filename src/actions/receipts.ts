"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/serverAuth";
import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function softDeletePaymentReceipt(targetReceiptId: string) {
  try {
    const { employeeId } = await requireAuth({ allowedRoles: [Role.OWNER, Role.ADMIN, Role.STAFF] });
    
    await prisma.paymentReceipt.update({
      where: { id: targetReceiptId },
      data: {
        isPendingDelete: true,
        markedForDeleteBy: employeeId,
      }
    });

    revalidatePath("/staff/cash");
    revalidatePath("/owner/trash");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function hardDeletePaymentReceipt(targetReceiptId: string) {
  try {
    const { employeeId } = await requireAuth({ allowedRoles: [Role.OWNER] });

    await prisma.$transaction(async (tx) => {
      const receipt = await tx.paymentReceipt.findUniqueOrThrow({
        where: { id: targetReceiptId }
      });

      await tx.paymentReceipt.delete({
        where: { id: targetReceiptId }
      });

      await tx.auditLog.create({
        data: {
          actionType: "HARD_DELETE",
          entity: "PAYMENT_RECEIPT",
          actorRole: "ADMIN",
          newPayload: { id: targetReceiptId, delta: { amount: Number(receipt.amount), receiptNumber: receipt.receiptNumber } as any },
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

export async function restorePaymentReceipt(targetReceiptId: string) {
  try {
    const { employeeId } = await requireAuth({ allowedRoles: [Role.OWNER, Role.ADMIN] });

    await prisma.paymentReceipt.update({
      where: { id: targetReceiptId },
      data: {
        isPendingDelete: false,
        markedForDeleteBy: null,
      }
    });

    await prisma.auditLog.create({
      data: {
        actionType: "RESTORE_FROM_TRASH",
        entity: "PAYMENT_RECEIPT",
        actorRole: "ADMIN",
        newPayload: { id: targetReceiptId, delta: {} as any },
        actorId: employeeId
      }
    });

    revalidatePath("/owner/trash");
    revalidatePath("/staff/cash");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
