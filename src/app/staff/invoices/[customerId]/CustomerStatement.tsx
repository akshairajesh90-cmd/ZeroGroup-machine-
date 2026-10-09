"use client";

import { format } from "date-fns";
import { ArrowLeft, Printer } from "lucide-react";
import Link from "next/link";

export default function CustomerStatement({ data }: { data: any }) {
  const { customer, ledger, totalOutstanding } = data;

  return (
    <div className="bg-white text-slate-900 min-h-screen rounded-xl shadow-xl overflow-hidden print:shadow-none print:bg-transparent">
      {/* Top Navigation - Hidden on Print */}
      <div className="bg-slate-900 text-white p-4 flex justify-between items-center print:hidden">
        <Link 
          href="/staff/invoices" 
          className="flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>
        <button 
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium transition-colors"
        >
          <Printer className="w-4 h-4" /> Print / Save PDF
        </button>
      </div>

      {/* Statement Body - optimized for print */}
      <div className="p-8 print:p-0 space-y-8">
        
        {/* Header section */}
        <div className="flex justify-between items-end border-b-2 border-slate-200 pb-6">
          <div>
            <h1 className="text-4xl font-black tracking-tight text-slate-900">STATEMENT OF ACCOUNT</h1>
            <p className="text-slate-500 mt-1">Generated on: {format(new Date(), "MMM dd, yyyy")}</p>
          </div>
          <div className="text-right">
            <h2 className="text-xl font-bold text-slate-900">{customer.name}</h2>
            <p className="text-slate-500">{customer.phone}</p>
          </div>
        </div>

        {/* Summary Box */}
        <div className="bg-slate-50 p-6 rounded-lg border border-slate-200 flex justify-between items-center print:border-slate-300">
          <div>
            <div className="text-sm text-slate-500 font-semibold uppercase tracking-wider">Total Outstanding Balance</div>
            <div className={`text-4xl font-black mt-1 ${totalOutstanding > 0 ? "text-red-600" : "text-slate-900"}`}>
              ₹{totalOutstanding.toFixed(2)}
            </div>
          </div>
          <div className="text-right text-sm text-slate-500">
            Please review the ledger below.<br/> 
            Any discrepancies should be reported within 7 days.
          </div>
        </div>

        {/* Ledger Table */}
        <div className="mt-8">
          <table className="w-full text-sm text-left border-collapse">
            <thead className="text-xs text-slate-500 uppercase bg-slate-100 border-y border-slate-300 print:bg-slate-50">
              <tr>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Description</th>
                <th className="px-4 py-3 font-semibold text-right">Debit (₹)</th>
                <th className="px-4 py-3 font-semibold text-right">Credit (₹)</th>
                <th className="px-4 py-3 font-semibold text-right border-l border-slate-200">Balance (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {ledger.map((entry: any, i: number) => (
                <tr key={`${entry.id}-${i}`} className="hover:bg-slate-50">
                  <td className="px-4 py-3 whitespace-nowrap">{format(new Date(entry.date), "dd/MM/yyyy")}</td>
                  <td className="px-4 py-3">
                    <div className="font-medium text-slate-900">{entry.description}</div>
                    <div className="text-xs text-slate-500 uppercase font-semibold mt-0.5">{entry.type.replace('_', ' ')}</div>
                  </td>
                  <td className="px-4 py-3 text-right font-mono">
                    {entry.debit > 0 ? entry.debit.toFixed(2) : "-"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-green-600">
                    {entry.credit > 0 ? entry.credit.toFixed(2) : "-"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold border-l border-slate-200">
                    {entry.balance.toFixed(2)}
                  </td>
                </tr>
              ))}
              {ledger.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-500 italic">No transactions found for this customer.</td>
                </tr>
              )}
            </tbody>
            {ledger.length > 0 && (
              <tfoot className="bg-slate-50 border-y-2 border-slate-300 print:bg-transparent">
                <tr>
                  <td colSpan={2} className="px-4 py-3 text-right font-bold text-slate-900">FINAL BALANCE:</td>
                  <td className="px-4 py-3 text-right font-mono text-slate-500">
                    {ledger.reduce((acc: number, val: any) => acc + val.debit, 0).toFixed(2)}
                  </td>
                  <td className="px-4 py-3 text-right font-mono text-green-600">
                    {ledger.reduce((acc: number, val: any) => acc + val.credit, 0).toFixed(2)}
                  </td>
                  <td className={`px-4 py-3 text-right font-mono font-black border-l border-slate-200 text-lg ${totalOutstanding > 0 ? "text-red-600" : "text-slate-900"}`}>
                    ₹{totalOutstanding.toFixed(2)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>

        {/* Footer */}
        <div className="mt-12 pt-8 border-t border-slate-200 text-center text-xs text-slate-500">
          <p>Thank you for your business!</p>
          <p>This is a computer-generated statement and does not require a physical signature.</p>
        </div>
      </div>
    </div>
  );
}
