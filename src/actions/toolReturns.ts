"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { ToolReturnStatus } from "@prisma/client";

// ─────────────────────────────────────────────────────────────────────────────
// ZOD SCHEMA
// ─────────────────────────────────────────────────────────────────────────────

const toolReturnItemSchema = z.object({
  dispatchToolId: z.string().min(1),
  toolId: z.string().min(1),
  toolName: z.string(),
  returnStatus: z.nativeEnum(ToolReturnStatus),
  returnNote: z.string().optional(),
});

const completeWithToolReturnsSchema = z.object({
  dispatchId: z.string().min(1, "Dispatch ID required"),
  toolReturns: z.array(toolReturnItemSchema).min(1, "At least one tool return entry required"),
});

// ─────────────────────────────────────────────────────────────────────────────
// ACTION: Complete dispatch with per-tool accountability
// ─────────────────────────────────────────────────────────────────────────────
export async function completeDispatchWithToolReturns(formData: unknown) {
  const session = await auth();
  if (
    !session?.user ||
    (session.user.role !== "OWNER" &&
      session.user.role !== "STAFF" &&
      session.user.role !== "ADMIN")
  ) {
    return { success: false, error: "Unauthorized." };
  }

  const parsed = completeWithToolReturnsSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues.map((i) => i.message).join(", ") };
  }

  const { dispatchId, toolReturns } = parsed.data;

  // ── GUARD: All tools must be accounted for (no PENDING entries allowed) ──
  const pendingItems = toolReturns.filter((t) => t.returnStatus === "PENDING");
  if (pendingItems.length > 0) {
    const names = pendingItems.map((t) => t.toolName).join(", ");
    return {
      success: false,
      error: `All tools must be accounted for before completing. Still pending: ${names}`,
    };
  }

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Verify dispatch exists and is not already completed/cancelled
      const dispatch = await tx.dailyDispatch.findUnique({
        where: { id: dispatchId },
        include: {
          dispatchTools: { include: { tool: true } },
          dispatchMachines: true,
        },
      });

      if (!dispatch) throw new Error("Dispatch not found.");
      if (["COMPLETED", "CANCELLED"].includes(dispatch.status)) {
        throw new Error(`Dispatch is already ${dispatch.status}.`);
      }

      // 2. Update each DispatchTool with its individual return status
      for (const item of toolReturns) {
        await tx.dispatchTool.update({
          where: { id: item.dispatchToolId },
          data: {
            returnStatus: item.returnStatus,
            returnNote: item.returnNote?.trim() || null,
            returnedAt: new Date(),
          },
        });

        // 3. Update Tool inventory status based on return outcome
        const toolStatusMap: Record<ToolReturnStatus, "AVAILABLE" | "IN_USE" | "REPAIR"> = {
          RETURNED: "AVAILABLE",    // Tool came back → available again
          LEFT_ON_SITE: "IN_USE",   // Tool still at customer site
          MISSING: "REPAIR",        // Tool lost → flag for admin investigation
          DAMAGED: "REPAIR",        // Tool damaged → in repair
          PENDING: "IN_USE",        // Fallback (should not reach here due to guard)
        };

        const dt = dispatch.dispatchTools.find(d => d.id === item.dispatchToolId);
        const qty = dt?.quantity || 1;

        await tx.tool.update({
          where: { id: item.toolId },
          data: {
            status: toolStatusMap[item.returnStatus],
            ...(item.returnStatus === "DAMAGED" && {
              repairCount: { increment: qty },
            }),
          },
        });
      }

      // 4. Free up all machines
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

      // 5. Mark dispatch as COMPLETED
      await tx.dailyDispatch.update({
        where: { id: dispatchId },
        data: { status: "COMPLETED" },
      });
    });

    revalidatePath("/staff/dispatch");
    revalidatePath("/admin/live-map");
    revalidatePath("/staff/dashboard");
    return { success: true };
  } catch (err: any) {
    console.error("[completeDispatchWithToolReturns] Error:", err);
    return { success: false, error: err.message || "Failed to complete dispatch." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTION: Fetch active dispatches with no GPS signal (for Live Map sidebar)
// ─────────────────────────────────────────────────────────────────────────────
export async function getNoGpsActiveCrewForToday() {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    // Get all active dispatches for today
    const activeDispatches = await prisma.dailyDispatch.findMany({
      where: {
        dateOfService: { gte: todayStart, lte: todayEnd },
        status: { in: ["PENDING", "EN_ROUTE", "IN_PROGRESS", "DELIVERED"] },
      },
      include: {
        driver: { select: { id: true, name: true, role: true, profilePhotoUrl: true } },
        operator: { select: { id: true, name: true, role: true, profilePhotoUrl: true } },
        crewAssignments: {
          include: { employee: { select: { id: true, name: true, role: true, profilePhotoUrl: true } } },
        },
        customer: { select: { name: true } },
        machine: { select: { machineId: true, type: true } },
      },
    });

    // Collect all unique employee IDs across dispatches
    const allEmployeeEntries: { employeeId: string; name: string; role: string; profilePhotoUrl: string | null; dispatchLocation: string; customerName: string; machineTag: string | null }[] = [];

    for (const d of activeDispatches) {
      const location = d.location;
      const customerName = d.customer?.name || "Unknown";
      const machineTag = d.machine ? `${d.machine.machineId} (${d.machine.type})` : null;

      if (d.driver) {
        allEmployeeEntries.push({
          employeeId: d.driver.id,
          name: d.driver.name,
          role: d.driver.role,
          profilePhotoUrl: (d.driver as any).profilePhotoUrl || null,
          dispatchLocation: location,
          customerName,
          machineTag,
        });
      }
      if (d.operator) {
        allEmployeeEntries.push({
          employeeId: d.operator.id,
          name: d.operator.name,
          role: d.operator.role,
          profilePhotoUrl: (d.operator as any).profilePhotoUrl || null,
          dispatchLocation: location,
          customerName,
          machineTag,
        });
      }
      for (const ca of d.crewAssignments) {
        if (!ca.employee) continue;
        allEmployeeEntries.push({
          employeeId: ca.employee.id,
          name: ca.employee.name,
          role: ca.employee.role,
          profilePhotoUrl: ca.employee.profilePhotoUrl || null,
          dispatchLocation: location,
          customerName,
          machineTag,
        });
      }
    }

    // Deduplicate by employeeId
    const uniqueMap = new Map<string, typeof allEmployeeEntries[0]>();
    for (const entry of allEmployeeEntries) {
      if (!uniqueMap.has(entry.employeeId)) uniqueMap.set(entry.employeeId, entry);
    }
    const uniqueEmployees = Array.from(uniqueMap.values());

    if (uniqueEmployees.length === 0) return { success: true, data: [] };

    // Find which employees have a recent ping (last 15 minutes)
    const fifteenMinsAgo = new Date(Date.now() - 15 * 60000);
    const recentPings = await prisma.locationPing.findMany({
      where: {
        employeeId: { in: uniqueEmployees.map((e) => e.employeeId) },
        timestamp: { gte: fifteenMinsAgo },
      },
      select: { employeeId: true },
      distinct: ["employeeId"],
    });

    const employeesWithGps = new Set(recentPings.map((p) => p.employeeId));

    // Return only those WITHOUT a recent GPS ping
    const noGpsCrew = uniqueEmployees.filter((e) => !employeesWithGps.has(e.employeeId));

    return { success: true, data: noGpsCrew };
  } catch (err: any) {
    return { success: false, error: err.message, data: [] };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTION: Submit Individual Tool Return (Field Diary Flow)
// ─────────────────────────────────────────────────────────────────────────────
import { requireAuth } from "@/lib/serverAuth";
import { logAudit } from "@/lib/auditLogger";

export async function submitToolReturn(
  dispatchToolId: string,
  returnStatus: "OK" | "DAMAGED" | "MISSING" | "LEFT_ON_SITE",
  returnNote?: string,
  fieldDiaryLogId?: string
) {
  try {
    const { employeeId: actorId, role } = await requireAuth({
      allowedRoles: ["OPERATOR", "STAFF", "ADMIN", "OWNER"],
    });

    const dispatchTool = await prisma.dispatchTool.findUnique({
      where: { id: dispatchToolId },
      include: { tool: true },
    });

    if (!dispatchTool) {
      return { success: false, error: "Dispatch tool not found." };
    }

    const result = await prisma.$transaction(async (tx) => {
      // 1. Map input to prisma enums/values
      let mappedReturnStatus: ToolReturnStatus = "RETURNED";
      let isReturned = true;
      let toolInventoryStatus: "AVAILABLE" | "IN_USE" | "REPAIR" = "AVAILABLE";
      let logCondition = returnStatus; // "OK", "DAMAGED", "MISSING" (LEFT_ON_SITE mapped below)

      switch (returnStatus) {
        case "OK":
          mappedReturnStatus = "RETURNED";
          toolInventoryStatus = "AVAILABLE";
          break;
        case "DAMAGED":
          mappedReturnStatus = "RETURNED";
          toolInventoryStatus = "REPAIR";
          break;
        case "MISSING":
          mappedReturnStatus = "MISSING";
          isReturned = false;
          toolInventoryStatus = "REPAIR"; // Treat missing as needing admin attention (repair bucket typically handles offline tools)
          break;
        case "LEFT_ON_SITE":
          mappedReturnStatus = "LEFT_ON_SITE";
          isReturned = false;
          logCondition = "OK"; // Tool is fine, just not physically back
          toolInventoryStatus = "IN_USE";
          break;
      }

      // 2. Update DispatchTool
      const updatedDt = await tx.dispatchTool.update({
        where: { id: dispatchToolId },
        data: {
          returnStatus: mappedReturnStatus,
          returnNote: returnNote?.trim() || null,
          returnedAt: new Date(),
        },
      });

      // 3. Update Master Tool status
      await tx.tool.update({
        where: { id: dispatchTool.toolId },
        data: { status: toolInventoryStatus },
      });

      // 4. Upsert EquipmentVerificationLog if diary is linked
      let verificationLog = null;
      if (fieldDiaryLogId) {
        verificationLog = await tx.equipmentVerificationLog.upsert({
          where: {
            fieldDiaryLogId_dispatchToolId: {
              fieldDiaryLogId,
              dispatchToolId,
            },
          },
          create: {
            fieldDiaryLogId,
            dispatchToolId,
            isReturned,
            condition: logCondition,
            notes: returnNote?.trim() || null,
          },
          update: {
            isReturned,
            condition: logCondition,
            notes: returnNote?.trim() || null,
          },
        });
      }

      // 5. Automatically create Expense if MISSING or LEFT_ON_SITE
      if (returnStatus === "MISSING" || returnStatus === "LEFT_ON_SITE") {
        await tx.expense.create({
          data: {
            loggerId: actorId,
            amount: 0, // Zero by default, Admin edits later to charge customer or write off
            category: "TOOL_PARTS",
            description: `Auto-generated due to tool flagged as ${returnStatus}: ${dispatchTool.tool.name}`,
            date: new Date(),
            dispatchId: dispatchTool.dispatchId,
            toolId: dispatchTool.toolId,
            notes: returnNote?.trim(),
          },
        });
      }

      return { updatedDt, verificationLog };
    });

    // 6. Audit Logging
    await logAudit({
      actorId,
      actorRole: role,
      actionType: "VERIFY_TOOL_CONDITION",
      modelName: "DispatchTool",
      oldPayload: { returnStatus: dispatchTool.returnStatus },
      newPayload: {
        dispatchToolId,
        toolId: dispatchTool.toolId,
        statusRecorded: returnStatus,
        note: returnNote,
      },
    });

    revalidatePath("/operator/field-diary");
    revalidatePath("/staff/dispatch");
    return { success: true, data: result };
  } catch (error: any) {
    console.error("[submitToolReturn] Error:", error);
    return { success: false, error: error.message || "Failed to submit tool return." };
  }
}

