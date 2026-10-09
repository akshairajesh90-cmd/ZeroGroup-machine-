import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { format, isToday, isThisWeek, subDays } from "date-fns";
import { ChevronRight, MapPin, Wrench, Zap } from "lucide-react";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, { label: string; cls: string; dot: string }> = {
  PENDING:     { label: "Pending",     cls: "bg-amber-500/15 text-amber-400 border-amber-500/30",   dot: "bg-amber-400" },
  ACCEPTED:    { label: "Accepted",    cls: "bg-blue-500/15 text-blue-400 border-blue-500/30",     dot: "bg-blue-400" },
  IN_PROGRESS: { label: "In Progress", cls: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",     dot: "bg-cyan-400 animate-pulse" },
  COMPLETED:   { label: "Completed",   cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", dot: "bg-emerald-400" },
  CANCELLED:   { label: "Cancelled",   cls: "bg-red-500/15 text-red-400 border-red-500/30",       dot: "bg-red-400" },
  POSTPONED:   { label: "Postponed",   cls: "bg-slate-500/15 text-slate-400 border-slate-500/30", dot: "bg-slate-400" },
};

const MACHINE_EMOJI: Record<string, string> = {
  MIXER: "🪣", LIFT: "🏗️", VIBRATOR: "🔧", PANI: "💧", INDEPENDENT: "👷",
};

export default async function DispatchesPage() {
  const session = await auth();
  if (!session?.user?.employeeId) redirect("/");
  const empId = session.user.employeeId;

  const employee = await prisma.employee.findUnique({
    where: { id: empId },
    select: { role: true },
  });

  const isGodMode = ["ADMIN", "OWNER"].includes(employee?.role ?? session?.user?.role ?? "");

  const dispatches = await prisma.dailyDispatch.findMany({
    where: {
      ...(isGodMode ? {} : { OR: [{ operatorId: empId }, { driverId: empId }] }),
      dateOfService: { gte: subDays(new Date(), 30) },
    },
    include: {
      customer: { select: { name: true, phone: true } },
      machine:  { select: { machineId: true, type: true, notes: true } },
      lift:     { select: { machineId: true, type: true } },
      vibrator: { select: { machineId: true, type: true } },
    },
    orderBy: { dateOfService: "desc" },
  });

  const todayJobs   = dispatches.filter((d) => isToday(new Date(d.dateOfService)));
  const weekJobs    = dispatches.filter((d) => !isToday(new Date(d.dateOfService)) && isThisWeek(new Date(d.dateOfService), { weekStartsOn: 1 }));
  const earlierJobs = dispatches.filter((d) => !isToday(new Date(d.dateOfService)) && !isThisWeek(new Date(d.dateOfService), { weekStartsOn: 1 }));

  function DispatchCard({ d }: { d: typeof dispatches[number] }) {
    const s = STATUS_STYLE[d.status] ?? STATUS_STYLE.PENDING;
    const emoji = MACHINE_EMOJI[d.machine?.type ?? ""] ?? "⚙️";
    return (
      <Link
        href={`/driver/orders/${d.id}`}
        className="flex items-center gap-4 bg-slate-900/70 border border-white/5 hover:border-cyan-500/30 rounded-2xl p-4 transition-all active:scale-[0.98] group"
      >
        <div className="w-12 h-12 rounded-xl bg-slate-800 border border-white/5 flex items-center justify-center text-2xl shrink-0">
          {emoji}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-black text-white">
              {d.machine?.machineId ?? "CREW"}
              {d.lift ? <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded ml-2">+ {d.lift.machineId}</span> : null}
              {d.vibrator ? <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded ml-2">+ {d.vibrator.machineId}</span> : null}
            </span>
            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${s.cls}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{s.label}
            </span>
          </div>
          <div className="flex items-center gap-1.5 mt-1">
            <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
            <span className="text-xs font-bold text-slate-200 truncate">{d.location}</span>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[11px] text-slate-500">{d.customer?.name}</span>
          </div>
          <p className="text-[11px] text-slate-600 mt-0.5">{format(new Date(d.dateOfService), "EEE, d MMM yyyy")}</p>
        </div>
        <ChevronRight className="w-4 h-4 text-slate-600 group-hover:text-cyan-400 shrink-0 transition-colors" />
      </Link>
    );
  }

  function Section({ title, items, accent }: { title: string; items: typeof dispatches; accent: string }) {
    if (items.length === 0) return null;
    return (
      <div>
        <div className={`flex items-center gap-2 mb-3`}>
          <span className={`text-[11px] font-black uppercase tracking-widest ${accent}`}>{title}</span>
          <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full font-bold">{items.length}</span>
        </div>
        <div className="space-y-2.5">
          {items.map((d) => <DispatchCard key={d.id} d={d} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-6">
      <div className="pt-2">
        <div className="flex items-center gap-2">
          <Zap className="w-4 h-4 text-cyan-400" />
          <h1 className="text-xl font-black text-white">My Dispatches</h1>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">Last 30 days · {dispatches.length} total jobs</p>
      </div>

      {dispatches.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center mb-4">
            <Wrench className="w-8 h-8 text-slate-600" />
          </div>
          <h2 className="text-base font-black text-slate-300">No Jobs Yet</h2>
          <p className="text-xs text-slate-500 mt-1 max-w-xs">Your dispatch orders will appear here once assigned by office staff.</p>
        </div>
      ) : (
        <>
          <Section title="Today" items={todayJobs} accent="text-amber-400" />
          <Section title="This Week" items={weekJobs} accent="text-cyan-400" />
          <Section title="Earlier" items={earlierJobs} accent="text-slate-400" />
        </>
      )}
    </div>
  );
}
