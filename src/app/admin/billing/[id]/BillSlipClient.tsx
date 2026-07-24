"use client";

import React, { useState, useTransition } from "react";
import { updateBillAndPayment } from "@/actions/billing";
import { 
  FileText, 
  DollarSign, 
  Save, 
  Printer, 
  PlusCircle, 
  Trash2, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle, 
  Loader2,
  Calendar,
  MapPin,
  Phone,
  UserCheck,
  Truck,
  Wrench,
  Users
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface BillItem {
  id?: string;
  itemKey: string;
  malayalamName?: string;
  description: string;
  quantity: number;
  rate: number;
  total: number;
}

interface BillSlipClientProps {
  invoice: any;
  userRole: string;
}

export default function BillSlipClient({ invoice, userRole }: BillSlipClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Core invoice editable state
  const [billNumber, setBillNumber] = useState(invoice.billNumber || "1583");
  const [notes, setNotes] = useState(invoice.notes || "");
  const [status, setStatus] = useState(invoice.status || "ISSUED");

  // Editable Line Items
  const [items, setItems] = useState<BillItem[]>(
    invoice.items && invoice.items.length > 0
      ? invoice.items.map((it: any) => ({
          id: it.id,
          itemKey: it.itemKey || "CUSTOM",
          malayalamName: it.malayalamName || "",
          description: it.description || "",
          quantity: Number(it.quantity || 1),
          rate: Number(it.rate || 0),
          total: Number(it.total || 0),
        }))
      : []
  );

  // Financial Split Payments & Advance
  const [advanceDeducted, setAdvanceDeducted] = useState<number>(Number(invoice.advanceDeducted || 0));
  const [paidCash, setPaidCash] = useState<number>(Number(invoice.paidCash || 0));
  const [paidUpi, setPaidUpi] = useState<number>(Number(invoice.paidUpi || 0));
  const [paidBank, setPaidBank] = useState<number>(Number(invoice.paidBank || 0));

  // Calculations
  const grossTotal = items.reduce((sum, item) => sum + Number(item.total || 0), 0);
  const netPayable = Math.max(0, grossTotal - advanceDeducted);
  const totalCollected = paidCash + paidUpi + paidBank;
  const remainingBalance = Math.max(0, netPayable - totalCollected);
  const isFullyPaid = totalCollected >= netPayable && netPayable > 0;

  // Handle custom row edits
  const handleItemChange = (index: number, field: keyof BillItem, value: string | number) => {
    const next = [...items];
    const row = { ...next[index] };

    if (field === "quantity") {
      const q = Math.max(1, Number(value) || 1);
      row.quantity = q;
      row.total = q * row.rate;
    } else if (field === "rate") {
      const r = Math.max(0, Number(value) || 0);
      row.rate = r;
      row.total = row.quantity * r;
    } else if (field === "total") {
      // Direct custom amount override (`₹ Column`)!
      const t = Math.max(0, Number(value) || 0);
      row.total = t;
      if (row.quantity > 0) {
        row.rate = t / row.quantity;
      }
    } else if (field === "description" || field === "malayalamName") {
      (row as any)[field] = value as string;
    }

    next[index] = row;
    setItems(next);
  };

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        itemKey: "CUSTOM",
        malayalamName: "കസ്റ്റം ഇനം",
        description: "Custom Tool Rent / Extra Charge",
        quantity: 1,
        rate: 500,
        total: 500,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  // Quick auto-split helpers
  const handleFillAllCash = () => {
    setPaidCash(netPayable);
    setPaidUpi(0);
    setPaidBank(0);
  };

  const handleFillAllUpi = () => {
    setPaidUpi(netPayable);
    setPaidCash(0);
    setPaidBank(0);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    startTransition(async () => {
      const res = await updateBillAndPayment({
        invoiceId: invoice.id,
        billNumber,
        advanceDeducted,
        paidCash,
        paidUpi,
        paidBank,
        status: isFullyPaid ? "PAID" : status,
        notes: notes || undefined,
        items,
      });

      if (!res.success) {
        setErrorMsg(res.error || "Failed to update bill slip.");
      } else {
        setSuccessMsg(`Bill #${billNumber} saved successfully! ${isFullyPaid ? "Marked PAID." : ""}`);
        router.refresh();
      }
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const firstDispatch = invoice.dispatches?.[0];

  return (
    <div className="space-y-6">
      {/* Top Navigation & Action Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between bg-slate-900/90 border border-slate-800 p-4 rounded-2xl shadow-xl gap-4 print:hidden">
        <div className="flex items-center gap-4">
          <Link
            href="/admin/billing"
            className="w-10 h-10 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              <FileText className="w-5 h-5 text-emerald-400" />
              Bill Slip #{billNumber} Editor (`Custom ₹ Rows & Combined Cash/UPI`)
            </h1>
            <p className="text-xs text-slate-400">
              Contractor: <strong className="text-white">{invoice.customer?.name}</strong> • Site: <strong className="text-white">{invoice.siteLocation || "Direct Site"}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handlePrint}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-2 border border-slate-700 transition-all shadow"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            Print / PDF Bill Slip
          </button>
          <button
            onClick={handleSubmit}
            disabled={isPending}
            className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Bill Slip & Ledger
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-500/10 border border-red-500/30 text-red-400 rounded-xl text-xs font-bold print:hidden">
          {errorMsg}
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-bold print:hidden">
          {successMsg}
        </div>
      )}

      {/* MAIN BILL SLIP CONTAINER (Designed for Screen & Print) */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl print:bg-white print:text-black print:border-none print:shadow-none print:p-0">
        {/* Bill Header / Letterhead */}
        <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-6 print:border-black gap-4">
          <div>
            <div className="text-2xl font-black text-amber-400 tracking-wider uppercase print:text-black">
              ZERO GROUP (`സീറോ ഗ്രൂപ്പ്`)
            </div>
            <p className="text-xs text-slate-400 print:text-gray-700 font-medium">
              Construction Equipment Rental, Lift, Hydraulic Machine & Labor Solutions
            </p>
            <p className="text-xs text-slate-400 print:text-gray-700">Kakkanad, Kochi • Phone: 9847000000</p>
          </div>

          <div className="md:text-right space-y-1">
            <div className="flex items-center md:justify-end gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase print:text-gray-600">Bill Number:</span>
              <input
                type="text"
                value={billNumber}
                onChange={(e) => setBillNumber(e.target.value)}
                className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-sm font-mono font-black text-amber-400 w-24 text-center focus:border-amber-500 outline-none print:border-none print:bg-transparent print:text-black print:p-0"
              />
            </div>
            <div className="text-xs text-slate-300 print:text-gray-800 flex items-center md:justify-end gap-1">
              <Calendar className="w-3.5 h-3.5 text-emerald-400 print:hidden" />
              <span>Date: {new Date(invoice.date).toISOString().split("T")[0]}</span>
            </div>
            <div className="text-xs text-slate-300 print:text-gray-800">
              Status: <strong className="text-emerald-400 print:text-black">{isFullyPaid ? "PAID" : status}</strong>
            </div>
          </div>
        </div>

        {/* Customer & Booking Context Info Box */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-6 border-b border-slate-800 print:border-black">
          <div className="space-y-1.5">
            <span className="text-[10px] font-black uppercase tracking-wider text-amber-400 print:text-black block">
              Billed To Contractor / Customer:
            </span>
            <div className="text-lg font-black text-white print:text-black">{invoice.customer?.name}</div>
            <div className="text-xs text-slate-400 print:text-gray-700 flex items-center gap-1.5 font-mono">
              <Phone className="w-3 h-3 text-amber-400 print:hidden" />
              {invoice.customer?.phone || "No phone listed"}
            </div>
            {invoice.customer?.address && (
              <div className="text-xs text-slate-400 print:text-gray-700">{invoice.customer.address}</div>
            )}
          </div>

          <div className="bg-slate-950/80 p-4 rounded-2xl border border-slate-800/80 space-y-2 print:bg-gray-100 print:border-gray-300">
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-400 print:text-black block flex items-center gap-1">
              <Truck className="w-3.5 h-3.5" /> Auto-Pulled Booking Context & Logistics:
            </span>
            <div className="text-xs text-slate-300 print:text-black space-y-1">
              <div><strong>Site Location:</strong> {invoice.siteLocation || firstDispatch?.location || "Direct Site"}</div>
              {firstDispatch ? (
                <>
                  <div><strong>Equipment:</strong> {firstDispatch.machine?.machineId || "Independent"} ({firstDispatch.mixerCategory || "STANDARD"}, {firstDispatch.liftFloors || 1} Floored used)</div>
                  <div><strong>Caller Leader (`Mestri`):</strong> {firstDispatch.mainHelperName || firstDispatch.mainHelper?.name || "Direct Caller"} representing <strong className="text-amber-400 print:text-black">{firstDispatch.helperCount || 0} Helpers only</strong></div>
                  <div><strong>Operator & Conveyance:</strong> Op: <strong className="text-white print:text-black">{firstDispatch.operator?.name || "Optional"}</strong> • Transport: <strong className="text-white print:text-black">{firstDispatch.publicTransportUsed ? "Public Transport / Outside" : (firstDispatch.driver?.name || "Company Driver")}</strong></div>
                </>
              ) : (
                <div className="text-slate-500 italic">Direct manual bill slip entry</div>
              )}
            </div>
          </div>
        </div>

        {/* LINE ITEMS TABLE (Malayalam + English combined & Custom ₹ Amount entry) */}
        <div className="py-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black uppercase text-white print:text-black flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400 print:hidden" />
              Bill Line Items (`Optional Custom Amount Entry in ₹ Column`)
            </h3>
            <button
              type="button"
              onClick={handleAddItem}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold text-xs flex items-center gap-1.5 border border-slate-700 print:hidden"
            >
              <PlusCircle className="w-3.5 h-3.5" /> + Add Custom Row
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-950/90 border-b border-slate-800 text-slate-400 print:bg-gray-200 print:text-black print:border-black text-[11px] font-black uppercase tracking-wider">
                  <th className="p-3.5 w-[36%]">Item Category (`English + Malayalam Combined`)</th>
                  <th className="p-3.5 w-[28%]">Description (`e.g., 3 Floored used, 12 Helpers only`)</th>
                  <th className="p-3.5 w-[10%] text-center">Qty</th>
                  <th className="p-3.5 w-[12%] text-right">Rate (₹)</th>
                  <th className="p-3.5 w-[14%] text-right">Custom Amount (₹)</th>
                  <th className="p-3.5 w-[5%] text-center print:hidden"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 print:divide-gray-300">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-6 text-center text-slate-500 italic">
                      No line items currently added. Click &quot;+ Add Custom Row&quot; above to add bill items.
                    </td>
                  </tr>
                ) : (
                  items.map((row, idx) => (
                    <tr key={idx} className="hover:bg-slate-800/20 transition-colors">
                      {/* Item Category & Malayalam combined */}
                      <td className="p-3 space-y-1">
                        <div className="flex items-center gap-2 font-bold text-white print:text-black text-sm">
                          <span>{row.itemKey}</span>
                          {row.malayalamName && (
                            <span className="text-amber-400 font-medium print:text-black text-xs">
                              ({row.malayalamName})
                            </span>
                          )}
                        </div>
                        <input
                          type="text"
                          value={row.malayalamName || ""}
                          onChange={(e) => handleItemChange(idx, "malayalamName", e.target.value)}
                          placeholder="Malayalam label (e.g. പണിക്കൂലി)"
                          className="w-full bg-slate-950 border border-slate-800 rounded px-2 py-1 text-[11px] text-slate-300 placeholder:text-slate-600 focus:border-amber-500 outline-none print:hidden"
                        />
                      </td>

                      {/* Description */}
                      <td className="p-3">
                        <input
                          type="text"
                          value={row.description}
                          onChange={(e) => handleItemChange(idx, "description", e.target.value)}
                          placeholder="e.g. 3 Floored used / 12 Helpers only"
                          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-2 text-xs font-bold text-white focus:border-amber-500 outline-none print:border-none print:bg-transparent print:text-black print:p-0"
                        />
                      </td>

                      {/* Quantity */}
                      <td className="p-3 text-center">
                        <input
                          type="number"
                          min="1"
                          value={row.quantity}
                          onChange={(e) => handleItemChange(idx, "quantity", e.target.value)}
                          className="w-16 bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs font-mono font-bold text-white text-center focus:border-amber-500 outline-none print:border-none print:bg-transparent print:text-black print:p-0"
                        />
                      </td>

                      {/* Rate */}
                      <td className="p-3 text-right">
                        <input
                          type="number"
                          min="0"
                          value={row.rate}
                          onChange={(e) => handleItemChange(idx, "rate", e.target.value)}
                          className="w-24 bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-xs font-mono font-bold text-slate-300 text-right focus:border-amber-500 outline-none print:border-none print:bg-transparent print:text-black print:p-0"
                        />
                      </td>

                      {/* Custom Amount (Exact ₹ Override column) */}
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <span className="text-slate-500 print:text-black">₹</span>
                          <input
                            type="number"
                            min="0"
                            value={row.total}
                            onChange={(e) => handleItemChange(idx, "total", e.target.value)}
                            className="w-28 bg-slate-950 border border-amber-500/60 rounded-lg p-2 text-sm font-mono font-black text-amber-400 text-right focus:border-amber-400 focus:ring-1 focus:ring-amber-400 outline-none print:border-none print:bg-transparent print:text-black print:p-0"
                          />
                        </div>
                      </td>

                      {/* Remove Row button */}
                      <td className="p-3 text-center print:hidden">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* SPLIT PAYMENT (CASH + UPI) & ADVANCE DEDUCTION TOOLBAR */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 py-6 border-t border-slate-800 print:border-black">
          {/* Notes & Terms */}
          <div className="space-y-3">
            <span className="text-xs font-black uppercase text-slate-400 print:text-black block">
              Bill Notes & Terms (`No Cement Bags Included`):
            </span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Enter payment terms, bank account details, or specific agreement notes..."
              rows={4}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white placeholder:text-slate-600 focus:border-amber-500 outline-none print:border-none print:bg-transparent print:text-black print:p-0"
            />
            <p className="text-[10px] text-slate-500 print:text-gray-600 font-mono">
              Note: Per V15.0 rules, 87 cement bags or raw materials are custom notes only and NOT listed as equipment/labor rows on the invoice.
            </p>
          </div>

          {/* Ledger Calculation Summary */}
          <div className="bg-slate-950/90 p-5 rounded-2xl border border-slate-800/80 space-y-3.5 print:bg-gray-100 print:border-gray-300">
            <div className="flex items-center justify-between text-xs text-slate-400 print:text-gray-700">
              <span>Gross Line Items Total:</span>
              <span className="font-mono font-bold text-white print:text-black text-sm">₹{grossTotal.toLocaleString()}</span>
            </div>

            {/* Advance Deduction */}
            <div className="flex items-center justify-between text-xs text-red-400 font-bold border-b border-slate-800 pb-3 print:border-gray-300">
              <span className="flex items-center gap-1">
                <span>(-) Advance Already Deducted (`അഡ്വാൻസ്`):</span>
              </span>
              <div className="flex items-center gap-1">
                <span>-₹</span>
                <input
                  type="number"
                  min="0"
                  value={advanceDeducted}
                  onChange={(e) => setAdvanceDeducted(Math.max(0, Number(e.target.value) || 0))}
                  className="w-24 bg-slate-900 border border-red-500/40 rounded-lg p-1.5 text-xs font-mono font-black text-red-400 text-right focus:border-red-400 outline-none print:border-none print:bg-transparent print:text-black print:p-0"
                />
              </div>
            </div>

            {/* Net Payable */}
            <div className="flex items-center justify-between text-base font-black text-white print:text-black">
              <span>(=) Net Payable Amount (`ആകെ നൽകേണ്ടത്`):</span>
              <span className="font-mono text-xl text-amber-400 print:text-black">₹{netPayable.toLocaleString()}</span>
            </div>

            {/* Combined Split Payments Inputs (CASH + UPI + BANK) */}
            <div className="pt-3 border-t border-slate-800/80 space-y-2.5 print:border-gray-300">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-black uppercase tracking-wider text-emerald-400 print:text-black">
                  Combined Split Payment Collection (`CASH / UPI`):
                </span>
                <div className="flex gap-1.5 print:hidden">
                  <button
                    type="button"
                    onClick={handleFillAllCash}
                    className="text-[10px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-bold hover:bg-emerald-500 hover:text-slate-950 transition-all"
                  >
                    100% Cash
                  </button>
                  <button
                    type="button"
                    onClick={handleFillAllUpi}
                    className="text-[10px] bg-blue-500/20 text-blue-400 px-2 py-0.5 rounded font-bold hover:bg-blue-500 hover:text-white transition-all"
                  >
                    100% UPI
                  </button>
                </div>
              </div>

              {/* Cash Input */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 print:text-black flex items-center gap-1.5">
                  <span>💵 Cash Received (`പണം`):</span>
                </span>
                <div className="flex items-center gap-1">
                  <span className="text-slate-500">₹</span>
                  <input
                    type="number"
                    min="0"
                    value={paidCash}
                    onChange={(e) => setPaidCash(Math.max(0, Number(e.target.value) || 0))}
                    className="w-28 bg-slate-900 border border-emerald-500/40 rounded-lg p-1.5 text-xs font-mono font-bold text-emerald-400 text-right focus:border-emerald-400 outline-none print:border-none print:bg-transparent print:text-black print:p-0"
                  />
                </div>
              </div>

              {/* UPI Input */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 print:text-black flex items-center gap-1.5">
                  <span>📱 UPI / GPay / PhonePe Received (`യുപിഐ`):</span>
                </span>
                <div className="flex items-center gap-1">
                  <span className="text-slate-500">₹</span>
                  <input
                    type="number"
                    min="0"
                    value={paidUpi}
                    onChange={(e) => setPaidUpi(Math.max(0, Number(e.target.value) || 0))}
                    className="w-28 bg-slate-900 border border-blue-500/40 rounded-lg p-1.5 text-xs font-mono font-bold text-blue-400 text-right focus:border-blue-400 outline-none print:border-none print:bg-transparent print:text-black print:p-0"
                  />
                </div>
              </div>

              {/* Bank Transfer Input */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 print:text-black flex items-center gap-1.5">
                  <span>🏦 Bank / Cheque Transfer (`ബാങ്ക്`):</span>
                </span>
                <div className="flex items-center gap-1">
                  <span className="text-slate-500">₹</span>
                  <input
                    type="number"
                    min="0"
                    value={paidBank}
                    onChange={(e) => setPaidBank(Math.max(0, Number(e.target.value) || 0))}
                    className="w-28 bg-slate-900 border border-purple-500/40 rounded-lg p-1.5 text-xs font-mono font-bold text-purple-400 text-right focus:border-purple-400 outline-none print:border-none print:bg-transparent print:text-black print:p-0"
                  />
                </div>
              </div>
            </div>

            {/* Remaining Due */}
            <div className={`pt-3 border-t border-slate-800 flex items-center justify-between text-sm font-black print:border-gray-300 ${
              isFullyPaid ? "text-emerald-400 print:text-black" : "text-red-400 print:text-black"
            }`}>
              <span>{isFullyPaid ? "✅ Bill Fully Paid & Settled" : "⏳ Remaining Unpaid Balance:"}</span>
              <span className="font-mono text-base">₹{remainingBalance.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Footer / Signatures for Print */}
        <div className="pt-8 mt-6 border-t border-slate-800 grid grid-cols-2 text-xs text-slate-400 print:text-black print:border-black gap-8">
          <div className="space-y-8">
            <p className="font-bold">Contractor / Customer Signature:</p>
            <div className="border-b border-slate-700 w-48 print:border-black pt-4"></div>
          </div>
          <div className="space-y-8 text-right flex flex-col items-end">
            <p className="font-bold">For ZERO GROUP (`Authorized Signatory`):</p>
            <div className="border-b border-slate-700 w-48 print:border-black pt-4"></div>
          </div>
        </div>
      </div>
    </div>
  );
}
