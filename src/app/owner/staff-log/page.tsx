import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Activity, Clock, User, Truck, Wallet, Receipt } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function StaffActivityLogPage() {
  const session = await auth();
  if (!session?.user || session.user.role !== "OWNER") redirect("/admin/dashboard");

  // Gather recent Staff-related activity across all modules
  const [recentDispatches, recentCash, recentExpenses] = await Promise.all([
    prisma.dailyDispatch.findMany({
      take: 15,
      orderBy: { createdAt: "desc" },
      include: { machine: true, driver: true },
    }),
    prisma.paymentReceipt.findMany({
      take: 15,
      orderBy: { createdAt: "desc" },
      include: { collector: true, customer: true },
    }),
    prisma.expense.findMany({
      take: 15,
      orderBy: { createdAt: "desc" },
      include: { logger: true },
    }),
  ]);

  // Build a unified timeline of all office actions
  type LogEntry = {
    id: string;
    type: "dispatch" | "cash" | "expense";
    label: string;
    sub: string;
    time: Date;
  };
  const timeline: LogEntry[] = [
    ...recentDispatches.map((d) => ({
      id: d.id,
      type: "dispatch" as const,
      label: `Dispatch ${d.status.replace("_", " ")}`,
      sub: `${d.machine?.machineId ?? "No Machine"} → ${d.driver?.name ?? "Unassigned"}`,
      time: d.createdAt,
    })),
    ...recentCash.map((r) => ({
      id: r.id,
      type: "cash" as const,
      label: `Cash Collected — ₹${Number(r.amount).toLocaleString("en-IN")}`,
      sub: `From ${r.customer.name} by ${r.collector?.name ?? "Unknown"}`,
      time: r.createdAt,
    })),
    ...recentExpenses.map((e) => ({
      id: e.id,
      type: "expense" as const,
      label: `Expense Filed — ₹${Number(e.amount).toLocaleString("en-IN")}`,
      sub: `${e.description} by ${e.logger?.name ?? "Staff"}`,
      time: e.createdAt,
    })),
  ].sort((a, b) => b.time.getTime() - a.time.getTime()).slice(0, 40);

  const typeIcon = {
    dispatch: <Truck className="h-4 w-4 text-blue-400" />,
    cash:     <Wallet className="h-4 w-4 text-amber-400" />,
    expense:  <Receipt className="h-4 w-4 text-purple-400" />,
  };

  const typeBg = {
    dispatch: "bg-blue-500/10 border-blue-500/20",
    cash:     "bg-amber-500/10 border-amber-500/20",
    expense:  "bg-purple-500/10 border-purple-500/20",
  };

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-3xl font-black text-white flex items-center gap-3">
          <Activity className="h-8 w-8 text-indigo-400" />
          Staff Activity Log
        </h1>
        <p className="text-zinc-500 text-sm mt-1">
          Full real-time audit trail of all Office Staff actions across Dispatch, Cash, and Expenses.
        </p>
        <div className="mt-2 inline-flex items-center gap-2 rounded-full bg-indigo-500/10 border border-indigo-500/20 px-3 py-1">
          <User className="h-3.5 w-3.5 text-indigo-400" />
          <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Owner Only · Restricted</span>
        </div>
      </div>

      {/* Summary Counters */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "Dispatches (Last 15)", value: recentDispatches.length, icon: Truck, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
          { label: "Cash Logs (Last 15)",  value: recentCash.length,       icon: Wallet, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
          { label: "Expenses (Last 15)",   value: recentExpenses.length,   icon: Receipt, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
        ].map((m) => {
          const Icon = m.icon;
          return (
            <div key={m.label} className={`rounded-2xl border ${m.bg} p-5`}>
              <Icon className={`h-5 w-5 ${m.color} mb-2`} />
              <p className="text-2xl font-black text-white">{m.value}</p>
              <p className="text-xs text-zinc-500 font-medium mt-0.5">{m.label}</p>
            </div>
          );
        })}
      </div>

      {/* Unified Timeline */}
      <div className="rounded-2xl border border-zinc-800 bg-zinc-900/50 overflow-hidden">
        <div className="p-5 border-b border-zinc-800 flex items-center gap-2">
          <Clock className="h-4 w-4 text-indigo-400" />
          <h2 className="font-bold text-white text-sm uppercase tracking-widest">
            Full Audit Timeline (Latest 40 Actions)
          </h2>
        </div>
        <div className="divide-y divide-zinc-800">
          {timeline.map((entry) => (
            <div key={entry.id + entry.type} className="flex items-center justify-between px-5 py-4">
              <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${typeBg[entry.type]}`}>
                  {typeIcon[entry.type]}
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{entry.label}</p>
                  <p className="text-xs text-zinc-500">{entry.sub}</p>
                </div>
              </div>
              <div className="text-right shrink-0 ml-4">
                <p className="text-xs text-zinc-400 font-medium" suppressHydrationWarning>
                  {new Date(entry.time).toLocaleDateString("en-IN")}
                </p>
                <p className="text-[10px] text-zinc-600" suppressHydrationWarning>
                  {new Date(entry.time).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          ))}
          {timeline.length === 0 && (
            <p className="p-5 text-zinc-500 text-sm">No activity logged yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
