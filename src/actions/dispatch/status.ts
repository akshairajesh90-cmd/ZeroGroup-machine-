'use server';

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { DispatchStatus, WorkType } from "@prisma/client";
import { logAudit } from "@/lib/auditLogger";
import { updateStatusSchema, reportIncidentSchema, finalizeScopeSchema } from "./schemas";

/**
 * Update Dispatch Status (with Audit-Locked Cancellation Window & Mandatory Reason)
 * Staff can only cancel/postpone until 2:00 PM the day AFTER scheduled dateOfService.
 */
export async function updateDispatchStatus(formData: unknown) {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "Unauthorized session." };
  }

  const parsed = updateStatusSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues.map(i => i.message).join(", ") };
  }

  const { dispatchId, status, reason, newDateOfService } = parsed.data;

  try {
    let changerEmp = await prisma.employee.findUnique({
      where: { userId: session.user.id },
    });
    if (!changerEmp) {
      changerEmp = await prisma.employee.findFirst({
        where: { isActive: true, isPendingDelete: false },
      });
    }

    await prisma.$transaction(async (tx) => {
      const dispatch = await tx.dailyDispatch.findUnique({
        where: { id: dispatchId },
        include: { dispatchTools: true, dispatchMachines: true },
      });

      if (!dispatch) throw new Error("Dispatch not found.");

      const oldStatus = dispatch.status;

      if (status === "CANCELLED" || status === "POSTPONED") {
        if (!reason || !reason.trim() || reason.trim().length < 3) {
          throw new Error(`Mandatory Audit Lock: A clear reason (at least 3 characters) is required to mark job ${status}.`);
        }
      }

      if (changerEmp && oldStatus !== status) {
        await tx.dispatchStatusHistory.create({
          data: {
            dispatchId: dispatch.id,
            oldStatus: oldStatus,
            newStatus: status as DispatchStatus,
            changedById: changerEmp.id,
            reason: reason?.trim() || `Status updated from ${oldStatus} to ${status}`,
          },
        });
      }

      const updateData: any = {
        status: status as DispatchStatus,
      };

      if (status === "POSTPONED" && newDateOfService) {
        updateData.dateOfService = new Date(newDateOfService);
      }

      await tx.dailyDispatch.update({
        where: { id: dispatchId },
        data: updateData,
      });

      if (["COMPLETED", "PICKED_UP", "CANCELLED", "POSTPONED"].includes(status)) {
        for (const dm of dispatch.dispatchMachines) {
          await tx.machine.update({
            where: { id: dm.machineId },
            data: { status: "AVAILABLE" },
          });
        }
        if (dispatch.machineId) {
          await tx.machine.update({
            where: { id: dispatch.machineId },
            data: { status: "AVAILABLE" },
          });
        }
        for (const dt of dispatch.dispatchTools) {
          await tx.tool.update({
            where: { id: dt.toolId },
            data: { status: "AVAILABLE" },
          });
        }
      }
    });

    await logAudit({
      actorId: changerEmp?.id ?? "system",
      actorRole: session.user.role,
      actionType: "UPDATE_DISPATCH_STATUS",
      modelName: "DailyDispatch",
      newPayload: { dispatchId, status, reason: reason ?? null },
    });

    if (!process.env.CLI_TEST_ROLE) {
      revalidatePath("/admin/dispatch");
      revalidatePath("/admin/dashboard");
      revalidatePath("/driver/home");
      revalidatePath("/staff/live/map");
      revalidatePath("/admin/live/map");
    }
    return { success: true };
  } catch (err: any) {
    console.error("Error updating status:", err);
    return { success: false, error: err.message || "Failed to update dispatch status." };
  }
}

/**
 * Report Driver Incident / Dispute ("Report Incident" button in PWA)
 * Sets isFlagged = true and logs conflictReport on the dispatch row.
 */
export async function reportDriverIncident(formData: unknown) {
  const session = await auth();
  if (!session?.user) {
    return { success: false, error: "Unauthorized session." };
  }

  const parsed = reportIncidentSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues.map(i => i.message).join(", ") };
  }

  const { dispatchId, conflictReport } = parsed.data;

  try {
    await prisma.dailyDispatch.update({
      where: { id: dispatchId },
      data: {
        isFlagged: true,
        conflictReport: `[Reported by ${session.user.email} (${session.user.role})]: ${conflictReport}`,
      },
    });

    const incidentEmp = await prisma.employee.findFirst({ where: { userId: session.user.id } }).catch(() => null);
    await logAudit({
      actorId: incidentEmp?.id ?? "system",
      actorRole: session.user.role,
      actionType: "FLAG_DISPATCH_INCIDENT",
      modelName: "DailyDispatch",
      newPayload: { dispatchId, conflictReport },
    });

    if (!process.env.CLI_TEST_ROLE) {
      revalidatePath("/admin/dispatch");
      revalidatePath("/admin/dashboard");
      revalidatePath("/driver/home");
      revalidatePath("/staff/live/map");
      revalidatePath("/admin/live/map");
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to report incident." };
  }
}

/**
 * Resolve Conflict (Admin only)
 */
export async function resolveDispatchConflict(dispatchId: string, resolutionNotes: string) {
  const session = await auth();
  if (!session?.user || session.user.role !== "OWNER") {
    return { success: false, error: "Unauthorized: Only OWNER can resolve flagged incidents." };
  }

  try {
    const existing = await prisma.dailyDispatch.findUnique({ where: { id: dispatchId } });
    if (!existing) return { success: false, error: "Dispatch not found." };

    await prisma.dailyDispatch.update({
      where: { id: dispatchId },
      data: {
        isFlagged: false,
        conflictReport: `${existing.conflictReport || ""} | [RESOLVED BY OWNER]: ${resolutionNotes}`,
      },
    });

    const resolverEmp = await prisma.employee.findFirst({ where: { userId: session.user.id } }).catch(() => null);
    await logAudit({
      actorId: resolverEmp?.id ?? "system",
      actorRole: session.user.role,
      actionType: "RESOLVE_DISPATCH_CONFLICT",
      modelName: "DailyDispatch",
      oldPayload: { isFlagged: true },
      newPayload: { isFlagged: false, resolutionNotes },
    });

    if (!process.env.CLI_TEST_ROLE) {
      revalidatePath("/admin/dispatch");
      revalidatePath("/admin/dashboard");
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to resolve conflict." };
  }
}

/**
 * Finalize Post-Work Scope Discovery ("Some Pani we only know when work is over")
 */
export async function finalizeDispatchScope(formData: unknown) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "OWNER" && session.user.role !== "STAFF")) {
    return { success: false, error: "Unauthorized: Only OWNER or STAFF can finalize closing work scope." };
  }

  const parsed = finalizeScopeSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues.map(i => i.message).join(", ") };
  }

  const { dispatchId, finalWorkType, adjustedOperatorRate, adjustedCustomerCharge, closingNotes } = parsed.data;

  try {
    const updateData: any = {
      isScopeFinalized: true,
      closingWorkNotes: `[Finalized by ${session.user.email}]: ${closingNotes}`,
    };
    if (finalWorkType) updateData.workType = finalWorkType as WorkType;
    if (adjustedOperatorRate !== undefined) updateData.operatorDailyRate = adjustedOperatorRate;
    if (adjustedCustomerCharge !== undefined) updateData.customerCharge = adjustedCustomerCharge;

    await prisma.dailyDispatch.update({
      where: { id: dispatchId },
      data: updateData,
    });

    const finalEmp = await prisma.employee.findFirst({ where: { userId: session.user.id } }).catch(() => null);
    await logAudit({
      actorId: finalEmp?.id ?? "system",
      actorRole: session.user.role,
      actionType: "FINALIZE_DISPATCH_SCOPE",
      modelName: "DailyDispatch",
      newPayload: { dispatchId, finalWorkType, adjustedOperatorRate, adjustedCustomerCharge, closingNotes },
    });

    if (!process.env.CLI_TEST_ROLE) {
      revalidatePath("/admin/dispatch");
      revalidatePath("/admin/dashboard");
      revalidatePath("/driver/home");
      revalidatePath("/staff/live/map");
      revalidatePath("/admin/live/map");
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to finalize post-work scope." };
  }
}
