'use server';

import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/serverAuth';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { createAdjustmentSchema, approveAdjustmentSchema } from './schemas';

/**
 * Create a Manual Adjustment (Bonus or Penalty).
 * Guardrail: <= ₹500 auto-approves. > ₹500 requires OWNER approval (PENDING).
 */
export async function createManualAdjustment(input: z.infer<typeof createAdjustmentSchema>) {
  try {
    const { role, employeeId } = await requireAuth();

    const parsed = createAdjustmentSchema.parse(input);
    const limit = process.env.MAX_STAFF_ADJUSTMENT_LIMIT ? parseInt(process.env.MAX_STAFF_ADJUSTMENT_LIMIT, 10) : 500;

    // Delegated Authority check
    const isOwner = role === "OWNER";
    const isWithinLimit = parsed.amount <= limit;
    const status = (isOwner || isWithinLimit) ? "APPROVED" : "PENDING";
    const approvedById = isOwner ? employeeId : (isWithinLimit ? employeeId : null);
    const approvedAt = status === "APPROVED" ? new Date() : null;

    const record = await prisma.manualAdjustment.create({
      data: {
        employeeId: parsed.employeeId,
        amount: new Prisma.Decimal(parsed.amount),
        type: parsed.type,
        reason: parsed.reason.trim(),
        date: new Date(parsed.date),
        settlementStatus: "PENDING",
        status,
        createdById: employeeId,
        approvedById,
        approvedAt,
      },
    });

    revalidatePath("/admin/settlements");
    return { success: true, data: record };
  } catch (error: any) {
    console.error("Error creating adjustment:", error);
    return { success: false, error: error.message || "Failed to create adjustment" };
  }
}

/**
 * Approve a Pending Manual Adjustment (> ₹500).
 * Requires OWNER role.
 */
export async function approveManualAdjustment(input: z.infer<typeof approveAdjustmentSchema>) {
  try {
    const { employeeId } = await requireAuth({ allowedRoles: ["OWNER", "ADMIN", "STAFF"] });
    const parsed = approveAdjustmentSchema.parse(input);

    const updated = await prisma.manualAdjustment.update({
      where: { id: parsed.adjustmentId },
      data: {
        status: "APPROVED",
        approvedById: employeeId,
        approvedAt: new Date(),
      },
    });

    revalidatePath("/admin/settlements");
    return { success: true, data: updated };
  } catch (error: any) {
    console.error("Error approving adjustment:", error);
    return { success: false, error: error.message || "Approval failed" };
  }
}
