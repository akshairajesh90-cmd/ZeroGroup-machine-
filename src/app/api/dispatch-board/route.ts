/**
 * Dispatch Board Data API — IronRent
 * GET /api/dispatch-board
 * Returns all non-deleted dispatches for the Kanban board client.
 */

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { DispatchStatus } from "@prisma/client";

export async function GET() {
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

    return NextResponse.json({ dispatches });
}
