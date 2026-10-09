import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import OperatorsClientPage from "./OperatorsClientPage";
export const dynamic = "force-dynamic";

export default async function StaffOperatorsPage() {
  const session = await auth();
  if (!session?.user || !["STAFF", "ADMIN", "OWNER"].includes(session.user.role ?? "")) {
    redirect("/");
  }

  const operators = await prisma.employee.findMany({
    where: { role: "OPERATOR", isPendingDelete: false },
    orderBy: { createdAt: "desc" },
  });

  const serialized = operators.map((op: any) => ({
    id: op.id,
    name: op.name,
    operatorType: op.operatorType || "INTERNAL",
    contractorCoName: op.contractorCoName || null,
    phone: op.phone ?? null,
    role: op.role,
    createdAt: op.createdAt.toISOString(),
  }));

  return <OperatorsClientPage operators={serialized} />;
}


