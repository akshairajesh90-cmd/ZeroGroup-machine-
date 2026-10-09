"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/serverAuth";
import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const adjustmentAmountSchema = z.number().positive("Amount must be positive").max(100000, "Amount exceeds maximum allowed limit");

export async function createManualAdjustment(data: {
  employeeId: string;
  amount: number;
  type: "BONUS" | "PENALTY";
  reason: string;
}) {
  try {
    const session = await requireAuth({ allowedRoles: [Role.OWNER, Role.ADMIN, Role.STAFF] });
    console.log('[createManualAdjustment] session employee:', session.employeeId);

    // Validate amount payload using Zod before any operations
    const validatedAmount = adjustmentAmountSchema.parse(data.amount);

    const adjustment = await prisma.manualAdjustment.create({
      data: {
        employeeId: data.employeeId,
        amount: validatedAmount,
        type: data.type,
        reason: data.reason,
        date: new Date(),
        status: "APPROVED", // Auto approve since it's God Mode
        settlementStatus: "PENDING",
        createdById: session.employeeId,
        approvedById: session.employeeId,
        approvedAt: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        actionType: "CREATE",
        entity: "MANUAL_ADJUSTMENT",
        actorRole: "ADMIN",
        newPayload: { id: adjustment.id, delta: data as any },
        actorId: session.employeeId,
      },
    });

    revalidatePath("/admin/adjustments");
    revalidatePath("/owner/adjustments");
    return { success: true, adjustmentId: adjustment.id };
  } catch (err) {
    console.error('[createManualAdjustment] ERROR:', err);
    throw err;
  }
}

export async function reverseManualAdjustment(adjustmentId: string) {
  const session = await requireAuth({ allowedRoles: [Role.OWNER, Role.ADMIN, Role.STAFF] });

  const originalAdj = await prisma.manualAdjustment.findUnique({
    where: { id: adjustmentId }
  });

  if (!originalAdj) {
    throw new Error("Adjustment not found.");
  }

  const offsetType = originalAdj.type === "BONUS" ? "PENALTY" : "BONUS";

  // Create offsetting transaction to preserve double-entry audit history
  const reversedAdj = await prisma.manualAdjustment.create({
    data: {
      employeeId: originalAdj.employeeId,
      amount: originalAdj.amount,
      type: offsetType,
      reason: `[REVERSAL] Mistake correction for Adj #${originalAdj.id.substring(0, 8)}: "${originalAdj.reason}"`,
      date: new Date(),
      status: "APPROVED",
      settlementStatus: "PENDING",
      createdById: session.employeeId,
      approvedById: session.employeeId,
      approvedAt: new Date()
    }
  });

  await prisma.auditLog.create({
    data: {
      actionType: "REVERSE",
      entity: "MANUAL_ADJUSTMENT",
      actorRole: session.role,
      oldPayload: { originalAdjustmentId: originalAdj.id, type: originalAdj.type, amount: originalAdj.amount },
      newPayload: { reversalAdjustmentId: reversedAdj.id, type: reversedAdj.type, amount: reversedAdj.amount },
      actorId: session.employeeId
    }
  });

  revalidatePath("/admin/adjustments");
  revalidatePath("/owner/adjustments");
  return { success: true, reversalId: reversedAdj.id };
}

