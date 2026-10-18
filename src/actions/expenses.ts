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
  paymentMode: z.string().optional(),
  cashAmount: z.number().optional().nullable(),
  bankAmount: z.number().optional().nullable(),
  receiptUrl: z.string().optional().nullable(),
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
      paymentMode: formData.get("paymentMode")?.toString() || undefined,
      cashAmount: formData.get("cashAmount") ? Number(formData.get("cashAmount")) : undefined,
      bankAmount: formData.get("bankAmount") ? Number(formData.get("bankAmount")) : undefined,
      receiptUrl: formData.get("receiptUrl")?.toString() || undefined,
    };

    const parsed = createExpenseSchema.parse(rawData);

    // Enforce descriptions for vague categories
    if ((parsed.category === "OTHER" || parsed.category === "OUTSIDE_HELPER_WAGE") && !parsed.description) {
      return { success: false, error: `Description is required for ${parsed.category.replace(/_/g, " ")}.` };
    }
    
    // Ensure STAFF_ADVANCE has an employeeId
    if (parsed.category === "STAFF_ADVANCE" && !parsed.employeeId) {
      return { success: false, error: "You must select an employee for a Salary Advance." };
    }
    
    // Ensure CONTRACTOR_ADVANCE has a contractorId
    if (parsed.category === "CONTRACTOR_ADVANCE" && !parsed.contractorId) {
      return { success: false, error: "You must select a contractor for a Contractor Advance." };
    }

    // Compose formatted notes with payment mode & breakdown
    let composedNotes = parsed.notes || "";
    if (parsed.paymentMode) {
      let paymentTag = `[PAYMENT: ${parsed.paymentMode}]`;
      if (parsed.paymentMode === "COMBINED") {
        paymentTag += ` (Cash: ₹${parsed.cashAmount || 0} | Bank/UPI: ₹${parsed.bankAmount || 0})`;
      }
      composedNotes = `${paymentTag} ${composedNotes}`.trim();
    }
    if (parsed.receiptUrl) {
      composedNotes = `${composedNotes} [RECEIPT_ATTACHED: ${parsed.receiptUrl}]`.trim();
    }

    await prisma.$transaction(async (tx) => {
      let resId;
      
      // Route Staff Advances directly to the Payroll Ledger
      if (parsed.category === "STAFF_ADVANCE" && parsed.employeeId) {
        const advance = await tx.salaryAdvance.create({
          data: {
            employeeId: parsed.employeeId,
            amount: parsed.amount,
            date: new Date(parsed.date),
            notes: `[Via Expense Form] ${parsed.description || ""} | ${composedNotes}`.trim(),
            status: "PENDING"
          }
        });
        resId = advance.id;

        await tx.auditLog.create({
          data: {
            actionType: "CREATE",
            entity: "SALARY_ADVANCE",
            actorRole: "ADMIN",
            newPayload: { id: resId, delta: { amount: parsed.amount, employeeId: parsed.employeeId, paymentMode: parsed.paymentMode } as any },
            actorId: loggerId,
          }
        });
      } else {
        // Standard Expenses
        const res = await tx.expense.create({
          data: {
            loggerId,
            amount: parsed.amount,
            category: parsed.category,
            description: parsed.description,
            date: new Date(parsed.date),
            notes: composedNotes || null,
            machineId: parsed.machineId || null,
            vehicleId: parsed.vehicleId || null,
            dispatchId: parsed.dispatchId || null,
            employeeId: parsed.employeeId || null,
            contractorId: parsed.contractorId || null,
            toolId: parsed.toolId || null,
          }
        });
        resId = res.id;

        await tx.auditLog.create({
          data: {
            actionType: "CREATE",
            entity: "EXPENSE",
            actorRole: "ADMIN",
            newPayload: { id: resId, delta: { amount: parsed.amount, category: parsed.category, employeeId: parsed.employeeId, paymentMode: parsed.paymentMode } as any },
            actorId: loggerId,
          }
        });
      }

      return { id: resId };
    });

    revalidatePath("/admin/dashboard");
    revalidatePath("/staff/dashboard");
    revalidatePath("/staff/expenses");
    revalidatePath("/owner/ledger");
    return { success: true };
  } catch (error: any) {
    console.error("Create expense error:", error);
    return { success: false, error: error.message || "Failed to log expense" };
  }
}

/**
 * Bulk Expense Logging Action for Multi-Worker Outside Helper Wages
 */
export async function createBulkHelperExpenses(data: {
  date: string;
  paymentMode: string;
  cashAmount?: number;
  bankAmount?: number;
  receiptUrl?: string;
  dispatchId?: string;
  notes?: string;
  workers: Array<{
    workerName: string;
    amount: number;
    roleNote?: string;
  }>;
}) {
  try {
    const { employeeId: loggerId } = await requireAuth({ allowedRoles: ["OWNER", "ADMIN", "STAFF"] });

    if (!data.workers || data.workers.length === 0) {
      return { success: false, error: "At least one helper wage row is required." };
    }

    const totalAmount = data.workers.reduce((sum, w) => sum + Number(w.amount), 0);
    if (totalAmount <= 0) {
      return { success: false, error: "Total helper amount must be greater than zero." };
    }

    let composedNotes = data.notes || "";
    if (data.paymentMode) {
      let paymentTag = `[PAYMENT: ${data.paymentMode}]`;
      if (data.paymentMode === "COMBINED") {
        paymentTag += ` (Cash: ₹${data.cashAmount || 0} | Bank/UPI: ₹${data.bankAmount || 0})`;
      }
      composedNotes = `${paymentTag} ${composedNotes}`.trim();
    }
    if (data.receiptUrl) {
      composedNotes = `${composedNotes} [RECEIPT_ATTACHED: ${data.receiptUrl}]`.trim();
    }

    await prisma.$transaction(async (tx) => {
      for (const worker of data.workers) {
        if (!worker.workerName || Number(worker.amount) <= 0) continue;

        await tx.expense.create({
          data: {
            loggerId,
            amount: Number(worker.amount),
            category: "OUTSIDE_HELPER_WAGE",
            description: `Outside Helper: ${worker.workerName} ${worker.roleNote ? `(${worker.roleNote})` : ""}`.trim(),
            date: new Date(data.date),
            notes: composedNotes || null,
            dispatchId: data.dispatchId || null,
          }
        });
      }

      await tx.auditLog.create({
        data: {
          actionType: "CREATE_BULK",
          entity: "EXPENSE_OUTSIDE_HELPERS",
          actorRole: "ADMIN",
          newPayload: {
            count: data.workers.length,
            totalAmount,
            workers: data.workers,
            paymentMode: data.paymentMode,
          } as any,
          actorId: loggerId,
        }
      });
    });

    revalidatePath("/staff/expenses");
    revalidatePath("/owner/ledger");
    revalidatePath("/admin/dashboard");
    return { success: true };
  } catch (error: any) {
    console.error("Bulk helper expenses error:", error);
    return { success: false, error: error.message || "Failed to log bulk helper expenses." };
  }
}
