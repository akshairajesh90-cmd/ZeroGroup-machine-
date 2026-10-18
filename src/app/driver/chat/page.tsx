import React from "react";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/serverAuth";
import ChatClient from "./ChatClient";

export default async function CrewDirectoryPage() {
  const currentUser = await requireAuth();

  // Fetch all employees for the directory
  const employees = await prisma.employee.findMany({
    where: {
      role: { in: ["OPERATOR", "DRIVER", "WORKER", "STAFF", "OWNER", "ADMIN"] }
    },
    orderBy: [
      { role: "asc" },
      { name: "asc" }
    ]
  });

  return (
    <div className="h-[calc(100vh-6rem)] overflow-hidden">
      <ChatClient employees={employees.map((e: any) => ({ ...e, baseDailyWage: e.baseDailyWage ? e.baseDailyWage.toNumber() : 0, createdAt: e.createdAt.toISOString(), updatedAt: e.updatedAt.toISOString(), lastLocationUpdate: e.lastLocationUpdate ? e.lastLocationUpdate.toISOString() : null, lastSeenAt: e.lastSeenAt ? e.lastSeenAt.toISOString() : null }))} currentUserEmployeeId={currentUser.employeeId} />
    </div>
  );
}
