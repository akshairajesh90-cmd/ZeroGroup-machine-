import React from "react";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/serverAuth";
import { Role } from "@prisma/client";
import CrewHubClient from "./CrewHubClient";

export const dynamic = "force-dynamic";

export default async function StaffCrewPage() {
  const currentUser = await requireAuth({ allowedRoles: [Role.OWNER, Role.ADMIN, Role.STAFF] });

  const [employees, workTypeRates] = await Promise.all([
    prisma.employee.findMany({
      where: {
        role: { in: [Role.OPERATOR, Role.DRIVER, Role.WORKER, Role.STAFF, Role.OWNER, Role.ADMIN] },
        isPendingDelete: false,
      },
      include: {
        roleRates: true,
      },
      orderBy: [
        { role: "asc" },
        { name: "asc" },
      ],
    }),
    prisma.workTypeRate.findMany({
      orderBy: [{ machineType: "asc" }, { workType: "asc" }],
    }),
  ]);

  const serializedEmployees = employees.map((e: any) => ({
    id: e.id,
    name: e.name,
    role: e.role,
    phone: e.phone ?? null,
    profilePhotoUrl: e.profilePhotoUrl ?? null,
    operatorType: e.operatorType || "INTERNAL",
    contractorCoName: e.contractorCoName || null,
    defaultCrewRole: e.defaultCrewRole || null,
    capableRoles: e.capableRoles || [],
    roleRates: (e.roleRates || []).map((rr: any) => ({
      id: rr.id,
      crewRole: rr.crewRole,
      wagePerDay: Number(rr.wagePerDay),
    })),
    baseDailyWage: e.baseDailyWage ? Number(e.baseDailyWage) : null,
    dailyBataRate: e.dailyBataRate ? Number(e.dailyBataRate) : null,
    lastSeenAt: e.lastSeenAt ? e.lastSeenAt.toISOString() : null,
    createdAt: e.createdAt.toISOString(),
  }));

  const serializedRates = workTypeRates.map((r: any) => ({
    id: r.id,
    machineType: r.machineType,
    workType: r.workType,
    payoutRate: Number(r.payoutRate),
    customerCharge: r.customerCharge ? Number(r.customerCharge) : null,
  }));

  return (
    <CrewHubClient
      employees={serializedEmployees}
      workTypeRates={serializedRates}
      currentUserEmployeeId={currentUser.employeeId || ""}
    />
  );
}
