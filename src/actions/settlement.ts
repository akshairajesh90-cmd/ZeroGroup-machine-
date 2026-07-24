'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { requireAuth } from '@/lib/serverAuth';
import { z } from 'zod';
import { Prisma, DispatchStatus } from '@prisma/client';
import { revalidatePath } from 'next/cache';

// ============================================================================
// ZOD VALIDATION SCHEMAS
// ============================================================================

const calculateSettlementSchema = z.object({
  operatorId: z.string().min(1, "Operator is required"),
  startDate: z.string().min(1, "Start Date is required"),
  endDate: z.string().min(1, "End Date is required"),
});

const createAdjustmentSchema = z.object({
  employeeId: z.string().min(1, "Employee ID required"),
  amount: z.number().positive("Amount must be positive"),
  type: z.enum(["BONUS", "PENALTY"]),
  reason: z.string().min(3, "Mandatory audit reason required (min 3 characters)"),
  date: z.string().min(1, "Date required"),
});

const approveAdjustmentSchema = z.object({
  adjustmentId: z.string().min(1, "Adjustment ID required"),
});

const generateSettlementSchema = z.object({
  operatorId: z.string().min(1, "Operator required"),
  weekEnding: z.string().min(1, "Week Ending date required"),
  notes: z.string().optional(),
  customEarned: z.number().optional(),
  customAdvances: z.number().optional(),
  customBonuses: z.number().optional(),
});

const updateSettlementSchema = z.object({
  settlementId: z.string().min(1, "Settlement ID required"),
  currentVersion: z.number().int(),
  customEarned: z.number().optional(),
  customAdvances: z.number().optional(),
  customBonuses: z.number().optional(),
});

const finalizeSettlementSchema = z.object({
  settlementId: z.string().min(1, "Settlement ID required"),
  currentVersion: z.number().int(),
});

// ============================================================================
// SERVER ACTIONS
// ============================================================================

/**
 * Calculate preview breakdown for an Operator's Settlement.
 * Formula: Payout = (Labor Earned + APPROVED Bonuses) - (Penalties + Cash Collected + Advances)
 */
export async function calculateOperatorSettlement(input: z.infer<typeof calculateSettlementSchema>) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const parsed = calculateSettlementSchema.parse(input);
    const start = new Date(parsed.startDate);
    const end = new Date(parsed.endDate);
    end.setHours(23, 59, 59, 999);

    const operator = await prisma.employee.findUnique({
      where: { id: parsed.operatorId },
    });

    if (!operator) return { success: false, error: "Operator employee record not found" };

    // 1. Labor Earned (From primary dispatches or multi-operator assignments where status=COMPLETED)
    const primaryDispatches = await prisma.dailyDispatch.findMany({
      where: {
        operatorId: parsed.operatorId,
        dateOfService: { gte: start, lte: end },
        status: "COMPLETED",
      },
      include: {
        machine: true,
        customer: true,
      },
    });

    const multiDispatches = await prisma.dispatchOperator.findMany({
      where: {
        internalEmployeeId: parsed.operatorId,
        dispatch: {
          dateOfService: { gte: start, lte: end },
          status: "COMPLETED",
        },
      },
      include: {
        dispatch: {
          include: {
            machine: true,
            customer: true,
          },
        },
      },
    });

    let totalLaborEarned = 0;
    const laborLogs: any[] = [];

    for (const d of primaryDispatches) {
      const pay = Number(d.operatorDailyRate || 0);
      totalLaborEarned += pay;
      laborLogs.push({
        dispatchId: d.id,
        date: d.dateOfService,
        machine: d.machine?.machineId || "INDEPENDENT",
        workType: d.workType,
        pay,
        role: "PRIMARY_OPERATOR",
      });
    }

    for (const mo of multiDispatches) {
      const d = mo.dispatch;
      // If already counted as primary, skip duplicate
      if (d.operatorId === parsed.operatorId) continue;
      const pay = Number(d.operatorDailyRate || 0);
      totalLaborEarned += pay;
      laborLogs.push({
        dispatchId: d.id,
        date: d.dateOfService,
        machine: d.machine?.machineId || "MULTI-CREW",
        workType: d.workType,
        pay,
        role: "MULTI_OPERATOR",
      });
    }

    // 2. Cash Collected / Held (status DEPOSITED or PENDING_DEPOSIT)
    const cashCollections = await prisma.cashCollection.findMany({
      where: {
        operatorId: parsed.operatorId,
        date: { gte: start, lte: end },
      },
    });

    let totalCashHeld = 0;
    for (const c of cashCollections) {
      totalCashHeld += Number(c.amountCollected || 0);
    }

    // 3. Salary Advances (status PENDING)
    const advances = await prisma.salaryAdvance.findMany({
      where: {
        employeeId: parsed.operatorId,
        status: "PENDING",
      },
    });

    let totalAdvances = 0;
    for (const adv of advances) {
      totalAdvances += Number(adv.amount || 0);
    }

    // 4. Manual Adjustments (APPROVED only, where settlementStatus=PENDING)
    const adjustments = await prisma.manualAdjustment.findMany({
      where: {
        employeeId: parsed.operatorId,
        status: "APPROVED",
        settlementStatus: "PENDING",
      },
    });

    let approvedBonuses = 0;
    let approvedPenalties = 0;

    for (const adj of adjustments) {
      if (adj.type === "BONUS") {
        approvedBonuses += Number(adj.amount || 0);
      } else if (adj.type === "PENALTY") {
        approvedPenalties += Number(adj.amount || 0);
      }
    }

    const totalAdjustments = approvedBonuses - approvedPenalties;
    const finalPayout = (totalLaborEarned + approvedBonuses) - (approvedPenalties + totalCashHeld + totalAdvances);

    return {
      success: true,
      data: {
        operator,
        totalLaborEarned,
        totalCashHeld,
        totalAdvances,
        approvedBonuses,
        approvedPenalties,
        totalAdjustments,
        finalPayout,
        breakdown: {
          laborLogs,
          cashCollections,
          advances,
          adjustments,
        },
      },
    };
  } catch (error: any) {
    console.error("Error calculating settlement:", error);
    return { success: false, error: error.message || "Calculation failed" };
  }
}

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
    const { employeeId } = await requireAuth({ allowedRoles: ["OWNER"] });
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
    const effectiveAdjustments = effectiveBonuses - approvedPenalties;
    const effectivePayout = (effectiveEarned + effectiveBonuses) - (approvedPenalties + totalCashHeld + effectiveAdvances);

    const hasCustomOverrides = parsed.customEarned !== undefined || parsed.customAdvances !== undefined || parsed.customBonuses !== undefined;
    const effectiveNotes = parsed.notes || (hasCustomOverrides ? "Includes custom manual overrides from Weekend Payroll Hub" : undefined);

    const record = await prisma.settlement.upsert({
      where: {
        operatorId_weekEnding: {
          operatorId: parsed.operatorId,
          weekEnding: weekEndingDate,
        },
      },
      update: {
        totalLaborEarned: new Prisma.Decimal(effectiveEarned),
        totalCashHeld: new Prisma.Decimal(totalCashHeld),
        totalAdvances: new Prisma.Decimal(effectiveAdvances),
        totalAdjustments: new Prisma.Decimal(effectiveAdjustments),
        finalPayout: new Prisma.Decimal(effectivePayout),
        notes: effectiveNotes,
      },
      create: {
        operatorId: parsed.operatorId,
        weekEnding: weekEndingDate,
        totalLaborEarned: new Prisma.Decimal(effectiveEarned),
        totalCashHeld: new Prisma.Decimal(totalCashHeld),
        totalAdvances: new Prisma.Decimal(effectiveAdvances),
        totalAdjustments: new Prisma.Decimal(effectiveAdjustments),
        finalPayout: new Prisma.Decimal(effectivePayout),
        notes: effectiveNotes,
        status: "DRAFT",
      },
    });

    revalidatePath("/admin/settlements");
    return { success: true, data: record };
  } catch (error: any) {
    console.error("Error generating settlement:", error);
    return { success: false, error: error.message || "Generation failed" };
  }
}

/**
 * Finalize Settlement (OWNER ONLY).
 * Locks record immutably (isFinalized=true) and settles all pending advances & adjustments.
 */
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

    if (dbSettlement.version !== parsed.currentVersion) {
      return { success: false, error: "Data has changed. Please refresh and try again." };
    }

    const updated = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const res = await tx.settlement.update({
        where: { id: parsed.settlementId, version: parsed.currentVersion },
        data: {
          totalLaborEarned: parsed.customEarned !== undefined ? new Prisma.Decimal(parsed.customEarned) : undefined,
          totalAdvances: parsed.customAdvances !== undefined ? new Prisma.Decimal(parsed.customAdvances) : undefined,
          version: { increment: 1 }
        },
      });

      await tx.auditLog.create({
        data: {
          entity: "SETTLEMENT",
          entityId: res.id,
          action: "UPDATE",
          delta: {
            customEarned: parsed.customEarned,
            customAdvances: parsed.customAdvances,
            customBonuses: parsed.customBonuses,
            oldVersion: parsed.currentVersion,
            newVersion: parsed.currentVersion + 1,
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
    const { employeeId } = await requireAuth({ allowedRoles: ["OWNER"] });
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
    
    if (settlement.version !== parsed.currentVersion) {
      return { success: false, error: "Data has changed. Please refresh and try again." };
    }

    const locked = await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      const updatedSettlement = await tx.settlement.update({
        where: { id: settlement.id, version: parsed.currentVersion },
        data: {
          status: "FINALIZED",
          version: { increment: 1 },
          finalizedById: employeeId,
          finalizedAt: new Date(),
        },
      });

      await tx.salaryAdvance.updateMany({
        where: { employeeId: settlement.operatorId, status: "PENDING" },
        data: { status: "SETTLED" },
      });

      await tx.manualAdjustment.updateMany({
        where: { employeeId: settlement.operatorId, status: "APPROVED", settlementStatus: "PENDING" },
        data: { settlementStatus: "SETTLED" },
      });

      await tx.auditLog.create({
        data: {
          entity: "SETTLEMENT",
          entityId: settlement.id,
          action: "FINALIZE",
          delta: { status: "FINALIZED", oldVersion: parsed.currentVersion, newVersion: parsed.currentVersion + 1 },
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

// ============================================================================
// MULTI-PLAYER / DAY-BASED / WEEK-BASED LEDGER ACTION
// ============================================================================

const multiPlayerBreakdownSchema = z.object({
  startDate: z.string().min(1, "Start Date is required"),
  endDate: z.string().min(1, "End Date is required"),
});

export async function calculateMultiPlayerBreakdown(input: z.infer<typeof multiPlayerBreakdownSchema>) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const parsed = multiPlayerBreakdownSchema.parse(input);
    const start = new Date(parsed.startDate);
    const end = new Date(parsed.endDate);
    end.setHours(23, 59, 59, 999);

    // Fetch all employees so we know names and roles
    const allEmployees = await prisma.employee.findMany({
      orderBy: { name: "asc" },
    });
    const empMap = new Map<string, any>(allEmployees.map(e => [e.id, e]));

    // Fetch all completed/active dispatches in range with comprehensive field relations (Filtering out CANCELLED / NO_SHOW)
    const dispatches = await prisma.dailyDispatch.findMany({
      where: {
        dateOfService: { gte: start, lte: end },
        status: { notIn: [DispatchStatus.CANCELLED, DispatchStatus.NO_SHOW].filter(Boolean) as any },
      },
      include: {
        machine: true,
        customer: true,
        operator: true,
        driver: true,
        multiOperators: {
          include: { employee: true },
        },
        dispatchLabor: {
          include: { employee: true },
        },
        dispatchAssets: {
          include: { machine: true },
        },
        dispatchMachines: {
          include: { machine: true },
        },
        dispatchTools: {
          include: { tool: true },
        },
      },
      orderBy: { dateOfService: "desc" },
    });

    // Requirement 4: Execute native Database-Level Aggregations (groupBy) to prevent N+1 and verify sums right inside PostgreSQL
    const dbOperatorGroup = await prisma.dispatchOperator.groupBy({
      by: ["internalEmployeeId", "externalName"],
      where: {
        dispatch: {
          dateOfService: { gte: start, lte: end },
          status: { notIn: [DispatchStatus.CANCELLED, DispatchStatus.NO_SHOW].filter(Boolean) as any },
        },
      },
      _sum: { actualWagePaid: true, dayWage: true },
      _count: { id: true },
    });

    const dbLaborGroup = await prisma.dispatchLabor.groupBy({
      by: ["internalEmployeeId", "externalWorkerName"],
      where: {
        dispatch: {
          dateOfService: { gte: start, lte: end },
          status: { notIn: [DispatchStatus.CANCELLED, DispatchStatus.NO_SHOW].filter(Boolean) as any },
        },
      },
      _sum: {
        actualWagePaid: true,
        lumpSumWage: true,
        internalHeadCount: true,
        externalHeadCount: true,
        outsideWagePaid: true,
      },
      _count: { id: true },
    });

    // Fetch all cash collections in range
    const cashCollections = await prisma.cashCollection.findMany({
      where: { date: { gte: start, lte: end } },
    });

    // Fetch pending salary advances in range (or all pending if within period)
    const advances = await prisma.salaryAdvance.findMany({
      where: {
        date: { gte: start, lte: end },
      },
    });

    // Fetch manual adjustments in range
    const adjustments = await prisma.manualAdjustment.findMany({
      where: {
        date: { gte: start, lte: end },
        status: "APPROVED",
      },
    });

    // We will build a player map: employeeId/externalId -> metrics + connected bookings
    const playerMap = new Map<string, {
      playerId: string;
      playerName: string;
      playerRole: string;
      phone?: string;
      shiftsCount: number;
      jobDescriptions: string[];
      laborEarned: number;
      actualWagePaid: number;
      internalHeadCount: number;
      externalHeadCount: number;
      outsideWagePaid: number;
      isExternalLiability: boolean;
      approvedBonuses: number;
      penalties: number;
      cashHeld: number;
      advances: number;
      linkedBookings: any[];
    }>();

    const getOrInitPlayer = (empId: string, fallbackName = "Unknown Player", fallbackRole = "OPERATOR") => {
      if (!playerMap.has(empId)) {
        const emp = empMap.get(empId);
        playerMap.set(empId, {
          playerId: empId,
          playerName: emp ? emp.name : fallbackName,
          playerRole: emp ? emp.role : fallbackRole,
          phone: emp?.phone || "",
          shiftsCount: 0,
          jobDescriptions: [],
          laborEarned: 0,
          actualWagePaid: 0,
          internalHeadCount: 0,
          externalHeadCount: 0,
          outsideWagePaid: 0,
          isExternalLiability: false,
          approvedBonuses: 0,
          penalties: 0,
          cashHeld: 0,
          advances: 0,
          linkedBookings: [],
        });
      }
      return playerMap.get(empId)!;
    };

    const bookingHistory: any[] = [];

    // 1. Process Dispatches & Build Itemized Booking History with Connected Linked Bookings (`Requirement 2, 3, 5 & Connection`)
    for (let bIdx = 0; bIdx < dispatches.length; bIdx++) {
      const d = dispatches[bIdx];
      const dateStr = new Date(d.dateOfService).toISOString().split("T")[0];
      const jobLabel = `${d.workType} (${d.machine?.machineId || "Independent"}) @ ${d.customer?.name || "Client"}`;
      const bookingNo = `(${bIdx + 1})`;

      const bookingItemLines: any[] = [];
      let totalBookingWage = 0;

      // Requirement 3 verification: Skip if status is CANCELLED or notes explicitly flag cancellation
      if (d.status === "CANCELLED" || d.notes?.toLowerCase().includes("cancelled") || d.notes?.toLowerCase().includes("no op")) {
        continue;
      }

      // Primary Operator
      if (d.operatorId) {
        const p = getOrInitPlayer(d.operatorId);
        p.shiftsCount += 1;
        // Requirement 2: Strictly prioritize immutable static actualWagePaid snapshot
        const pay = Number(d.actualWagePaid && Number(d.actualWagePaid) > 0 ? d.actualWagePaid : (d.operatorDailyRate || empMap.get(d.operatorId)?.dailyRate || 1000));
        p.laborEarned += pay;
        p.actualWagePaid += pay;
        p.jobDescriptions.push(`[${dateStr}] ${jobLabel} — Primary Operator (+₹${pay})`);
        
        // Connected Booking Linking
        p.linkedBookings.push({
          bookingId: d.id,
          bookingNo,
          date: dateStr,
          site: d.location || "Site Location",
          customerName: d.customer?.name || "Client",
          workType: d.workType,
          rolePlayed: "PRIMARY_OPERATOR",
          earned: pay,
          notes: d.notes || "",
        });

        bookingItemLines.push({
          itemKey: d.machine?.machineId || "MACHINE",
          itemDescription: `${d.workType} (${d.machine?.machineId || "Machine"})`,
          assignedTo: p.playerName,
          role: "OPERATOR",
          rate: pay,
          quantity: 1,
          totalWage: pay,
        });
        totalBookingWage += pay;
      }

      // Multi Operators from DispatchOperator (both Internal and External)
      if (d.multiOperators && d.multiOperators.length > 0) {
        for (const opRow of d.multiOperators) {
          if (opRow.internalEmployeeId && opRow.internalEmployeeId === d.operatorId) continue;

          let opId = opRow.internalEmployeeId || `EXT-OP-${opRow.externalName || 'UNKNOWN'}`;
          let opName = opRow.employee?.name || opRow.externalName || "External Operator";
          const p = getOrInitPlayer(opId, opName, "OPERATOR");
          p.shiftsCount += 1;
          
          // Requirement 2: Strictly prioritize actualWagePaid snapshot
          const pay = Number(opRow.actualWagePaid && Number(opRow.actualWagePaid) > 0 ? opRow.actualWagePaid : (opRow.dayWage || (opRow.internalEmployeeId ? empMap.get(opRow.internalEmployeeId)?.dailyRate : 1000) || 1000));
          p.laborEarned += pay;
          p.actualWagePaid += pay;
          p.jobDescriptions.push(`[${dateStr}] ${jobLabel} — Crew Operator (+₹${pay})`);

          // Connected Booking Linking
          p.linkedBookings.push({
            bookingId: d.id,
            bookingNo,
            date: dateStr,
            site: d.location || "Site Location",
            customerName: d.customer?.name || "Client",
            workType: d.workType,
            rolePlayed: "CREW_OPERATOR",
            earned: pay,
            notes: d.notes || "",
          });

          bookingItemLines.push({
            itemKey: "CREW_OP",
            itemDescription: `Equipment Operator (${opName})`,
            assignedTo: opName,
            role: "OPERATOR",
            rate: pay,
            quantity: 1,
            totalWage: pay,
          });
          totalBookingWage += pay;
        }
      }

      // Leader/Mestri Allocations from DispatchLabor (`Requirement 5: Split Crew Attributions`)
      if (d.dispatchLabor && d.dispatchLabor.length > 0) {
        for (const lab of d.dispatchLabor) {
          let mestriId = lab.internalEmployeeId || `EXT-MESTRI-${lab.externalWorkerName || 'Leader'}`;
          let mestriName = lab.employee?.name || lab.externalWorkerName || "Mestri / Leader";
          const p = getOrInitPlayer(mestriId, mestriName, "WORKER");
          p.shiftsCount += 1;

          const hCount = Number(lab.helperCount || 0) + Number(lab.headCount || 1);
          const intHeadCount = Number(lab.internalHeadCount && lab.internalHeadCount > 0 ? lab.internalHeadCount : hCount);
          const extHeadCount = Number(lab.externalHeadCount || 0);
          const extPaid = Number(lab.outsideWagePaid || 0);

          p.internalHeadCount += intHeadCount;
          p.externalHeadCount += extHeadCount;
          p.outsideWagePaid += extPaid;
          if (lab.isExternalLiability || extHeadCount > 0) {
            p.isExternalLiability = true;
          }

          // Requirement 2 & 5: Strictly prioritize actualWagePaid (internal company liability only)
          let lumpPay = Number(lab.actualWagePaid && Number(lab.actualWagePaid) > 0 ? lab.actualWagePaid : (lab.lumpSumWage || 0));
          if (lumpPay === 0 && hCount > 0) {
            const defaultRate = lab.internalEmployeeId ? Number(empMap.get(lab.internalEmployeeId)?.dailyRate || 1200) : 1200;
            lumpPay = intHeadCount * defaultRate;
          }

          p.laborEarned += lumpPay;
          p.actualWagePaid += lumpPay;
          p.jobDescriptions.push(`[${dateStr}] ${jobLabel} — Panikar Crew: ${mestriName} (${hCount} total = ${intHeadCount} internal @ +₹${lumpPay}${extHeadCount > 0 ? `, ${extHeadCount} outside @ ₹${extPaid}` : ''})`);

          // Connected Booking Linking (`AND THE BOOKING IS CONNECTED WITH STATEMENT PAGE`)
          p.linkedBookings.push({
            bookingId: d.id,
            bookingNo,
            date: dateStr,
            site: d.location || "Site Location",
            customerName: d.customer?.name || "Client",
            workType: d.workType,
            rolePlayed: "MESTRI_CREW",
            earned: lumpPay,
            notes: lab.notes || d.notes || "",
            internalWorkers: intHeadCount,
            outsideWorkers: extHeadCount,
            outsidePaid: extPaid,
          });

          bookingItemLines.push({
            itemKey: "PANIKAR_CREW",
            itemDescription: `Panikar Crew (${lab.notes || 'Normal Wage'})`,
            assignedTo: `${mestriName} (${hCount} total: ${intHeadCount} int, ${extHeadCount} out)`,
            role: "MESTRI",
            rate: intHeadCount > 0 ? Math.round(lumpPay / intHeadCount) : lumpPay,
            quantity: hCount,
            totalWage: lumpPay,
          });
          totalBookingWage += lumpPay;
        }
      } else if (d.mainHelperId || d.mainHelperName) {
        let mestriId = d.mainHelperId || `EXT-MESTRI-${d.mainHelperName || 'Leader'}`;
        let mestriName = (d as any).mainHelper?.name || d.mainHelperName || "Leader/Mestri";
        const p = getOrInitPlayer(mestriId, mestriName, "WORKER");
        p.shiftsCount += 1;
        const hCount = Number(d.helperCount || 1);
        const empRate = Number((d.mainHelperId ? empMap.get(d.mainHelperId)?.dailyRate : 1200) || 1200);
        const pay = hCount * empRate;
        p.laborEarned += pay;
        p.actualWagePaid += pay;
        p.internalHeadCount += hCount;
        p.jobDescriptions.push(`[${dateStr}] ${jobLabel} — Leader/Mestri (${hCount} Helpers @ ₹${empRate} = +₹${pay})`);

        p.linkedBookings.push({
          bookingId: d.id,
          bookingNo,
          date: dateStr,
          site: d.location || "Site Location",
          customerName: d.customer?.name || "Client",
          workType: d.workType,
          rolePlayed: "MESTRI_CREW",
          earned: pay,
          notes: d.notes || "",
          internalWorkers: hCount,
          outsideWorkers: 0,
          outsidePaid: 0,
        });

        bookingItemLines.push({
          itemKey: "PANIKAR_CREW",
          itemDescription: `Panikar / Helper Crew`,
          assignedTo: `${mestriName} (${hCount} workers)`,
          role: "MESTRI",
          rate: empRate,
          quantity: hCount,
          totalWage: pay,
        });
        totalBookingWage += pay;
      }

      // Conveyance Driver
      if (d.driverId) {
        const p = getOrInitPlayer(d.driverId, "Driver", "DRIVER");
        p.shiftsCount += 1;
        const pay = Number(empMap.get(d.driverId)?.dailyRate || 900);
        p.laborEarned += pay;
        p.actualWagePaid += pay;
        p.jobDescriptions.push(`[${dateStr}] ${jobLabel} — Transport Driver (+₹${pay})`);

        p.linkedBookings.push({
          bookingId: d.id,
          bookingNo,
          date: dateStr,
          site: d.location || "Site Location",
          customerName: d.customer?.name || "Client",
          workType: d.workType,
          rolePlayed: "DRIVER",
          earned: pay,
          notes: d.notes || "",
        });

        bookingItemLines.push({
          itemKey: "TRANSPORT",
          itemDescription: `Transport & Conveyance Method`,
          assignedTo: p.playerName,
          role: "DRIVER",
          rate: pay,
          quantity: 1,
          totalWage: pay,
        });
        totalBookingWage += pay;
      }

      // Build summary of assets/tools used on this job for the ledger display
      const allMachineTags = [
        d.machine?.machineId,
        ...(d.dispatchAssets?.map(a => a.machine?.machineId) || []),
        ...(d.dispatchMachines?.map(m => m.machine?.machineId) || [])
      ].filter(Boolean);
      const uniqueMachines = Array.from(new Set(allMachineTags)).join(", ") || "Independent Job";

      const toolsSummary = d.dispatchTools?.map(t => `${t.quantity}x ${t.tool?.name || 'Tool'}${t.variant ? ` (${t.variant})` : ''}`).join(", ") || "Standard Tools";

      bookingHistory.push({
        id: d.id,
        date: dateStr,
        billNumber: (d as any).billNumber || `#${d.id.slice(-4).toUpperCase()}`,
        customerName: d.customer?.name || "Client Site",
        location: d.location || "Site Location",
        workType: d.workType,
        machineSummary: uniqueMachines,
        liftFloors: d.liftFloors || 1,
        toolsSummary,
        status: d.status,
        itemLines: bookingItemLines,
        totalBookingWage,
      });
    }

    // 2. Process Cash Collections
    for (const c of cashCollections) {
      if (!c.operatorId) continue;
      const p = getOrInitPlayer(c.operatorId);
      const amt = Number(c.amountCollected || 0);
      p.cashHeld += amt;
      const dateStr = new Date(c.date).toISOString().split("T")[0];
      p.jobDescriptions.push(`[${dateStr}] Cash Collected Held (-₹${amt})`);
    }

    // 3. Process Salary Advances
    for (const adv of advances) {
      if (!adv.employeeId) continue;
      const p = getOrInitPlayer(adv.employeeId);
      const amt = Number(adv.amount || 0);
      p.advances += amt;
      const dateStr = new Date(adv.date).toISOString().split("T")[0];
      p.jobDescriptions.push(`[${dateStr}] Salary Advance (-₹${amt})`);
    }

    // 4. Process Adjustments
    for (const adj of adjustments) {
      if (!adj.employeeId) continue;
      const p = getOrInitPlayer(adj.employeeId);
      const amt = Number(adj.amount || 0);
      const dateStr = new Date(adj.date).toISOString().split("T")[0];
      if (adj.type === "BONUS") {
        p.approvedBonuses += amt;
        p.jobDescriptions.push(`[${dateStr}] BONUS: ${adj.reason} (+₹${amt})`);
      } else {
        p.penalties += amt;
        p.jobDescriptions.push(`[${dateStr}] PENALTY: ${adj.reason} (-₹${amt})`);
      }
    }

    // Also include any active players who worked or have adjustments
    const activePlayers = Array.from(playerMap.values()).map(p => ({
      ...p,
      netPayable: (p.laborEarned + p.approvedBonuses) - (p.penalties + p.cashHeld + p.advances),
    }));

    // Sort by name
    activePlayers.sort((a, b) => a.playerName.localeCompare(b.playerName));

    return {
      success: true,
      data: {
        players: activePlayers,
        bookingHistory,
        allEmployees,
        totals: {
          totalEarned: activePlayers.reduce((s, x) => s + x.laborEarned, 0),
          totalBonuses: activePlayers.reduce((s, x) => s + x.approvedBonuses, 0),
          totalPenalties: activePlayers.reduce((s, x) => s + x.penalties, 0),
          totalCashHeld: activePlayers.reduce((s, x) => s + x.cashHeld, 0),
          totalAdvances: activePlayers.reduce((s, x) => s + x.advances, 0),
          totalNetPayable: activePlayers.reduce((s, x) => s + x.netPayable, 0),
        },
      },
    };
  } catch (error: any) {
    console.error("Error calculating multi-player breakdown:", error);
    return { success: false, error: error.message || "Failed multi-player calculation" };
  }
}

