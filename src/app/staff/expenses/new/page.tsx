import NewExpenseForm from "@/components/forms/NewExpenseForm";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminNewExpensePage() {
  const machines = await prisma.machine.findMany({ select: { id: true, machineId: true, type: true } });
  const vehicles = await prisma.vehicle.findMany({ select: { id: true, licensePlate: true, type: true } });
  const employees = await prisma.employee.findMany({ select: { id: true, name: true, role: true } });
  const contractors = await prisma.contractor.findMany({ select: { id: true, name: true, companyName: true } });
  const tools = await prisma.tool.findMany({ select: { id: true, toolId: true, toolType: true } });
  const dispatches = await prisma.dailyDispatch.findMany({
    orderBy: { dateOfService: "desc" },
    take: 50,
    select: {
      id: true,
      location: true,
      dateOfService: true,
      customer: { select: { name: true } },
      machine: { select: { machineId: true } },
      operator: { select: { name: true } },
      helperCount: true,
      expenses: {
        where: { category: "OUTSIDE_HELPER_WAGE" },
        select: {
          id: true,
          amount: true,
          description: true,
          notes: true,
        },
      },
    },
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <NewExpenseForm 
        machines={machines}
        vehicles={vehicles}
        employees={employees}
        contractors={contractors}
        tools={tools}
        dispatches={dispatches.map((d) => {
          const helperEntries = d.expenses.map((e) => {
            const countMatch = e.description?.match(/(\d+)\s*Helpers?/i);
            const count = countMatch ? parseInt(countMatch[1], 10) : 0;
            return {
              id: e.id,
              amount: Number(e.amount),
              description: e.description || "",
              workerCount: count,
            };
          });
          const alreadyLoggedHelpers = helperEntries.reduce((sum, h) => sum + h.workerCount, 0);

          return {
            id: d.id,
            location: d.location,
            dateOfService: d.dateOfService.toISOString().split("T")[0],
            customerName: d.customer?.name || "Customer",
            machineId: d.machine?.machineId || null,
            operatorName: d.operator?.name || null,
            helperCount: d.helperCount,
            alreadyLoggedHelpers,
            previousHelperEntries: helperEntries,
          };
        })}
      />
    </div>
  );
}
