import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import TrashClientPage from "./TrashClientPage";

export const dynamic = "force-dynamic";

export default async function OwnerTrashPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "OWNER") {
    redirect("/");
  }

  const [deletedEmployees, deletedReceipts] = await Promise.all([
    prisma.employee.findMany({
      where: { isPendingDelete: true },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.paymentReceipt.findMany({
      where: { isPendingDelete: true },
      include: { customer: true, collector: true },
      orderBy: { updatedAt: "desc" },
    })
  ]);

  const serializedEmployees = deletedEmployees.map((emp) => ({
    id: emp.id,
    type: "EMPLOYEE" as const,
    title: emp.name,
    subtitle: `${emp.role} • ${emp.phone || "No phone"}`,
    deletedAt: emp.updatedAt.toISOString(),
  }));

  const serializedReceipts = deletedReceipts.map((rec) => ({
    id: rec.id,
    type: "RECEIPT" as const,
    title: `Receipt #${rec.receiptNumber} — ₹${Number(rec.amount).toLocaleString("en-IN")}`,
    subtitle: `Customer: ${rec.customer.name} • Collector: ${rec.collector?.name ?? "Unknown"}`,
    deletedAt: rec.updatedAt.toISOString(),
  }));

  const trashItems = [...serializedEmployees, ...serializedReceipts].sort(
    (a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime()
  );

  return <TrashClientPage trashItems={trashItems} />;
}
