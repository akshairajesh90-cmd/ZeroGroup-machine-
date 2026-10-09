"use server";

import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { InvoiceStatus, PaymentMethod } from "@prisma/client";

export async function getCustomerBalances() {
  try {
    const customers = await prisma.customer.findMany({
      include: {
        invoices: {
          select: {
            totalAmount: true,
            paidCash: true,
            paidUpi: true,
            paidBank: true,
            paidCheque: true,
            discountAmount: true,
            advanceDeducted: true,
            status: true,
          }
        }
      },
      orderBy: { name: "asc" }
    });

    const balances = customers.map(customer => {
      let totalBilled = 0;
      let totalPaid = 0;
      let totalDiscounts = 0;

      customer.invoices.forEach(inv => {
        totalBilled += Number(inv.totalAmount);
        
        const paidForThisInvoice = 
          Number(inv.paidCash) + 
          Number(inv.paidUpi) + 
          Number(inv.paidBank) + 
          Number(inv.paidCheque) + 
          Number(inv.advanceDeducted);
          
        totalPaid += paidForThisInvoice;
        totalDiscounts += Number(inv.discountAmount);
      });

      const outstandingBalance = totalBilled - (totalPaid + totalDiscounts);

      return {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        totalBilled,
        totalPaid,
        totalDiscounts,
        outstandingBalance
      };
    });

    return { success: true, data: balances };
  } catch (error: any) {
    console.error("Error fetching customer balances:", error);
    return { success: false, error: error.message };
  }
}

export async function getInvoices(filter?: string) {
  try {
    const whereClause: any = { isPendingDelete: false };
    
    if (filter === "UNPAID") whereClause.status = "UNPAID";
    if (filter === "PARTIAL") whereClause.status = "PARTIAL";
    if (filter === "PAID") whereClause.status = "PAID";
    if (filter === "OVERDUE") {
      whereClause.status = { not: "PAID" };
      whereClause.dueDate = { lt: new Date() };
    }

    const invoices = await prisma.invoice.findMany({
      where: whereClause,
      include: {
        customer: { select: { name: true, phone: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    const formatted = invoices.map(inv => {
      const totalPaid = Number(inv.paidCash) + Number(inv.paidUpi) + Number(inv.paidBank) + Number(inv.paidCheque) + Number(inv.advanceDeducted);
      return {
        ...inv,
        totalAmount: Number(inv.totalAmount),
        discountAmount: Number(inv.discountAmount),
        totalPaid
      };
    });

    return { success: true, data: formatted };
  } catch (error: any) {
    console.error("Error fetching invoices:", error);
    return { success: false, error: error.message };
  }
}

export async function getCustomerStatement(customerId: string) {
  try {
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        invoices: {
          orderBy: { createdAt: "asc" },
          include: {
            dispatches: { select: { location: true, dateOfService: true } }
          }
        },
        PaymentReceipt: {
          orderBy: { paymentDate: "asc" }
        }
      }
    });

    if (!customer) throw new Error("Customer not found");

    // We will build a chronological ledger of events: Invoices (Debit), Payments (Credit), Discounts (Credit)
    const ledger: any[] = [];
    let runningBalance = 0;

    customer.invoices.forEach(inv => {
      // 1. Add the Invoice as a Debit
      runningBalance += Number(inv.totalAmount);
      ledger.push({
        id: `inv-${inv.id}`,
        date: inv.createdAt,
        type: "INVOICE",
        description: `Invoice #${inv.invoiceNumber} - ${inv.siteLocation || "General"}`,
        debit: Number(inv.totalAmount),
        credit: 0,
        balance: runningBalance,
        status: inv.status,
      });

      // 2. If Advance Deducted was part of the invoice creation, credit it instantly
      if (Number(inv.advanceDeducted) > 0) {
        runningBalance -= Number(inv.advanceDeducted);
        ledger.push({
          id: `adv-${inv.id}`,
          date: inv.createdAt,
          type: "ADVANCE_APPLIED",
          description: `Advance Applied to Invoice #${inv.invoiceNumber}`,
          debit: 0,
          credit: Number(inv.advanceDeducted),
          balance: runningBalance
        });
      }

      // 3. If a Discount was applied, add it as a Credit
      if (Number(inv.discountAmount) > 0) {
        runningBalance -= Number(inv.discountAmount);
        ledger.push({
          id: `disc-${inv.id}`,
          date: inv.updatedAt, // Assuming discount is applied near update time
          type: "DISCOUNT",
          description: `Discount Applied to Invoice #${inv.invoiceNumber}`,
          debit: 0,
          credit: Number(inv.discountAmount),
          balance: runningBalance
        });
      }
    });

    // 4. Add Payments as Credits
    customer.PaymentReceipt.forEach(payment => {
      runningBalance -= Number(payment.amount);
      ledger.push({
        id: `pay-${payment.id}`,
        date: payment.paymentDate,
        type: "PAYMENT",
        description: `Payment Received (${payment.paymentMethod}) - #${payment.receiptNumber}`,
        debit: 0,
        credit: Number(payment.amount),
        balance: runningBalance
      });
    });

    // Sort the ledger strictly by date
    ledger.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Recalculate running balance correctly after sorting
    let correctBalance = 0;
    ledger.forEach(entry => {
      correctBalance = correctBalance + entry.debit - entry.credit;
      entry.balance = correctBalance;
    });

    return {
      success: true,
      data: {
        customer: { id: customer.id, name: customer.name, phone: customer.phone },
        ledger,
        totalOutstanding: correctBalance
      }
    };
  } catch (error: any) {
    console.error("Error generating customer statement:", error);
    return { success: false, error: error.message };
  }
}

export async function processPayment(
  invoiceId: string, 
  amount: number, 
  discountAmount: number, 
  method: PaymentMethod
) {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({
        where: { id: invoiceId },
        include: { customer: true }
      });

      if (!invoice) throw new Error("Invoice not found");

      const currentTotalPaid = Number(invoice.paidCash) + Number(invoice.paidUpi) + Number(invoice.paidBank) + Number(invoice.paidCheque) + Number(invoice.advanceDeducted);
      const currentDiscount = Number(invoice.discountAmount);
      
      const newDiscountTotal = currentDiscount + discountAmount;
      
      // We need to add the specific payment method amount
      let updatedPaidField = {};
      if (method === "CASH") updatedPaidField = { paidCash: Number(invoice.paidCash) + amount };
      if (method === "UPI") updatedPaidField = { paidUpi: Number(invoice.paidUpi) + amount };
      if (method === "BANK_TRANSFER") updatedPaidField = { paidBank: Number(invoice.paidBank) + amount };
      if (method === "CHEQUE") updatedPaidField = { paidCheque: Number(invoice.paidCheque) + amount };

      const totalPaidAfterThis = currentTotalPaid + amount;
      const totalAmount = Number(invoice.totalAmount);
      
      let newStatus: InvoiceStatus = invoice.status;
      if (totalPaidAfterThis + newDiscountTotal >= totalAmount) {
        newStatus = "PAID";
      } else if (totalPaidAfterThis + newDiscountTotal > 0) {
        newStatus = "PARTIAL";
      }

      // 1. Update Invoice
      const updatedInvoice = await tx.invoice.update({
        where: { id: invoiceId },
        data: {
          ...updatedPaidField,
          discountAmount: newDiscountTotal,
          status: newStatus,
          paymentMethod: method, // records the last payment method
          paidAt: newStatus === "PAID" ? new Date() : undefined
        }
      });

      // 2. Create PaymentReceipt if amount > 0
      if (amount > 0) {
        const receiptCount = await tx.paymentReceipt.count();
        await tx.paymentReceipt.create({
          data: {
            receiptNumber: `RCPT-${new Date().getFullYear()}-${(receiptCount + 1).toString().padStart(4, '0')}`,
            customerId: invoice.customerId,
            invoiceId: invoice.id,
            amount: amount,
            paymentMethod: method,
            paymentDate: new Date(),
            notes: discountAmount > 0 ? `Included discount of ₹${discountAmount}` : null
          }
        });
      }
      
      return updatedInvoice;
    });

    revalidatePath("/staff/invoices");
    revalidatePath(`/staff/invoices/${result.customerId}`);
    revalidatePath(`/staff/billing/${result.id}`); // in case they process from the billing page

    return { success: true, data: result };
  } catch (error: any) {
    console.error("Error processing payment:", error);
    return { success: false, error: error.message };
  }
}
