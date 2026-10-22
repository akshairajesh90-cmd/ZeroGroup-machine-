import React from "react";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/serverAuth";
import ChatClient from "./ChatClient";

export const dynamic = "force-dynamic";

export default async function CrewDirectoryPage() {
  const currentUser = await requireAuth();

  // Fetch all employees for the directory
  const employees = await prisma.employee.findMany({
    where: {
      role: { in: ["OPERATOR", "DRIVER", "WORKER", "STAFF", "OWNER", "ADMIN"] },
      isPendingDelete: false,
    },
    include: {
      roleRates: true,
    },
    orderBy: [
      { role: "asc" },
      { name: "asc" }
    ]
  });

  const serialized = employees.map((e: any) => ({
    id: e.id,
    name: e.name,
    role: e.role,
    phone: e.phone ?? null,
    profilePhotoUrl: e.profilePhotoUrl ?? null,
    operatorType: e.operatorType || "INTERNAL",
    defaultCrewRole: e.defaultCrewRole || null,
    capableRoles: e.capableRoles || [],
    roleRates: (e.roleRates || []).map((rr: any) => ({
      id: rr.id,
      crewRole: rr.crewRole,
      wagePerDay: Number(rr.wagePerDay),
    })),
    baseDailyWage: e.baseDailyWage ? Number(e.baseDailyWage) : null,
    dailyBataRate: e.dailyBataRate ? Number(e.dailyBataRate) : null,
    lastLatitude: e.lastLatitude ? Number(e.lastLatitude) : null,
    lastLongitude: e.lastLongitude ? Number(e.lastLongitude) : null,
    lastLocationUpdate: e.lastLocationUpdate ? e.lastLocationUpdate.toISOString() : null,
    lastSeenAt: e.lastSeenAt ? e.lastSeenAt.toISOString() : null,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  }));

  return (
    <div className="h-full min-h-[500px] overflow-hidden flex flex-col">
      <ChatClient employees={serialized} currentUserEmployeeId={currentUser.employeeId} />
    </div>
  );
}
