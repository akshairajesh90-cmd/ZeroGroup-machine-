import React from 'react';
import { prisma } from '@/lib/prisma';
import { auth } from '@/lib/auth';
import { redirect } from 'next/navigation';
import SettlementClient from './SettlementClient';

export default async function SettlementsPage() {
  const session = await auth();
  if (!session?.user) redirect('/login');

  // Fetch all Players (Operators, Mestris, Workers, Drivers)
  const operators = await prisma.employee.findMany({
    orderBy: { name: 'asc' },
  });

  // Fetch all pending manual adjustments
  const pendingAdjustments = await prisma.manualAdjustment.findMany({
    where: { status: 'PENDING' },
    include: {
      employee: true,
      createdBy: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  // Fetch all recent settlements
  const recentSettlements = await prisma.settlement.findMany({
    include: {
      operator: true,
      finalizedBy: true,
    },
    orderBy: { weekEnding: 'desc' },
    take: 20,
  });

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">
            Module B: Weekend Settlement & Payroll Hub
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Zero Group Field-Hardened Payroll Formula: <span className="font-mono text-amber-400 font-bold">Payout = (Labor Earned + APPROVED Bonuses) - (Penalties + Cash Held + Advances)</span>
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-slate-300">
            Role: <strong className="text-amber-400">{session.user.role}</strong>
          </span>
        </div>
      </div>

      <SettlementClient
        operators={JSON.parse(JSON.stringify(operators))}
        pendingAdjustments={JSON.parse(JSON.stringify(pendingAdjustments))}
        recentSettlements={JSON.parse(JSON.stringify(recentSettlements))}
        userRole={session.user.role}
      />
    </div>
  );
}
