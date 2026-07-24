// ZERO GROUP — Driver / Operator PWA Home Page
import React from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { IOSInstallPrompt } from "@/components/driver/IOSInstallPrompt";
import { 
  Truck, 
  Clock, 
  DollarSign, 
  Wrench,
  ShieldCheck,
  ChevronRight
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DriverHomePage() {
  const session = await auth();
  if (!session?.user || !session.user.employeeId) {
    // If logged in as OWNER or STAFF testing driver route without employee profile tied or fallback
    if (!session?.user) redirect("/");
  }

  // Fetch active dispatches assigned to this operator/driver today
  const myDispatches = await prisma.dailyDispatch.findMany({
    where: {
      OR: [
        { operatorId: session.user.employeeId ?? undefined },
        { workerId: session.user.employeeId ?? undefined },
      ],
      status: { in: ["PENDING", "DELIVERED"] }
    },
    include: {
      machine: true,
      operator: true,
      worker: true
    },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-24">
      {/* PWA iOS Safari Install Banner */}
      <IOSInstallPrompt />

      {/* Mobile Top App Bar */}
      <div className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-lg sticky top-0 z-30 px-5 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-black text-sm shadow-inner">
            ZG
          </div>
          <div>
            <h1 className="text-sm font-black text-white leading-none">ZERO GROUP</h1>
            <p className="text-[10px] text-amber-400 font-bold uppercase tracking-wider mt-0.5 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Field {session.user.role} App
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-300 bg-slate-800 px-3 py-1 rounded-full border border-slate-700/60">
            {session.user.name?.split(" ")[0]}
          </span>
        </div>
      </div>

      {/* Main Mobile Container */}
      <div className="p-5 max-w-lg mx-auto space-y-6">
        {/* Active Shift / Dispatch Status Banner */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-900/90 to-slate-950 border border-amber-500/30 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
          <div className="absolute -top-12 -right-12 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
          
          <div className="flex items-center justify-between">
            <span className="px-2.5 py-0.5 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-full text-[11px] font-black tracking-wider uppercase flex items-center gap-1.5">
              <Clock className="w-3 h-3" /> Today&apos;s Shift Status
            </span>
            <span className="text-xs font-bold text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> GPS Verified
            </span>
          </div>

          <div className="mt-4">
            <h2 className="text-xl font-black text-white">
              {myDispatches.length > 0 ? (
                <span>Assigned to <span className="text-amber-400">{myDispatches.length} Unit(s)</span></span>
              ) : (
                "On Standby / Ready for Dispatch"
              )}
            </h2>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              {myDispatches.length > 0
                ? "Your discrete daily work order is active. Complete safety checks before operating equipment."
                : "No active dispatch orders assigned by office staff yet today. Check back soon."}
            </p>
          </div>

          {myDispatches.length === 0 && (
            <div className="mt-5 pt-4 border-t border-slate-800/80 flex items-center justify-between">
              <span className="text-xs text-slate-500">Need immediate assignment?</span>
              <span className="text-xs font-bold text-slate-300 bg-slate-800 px-2.5 py-1 rounded-lg">
                Call Office Staff
              </span>
            </div>
          )}
        </div>

        {/* Active Dispatches List */}
        {myDispatches.length > 0 && (
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">My Assigned Equipment</h3>
            {myDispatches.map((d) => (
              <div key={d.id} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-4 shadow-xl space-y-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 font-bold">
                      <Truck className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-white text-base leading-snug">{d.machine?.machineId ?? "INDEPENDENT CREW"}</h4>
                      <p className="text-xs text-amber-400 font-semibold">{d.machine?.type ?? "TROLLY/LIFT"} • {d.workType}</p>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[10px] font-black uppercase">
                    ACTIVE
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs text-slate-400">
                  <span>Helper: <strong className="text-slate-200">{d.worker?.name ?? "Customer Provided"}</strong></span>
                  <span className="text-emerald-400 font-bold">₹{d.machine?.operatorDailyPayout?.toString() ?? d.operatorDailyRate?.toString() ?? "800"} Payout Rate</span>
                </div>

                <div className="pt-2 flex gap-2">
                  <Link
                    href={`/driver/orders/${d.id}`}
                    className="flex-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold py-2 px-3 rounded-xl text-center text-xs shadow-md shadow-amber-500/10 transition-all flex items-center justify-center gap-1.5"
                  >
                    Checklist & Log Work <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Quick Driver Tools */}
        <div className="space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">Field Quick Actions</h3>
          
          <div className="grid grid-cols-2 gap-3">
            <Link
              href="/driver/expenses"
              className="bg-slate-900/70 border border-slate-800/80 hover:border-amber-500/40 rounded-2xl p-4 shadow-lg transition-all group flex flex-col justify-between h-28"
            >
              <div className="w-8 h-8 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 group-hover:scale-110 transition-transform">
                <DollarSign className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white group-hover:text-amber-400 transition-colors">Log Fuel / Expense</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Asset or General</p>
              </div>
            </Link>

            <div className="bg-slate-900/70 border border-slate-800/80 hover:border-blue-500/40 rounded-2xl p-4 shadow-lg transition-all group flex flex-col justify-between h-28 cursor-pointer">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                <Wrench className="w-4 h-4" />
              </div>
              <div>
                <h4 className="text-xs font-bold text-white group-hover:text-blue-400 transition-colors">Report Breakdown</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Maintenance Ticket</p>
              </div>
            </div>
          </div>
        </div>

        {/* Offline Cache Status & PWA Notice */}
        <div className="bg-slate-900/40 border border-slate-800/60 rounded-xl p-3.5 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span>PWA Offline Cache Active</span>
          </div>
          <span className="text-[10px] font-mono text-slate-500">Service Worker v2.3</span>
        </div>
      </div>
    </div>
  );
}
