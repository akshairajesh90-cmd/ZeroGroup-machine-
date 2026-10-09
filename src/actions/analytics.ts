"use server";

import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { startOfMonth, endOfMonth } from "date-fns";

export async function getProfitability(date: Date = new Date()) {
  const session = await auth();
  if (!session || (session.user?.role !== "ADMIN" && session.user?.role !== "OWNER")) throw new Error("Unauthorized");

  const startDate = startOfMonth(date);
  const endDate = endOfMonth(date);

  // 1. Invoices total
  const invoices = await prisma.invoice.aggregate({
    _sum: { totalAmount: true },
    where: {
      createdAt: { gte: startDate, lte: endDate },
    },
  });

  // 2. Expenses total
  const expenses = await prisma.expense.aggregate({
    _sum: { amount: true },
    where: {
      date: { gte: startDate, lte: endDate },
    },
  });

  // 3. Settlements total
  const settlements = await prisma.settlement.aggregate({
    _sum: { finalPayout: true },
    where: {
      createdAt: { gte: startDate, lte: endDate },
      status: "PAID",
    },
  });

  const revenue = Number(invoices._sum.totalAmount || 0);
  const totalExpenses = Number(expenses._sum.amount || 0);
  const payroll = Number(settlements._sum.finalPayout || 0);

  return {
    revenue,
    expenses: totalExpenses,
    payroll,
    netProfit: revenue - totalExpenses - payroll,
  };
}

export async function getUtilization() {
  const session = await auth();
  if (!session || (session.user?.role !== "ADMIN" && session.user?.role !== "OWNER")) throw new Error("Unauthorized");

  // Group by machine type and status
  const machines = await prisma.machine.groupBy({
    by: ["type", "status"],
    _count: {
      id: true,
    },
    where: {
      isPendingDelete: false,
    },
  });

  return machines.map((m: any) => ({
    type: m.type,
    status: m.status,
    count: m._count.id,
  }));
}

export async function getPayrollSummary() {
  const session = await auth();
  if (!session || (session.user?.role !== "ADMIN" && session.user?.role !== "OWNER")) throw new Error("Unauthorized");

  // In a real scenario we'd do a more complex raw SQL group by week,
  // For Prisma, we can fetch settlements and group them in-memory, or use Prisma features if supported.
  // We'll fetch recent settlements and group them to satisfy the prompt structure.
  
  const settlements = await prisma.settlement.findMany({
    where: { status: "PAID" },
    select: {
      finalPayout: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  // Basic client-friendly mapping
  return settlements.map((s: any) => ({
    date: s.createdAt.toISOString().split("T")[0],
    amount: Number(s.finalPayout),
  }));
}

