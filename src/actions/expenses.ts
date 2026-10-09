"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/serverAuth";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { ExpenseCategory } from "@prisma/client";

const createExpenseSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  category: z.nativeEnum(ExpenseCategory),
  description: z.string().optional(),
  date: z.string(), // YYYY-MM-DD
  notes: z.string().optional(),
  machineId: z.string().optional().nullable(),
  vehicleId: z.string().optional().nullable(),
  dispatchId: z.string().optional().nullable(),
  employeeId: z.string().optional().nullable(),
  contractorId: z.string().optional().nullable(),
  toolId: z.string().optional().nullable(),
});

export async function createAdminExpense(formData: FormData) {
  try {
    const { employeeId: loggerId } = await requireAuth({ allowedRoles: ["OWNER", "ADMIN", "STAFF"] });

    const rawData = {
      amount: Number(formData.get("amount")),
      category: formData.get("category")?.toString() as ExpenseCategory,
      description: formData.get("description")?.toString() || undefined,
      date: formData.get("date")?.toString(),
      notes: formData.get("notes")?.toString() || undefined,
      machineId: formData.get("machineId")?.toString() || undefined,
      vehicleId: formData.get("vehicleId")?.toString() || undefined,
      dispatchId: formData.get("dispatchId")?.toString() || undefined,
      employeeId: formData.get("employeeId")?.toString() || undefined,
      contractorId: formData.get("contractorId")?.toString() || undefined,
      toolId: formData.get("toolId")?.toString() || undefined,
    };

    const parsed = createExpenseSchema.parse(rawData);

    // Enforce descriptions for vague categories
    if ((parsed.category === "OTHER" || parsed.category === "OUTSIDE_HELPER_WAGE") && !parsed.description) {
      return { success: false, error: `Description is required for ${parsed.category.replace(/_/g, ' ')}.` };
    }
    
    // Ensure STAFF_ADVANCE has an employeeId
    if (parsed.category === "STAFF_ADVANCE" && !parsed.employeeId) {
      return { success: false, error: "You must select an employee for a Salary Advance." };
    }
    
    // Ensure CONTRACTOR_ADVANCE has a contractorId
    if (parsed.category === "CONTRACTOR_ADVANCE" && !parsed.contractorId) {
      return { success: false, error: "You must select a contractor for a Contractor Advance." };
    }

    const expense = await prisma.$transaction(async (tx) => {
      const res = await tx.expense.create({
        data: {
          loggerId,
          amount: parsed.amount,
          category: parsed.category,
          description: parsed.description,
          date: new Date(parsed.date),
          notes: parsed.notes,
          machineId: parsed.machineId || null,
          vehicleId: parsed.vehicleId || null,
          dispatchId: parsed.dispatchId || null,
          employeeId: parsed.employeeId || null,
          contractorId: parsed.contractorId || null,
          toolId: parsed.toolId || null,
        }
      });

      await tx.auditLog.create({
        data: {
          actionType: "CREATE",
          entity: "EXPENSE",
          actorRole: "ADMIN",
          newPayload: { id: res.id, delta: { amount: parsed.amount, category: parsed.category, employeeId: parsed.employeeId } as any },
          actorId: loggerId,
        }
      });

      return res;
    });

    revalidatePath("/admin/dashboard");
    revalidatePath("/staff/dashboard");
    return { success: true };
  } catch (error: any) {
    console.error("Create expense error:", error);
    return { success: false, error: error.message || "Failed to log expense" };
  }
}
