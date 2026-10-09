import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import PrintButton from "@/components/admin/PrintButton";

export default async function PrintInvoicePage({ params }: { params: { invoiceId: string } }) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: params.invoiceId },
    include: {
      customer: true,
      items: true,
      payments: true,
      dispatches: {
        include: {
          machine: true,
          operator: true,
        }
      }
    }
  });

  if (!invoice) return notFound();

  return (
    <div className="bg-white text-black min-h-screen p-8 print:p-0 font-sans">
      <div className="max-w-4xl mx-auto border border-gray-200 shadow-lg print:border-none print:shadow-none bg-white p-12">
        
        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-slate-900 pb-6 mb-8">
          <div>
            <h1 className="text-4xl font-black tracking-tighter text-slate-900">ZERO GROUP</h1>
            <p className="text-sm font-semibold text-slate-600 mt-1">Equipment Rental & Services</p>
            <div className="mt-4 text-xs text-slate-500">
              <p>123 Industrial Area, Ernakulam, Kerala</p>
              <p>Phone: +91 98765 43210</p>
              <p>Email: accounts@zerogroup.com</p>
            </div>
          </div>
          <div className="text-right">
            <h2 className="text-3xl font-black text-slate-800 uppercase tracking-widest">INVOICE</h2>
            <div className="mt-4 space-y-1 text-sm font-medium text-slate-700">
              <p>Invoice #: <span className="font-bold">{invoice.invoiceNumber}</span></p>
              <p>Date: {format(new Date(invoice.issuedDate), 'dd MMM yyyy')}</p>
              <p>Status: <span className="font-bold uppercase">{invoice.status}</span></p>
            </div>
          </div>
        </div>

        {/* Bill To & Details */}
        <div className="flex justify-between mb-8">
          <div className="w-1/2">
            <h3 className="text-xs font-bold uppercase text-slate-400 mb-2 tracking-wider">Bill To</h3>
            <p className="text-lg font-bold text-slate-900">{invoice.customer.name}</p>
            {invoice.customer.phone && <p className="text-sm text-slate-600">{invoice.customer.phone}</p>}
            {invoice.customer.address && <p className="text-sm text-slate-600 whitespace-pre-wrap">{invoice.customer.address}</p>}
          </div>
          <div className="w-1/2 text-right">
            <h3 className="text-xs font-bold uppercase text-slate-400 mb-2 tracking-wider">Service Details</h3>
            {invoice.dispatches.map(d => (
              <div key={d.id} className="text-sm text-slate-700 mb-1">
                <p>Service Date: {format(new Date(d.dateOfService), 'dd MMM yyyy')}</p>
                {d.siteBundleId && <p>Site ID: {d.siteBundleId}</p>}
              </div>
            ))}
          </div>
        </div>

        {/* Line Items Table */}
        <div className="mb-8 border rounded-lg overflow-hidden border-slate-300">
          <table className="w-full text-sm">
            <thead className="bg-slate-100 border-b border-slate-300 text-slate-700 uppercase text-xs font-bold tracking-wider">
              <tr>
                <th className="py-3 px-4 text-left">Description</th>
                <th className="py-3 px-4 text-right w-24">Qty</th>
                <th className="py-3 px-4 text-right w-32">Rate (₹)</th>
                <th className="py-3 px-4 text-right w-32">Total (₹)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {invoice.items.map((item) => (
                <tr key={item.id}>
                  <td className="py-3 px-4 text-slate-800">{item.description}</td>
                  <td className="py-3 px-4 text-right text-slate-700">{item.quantity}</td>
                  <td className="py-3 px-4 text-right text-slate-700">{Number(item.rate).toFixed(2)}</td>
                  <td className="py-3 px-4 text-right font-bold text-slate-900">{Number(item.total).toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals Section */}
        <div className="flex justify-end mb-12">
          <div className="w-80 space-y-3 text-sm">
            <div className="flex justify-between border-b border-slate-200 pb-2">
              <span className="font-bold text-slate-600">Subtotal</span>
              <span className="font-bold text-slate-900">₹{Number(invoice.totalAmount).toFixed(2)}</span>
            </div>
            
            {(Number(invoice.paidCash) > 0 || Number(invoice.paidUpi) > 0 || Number(invoice.paidBank) > 0) && (
              <div className="py-2 space-y-1">
                <span className="font-bold text-slate-600 uppercase text-xs tracking-wider">Payments Received</span>
                {Number(invoice.paidCash) > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Cash</span>
                    <span>-₹{Number(invoice.paidCash).toFixed(2)}</span>
                  </div>
                )}
                {Number(invoice.paidUpi) > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>UPI</span>
                    <span>-₹{Number(invoice.paidUpi).toFixed(2)}</span>
                  </div>
                )}
                {Number(invoice.paidBank) > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Bank Transfer</span>
                    <span>-₹{Number(invoice.paidBank).toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-between border-t-2 border-slate-900 pt-3 text-lg">
              <span className="font-black text-slate-900">Amount Due</span>
              <span className="font-black text-rose-600">
                ₹{Math.max(0, Number(invoice.totalAmount) - (Number(invoice.paidCash) + Number(invoice.paidUpi) + Number(invoice.paidBank))).toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 pt-6 text-xs text-slate-500 flex justify-between">
          <div>
            <p className="font-bold text-slate-700 mb-1">Terms & Conditions</p>
            <p>1. Please pay within the due date.</p>
            <p>2. Payment disputes must be reported within 24 hours.</p>
          </div>
          <div className="text-right">
            <p className="font-bold text-slate-700 mb-8 mt-4">Authorized Signature</p>
            <div className="w-48 border-b border-slate-400 inline-block"></div>
          </div>
        </div>
        
        <PrintButton />

      </div>
    </div>
  );
}
