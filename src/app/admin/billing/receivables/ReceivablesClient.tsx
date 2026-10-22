"use client";

import { useState } from "react";
import { format } from "date-fns";
import ReceivablePaymentModal from "@/components/admin/ReceivablePaymentModal";

export default function ReceivablesClient({ initialInvoices }: { initialInvoices: any[] }) {
  const [invoices, setInvoices] = useState(initialInvoices);
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

  if (invoices.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-12 text-center shadow-sm">
        <h3 className="text-lg font-bold text-slate-700">No Invoices Yet</h3>
        <p className="text-slate-500 mt-2">Generate bills from the Daily Dispatch board and they will appear here.</p>
      </div>
    );
  }

  return (
    <>
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto [webkit-overflow-scrolling:touch]">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-xs">
            <tr>
              <th className="p-4">Customer</th>
              <th className="p-4">Invoice #</th>
              <th className="p-4">Due Date</th>
              <th className="p-4 text-right">Total Amount</th>
              <th className="p-4 text-right">Balance Due</th>
              <th className="p-4">Status</th>
              <th className="p-4 text-center">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {invoices.map((inv) => {
              const balance = Number(inv.totalAmount) - (Number(inv.paidCash) + Number(inv.paidUpi) + Number(inv.paidBank));
              const isOverdue = new Date(inv.dueDate) < new Date() && balance > 0;

              return (
                <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4">
                    <p className="font-bold text-slate-800">{inv.customer?.name}</p>
                    {inv.customer?.phone && <p className="text-xs text-slate-500">{inv.customer.phone}</p>}
                  </td>
                  <td className="p-4 font-mono text-slate-600">{inv.invoiceNumber}</td>
                  <td className="p-4">
                    <span className={`font-bold ${isOverdue ? 'text-rose-600' : 'text-slate-700'}`}>
                      {format(new Date(inv.dueDate), 'dd MMM yyyy')}
                    </span>
                    {isOverdue && <p className="text-[10px] text-rose-500 uppercase tracking-widest font-black mt-1">Overdue</p>}
                  </td>
                  <td className="p-4 text-right font-medium text-slate-600">
                    ₹{Number(inv.totalAmount).toFixed(2)}
                  </td>
                  <td className="p-4 text-right">
                    <span className="font-black text-rose-600 text-base">₹{balance.toFixed(2)}</span>
                  </td>
                  <td className="p-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${inv.status === 'UNPAID' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                      {inv.status}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex flex-col items-center gap-2">
                      {balance > 0 ? (
                        <button 
                          onClick={() => setSelectedInvoice(inv)}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-colors shadow-sm w-full"
                        >
                          Log Payment
                        </button>
                      ) : (
                        <span className="text-emerald-600 font-bold text-xs uppercase tracking-wider block py-1.5">Fully Paid</span>
                      )}
                      <a 
                        href={`/admin/billing/print/${inv.id}`} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-blue-600 hover:text-blue-800 text-[10px] font-bold underline"
                      >
                        View / Print Bill
                      </a>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>

      {selectedInvoice && (
        <ReceivablePaymentModal 
          isOpen={!!selectedInvoice}
          onClose={() => setSelectedInvoice(null)}
          invoice={selectedInvoice}
        />
      )}
    </>
  );
}
