"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/serverAuth";
import { Role, DispatchStatus, ExpenseCategory } from "@prisma/client";
import { revalidatePath } from "next/cache";

// ============================================================
// GOD MODE OVERRIDES (OWNER ONLY)
// ============================================================

/**
 * 1. Force End Shift
 * Bypasses driver app logic to instantly end a shift from the dashboard.
 */
export async function forceEndShift(shiftId: string) {
  const session = await requireAuth({ allowedRoles: [Role.OWNER] });

  const shift = await prisma.shiftLog.findUnique({ where: { id: shiftId } });
  if (!shift) throw new Error("Shift not found");
  if (shift.endTime) throw new Error("Shift is already ended");

  await prisma.shiftLog.update({
    where: { id: shiftId },
    data: { endTime: new Date() },
  });

  // Audit Log
  await prisma.auditLog.create({
    data: {
      actionType: "FORCE_END_SHIFT",
      entity: "SHIFT_LOG",
      actorRole: "ADMIN",
      newPayload: { id: shiftId, delta:  { endTime: new Date() } },
      actorId: session.employeeId,
    },
  });

  revalidatePath("/admin/dashboard");
  return { success: true };
}

/**
 * 2. Force Update Dispatch Status
 * Instantly change a job status on the fly.
 */
export async function updateDispatchStatus(dispatchId: string, newStatus: DispatchStatus) {
  const session = await requireAuth({ allowedRoles: [Role.OWNER] });

  const dispatch = await prisma.dailyDispatch.findUnique({ where: { id: dispatchId } });
  if (!dispatch) throw new Error("Dispatch not found");

  await prisma.$transaction([
    prisma.dailyDispatch.update({
      where: { id: dispatchId },
      data: { status: newStatus },
    }),
    prisma.dispatchStatusHistory.create({
      data: {
        dispatchId,
        oldStatus: dispatch.status,
        newStatus,
        changedById: session.employeeId,
        reason: "GOD_MODE_OVERRIDE",
      },
    }),
    prisma.auditLog.create({
      data: {
        actionType: "GOD_MODE_STATUS_UPDATE",
      entity: "DAILY_DISPATCH",
      actorRole: "ADMIN",
      newPayload: { id: dispatchId, delta:  { oldStatus: dispatch.status, newStatus } },
        actorId: session.employeeId,
      },
    }),
  ]);

  revalidatePath("/admin/dashboard");
  return { success: true };
}

/**
 * 3. Confirm Cash Drop
 * Instantly reconcile pending cash held by a driver/operator.
 */
export async function confirmCashDrop(receiptId: string) {
  const session = await requireAuth({ allowedRoles: [Role.OWNER] });

  const receipt = await prisma.paymentReceipt.findUnique({ where: { id: receiptId } });
  if (!receipt) throw new Error("Receipt not found");
  if (receipt.depositStatus !== "PENDING_DEPOSIT") throw new Error("Receipt is not pending");

  await prisma.paymentReceipt.update({
    where: { id: receiptId },
    data: { depositStatus: "HANDED_TO_OFFICE" },
  });

  await prisma.auditLog.create({
    data: {
      actionType: "CONFIRM_CASH_DROP",
      entity: "PAYMENT_RECEIPT",
      actorRole: "ADMIN",
      newPayload: { id: receiptId, delta:  { oldStatus: receipt.depositStatus, newStatus: "HANDED_TO_OFFICE" } },
      actorId: session.employeeId,
    },
  });

  revalidatePath("/admin/dashboard");
  return { success: true };
}

/**
 * 4. Log Emergency Expense
 * Inject an expense on behalf of an operator or machine instantly.
 */
export async function logEmergencyExpense(
  loggerId: string,
  amount: number,
  category: ExpenseCategory,
  description: string,
  machineId?: string
) {
  const session = await requireAuth({ allowedRoles: [Role.OWNER] });

  const expense = await prisma.expense.create({
    data: {
      loggerId, // Note: We attribute the expense to the operator/driver involved, not necessarily the owner creating it.
      amount,
      category,
      description,
      date: new Date(),
      machineId: machineId || null,
      notes: "GOD_MODE_INJECTION",
    },
  });

  await prisma.auditLog.create({
    data: {
      actionType: "EMERGENCY_EXPENSE_INJECTION",
      entity: "EXPENSE",
      actorRole: "ADMIN",
      newPayload: { id: expense.id, delta:  { amount, category, loggerId } },
      actorId: session.employeeId,
    },
  });

  revalidatePath("/admin/dashboard");
  return { success: true, expenseId: expense.id };
}
