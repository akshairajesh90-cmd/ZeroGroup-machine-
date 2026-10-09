"use server";
/**
 * Field Diary Server Actions — IronRent
 * NOTE: Uses actual FieldDiaryLog schema fields from prisma/schema.prisma
 * The model has: id, dispatchId, loggedByLeaderId, date, siteStatus,
 * arrivalTime, departureTime, internalHelperCount, notes, isSubmitted,
 * submittedAt, isStaffOverridden, overriddenById, overriddenAt.
 * There is NO clientId, hoursWorked, fuelUsedLiters, loggedAt on FieldDiaryLog.
 * Fuel is stored separately in FuelLog model.
 */

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";

export interface FieldDiaryEntry {
    /** Idempotency key — client-side uuid used as a lookup key against existing records */
    clientId: string;
    dispatchId: string;
    loggedByLeaderId?: string;
    date: string; // ISO date "YYYY-MM-DD"
    notes?: string;
    internalHelperCount?: number;
    arrivalTime?: string;  // ISO datetime
    departureTime?: string; // ISO datetime
}

export interface FuelLogEntry {
    clientId: string;
    machineId?: string;
    vehicleId?: string;
    driverId: string;
    liters: number;
    totalCost: number;
    receiptUrl?: string;
    date: string; // ISO date
}

interface SyncResult {
    synced: number;
    skipped: number;
    errors: string[];
}

/**
 * Upserts a FieldDiaryLog per (dispatchId, date) — idempotent via the unique constraint.
 */
export async function syncFieldDiaryBatch(
    entries: FieldDiaryEntry[]
): Promise<SyncResult> {
    let synced = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const entry of entries) {
        try {
            const date = new Date(entry.date);
            // @@unique([dispatchId, date]) guarantees idempotency
            await prisma.fieldDiaryLog.upsert({
                where: {
                    dispatchId_date: {
                        dispatchId: entry.dispatchId,
                        date,
                    },
                },
                create: {
                    dispatchId: entry.dispatchId,
                    loggedByLeaderId: entry.loggedByLeaderId ?? null,
                    date,
                    notes: entry.notes ?? null,
                    internalHelperCount: entry.internalHelperCount ?? 0,
                    arrivalTime: entry.arrivalTime ? new Date(entry.arrivalTime) : null,
                    departureTime: entry.departureTime ? new Date(entry.departureTime) : null,
                },
                update: {
                    notes: entry.notes ?? undefined,
                    internalHelperCount: entry.internalHelperCount ?? undefined,
                    departureTime: entry.departureTime ? new Date(entry.departureTime) : undefined,
                },
            });
            synced++;
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            // Skip actual unique-constraint violations (already synced)
            if (msg.includes("Unique constraint")) {
                skipped++;
            } else {
                errors.push(`[${entry.clientId}] ${msg}`);
            }
        }
    }

    if (synced > 0) revalidatePath("/field-diary");
    return { synced, skipped, errors };
}

/**
 * Syncs fuel log entries from the offline queue.
 * Uses the clientId as the record id for idempotency.
 */
export async function syncFuelLogBatch(
    entries: FuelLogEntry[]
): Promise<SyncResult> {
    let synced = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const entry of entries) {
        try {
            // Check by id (clientId used as PK for idempotency)
            const existing = await prisma.fuelLog.findUnique({ where: { id: entry.clientId } });
            if (existing) { skipped++; continue; }

            await prisma.fuelLog.create({
                data: {
                    id: entry.clientId,
                    machineId: entry.machineId ?? null,
                    vehicleId: entry.vehicleId ?? null,
                    driverId: entry.driverId,
                    liters: entry.liters,
                    totalCost: entry.totalCost,
                    receiptUrl: entry.receiptUrl ?? "",
                    date: new Date(entry.date),
                },
            });
            synced++;
        } catch (err) {
            const msg = err instanceof Error ? err.message : String(err);
            errors.push(`[${entry.clientId}] ${msg}`);
        }
    }

    return { synced, skipped, errors };
}

/**
 * Returns all field diary logs for a given dispatch.
 */
export async function getFieldDiaryLogs(dispatchId: string) {
    return prisma.fieldDiaryLog.findMany({
        where: { dispatchId },
        orderBy: { date: "desc" },
        include: {
            loggedByLeader: { select: { name: true, role: true } },
        },
    });
}

/**
 * Returns IN_PROGRESS dispatches for the field-diary screen.
 */
export async function getActiveDispatchesForDiary() {
    return prisma.dailyDispatch.findMany({
        where: { status: "IN_PROGRESS", isPendingDelete: false },
        orderBy: { dateOfService: "desc" },
        take: 50,
        select: {
            id: true,
            location: true,
            dateOfService: true,
            customer: { select: { name: true } },
            machine: { select: { machineId: true, type: true } },
            siteLeader: { select: { id: true, name: true } },
            fieldDiaryLogs: {
                orderBy: { date: "desc" },
                take: 1,
            },
        },
    });
}
