import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/serverAuth";
import { Role } from "@prisma/client";
import { format } from "date-fns";
import Link from "next/link";
import { Receipt, Plus, Wrench, Fuel, Coffee, FileQuestion, ArrowLeft } from "lucide-react";
import StaffExternalLaborButton from "./StaffExternalLaborButton";

export const dynamic = "force-dynamic";

export default async function AdminExpensesPage() {
  await requireAuth({ allowedRoles: [Role.OWNER, Role.STAFF, Role.ADMIN] });

  const expenses = await prisma.expense.findMany({
    orderBy: { date: "desc" },
    include: {
      logger: { select: { name: true, role: true } },
      machine: { select: { machineId: true } },
      vehicle: { select: { licensePlate: true } },
      tool: { select: { toolId: true, toolType: true } },
      employee: { select: { name: true, role: true } },
      dispatch: { select: { id: true, customer: { select: { name: true } } } }
    },
    take: 100
  });

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case "DIESEL": return <Fuel className="h-4 w-4 text-blue-400" />;
      case "REPAIR": return <Wrench className="h-4 w-4 text-orange-400" />;
      case "TRAVEL": return <Coffee className="h-4 w-4 text-amber-400" />;
      case "RENT": return <Receipt className="h-4 w-4 text-emerald-400" />;
      case "PETTY_CASH": return <Coffee className="h-4 w-4 text-teal-400" />;
      case "WORKSHOP": return <Wrench className="h-4 w-4 text-indigo-400" />;
      default: return <FileQuestion className="h-4 w-4 text-zinc-400" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 px-4">
      <div className="flex items-center justify-between">
        <div>
          <Link href="/admin/dashboard" className="text-zinc-500 hover:text-white flex items-center gap-2 text-sm font-bold mb-2 w-max">
            <ArrowLeft className="h-4 w-4" /> Back to God Mode
          </Link>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <Receipt className="h-8 w-8 text-rose-500" /> Company Expenses
          </h1>
          <p className="text-zinc-400 mt-1">Track fuel, maintenance, advances, and operational costs.</p>
        </div>
        <div className="flex gap-3">
          <StaffExternalLaborButton />
          <Link 
            href="/staff/expenses/new" 
            className="flex items-center gap-2 bg-rose-600 hover:bg-rose-500 text-white px-5 py-3 rounded-xl font-bold transition-all shadow-lg shadow-rose-600/20"
          >
            <Plus className="h-5 w-5" /> New Expense
          </Link>
        </div>
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl overflow-hidden backdrop-blur-xl shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-400">
            <thead className="bg-zinc-900/80 text-xs uppercase font-bold text-zinc-500 border-b border-zinc-800">
              <tr>
                <th className="px-6 py-4">Date</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Amount</th>
                <th className="px-6 py-4">Description</th>
                <th className="px-6 py-4">Logged By</th>
                <th className="px-6 py-4">Tags (Machine / Staff / Tool)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/50">
              {expenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-zinc-500">No expenses recorded yet.</td>
                </tr>
              ) : (
                expenses.map(expense => (
                  <tr key={expense.id} className="hover:bg-zinc-800/30 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-bold text-white">{format(new Date(expense.date), "dd MMM yyyy")}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-zinc-800 border border-zinc-700/50 text-zinc-300">
                        {getCategoryIcon(expense.category)}
                        {expense.category.replace(/_/g, ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-black text-rose-400">₹{Number(expense.amount).toLocaleString("en-IN")}</span>
                    </td>
                    <td className="px-6 py-4">
                      {expense.description || <span className="text-zinc-600 italic">No description</span>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="font-semibold text-white">{expense.logger.name}</span>
                      <span className="text-[10px] text-zinc-500 block">{expense.logger.role}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-2">
                        {expense.machine?.machineId && (
                          <span className="px-2 py-1 bg-zinc-800 text-zinc-300 rounded text-[10px] font-bold border border-zinc-700 flex items-center gap-1">
                            <Wrench className="w-3 h-3" /> Machine: {expense.machine.machineId}
                          </span>
                        )}
                        {expense.vehicle?.licensePlate && (
                          <span className="px-2 py-1 bg-zinc-800 text-zinc-300 rounded text-[10px] font-bold border border-zinc-700 flex items-center gap-1">
                            <Fuel className="w-3 h-3" /> Vehicle: {expense.vehicle.licensePlate}
                          </span>
                        )}
                        {expense.tool?.toolId && (
                          <span className="px-2 py-1 bg-zinc-800 text-zinc-300 rounded text-[10px] font-bold border border-zinc-700 flex items-center gap-1">
                            <Wrench className="w-3 h-3" /> Tool: {expense.tool.toolId}
                          </span>
                        )}
                        {expense.employee && (
                          <span className="px-2 py-1 bg-indigo-950 text-indigo-300 rounded text-[10px] font-bold border border-indigo-900/50">
                            Staff: {expense.employee.name}
                          </span>
                        )}
                        {expense.dispatch && (
                          <span className="px-2 py-1 bg-emerald-950 text-emerald-300 rounded text-[10px] font-bold border border-emerald-900/50">
                            Job: {expense.dispatch.customer?.name}
                          </span>
                        )}
                        {!expense.machine && !expense.vehicle && !expense.tool && !expense.employee && !expense.dispatch && (
                          <span className="text-zinc-600">-</span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
