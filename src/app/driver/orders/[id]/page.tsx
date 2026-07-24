import React from "react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import DriverOrderClient from "./DriverOrderClient";

export const dynamic = "force-dynamic";

interface OrderPageProps {
  params: Promise<{ id: string }>;
}

export default async function DriverOrderPage({ params }: OrderPageProps) {
  const session = await auth();
  if (!session?.user) {
    redirect("/");
  }

  const { id } = await params;

  const dispatch = await prisma.dailyDispatch.findUnique({
    where: { id },
    include: {
      customer: true,
      machine: true,
      driver: true,
      operator: true,
      worker: true,
      multiOperators: {
        include: { employee: true },
      },
      multiWorkers: {
        include: { employee: true },
      },
      dispatchTools: {
        include: { tool: true },
      },
    },
  });

  if (!dispatch) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 p-6 flex flex-col items-center justify-center text-center">
        <h2 className="text-xl font-bold text-white">Dispatch Order Not Found</h2>
        <p className="text-xs text-slate-400 mt-1">This shift may have been cancelled or re-assigned.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-5 pb-24">
      <div className="max-w-lg mx-auto space-y-6">
        <DriverOrderClient
          dispatch={JSON.parse(JSON.stringify(dispatch))}
          userRole={session.user.role}
        />
      </div>
    </div>
  );
}
