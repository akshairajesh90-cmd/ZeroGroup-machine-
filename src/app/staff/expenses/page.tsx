import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/serverAuth";
import { Role } from "@prisma/client";
import ExpensesClient, { ExpenseRecord } from "./ExpensesClient";

export const dynamic = "force-dynamic";

export default async function AdminExpensesPage() {
  await requireAuth({ allowedRoles: [Role.OWNER, Role.STAFF, Role.ADMIN] });

  const rawExpenses = await prisma.expense.findMany({
    where: { isPendingDelete: false },
    orderBy: { date: "desc" },
    include: {
      logger: { select: { name: true, role: true } },
      machine: { select: { machineId: true, type: true } },
      vehicle: { select: { licensePlate: true, type: true } },
      tool: { select: { toolId: true, toolType: true } },
      employee: { select: { name: true, role: true } },
      contractor: { select: { name: true, companyName: true } },
      dispatch: { select: { id: true, location: true, dateOfService: true, customer: { select: { name: true } } } },
    },
    take: 200,
  });

  // Serialize Decimals and Dates for Client Component
  const serializedExpenses: ExpenseRecord[] = rawExpenses.map((e) => ({
    id: e.id,
    date: e.date.toISOString(),
    amount: Number(e.amount),
    category: e.category,
    description: e.description,
    notes: e.notes,
    logger: {
      name: e.logger?.name || "System",
      role: e.logger?.role || "STAFF",
    },
    machine: e.machine ? { machineId: e.machine.machineId, type: e.machine.type } : null,
    vehicle: e.vehicle ? { licensePlate: e.vehicle.licensePlate, type: e.vehicle.type } : null,
    tool: e.tool ? { toolId: e.tool.toolId, toolType: e.tool.toolType } : null,
    employee: e.employee ? { name: e.employee.name, role: e.employee.role } : null,
    contractor: e.contractor ? { name: e.contractor.name, companyName: e.contractor.companyName } : null,
    dispatch: e.dispatch ? {
      id: e.dispatch.id,
      location: e.dispatch.location,
      dateOfService: e.dispatch.dateOfService.toISOString().split("T")[0],
      customer: e.dispatch.customer ? { name: e.dispatch.customer.name } : null,
    } : null,
  }));

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-4 pb-12">
      <ExpensesClient initialExpenses={serializedExpenses} />
    </div>
  );
}
