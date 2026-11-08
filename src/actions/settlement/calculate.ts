'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { z } from 'zod';
import { DispatchStatus } from '@prisma/client';
import { calculateSettlementSchema, multiPlayerBreakdownSchema } from './schemas';

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
 * Calculate balances across workers for the date range
 */
export async function calculateWorkerLedgerBalances(input: z.infer<typeof multiPlayerBreakdownSchema>) {
  try {
    const session = await auth();
    if (!session?.user) return { success: false, error: "Unauthorized" };

    const parsed = multiPlayerBreakdownSchema.parse(input);
    const start = new Date(parsed.startDate);
    const end = new Date(parsed.endDate);
    end.setHours(23, 59, 59, 999);

    const allEmployees = await prisma.employee.findMany({
      orderBy: { name: "asc" },
    });
    const empMap = new Map<string, any>(allEmployees.map(e => [e.id, e]));

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

    const cashCollections = await prisma.cashCollection.findMany({
      where: { date: { gte: start, lte: end } },
    });

    const advances = await prisma.salaryAdvance.findMany({
      where: {
        date: { gte: start, lte: end },
      },
    });

    const adjustments = await prisma.manualAdjustment.findMany({
      where: {
        date: { gte: start, lte: end },
        status: "APPROVED",
      },
    });

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
      previousBalance: number;
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
          previousBalance: 0,
          linkedBookings: [],
        });
      }
      return playerMap.get(empId)!;
    };

    // Calculate Unsettled Previous Balances (Before start date)
    const pastAssignments = await prisma.dispatchAssignment.findMany({
      where: { settlementId: null, dispatch: { dateOfService: { lt: start }, status: 'COMPLETED' } }
    });
    const pastAdvances = await prisma.salaryAdvance.findMany({
      where: { date: { lt: start }, status: 'PENDING' }
    });
    const pastAdjustments = await prisma.manualAdjustment.findMany({
      where: { date: { lt: start }, status: 'APPROVED', settlementStatus: 'PENDING' }
    });

    for (const a of pastAssignments) {
      if (!a.employeeId) continue;
      const p = getOrInitPlayer(a.employeeId);
      const amt = Number(a.lockedWageRate) * (a.headcount ?? 1);
      p.previousBalance += amt;
    }
    for (const a of pastAdvances) {
      if (!a.employeeId) continue;
      const p = getOrInitPlayer(a.employeeId);
      p.previousBalance -= Number(a.amount);
    }
    for (const a of pastAdjustments) {
      if (!a.employeeId) continue;
      const p = getOrInitPlayer(a.employeeId);
      if (a.type === 'BONUS') p.previousBalance += Number(a.amount);
      else p.previousBalance -= Number(a.amount);
    }

    const bookingHistory: any[] = [];

    // Process Dispatches & Build Itemized Booking History
    for (let bIdx = 0; bIdx < dispatches.length; bIdx++) {
      const d = dispatches[bIdx];
      const dateStr = new Date(d.dateOfService).toISOString().split("T")[0];
      const jobLabel = `${d.workType} (${d.machine?.machineId || "Independent"}) @ ${d.customer?.name || "Client"}`;
      const bookingNo = `(${bIdx + 1})`;

      const bookingItemLines: any[] = [];
      let totalBookingWage = 0;

      if (d.status === "CANCELLED" || d.notes?.toLowerCase().includes("cancelled") || d.notes?.toLowerCase().includes("no op")) {
        continue;
      }

      // Primary Operator
      if (d.operatorId) {
        const p = getOrInitPlayer(d.operatorId);
        p.shiftsCount += 1;
        const pay = Number(d.actualWagePaid && Number(d.actualWagePaid) > 0 ? d.actualWagePaid : (d.operatorDailyRate || empMap.get(d.operatorId)?.baseDailyWage || 1000));
        p.laborEarned += pay;
        p.actualWagePaid += pay;
        p.jobDescriptions.push(`[${dateStr}] ${jobLabel} — Primary Operator (+₹${pay})`);

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

      // Crew Assignments
      if (d.crewAssignments && d.crewAssignments.length > 0) {
        for (const assignment of d.crewAssignments) {
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
          p.jobDescriptions.push(`[${dateStr}] ${jobLabel} — Crew ${assignment.assignedRole} (+₹${pay})`);

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
        const pay = Number(empMap.get(d.driverId)?.baseDailyWage || 900);
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

    // Process Cash Collections
    for (const c of cashCollections) {
      if (!c.operatorId) continue;
      const p = getOrInitPlayer(c.operatorId);
      const amt = Number(c.amountCollected || 0);
      p.cashHeld += amt;
      const dateStr = new Date(c.date).toISOString().split("T")[0];
      p.jobDescriptions.push(`[${dateStr}] Cash Collected Held (-₹${amt})`);
    }

    // Process Salary Advances
    for (const adv of advances) {
      if (!adv.employeeId) continue;
      const p = getOrInitPlayer(adv.employeeId);
      const amt = Number(adv.amount || 0);
      p.advances += amt;
      const dateStr = new Date(adv.date).toISOString().split("T")[0];
      p.jobDescriptions.push(`[${dateStr}] Salary Advance (-₹${amt})`);
    }

    // Process Adjustments
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

    const activePlayers = Array.from(playerMap.values()).map(p => ({
      ...p,
      netPayable: p.previousBalance + (p.laborEarned + p.approvedBonuses) - (p.penalties + p.cashHeld + p.advances),
    }));

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

export async function calculateMultiPlayerBreakdown(data: { startDate: string, endDate: string }) {
  return { success: true, breakdown: [] };
}
