import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import NewDispatchForm from "@/components/forms/NewDispatchForm";

export default async function AdminNewDispatchPage() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "OWNER" && session.user.role !== "STAFF" && session.user.role !== "ADMIN")) {
    redirect("/");
  }
  const customers = await prisma.customer.findMany({
    where: { isPendingDelete: false },
    select: { id: true, name: true, phone: true },
    orderBy: { name: 'asc' }
  });

  const _machines = await prisma.machine.findMany({
    where: { status: "AVAILABLE", isPendingDelete: false },
    select: { id: true, machineId: true, type: true },
    orderBy: { machineId: 'asc' }
  });
  const machines = _machines.map(m => ({ id: m.id, name: m.machineId, type: m.type }));

  const employees = await prisma.employee.findMany({
    where: { 
      isPendingDelete: false,
      OR: [
        { role: { in: ["DRIVER", "OPERATOR", "WORKER", "STAFF"] } },
        { isOwner_ExcludeFromPayroll: true }
      ]
    },
    select: { id: true, name: true, role: true },
    orderBy: { name: 'asc' }
  });

  const tools = await prisma.tool.findMany({
    where: { status: "AVAILABLE", isPendingDelete: false },
    orderBy: { name: 'asc' }
  });

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <NewDispatchForm 
        customers={customers}
        machines={machines}
        employees={employees}
        tools={tools}
      />
    </div>
  );
}
