"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/serverAuth";
import { Role } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const advanceAmountSchema = z.number().positive("Amount must be positive").max(100000, "Amount exceeds maximum allowed limit");

export async function createSalaryAdvance(data: {
  employeeId: string;
  amount: number;
  reason: string;
}) {
  const session = await requireAuth({ allowedRoles: [Role.OWNER, Role.ADMIN, Role.STAFF] });

  // Validate amount payload using Zod before any operations
  const validatedAmount = advanceAmountSchema.parse(data.amount);

  // Enforce role-based limits
  if (session.role === Role.STAFF && validatedAmount > 5000) {
    throw new Error("Staff members cannot issue advances greater than ₹5,000. Please request Admin approval.");
  }

  const advance = await prisma.salaryAdvance.create({
    data: {
      employeeId: data.employeeId,
      amount: validatedAmount,
      notes: data.reason,
      status: "PENDING",
      date: new Date(),
    },
  });

  await prisma.auditLog.create({
    data: {
      actionType: "CREATE",
      entity: "SALARY_ADVANCE",
      actorRole: "ADMIN",
      newPayload: { id: advance.id, delta: data as any },
      actorId: session.employeeId,
    },
  });

  revalidatePath("/admin/advances");
  return { success: true, advanceId: advance.id };
}
