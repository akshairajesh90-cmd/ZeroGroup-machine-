"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/serverAuth";
import { Role, InvoiceStatus, PaymentMethod } from "@prisma/client";
import { revalidatePath } from "next/cache";
import { addDays, startOfDay } from "date-fns";

export async function generateInvoice(customerId: string, dispatchIds: string[]) {
  const { employeeId } = await requireAuth({ allowedRoles: [Role.OWNER, Role.ADMIN] });

  if (!dispatchIds.length) throw new Error("No dispatches selected for invoice.");

  const result = await prisma.$transaction(async (tx) => {
    // 1. Verify all dispatches belong to customer, are COMPLETED, and are NOT already invoiced
    const dispatches = await tx.dailyDispatch.findMany({
      where: { id: { in: dispatchIds } }
    });

    let totalAmount = 0;

    for (const dispatch of dispatches) {
      if (dispatch.customerId !== customerId) throw new Error(`Dispatch ${dispatch.id} belongs to another customer.`);
      if (dispatch.status !== "COMPLETED") throw new Error(`Dispatch ${dispatch.id} is not COMPLETED.`);
      if (dispatch.invoiceId) throw new Error(`Dispatch ${dispatch.id} is already invoiced.`);
      
      totalAmount += Number(dispatch.customerCharge || 0);
    }

    if (totalAmount <= 0) throw new Error("Total invoice amount must be greater than zero.");

    // 2. Create the Invoice
    const today = startOfDay(new Date());
    const invoiceNumber = `INV-${Date.now()}`;
    
    const invoice = await tx.invoice.create({
      data: {
        invoiceNumber,
        customerId,
        totalAmount,
        status: InvoiceStatus.DRAFT,
        issuedDate: today,
        dueDate: addDays(today, 15) // Default Net 15
      }
    });

    // 3. Link dispatches to the new Invoice
    await tx.dailyDispatch.updateMany({
      where: { id: { in: dispatchIds } },
      data: { invoiceId: invoice.id }
    });

    // 4. Audit Log
    await tx.auditLog.create({
      data: {
        entity: "INVOICE",
        entityId: invoice.id,
        action: "GENERATE_INVOICE",
        delta: { invoiceNumber, totalAmount, dispatchIds } as any,
        actorId: employeeId
      }
    });

    return invoice;
  });

  revalidatePath("/admin/billing");
  return { success: true, invoice: result };
}

export async function recordPayment(data: {
  customerId: string;
  invoiceId?: string;
  amount: number;
  paymentMethod: PaymentMethod;
  clientDate: string; // Timezone safe string "YYYY-MM-DD"
}) {
  const { employeeId } = await requireAuth({ allowedRoles: [Role.OWNER, Role.ADMIN, Role.STAFF] });
  const paymentDate = new Date(`${data.clientDate}T00:00:00.000Z`);

  const result = await prisma.$transaction(async (tx) => {
    const receiptNumber = `RCPT-${Date.now()}`;

    // 1. Create Receipt
    const receipt = await tx.paymentReceipt.create({
      data: {
        receiptNumber,
        customerId: data.customerId,
        invoiceId: data.invoiceId,
        amount: data.amount,
        paymentMethod: data.paymentMethod,
        paymentDate
      }
    });

    // 2. Auto-Update Invoice Status if linked
    if (data.invoiceId) {
      const invoice = await tx.invoice.findUniqueOrThrow({ 
        where: { id: data.invoiceId },
        include: { payments: true }
      });

      // Sum existing payments + this new payment
      const totalPaid = invoice.payments.reduce((acc, p) => acc + Number(p.amount), 0) + data.amount;
      const totalAmount = Number(invoice.totalAmount);

      let newStatus = invoice.status;
      if (totalPaid >= totalAmount) {
        newStatus = InvoiceStatus.PAID;
      } else if (totalPaid > 0) {
        newStatus = InvoiceStatus.PARTIAL;
      }

      if (newStatus !== invoice.status) {
        await tx.invoice.update({
          where: { id: data.invoiceId },
          data: { status: newStatus }
        });
      }
    }

    // 3. Audit Log
    await tx.auditLog.create({
      data: {
        entity: "PAYMENT_RECEIPT",
        entityId: receipt.id,
        action: "RECORD_PAYMENT",
        delta: data as any,
        actorId: employeeId
      }
    });

    return receipt;
  });

  revalidatePath("/admin/billing");
  return { success: true, receipt: result };
}
