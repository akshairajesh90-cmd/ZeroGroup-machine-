import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/serverAuth";
import { Role } from "@prisma/client";
import SettlementDashboard from "./SettlementDashboard";

export const dynamic = "force-dynamic";

export default async function SettlementsPage() {
  await requireAuth({ allowedRoles: [Role.OWNER, Role.STAFF, Role.ADMIN] });

  const employees = await prisma.employee.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, role: true },
  });

  const contractors = await prisma.contractor.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, companyName: true },
  });

  return (
    <div className="p-4 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Weekly Settlements & Payroll</h1>
        <p className="text-zinc-400 text-sm">
          Calculate final payouts and lock ledgers for internal staff or contractor crews.
        </p>
      </div>

      <SettlementDashboard employees={employees} contractors={contractors} />
    </div>
  );
}
