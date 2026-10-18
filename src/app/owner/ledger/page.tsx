import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/serverAuth";
import { Role } from "@prisma/client";
import OwnerLedgerClient, { 
  CashFlowInflow, 
  CashFlowOutflow, 
  WeeklyAdvanceItem 
} from "./OwnerLedgerClient";

export const dynamic = "force-dynamic";

export default async function OwnerWeeklyLedgerPage() {
  await requireAuth({ allowedRoles: [Role.OWNER, Role.ADMIN] });

  // 1. Fetch Payment Receipts (Money In / Collections)
  const receipts = await prisma.paymentReceipt.findMany({
    orderBy: { paymentDate: "desc" },
    include: {
      customer: { select: { name: true } },
      collector: { select: { name: true } },
    },
    take: 300,
  });

  const inflows: CashFlowInflow[] = receipts.map((r) => ({
    id: r.id,
    date: r.paymentDate.toISOString(),
    amount: Number(r.amount),
    paymentMethod: r.paymentMethod,
    customerName: r.customer?.name || "Customer",
    notes: r.notes,
    collectorName: r.collector?.name || "Staff",
  }));

  // 2. Fetch Expenses (Money Out)
  const expenses = await prisma.expense.findMany({
    orderBy: { date: "desc" },
    include: {
      logger: { select: { name: true } },
      employee: { select: { name: true, role: true } },
      contractor: { select: { name: true } },
      machine: { select: { machineId: true } },
      vehicle: { select: { licensePlate: true } },
      tool: { select: { toolId: true } },
    },
    take: 300,
  });

  const outflows: CashFlowOutflow[] = expenses.map((e) => {
    // Parse payment mode from notes if recorded
    let paymentMode = "CASH";
    const paymentMatch = e.notes?.match(/\[PAYMENT:\s*([A-Z]+)\]/);
    if (paymentMatch) {
      paymentMode = paymentMatch[1];
    } else if (e.notes?.includes("Payment Method: BANK") || e.notes?.includes("Payment Method: UPI")) {
      paymentMode = "UPI";
    }

    // Combined split rupees parsing (e.g. "(Cash: ₹1,000 | Bank/UPI: ₹1,500)")
    let splitDetails: string | null = null;
    const splitMatch = e.notes?.match(/\(Cash:\s*₹([0-9.,]+)\s*\|\s*Bank\/UPI:\s*₹([0-9.,]+)\)/i);
    if (splitMatch) {
      splitDetails = `Cash: ₹${splitMatch[1]} + GPay: ₹${splitMatch[2]}`;
    }

    // Receipt URL
    let receiptUrl: string | null = null;
    const receiptMatch = e.notes?.match(/\[RECEIPT_ATTACHED:\s*([^\]]+)\]/);
    if (receiptMatch) receiptUrl = receiptMatch[1];

    // Determine Recipient
    let recipientName = e.logger.name;
    if (e.employee) recipientName = `${e.employee.name} (Staff)`;
    else if (e.contractor) recipientName = `${e.contractor.name} (Contractor)`;

    // Asset Tag
    let assetTag: string | null = null;
    if (e.machine) assetTag = `Machine: ${e.machine.machineId}`;
    else if (e.vehicle) assetTag = `Vehicle: ${e.vehicle.licensePlate}`;
    else if (e.tool) assetTag = `Tool: ${e.tool.toolId}`;

    return {
      id: e.id,
      date: e.date.toISOString(),
      amount: Number(e.amount),
      category: e.category,
      description: e.description,
      notes: e.notes,
      paymentMode,
      splitDetails,
      recipientName,
      assetTag,
      receiptUrl,
    };
  });

  // 3. Fetch Salary Advances (Pending Payroll Deductions)
  const advances = await prisma.salaryAdvance.findMany({
    where: { status: "PENDING" },
    orderBy: { date: "desc" },
    include: {
      employee: { select: { name: true, role: true } },
    },
    take: 100,
  });

  const weeklyAdvances: WeeklyAdvanceItem[] = advances.map((a) => ({
    id: a.id,
    date: a.date.toISOString(),
    amount: Number(a.amount),
    employeeName: a.employee.name,
    employeeRole: a.employee.role,
    notes: a.notes,
  }));

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-4 pb-12">
      <OwnerLedgerClient
        initialInflows={inflows}
        initialOutflows={outflows}
        initialAdvances={weeklyAdvances}
      />
    </div>
  );
}
