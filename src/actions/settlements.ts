"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export async function getUnsettledBalance(
  type: "EMPLOYEE" | "CONTRACTOR",
  targetId: string
) {
  try {
    // Get unlocked assignments
    const assignments = await prisma.dispatchAssignment.findMany({
      where: {
        settlementId: null,
        ...(type === "EMPLOYEE" ? { employeeId: targetId } : { contractorId: targetId }),
      },
      include: {
        dispatch: {
          select: { dateOfService: true, location: true },
        },
      },
    });

    // Get unlocked advances
    const advances = await prisma.expense.findMany({
      where: {
        settlementId: null,
        category: type === "EMPLOYEE" ? "STAFF_ADVANCE" : "CONTRACTOR_ADVANCE",
        ...(type === "EMPLOYEE" ? { employeeId: targetId } : { contractorId: targetId }),
      },
      select: {
        id: true,
        amount: true,
        date: true,
        notes: true,
      },
    });

    // Calculate totals
    let totalGrossWages = 0;
    assignments.forEach((a) => {
      // For contractors, wage might be multiplied by headcount if that's the logic.
      // Usually dailyRate is per head. 
      const wageForAssignment = Number(a.lockedWageRate) * (a.headcount || 1);
      totalGrossWages += wageForAssignment;
    });

    let totalAdvances = 0;
    advances.forEach((a) => {
      totalAdvances += Number(a.amount);
    });

    const netPayout = totalGrossWages - totalAdvances;

    return {
      success: true,
      data: {
        assignments,
        advances,
        totalGrossWages,
        totalAdvances,
        netPayout,
      },
    };
  } catch (error: any) {
    console.error("Error fetching unsettled balance:", error);
    return { success: false, error: error.message };
  }
}

export async function generateSettlement(data: {
  type: "EMPLOYEE" | "CONTRACTOR";
  targetId: string;
  assignmentIds: string[];
  advanceIds: string[];
  finalPayout: number;
  notes?: string;
  weekEnding: Date;
}) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      // 1. Create the Settlement
      const settlement = await tx.settlement.create({
        data: {
          weekEnding: data.weekEnding,
          finalPayout: data.finalPayout,
          amountPaid: 0,
          status: "PENDING",
          notes: data.notes,
          ...(data.type === "EMPLOYEE"
            ? { employeeId: data.targetId }
            : { contractorId: data.targetId }),
        },
      });

      // 2. Lock Assignments
      if (data.assignmentIds.length > 0) {
        await tx.dispatchAssignment.updateMany({
          where: { id: { in: data.assignmentIds } },
          data: { settlementId: settlement.id },
        });
      }

      // 3. Lock Advances
      if (data.advanceIds.length > 0) {
        await tx.expense.updateMany({
          where: { id: { in: data.advanceIds } },
          data: { settlementId: settlement.id },
        });
      }

      return settlement;
    });

    revalidatePath("/staff/settlements");
    return { success: true, data: result };
  } catch (error: any) {
    console.error("Error generating settlement:", error);
    return { success: false, error: error.message };
  }
}

export async function recordSettlementPayment(
  settlementId: string,
  amountToPay: number
) {
  try {
    const settlement = await prisma.settlement.findUnique({
      where: { id: settlementId },
    });

    if (!settlement) {
      throw new Error("Settlement not found");
    }

    const newAmountPaid = Number(settlement.amountPaid) + amountToPay;
    const finalPayout = Number(settlement.finalPayout);
    let newStatus = settlement.status;

    if (newAmountPaid >= finalPayout) {
      newStatus = "PAID";
    } else if (newAmountPaid > 0) {
      newStatus = "PARTIAL";
    }

    const updated = await prisma.settlement.update({
      where: { id: settlementId },
      data: {
        amountPaid: newAmountPaid,
        status: newStatus,
      },
    });

    revalidatePath("/staff/settlements");
    return { success: true, data: updated };
  } catch (error: any) {
    console.error("Error recording settlement payment:", error);
    return { success: false, error: error.message };
  }
}

// ────────────────────────────────────────────────────────────────────────────
// finalizeContractorSettlement — CONTRACTOR PAYROLL FINALIZATION
// ────────────────────────────────────────────────────────────────────────────

/**
 * Finalizes a weekly settlement for an external contractor.
 * - Aggregates DispatchAssignment wages (lockedWageRate × headcount) for the week.
 * - Deducts Expense-based CONTRACTOR_ADVANCE records not yet locked to a settlement.
 * - Locks assignments + advances, upserts Settlement, writes AuditLog.
 * OWNER or ADMIN only.
 */
import { requireAuth } from "@/lib/serverAuth";
import { logAudit } from "@/lib/auditLogger";
import { Prisma } from "@prisma/client";

export async function finalizeContractorSettlement(params: {
  contractorId: string;
  weekEnding: string;   // ISO date string YYYY-MM-DD
  notes?: string;
}) {
  try {
    const { employeeId: actorId, role } = await requireAuth({ allowedRoles: ["OWNER", "ADMIN"] });

    const weekEndingDate = new Date(params.weekEnding);
    const weekStartDate = new Date(weekEndingDate.getTime() - 6 * 86_400_000);
    weekStartDate.setHours(0, 0, 0, 0);
    weekEndingDate.setHours(23, 59, 59, 999);

    // Verify contractor
    const contractor = await prisma.contractor.findUnique({ where: { id: params.contractorId } });
    if (!contractor) return { success: false, error: "Contractor not found" };

    // 1. Aggregate unsettled DispatchAssignment wages for this contractor
    const assignments = await prisma.dispatchAssignment.findMany({
      where: {
        contractorId: params.contractorId,
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

    // 2. Unsettled contractor advances (Expense category CONTRACTOR_ADVANCE)
    const advances = await prisma.expense.findMany({
      where: {
        contractorId: params.contractorId,
        category: "CONTRACTOR_ADVANCE",
        settlementId: null,
      },
    });
    const totalAdvances = advances.reduce((sum, a) => sum + Number(a.amount), 0);

    const finalPayout = totalWages - totalAdvances;

    // 3. Persist in $transaction
    const result = await prisma.$transaction(async (tx) => {
      // Check for existing settlement for this week
      const existing = await tx.settlement.findFirst({
        where: { contractorId: params.contractorId, weekEnding: weekEndingDate },
      });

      let settlement;
      if (existing) {
        if (existing.status === "FINALIZED") {
          throw new Error("Contractor settlement already finalized for this period.");
        }
        settlement = await tx.settlement.update({
          where: { id: existing.id },
          data: {
            finalPayout: new Prisma.Decimal(finalPayout),
            status: "FINALIZED",
            notes: params.notes ?? existing.notes,
          },
        });
      } else {
        settlement = await tx.settlement.create({
          data: {
            contractorId: params.contractorId,
            weekEnding: weekEndingDate,
            finalPayout: new Prisma.Decimal(finalPayout),
            status: "FINALIZED",
            notes: params.notes,
          },
        });
      }

      // Lock assignments
      if (assignments.length > 0) {
        await tx.dispatchAssignment.updateMany({
          where: { id: { in: assignments.map((a) => a.id) } },
          data: { settlementId: settlement.id },
        });
      }

      // Lock advances
      if (advances.length > 0) {
        await tx.expense.updateMany({
          where: { id: { in: advances.map((a) => a.id) } },
          data: { settlementId: settlement.id },
        });
      }

      return settlement;
    });

    // 4. Audit log
    await logAudit({
      actorId,
      actorRole: role,
      actionType: "FINALIZE_CONTRACTOR_SETTLEMENT",
      modelName: "Settlement",
      newPayload: {
        settlementId: result.id,
        contractorId: params.contractorId,
        contractorName: contractor.name,
        weekEnding: params.weekEnding,
        totalWages,
        totalAdvances,
        finalPayout,
      },
    });

    revalidatePath("/staff/settlements");
    revalidatePath("/admin/settlements");
    return { success: true, data: result };
  } catch (error: any) {
    console.error("Error finalizing contractor settlement:", error);
    return { success: false, error: error.message || "Contractor finalization failed" };
  }
}

