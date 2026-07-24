"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { DispatchStatus, WorkType, MachineType } from "@prisma/client";

// ============================================================================
// STRICT ZOD VALIDATION SCHEMAS
// ============================================================================

const dispatchSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  machineId: z.string().nullable().optional(), // Primary machine or nullable for independent labor
  machineIds: z.array(z.string()).optional(), // Site-Job V6.0: Multiple machines/assets
  driverId: z.string().nullable().optional(), // Nullable if public transport or outside conveyance
  operatorId: z.string().nullable().optional(), // Nullable if Electric Vibrator (no op) or optional
  workerId: z.string().nullable().optional(),
  mainHelperId: z.string().nullable().optional(),
  mainHelperName: z.string().optional(),
  helperCount: z.number().min(0).default(0), // Numeric helper count (displayed on Bill #1583)
  trollyWorkerCount: z.number().min(0).default(0), // Workers specifically for one-wheel trolly
  multiOperatorIds: z.array(z.string()).optional(),
  multiWorkerIds: z.array(z.string()).optional(),
  paniLaborCount: z.number().min(0).default(0),
  siteBundleId: z.string().optional(),
  location: z.string().min(2, "Construction site location is required"),
  mapLink: z.string().optional(), // Driver GPS Map Pin link for return drivers / forgotten tools
  dateOfService: z.string().min(1, "Service date is required"),
  workType: z.enum(["NORMAL", "TROLLY", "LATE"]).default("NORMAL"),
  
  // V15.0 Equipment & Travel Guardrails
  liftFloors: z.number().min(1).default(1), // Storeys e.g., 3 Floored used
  mixerCategory: z.enum(["STANDARD", "HYDRAULIC"]).default("STANDARD"), // Machine vs Hydraulic
  vibratorType: z.enum(["PETROL", "ELECTRIC"]).nullable().optional(),
  hasTrollyBench: z.boolean().default(false), // Trolly ONLY goes with Bench
  publicTransportUsed: z.boolean().default(false), // Company vehicle OR public transport / bus / auto
  machineNumberTag: z.string().optional(), // Tagged AFTER setup anytime
  
  toolIds: z.array(z.string()).default([]),
  toolItems: z.array(
    z.object({
      toolId: z.string(),
      quantity: z.number().min(1, "Quantity must be at least 1"),
      variant: z.string().optional(), // e.g. "PETROL", "ELECTRIC"
    })
  ).optional(),
  notes: z.string().optional(),
});

const updateStatusSchema = z.object({
  dispatchId: z.string().min(1, "Dispatch ID required"),
  status: z.enum(["PENDING", "DELIVERED", "PICKED_UP", "COMPLETED", "CANCELLED", "POSTPONED"]),
  reason: z.string().optional(), // Mandatory if CANCELLED or POSTPONED
});

const reportIncidentSchema = z.object({
  dispatchId: z.string().min(1, "Dispatch ID required"),
  conflictReport: z.string().min(3, "Detailed incident description required (e.g. 'Customer refused payment over hose burst')"),
});

const updateDailyDispatchSchema = z.object({
  id: z.string().min(1, "Dispatch ID required"),
  version: z.number().int(),
  customerId: z.string().min(1, "Customer is required"),
  machineId: z.string().nullable().optional(),
  machineIds: z.array(z.string()).optional(),
  driverId: z.string().nullable().optional(),
  operatorId: z.string().nullable().optional(),
  workerId: z.string().nullable().optional(),
  mainHelperId: z.string().nullable().optional(),
  mainHelperName: z.string().optional(),
  helperCount: z.number().min(0).default(0),
  trollyWorkerCount: z.number().min(0).default(0),
  multiOperatorIds: z.array(z.string()).optional(),
  multiWorkerIds: z.array(z.string()).optional(),
  siteBundleId: z.string().optional(),
  location: z.string().min(2, "Location is required"),
  mapLink: z.string().optional(),
  dateOfService: z.string().min(1, "Service date is required"),
  workType: z.enum(["NORMAL", "TROLLY", "LATE"]).default("NORMAL"),
  liftFloors: z.number().min(1).default(1),
  mixerCategory: z.enum(["STANDARD", "HYDRAULIC"]).default("STANDARD"),
  vibratorType: z.enum(["PETROL", "ELECTRIC"]).nullable().optional(),
  hasTrollyBench: z.boolean().default(false),
  publicTransportUsed: z.boolean().default(false),
  machineNumberTag: z.string().optional(),
  toolIds: z.array(z.string()).default([]),
  toolItems: z.array(
    z.object({
      toolId: z.string(),
      quantity: z.number().min(1),
      variant: z.string().optional(),
    })
  ).optional(),
  notes: z.string().optional(),
});

// ============================================================================
// SERVER ACTIONS
// ============================================================================

/**
 * 1. Create a Daily Dispatch (Site-Job Model V15.0 — Equipment, Tools & Multi-Crew)
 */
export async function createDailyDispatch(formData: unknown) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "OWNER" && session.user.role !== "STAFF")) {
    return { success: false, error: "Unauthorized: Only OWNER or STAFF can dispatch equipment." };
  }

  const parsed = dispatchSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues.map(i => i.message).join(", ") };
  }

  const data = parsed.data;

  try {
    // 0. STRICT ROLE SEGREGATION CHECK: Drivers & Office Staff cannot be Operators or Workers for Pani!
    const allOperatorIds = Array.from(new Set([
      ...(data.operatorId ? [data.operatorId] : []),
      ...(data.multiOperatorIds || [])
    ])).filter(Boolean);
    const allWorkerIds = Array.from(new Set([
      ...(data.workerId ? [data.workerId] : []),
      ...(data.multiWorkerIds || [])
    ])).filter(Boolean) as string[];

    if (allOperatorIds.length > 0 || allWorkerIds.length > 0) {
      const checkEmployees = await prisma.employee.findMany({
        where: { id: { in: [...allOperatorIds, ...allWorkerIds] } },
      });

      for (const emp of checkEmployees) {
        if (allOperatorIds.includes(emp.id) && (emp.role === "DRIVER" || emp.role === "STAFF")) {
          return { success: false, error: `Role Segregation Violation: ${emp.name} (${emp.role}) cannot perform Operator tasks or Pani work!` };
        }
        if (allWorkerIds.includes(emp.id) && (emp.role === "DRIVER" || emp.role === "STAFF")) {
          return { success: false, error: `Role Segregation Violation: ${emp.name} (${emp.role}) cannot perform physical Worker/Pani labor on site!` };
        }
      }
    }

    // 1. Determine Machine Type and aggregate all machines to link
    const allMachineIds = Array.from(new Set([
      ...(data.machineId && data.machineId !== "INDEPENDENT" ? [data.machineId] : []),
      ...(data.machineIds || []).filter(id => id !== "INDEPENDENT"),
    ]));

    let machineType: MachineType = MachineType.INDEPENDENT;
    if (allMachineIds.length > 0) {
      const firstMachine = await prisma.machine.findUnique({
        where: { id: allMachineIds[0] },
      });
      if (firstMachine) {
        machineType = firstMachine.type;
      }
    }

    // 2. Snapshot exact operator pay and customer charge from WorkTypeRate
    const rateRow = await prisma.workTypeRate.findUnique({
      where: {
        machineType_workType: {
          machineType: machineType,
          workType: data.workType as WorkType,
        },
      },
    });

    const operatorDailyRate = rateRow?.payoutRate ?? (machineType === "INDEPENDENT" ? 800 : 750);
    const customerCharge = rateRow?.customerCharge ?? (machineType === "INDEPENDENT" ? 1500 : 2300);

    // 3. Execute atomic transaction to create dispatch, machines, multi-crews, and tools with variants
    const dispatch = await prisma.$transaction(async (tx) => {
      const newDispatch = await tx.dailyDispatch.create({
        data: {
          customerId: data.customerId,
          machineId: allMachineIds[0] || null,
          driverId: data.driverId || null,
          operatorId: data.operatorId || null,
          workerId: data.workerId || null,
          mainHelperId: data.mainHelperId || null,
          mainHelperName: data.mainHelperName || null,
          helperCount: data.helperCount || 0,
          trollyWorkerCount: data.trollyWorkerCount || 0,
          location: data.location,
          mapLink: data.mapLink || null,
          dateOfService: new Date(data.dateOfService),
          workType: data.workType as WorkType,
          status: DispatchStatus.PENDING,
          operatorDailyRate: operatorDailyRate,
          customerCharge: customerCharge,
          notes: data.notes || null,
          
          // V15.0 Equipment & Travel Guardrails
          liftFloors: data.liftFloors || 1,
          mixerCategory: data.mixerCategory || "STANDARD",
          vibratorType: (data.vibratorType as any) || null,
          hasTrollyBench: data.hasTrollyBench || false,
          publicTransportUsed: data.publicTransportUsed || false,
          machineNumberTag: data.machineNumberTag || null,
          siteBundleId: data.siteBundleId || null,
        },
      });

      // Attach all selected machines to DispatchMachine join table and mark them RENTED
      for (const mId of allMachineIds) {
        await tx.dispatchMachine.create({
          data: { dispatchId: newDispatch.id, machineId: mId },
        });
        await tx.machine.update({
          where: { id: mId },
          data: { status: "RENTED" },
        });
      }

      // Insert all multi-operators into junction table
      for (const opId of allOperatorIds) {
        await tx.dispatchOperator.create({
          data: { dispatchId: newDispatch.id, internalEmployeeId: opId },
        });
      }

      // Insert all multi-workers into junction table
      for (const wId of allWorkerIds) {
        await tx.dispatchWorker.create({
          data: { dispatchId: newDispatch.id, employeeId: wId },
        });
      }

      // Handle auxiliary tools with quantities and variants
      const itemsToLink = data.toolItems && data.toolItems.length > 0
        ? data.toolItems
        : data.toolIds.map(tId => ({ toolId: tId, quantity: 1, variant: undefined }));

      for (const item of itemsToLink) {
        await tx.dispatchTool.create({
          data: {
            dispatchId: newDispatch.id,
            toolId: item.toolId,
            quantity: item.quantity,
            variant: item.variant || null,
          },
        });
        await tx.tool.update({
          where: { id: item.toolId },
          data: { status: "IN_USE" },
        });
      }

      return newDispatch;
    });

    revalidatePath("/admin/dispatch");
    revalidatePath("/admin/dashboard");
    revalidatePath("/driver/home");
    return { success: true, dispatchId: dispatch.id };
  } catch (err: any) {
    console.error("Error creating dispatch:", err);
    return { success: false, error: err.message || "Failed to create daily dispatch." };
  }
}

/**
 * 2. Update Dispatch Status (with Audit-Locked Cancellation Window & Mandatory Reason)
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

  const { dispatchId, status, reason } = parsed.data;

  try {
    const changerEmp = await prisma.employee.findUnique({
      where: { userId: session.user.id },
    });
    if (!changerEmp && session.user.role !== "OWNER") {
      return { success: false, error: "Only valid employees or OWNER can update status." };
    }

    await prisma.$transaction(async (tx) => {
      const dispatch = await tx.dailyDispatch.findUnique({
        where: { id: dispatchId },
        include: { dispatchTools: true, dispatchMachines: true },
      });

      if (!dispatch) throw new Error("Dispatch not found.");

      const oldStatus = dispatch.status;

      // Check Cancellation / Postponement Guardrails (V6.0)
      if (status === "CANCELLED" || status === "POSTPONED") {
        if (!reason || !reason.trim()) {
          throw new Error(`Mandatory Audit Lock: A clear reason is required to mark job ${status}.`);
        }

        // Staff cancellation window guardrail: ONLY until 2:00 PM the day AFTER scheduled dateOfService
        if (session.user.role === "STAFF") {
          const serviceDate = new Date(dispatch.dateOfService);
          const deadline = new Date(serviceDate);
          deadline.setDate(deadline.getDate() + 1);
          deadline.setHours(14, 0, 0, 0); // 2:00 PM the next day

          if (new Date() > deadline) {
            throw new Error(`Staff Cancellation Window Expired: You cannot cancel/postpone after 2:00 PM the day after scheduled service date. Contact OWNER.`);
          }
        }

        // Record immutable audit trail in DispatchStatusHistory
        if (changerEmp) {
          await tx.dispatchStatusHistory.create({
            data: {
              dispatchId: dispatch.id,
              oldStatus: oldStatus,
              newStatus: status as DispatchStatus,
              changedById: changerEmp.id,
              reason: reason.trim(),
            },
          });
        }
      }

      await tx.dailyDispatch.update({
        where: { id: dispatchId },
        data: { status: status as DispatchStatus },
      });

      // If completed, picked up, cancelled, or postponed -> free up all equipment and tools
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

    revalidatePath("/admin/dispatch");
    revalidatePath("/admin/dashboard");
    revalidatePath("/driver/home");
    return { success: true };
  } catch (err: any) {
    console.error("Error updating status:", err);
    return { success: false, error: err.message || "Failed to update dispatch status." };
  }
}

/**
 * 3. Report Driver Incident / Dispute ("Report Incident" button in PWA)
 * Sets isFlagged = true and logs conflictReport on the dispatch row.
 * Surfaces instantly in the Admin "Critical Alert Row".
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

    revalidatePath("/admin/dispatch");
    revalidatePath("/admin/dashboard");
    revalidatePath("/driver/home");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to report incident." };
  }
}

/**
 * 4. Resolve Conflict (Admin only)
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

    revalidatePath("/admin/dispatch");
    revalidatePath("/admin/dashboard");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to resolve conflict." };
  }
}

const finalizeScopeSchema = z.object({
  dispatchId: z.string().min(1, "Dispatch ID required"),
  finalWorkType: z.enum(["NORMAL", "TROLLY", "LATE"]).optional(),
  adjustedOperatorRate: z.number().optional(),
  adjustedCustomerCharge: z.number().optional(),
  closingNotes: z.string().min(3, "Must describe closing scope (e.g. 'Pani finished late at 8 PM - extra 3 hours')"),
});

/**
 * 5. Finalize Post-Work Scope Discovery ("Some Pani we only know when work is over")
 * Allows adjusting final workType, pay rate, customer charge, and adding closing notes upon completion.
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

    revalidatePath("/admin/dispatch");
    revalidatePath("/admin/dashboard");
    revalidatePath("/driver/home");
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to finalize post-work scope." };
  }
}

/**
 * 6. Get Dispatches with relations for UI boards
 */
export async function getDispatches(filter?: { status?: DispatchStatus; isFlagged?: boolean; siteBundleId?: string }) {
  try {
    const where: any = {};
    if (filter?.status) where.status = filter.status;
    if (filter?.isFlagged !== undefined) where.isFlagged = filter.isFlagged;
    if (filter?.siteBundleId) where.siteBundleId = filter.siteBundleId;

    const dispatches = await prisma.dailyDispatch.findMany({
      where,
      include: {
        customer: true,
        machine: true,
        dispatchMachines: {
          include: { machine: true },
        },
        driver: true,
        operator: true,
        worker: true,
        multiOperators: {
          include: { employee: true },
        },
        multiWorkers: {
          include: { employee: true },
        },
        dispatchTools: {
          include: { tool: true },
        },
      },
      orderBy: { dateOfService: "desc" },
    });

    return { success: true, data: dispatches };
  } catch (err: any) {
    console.error("Error fetching dispatches:", err);
    return { success: false, error: "Failed to fetch dispatches", data: [] };
  }
}

/**
 * Quick inline customer creation from Daily Dispatch modal
 */
export async function createQuickCustomer(formData: { name: string; phone: string; address?: string }) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "OWNER" && session.user.role !== "STAFF")) {
    return { success: false, error: "Unauthorized: Only OWNER or STAFF can add customers." };
  }

  if (!formData.name || !formData.phone) {
    return { success: false, error: "Name and Phone number are required." };
  }

  try {
    const customer = await prisma.customer.create({
      data: {
        name: formData.name.trim(),
        phone: formData.phone.trim(),
        address: formData.address?.trim() || "",
      },
    });

    revalidatePath("/admin/dispatch");
    return { success: true, customer };
  } catch (err: any) {
    console.error("Error creating quick customer:", err);
    return { success: false, error: err.message || "Failed to create customer." };
  }
}

/**
 * Fetch dispatches for a specific date range (Calendar View optimization)
 */
export async function fetchDispatchesByRange(startDate: string, endDate: string) {
  try {
    const dispatches = await prisma.dailyDispatch.findMany({
      where: {
        dateOfService: {
          gte: new Date(startDate),
          lte: new Date(endDate),
        },
      },
      include: {
        customer: true,
        machine: true,
        dispatchMachines: {
          include: { machine: true },
        },
        driver: true,
        operator: true,
        worker: true,
        multiOperators: {
          include: { employee: true },
        },
        multiWorkers: {
          include: { employee: true },
        },
        dispatchTools: {
          include: { tool: true },
        },
      },
      orderBy: { dateOfService: "asc" },
    });
    return { success: true, data: dispatches };
  } catch (err: any) {
    console.error("Error fetching dispatches by range:", err);
    return { success: false, error: "Failed to fetch dispatches", data: [] };
  }
}

/**
 * Update an existing Daily Dispatch using OCC & Auditing
 */
export async function updateDailyDispatch(formData: unknown) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "OWNER" && session.user.role !== "STAFF")) {
    return { success: false, error: "Unauthorized: Only OWNER or STAFF can update dispatch." };
  }

  const parsed = updateDailyDispatchSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues.map(i => i.message).join(", ") };
  }

  const data = parsed.data;

  try {
    const dispatchId = data.id;

    const result = await prisma.$transaction(async (tx) => {
      // 1. Fetch current to enforce business rules
      const current = await tx.dailyDispatch.findUnique({
        where: { id: dispatchId },
        include: { invoice: true, dispatchMachines: true, dispatchTools: true, multiOperators: true, multiWorkers: true }
      });

      if (!current) throw new Error("Dispatch not found.");
      if (current.version !== data.version) throw new Error("OCC Conflict: Record was modified by another user.");
      if (["COMPLETED", "CANCELLED"].includes(current.status)) {
        throw new Error("Cannot edit a Completed or Cancelled dispatch.");
      }

      const allMachineIds = Array.from(new Set([
        ...(data.machineId && data.machineId !== "INDEPENDENT" ? [data.machineId] : []),
        ...(data.machineIds || []).filter(id => id !== "INDEPENDENT"),
      ]));

      // Clear existing relations
      await tx.dispatchMachine.deleteMany({ where: { dispatchId } });
      await tx.dispatchOperator.deleteMany({ where: { dispatchId } });
      await tx.dispatchWorker.deleteMany({ where: { dispatchId } });
      await tx.dispatchTool.deleteMany({ where: { dispatchId } });

      // Free up machines/tools
      for (const dm of current.dispatchMachines) {
        await tx.machine.update({ where: { id: dm.machineId }, data: { status: "AVAILABLE" } });
      }
      for (const dt of current.dispatchTools) {
        await tx.tool.update({ where: { id: dt.toolId }, data: { status: "AVAILABLE" } });
      }

      // 2. Perform the update & bump version
      const updated = await tx.dailyDispatch.update({
        where: { id: dispatchId, version: data.version },
        data: {
          customerId: data.customerId,
          machineId: allMachineIds[0] || null,
          driverId: data.driverId || null,
          operatorId: data.operatorId || null,
          workerId: data.workerId || null,
          mainHelperId: data.mainHelperId || null,
          mainHelperName: data.mainHelperName || null,
          helperCount: data.helperCount || 0,
          trollyWorkerCount: data.trollyWorkerCount || 0,
          location: data.location,
          mapLink: data.mapLink || null,
          dateOfService: new Date(data.dateOfService),
          workType: data.workType as WorkType,
          liftFloors: data.liftFloors || 1,
          mixerCategory: data.mixerCategory || "STANDARD",
          vibratorType: (data.vibratorType as any) || null,
          hasTrollyBench: data.hasTrollyBench || false,
          publicTransportUsed: data.publicTransportUsed || false,
          machineNumberTag: data.machineNumberTag || null,
          siteBundleId: data.siteBundleId || null,
          notes: data.notes || null,
          version: { increment: 1 },
        }
      });

      // Attach new relations
      for (const mId of allMachineIds) {
        await tx.dispatchMachine.create({ data: { dispatchId, machineId: mId } });
        await tx.machine.update({ where: { id: mId }, data: { status: "RENTED" } });
      }

      const allOperatorIds = Array.from(new Set([
        ...(data.operatorId ? [data.operatorId] : []),
        ...(data.multiOperatorIds || [])
      ])).filter(Boolean);

      for (const opId of allOperatorIds) {
        await tx.dispatchOperator.create({ data: { dispatchId, internalEmployeeId: opId } });
      }

      const allWorkerIds = Array.from(new Set([
        ...(data.workerId ? [data.workerId] : []),
        ...(data.multiWorkerIds || [])
      ])).filter(Boolean);

      for (const wId of allWorkerIds) {
        await tx.dispatchWorker.create({ data: { dispatchId, employeeId: wId } });
      }

      const itemsToLink = data.toolItems && data.toolItems.length > 0
        ? data.toolItems
        : data.toolIds.map(tId => ({ toolId: tId, quantity: 1, variant: undefined }));

      for (const item of itemsToLink) {
        await tx.dispatchTool.create({
          data: { dispatchId, toolId: item.toolId, quantity: item.quantity, variant: item.variant || null },
        });
        await tx.tool.update({ where: { id: item.toolId }, data: { status: "IN_USE" } });
      }

      // 3. Write strict AuditLog
      // Look up employee ID of current session user for actorId
      const emp = await tx.employee.findUnique({ where: { userId: session.user.id } });
      if (emp) {
        await tx.auditLog.create({
          data: {
            entity: "DAILY_DISPATCH",
            entityId: dispatchId,
            action: "UPDATE",
            actorId: emp.id,
            delta: data as any
          }
        });
      }

      return updated;
    });

    revalidatePath("/admin/dispatch");
    return { success: true, dispatchId: result.id };
  } catch (err: any) {
    console.error("Error updating dispatch:", err);
    return { success: false, error: err.message || "Failed to update dispatch" };
  }
}


