import React from "react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import DispatchBoardClient from "./DispatchBoardClient";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DispatchPage() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "OWNER" && session.user.role !== "STAFF" && session.user.role !== "ADMIN")) {
    redirect("/");
  }

  // Fetch all required data for the dispatch board
  const [dispatches, customers, machines, employees, tools, subLeaders, vehicles] = await Promise.all([
    prisma.dailyDispatch.findMany({
      include: {
        customer: true,
        machine: true,
        vehicle: true,
        driver: true,
        operator: true,
        worker: true,
        mainHelper: true,
        invoice: true,
        siteDisbursements: { include: { subLeader: true } },
        dispatchMachines: {
          include: { machine: true },
        },
        dispatchTools: {
          include: { tool: true },
        },
        crewAssignments: {
          include: {
            employee: { select: { id: true, name: true, role: true, profilePhotoUrl: true, phone: true, operatorType: true } },
            contractor: { select: { id: true, name: true, companyName: true } },
          },
        },
      },
      orderBy: { dateOfService: "desc" },
    }),
    prisma.customer.findMany({ orderBy: { name: "asc" } }),
    prisma.machine.findMany({ where: { status: "AVAILABLE" }, orderBy: { machineId: "asc" } }),
    prisma.employee.findMany({ 
      orderBy: { name: "asc" },
      include: { roleRates: true }
    }),
    prisma.tool.findMany({ where: { status: 'AVAILABLE' }, orderBy: { toolId: 'asc' } }),
    prisma.externalSubLeader.findMany({ orderBy: { name: 'asc' } }),
    prisma.vehicle.findMany({ where: { isPendingDelete: false, status: { not: "RETIRED" } }, orderBy: { licensePlate: 'asc' } }),
  ]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 pb-20">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/dashboard"
            className="w-10 h-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-black text-white tracking-tight">Daily Dispatch Command Center</h1>
            <p className="text-xs text-slate-400">Module A — Heartbeat of Construction Operations</p>
          </div>
        </div>

        <DispatchBoardClient
          initialDispatches={JSON.parse(JSON.stringify(dispatches))}
          customers={JSON.parse(JSON.stringify(customers))}
          machines={JSON.parse(JSON.stringify(machines))}
          employees={JSON.parse(JSON.stringify(employees))}
          tools={JSON.parse(JSON.stringify(tools))}
          subLeaders={JSON.parse(JSON.stringify(subLeaders))}
          vehicles={JSON.parse(JSON.stringify(vehicles))}
          userRole={session.user.role}
        />
      </div>
    </div>
  );
}


