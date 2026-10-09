"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { DispatchStatus, WorkType, MachineType, CrewRole } from "@prisma/client";

// ─────────────────────────────────────────────────────────────────────────────
// ZOD SCHEMA
// ─────────────────────────────────────────────────────────────────────────────

const crewAssignmentSchema = z.object({
  employeeId: z.string().min(1),
  role: z.nativeEnum(CrewRole),
  lockedWageRate: z.number().default(0),
});

const externalHelperSchema = z.object({
  name: z.string().min(1, "External helper name required"),
  headCount: z.number().min(1).default(1),
  lumpSumWage: z.number().min(0).default(0),
  notes: z.string().optional(),
});

const orderSchema = z.object({
  // ── Job basics ──
  customerId: z.string().min(1, "Customer is required"),
  location: z.string().min(2, "Site location is required"),
  dateOfService: z.string().min(1, "Service date is required"),
  notes: z.string().optional(),
  mapLink: z.string().optional(),

  // ── Machine ──
  primaryMachineId: z.string().nullable().optional(),          // null = Labor-Only order
  secondaryMachineIds: z.array(z.string()).default([]),

  // ── Machine-type-specific fields ──
  liftFloors: z.number().min(1).default(1),
  mixerCategory: z.enum(["STANDARD", "HYDRAULIC"]).default("STANDARD"),
  hasTrollyBench: z.boolean().default(false),
  vibratorType: z.enum(["PETROL", "ELECTRIC"]).nullable().optional(),

  // ── Driver ──
  driverId: z.string().nullable().optional(),
  publicTransportUsed: z.boolean().default(false),

  // ── Crew ── (internal employees with locked skill roles)
  crewAssignments: z.array(crewAssignmentSchema).default([]),

  // ── External sub-leader / helpers ──
  externalSubLeaderName: z.string().optional(),       // Outside sub-operator called by crew leader
  externalHelpers: z.array(externalHelperSchema).default([]),

  // ── Tools ──
  toolItems: z.array(z.object({
    toolId: z.string(),
    quantity: z.number().min(1),
    variant: z.string().optional(),
  })).default([]),

  // ── Wire rental surcharge (auto-set for ELECTRIC vibrator) ──
  wireRentalSurcharge: z.number().min(0).default(0),
});

const newCustomerSchema = z.object({
  name: z.string().min(2, "Customer name required"),
  phone: z.string().min(6, "Phone number required"),
  address: z.string().optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// SKILL-TAG ENFORCEMENT MAP
// Staff cannot assign an employee to a skill-required role unless they hold
// the matching capableRoles tag on their Employee record.
// ─────────────────────────────────────────────────────────────────────────────
const SKILL_REQUIRED_ROLES: CrewRole[] = [
  CrewRole.LIFT_OPERATOR,
  CrewRole.HYDRAULIC_OPERATOR,
  CrewRole.TROLLY_1_WHEEL,
];

// ─────────────────────────────────────────────────────────────────────────────
// ACTION: Create Order (atomic, prevents double-booking)
// ─────────────────────────────────────────────────────────────────────────────
export async function createOrderWithAssets(formData: unknown) {
  const session = await auth();
  if (
    !session?.user ||
    (session.user.role !== "OWNER" &&
      session.user.role !== "STAFF" &&
      session.user.role !== "ADMIN")
  ) {
    return { success: false, error: "Unauthorized: Only OWNER or STAFF can create orders." };
  }

  const parsed = orderSchema.safeParse(formData);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.issues.map((i) => i.message).join(", "),
    };
  }

  const data = parsed.data;

  try {
    // ── 1. Resolve machine type for rate lookup ──────────────────────────────
    const allMachineIds = Array.from(
      new Set([
        ...(data.primaryMachineId ? [data.primaryMachineId] : []),
        ...data.secondaryMachineIds,
      ])
    );

    let machineType: MachineType = MachineType.INDEPENDENT;
    if (allMachineIds.length > 0) {
      const firstMachine = await prisma.machine.findUnique({
        where: { id: allMachineIds[0] },
        select: { type: true, status: true, machineId: true },
      });
      if (!firstMachine) {
        return { success: false, error: "Selected primary machine not found." };
      }
      if (firstMachine.status !== "AVAILABLE") {
        return {
          success: false,
          error: `Machine ${firstMachine.machineId} is currently ${firstMachine.status}. Choose another.`,
        };
      }
      machineType = firstMachine.type;
    }

    // ── 2. Validate skill tags for skill-required crew roles ─────────────────
    const skillRequiredAssignments = data.crewAssignments.filter((a) =>
      SKILL_REQUIRED_ROLES.includes(a.role)
    );

    if (skillRequiredAssignments.length > 0) {
      const employeeIds = skillRequiredAssignments.map((a) => a.employeeId);
      const employees = await prisma.employee.findMany({
        where: { id: { in: employeeIds } },
        select: { id: true, name: true, capableRoles: true },
      });

      for (const assignment of skillRequiredAssignments) {
        const emp = employees.find((e) => e.id === assignment.employeeId);
        if (!emp) continue;
        if (!emp.capableRoles.includes(assignment.role)) {
          const roleLabel = assignment.role.replace(/_/g, " ");
          return {
            success: false,
            error: `Skill Violation: ${emp.name} does not hold the "${roleLabel}" tag required for this machine. Please assign a certified operator.`,
          };
        }
      }
    }

    // ── 3. Check tools are available ─────────────────────────────────────────
    if (data.toolItems.length > 0) {
      const toolIds = data.toolItems.map((t) => t.toolId);
      const tools = await prisma.tool.findMany({
        where: { id: { in: toolIds } },
        select: { id: true, name: true, status: true },
      });
      for (const tool of tools) {
        if (tool.status !== "AVAILABLE") {
          return {
            success: false,
            error: `Tool "${tool.name}" is currently ${tool.status} and cannot be assigned.`,
          };
        }
      }
    }

    // ── 4. Lookup rate from WorkTypeRate table ───────────────────────────────
    const rateRow = await prisma.workTypeRate.findUnique({
      where: {
        machineType_workType: {
          machineType,
          workType: WorkType.NORMAL,
        },
      },
    });

    const operatorDailyRate = rateRow?.payoutRate ?? (machineType === "INDEPENDENT" ? 800 : 750);
    const customerCharge = rateRow?.customerCharge ?? (machineType === "INDEPENDENT" ? 1500 : 2300);

    // ── 5. ATOMIC TRANSACTION ────────────────────────────────────────────────
    // Everything below is a single DB transaction. If any step fails, ALL steps
    // roll back automatically — no double-bookings, no orphaned records.
    const dispatch = await prisma.$transaction(async (tx) => {

      // 5a. Create the core DailyDispatch record
      const newDispatch = await tx.dailyDispatch.create({
        data: {
          customerId: data.customerId,
          machineId: allMachineIds[0] || null,
          driverId: data.driverId || null,
          location: data.location,
          mapLink: data.mapLink || null,
          dateOfService: new Date(data.dateOfService),
          workType: WorkType.NORMAL,
          status: DispatchStatus.PENDING,
          operatorDailyRate,
          customerCharge,
          notes: data.notes || null,
          liftFloors: data.liftFloors,
          mixerCategory: data.mixerCategory,
          vibratorType: (data.vibratorType as any) || null,
          hasTrollyBench: data.hasTrollyBench,
          publicTransportUsed: data.publicTransportUsed,
          externalSubLeaderName: data.externalSubLeaderName || null,
          // Wire rental stored in toolRent field
          toolRent: data.wireRentalSurcharge > 0 ? data.wireRentalSurcharge : 0,
        },
      });

      // 5b. Attach all machines → DispatchMachine + mark RENTED
      for (const mId of allMachineIds) {
        await tx.dispatchMachine.create({
          data: { dispatchId: newDispatch.id, machineId: mId },
        });
        await tx.machine.update({
          where: { id: mId },
          data: { status: "RENTED" },
        });
      }

      // 5c. Insert internal crew assignments with locked skill roles & wage rates
      for (const assignment of data.crewAssignments) {
        if (!assignment.employeeId) continue;
        await tx.dispatchAssignment.create({
          data: {
            dispatchId: newDispatch.id,
            employeeId: assignment.employeeId,
            assignedRole: assignment.role,
            lockedWageRate: assignment.lockedWageRate || Number(operatorDailyRate),
          },
        });
      }

      // 5d. Insert external sub-leader / outside helpers into DispatchLabor
      for (const helper of data.externalHelpers) {
        await tx.dispatchLabor.create({
          data: {
            dispatchId: newDispatch.id,
            externalWorkerName: helper.name,
            headCount: helper.headCount,
            lumpSumWage: helper.lumpSumWage,
            externalHeadCount: helper.headCount,
            isExternalLiability: true,
            notes: helper.notes || null,
          },
        });
      }

      // 5e. Attach tools → DispatchTool + mark IN_USE
      for (const item of data.toolItems) {
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

    // ── 6. Revalidate affected pages ─────────────────────────────────────────
    revalidatePath("/staff/orders");
    revalidatePath("/staff/dispatch");
    revalidatePath("/staff/dashboard");
    revalidatePath("/admin/live-map");
    revalidatePath("/driver/home");

    return { success: true, dispatchId: dispatch.id };
  } catch (err: any) {
    console.error("[createOrderWithAssets] Error:", err);
    return {
      success: false,
      error: err.message || "Failed to create order. Please try again.",
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTION: Create New Customer (inline from order form)
// ─────────────────────────────────────────────────────────────────────────────
export async function createNewCustomer(formData: unknown) {
  const session = await auth();
  if (
    !session?.user ||
    (session.user.role !== "OWNER" &&
      session.user.role !== "STAFF" &&
      session.user.role !== "ADMIN")
  ) {
    return { success: false, error: "Unauthorized." };
  }

  const parsed = newCustomerSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues.map((i) => i.message).join(", ") };
  }

  try {
    const customer = await prisma.customer.create({
      data: {
        name: parsed.data.name.trim(),
        phone: parsed.data.phone.trim(),
        address: parsed.data.address?.trim() || "",
      },
    });

    revalidatePath("/staff/orders");
    return { success: true, customer };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to create customer." };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTION: Fetch all data needed for the order form (server-side)
// ─────────────────────────────────────────────────────────────────────────────
export async function getOrderFormData() {
  try {
    const [customers, machines, employees, tools, workTypeRates] = await Promise.all([
      prisma.customer.findMany({
        where: { isPendingDelete: false },
        orderBy: { name: "asc" },
        select: { id: true, name: true, phone: true, address: true },
      }),
      prisma.machine.findMany({
        where: { status: "AVAILABLE", isPendingDelete: false },
        orderBy: { machineId: "asc" },
        select: { id: true, machineId: true, type: true, status: true, operatorDailyPayout: true },
      }),
      prisma.employee.findMany({
        where: {
          isPendingDelete: false,
          role: { in: ["DRIVER", "OPERATOR", "WORKER"] },
        },
        orderBy: { name: "asc" },
        select: {
          id: true,
          name: true,
          role: true,
          capableRoles: true,
          defaultCrewRole: true,
          operatorType: true,
          baseDailyWage: true,
          phone: true,
        },
      }),
      prisma.tool.findMany({
        where: { status: "AVAILABLE", isPendingDelete: false },
        orderBy: { name: "asc" },
        select: { id: true, toolId: true, name: true, toolType: true, totalInventory: true },
      }),
      prisma.workTypeRate.findMany({
        select: { machineType: true, workType: true, payoutRate: true, customerCharge: true },
      }),
    ]);

    return {
      success: true,
      customers: customers.map((c) => ({ ...c })),
      machines: machines.map((m) => ({
        ...m,
        operatorDailyPayout: Number(m.operatorDailyPayout),
      })),
      employees: employees.map((e) => ({
        ...e,
        baseDailyWage: e.baseDailyWage ? Number(e.baseDailyWage) : null,
      })),
      tools: tools.map((t) => ({ ...t })),
      workTypeRates: workTypeRates.map((r) => ({
        ...r,
        payoutRate: Number(r.payoutRate),
        customerCharge: r.customerCharge ? Number(r.customerCharge) : null,
      })),
    };
  } catch (err: any) {
    return { success: false, error: err.message || "Failed to load form data." };
  }
}
