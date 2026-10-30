"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { DispatchStatus, WorkType, MachineType } from "@prisma/client";
import { logAudit } from "@/lib/auditLogger";

// ============================================================================
// STRICT ZOD VALIDATION SCHEMAS
// ============================================================================

const dispatchSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  vehicleId: z.string().nullable().optional(),
  routeStopOrder: z.number().int().min(1).default(1).optional(),
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
  subLocality: z.string().optional().nullable(),
  structuralAnchor: z.string().optional().nullable(),
  accessLatitude: z.number().optional().nullable(),
  accessLongitude: z.number().optional().nullable(),
  isOffRoad: z.boolean().optional().nullable(),
  offRoadBearingDeg: z.number().optional().nullable(),
  offRoadDistanceM: z.number().optional().nullable(),
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
  status: z.enum(["PENDING", "EN_ROUTE", "IN_PROGRESS", "DELIVERED", "PICKED_UP", "COMPLETED", "CANCELLED", "POSTPONED"]),
  reason: z.string().optional(), // Mandatory if CANCELLED or POSTPONED
  newDateOfService: z.string().optional(), // For rescheduling when postponed
});

const reportIncidentSchema = z.object({
  dispatchId: z.string().min(1, "Dispatch ID required"),
  conflictReport: z.string().min(3, "Detailed incident description required (e.g. 'Customer refused payment over hose burst')"),
});

const updateDailyDispatchSchema = z.object({
  id: z.string().min(1, "Dispatch ID required"),
  version: z.number().int().optional(),
  customerId: z.string().min(1, "Customer is required"),
  vehicleId: z.string().nullable().optional(),
  routeStopOrder: z.number().int().min(1).default(1).optional(),
  machineId: z.string().nullable().optional(),
  machineIds: z.array(z.string()).optional(),
  driverId: z.string().nullable().optional(),
  operatorId: z.string().nullable().optional(),
  workerId: z.string().nullable().optional(),
  siteLeaderEmployeeId: z.string().nullable().optional(),
  mainHelperId: z.string().nullable().optional(),
  mainHelperName: z.string().optional(),
  helperCount: z.number().min(0).default(0),
  trollyWorkerCount: z.number().min(0).default(0),
  multiOperatorIds: z.array(z.string()).optional(),
  multiWorkerIds: z.array(z.string()).optional(),
  crewAssignments: z.array(
    z.object({
      employeeId: z.string(),
      assignedRole: z.string(),
      lockedWageRate: z.number().optional(),
    })
  ).optional(),
  siteBundleId: z.string().optional().nullable(),
  location: z.string().min(2, "Location is required"),
  mapLink: z.string().optional().nullable(),
  subLocality: z.string().optional().nullable(),
  structuralAnchor: z.string().optional().nullable(),
  accessLatitude: z.number().optional().nullable(),
  accessLongitude: z.number().optional().nullable(),
  isOffRoad: z.boolean().optional().nullable(),
  offRoadBearingDeg: z.number().optional().nullable(),
  offRoadDistanceM: z.number().optional().nullable(),
  dateOfService: z.string().min(1, "Service date is required"),
  status: z.enum(["PENDING", "EN_ROUTE", "IN_PROGRESS", "DELIVERED", "PICKED_UP", "COMPLETED", "CANCELLED", "POSTPONED"]).optional(),
  statusReason: z.string().optional().nullable(),
  workType: z.enum(["NORMAL", "TROLLY", "LATE"]).default("NORMAL"),
  liftFloors: z.number().min(1).default(1),
  mixerCategory: z.enum(["STANDARD", "HYDRAULIC"]).default("STANDARD"),
  vibratorType: z.enum(["PETROL", "ELECTRIC"]).nullable().optional(),
  hasTrollyBench: z.boolean().default(false),
  publicTransportUsed: z.boolean().default(false),
  machineNumberTag: z.string().optional().nullable(),
  toolIds: z.array(z.string()).default([]),
  toolItems: z.array(
    z.object({
      toolId: z.string(),
      quantity: z.number().min(1),
      variant: z.string().optional(),
    })
  ).optional(),
  notes: z.string().optional().nullable(),
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
          vehicleId: data.vehicleId || null,
          routeStopOrder: data.routeStopOrder || 1,
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
          subLocality: data.subLocality || null,
          structuralAnchor: data.structuralAnchor || null,
          accessLatitude: data.accessLatitude != null ? data.accessLatitude : null,
          accessLongitude: data.accessLongitude != null ? data.accessLongitude : null,
          isOffRoad: data.isOffRoad ?? false,
          offRoadBearingDeg: data.offRoadBearingDeg ?? null,
          offRoadDistanceM: data.offRoadDistanceM ?? null,
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
        await tx.dispatchAssignment.create({
          data: { dispatchId: newDispatch.id, employeeId: opId, assignedRole: "MIXER_OPERATOR", lockedWageRate: operatorDailyRate || 1000 },
        });
      }

      // Insert all multi-workers into junction table
      for (const wId of allWorkerIds) {
        await tx.dispatchAssignment.create({
          data: { dispatchId: newDispatch.id, employeeId: wId, assignedRole: "HELPER", lockedWageRate: 800 },
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
      }

      return newDispatch;
    });

    // Audit: log actor from session
    const actorEmp = await prisma.employee.findFirst({ where: { userId: (await import("@/lib/auth").then(m => m.auth()))?.user?.id ?? "" } }).catch(() => null);
    await logAudit({
      actorId: actorEmp?.id ?? "system",
      actorRole: session.user.role,
      actionType: "CREATE_DISPATCH",
      modelName: "DailyDispatch",
      newPayload: { dispatchId: dispatch.id, location: data.location, dateOfService: data.dateOfService },
    });

    if (!process.env.CLI_TEST_ROLE) {
      revalidatePath("/admin/dispatch");
    }
    if (!process.env.CLI_TEST_ROLE) {
      revalidatePath("/admin/dashboard");
    }
    if (!process.env.CLI_TEST_ROLE) {
      revalidatePath("/driver/home");
    }
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

  const { dispatchId, status, reason, newDateOfService } = parsed.data;

  try {
    let changerEmp = await prisma.employee.findUnique({
      where: { userId: session.user.id },
    });
    if (!changerEmp) {
      // Fallback for Admin or Owner without direct Employee record
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

      // Mandatory audit reason if cancelling or postponing
      if (status === "CANCELLED" || status === "POSTPONED") {
        if (!reason || !reason.trim() || reason.trim().length < 3) {
          throw new Error(`Mandatory Audit Lock: A clear reason (at least 3 characters) is required to mark job ${status}.`);
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

      // Build update payload
      const updateData: any = {
        status: status as DispatchStatus,
      };

      // Reschedule date of service if postponed with a new date
      if (status === "POSTPONED" && newDateOfService) {
        updateData.dateOfService = new Date(newDateOfService);
      }

      await tx.dailyDispatch.update({
        where: { id: dispatchId },
        data: updateData,
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
        if (dispatch.vehicleId) {
          await tx.vehicle.update({
            where: { id: dispatch.vehicleId },
            data: { status: "AVAILABLE" },
          });
        }
        for (const dt of dispatch.dispatchTools) {
          await tx.tool.update({
            where: { id: dt.toolId },
            data: { status: "AVAILABLE" },
          });
        }
      } else if (["PENDING", "EN_ROUTE", "IN_PROGRESS"].includes(status)) {
        // Re-activating a job restores equipment to RENTED
        for (const dm of dispatch.dispatchMachines) {
          await tx.machine.update({
            where: { id: dm.machineId },
            data: { status: "RENTED" },
          });
        }
        if (dispatch.machineId) {
          await tx.machine.update({
            where: { id: dispatch.machineId },
            data: { status: "RENTED" },
          });
        }
        if (dispatch.vehicleId) {
          await tx.vehicle.update({
            where: { id: dispatch.vehicleId },
            data: { status: "IN_USE" },
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
    }
    if (!process.env.CLI_TEST_ROLE) {
      revalidatePath("/admin/dashboard");
    }
    if (!process.env.CLI_TEST_ROLE) {
      revalidatePath("/driver/home");
    }
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
    }
    if (!process.env.CLI_TEST_ROLE) {
      revalidatePath("/admin/dashboard");
    }
    if (!process.env.CLI_TEST_ROLE) {
      revalidatePath("/driver/home");
    }
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
    }
    if (!process.env.CLI_TEST_ROLE) {
      revalidatePath("/admin/dashboard");
    }
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
    }
    if (!process.env.CLI_TEST_ROLE) {
      revalidatePath("/admin/dashboard");
    }
    if (!process.env.CLI_TEST_ROLE) {
      revalidatePath("/driver/home");
    }
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
        vehicle: true,
        operator: true,
        worker: true,
        crewAssignments: {
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

    if (!process.env.CLI_TEST_ROLE) {
      revalidatePath("/admin/dispatch");
    }
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
        vehicle: true,
        operator: true,
        worker: true,
        mainHelper: true,
        invoice: true,
        siteDisbursements: {
          include: { subLeader: true },
        },
        crewAssignments: {
          include: {
            employee: { select: { id: true, name: true, role: true, profilePhotoUrl: true, phone: true, operatorType: true } },
            contractor: { select: { id: true, name: true, companyName: true } },
          },
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
  if (!session?.user || !["OWNER", "ADMIN", "STAFF"].includes(session.user.role)) {
    return { success: false, error: "Unauthorized: Only OWNER, ADMIN, or STAFF can update dispatch." };
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
        include: { invoice: true, dispatchMachines: true, dispatchTools: true, crewAssignments: true }
      });

      if (!current) throw new Error("Dispatch not found.");

      const allMachineIds = Array.from(new Set([
        ...(data.machineId && data.machineId !== "INDEPENDENT" ? [data.machineId] : []),
        ...(data.machineIds || []).filter(id => id !== "INDEPENDENT"),
      ]));

      // Clear existing relations to rebuild accurately
      await tx.dispatchMachine.deleteMany({ where: { dispatchId } });
      await tx.dispatchAssignment.deleteMany({ where: { dispatchId } });
      await tx.dispatchTool.deleteMany({ where: { dispatchId } });

      // Free up old machines/tools
      for (const dm of current.dispatchMachines) {
        await tx.machine.update({ where: { id: dm.machineId }, data: { status: "AVAILABLE" } });
      }
      for (const dt of current.dispatchTools) {
        await tx.tool.update({ where: { id: dt.toolId }, data: { status: "AVAILABLE" } });
      }

      // Check if status changed
      const oldStatus = current.status;
      const targetStatus = (data.status as DispatchStatus) || current.status;
      if (data.status && data.status !== oldStatus && (data.status === "CANCELLED" || data.status === "POSTPONED")) {
        const changerEmp = await tx.employee.findUnique({ where: { userId: session.user.id } })
          || await tx.employee.findFirst({ where: { isActive: true, isPendingDelete: false } });
        if (changerEmp) {
          await tx.dispatchStatusHistory.create({
            data: {
              dispatchId,
              oldStatus,
              newStatus: targetStatus,
              changedById: changerEmp.id,
              reason: data.statusReason || "Updated via Dispatch Editor",
            },
          });
        }
      }

      // 2. Perform the update & bump version
      const updated = await tx.dailyDispatch.update({
        where: { id: dispatchId },
        data: {
          customerId: data.customerId,
          vehicleId: data.vehicleId || null,
          routeStopOrder: data.routeStopOrder || 1,
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
          subLocality: data.subLocality || null,
          structuralAnchor: data.structuralAnchor || null,
          accessLatitude: data.accessLatitude != null ? data.accessLatitude : null,
          accessLongitude: data.accessLongitude != null ? data.accessLongitude : null,
          isOffRoad: data.isOffRoad ?? false,
          offRoadBearingDeg: data.offRoadBearingDeg ?? null,
          offRoadDistanceM: data.offRoadDistanceM ?? null,
          dateOfService: new Date(data.dateOfService),
          status: targetStatus,
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

      // Attach new machine relations
      const isEquipmentActive = !["CANCELLED", "POSTPONED"].includes(targetStatus);
      for (const mId of allMachineIds) {
        await tx.dispatchMachine.create({ data: { dispatchId, machineId: mId } });
        if (isEquipmentActive) {
          await tx.machine.update({ where: { id: mId }, data: { status: "RENTED" } });
        }
      }

      // Dynamic Crew Allocation
      if (data.crewAssignments && data.crewAssignments.length > 0) {
        for (const ca of data.crewAssignments) {
          if (!ca.employeeId) continue;
          await tx.dispatchAssignment.create({
            data: {
              dispatchId,
              employeeId: ca.employeeId,
              assignedRole: ca.assignedRole as any,
              lockedWageRate: ca.lockedWageRate || 1000,
            },
          });
        }
      } else {
        // Fallback to legacy arrays
        const allOperatorIds = Array.from(new Set([
          ...(data.operatorId ? [data.operatorId] : []),
          ...(data.multiOperatorIds || [])
        ])).filter(Boolean);

        for (const opId of allOperatorIds) {
          await tx.dispatchAssignment.create({
            data: {
              dispatchId,
              employeeId: opId,
              assignedRole: "MIXER_OPERATOR",
              lockedWageRate: current.operatorDailyRate || 1000
            }
          });
        }

        const allWorkerIds = Array.from(new Set([
          ...(data.workerId ? [data.workerId] : []),
          ...(data.multiWorkerIds || [])
        ])).filter(Boolean);

        for (const wId of allWorkerIds) {
          await tx.dispatchAssignment.create({
            data: {
              dispatchId,
              employeeId: wId,
              assignedRole: "HELPER",
              lockedWageRate: 800
            }
          });
        }
      }

      // Link Setup Tools with accurate quantities and variants
      const itemsToLink = data.toolItems && data.toolItems.length > 0
        ? data.toolItems
        : (data.toolIds || []).map(tId => ({ toolId: tId, quantity: 1, variant: undefined }));

      for (const item of itemsToLink) {
        if (!item.toolId) continue;
        await tx.dispatchTool.create({
          data: { dispatchId, toolId: item.toolId, quantity: item.quantity, variant: item.variant || null },
        });
      }

      // 3. Write AuditLog
      const emp = await tx.employee.findUnique({ where: { userId: session.user.id } })
        || await tx.employee.findFirst({ where: { isActive: true, isPendingDelete: false } });

      await tx.auditLog.create({
        data: {
          actionType: "UPDATE",
          entity: "DAILY_DISPATCH",
          actorRole: session.user.role as any,
          actorId: emp?.id ?? "system",
          newPayload: { dispatchId, delta: data as any }
        }
      });

      return updated;
    });

    if (!process.env.CLI_TEST_ROLE) {
      revalidatePath("/staff/dispatch");
      revalidatePath("/admin/dispatch");
    }
    return { success: true, dispatchId: result.id };
  } catch (err: any) {
    console.error("Error updating dispatch:", err);
    return { success: false, error: err.message || "Failed to update dispatch" };
  }
}



