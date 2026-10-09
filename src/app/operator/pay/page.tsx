import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/serverAuth";
import { Wallet, Info, IndianRupee } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function OperatorPayPage() {
  const { employeeId } = await requireAuth();

  // ONLY fetch pending advances. NO wages, NO hourly rates.
  const pendingAdvances = await prisma.salaryAdvance.findMany({
    where: {
      employeeId: employeeId,
      status: "PENDING"
    }
  });

  const totalPendingAdvances = pendingAdvances.reduce((sum, adv) => sum + Number(adv.amount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="pt-2">
        <h1 className="text-2xl font-black text-white mt-0.5 uppercase tracking-wider">Pay & Settlement</h1>
        <p className="text-xs text-zinc-500 mt-1 font-bold">
           Employee Payroll Tracking
        </p>
      </div>

      <div className="space-y-6">
         {/* Office Debt / Advances Card */}
         <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 relative overflow-hidden">
           <div className="absolute top-0 right-0 p-4 opacity-5">
              <Wallet className="w-24 h-24 text-red-500" />
           </div>
           <h2 className="text-[11px] font-black uppercase tracking-widest text-zinc-500 mb-2">Current Office Debt (Advances)</h2>
           <div className="flex items-end gap-1 mt-2">
             <span className="text-4xl font-black text-red-400">₹{totalPendingAdvances.toLocaleString()}</span>
           </div>
         </div>

         {/* Hardcoded Static Message */}
         <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
           <h2 className="text-[11px] font-black uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
              <Info className="w-4 h-4 text-emerald-400" /> Payment Info
           </h2>
           <div className="space-y-3 text-sm text-zinc-300">
             <p className="font-bold text-white">Daily wages are calculated and distributed by the office every Saturday.</p>
             <p className="text-xs text-zinc-500">Contact the office directly if you have questions regarding your shift counts or specific daily rates.</p>
           </div>
         </div>
      </div>
    </div>
  );
}
