'use server';

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { DispatchStatus, WorkType, MachineType } from "@prisma/client";
import { logAudit } from "@/lib/auditLogger";
import { dispatchSchema, updateDailyDispatchSchema } from "./schemas";

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

          liftFloors: data.liftFloors || 1,
          mixerCategory: data.mixerCategory || "STANDARD",
          vibratorType: (data.vibratorType as any) || null,
          hasTrollyBench: data.hasTrollyBench || false,
          publicTransportUsed: data.publicTransportUsed || false,
          machineNumberTag: data.machineNumberTag || null,
          siteBundleId: data.siteBundleId || null,
        },
      });

      for (const mId of allMachineIds) {
        await tx.dispatchMachine.create({
          data: { dispatchId: newDispatch.id, machineId: mId },
        });
        await tx.machine.update({
          where: { id: mId },
          data: { status: "RENTED" },
        });
      }

      for (const opId of allOperatorIds) {
        await tx.dispatchAssignment.create({
          data: { dispatchId: newDispatch.id, employeeId: opId, assignedRole: "MIXER_OPERATOR", lockedWageRate: operatorDailyRate || 1000 },
        });
      }

      for (const wId of allWorkerIds) {
        await tx.dispatchAssignment.create({
          data: { dispatchId: newDispatch.id, employeeId: wId, assignedRole: "HELPER", lockedWageRate: 800 },
        });
      }

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
      revalidatePath("/admin/dashboard");
      revalidatePath("/driver/home");
      revalidatePath("/staff/live/map");
      revalidatePath("/admin/live/map");
    }
    return { success: true, dispatchId: dispatch.id };
  } catch (err: any) {
    console.error("Error creating dispatch:", err);
    return { success: false, error: err.message || "Failed to create daily dispatch." };
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
      const current = await tx.dailyDispatch.findUnique({
        where: { id: dispatchId },
        include: { invoice: true, dispatchMachines: true, dispatchTools: true, crewAssignments: true }
      });

      if (!current) throw new Error("Dispatch not found.");

      const allMachineIds = Array.from(new Set([
        ...(data.machineId && data.machineId !== "INDEPENDENT" ? [data.machineId] : []),
        ...(data.machineIds || []).filter(id => id !== "INDEPENDENT"),
      ]));

      await tx.dispatchMachine.deleteMany({ where: { dispatchId } });
      await tx.dispatchAssignment.deleteMany({ where: { dispatchId } });
      await tx.dispatchTool.deleteMany({ where: { dispatchId } });

      for (const dm of current.dispatchMachines) {
        await tx.machine.update({ where: { id: dm.machineId }, data: { status: "AVAILABLE" } });
      }
      for (const dt of current.dispatchTools) {
        await tx.tool.update({ where: { id: dt.toolId }, data: { status: "AVAILABLE" } });
      }

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

      const isEquipmentActive = !["CANCELLED", "POSTPONED"].includes(targetStatus);
      for (const mId of allMachineIds) {
        await tx.dispatchMachine.create({ data: { dispatchId, machineId: mId } });
        if (isEquipmentActive) {
          await tx.machine.update({ where: { id: mId }, data: { status: "RENTED" } });
        }
      }

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

      const itemsToLink = data.toolItems && data.toolItems.length > 0
        ? data.toolItems
        : (data.toolIds || []).map(tId => ({ toolId: tId, quantity: 1, variant: undefined }));

      for (const item of itemsToLink) {
        if (!item.toolId) continue;
        await tx.dispatchTool.create({
          data: { dispatchId, toolId: item.toolId, quantity: item.quantity, variant: item.variant || null },
        });
      }

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
