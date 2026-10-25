"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { PaymentMethod, ExpenseCategory } from "@prisma/client";

const billingSchema = z.object({
  dispatchId: z.string().min(1),
  customerId: z.string().min(1),
  items: z.array(
    z.object({
      itemKey: z.string(),
      description: z.string(),
      quantity: z.number(),
      rate: z.number(),
      total: z.number(),
    })
  ),
  expenses: z.array(
    z.object({
      category: z.nativeEnum(ExpenseCategory),
      description: z.string().optional(),
      amount: z.number(),
    })
  ),
  lateFee: z.number().default(0),
  payments: z.array(
    z.object({
      method: z.nativeEnum(PaymentMethod),
      amount: z.number(),
      notes: z.string().optional(),
    })
  ),
  discountAmount: z.number().default(0),
  collectorId: z.string(), // employee ID of who is processing this (usually the logged in staff)
});

export async function generateAndCollectBill(formData: unknown) {
  const session = await auth();
  if (
    !session?.user ||
    (session.user.role !== "OWNER" &&
      session.user.role !== "STAFF" &&
      session.user.role !== "ADMIN")
  ) {
    return { success: false, error: "Unauthorized." };
  }

  const parsed = billingSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues.map((i) => i.message).join(", ") };
  }

  const { dispatchId, customerId, items, expenses, lateFee, payments, discountAmount, collectorId } = parsed.data;

  // Ensure valid collector Employee ID for DB relations
  let validCollectorId = collectorId;
  const collectorEmp = await prisma.employee.findUnique({ where: { id: collectorId } });
  if (!collectorEmp) {
    const fallbackEmp = await prisma.employee.findFirst({ where: { isActive: true, isPendingDelete: false } });
    if (fallbackEmp) {
      validCollectorId = fallbackEmp.id;
    }
  }

  // Calculate totals
  const itemsTotal = items.reduce((sum, item) => sum + item.total, 0);
  const totalAmount = itemsTotal + lateFee;

  let paidCash = 0;
  let paidUpi = 0;
  let paidBank = 0;
  let paidCheque = 0;

  for (const p of payments) {
    if (p.method === "CASH") paidCash += p.amount;
    else if (p.method === "UPI") paidUpi += p.amount;
    else if (p.method === "BANK_TRANSFER") paidBank += p.amount;
    else if (p.method === "CHEQUE") paidCheque += p.amount;
  }

  const totalPaid = paidCash + paidUpi + paidBank + paidCheque;
  const status = (totalPaid + discountAmount) >= totalAmount ? "PAID" : (totalPaid + discountAmount) > 0 ? "PARTIAL" : "UNPAID";

  // Decide primary payment method for invoice header
  const primaryPaymentMethod = payments.length > 0 ? payments.sort((a, b) => b.amount - a.amount)[0].method : null;

  try {
    const invoiceId = await prisma.$transaction(async (tx) => {
      // 1. Create Invoice
      const dateNow = new Date();
      // Generate a unique invoice number
      const count = await tx.invoice.count({ where: { issuedDate: dateNow } });
      const invoiceNumber = `INV-${dateNow.getFullYear()}${(dateNow.getMonth() + 1).toString().padStart(2, '0')}${dateNow.getDate().toString().padStart(2, '0')}-${(count + 1).toString().padStart(3, '0')}`;

      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          customerId,
          totalAmount,
          paidCash,
          paidUpi,
          paidBank,
          paidCheque,
          discountAmount,
          paymentMethod: primaryPaymentMethod,
          paidAt: totalPaid > 0 ? dateNow : null,
          status,
          issuedDate: dateNow,
          dueDate: dateNow,
          items: {
            create: items.map(item => ({
              itemKey: item.itemKey,
              description: item.description,
              quantity: item.quantity,
              rate: item.rate,
              total: item.total
            }))
          }
        },
      });

      // Add late fee if any
      if (lateFee > 0) {
        await tx.invoiceItem.create({
          data: {
            invoiceId: invoice.id,
            itemKey: "LATE_FEE",
            description: "Late Wrap-up Surcharge",
            quantity: 1,
            rate: lateFee,
            total: lateFee
          }
        });
      }

      // 2. Add Expenses
      const dispatch = await tx.dailyDispatch.findUnique({ where: { id: dispatchId } });
      if (dispatch) {
        for (const exp of expenses) {
          await tx.expense.create({
            data: {
              loggerId: validCollectorId,
              amount: exp.amount,
              category: exp.category,
              description: exp.description,
              date: dateNow,
              machineId: dispatch.machineId,
            }
          });
        }
      }

      // 3. Process Payments
      for (const p of payments) {
        await tx.paymentReceipt.create({
          data: {
            receiptNumber: `REC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
            customerId,
            invoiceId: invoice.id,
            amount: p.amount,
            paymentMethod: p.method,
            paymentDate: dateNow,
            notes: p.notes,
            collectedByEmployeeId: validCollectorId,
            dispatchId,
          }
        });

        if (p.method === "CASH") {
          await tx.cashCollection.create({
            data: {
              operatorId: dispatch?.operatorId || dispatch?.driverId || validCollectorId, // Use operator, else driver, else collector
              dispatchId,
              amountCollected: p.amount,
              date: dateNow,
              status: "PENDING_DEPOSIT",
              notes: p.notes,
            }
          });
        }
      }

      // 4. Link Invoice to Dispatch
      await tx.dailyDispatch.update({
        where: { id: dispatchId },
        data: { invoiceId: invoice.id }
      });

      return invoice.id;
    });

    revalidatePath("/staff/dispatch");
    revalidatePath("/admin/billing");
    return { success: true, invoiceId };
  } catch (err: any) {
    console.error("[generateAndCollectBill] Error:", err);
    return { success: false, error: err.message || "Failed to generate bill." };
  }
}

// ────────────────────────────────────────────────────────────────────────────
// deductAdvanceFromInvoice
// Queries outstanding STAFF_ADVANCE expenses tied to the invoice's dispatch,
// sums them, and persists Invoice.advanceDeducted. STAFF / ADMIN / OWNER only.
// ────────────────────────────────────────────────────────────────────────────
import { requireAuth } from "@/lib/serverAuth";
import { logAudit } from "@/lib/auditLogger";

export async function deductAdvanceFromInvoice(invoiceId: string) {
  try {
    const { employeeId: actorId, role } = await requireAuth({
      allowedRoles: ["STAFF", "ADMIN", "OWNER"],
    });

    // Fetch invoice with linked dispatch(es)
    const invoice = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      include: {
        dispatches: {
          select: { id: true, customerId: true },
        },
      },
    });

    if (!invoice) {
      return { success: false, error: "Invoice not found" };
    }

    if (invoice.status === "PAID" || invoice.status === "CANCELLED") {
      return { success: false, error: `Cannot modify a ${invoice.status} invoice.` };
    }

    const customerId = invoice.customerId;

    // Aggregate all outstanding STAFF_ADVANCE expenses not yet settled for this customer
    const advances = await prisma.expense.findMany({
      where: {
        category: ExpenseCategory.STAFF_ADVANCE,
        settlementId: null,                   // not yet applied to a settlement
        dispatch: { customerId },             // related to same customer
      },
      select: { id: true, amount: true, date: true, description: true },
    });

    const totalAdvanceDeduction = advances.reduce(
      (sum, a) => sum + Number(a.amount),
      0
    );

    if (totalAdvanceDeduction === 0) {
      return {
        success: true,
        advanceDeducted: 0,
        message: "No outstanding advances found for this customer.",
      };
    }

    // Apply deduction in $transaction
    const updated = await prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.update({
        where: { id: invoiceId },
        data: { advanceDeducted: totalAdvanceDeduction },
      });

      // Mark advances as settled against this invoice (link via settlementId is not available directly;
      // we create an internal audit note instead)
      return inv;
    });

    // Audit log
    await logAudit({
      actorId,
      actorRole: role,
      actionType: "ADVANCE_DEDUCTED_FROM_INVOICE",
      modelName: "Invoice",
      oldPayload: { advanceDeducted: Number(invoice.advanceDeducted) },
      newPayload: {
        invoiceId,
        customerId,
        advanceDeducted: totalAdvanceDeduction,
        advanceCount: advances.length,
      },
    });

    revalidatePath("/admin/billing");
    revalidatePath("/staff/invoices");
    return {
      success: true,
      advanceDeducted: totalAdvanceDeduction,
      advancesApplied: advances.length,
      data: updated,
    };
  } catch (error: any) {
    console.error("[deductAdvanceFromInvoice] Error:", error);
    return { success: false, error: error.message || "Failed to deduct advance." };
  }
}

