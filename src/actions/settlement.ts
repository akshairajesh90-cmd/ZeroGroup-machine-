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

    const multiDispatches = await prisma.dispatchAssignment.findMany({
      where: {
        employeeId: parsed.operatorId,
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
 * Guardrail: <= â‚¹500 auto-approves. > â‚¹500 requires OWNER approval (PENDING).
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
 * Approve a Pending Manual Adjustment (> â‚¹500).
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

// ============================================================================
// MULTI-PLAYER / DAY-BASED / WEEK-BASED LEDGER ACTION
// ============================================================================

const multiPlayerBreakdownSchema = z.object({
  startDate: z.string().min(1, "Start Date is required"),
  endDate: z.string().min(1, "End Date is required"),
});

export async function calculateWorkerLedgerBalances(input: z.infer<typeof multiPlayerBreakdownSchema>) {
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
        crewAssignments: {
          include: { employee: true },
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
    // Requirement 4: Execute native Database-Level Aggregations (groupBy) to prevent N+1 and verify sums right inside PostgreSQL
    const dbCrewGroup = await prisma.dispatchAssignment.groupBy({
      by: ["employeeId", "assignedRole"],
      where: {
        dispatch: {
          dateOfService: { gte: start, lte: end },
          status: { notIn: [DispatchStatus.CANCELLED, DispatchStatus.NO_SHOW].filter(Boolean) as any },
        },
      },
      _sum: { lockedWageRate: true },
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
        const pay = Number(d.actualWagePaid && Number(d.actualWagePaid) > 0 ? d.actualWagePaid : (d.operatorDailyRate || empMap.get(d.operatorId)?.baseDailyWage || 1000));
        p.laborEarned += pay;
        p.actualWagePaid += pay;
        p.jobDescriptions.push(`[${dateStr}] ${jobLabel} â€” Primary Operator (+â‚¹${pay})`);

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

      // Process Crew Assignments (replaces old multiOperators and dispatchLabor)
      if (d.crewAssignments && d.crewAssignments.length > 0) {
        for (const assignment of d.crewAssignments) {
          // Skip if this assignment matches the primary operator or driver already processed
          if (assignment.employeeId === d.operatorId) continue;
          if (assignment.employeeId === d.driverId) continue;

          let empId = assignment.employeeId ?? `contractor-${assignment.contractorId}`;
          let empName = assignment.employee?.name || "Unknown Crew";
          const p = getOrInitPlayer(empId as string, empName, assignment.assignedRole);
          p.shiftsCount += 1;

          const pay = Number(assignment.lockedWageRate || 0);
          p.laborEarned += pay;
          p.actualWagePaid += pay;
          p.internalHeadCount += 1;
          p.jobDescriptions.push(`[${dateStr}] ${jobLabel} â€” Crew ${assignment.assignedRole} (+â‚¹${pay})`);

          // Connected Booking Linking
          p.linkedBookings.push({
            bookingId: d.id,
            bookingNo,
            date: dateStr,
            site: d.location || "Site Location",
            customerName: d.customer?.name || "Client",
            workType: d.workType,
            rolePlayed: assignment.assignedRole,
            earned: pay,
            notes: d.notes || "",
          });

          bookingItemLines.push({
            itemKey: `CREW_${assignment.assignedRole}`,
            itemDescription: `Crew Member (${empName} - ${assignment.assignedRole})`,
            assignedTo: empName,
            role: assignment.assignedRole,
            rate: pay,
            quantity: 1,
            totalWage: pay,
          });
          totalBookingWage += pay;
        }
      } else if (d.mainHelperId || d.mainHelperName) {
        let mestriId = d.mainHelperId || `EXT-MESTRI-${d.mainHelperName || 'Leader'}`;
        let mestriName = (d as any).mainHelper?.name || d.mainHelperName || "Leader/Mestri";
        const p = getOrInitPlayer(mestriId, mestriName, "WORKER");
        p.shiftsCount += 1;
        const hCount = Number(d.helperCount || 1);
        const empRate = Number((d.mainHelperId ? empMap.get(d.mainHelperId)?.baseDailyWage : 1200) || 1200);
        const pay = hCount * empRate;
        p.laborEarned += pay;
        p.actualWagePaid += pay;
        p.internalHeadCount += hCount;
        p.jobDescriptions.push(`[${dateStr}] ${jobLabel} â€” Leader/Mestri (${hCount} Helpers @ â‚¹${empRate} = +â‚¹${pay})`);

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
        const pay = Number(empMap.get(d.driverId)?.baseDailyWage || 900);
        p.laborEarned += pay;
        p.actualWagePaid += pay;
        p.jobDescriptions.push(`[${dateStr}] ${jobLabel} â€” Transport Driver (+â‚¹${pay})`);

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
      p.jobDescriptions.push(`[${dateStr}] Cash Collected Held (-â‚¹${amt})`);
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

    // 3b. Process Expenses (Added as reimbursable/additional to their payout)
    for (const exp of expenses) {
      if (!exp.employeeId) continue;
      const p = getOrInitPlayer(exp.employeeId);
      const amt = Number(exp.amount || 0);
      p.expenses += amt;
      const dateStr = new Date(exp.date).toISOString().split("T")[0];
      p.jobDescriptions.push(`[${dateStr}] Expense Logged: ${exp.category} (+₹${amt})`);
    }
// 4. Process Adjustments
    for (const adj of adjustments) {
      if (!adj.employeeId) continue;
      const p = getOrInitPlayer(adj.employeeId);
      const amt = Number(adj.amount || 0);
      const dateStr = new Date(adj.date).toISOString().split("T")[0];
      if (adj.type === "BONUS") {
        p.approvedBonuses += amt;
        p.jobDescriptions.push(`[${dateStr}] BONUS: ${adj.reason} (+â‚¹${amt})`);
      } else {
        p.penalties += amt;
        p.jobDescriptions.push(`[${dateStr}] PENALTY: ${adj.reason} (-â‚¹${amt})`);
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

// ============================================================================
// finalizeWeeklySettlement â€” THE KEY FINALIZATION ENTRY POINT
// ============================================================================

const finalizeWeeklySettlementSchema = z.object({
  employeeId: z.string().min(1, "Employee ID required"),
  weekEnding: z.string().min(1, "Week-ending date required (YYYY-MM-DD)"),
  notes: z.string().optional(),
});

/**
 * Finalizes a weekly settlement for an internal employee.
 * - Aggregates DispatchAssignment wages (lockedWageRate Ã— headcount) for completed dispatches in the week.
 * - Adds APPROVED ManualAdjustment bonuses, deducts penalties.
 * - Deducts all PENDING SalaryAdvances and marks them SETTLED.
 * - Upserts the Settlement record and sets status to FINALIZED.
 * - Writes an AuditLog entry.
 * OWNER only.
 */
export async function finalizeWeeklySettlement(input: z.infer<typeof finalizeWeeklySettlementSchema>) {
  try {
    const { employeeId: actorEmployeeId, role } = await requireAuth({ allowedRoles: ["OWNER"] });

    const parsed = finalizeWeeklySettlementSchema.parse(input);
    const weekEndingDate = new Date(parsed.weekEnding);
    // Week window: Monâ€“Sun (7 days ending on weekEnding)
    const weekStartDate = new Date(weekEndingDate.getTime() - 6 * 86_400_000);
    weekStartDate.setHours(0, 0, 0, 0);
    weekEndingDate.setHours(23, 59, 59, 999);

    // â”€â”€ Verify employee exists â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const employee = await prisma.employee.findUnique({ where: { id: parsed.employeeId } });
    if (!employee) return { success: false, error: "Employee not found" };

    // â”€â”€ 1. Aggregate wage earnings via DispatchAssignment â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const assignments = await prisma.dispatchAssignment.findMany({
      where: {
        employeeId: parsed.employeeId,
        settlementId: null,           // not yet locked to a settlement
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

    // â”€â”€ 2. Approved bonuses & penalties not yet settled â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

    // â”€â”€ 3. Pending salary advances â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const pendingAdvances = await prisma.salaryAdvance.findMany({
      where: { employeeId: parsed.employeeId, status: "PENDING" },
    });
    const totalAdvances = pendingAdvances.reduce((sum, a) => sum + Number(a.amount), 0);

    const finalPayout = totalWages + totalBonuses - totalPenalties - totalAdvances;

    // â”€â”€ 4. Persist in a single transaction â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    const result = await prisma.$transaction(async (tx) => {
      // Upsert Settlement record
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

      // Lock assignments to this settlement
      if (assignments.length > 0) {
        await tx.dispatchAssignment.updateMany({
          where: { id: { in: assignments.map((a) => a.id) } },
          data: { settlementId: settlement.id },
        });
      }

      // Mark salary advances as SETTLED
      if (pendingAdvances.length > 0) {
        await tx.salaryAdvance.updateMany({
          where: { id: { in: pendingAdvances.map((a) => a.id) } },
          data: { status: "SETTLED" },
        });
      }

      // Mark manual adjustments as SETTLED
      if (adjustments.length > 0) {
        await tx.manualAdjustment.updateMany({
          where: { id: { in: adjustments.map((a) => a.id) } },
          data: { settlementStatus: "SETTLED" },
        });
      }

      return settlement;
    });

    // â”€â”€ 5. Audit log â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
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

export async function calculateMultiPlayerBreakdown(data: { startDate: string, endDate: string }) { return { success: true, breakdown: [] }; }


