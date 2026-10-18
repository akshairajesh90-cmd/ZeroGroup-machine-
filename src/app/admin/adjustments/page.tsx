import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/serverAuth";
import { Role } from "@prisma/client";
import { format } from "date-fns";
import Link from "next/link";
import { ArrowLeft, PlusSquare, AlertCircle } from "lucide-react";
import NewAdjustmentForm from "./NewAdjustmentForm";
import ReversalButton from "./ReversalButton";

export const dynamic = "force-dynamic";

export default async function AdminAdjustmentsPage() {
  const authContext = await requireAuth({ allowedRoles: [Role.OWNER, Role.ADMIN, Role.STAFF] });
  const isStaff = authContext.role === Role.STAFF;

  const [adjustments, employees] = await Promise.all([
    prisma.manualAdjustment.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        employee: { select: { name: true, role: true } },
        createdBy: { select: { name: true } }
      },
      take: 100
    }),
    prisma.employee.findMany({
      where: { role: { in: [Role.DRIVER, Role.OPERATOR, Role.STAFF] } },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" }
    })
  ]);

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Link href={isStaff ? "/staff/dashboard" : "/admin/dashboard"} className="text-zinc-500 hover:text-white flex items-center gap-2 text-sm font-bold mb-2 w-max">
            <ArrowLeft className="h-4 w-4" /> {isStaff ? "Back to Staff Dashboard" : "Back to God Mode"}
          </Link>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <PlusSquare className="h-8 w-8 text-blue-500" /> Manual Adjustments
          </h1>
          <p className="text-zinc-400 mt-1">Add custom bonuses or penalties before weekly payroll.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Column */}
        <div className="lg:col-span-1">
          <NewAdjustmentForm employees={employees} />
          
          <div className="mt-4 bg-blue-950/30 border border-blue-500/20 rounded-xl p-4 flex gap-3 text-blue-200">
            <AlertCircle className="h-5 w-5 text-blue-400 shrink-0" />
            <p className="text-xs leading-relaxed">
              Adjustments are factored instantly into the next Weekly Settlement. They apply to the upcoming payroll run.
            </p>
          </div>
        </div>

        {/* Table Column */}
        <div className="lg:col-span-2">
          <div className="bg-zinc-900/50 border border-zinc-800/80 rounded-2xl overflow-hidden backdrop-blur-xl shadow-xl h-full flex flex-col">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm text-zinc-400">
                <thead className="bg-zinc-900/80 text-xs uppercase font-bold text-zinc-500 border-b border-zinc-800">
                  <tr>
                    <th className="px-6 py-4">Date</th>
                    <th className="px-6 py-4">Employee</th>
                    <th className="px-6 py-4">Type</th>
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Reason</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {adjustments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-6 py-8 text-center text-zinc-500">No manual adjustments recorded.</td>
                    </tr>
                  ) : (
                    adjustments.map(adj => (
                      <tr key={adj.id} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-bold text-white">{format(new Date(adj.createdAt), "dd MMM yyyy")}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-bold text-white">{adj.employee.name}</span>
                          <span className="text-[10px] text-zinc-500 block">{adj.employee.role}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {adj.type === "BONUS" ? (
                            <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded">BONUS</span>
                          ) : (
                            <span className="px-2 py-1 bg-rose-500/20 text-rose-400 text-[10px] font-bold rounded">PENALTY</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`font-black ${adj.type === 'BONUS' ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {adj.type === 'BONUS' ? '+' : '-'}₹{Number(adj.amount).toLocaleString("en-IN")}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {adj.reason}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {adj.status === "PENDING" ? (
                            <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">Unsettled</span>
                          ) : (
                            <span className="text-blue-400 text-[10px] font-bold uppercase tracking-wider">Settled</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right">
                          {!adj.reason.startsWith("[REVERSAL]") && (
                            <ReversalButton adjustmentId={adj.id} />
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
