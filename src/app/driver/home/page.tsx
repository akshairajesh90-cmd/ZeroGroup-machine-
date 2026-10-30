import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { startOfDay, endOfDay, startOfWeek, format } from "date-fns";
import {
  Truck, Wallet, MapPin, Phone, ChevronRight,
  ClipboardList, Fuel, Wrench, Clock, CheckCircle2,
  AlertCircle, CalendarDays, Zap, Hammer, User
} from "lucide-react";
import ShiftTracker from "./ShiftTracker";
import { CollectPaymentButton } from "@/components/shared/CollectPaymentButton";
import DriverSitePinger from "@/components/driver/DriverSitePinger";
import SeniorDriverAutopilot from "@/components/driver/SeniorDriverAutopilot";

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
    select: { name: true, role: true, lastLatitude: true, lastLongitude: true, lastLocationUpdate: true },
  });

  const todayStart = startOfDay(new Date());
  const todayEnd   = endOfDay(new Date());
  const weekStart  = startOfWeek(new Date(), { weekStartsOn: 1 });

  const isGodMode = ["ADMIN", "OWNER"].includes(employee?.role ?? session?.user?.role ?? "");

  const [todayDispatches, weekDispatches, recentDispatches, activeShift, availableVehicles] = await Promise.all([
    prisma.dailyDispatch.findMany({
      where: {
        ...(isGodMode ? {} : { OR: [{ operatorId: empId }, { driverId: empId }] }),
        dateOfService: { gte: todayStart, lte: todayEnd },
        isPendingDelete: false
      },
      include: {
        customer: { select: { name: true, phone: true } },
        machine:  { select: { machineId: true, type: true, notes: true } },
        vehicle:  { select: { id: true, licensePlate: true, type: true } },
        dispatchAssets: { include: { machine: true } },
        dispatchTools: { include: { tool: true } },
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.dailyDispatch.findMany({
      where: {
        ...(isGodMode ? {} : { OR: [{ operatorId: empId }, { driverId: empId }] }),
        status: "COMPLETED",
        dateOfService: { gte: weekStart },
        isPendingDelete: false
      },
      select: { operatorDailyRate: true },
    }),
    prisma.dailyDispatch.findMany({
      where: { 
        ...(isGodMode ? {} : { OR: [{ operatorId: empId }, { driverId: empId }] }),
        isPendingDelete: false 
      },
      orderBy: { dateOfService: "desc" },
      take: 5,
      select: { id: true, location: true, dateOfService: true, status: true, machine: { select: { machineId: true } } },
    }),
    prisma.shiftLog.findFirst({
      where: { driverId: empId, endTime: null },
      orderBy: { date: "desc" },
      select: { 
        id: true, 
        startTime: true,
        vehicle: { select: { type: true, licensePlate: true } }
      }
    }),
    prisma.vehicle.findMany({
      where: { status: "AVAILABLE", isPendingDelete: false },
      select: { id: true, type: true, licensePlate: true }
    })
  ]);

  const firstName     = employee?.name?.split(" ")[0] ?? "Operator";
  const todayJob      = todayDispatches[0] ?? null;
  const todayFormatted = format(new Date(), "EEEE, d MMMM yyyy");

  // Format activeShift for Client Component
  const formattedActiveShift = activeShift ? {
    id: activeShift.id,
    startTime: activeShift.startTime.toISOString(),
    vehicleName: `${activeShift.vehicle.licensePlate} (${activeShift.vehicle.type})`
  } : null;

  return (
    <div className="space-y-5 pb-6">
      {/* ── SENIOR DRIVER AUTOPILOT (ZERO-CLICK PASSIVE MODE) ────── */}
      <SeniorDriverAutopilot
        driverName={employee?.name || "Driver"}
        vehiclePlate={todayJob?.vehicle?.licensePlate || activeShift?.vehicle?.licensePlate}
        vehicleType={todayJob?.vehicle?.type || activeShift?.vehicle?.type}
        machineId={todayJob?.machine?.machineId}
        customerName={todayJob?.customer?.name}
        location={todayJob?.location}
        latitude={todayJob?.latitude ? Number(todayJob.latitude) : null}
        longitude={todayJob?.longitude ? Number(todayJob.longitude) : null}
        mapLink={todayJob?.mapLink}
        status={todayJob?.status || (activeShift ? "EN_ROUTE" : "PENDING")}
        dispatchId={todayJob?.id}
      />

      {/* ── Optional Manual Shift Tracker for Admin / Testing Fallback ──────────────────── */}
      {isGodMode && (
        <details className="bg-slate-900/60 border border-slate-800 rounded-2xl p-3 text-xs text-slate-400">
          <summary className="font-bold text-slate-300 cursor-pointer">
            ⚙️ Admin / Manual Override Shift Controls
          </summary>
          <div className="mt-3">
            <ShiftTracker 
              activeShift={formattedActiveShift} 
              availableVehicles={availableVehicles} 
            />
          </div>
        </details>
      )}

      {/* ── Greeting ─────────────────────────────────── */}
      <div className="pt-2 flex items-center justify-between">
        <div>
        <p className="text-xs font-bold text-cyan-400 uppercase tracking-widest">{getGreeting()}</p>
        <h1 className="text-2xl font-black text-white mt-0.5">{firstName} 👋</h1>
        <p className="text-xs text-slate-500 mt-0.5">{todayFormatted}</p>
        </div>
        <Link
          href="/driver/profile"
          className="flex items-center gap-1.5 p-2 px-3 rounded-xl bg-slate-800/80 border border-slate-700/80 text-xs font-bold text-slate-200 hover:text-white hover:border-cyan-500/50 transition-all shadow-sm active:scale-95"
        >
          <User className="h-4 w-4 text-cyan-400" />
          <span>My Profile</span>
        </Link>
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
            {todayJob.dispatchAssets?.map((da: any) => (
              <span key={da.id} className="text-[12px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-md ml-2 align-middle">
                + {da.machine.machineId}
              </span>
            ))}
          </h2>
          {todayJob.vehicle && (
            <div className="flex items-center gap-2 my-2 px-3 py-1.5 rounded-lg bg-cyan-950/60 border border-cyan-500/30 w-fit">
              <Truck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="text-xs font-mono font-bold text-cyan-300">
                Transport: {todayJob.vehicle.licensePlate} ({todayJob.vehicle.type})
              </span>
            </div>
          )}
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

          {/* Cargo Manifest */}
          {todayJob.dispatchTools?.length > 0 && (
            <div className="mt-4 pt-4 border-t border-amber-500/20">
              <h3 className="text-[10px] font-black uppercase tracking-widest text-amber-400 mb-2 flex items-center gap-1.5">
                <Hammer className="w-3.5 h-3.5" /> Cargo Manifest (Tools)
              </h3>
              <div className="space-y-1.5">
                {todayJob.dispatchTools.map((dt: any) => (
                  <div key={dt.id} className="flex items-center gap-2 text-sm text-slate-300">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="font-bold text-white">{dt.quantity}x</span> {dt.tool.name} {dt.variant ? `(${dt.variant})` : ""}
                  </div>
                ))}
              </div>
            </div>
          )}

          <Link
            href={`/driver/orders/${todayJob.id}`}
            className="mt-5 flex items-center justify-center gap-2 w-full py-3.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm transition-all active:scale-[0.98] shadow-lg shadow-amber-500/20"
          >
            View Full Details <ChevronRight className="w-4 h-4" />
          </Link>

          {/* Quick Action: Collect Payment */}
          {/* Quick Action: Collect Payment */}
          <CollectPaymentButton dispatchId={todayJob.id} />

          {/* ── Site Destination & Live GPS Pinger ─────── */}
          <div className="mt-4 pt-3 border-t border-amber-500/20">
            <DriverSitePinger
              dispatchId={todayJob.id}
              siteAddress={todayJob.location}
              siteLatitude={todayJob.latitude ? Number(todayJob.latitude) : null}
              siteLongitude={todayJob.longitude ? Number(todayJob.longitude) : null}
              customerName={todayJob.customer?.name}
              customerPhone={todayJob.customer?.phone}
              lastKnownLat={employee?.lastLatitude ? Number(employee.lastLatitude) : null}
              lastKnownLng={employee?.lastLongitude ? Number(employee.lastLongitude) : null}
              lastPingTime={employee?.lastLocationUpdate}
              showAutoToggle={true}
            />
          </div>
        </div>
      ) : (
        <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 text-center">
          <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto mb-3">
            <Clock className="w-6 h-6 text-slate-500" />
          </div>
          <h2 className="text-base font-black text-white">On Standby Today</h2>
          <p className="text-xs text-slate-400 mt-1">No dispatch assigned yet. Ping your standby position to stay visible to dispatchers.</p>
          <div className="mt-4 pt-3 border-t border-slate-800">
            <DriverSitePinger
              siteAddress="Central Depot / Standby"
              siteLatitude={9.5916}
              siteLongitude={76.5222}
              lastKnownLat={employee?.lastLatitude ? Number(employee.lastLatitude) : null}
              lastKnownLng={employee?.lastLongitude ? Number(employee.lastLongitude) : null}
              lastPingTime={employee?.lastLocationUpdate}
              showAutoToggle={true}
            />
          </div>
          <div className="mt-4 bg-slate-800/60 rounded-xl px-4 py-2 inline-flex items-center gap-2">
            <Phone className="w-3.5 h-3.5 text-cyan-400" />
            <span className="text-xs font-bold text-cyan-400">Contact Office Staff</span>
          </div>
        </div>
      )}

      {/* ── Additional Scheduled Dispatches Today ──────── */}
      {todayDispatches.length > 1 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between px-0.5">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              More Jobs Today ({todayDispatches.length - 1})
            </h3>
            <span className="text-[10px] text-cyan-400 font-bold">Assigned to you</span>
          </div>
          <div className="space-y-2.5">
            {todayDispatches.slice(1).map((d) => (
              <div key={d.id} className="bg-slate-900/70 border border-slate-800 hover:border-cyan-500/30 rounded-2xl p-4 space-y-2 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-black text-white">{d.machine?.machineId ?? "CREW WORK"}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    {d.status}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span className="font-bold text-white truncate">{d.location}</span>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-800/60 text-xs">
                  <span className="text-slate-400 truncate">{d.customer?.name}</span>
                  <Link
                    href={`/driver/orders/${d.id}`}
                    className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 shrink-0"
                  >
                    View & Ping <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
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
            { href: "/driver/pool",       icon: ClipboardList, label: "Job Pool",        sub: "Claim & Swap jobs", color: "text-amber-400",   bg: "bg-amber-500/10 border-amber-500/20" },
            { href: "/driver/dispatches", icon: ClipboardList, label: "My Jobs",        sub: "All dispatches",    color: "text-cyan-400",   bg: "bg-cyan-500/10 border-cyan-500/20" },
            { href: "/driver/expenses",   icon: Fuel,          label: "Log Fuel",        sub: "Record refill",     color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/20" },
            { href: "/driver/portal",     icon: Wrench,        label: "Breakdown",       sub: "Report issue",      color: "text-red-400",    bg: "bg-red-500/10 border-red-500/20" },
            { href: "/driver/map",        icon: MapPin,        label: "Live Map",        sub: "Crew Tracking",     color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
            { href: "/driver/chat",       icon: Phone,         label: "Crew Chat",       sub: "Talk to Office",    color: "text-pink-400",    bg: "bg-pink-500/10 border-pink-500/20" },
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
