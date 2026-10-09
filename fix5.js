const fs = require('fs');

let c = fs.readFileSync('src/actions/dispatch.ts', 'utf8');

const targetStr = `          data: {
            actionType: "UPDATE",
            entity: "DAILY_DISPATCH",
            actorRole: "ADMIN",
            newPayload: { id: dispatchId, delta: data as any },
            actorId: emp.id
          }
        });
      }

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
            actionType: "UPDATE",
            entity: "DAILY_DISPATCH",
            actorRole: "ADMIN",
            newPayload: { id: dispatchId, delta: data as any },
            actorId: emp.id`;

const replaceStr = `          data: {
            actionType: "UPDATE",
            entity: "DAILY_DISPATCH",
            actorRole: "ADMIN",
            newPayload: { id: dispatchId, delta: data as any },
            actorId: emp.id
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
}`;

c = c.replace(targetStr, replaceStr);

fs.writeFileSync('src/actions/dispatch.ts', c);

