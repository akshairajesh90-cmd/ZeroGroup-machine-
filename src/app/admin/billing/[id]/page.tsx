import React from "react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import BillSlipClient from "./BillSlipClient";

export const dynamic = "force-dynamic";

export default async function BillSlipPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user || (session.user.role !== "OWNER" && session.user.role !== "STAFF")) {
    redirect("/");
  }

  const { id } = await params;

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      customer: true,
      items: {
        orderBy: { id: "asc" },
      },
      dispatches: {
        include: {
          machine: true,
          operator: true,
          driver: true,
          mainHelper: true,
          dispatchMachines: {
            include: { machine: true },
          },
          dispatchTools: {
            include: { tool: true },
          },
        },
      },
    },
  });

  if (!invoice) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 md:p-6 pb-20">
      <div className="max-w-5xl mx-auto">
        <BillSlipClient invoice={invoice} userRole={session.user.role} />
      </div>
    </div>
  );
}
