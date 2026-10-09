/**
 * @file actions.ts
 * @description
 * Contains the Server Actions for the Mobile Driver Portal.
 * 
 * Architectural Why:
 * Zero Group strictly requires that all dispatch status mutations from the field are logged
 * in an immutable AuditLog table. This prevents drivers/operators from modifying their
 * trip history without trace. We utilize `prisma.$transaction` to guarantee that both
 * the DailyDispatch update and the AuditLog insertion succeed together, ensuring 
 * absolute data consistency. If the network drops mid-request, the transaction rolls back.
 */

"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/serverAuth";
import { DispatchStatus } from "@prisma/client";
import { revalidatePath } from "next/cache";

/**
 * Updates the dispatch status for a specific job, logging the GPS coordinates.
 * 
 * Architectural Why:
 * 1. Validates the actor (Driver/Operator) via `requireAuth()` to prevent spoofing.
 * 2. Uses a Prisma transaction for atomic writes.
 * 3. Saves exact GPS coordinates directly to the Dispatch and the AuditLog.
 * 4. Revalidates Next.js cache to instantly reflect changes on the Driver Portal
 *    and the central Admin Live Operations Radar.
 * 
 * @param dispatchId - The ID of the DailyDispatch record being updated.
 * @param newStatus - The target DispatchStatus (e.g., EN_ROUTE, IN_PROGRESS).
 * @param latitude - The GPS latitude (null if network/GPS failed).
 * @param longitude - The GPS longitude (null if network/GPS failed).
 */
export async function updateDispatchStatus(
  dispatchId: string,
  newStatus: DispatchStatus,
  latitude: number | null,
  longitude: number | null
) {
  // 1. Authenticate the user. Only authorized drivers/operators should reach here.
  const { employeeId } = await requireAuth();

  try {
    // 2. Perform the atomic update and audit logging
    await prisma.$transaction(async (tx) => {
      // Update the dispatch with the new status and the latest GPS ping
      await tx.dailyDispatch.update({
        where: { id: dispatchId },
        data: {
          status: newStatus,
          ...(latitude !== null && { latitude }),
          ...(longitude !== null && { longitude }),
        },
      });

      // Write a strict Zero Group AuditLog for the change
      await tx.auditLog.create({
        data: {
          actionType: "STATUS_UPDATE",
          entity: "DAILY_DISPATCH",
          actorRole: "ADMIN",
          newPayload: { 
            id: dispatchId,
            delta: {
              newStatus,
              latitude,
              longitude,
            } as any
          },
          actorId: employeeId,
        },
      });
    });

    // 3. Purge the Next.js cache for the affected routes
    // Revalidating the driver portal ensures the massive buttons update to the next state.
    revalidatePath("/driver/portal");
    // Revalidating the admin live radar ensures office staff see the field movement immediately.
    revalidatePath("/admin/live");

    return { success: true };
  } catch (error) {
    console.error("[updateDispatchStatus] Error:", error);
    return { success: false, error: "Failed to update dispatch status." };
  }
}
