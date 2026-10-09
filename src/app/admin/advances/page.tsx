import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/serverAuth";
import { Role } from "@prisma/client";
import { format } from "date-fns";
import Link from "next/link";
import { ArrowLeft, Wallet, AlertCircle } from "lucide-react";
import NewAdvanceForm from "./NewAdvanceForm";

export const dynamic = "force-dynamic";

export default async function AdminAdvancesPage() {
  await requireAuth({ allowedRoles: [Role.OWNER, Role.STAFF] });

  const [advances, employees] = await Promise.all([
    prisma.salaryAdvance.findMany({
      orderBy: { date: "desc" },
      include: {
        employee: { select: { name: true, role: true } }
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
          <Link href="/admin/dashboard" className="text-zinc-500 hover:text-white flex items-center gap-2 text-sm font-bold mb-2 w-max">
            <ArrowLeft className="h-4 w-4" /> Back to God Mode
          </Link>
          <h1 className="text-3xl font-black text-white flex items-center gap-3">
            <Wallet className="h-8 w-8 text-indigo-500" /> Salary Advances
          </h1>
          <p className="text-zinc-400 mt-1">Issue and track mid-week cash advances to employees.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Form Column */}
        <div className="lg:col-span-1">
          <NewAdvanceForm employees={employees} />
          
          <div className="mt-4 bg-indigo-950/30 border border-indigo-500/20 rounded-xl p-4 flex gap-3 text-indigo-200">
            <AlertCircle className="h-5 w-5 text-indigo-400 shrink-0" />
            <p className="text-xs leading-relaxed">
// eslint-disable-next-line @typescript-eslint/no-unused-vars
              Advances issued here are automatically deducted from the employee&apos;s next Weekly Settlement. Once deducted, the status changes to <span className="font-bold text-indigo-400">RECOVERED</span>.
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
                    <th className="px-6 py-4">Amount</th>
                    <th className="px-6 py-4">Reason</th>
                    <th className="px-6 py-4">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/50">
                  {advances.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-zinc-500">No salary advances issued yet.</td>
                    </tr>
                  ) : (
                    advances.map(advance => (
                      <tr key={advance.id} className="hover:bg-zinc-800/30 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-bold text-white">{format(new Date(advance.date), "dd MMM yyyy")}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-bold text-white">{advance.employee.name}</span>
                          <span className="text-[10px] text-zinc-500 block">{advance.employee.role}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className="font-black text-indigo-400">₹{Number(advance.amount).toLocaleString("en-IN")}</span>
                        </td>
                        <td className="px-6 py-4">
                          {advance.notes}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {advance.status === "PENDING" ? (
                            <span className="inline-flex items-center px-2 py-1 rounded bg-amber-500/20 text-amber-400 text-[10px] font-bold uppercase tracking-wider border border-amber-500/30">
                              Pending
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-bold uppercase tracking-wider border border-emerald-500/30">
                              Recovered
                            </span>
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
