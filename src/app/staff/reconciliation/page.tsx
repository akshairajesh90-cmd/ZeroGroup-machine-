import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/serverAuth";
import { Role } from "@prisma/client";
import { format } from "date-fns";
import { IndianRupee, CheckCircle2 } from "lucide-react";
import { verifyPayment } from "@/actions/payments";

export const dynamic = "force-dynamic";

export default async function CashReconciliationPage() {
  await requireAuth({ allowedRoles: [Role.OWNER, Role.ADMIN, Role.STAFF] });

  const unverifiedPayments = await prisma.paymentRecord.findMany({
    where: { verifiedByStaff: false },
    include: {
      collectedBy: { select: { name: true, role: true } },
      dispatch: { select: { location: true, customer: { select: { name: true } } } }
    },
    orderBy: { createdAt: "desc" }
  });

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Cash Reconciliation</h1>
          <p className="text-zinc-400 mt-2">Physically verify cash and UPI payments collected by field crews.</p>
        </div>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
        {unverifiedPayments.length === 0 ? (
          <div className="p-8 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-3" />
            <p className="text-white font-bold text-lg">All caught up!</p>
            <p className="text-zinc-500 text-sm mt-1">No unverified payments pending.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/80">
            {unverifiedPayments.map((record) => (
              <div key={record.id} className="p-5 flex items-center justify-between hover:bg-zinc-800/50 transition-colors">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl font-black text-emerald-400 flex items-center">
                      <IndianRupee className="w-5 h-5 mr-1" />
                      {Number(record.amount).toLocaleString("en-IN")}
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      record.method === "CASH" 
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-blue-500/10 text-blue-400 border-blue-500/20"
                    }`}>
                      {record.method}
                    </span>
                  </div>
                  
                  <div className="mt-2 text-sm text-zinc-300">
                    <span className="font-bold text-white">{record.collectedBy.name}</span> ({record.collectedBy.role})
                  </div>
                  <div className="mt-0.5 text-xs text-zinc-500">
                    {record.dispatch.customer?.name} • {record.dispatch.location} • {format(new Date(record.createdAt), "MMM d, h:mm a")}
                  </div>
                </div>

                <form action={async () => {
                  "use server";
                  await verifyPayment(record.id);
                }}>
                  <button type="submit" className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold py-2.5 px-4 rounded-lg transition-colors text-sm">
                    <CheckCircle2 className="w-4 h-4" /> Verify & Approve
                  </button>
                </form>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
