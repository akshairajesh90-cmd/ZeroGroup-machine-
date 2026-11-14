'use server';

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { DispatchStatus, WorkType, MachineType } from "@prisma/client";
import { logAudit } from "@/lib/auditLogger";
import { dispatchSchema, updateDailyDispatchSchema } from "./schemas";
import { parseGoogleMapsUrl } from "@/lib/geo";
import { resolveGoogleMapsLink } from "@/lib/geo-server";

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

    // Resolve coordinates from mapLink BEFORE entering Prisma transaction (Rule 11)
    let initialLat: number | null = null;
    let initialLng: number | null = null;
    if (data.mapLink && data.mapLink.trim()) {
      try {
        const directCoords = parseGoogleMapsUrl(data.mapLink);
        if (directCoords) {
          initialLat = directCoords.lat;
          initialLng = directCoords.lng;
        } else if (/goo\.gl|maps\.app\.goo\.gl/i.test(data.mapLink)) {
          const resolved = await resolveGoogleMapsLink(data.mapLink);
          if (resolved) {
            initialLat = resolved.lat;
            initialLng = resolved.lng;
          }
        }
      } catch (linkErr) {
        console.warn("[createDailyDispatch] Non-blocking map link resolution notice:", linkErr);
      }
    }

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
          latitude: initialLat,
          longitude: initialLng,
          locationSource: initialLat ? "STAFF_BOOKING" : null,
          locationUpdatedAt: initialLat ? new Date() : null,
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

      if (allMachineIds.length > 0) {
        await tx.dispatchMachine.createMany({
          data: allMachineIds.map((mId) => ({ dispatchId: newDispatch.id, machineId: mId })),
        });
        await tx.machine.updateMany({
          where: { id: { in: allMachineIds } },
          data: { status: "RENTED" },
        });
      }

      const initialAssignments = [
        ...allOperatorIds.map((opId) => ({
          dispatchId: newDispatch.id,
          employeeId: opId,
          assignedRole: "MIXER_OPERATOR" as const,
          lockedWageRate: operatorDailyRate || 1000,
        })),
        ...allWorkerIds.map((wId) => ({
          dispatchId: newDispatch.id,
          employeeId: wId,
          assignedRole: "HELPER" as const,
          lockedWageRate: 800,
        })),
      ];

      if (initialAssignments.length > 0) {
        await tx.dispatchAssignment.createMany({
          data: initialAssignments,
        });
      }

      const itemsToLink = data.toolItems && data.toolItems.length > 0
        ? data.toolItems
        : (data.toolIds || []).map(tId => ({ toolId: tId, quantity: 1, variant: undefined }));

      const validToolItems = itemsToLink
        .filter((item) => item.toolId)
        .map((item) => ({
          dispatchId: newDispatch.id,
          toolId: item.toolId,
          quantity: item.quantity,
          variant: item.variant || null,
        }));

      if (validToolItems.length > 0) {
        await tx.dispatchTool.createMany({
          data: validToolItems,
        });
      }

      return newDispatch;
    }, {
      maxWait: 15000,
      timeout: 30000,
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

    // Resolve coordinates from mapLink BEFORE entering Prisma transaction (Rule 11)
    let updatedLat: number | null = null;
    let updatedLng: number | null = null;
    if (data.mapLink && data.mapLink.trim()) {
      try {
        const directCoords = parseGoogleMapsUrl(data.mapLink);
        if (directCoords) {
          updatedLat = directCoords.lat;
          updatedLng = directCoords.lng;
        } else if (/goo\.gl|maps\.app\.goo\.gl/i.test(data.mapLink)) {
          const resolved = await resolveGoogleMapsLink(data.mapLink);
          if (resolved) {
            updatedLat = resolved.lat;
            updatedLng = resolved.lng;
          }
        }
      } catch (linkErr) {
        console.warn("[updateDailyDispatch] Non-blocking map link resolution notice:", linkErr);
      }
    }

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

      await Promise.all([
        tx.dispatchMachine.deleteMany({ where: { dispatchId } }),
        tx.dispatchAssignment.deleteMany({ where: { dispatchId } }),
        tx.dispatchTool.deleteMany({ where: { dispatchId } }),
      ]);

      const machineIdsToFree = current.dispatchMachines.map((dm) => dm.machineId);
      if (machineIdsToFree.length > 0) {
        await tx.machine.updateMany({
          where: { id: { in: machineIdsToFree } },
          data: { status: "AVAILABLE" },
        });
      }

      const toolIdsToFree = current.dispatchTools.map((dt) => dt.toolId);
      if (toolIdsToFree.length > 0) {
        await tx.tool.updateMany({
          where: { id: { in: toolIdsToFree } },
          data: { status: "AVAILABLE" },
        });
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
          ...(updatedLat !== null && updatedLng !== null && !current.isCentroidVerified
            ? {
                latitude: updatedLat,
                longitude: updatedLng,
                locationSource: "STAFF_BOOKING",
                locationUpdatedAt: new Date(),
              }
            : {}),
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
      if (allMachineIds.length > 0) {
        await tx.dispatchMachine.createMany({
          data: allMachineIds.map((mId) => ({ dispatchId, machineId: mId })),
        });
        if (isEquipmentActive) {
          await tx.machine.updateMany({
            where: { id: { in: allMachineIds } },
            data: { status: "RENTED" },
          });
        }
      }

      if (data.crewAssignments && data.crewAssignments.length > 0) {
        const validAssignments = data.crewAssignments
          .filter((ca) => ca.employeeId)
          .map((ca) => ({
            dispatchId,
            employeeId: ca.employeeId,
            assignedRole: ca.assignedRole as any,
            lockedWageRate: ca.lockedWageRate || 1000,
          }));
        if (validAssignments.length > 0) {
          await tx.dispatchAssignment.createMany({ data: validAssignments });
        }
      } else {
        const allOperatorIds = Array.from(new Set([
          ...(data.operatorId ? [data.operatorId] : []),
          ...(data.multiOperatorIds || [])
        ])).filter(Boolean);

        const allWorkerIds = Array.from(new Set([
          ...(data.workerId ? [data.workerId] : []),
          ...(data.multiWorkerIds || [])
        ])).filter(Boolean);

        const assignments = [
          ...allOperatorIds.map((opId) => ({
            dispatchId,
            employeeId: opId,
            assignedRole: "MIXER_OPERATOR" as const,
            lockedWageRate: current.operatorDailyRate || 1000
          })),
          ...allWorkerIds.map((wId) => ({
            dispatchId,
            employeeId: wId,
            assignedRole: "HELPER" as const,
            lockedWageRate: 800
          }))
        ];
        if (assignments.length > 0) {
          await tx.dispatchAssignment.createMany({ data: assignments });
        }
      }

      const itemsToLink = data.toolItems && data.toolItems.length > 0
        ? data.toolItems
        : (data.toolIds || []).map(tId => ({ toolId: tId, quantity: 1, variant: undefined }));

      const validToolLinks = itemsToLink
        .filter((item) => item.toolId)
        .map((item) => ({
          dispatchId,
          toolId: item.toolId,
          quantity: item.quantity,
          variant: item.variant || null,
        }));

      if (validToolLinks.length > 0) {
        await tx.dispatchTool.createMany({
          data: validToolLinks,
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
    }, {
      maxWait: 15000,
      timeout: 30000,
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
