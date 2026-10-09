import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/serverAuth";
import { Role } from "@prisma/client";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import CashClient from "./CashClient";

export const dynamic = "force-dynamic";

export default async function AdminCashPage() {
  await requireAuth({ allowedRoles: [Role.OWNER, Role.STAFF, Role.ADMIN] });

  // Fetch pending receipts
  const rawDrops = await prisma.paymentReceipt.findMany({
    where: { depositStatus: "PENDING_DEPOSIT" },
    include: {
      collector: { select: { name: true } },
      customer: { select: { name: true } }
    },
    orderBy: { paymentDate: "asc" }
  });

  // Fetch associated dispatches for discrepancy checks (Short Payment & Missing Cargo)
  const dispatchIds = rawDrops.map((d) => d.dispatchId).filter(Boolean) as string[];
  const dispatches = await prisma.dailyDispatch.findMany({
    where: { id: { in: dispatchIds } },
    include: {
      dispatchTools: { include: { tool: true } }
    }
  });

  // Attach discrepancy indicators to drops
  const drops = rawDrops.map((drop) => {
    const dispatch = dispatches.find((d) => d.id === drop.dispatchId);
    let discrepancy = null;

    if (dispatch) {
      const expectedCharge = Number(dispatch.customerCharge || 0);
      const collectedAmount = Number(drop.amount);
      const isShortPaid = collectedAmount < expectedCharge;

      const plannedToolIds = dispatch.dispatchTools.map((dt) => dt.toolId);
      const deliveredToolIds = dispatch.deliveredToolIds || [];
      const isCargoMismatch = plannedToolIds.some((id) => !deliveredToolIds.includes(id));

      if (isShortPaid || isCargoMismatch) {
        discrepancy = {
          isShortPaid,
          expectedCharge,
          collectedAmount,
          isCargoMismatch,
          plannedTools: dispatch.dispatchTools.map((dt) => `${dt.quantity}x ${dt.tool.name}`).join(", "),
          deliveredToolsCount: deliveredToolIds.length,
          plannedToolsCount: plannedToolIds.length
        };
      }
    }

    return {
      ...JSON.parse(JSON.stringify(drop)),
      discrepancy
    };
  });

  const customers = await prisma.customer.findMany({
    select: { id: true, name: true, phone: true },
    orderBy: { name: "asc" }
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/staff/dashboard" className="text-zinc-500 hover:text-white flex items-center gap-2 text-sm font-bold mb-2 w-max">
            <ArrowLeft className="h-4 w-4" /> Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-white tracking-tight">Cash & Receipts</h1>
          <p className="text-zinc-400 mt-2">Track internal collections, bank deposits, and reconcile field payment discrepancies.</p>
        </div>
      </div>

      <CashClient drops={drops} customers={customers} />
    </div>
  );
}
