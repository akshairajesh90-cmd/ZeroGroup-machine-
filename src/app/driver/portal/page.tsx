import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { Wrench, CalendarDays, Clock } from "lucide-react";
import BreakdownForm from "./BreakdownForm";

export const dynamic = "force-dynamic";

export default async function PortalPage() {
  const session = await auth();
  if (!session?.user?.employeeId) redirect("/");
  const empId = session.user.employeeId;

  const [machines, shiftLogs, openTickets] = await Promise.all([
    prisma.machine.findMany({
      where: { status: { in: ["AVAILABLE", "RENTED"] } },
      select: { id: true, machineId: true, type: true, notes: true },
      orderBy: { machineId: "asc" },
    }),
    prisma.shiftLog.findMany({
      where: { driverId: empId },
      orderBy: { date: "desc" },
      take: 10,
      include: { vehicle: { select: { licensePlate: true, type: true } } },
    }),
    prisma.maintenanceTicket.findMany({
      where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
      select: { id: true, issueDescription: true, status: true, machine: { select: { machineId: true } } },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
  ]);

  const serializedShifts = shiftLogs.map((s) => ({
    id: s.id,
    date: s.date.toISOString(),
    startTime: s.startTime.toISOString(),
    endTime: s.endTime?.toISOString() ?? null,
    vehiclePlate: s.vehicle?.licensePlate ?? null,
    vehicleType: s.vehicle?.type ?? null,
  }));

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="pt-2">
        <div className="flex items-center gap-2">
          <Wrench className="w-5 h-5 text-red-400" />
          <h1 className="text-xl font-black text-white">Field Portal</h1>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">Report breakdowns · View shift history</p>
      </div>

      {/* Open Tickets Banner */}
      {openTickets.length > 0 && (
        <div className="bg-red-500/8 border border-red-500/25 rounded-2xl p-4">
          <p className="text-xs font-black text-red-400 uppercase tracking-wider mb-2">⚠️ Open Breakdown Tickets</p>
          <div className="space-y-2">
            {openTickets.map((t) => (
              <div key={t.id} className="flex items-center justify-between">
                <span className="text-xs text-slate-300 font-bold">{t.machine?.machineId ?? "Unknown"}</span>
                <span className="text-[10px] text-red-300 bg-red-500/15 px-2 py-0.5 rounded-full border border-red-500/30 font-bold">{t.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Breakdown Report Form */}
      <div>
        <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
          <Wrench className="w-3.5 h-3.5 text-red-400" /> Report Machine Breakdown
        </h2>
        <BreakdownForm machines={machines} />
      </div>

      {/* Shift History */}
      <div>
        <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
          <CalendarDays className="w-3.5 h-3.5 text-purple-400" /> My Shift History
        </h2>
        {serializedShifts.length === 0 ? (
          <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 text-center">
            <Clock className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="text-sm font-bold text-slate-400">No shift logs yet</p>
          </div>
        ) : (
          <div className="bg-slate-900/70 border border-white/5 rounded-2xl divide-y divide-slate-800/70">
            {serializedShifts.map((s) => {
              const start = new Date(s.startTime);
              const end   = s.endTime ? new Date(s.endTime) : null;
              const hrs   = end ? ((end.getTime() - start.getTime()) / 3600000).toFixed(1) : null;
              return (
                <div key={s.id} className="flex items-center justify-between px-4 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/20 flex items-center justify-center">
                      <CalendarDays className="w-3.5 h-3.5 text-purple-400" />
                    </div>
                    <div>
                      <p className="text-sm font-bold text-white">{s.vehiclePlate ?? "No vehicle"}</p>
                      <p className="text-[11px] text-slate-500">{s.vehicleType} · {format(new Date(s.date), "EEE, d MMM")}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-bold text-slate-300">
                      {format(start, "HH:mm")} → {end ? format(end, "HH:mm") : "—"}
                    </p>
                    {hrs && <p className="text-[11px] text-cyan-400 font-bold">{hrs}h</p>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
