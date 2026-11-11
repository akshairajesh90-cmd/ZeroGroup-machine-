import React from "react";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/serverAuth";
import { resolveValidSenderId } from "@/actions/chat";
import ChatClient from "@/app/driver/chat/ChatClient";

export const dynamic = "force-dynamic";

export default async function OperatorChatPage() {
  const currentUser = await requireAuth({ allowedRoles: ["OPERATOR", "STAFF", "ADMIN", "OWNER"] });
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
    select: {
      id: true,
      name: true,
      role: true,
      phone: true,
      profilePhotoUrl: true,
      employeeCode: true,
    },
    orderBy: [
      { role: "asc" },
      { name: "asc" },
    ],
  });

  return (
    <div className="h-[calc(100dvh-11.5rem)] w-full overflow-hidden flex flex-col">
      <ChatClient
        employees={employees}
        currentUserEmployeeId={currentEmployeeId}
      />
    </div>
  );
}
