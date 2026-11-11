import React from "react";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/serverAuth";
import { resolveValidSenderId } from "@/actions/chat";
import ChatClient from "@/app/staff/directory/ChatClient";

export const dynamic = "force-dynamic";

export default async function AdminChatPage() {
  const currentUser = await requireAuth({ allowedRoles: ["OWNER", "ADMIN"] });
  const currentEmployeeId = await resolveValidSenderId(
    currentUser.employeeId,
    currentUser.userId,
    currentUser.role
  );

  // Fetch all active employees for directory & mentions
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
      { name: "asc" },
    ],
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
    baseDailyWage: e.baseDailyWage ? Number(e.baseDailyWage) : null,
    dailyBataRate: e.dailyBataRate ? Number(e.dailyBataRate) : null,
    lastSeenAt: e.lastSeenAt ? e.lastSeenAt.toISOString() : null,
  }));

  return (
    <div className="h-[calc(100dvh-9rem)] min-h-[560px] max-h-[calc(100dvh-6rem)] w-full overflow-hidden flex flex-col">
      <ChatClient employees={serialized} currentUserEmployeeId={currentEmployeeId} />
    </div>
  );
}
