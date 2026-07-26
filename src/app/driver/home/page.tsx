import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { startOfDay, endOfDay, startOfWeek, format } from "date-fns";
import {
  Truck, Wallet, MapPin, Phone, ChevronRight,
  ClipboardList, Fuel, Wrench, Clock, CheckCircle2,
  AlertCircle, CalendarDays, Zap
} from "lucide-react";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, { label: string; cls: string; dot: string }> = {
  PENDING:     { label: "Pending",     cls: "bg-amber-500/15 text-amber-400 border-amber-500/30",   dot: "bg-amber-400" },
  ACCEPTED:    { label: "Accepted",    cls: "bg-blue-500/15 text-blue-400 border-blue-500/30",     dot: "bg-blue-400" },
  IN_PROGRESS: { label: "In Progress", cls: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",     dot: "bg-cyan-400 animate-pulse" },
  COMPLETED:   { label: "Completed",   cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", dot: "bg-emerald-400" },
  CANCELLED:   { label: "Cancelled",   cls: "bg-red-500/15 text-red-400 border-red-500/30",       dot: "bg-red-400" },
};

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good Morning";
  if (h < 17) return "Good Afternoon";
  return "Good Evening";
}

export default async function DriverHomePage() {
  const session = await auth();
  if (!session?.user) redirect("/");

  const empId = session.user.employeeId;
  if (!empId) redirect("/");

  const employee = await prisma.employee.findUnique({
    where: { id: empId },
    select: { name: true, role: true },
  });

  const todayStart = startOfDay(new Date());
  const todayEnd   = endOfDay(new Date());
  const weekStart  = startOfWeek(new Date(), { weekStartsOn: 1 });

  const [todayDispatches, weekDispatches, recentDispatches] = await Promise.all([
    prisma.dailyDispatch.findMany({
      where: {
        OR: [{ operatorId: empId }, { driverId: empId }],
        dateOfService: { gte: todayStart, lte: todayEnd },
      },
      include: {
        customer: { select: { name: true, phone: true } },
        machine:  { select: { machineId: true, type: true, notes: true } },
        lift:     { select: { machineId: true, type: true } },
        vibrator: { select: { machineId: true, type: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.dailyDispatch.findMany({
      where: {
        OR: [{ operatorId: empId }, { driverId: empId }],
        status: "COMPLETED",
        dateOfService: { gte: weekStart },
      },
      select: { operatorDailyRate: true },
    }),
    prisma.dailyDispatch.findMany({
      where: { OR: [{ operatorId: empId }, { driverId: empId }] },
      orderBy: { dateOfService: "desc" },
      take: 5,
      select: { id: true, location: true, dateOfService: true, status: true, machine: { select: { machineId: true } } },
    }),
  ]);

  const firstName     = employee?.name?.split(" ")[0] ?? "Operator";
  const todayJob      = todayDispatches[0] ?? null;
  const todayFormatted = format(new Date(), "EEEE, d MMMM yyyy");

  return (
    <div className="space-y-5 pb-6">
      {/* ── Greeting ─────────────────────────────────── */}
      <div className="pt-2">
        <p className="text-xs font-bold text-cyan-400 uppercase tracking-widest">{getGreeting()}</p>
        <h1 className="text-2xl font-black text-white mt-0.5">{firstName} 👋</h1>
        <p className="text-xs text-slate-500 mt-0.5">{todayFormatted}</p>
      </div>

      {/* ── Today's Job ──────────────────────────────── */}
      {todayJob ? (
        <div className="relative bg-gradient-to-br from-amber-500/10 via-slate-900 to-slate-900 border border-amber-500/30 rounded-2xl p-5 overflow-hidden shadow-xl shadow-amber-500/5">
          <div className="absolute -top-8 -right-8 w-28 h-28 bg-amber-500/10 rounded-full blur-2xl" />
          <div className="flex items-center justify-between mb-3">
            <span className="text-[11px] font-black uppercase tracking-widest text-amber-400 flex items-center gap-1.5">
              <Zap className="w-3 h-3" /> Today&apos;s Job
            </span>
            {(() => {
              const s = STATUS_STYLE[todayJob.status] ?? STATUS_STYLE.PENDING;
              return (
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${s.cls}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                  {s.label}
                </span>
              );
            })()}
          </div>

          <h2 className="text-xl font-black text-white leading-tight mt-1">
            {todayJob.machine?.machineId ?? "Independent Work"}
            {todayJob.lift ? <span className="text-[12px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-md ml-2 align-middle">+ {todayJob.lift.machineId}</span> : null}
            {todayJob.vibrator ? <span className="text-[12px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-md ml-2 align-middle">+ {todayJob.vibrator.machineId}</span> : null}
          </h2>
          <p className="text-sm text-amber-300 font-semibold mt-0.5">
            {todayJob.machine?.type ?? "LABOUR"} · {todayJob.machine?.notes?.split("(")[0].trim() ?? ""}
          </p>

          <div className="flex items-center gap-2 mt-3">
            <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-sm font-bold text-white">{todayJob.location}</span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span className="text-sm text-slate-300">{todayJob.customer?.name}</span>
          </div>

          <Link
            href={`/driver/orders/${todayJob.id}`}
            className="mt-4 flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm transition-all active:scale-[0.98] shadow-lg shadow-amber-500/20"
          >
            View Full Details <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto mb-3">
            <Clock className="w-6 h-6 text-slate-500" />
          </div>
          <h2 className="text-base font-black text-white">On Standby Today</h2>
          <p className="text-xs text-slate-500 mt-1">No dispatch assigned yet. Office will call when ready.</p>
          <div className="mt-4 bg-slate-800/60 rounded-xl px-4 py-2 inline-flex items-center gap-2">
            <Phone className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs font-bold text-cyan-400">Contact Office Staff</span>
          </div>
        </div>
      )}

      {/* ── Week Stats ─────────────────────────────── */}
      <div className="bg-slate-900/70 border border-cyan-500/20 rounded-2xl p-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="w-4 h-4 text-cyan-400" />
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Jobs Done</span>
          </div>
          <p className="text-[11px] text-slate-500 mt-0.5">This week</p>
        </div>
        <p className="text-3xl font-black text-cyan-400">{weekDispatches.length}</p>
      </div>

      {/* ── Quick Actions ─────────────────────────────── */}
      <div>
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 px-0.5">Quick Actions</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { href: "/driver/dispatches", icon: ClipboardList, label: "My Jobs",        sub: "All dispatches",    color: "text-cyan-400",   bg: "bg-cyan-500/10 border-cyan-500/20" },
            { href: "/driver/expenses",   icon: Fuel,          label: "Log Fuel",        sub: "Record refill",     color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
            { href: "/driver/portal",     icon: Wrench,        label: "Breakdown",       sub: "Report issue",      color: "text-red-400",    bg: "bg-red-500/10 border-red-500/20" },
            { href: "/driver/portal",     icon: CalendarDays,  label: "Shift Logs",      sub: "My history",        color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
          ].map((a) => (
            <Link key={a.label} href={a.href} className="bg-slate-900/70 border border-white/5 hover:border-white/15 rounded-2xl p-4 flex flex-col gap-3 transition-all active:scale-[0.97]">
              <div className={`w-9 h-9 rounded-xl border flex items-center justify-center ${a.bg}`}>
                <a.icon className={`w-4.5 h-4.5 ${a.color}`} />
              </div>
              <div>
                <p className="text-sm font-black text-white">{a.label}</p>
                <p className="text-[11px] text-slate-500">{a.sub}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* ── Recent Activity ───────────────────────────── */}
      {recentDispatches.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 px-0.5">Recent Activity</h3>
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl divide-y divide-slate-800/80">
            {recentDispatches.map((d) => {
              const s = STATUS_STYLE[d.status] ?? STATUS_STYLE.PENDING;
              return (
                <Link key={d.id} href={`/driver/orders/${d.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-white/3 transition-colors first:rounded-t-2xl last:rounded-b-2xl">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${s.dot}`} />
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-white truncate">{d.location}</p>
                      <p className="text-[11px] text-slate-500">{format(new Date(d.dateOfService), "EEE, d MMM")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${s.cls}`}>{s.label}</span>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-600" />
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ── PWA Status ───────────────────────────────── */}
      <div className="flex items-center justify-between bg-slate-900/40 border border-slate-800/50 rounded-xl px-4 py-2.5 text-[11px]">
        <div className="flex items-center gap-2 text-slate-400">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          Online · Zero Group ERP
        </div>
        <span className="font-bold text-slate-500 uppercase tracking-wider">{employee?.role}</span>
      </div>
    </div>
  );
}
