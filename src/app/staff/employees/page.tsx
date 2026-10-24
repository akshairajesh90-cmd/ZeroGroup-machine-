import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import EmployeesClientPage from "./EmployeesClientPage";
export const dynamic = "force-dynamic";

export default async function StaffEmployeesPage() {
  const session = await auth();
  if (!session?.user || !["STAFF", "ADMIN", "OWNER"].includes(session.user.role ?? "")) {
    redirect("/");
  }

  const employees = await prisma.employee.findMany({
    where: { role: { in: ["STAFF", "ADMIN", "OWNER"] }, isPendingDelete: false },
    orderBy: { createdAt: "desc" },
  });

  const serialized = employees.map((emp: any) => ({
    id: emp.id,
    name: emp.name,
    email: emp.email,
    phone: emp.phone ?? null,
    role: emp.role,
    fixedSalary: emp.fixedSalary || 0,
    isActive: emp.isActive ?? true,
    createdAt: emp.createdAt.toISOString(),
  }));

  return <EmployeesClientPage employees={serialized} />;
}
