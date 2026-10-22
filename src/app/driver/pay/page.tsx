import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/serverAuth";
import { formatInTimeZone } from "date-fns-tz";
import { Wallet, Info, Receipt, Clock } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function DriverPayPage() {
  const { employeeId } = await requireAuth({ allowedRoles: ["DRIVER", "OWNER", "STAFF"] });

  // ONLY fetch pending advances and shift logs without any wage data attached.
  const pendingAdvances = await prisma.salaryAdvance.findMany({
    where: {
      employeeId: employeeId,
      status: "PENDING"
    }
  });

  const totalPendingAdvances = pendingAdvances.reduce((sum, adv) => sum + Number(adv.amount || 0), 0);

  const pendingShifts = await prisma.shiftLog.findMany({
    where: { 
      driverId: employeeId,
      endTime: { not: null },
    },
    orderBy: { date: 'desc' },
    take: 10
  });

  return (
    <div className="space-y-6">
      <div className="pt-4 px-4">
        <h1 className="text-2xl font-black text-white">My Pay 💰</h1>
        <p className="text-xs text-slate-500 mt-1">
          Ledger synchronized • Strictly audited
        </p>
      </div>

      <div className="px-4 space-y-4">
        {/* Office Debt / Advances Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
          <div className="p-5 border-b border-zinc-800/50">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Wallet className="w-5 h-5 text-red-400" />
                <span className="text-sm font-bold text-slate-300">Office Debt / Cash Advances</span>
              </div>
            </div>
            
            <div className="flex items-end gap-2">
              <span className="text-4xl font-black text-red-400">₹{totalPendingAdvances.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Hardcoded Static Message */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
           <h2 className="text-[11px] font-black uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
              <Info className="w-4 h-4 text-emerald-400" /> Payment Info
           </h2>
           <div className="space-y-3 text-sm text-zinc-300">
             <p className="font-bold text-white">Daily wages are calculated and distributed by the office every Saturday.</p>
             <p className="text-xs text-zinc-500">All shifts are recorded, but specific estimated payouts and rates are only visible to the office team.</p>
           </div>
        </div>

        {/* Pending Shifts Breakdown (No financial info) */}
        <div className="space-y-3 pt-2">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
            <Clock className="w-4 h-4" /> Recent Recorded Shifts
          </h2>
          
          {pendingShifts.length === 0 ? (
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 text-center text-xs text-slate-500 font-bold">
              No recent shifts found.
            </div>
          ) : (
            <div className="space-y-2">
              {pendingShifts.map((shift: any) => (
                <div key={shift.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-4 flex items-center justify-between">
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    {formatInTimeZone(new Date(shift.date), 'Asia/Kolkata', "dd MMM, EEEE")}
                    {shift.requiresOfficeApproval && (
                      <span className="text-[9px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded border border-amber-500/30 uppercase tracking-wider">
                        Requires Approval
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-emerald-400 font-bold uppercase tracking-wider">
                    Recorded
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
