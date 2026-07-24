import React from "react";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText, CheckCircle2, Clock, DollarSign, ExternalLink, Calendar, MapPin } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function BillingListPage() {
  const session = await auth();
  if (!session?.user || (session.user.role !== "OWNER" && session.user.role !== "STAFF")) {
    redirect("/");
  }

  const invoices = await prisma.invoice.findMany({
    include: {
      customer: true,
      items: true,
      dispatches: {
        include: {
          machine: true,
          operator: true,
          driver: true,
          mainHelper: true,
        },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  // Summary KPI calculation
  const totalBilled = invoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0);
  const totalPaidCash = invoices.reduce((sum, inv) => sum + Number(inv.paidCash || 0), 0);
  const totalPaidUpi = invoices.reduce((sum, inv) => sum + Number(inv.paidUpi || 0), 0);
  const totalPaidBank = invoices.reduce((sum, inv) => sum + Number(inv.paidBank || 0), 0);
  const totalCollected = totalPaidCash + totalPaidUpi + totalPaidBank;
  const pendingCollection = Math.max(0, totalBilled - totalCollected);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 pb-20">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-900/80 border border-slate-800 p-5 rounded-2xl shadow-xl gap-4">
          <div className="flex items-center gap-4">
            <Link
              href="/admin/dashboard"
              className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                <FileText className="w-6 h-6 text-emerald-400" />
                Zero Billing & Split Payment Command Center
              </h1>
              <p className="text-xs text-slate-400">
                Module B — Customer Invoicing (`Bill Slip #1583`), Custom ₹ Row Overrides, and Combined Cash/UPI Ledger
              </p>
            </div>
          </div>

          <Link
            href="/admin/dispatch"
            className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all"
          >
            Go to Booking Ledger →
          </Link>
        </div>

        {/* Financial KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">Total Billed Volume</span>
            <div className="text-2xl font-black text-white">₹{totalBilled.toLocaleString()}</div>
            <span className="text-xs text-slate-500">Across {invoices.length} invoices generated</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-400">Total Collected (Cash + UPI)</span>
            <div className="text-2xl font-black text-emerald-400">₹{totalCollected.toLocaleString()}</div>
            <div className="flex gap-2 text-[11px] font-mono text-slate-400">
              <span>Cash: ₹{totalPaidCash.toLocaleString()}</span>
              <span>UPI: ₹{totalPaidUpi.toLocaleString()}</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-amber-400">Pending / Unpaid Balance</span>
            <div className="text-2xl font-black text-amber-400">₹{pendingCollection.toLocaleString()}</div>
            <span className="text-xs text-slate-500">Awaiting contractor settlement</span>
          </div>

          <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl shadow-xl space-y-1">
            <span className="text-[10px] uppercase font-bold tracking-wider text-blue-400">Active Billing Slips</span>
            <div className="text-2xl font-black text-blue-400">{invoices.length} Slips</div>
            <span className="text-xs text-slate-500">V15.0 custom row item format</span>
          </div>
        </div>

        {/* Invoices List Table */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
          <div className="p-4 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              Generated Bill Slips (Click to View/Edit Custom Amounts & Split Payment)
            </h3>
            <span className="text-xs text-slate-400 font-mono">Showing all {invoices.length} slips</span>
          </div>

          {invoices.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <FileText className="w-12 h-12 text-slate-600 mx-auto opacity-50" />
              <h4 className="text-base font-bold text-white">No bills generated yet</h4>
              <p className="text-xs max-w-sm mx-auto text-slate-500">
                Go to the Booking Ledger page and click &quot;Generate Bill Slip #1583&quot; on any booking!
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-950/80 border-b border-slate-800 text-slate-400 text-[10px] font-black uppercase tracking-wider">
                    <th className="p-4">Bill # & Date</th>
                    <th className="p-4">Contractor / Customer</th>
                    <th className="p-4">Site & Booking Context</th>
                    <th className="p-4 text-right">Net Bill Amount</th>
                    <th className="p-4">Collection Split (`Cash / UPI`)</th>
                    <th className="p-4 text-center">Status</th>
                    <th className="p-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {invoices.map((inv) => {
                    const paidTotal = Number(inv.paidCash || 0) + Number(inv.paidUpi || 0) + Number(inv.paidBank || 0);
                    const isPaid = inv.status === "PAID" || paidTotal >= Number(inv.totalAmount);
                    const firstDispatch = inv.dispatches?.[0];

                    return (
                      <tr key={inv.id} className="hover:bg-slate-800/40 transition-colors">
                        <td className="p-4 font-mono font-bold text-white">
                          <div className="text-amber-400 text-sm">#{inv.billNumber}</div>
                          <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {new Date(inv.date).toISOString().split("T")[0]}
                          </div>
                        </td>

                        <td className="p-4">
                          <div className="font-bold text-slate-200 text-sm">{inv.customer?.name}</div>
                          <div className="text-slate-400 font-mono text-[11px]">{inv.customer?.phone || "No phone"}</div>
                        </td>

                        <td className="p-4 text-slate-300">
                          <div className="flex items-center gap-1 font-medium">
                            <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                            <span className="truncate max-w-[200px]">{inv.siteLocation || firstDispatch?.location || "Direct Site"}</span>
                          </div>
                          {firstDispatch && (
                            <div className="text-[11px] text-slate-400 mt-1 flex flex-wrap gap-2">
                              <span>Op: <strong className="text-white">{firstDispatch.operator?.name || "Optional"}</strong></span>
                              <span>• Helpers: <strong className="text-white">{firstDispatch.helperCount || 0} Workers</strong></span>
                            </div>
                          )}
                        </td>

                        <td className="p-4 text-right font-mono font-black text-white text-sm">
                          ₹{Number(inv.totalAmount).toLocaleString()}
                          {Number(inv.advanceDeducted) > 0 && (
                            <div className="text-[10px] text-red-400 font-normal">
                              -₹{Number(inv.advanceDeducted)} Adv Deducted
                            </div>
                          )}
                        </td>

                        <td className="p-4 font-mono text-xs">
                          {paidTotal === 0 ? (
                            <span className="text-slate-500 italic">No payments logged</span>
                          ) : (
                            <div className="space-y-0.5">
                              {Number(inv.paidCash) > 0 && (
                                <div className="text-emerald-400">💵 Cash: ₹{Number(inv.paidCash).toLocaleString()}</div>
                              )}
                              {Number(inv.paidUpi) > 0 && (
                                <div className="text-blue-400">📱 UPI: ₹{Number(inv.paidUpi).toLocaleString()}</div>
                              )}
                              {Number(inv.paidBank) > 0 && (
                                <div className="text-purple-400">🏦 Bank: ₹{Number(inv.paidBank).toLocaleString()}</div>
                              )}
                            </div>
                          )}
                        </td>

                        <td className="p-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                            isPaid ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                            inv.status === "CANCELLED" ? "bg-red-500/20 text-red-400 border border-red-500/30" :
                            "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                          }`}>
                            {isPaid ? "✅ PAID" : inv.status}
                          </span>
                        </td>

                        <td className="p-4 text-right">
                          <Link
                            href={`/admin/billing/${inv.id}`}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-emerald-600/90 hover:bg-emerald-500 text-white font-extrabold shadow transition-all"
                          >
                            <span>Open Bill #1583</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
