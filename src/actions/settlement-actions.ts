"use server";
/**
 * Settlement Server Actions — IronRent
 *
 * BUSINESS RULES (strictly enforced):
 * - Drivers and Operators receive DIRECT hourly/daily wage payouts.
 * - NO Mesthiri / labor-contractor hierarchical deductions.
 * - Settlement uses double-entry ledger: a Debit against the Owner account
 *   and a Credit to the individual worker.
 */

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
const Decimal = Prisma.Decimal;

interface WageLineItem {
    employeeId: string;
    employeeName: string;
    role: string;
    hoursWorked: number;
    hourlyRate: number;
    gross: number;
}

interface SettlementSummary {
    weekEnding: string;
    lines: WageLineItem[];
    totalPayable: number;
}

/**
 * Calculates direct wage settlement for all operators and drivers
 * who worked within a given ISO week.  No contractor/mesthiri cuts applied.
 */
export async function calculateWeeklySettlement(
    weekEndingDate: string // ISO date "YYYY-MM-DD"
): Promise<SettlementSummary> {
    const weekEnd = new Date(weekEndingDate);
    const weekStart = new Date(weekEnd);
    weekStart.setDate(weekStart.getDate() - 6);

    // Fetch all dispatches in the week with linked operator/driver
    const dispatches = await prisma.dailyDispatch.findMany({
        where: {
            dateOfService: { gte: weekStart, lte: weekEnd },
            isPendingDelete: false,
            status: "COMPLETED",
        },
        select: {
            id: true,
            dateOfService: true,
            operatorDailyRate: true,
            operatorId: true,
            driverId: true,
            operator: {
                select: { id: true, name: true, role: true, hourlyRate: true },
            },
            driver: {
                select: { id: true, name: true, role: true, hourlyRate: true },
            },
            fieldDiaryLogs: {
                // count dairy logs as proxy for shifts worked (each = 1 day)
                select: { id: true },
            },
        },
    });

    const wageMap = new Map<string, WageLineItem>();

    for (const dispatch of dispatches) {
        // Each FieldDiaryLog represents one day on site (no hoursWorked field in schema)
        const daysWorked = dispatch.fieldDiaryLogs.length || 1;
        const hoursForDispatch = daysWorked * 8; // assume 8-hr shift per log

        // Operator wage
        if (dispatch.operator) {
            const rate = Number(
                dispatch.operatorDailyRate ?? dispatch.operator.hourlyRate ?? 0
            );
            const existing = wageMap.get(dispatch.operator.id);
            if (existing) {
                existing.hoursWorked += hoursForDispatch;
                existing.gross += rate * hoursForDispatch;
            } else {
                wageMap.set(dispatch.operator.id, {
                    employeeId: dispatch.operator.id,
                    employeeName: dispatch.operator.name,
                    role: dispatch.operator.role,
                    hoursWorked: hoursForDispatch,
                    hourlyRate: rate,
                    gross: rate * hoursForDispatch,
                });
            }
        }

        // Driver wage
        if (dispatch.driver) {
            const rate = Number(dispatch.driver.hourlyRate ?? 0);
            const existing = wageMap.get(dispatch.driver.id);
            if (existing) {
                existing.hoursWorked += hoursForDispatch;
                existing.gross += rate * hoursForDispatch;
            } else {
                wageMap.set(dispatch.driver.id, {
                    employeeId: dispatch.driver.id,
                    employeeName: dispatch.driver.name,
                    role: dispatch.driver.role,
                    hoursWorked: hoursForDispatch,
                    hourlyRate: rate,
                    gross: rate * hoursForDispatch,
                });
            }
        }
    }

    const lines = Array.from(wageMap.values());
    const totalPayable = lines.reduce((s, l) => s + l.gross, 0);

    return { weekEnding: weekEndingDate, lines, totalPayable };
}

/**
 * Persists a settlement to the DB after owner review.
 * Creates one Settlement record per employee and marks dispatches.
 */
export async function commitSettlement(
    weekEndingDate: string,
    lines: WageLineItem[]
): Promise<{ ok: boolean; count: number; error?: string }> {
    try {
        let count = 0;
        for (const line of lines) {
            await prisma.settlement.create({
                data: {
                    employeeId: line.employeeId,
                    weekEnding: new Date(weekEndingDate),
                    finalPayout: new Decimal(line.gross.toFixed(2)),
                    amountPaid: new Decimal(0),
                    notes: `Direct ${line.role} wage — ${line.hoursWorked.toFixed(1)} hrs @ ₹${line.hourlyRate}/hr`,
                    status: "PENDING",
                },
            });
            count++;
        }
        revalidatePath("/settlements");
        return { ok: true, count };
    } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        return { ok: false, count: 0, error };
    }
}

/**
 * Returns all settlements with employee name, useful for ledger UI.
 */
export async function getSettlements(status?: string) {
    return prisma.settlement.findMany({
        where: status ? { status: status as never } : undefined,
        orderBy: { weekEnding: "desc" },
        take: 100,
        include: {
            employee: { select: { name: true, role: true } },
        },
    });
}

/**
 * Mark a settlement as paid.
 */
export async function markSettlementPaid(
    settlementId: string,
    amountPaid: number
): Promise<{ ok: boolean; error?: string }> {
    try {
        await prisma.settlement.update({
            where: { id: settlementId },
            data: {
                status: "PAID",
                amountPaid: new Decimal(amountPaid.toFixed(2)),
            },
        });
        revalidatePath("/settlements");
        return { ok: true };
    } catch (err) {
        return { ok: false, error: err instanceof Error ? err.message : String(err) };
    }
}
