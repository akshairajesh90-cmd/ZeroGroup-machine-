import { requireAuth } from "@/lib/serverAuth";
import { Role } from "@prisma/client";
import { getCustomerBalances, getInvoices } from "@/actions/receivables";
import InvoicesDashboard from "./InvoicesDashboard";

export const dynamic = "force-dynamic";

export default async function InvoicesPage() {
  await requireAuth({ allowedRoles: [Role.OWNER, Role.STAFF, Role.ADMIN] });

  const balancesRes = await getCustomerBalances();
  const invoicesRes = await getInvoices();

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 bg-slate-950 min-h-screen">
      <div>
        <h1 className="text-3xl font-black text-white tracking-tight">Accounts Receivable</h1>
        <p className="text-slate-400 text-sm mt-1">
          Manage customer balances, view outstanding invoices, and generate statements.
        </p>
      </div>

      <InvoicesDashboard 
        customerBalances={balancesRes.success ? balancesRes.data || [] : []} 
        invoices={invoicesRes.success ? invoicesRes.data || [] : []} 
      />
    </div>
  );
}
