import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import TrashClientPage from "./TrashClientPage";

export const dynamic = "force-dynamic";

export default async function AdminTrashPage() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "OWNER" && session.user.role !== "ADMIN")) {
    redirect("/");
  }

  const [
    deletedEmployees,
    deletedReceipts,
    deletedMachines,
    deletedVehicles,
    deletedTools,
    deletedExpenses
  ] = await Promise.all([
    prisma.employee.findMany({
      where: { isPendingDelete: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.paymentReceipt.findMany({
      where: { isPendingDelete: true },
      include: { customer: true, collector: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.machine.findMany({
      where: { isPendingDelete: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.vehicle.findMany({
      where: { isPendingDelete: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.tool.findMany({
      where: { isPendingDelete: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.expense.findMany({
      where: { isPendingDelete: true },
      include: { logger: true },
      orderBy: { updatedAt: "desc" },
    })
  ]);

  const serializedEmployees = deletedEmployees.map((emp) => ({
    id: emp.id,
    type: "EMPLOYEE" as const,
    title: emp.name,
    subtitle: `${emp.role} • ${emp.phone || "No phone"}`,
    deletedAt: emp.updatedAt.toISOString(),
    deletedBy: emp.markedForDeleteBy,
  }));

  const serializedReceipts = deletedReceipts.map((rec) => ({
    id: rec.id,
    type: "RECEIPT" as const,
    title: `Receipt #${rec.receiptNumber} — ₹${Number(rec.amount).toLocaleString("en-IN")}`,
    subtitle: `Customer: ${rec.customer.name} • Collector: ${rec.collector?.name ?? "Unknown"}`,
    deletedAt: rec.updatedAt.toISOString(),
    deletedBy: rec.markedForDeleteBy,
  }));

  const serializedMachines = deletedMachines.map((m) => ({
    id: m.id,
    type: "MACHINE" as const,
    title: `Machine ${m.machineId} (${m.type})`,
    subtitle: `Status: ${m.status} • Payout: ₹${Number(m.operatorDailyPayout).toLocaleString("en-IN")}`,
    deletedAt: m.updatedAt.toISOString(),
    deletedBy: m.markedForDeleteBy,
  }));

  const serializedVehicles = deletedVehicles.map((v) => ({
    id: v.id,
    type: "VEHICLE" as const,
    title: `Vehicle ${v.licensePlate} (${v.type})`,
    subtitle: `Status: ${v.status}`,
    deletedAt: v.updatedAt.toISOString(),
    deletedBy: v.markedForDeleteBy,
  }));

  const serializedTools = deletedTools.map((t) => ({
    id: t.id,
    type: "TOOL" as const,
    title: `Tool: ${t.name} (${t.toolId})`,
    subtitle: `Total Inventory: ${t.totalInventory} units • Status: ${t.status}`,
    deletedAt: t.updatedAt.toISOString(),
    deletedBy: t.markedForDeleteBy,
  }));

  const serializedExpenses = deletedExpenses.map((exp) => ({
    id: exp.id,
    type: "EXPENSE" as const,
    title: `Expense: ${exp.category} — ₹${Number(exp.amount).toLocaleString("en-IN")}`,
    subtitle: `${exp.description || "No description"} • Logged by: ${exp.logger?.name ?? "Staff"}`,
    deletedAt: exp.updatedAt.toISOString(),
    deletedBy: exp.markedForDeleteBy,
  }));

  const trashItems = [
    ...serializedEmployees,
    ...serializedReceipts,
    ...serializedMachines,
    ...serializedVehicles,
    ...serializedTools,
    ...serializedExpenses
  ].sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());

  return <TrashClientPage trashItems={trashItems} />;
}
