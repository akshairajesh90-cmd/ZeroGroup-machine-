import { requireAuth } from "@/lib/serverAuth";
import { Role } from "@prisma/client";
import { getCustomerStatement } from "@/actions/receivables";
import CustomerStatement from "./CustomerStatement";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function CustomerStatementPage({ params }: { params: { customerId: string } }) {
  await requireAuth({ allowedRoles: [Role.OWNER, Role.STAFF, Role.ADMIN] });

  const statementRes = await getCustomerStatement(params.customerId);

  if (!statementRes.success || !statementRes.data) {
    redirect("/staff/invoices");
  }

  return (
    <div className="p-6 max-w-4xl mx-auto min-h-screen">
      <CustomerStatement data={statementRes.data} />
    </div>
  );
}
