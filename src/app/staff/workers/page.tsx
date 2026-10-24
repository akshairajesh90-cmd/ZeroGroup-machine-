import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import WorkersClientPage from "./WorkersClientPage";
export const dynamic = "force-dynamic";

export default async function StaffWorkersPage() {
  const session = await auth();
  if (!session?.user || !["STAFF", "ADMIN", "OWNER"].includes(session.user.role ?? "")) {
    redirect("/");
  }

  const workers = await prisma.employee.findMany({
    where: { role: "WORKER", isPendingDelete: false },
    include: { roleRates: true },
    orderBy: { createdAt: "desc" },
  });

  const serialized = workers.map((w: any) => ({
    id: w.id,
    name: w.name,
    phone: w.phone ?? null,
    role: w.role,
    baseDailyWage: w.baseDailyWage || 0,
    capableRoles: w.capableRoles || [],
    roleRates: w.roleRates || [],
    isActive: w.isActive ?? true,
    createdAt: w.createdAt.toISOString(),
  }));

  return <WorkersClientPage workers={serialized} />;
}
