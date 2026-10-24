import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import DriversClientPage from "./DriversClientPage";
export const dynamic = "force-dynamic";

export default async function StaffDRIVERsPage() {
  const session = await auth();
  if (!session?.user || !["STAFF", "ADMIN", "OWNER"].includes(session.user.role ?? "")) {
    redirect("/");
  }

  const DRIVERs = await prisma.employee.findMany({
    where: { role: "DRIVER", isPendingDelete: false },
    include: { roleRates: true },
    orderBy: { createdAt: "desc" },
  });

  const serialized = DRIVERs.map((w: any) => ({
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

  return <DriversClientPage Drivers={serialized} />;
}
