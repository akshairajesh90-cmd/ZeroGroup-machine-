"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import { Search, FileText, AlertCircle, CheckCircle, Clock } from "lucide-react";

export default function InvoicesDashboard({
  customerBalances,
  invoices
}: {
  customerBalances: any[];
  invoices: any[];
}) {
  const [activeTab, setActiveTab] = useState<"CUSTOMERS" | "INVOICES">("CUSTOMERS");
  const [searchTerm, setSearchTerm] = useState("");
  const [invoiceFilter, setInvoiceFilter] = useState<"ALL" | "UNPAID" | "PARTIAL" | "PAID" | "OVERDUE">("ALL");

  const filteredCustomers = customerBalances.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    c.phone.includes(searchTerm)
  );

  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = inv.customer.name.toLowerCase().includes(searchTerm.toLowerCase()) || inv.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    let matchesFilter = true;
    if (invoiceFilter === "UNPAID") matchesFilter = inv.status === "UNPAID";
    if (invoiceFilter === "PARTIAL") matchesFilter = inv.status === "PARTIAL";
    if (invoiceFilter === "PAID") matchesFilter = inv.status === "PAID";
    if (invoiceFilter === "OVERDUE") {
      matchesFilter = inv.status !== "PAID" && new Date(inv.dueDate) < new Date();
    }

    return matchesSearch && matchesFilter;
  });

  return (
    <div className="space-y-6">
      {/* Tabs */}
      <div className="flex gap-4 border-b border-slate-800 pb-2">
        <button
          className={`pb-2 px-2 font-medium text-sm transition-colors ${
            activeTab === "CUSTOMERS"
              ? "border-b-2 border-blue-500 text-blue-400"
              : "text-slate-400 hover:text-slate-200"
          }`}
          onClick={() => setActiveTab("CUSTOMERS")}
        >
          Customer Balances
        </button>
        <button
          className={`pb-2 px-2 font-medium text-sm transition-colors ${
            activeTab === "INVOICES"
              ? "border-b-2 border-blue-500 text-blue-400"
              : "text-slate-400 hover:text-slate-200"
          }`}
          onClick={() => setActiveTab("INVOICES")}
        >
          Invoice Master List
        </button>
      </div>

      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-slate-900 p-4 rounded-xl border border-slate-800">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search name, phone, or invoice..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500"
          />
        </div>

        {activeTab === "INVOICES" && (
          <div className="flex gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            {["ALL", "OVERDUE", "UNPAID", "PARTIAL", "PAID"].map(f => (
              <button
                key={f}
                onClick={() => setInvoiceFilter(f as any)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-md border transition-colors whitespace-nowrap ${
                  invoiceFilter === f 
                    ? f === "OVERDUE" ? "bg-red-500/20 border-red-500 text-red-400" : "bg-blue-500/20 border-blue-500 text-blue-400" 
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:bg-slate-800"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Content Area */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 overflow-hidden">
        {activeTab === "CUSTOMERS" && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-400 uppercase bg-slate-950/50 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4 font-semibold">Customer</th>
                  <th className="px-6 py-4 font-semibold text-right">Total Billed</th>
                  <th className="px-6 py-4 font-semibold text-right">Total Paid (inc. Discounts)</th>
                  <th className="px-6 py-4 font-semibold text-right">Outstanding Balance</th>
                  <th className="px-6 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredCustomers.map(c => (
                  <tr key={c.id} className="hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-medium text-slate-200">{c.name}</div>
                      <div className="text-slate-500 text-xs mt-0.5">{c.phone}</div>
                    </td>
                    <td className="px-6 py-4 text-right font-mono text-slate-400">₹{c.totalBilled.toFixed(2)}</td>
                    <td className="px-6 py-4 text-right font-mono text-slate-400">₹{(c.totalPaid + c.totalDiscounts).toFixed(2)}</td>
                    <td className="px-6 py-4 text-right font-mono font-bold">
                      <span className={c.outstandingBalance > 0 ? "text-red-400" : "text-green-400"}>
                        ₹{c.outstandingBalance.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Link 
                        href={`/staff/invoices/${c.id}`}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-md transition-colors border border-slate-700"
                      >
                        <FileText className="w-3.5 h-3.5" /> Statement
                      </Link>
                    </td>
                  </tr>
                ))}
                {filteredCustomers.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-6 py-12 text-center text-slate-500">No customers found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === "INVOICES" && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-slate-400 uppercase bg-slate-950/50 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4 font-semibold">Invoice Details</th>
                  <th className="px-6 py-4 font-semibold">Customer</th>
                  <th className="px-6 py-4 font-semibold">Status</th>
                  <th className="px-6 py-4 font-semibold text-right">Amount</th>
                  <th className="px-6 py-4 font-semibold text-right">Balance Due</th>
                  <th className="px-6 py-4 text-center">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {filteredInvoices.map(inv => {
                  const isOverdue = inv.status !== "PAID" && new Date(inv.dueDate) < new Date();
                  const balanceDue = inv.totalAmount - inv.totalPaid - inv.discountAmount;

                  return (
                    <tr key={inv.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-medium text-slate-200">{inv.invoiceNumber}</div>
                        <div className="text-slate-500 text-xs mt-0.5">
                          Issued: {format(new Date(inv.issuedDate), "MMM dd, yyyy")}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-slate-300">{inv.customer.name}</div>
                        <div className="text-slate-500 text-xs mt-0.5">{inv.customer.phone}</div>
                      </td>
                      <td className="px-6 py-4">
                        {isOverdue ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-red-500/10 text-red-400 text-xs font-semibold border border-red-500/20">
                            <AlertCircle className="w-3 h-3" /> Overdue
                          </span>
                        ) : inv.status === "PAID" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-green-500/10 text-green-400 text-xs font-semibold border border-green-500/20">
                            <CheckCircle className="w-3 h-3" /> Paid
                          </span>
                        ) : inv.status === "PARTIAL" ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-orange-500/10 text-orange-400 text-xs font-semibold border border-orange-500/20">
                            <Clock className="w-3 h-3" /> Partial
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded bg-slate-800 text-slate-300 text-xs font-semibold border border-slate-700">
                            Unpaid
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="font-mono text-slate-200">₹{inv.totalAmount.toFixed(2)}</div>
                        {(inv.discountAmount > 0) && (
                          <div className="text-xs text-green-400 mt-0.5">Disc: -₹{inv.discountAmount.toFixed(2)}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right font-mono font-bold">
                        <span className={balanceDue > 0 ? "text-red-400" : "text-slate-500"}>
                          ₹{balanceDue.toFixed(2)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <Link 
                          href={`/staff/billing/${inv.id.replace('inv-', '')}?id=${inv.id}`} // Billing page handles invoice details
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium rounded-md transition-colors"
                        >
                          Collect
                        </Link>
                      </td>
                    </tr>
                  )
                })}
                {filteredInvoices.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">No invoices found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
