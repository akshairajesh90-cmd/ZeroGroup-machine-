import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Role, InvoiceStatus, PaymentMethod } from "@prisma/client";

export const dynamic = "force-dynamic";

const ALLOWED_ROLES: Role[] = [Role.ADMIN, Role.OWNER, Role.STAFF];

export async function POST(req: Request) {
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

    const body = await req.json();
    const { dispatchId, customerId, totalAmount, dueDate, notes, items, payments, issuedDate } = body;

    if (!dispatchId || !customerId || !items || !Array.isArray(items)) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // 1. Generate sequential Invoice Number (e.g. INV-2026-001)
    const year = new Date().getFullYear();
    const prefix = `INV-${year}-`;
    const lastInvoice = await prisma.invoice.findFirst({
      where: { invoiceNumber: { startsWith: prefix } },
      orderBy: { invoiceNumber: 'desc' },
    });

    let nextNumber = 1;
    if (lastInvoice) {
      const parts = lastInvoice.invoiceNumber.split('-');
      if (parts.length === 3) {
        nextNumber = parseInt(parts[2], 10) + 1;
      }
    }
    const invoiceNumber = `${prefix}${nextNumber.toString().padStart(3, '0')}`;

    // 2. Calculate paid amounts by method
    let paidCash = 0;
    let paidUpi = 0;
    let paidBank = 0;
    let totalPaid = 0;

    for (const p of (payments || [])) {
      const amt = Number(p.amount);
      if (isNaN(amt) || amt <= 0) continue;
      
      totalPaid += amt;
      if (p.method === 'CASH') paidCash += amt;
      else if (p.method === 'UPI') paidUpi += amt;
      else if (p.method === 'BANK_TRANSFER') paidBank += amt;
    }

    // 3. Determine Status
    let status: InvoiceStatus = InvoiceStatus.DRAFT;
    const remainingBalance = Number(totalAmount) - totalPaid;

    if (remainingBalance <= 0) {
      status = InvoiceStatus.PAID;
    } else if (totalPaid > 0) {
      status = InvoiceStatus.PARTIAL;
    } else {
      status = InvoiceStatus.UNPAID;
    }

    // 4. Wrap everything in a Prisma transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create Invoice
      const invoice = await tx.invoice.create({
        data: {
          invoiceNumber,
          customerId,
          totalAmount,
          paidCash,
          paidUpi,
          paidBank,
          status,
          issuedDate: new Date(issuedDate || new Date()),
          dueDate: new Date(dueDate || new Date()),
          notes,
          items: {
            create: items.map((item: any) => ({
              itemKey: item.itemKey,
              description: item.description,
              quantity: Number(item.quantity),
              rate: Number(item.rate),
              total: Number(item.total),
            }))
          }
        }
      });

      // Create PaymentReceipts for split payments
      for (const p of (payments || [])) {
        const amt = Number(p.amount);
        if (isNaN(amt) || amt <= 0) continue;

        // Generate receipt number
        const receiptCount = await tx.paymentReceipt.count();
        const receiptNumber = `REC-${Date.now().toString().slice(-6)}-${receiptCount + 1}`;

        await tx.paymentReceipt.create({
          data: {
            receiptNumber,
            customerId,
            invoiceId: invoice.id,
            amount: amt,
            paymentMethod: p.method as PaymentMethod,
            paymentDate: new Date(),
            dispatchId: dispatchId,
            collectedByEmployeeId: user.employee?.id || undefined,
            notes: `Payment for ${invoiceNumber}`,
          }
        });
      }

      // Link Invoice to Dispatch and mark it as primary billing row
      await tx.dailyDispatch.update({
        where: { id: dispatchId },
        data: { 
          invoiceId: invoice.id,
          isPrimaryBillingRow: true
        }
      });

      return invoice;
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    console.error("Generate Invoice Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
