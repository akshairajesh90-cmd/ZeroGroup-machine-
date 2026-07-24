"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { revalidatePath } from "next/cache";
import { InvoiceStatus, PaymentMethod } from "@prisma/client";

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const generateBillSchema = z.object({
  dispatchId: z.string().min(1, "Dispatch ID required"),
  customBillNumber: z.string().optional(), // e.g. "1583"
});

const updateBillSchema = z.object({
  invoiceId: z.string().min(1, "Invoice ID required"),
  billNumber: z.string().min(1, "Bill Number required"),
  advanceDeducted: z.number().min(0).default(0),
  paidCash: z.number().min(0).default(0),
  paidUpi: z.number().min(0).default(0),
  paidBank: z.number().min(0).default(0),
  status: z.enum(["DRAFT", "ISSUED", "PAID", "CANCELLED"]).default("ISSUED"),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      id: z.string().optional(),
      itemKey: z.string(), // e.g. "LIFT", "MIXER", "VIBRATOR", "PANIKKOOLI", "VANDIKKOOLI", "PADUTHA", "TROLLY_BENCH"
      malayalamName: z.string().optional(),
      description: z.string(),
      quantity: z.number().min(1).default(1),
      rate: z.number().min(0),
      total: z.number().min(0),
    })
  ),
});

// ============================================================================
// SERVER ACTIONS
// ============================================================================

/**
 * 1. Generate or Retrieve Bill #1583 from Booking Context (`DailyDispatch`)
 * Auto-pulls Lift storeys ("3 Floored used"), Hydraulic vs Standard machine, 
 * helper count ("12 Helpers only"), setup tools, and excludes cement bags from bill items!
 */
export async function generateBillFromBooking(dispatchId: string, customBillNumber?: string) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "OWNER" && session.user.role !== "STAFF")) {
    return { success: false, error: "Unauthorized: Only OWNER or STAFF can generate bills." };
  }

  try {
    const dispatch = await prisma.dailyDispatch.findUnique({
      where: { id: dispatchId },
      include: {
        customer: true,
        machine: true,
        operator: true,
        mainHelper: true,
        invoice: {
          include: { items: true },
        },
        dispatchTools: {
          include: { tool: true },
        },
      },
    });

    if (!dispatch) {
      return { success: false, error: "Booking / Dispatch record not found." };
    }

    // If already generated, return existing invoice
    if (dispatch.invoice) {
      return { success: true, invoice: dispatch.invoice };
    }

    // Generate next sequential or custom bill number (e.g. "1583")
    let billNum = customBillNumber;
    if (!billNum) {
      const lastInvoice = await prisma.invoice.findFirst({
        orderBy: { createdAt: "desc" },
      });
      const lastNum = lastInvoice?.billNumber ? parseInt(lastInvoice.billNumber, 10) : 1582;
      billNum = (!isNaN(lastNum) ? (lastNum + 1).toString() : `BILL-${Date.now()}`);
    }

    // Auto-construct initial line items based on exact V15.0 field reality
    const initialItems: any[] = [];
    let estimatedTotal = 0;

    // 1. LIFT MACHINE
    if (dispatch.machine?.type === "LIFT" || dispatch.liftFloors && dispatch.liftFloors > 1) {
      const liftRate = Number(dispatch.customerCharge ?? 6500);
      estimatedTotal += liftRate;
      initialItems.push({
        itemKey: "LIFT",
        malayalamName: "ലിഫ്റ്റ്",
        description: `${dispatch.liftFloors ?? 1} Floored used`,
        quantity: 1,
        rate: liftRate,
        total: liftRate,
      });
    }

    // 2. MIXER / HYDRAULIC MACHINE
    if (dispatch.machine?.type === "MIXER" || dispatch.mixerCategory) {
      const isHydraulic = dispatch.mixerCategory === "HYDRAULIC";
      const mixerRate = Number(dispatch.customerCharge ?? (isHydraulic ? 4500 : 4000));
      estimatedTotal += mixerRate;
      initialItems.push({
        itemKey: "MIXER",
        malayalamName: isHydraulic ? "ഹൈഡ്രോളിക് മിഷൻ" : "മിഷൻ",
        description: isHydraulic ? "Hydraulic Machine" : "Machine (Standard Mixer)",
        quantity: 1,
        rate: mixerRate,
        total: mixerRate,
      });
    }

    // 3. VIBRATOR (Petrol vs Electric)
    if (dispatch.vibratorType || dispatch.dispatchTools.some(t => t.tool?.toolType?.includes("VIBRATOR"))) {
      const isElectric = dispatch.vibratorType === "ELECTRIC";
      const vibRate = isElectric ? 700 : 1000;
      estimatedTotal += vibRate;
      initialItems.push({
        itemKey: "VIBRATOR",
        malayalamName: "വൈബ്രേറ്റർ",
        description: isElectric ? "Electric Vibrator (No op + wire)" : "Petrol Vibrator (Optional op)",
        quantity: 1,
        rate: vibRate,
        total: vibRate,
      });
    }

    // 4. PANIKKOOLI (Helper Crew Charge — displayed as numeric count only)
    if (dispatch.helperCount > 0 || dispatch.mainHelperName || dispatch.mainHelper) {
      const helperWage = dispatch.helperCount * 1000 || 12000;
      estimatedTotal += helperWage;
      initialItems.push({
        itemKey: "PANIKKOOLI",
        malayalamName: "പണിക്കൂലി",
        description: `${dispatch.helperCount || 12} Helpers only`,
        quantity: 1,
        rate: helperWage,
        total: helperWage,
      });
    }

    // 5. TROLLY + BENCH (Combined Tool Rent)
    if (dispatch.hasTrollyBench || dispatch.trollyWorkerCount > 0) {
      const trollyRate = 1500;
      estimatedTotal += trollyRate;
      initialItems.push({
        itemKey: "TROLLY_BENCH",
        malayalamName: "ട്രോളി + ബെഞ്ച്",
        description: "One-Wheel Trolly + Bench stand (Tool Rent)",
        quantity: 1,
        rate: trollyRate,
        total: trollyRate,
      });
    }

    // 6. VANDIKKOOLI (Travel / Transport Charge — Company vehicle OR Public transport)
    const travelRate = dispatch.publicTransportUsed ? 500 : 1200;
    estimatedTotal += travelRate;
    initialItems.push({
      itemKey: "VANDIKKOOLI",
      malayalamName: "വണ്ടിക്കൂലി",
      description: dispatch.publicTransportUsed ? "Public Transport / Auto / Bus fare" : "Company Vehicle Transport",
      quantity: 1,
      rate: travelRate,
      total: travelRate,
    });

    // 7. PADUTHA (Tarpaulin Sheet)
    if (dispatch.dispatchTools.some(t => t.tool?.name?.toLowerCase().includes("padutha") || t.tool?.name?.toLowerCase().includes("sheet"))) {
      const paduthaRate = 720;
      estimatedTotal += paduthaRate;
      initialItems.push({
        itemKey: "PADUTHA",
        malayalamName: "പടുത്ത്",
        description: "Tarpaulin Mixing Sheet",
        quantity: 1,
        rate: paduthaRate,
        total: paduthaRate,
      });
    }

    // NOTE: Cement bags are explicitly EXCLUDED from bill line items per V15.0 rule!

    // Create Invoice with Line Items in Transaction
    const invoice = await prisma.$transaction(async (tx) => {
      const newInv = await tx.invoice.create({
        data: {
          billNumber: billNum,
          customerId: dispatch.customerId,
          date: dispatch.dateOfService,
          siteLocation: dispatch.location,
          totalAmount: estimatedTotal,
          status: InvoiceStatus.ISSUED,
          items: {
            create: initialItems,
          },
        },
        include: { items: true },
      });

      // Link dispatch to invoice
      await tx.dailyDispatch.update({
        where: { id: dispatch.id },
        data: { invoiceId: newInv.id },
      });

      return newInv;
    });

    revalidatePath("/admin/billing");
    revalidatePath("/admin/dispatch");
    return { success: true, invoice };
  } catch (err: any) {
    console.error("Error generating bill:", err);
    return { success: false, error: err.message || "Failed to generate bill." };
  }
}

/**
 * 2. Update Bill #1583 Custom Amounts, Advance Deduction & Combined Split Payments
 */
export async function updateBillAndPayment(formData: unknown) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "OWNER" && session.user.role !== "STAFF")) {
    return { success: false, error: "Unauthorized: Only OWNER or STAFF can update bills." };
  }

  const parsed = updateBillSchema.safeParse(formData);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues.map(i => i.message).join(", ") };
  }

  const data = parsed.data;

  try {
    // Calculate total from custom items minus advance deducted
    const itemsTotal = data.items.reduce((sum, item) => sum + item.total, 0);
    const netTotal = Math.max(0, itemsTotal - data.advanceDeducted);

    const totalPaid = data.paidCash + data.paidUpi + data.paidBank;
    const isFullyPaid = totalPaid >= netTotal && netTotal > 0;
    const finalStatus = isFullyPaid ? InvoiceStatus.PAID : (data.status as InvoiceStatus);

    await prisma.$transaction(async (tx) => {
      // 1. Delete old line items and re-insert updated custom amounts
      await tx.invoiceItem.deleteMany({
        where: { invoiceId: data.invoiceId },
      });

      // 2. Update Invoice
      await tx.invoice.update({
        where: { id: data.invoiceId },
        data: {
          billNumber: data.billNumber,
          advanceDeducted: data.advanceDeducted,
          paidCash: data.paidCash,
          paidUpi: data.paidUpi,
          paidBank: data.paidBank,
          totalAmount: netTotal,
          status: finalStatus,
          notes: data.notes || null,
          paidAt: isFullyPaid ? new Date() : null,
          items: {
            create: data.items.map(item => ({
              itemKey: item.itemKey,
              malayalamName: item.malayalamName || null,
              description: item.description,
              quantity: item.quantity,
              rate: item.rate,
              total: item.total,
            })),
          },
        },
      });

      // 3. If Cash was collected as part of split payment, log a CashCollection for physical safe verification!
      if (data.paidCash > 0) {
        const inv = await tx.invoice.findUnique({ where: { id: data.invoiceId }, include: { dispatches: true } });
        if (inv && inv.dispatches.length > 0) {
          const firstDispatch = inv.dispatches[0];
          const existingCash = await tx.cashCollection.findFirst({
            where: { dispatchId: firstDispatch.id, amountCollected: data.paidCash },
          });
          if (!existingCash) {
            const staffEmp = await tx.employee.findFirst({
              where: { userId: session.user.id },
            });
            await tx.cashCollection.create({
              data: {
                operatorId: firstDispatch.operatorId || staffEmp?.id || firstDispatch.driverId || "UNKNOWN",
                dispatchId: firstDispatch.id,
                amountCollected: data.paidCash,
                date: new Date(),
                status: "PENDING_DEPOSIT",
                notes: `Split Cash Payment on Bill #${data.billNumber}`,
              },
            });
          }
        }
      }
    });

    revalidatePath("/admin/billing");
    revalidatePath(`/admin/billing/${data.invoiceId}`);
    revalidatePath("/admin/dashboard");
    return { success: true };
  } catch (err: any) {
    console.error("Error updating bill:", err);
    return { success: false, error: err.message || "Failed to update bill." };
  }
}
