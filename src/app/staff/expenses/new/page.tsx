import NewExpenseForm from "@/components/forms/NewExpenseForm";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function AdminNewExpensePage() {
  const machines = await prisma.machine.findMany({ select: { id: true, machineId: true, type: true } });
  const vehicles = await prisma.vehicle.findMany({ select: { id: true, licensePlate: true, type: true } });
  const employees = await prisma.employee.findMany({ select: { id: true, name: true, role: true } });
  const contractors = await prisma.contractor.findMany({ select: { id: true, name: true, companyName: true } });
  const tools = await prisma.tool.findMany({ select: { id: true, toolId: true, toolType: true } });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <NewExpenseForm 
        machines={machines}
        vehicles={vehicles}
        employees={employees}
        contractors={contractors}
        tools={tools}
      />
    </div>
  );
}
