"use server";

import bcrypt from "bcryptjs";
import { Role } from "@prisma/client";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/serverAuth";
import { docketSchema, fluidLogSchema, breakdownSchema } from "@/lib/validations/operator";
import { uploadMedia } from "@/lib/supabase";
import { revalidatePath } from "next/cache";
import { logAudit } from "@/lib/auditLogger";

export async function submitDocket(formData: FormData | object) {
  try {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { employeeId } = await requireAuth();

    const rawData = formData instanceof FormData ? Object.fromEntries(formData) : formData;
    const parsed = docketSchema.safeParse(rawData);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || "Validation failed" };
    }
    const data = parsed.data;

    let signatureUrl = data.signatureUrl;
    if (data.signatureDataUrl) {
      const path = `signatures/docket_${data.dispatchId}_${Date.now()}.png`;
      signatureUrl = await uploadMedia("operator-media", path, data.signatureDataUrl);
    }

    await prisma.dailyDispatch.update({
      where: { id: data.dispatchId },
      data: {
        notes: [
          `[DOCKET] Start Meter: ${data.startMeter ?? '-'} | End Meter: ${data.endMeter ?? '-'}`,
          `Water Added: ${data.waterAdded ?? '-'} | Washout: ${data.washoutMinutes ?? 0}min | Standby: ${data.standbyMinutes ?? 0}min`,
          `Client: ${data.clientName ?? '-'}${signatureUrl ? ` | Sig: ${signatureUrl}` : ''}`,
        ].join(' | '),
      },
    });

    await logAudit({
      actorId: employeeId!,
      actorRole: "OPERATOR",
      actionType: "SUBMIT_DOCKET",
      modelName: "DailyDispatch",
      newPayload: { dispatchId: data.dispatchId, clientName: data.clientName },
    });

    if (!process.env.CLI_TEST_ROLE) {
      revalidatePath("/operator/home");
    }
    return { success: true };
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error: any) {
    console.error("Submit Docket Error:", error);
    return { success: false, error: error.message || "Failed to submit docket" };
  }
}

export async function logFluid(formData: object) {
  try {
    const { employeeId } = await requireAuth();
    const parsed = fluidLogSchema.safeParse(formData);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || "Validation failed" };
    }
    const data = parsed.data;

    await prisma.expense.create({
      data: {
        machineId: data.machineId,
        loggerId: employeeId!,
        category: "DIESEL",
        amount: data.amount,
        description: `Fluid: ${data.fluidType}` + (data.notes ? ` - ${data.notes}` : ""),
        date: new Date(),
      }
    });

    await logAudit({
      actorId: employeeId!,
      actorRole: "OPERATOR",
      actionType: "LOG_FLUID",
      modelName: "Expense",
      newPayload: { machineId: data.machineId, amount: data.amount, fluidType: data.fluidType },
    });

    if (!process.env.CLI_TEST_ROLE) {
      revalidatePath("/operator/equipment");
    }
    return { success: true };
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function reportBreakdown(formData: object) {
  try {
    const session = await requireAuth();
    const parsed = breakdownSchema.safeParse(formData);
    if (!parsed.success) {
      return { success: false, error: parsed.error.issues[0]?.message || "Validation failed" };
    }
    const data = parsed.data;

    let photoUrl = data.photoUrl;
    if (data.photoDataUrl) {
      const path = `breakdowns/machine_${data.machineId}_${Date.now()}.png`;
      photoUrl = await uploadMedia("operator-media", path, data.photoDataUrl);
    }

    const isSubcontractor = false;
    const priority = (data.isCritical || isSubcontractor) ? "HIGH" : "NORMAL";

    await prisma.maintenanceTicket.create({
      data: {
        machineId: data.machineId,
        issueDescription: data.description + (photoUrl ? `\nPhoto: ${photoUrl}` : "") + `\nPriority: ${priority}`,
        status: "OPEN",
      }
    });

    await logAudit({
      actorId: session.employeeId,
      actorRole: "OPERATOR",
      actionType: "REPORT_MACHINE_BREAKDOWN",
      modelName: "MaintenanceTicket",
      newPayload: { machineId: data.machineId, description: data.description, priority },
    });

    revalidatePath("/operator/equipment");
    return { success: true };
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ─── Pre-Start Checklist Server Action ─────────────────────────────────────
export async function submitPreStartChecklist(params: {
  machineId: string;
  hasFail: boolean;
  damageDescription?: string;
  photos?: Array<{ blob: Blob; fieldName: string }>;
}) {
  try {
    const { employeeId } = await requireAuth();
    const { machineId, hasFail, damageDescription, photos = [] } = params;

    if (!hasFail) return { success: true };

    const photoUrls: string[] = [];
    for (const { blob, fieldName } of photos) {
      try {
        const path = `prestart_damage/${machineId}_${fieldName}_${Date.now()}.jpg`;
        const arrayBuffer = await blob.arrayBuffer();
        const base64 = Buffer.from(arrayBuffer).toString("base64");
        const dataUrl = `data:image/jpeg;base64,${base64}`;
        const url = await uploadMedia("operator-media", path, dataUrl);
        if (url) photoUrls.push(url);
      } catch (uploadErr) {
        console.warn("Photo upload failed, continuing:", uploadErr);
      }
    }

    const photoSummary = photoUrls.length > 0 ? `\nPhotos: ${photoUrls.join(", ")}` : "";

    await prisma.$transaction([
      prisma.maintenanceTicket.create({
        data: {
          machineId,
          issueDescription: `[PRE-START FAIL] ${damageDescription ?? "Operator reported failure"}${photoSummary}`,
          status: "OPEN",
        },
      }),
      prisma.machine.update({
        where: { id: machineId },
        data: { status: "REPAIR" },
      }),
    ]);

    await logAudit({
      actorId: employeeId!,
      actorRole: "OPERATOR",
      actionType: "SUBMIT_PRESTART_CHECKLIST",
      modelName: "MaintenanceTicket",
      newPayload: { machineId, hasFail, damageDescription: damageDescription ?? null },
    });

    revalidatePath("/operator/home");
    revalidatePath("/admin/fleet");
    return { success: true };
  } catch (error: any) {
    console.error("PreStart Checklist Error:", error);
    return { success: false, error: error.message };
  }
}

// ─── Staff: Create Operator with Phone+PIN ───────────────────────────────────
export async function createOperator(formData: FormData | object) {
  try {
    await requireAuth({ allowedRoles: [Role.OWNER, Role.ADMIN, Role.STAFF] });

    const raw = formData instanceof FormData ? Object.fromEntries(formData as FormData) : formData;
    const { name, phone, pin, operatorType, isCrewLeader, defaultCrewRole, capableRoles, baseDailyWage, contractorCoName, roleRates } = raw as Record<string, any>;

    if (!name || !phone || !pin) {
      return { success: false, error: "Name, phone and PIN are required." };
    }

    let normalizedPhone = phone.replace(/\D/g, "");
    if (normalizedPhone.startsWith("91") && normalizedPhone.length === 12) {
      normalizedPhone = normalizedPhone.slice(2);
    }
    if (normalizedPhone.length !== 10) {
      return { success: false, error: "Phone number must be exactly 10 digits after normalization." };
    }

    if (!/^\d{4}$/.test(pin)) {
      return { success: false, error: "PIN must be exactly 4 digits." };
    }
    const hashedPin = await bcrypt.hash(pin, 10);

    // Compute capable roles array
    let parsedCapableRoles: any[] = [];
    if (Array.isArray(capableRoles)) {
      parsedCapableRoles = capableRoles;
    } else if (typeof capableRoles === "string") {
      try {
        const arr = JSON.parse(capableRoles);
        if (Array.isArray(arr)) parsedCapableRoles = arr;
      } catch {
        parsedCapableRoles = [capableRoles];
      }
    }
    if (defaultCrewRole && !parsedCapableRoles.includes(defaultCrewRole)) {
      parsedCapableRoles.push(defaultCrewRole);
    }

    // Parse roleRates
    let parsedRoleRates: { crewRole: any; wagePerDay: number }[] = [];
    if (Array.isArray(roleRates)) {
      parsedRoleRates = roleRates
        .filter((rr: any) => rr && rr.crewRole && Number(rr.wagePerDay) > 0)
        .map((rr: any) => ({ crewRole: rr.crewRole, wagePerDay: Number(rr.wagePerDay) }));
    } else if (typeof roleRates === "string") {
      try {
        const parsed = JSON.parse(roleRates);
        if (Array.isArray(parsed)) {
          parsedRoleRates = parsed
            .filter((rr: any) => rr && rr.crewRole && Number(rr.wagePerDay) > 0)
            .map((rr: any) => ({ crewRole: rr.crewRole, wagePerDay: Number(rr.wagePerDay) }));
        } else if (typeof parsed === "object" && parsed !== null) {
          parsedRoleRates = Object.entries(parsed)
            .filter(([k, v]) => k && Number(v) > 0)
            .map(([crewRole, wagePerDay]) => ({ crewRole, wagePerDay: Number(wagePerDay) }));
        }
      } catch {
        // ignore
      }
    } else if (typeof roleRates === "object" && roleRates !== null) {
      parsedRoleRates = Object.entries(roleRates)
        .filter(([k, v]) => k && Number(v) > 0)
        .map(([crewRole, wagePerDay]) => ({ crewRole, wagePerDay: Number(wagePerDay) }));
    }

    const defaultRoleWage = defaultCrewRole
      ? parsedRoleRates.find((rr) => rr.crewRole === defaultCrewRole)?.wagePerDay
      : parsedRoleRates[0]?.wagePerDay;

    const finalBaseDailyWage = baseDailyWage
      ? Number(baseDailyWage)
      : defaultRoleWage
      ? defaultRoleWage
      : null;

    const result = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          email: `${normalizedPhone}@ironrent.local`,
          hashedPassword: hashedPin,
          role: Role.OPERATOR,
          employee: {
            create: {
              name: name.trim(),
              role: Role.OPERATOR,
              phone: normalizedPhone,
              operatorType: operatorType as "INTERNAL" | "SUBCONTRACTOR",
              isCrewLeader: Boolean(isCrewLeader),
              defaultCrewRole: defaultCrewRole ? defaultCrewRole : null,
              capableRoles: parsedCapableRoles,
              baseDailyWage: finalBaseDailyWage,
              roleRates: parsedRoleRates.length > 0 ? {
                create: parsedRoleRates.map((rr) => ({
                  crewRole: rr.crewRole,
                  wagePerDay: rr.wagePerDay,
                }))
              } : undefined,
            },
          },
        },
      });
      return user;
    });

    const newEmpId = (await prisma.employee.findFirst({ where: { userId: result.id }, select: { id: true } }))?.id ?? "unknown";
    await logAudit({
      actorId: newEmpId,
      actorRole: "ADMIN",
      actionType: "CREATE_OPERATOR",
      modelName: "Employee",
      newPayload: { name: name.trim(), phone: normalizedPhone, operatorType },
    });

    revalidatePath("/staff/operators");
    revalidatePath("/admin/employees");

    return {
      success: true,
      credentials: {
        name: name.trim(),
        phone: normalizedPhone,
        rawPin: pin,
      },
    };
  } catch (error: any) {
    if (error.code === "P2002") {
      return { success: false, error: "This phone number is already registered." };
    }
    console.error("CreateOperator Error:", error);
    return { success: false, error: error.message };
  }
}

export async function requestSalaryAdvance(amount: number) {
  try {
    const { employeeId } = await requireAuth({ allowedRoles: [Role.OPERATOR, Role.DRIVER, Role.WORKER] });

    await prisma.salaryAdvance.create({
      data: {
        employeeId,
        amount,
        date: new Date(),
        status: "PENDING",
        notes: "Requested via Operator Dashboard"
      }
    });

    await logAudit({
      actorId: employeeId!,
      actorRole: "OPERATOR",
      actionType: "REQUEST_SALARY_ADVANCE",
      modelName: "SalaryAdvance",
      newPayload: { employeeId, amount },
    });

    revalidatePath("/operator/home");
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
