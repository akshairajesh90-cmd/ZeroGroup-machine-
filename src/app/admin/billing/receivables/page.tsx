import { prisma } from "@/lib/prisma";
import ReceivablesClient from "./ReceivablesClient";
import { InvoiceStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

export default async function ReceivablesPage() {
  const invoices = await prisma.invoice.findMany({
    include: {
      customer: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-black tracking-tight text-slate-900">Billing & Receivables</h1>
        <p className="text-slate-500 mt-2">Manage all invoices, track outstanding balances, and log delayed payments.</p>
      </div>

      <ReceivablesClient initialInvoices={invoices} />
    </div>
  );
}
