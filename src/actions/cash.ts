"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/serverAuth";
import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";

export async function clearCashDrop(receiptId: string) {
  const session = await requireAuth({ allowedRoles: [Role.OWNER, Role.ADMIN, Role.STAFF] });

  const receipt = await prisma.paymentReceipt.findUnique({ where: { id: receiptId } });
  if (!receipt) throw new Error("Receipt not found");
  if (receipt.depositStatus === "DEPOSITED_TO_BANK") throw new Error("Receipt already deposited");

  await prisma.paymentReceipt.update({
    where: { id: receiptId },
    data: { depositStatus: "DEPOSITED_TO_BANK" },
  });

  await prisma.auditLog.create({
    data: {
      actionType: "DEPOSITED_TO_BANK",
      entity: "PAYMENT_RECEIPT",
      actorRole: "ADMIN",
      newPayload: { id: receiptId, delta: { oldStatus: receipt.depositStatus, newStatus: "DEPOSITED_TO_BANK" } },
      actorId: session.employeeId,
    },
  });

  revalidatePath("/admin/cash");
  revalidatePath("/admin/dashboard");
  return { success: true };
}

export async function logCashCollection(data: {
  dispatchId: string;
  amount: number;
  paymentMethod: "CASH" | "UPI";
  notes?: string;
}) {
  try {
    const session = await requireAuth({ allowedRoles: [Role.DRIVER, Role.OPERATOR, Role.OWNER, Role.STAFF] });
    
    const dispatch = await prisma.dailyDispatch.findUnique({
      where: { id: data.dispatchId },
      select: { customerId: true }
    });

    if (!dispatch) return { success: false, error: "Dispatch not found" };

    const receipt = await prisma.paymentReceipt.create({
      data: {
        receiptNumber: `RCP-${Date.now().toString().slice(-6)}`,
        customerId: dispatch.customerId,
        dispatchId: data.dispatchId,
        collectedByEmployeeId: session.employeeId,
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        depositStatus: data.paymentMethod === "CASH" ? "PENDING_DEPOSIT" : "NOT_APPLICABLE",
        paymentDate: new Date(),
        notes: data.notes
      }
    });

    await prisma.auditLog.create({
      data: {
        actionType: "CREATE",
        entity: "PAYMENT_RECEIPT",
        actorRole: "ADMIN",
        newPayload: { id: receipt.id, delta: data as any },
        actorId: session.employeeId,
      },
    });

    revalidatePath("/admin/cash");
    revalidatePath("/staff/cash");
    return { success: true, receiptId: receipt.id };
  } catch (error: any) {
    console.error("Log cash error:", error);
    return { success: false, error: error.message || "Failed to log cash" };
  }
}

export async function logDirectOfficePayment(data: {
  customerId: string;
  amount: number;
  paymentMethod: "CASH" | "UPI" | "BANK_TRANSFER";
  notes?: string;
}) {
  try {
    const session = await requireAuth({ allowedRoles: [Role.OWNER, Role.STAFF, Role.ADMIN] });
    
    // As per user instructions: CASH is PENDING_DEPOSIT, others are DEPOSITED_TO_BANK
    const depositStatus = data.paymentMethod === "CASH" ? "PENDING_DEPOSIT" : "DEPOSITED_TO_BANK";

    const receipt = await prisma.paymentReceipt.create({
      data: {
        receiptNumber: "RCP-" + Date.now().toString().slice(-6),
        customerId: data.customerId,
        collectedByEmployeeId: session.employeeId,
        amount: data.amount,
        paymentMethod: data.paymentMethod as any,
        depositStatus: depositStatus,
        paymentDate: new Date(),
        notes: data.notes
      }
    });

    await prisma.auditLog.create({
      data: {
        actionType: "CREATE",
        entity: "PAYMENT_RECEIPT",
        actorRole: "STAFF",
        newPayload: { id: receipt.id, delta: data as any },
        actorId: session.employeeId,
      },
    });

    revalidatePath("/admin/cash");
    revalidatePath("/staff/cash");
    return { success: true, receiptId: receipt.id };
  } catch (error: any) {
    console.error("Direct office payment error:", error);
    return { success: false, error: error.message || "Failed to log direct payment" };
  }
}
