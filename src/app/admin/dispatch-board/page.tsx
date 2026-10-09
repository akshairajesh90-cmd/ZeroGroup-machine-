import React from "react";
import { getBoardDispatches } from "@/actions/board";
import CalendarBoard from "@/components/dashboard/CalendarBoard";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay } from "date-fns";

export default async function DispatchBoardPage({
  searchParams,
}: {
  searchParams: { date?: string };
}) {
  const session = await auth();
  if (!session || (session.user?.role !== "ADMIN" && session.user?.role !== "STAFF" && session.user?.role !== "OWNER")) {
    redirect("/");
  }

  // Define date range: default to today
  const targetDate = searchParams.date ? new Date(searchParams.date) : new Date();
  const start = startOfDay(targetDate);
  const end = endOfDay(targetDate);

  // Fetch initial data
  const dispatches = await getBoardDispatches(start, end);
  
  // Fetch machines to use as resources in the calendar
  const machines = await prisma.machine.findMany({
    where: {
      isPendingDelete: false,
    },
    select: {
      id: true,
      machineId: true,
      type: true,
    },
  });

  return (
    <div className="p-6 space-y-6 bg-slate-50 min-h-screen">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Real-time Dispatch Board</h1>
        <p className="text-sm text-gray-500 mt-1">
          Drag and drop assignments to reschedule dispatch blocks across machines.
        </p>
      </div>

      <CalendarBoard initialDispatches={dispatches} machines={machines} />
    </div>
  );
}

