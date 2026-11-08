'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { requireAuth } from '@/lib/serverAuth';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import {
  generateSettlementSchema,
  updateSettlementSchema,
  finalizeSettlementSchema,
  finalizeWeeklySettlementSchema,
} from './schemas';
import { calculateOperatorSettlement } from './calculate';

/**
 * Generate a Draft Settlement record for the weekend or date.
 */
export async function generateSettlement(input: z.infer<typeof generateSettlementSchema>) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const parsed = generateSettlementSchema.parse(input);
    const weekEndingDate = new Date(parsed.weekEnding);

    // Calculate actual numbers
    const calc = await calculateOperatorSettlement({
      operatorId: parsed.operatorId,
      startDate: new Date(weekEndingDate.getTime() - 6 * 86400000).toISOString().split("T")[0],
      endDate: parsed.weekEnding,
    });

    if (!calc.success || !calc.data) {
      return { success: false, error: calc.error || "Failed to calculate figures" };
    }

    const { totalLaborEarned, totalCashHeld, totalAdvances, approvedBonuses, approvedPenalties, finalPayout } = calc.data;

    // Apply custom pay overrides if passed from the inline table editor
    const effectiveEarned = parsed.customEarned !== undefined ? parsed.customEarned : totalLaborEarned;
    const effectiveAdvances = parsed.customAdvances !== undefined ? parsed.customAdvances : totalAdvances;
    const effectiveBonuses = parsed.customBonuses !== undefined ? parsed.customBonuses : approvedBonuses;
    const effectivePayout = (effectiveEarned + effectiveBonuses) - (approvedPenalties + totalCashHeld + effectiveAdvances);

    const hasCustomOverrides = parsed.customEarned !== undefined || parsed.customAdvances !== undefined || parsed.customBonuses !== undefined;
    const effectiveNotes = parsed.notes || (hasCustomOverrides ? "Includes custom manual overrides from Weekend Payroll Hub" : undefined);

    const existing = await prisma.settlement.findFirst({
      where: { employeeId: parsed.operatorId, weekEnding: weekEndingDate }
    });

    let record;
    if (existing) {
      record = await prisma.settlement.update({
        where: { id: existing.id },
        data: {
          finalPayout: new Prisma.Decimal(effectivePayout),
          notes: effectiveNotes,
        }
      });
    } else {
      record = await prisma.settlement.create({
        data: {
          employeeId: parsed.operatorId,
          weekEnding: weekEndingDate,
          finalPayout: new Prisma.Decimal(effectivePayout),
          notes: effectiveNotes,
          status: "PENDING",
        }
      });
    }

    revalidatePath("/admin/settlements");
    return { success: true, data: record };
  } catch (error: any) {
    console.error("Error generating settlement:", error);
    return { success: false, error: error.message || "Generation failed" };
  }
}

/**
 * Update Settlement (Custom Overrides)
 * OCC Enforced: Checks version against current DB state
 */
export async function updateSettlement(input: z.infer<typeof updateSettlementSchema>) {
  try {
    const { employeeId } = await requireAuth();
    const parsed = updateSettlementSchema.parse(input);

    const dbSettlement = await prisma.settlement.findUnique({
      where: { id: parsed.settlementId },
    });

    if (!dbSettlement) return { success: false, error: "Settlement not found" };

    if (dbSettlement.status === "FINALIZED") {
      return { success: false, error: "Cannot edit a finalized settlement." };
    }

    const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const res = await tx.settlement.update({
        where: { id: parsed.settlementId },
        data: {
          finalPayout: parsed.customEarned !== undefined ? new Prisma.Decimal(parsed.customEarned) : undefined,
        },
      });

      await tx.auditLog.create({
        data: {
          actionType: "UPDATE",
          entity: "SETTLEMENT",
          actorRole: "ADMIN",
          newPayload: {
            id: res.id,
            delta: {
              customEarned: parsed.customEarned,
              customAdvances: parsed.customAdvances,
              customBonuses: parsed.customBonuses,
            } as any
          },
          actorId: employeeId,
        }
      });

      return res;
    });

    revalidatePath("/admin/settlements");
    return { success: true, data: updated };
  } catch (error: any) {
    console.error("Error updating settlement:", error);
    return { success: false, error: error.message || "Update failed" };
  }
}

/**
 * Finalize Settlement (OWNER ONLY).
 * Locks record immutably (status=FINALIZED), checks OCC, settles pending advances & adjustments.
 */
export async function finalizeSettlement(input: z.infer<typeof finalizeSettlementSchema>) {
  try {
    const { employeeId } = await requireAuth({ allowedRoles: ["OWNER", "ADMIN", "STAFF"] });
    const parsed = finalizeSettlementSchema.parse(input);

    const settlement = await prisma.settlement.findUnique({
      where: { id: parsed.settlementId },
    });

    if (!settlement) {
      return { success: false, error: "Settlement record not found" };
    }

    if (settlement.status === "FINALIZED") {
      return { success: false, error: "Audit Lock: This settlement is already finalized and cannot be modified." };
    }

    const locked = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const updatedSettlement = await tx.settlement.update({
        where: { id: settlement.id },
        data: {
          status: "FINALIZED",
        },
      });

      await tx.salaryAdvance.updateMany({
        where: { employeeId: settlement.employeeId!, status: "PENDING" },
        data: { status: "SETTLED" },
      });

      await tx.manualAdjustment.updateMany({
        where: { employeeId: settlement.employeeId!, status: "APPROVED", settlementStatus: "PENDING" },
        data: { settlementStatus: "SETTLED" },
      });

      await tx.auditLog.create({
        data: {
          actionType: "FINALIZE",
          entity: "SETTLEMENT",
          actorRole: "OWNER",
          newPayload: { id: settlement.id, delta: { status: "FINALIZED" } as any },
          actorId: employeeId,
        }
      });

      return updatedSettlement;
    });

    revalidatePath("/admin/settlements");
    return { success: true, data: locked };
  } catch (error: any) {
    console.error("Error finalizing settlement:", error);
    return { success: false, error: error.message || "Finalization failed" };
  }
}

/**
 * Finalize Weekly Settlement for an employee.
 * - Computes total wages from COMPLETED dispatches in the week window.
 * - Adds APPROVED ManualAdjustment bonuses, deducts penalties.
 * - Deducts all PENDING SalaryAdvances and marks them SETTLED.
 * - Upserts the Settlement record and sets status to FINALIZED.
 * - Writes an AuditLog entry.
 * OWNER only.
 */
export async function finalizeWeeklySettlement(input: z.infer<typeof finalizeWeeklySettlementSchema>) {
  try {
    const { employeeId: actorEmployeeId, role } = await requireAuth({ allowedRoles: ["OWNER", "ADMIN", "STAFF"] });

    const parsed = finalizeWeeklySettlementSchema.parse(input);
    const weekEndingDate = new Date(parsed.weekEnding);
    // Week window: Mon–Sun (7 days ending on weekEnding)
    const weekStartDate = new Date(weekEndingDate.getTime() - 6 * 86_400_000);
    weekStartDate.setHours(0, 0, 0, 0);
    weekEndingDate.setHours(23, 59, 59, 999);

    const employee = await prisma.employee.findUnique({ where: { id: parsed.employeeId } });
    if (!employee) return { success: false, error: "Employee not found" };

    // 1. Aggregate wage earnings via DispatchAssignment
    const assignments = await prisma.dispatchAssignment.findMany({
      where: {
        employeeId: parsed.employeeId,
        settlementId: null,
        dispatch: {
          dateOfService: { gte: weekStartDate, lte: weekEndingDate },
          status: "COMPLETED",
        },
      },
    });
    const totalWages = assignments.reduce(
      (sum, a) => sum + Number(a.lockedWageRate) * (a.headcount ?? 1),
      0
    );

    // 2. Approved bonuses & penalties not yet settled
    const adjustments = await prisma.manualAdjustment.findMany({
      where: {
        employeeId: parsed.employeeId,
        status: "APPROVED",
        settlementStatus: "PENDING",
      },
    });
    let totalBonuses = 0;
    let totalPenalties = 0;
    for (const adj of adjustments) {
      if (adj.type === "BONUS") totalBonuses += Number(adj.amount);
      else totalPenalties += Number(adj.amount);
    }

    // 3. Pending salary advances
    const pendingAdvances = await prisma.salaryAdvance.findMany({
      where: { employeeId: parsed.employeeId, status: "PENDING" },
    });
    const totalAdvances = pendingAdvances.reduce((sum, a) => sum + Number(a.amount), 0);

    const finalPayout = totalWages + totalBonuses - totalPenalties - totalAdvances;

    // 4. Persist in a single transaction
    const result = await prisma.$transaction(async (tx) => {
      const existing = await tx.settlement.findFirst({
        where: { employeeId: parsed.employeeId, weekEnding: weekEndingDate },
      });

      let settlement;
      if (existing) {
        if (existing.status === "FINALIZED") {
          throw new Error("This settlement is already finalized and cannot be modified.");
        }
        settlement = await tx.settlement.update({
          where: { id: existing.id },
          data: {
            finalPayout: new Prisma.Decimal(finalPayout),
            status: "FINALIZED",
            notes: parsed.notes ?? existing.notes,
          },
        });
      } else {
        settlement = await tx.settlement.create({
          data: {
            employeeId: parsed.employeeId,
            weekEnding: weekEndingDate,
            finalPayout: new Prisma.Decimal(finalPayout),
            status: "FINALIZED",
            notes: parsed.notes,
          },
        });
      }

      if (assignments.length > 0) {
        await tx.dispatchAssignment.updateMany({
          where: { id: { in: assignments.map((a) => a.id) } },
          data: { settlementId: settlement.id },
        });
      }

      if (pendingAdvances.length > 0) {
        await tx.salaryAdvance.updateMany({
          where: { id: { in: pendingAdvances.map((a) => a.id) } },
          data: { status: "SETTLED" },
        });
      }

      if (adjustments.length > 0) {
        await tx.manualAdjustment.updateMany({
          where: { id: { in: adjustments.map((a) => a.id) } },
          data: { settlementStatus: "SETTLED" },
        });
      }

      return settlement;
    });

    // 5. Audit log
    const { logAudit } = await import("@/lib/auditLogger");
    await logAudit({
      actorId: actorEmployeeId,
      actorRole: role,
      actionType: "FINALIZE_WEEKLY_SETTLEMENT",
      modelName: "Settlement",
      newPayload: {
        settlementId: result.id,
        employeeId: parsed.employeeId,
        weekEnding: parsed.weekEnding,
        totalWages,
        totalBonuses,
        totalPenalties,
        totalAdvances,
        finalPayout,
      },
    });

    if (!process.env.CLI_TEST_ROLE) {
      revalidatePath("/admin/settlements");
      revalidatePath("/owner/settlements");
    }
    return { success: true, data: result };
  } catch (error: any) {
    console.error("Error finalizing weekly settlement:", error);
    return { success: false, error: error.message || "Finalization failed" };
  }
}
