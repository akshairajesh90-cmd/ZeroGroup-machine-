import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { InvoiceStatus, PaymentMethod } from "@prisma/client";

const ALLOWED_ROLES = ["ADMIN", "MANAGER", "DISPATCHER", "ACCOUNTANT", "OWNER"];

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const user = await prisma.user.findUnique({ 
      where: { email: session.user.email },
      include: { employee: true }
    });
    if (!user || !ALLOWED_ROLES.includes(user.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { amount, method } = await req.json();
    if (!amount || amount <= 0 || !method) {
      return NextResponse.json({ error: "Invalid payment details" }, { status: 400 });
    }

    const invoiceId = params.id;

    // Use a transaction
    const result = await prisma.$transaction(async (tx) => {
      const invoice = await tx.invoice.findUnique({
        where: { id: invoiceId },
        include: { dispatches: true }
      });

      if (!invoice) throw new Error("Invoice not found");

      await tx.paymentReceipt.create({
        data: {
          receiptNumber: `REC-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
          customerId: invoice.customerId,
          invoiceId: invoice.id,
          amount: Number(amount),
          paymentMethod: method as PaymentMethod,
          paymentDate: new Date(),
          dispatchId: invoice.dispatches[0]?.id || null, // Best effort link to dispatch
          collectedByEmployeeId: user.employee?.id || undefined,
          notes: `Payment logged from Receivables for ${invoice.invoiceNumber}`,
        }
      });

      // 2. Update Invoice totals
      const updateData: any = {};
      if (method === "CASH") updateData.paidCash = { increment: amount };
      if (method === "UPI") updateData.paidUpi = { increment: amount };
      if (method === "BANK_TRANSFER") updateData.paidBank = { increment: amount };

      const updatedInvoice = await tx.invoice.update({
        where: { id: invoice.id },
        data: updateData
      });

      // 3. Re-evaluate Status
      const totalPaid = Number(updatedInvoice.paidCash) + Number(updatedInvoice.paidUpi) + Number(updatedInvoice.paidBank);
      const remainingBalance = Number(updatedInvoice.totalAmount) - totalPaid;
      
      let newStatus = updatedInvoice.status;
      if (remainingBalance <= 0) {
        newStatus = InvoiceStatus.PAID;
      } else if (totalPaid > 0) {
        newStatus = InvoiceStatus.PARTIAL;
      } else {
        newStatus = InvoiceStatus.UNPAID;
      }

      if (newStatus !== updatedInvoice.status) {
        await tx.invoice.update({
          where: { id: invoice.id },
          data: { status: newStatus }
        });
      }

      return true;
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Receivable Payment Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
