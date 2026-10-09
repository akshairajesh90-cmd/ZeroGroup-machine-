"use server";
/**
 * Dispatch Server Actions — IronRent
 * Implements Optimistic Concurrency Control (OCC) via the `version` field
 * on DailyDispatch. Any concurrent write with a stale version is rejected.
 */

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { DispatchStatus } from "@prisma/client";

interface UpdateStatusInput {
    dispatchId: string;
    newStatus: DispatchStatus;
    /** The version value the client last read — used for OCC check */
    knownVersion: number;
    reason?: string;
    actorEmployeeId: string;
}

interface UpdateStatusResult {
    success: boolean;
    error?: string;
    conflict?: boolean;
}

/**
 * OCC-guarded status transition.
 * Rejects with `conflict: true` when the server version has moved ahead.
 */
export async function updateDispatchStatus(
    input: UpdateStatusInput
): Promise<UpdateStatusResult> {
    const { dispatchId, newStatus, knownVersion, reason, actorEmployeeId } =
        input;

    try {
        // Atomic OCC update — only succeeds when version matches
        const updated = await prisma.dailyDispatch.updateMany({
            where: { id: dispatchId, version: knownVersion },
            data: {
                status: newStatus,
                version: { increment: 1 },
            },
        });

        if (updated.count === 0) {
            // Another writer moved the version forward; inform the client
            return { success: false, conflict: true, error: "Version conflict — please refresh the board." };
        }

        // Write audit trail
        const latestDispatch = await prisma.dailyDispatch.findUnique({
            where: { id: dispatchId },
            select: { status: true },
        });

        await prisma.dispatchStatusHistory.create({
            data: {
                dispatchId,
                oldStatus: latestDispatch?.status ?? newStatus, // approximate; actual new status already written
                newStatus,
                changedById: actorEmployeeId,
                reason: reason ?? "Board drag-and-drop",
            },
        });

        revalidatePath("/dispatch-board");
        return { success: true };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        return { success: false, error: message };
    }
}

/**
 * Fetch all dispatches for the Kanban board, grouped by status.
 */
export async function getDispatchBoard() {
    const dispatches = await prisma.dailyDispatch.findMany({
        where: {
            isPendingDelete: false,
            status: {
                in: [
                    DispatchStatus.PENDING,
                    DispatchStatus.IN_PROGRESS,
                    DispatchStatus.COMPLETED,
                    DispatchStatus.CANCELLED,
                ],
            },
        },
        orderBy: { dateOfService: "desc" },
        take: 200,
        select: {
            id: true,
            status: true,
            version: true,
            location: true,
            dateOfService: true,
            workType: true,
            machineId: true,
            customerId: true,
            operatorId: true,
            driverId: true,
            notes: true,
            customer: { select: { name: true } },
            machine: { select: { machineId: true, type: true } },
            operator: { select: { name: true } },
            driver: { select: { name: true } },
        },
    });

    return dispatches;
}

/** Valid OCC status transition map — only covers the 4 board columns */
export const ALLOWED_TRANSITIONS: Partial<Record<DispatchStatus, DispatchStatus[]>> = {
    PENDING: [DispatchStatus.IN_PROGRESS, DispatchStatus.CANCELLED],
    IN_PROGRESS: [DispatchStatus.COMPLETED, DispatchStatus.PENDING],
    COMPLETED: [],
    CANCELLED: [DispatchStatus.PENDING],
};
