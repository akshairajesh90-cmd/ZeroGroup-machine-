"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { generateAndCollectBill } from "@/actions/billing";
import { CheckCircle2, AlertTriangle, Plus, Trash2, Receipt, IndianRupee, Loader2 } from "lucide-react";

type Props = {
  dispatch: any;
  defaultItems: any[];
  collectorId: string;
};

export default function BillingClient({ dispatch, defaultItems, collectorId }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // 1. Line Items
  const [items, setItems] = useState<any[]>(defaultItems);
  
  const updateItem = (index: number, field: string, value: any) => {
    const newItems = [...items];
    newItems[index][field] = value;
    if (field === "rate" || field === "quantity") {
      newItems[index].total = Number(newItems[index].rate) * Number(newItems[index].quantity);
    } else if (field === "total") {
      newItems[index].total = Number(value);
    }
    setItems(newItems);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const addItem = () => {
    setItems([...items, { itemKey: "CUSTOM", description: "", quantity: 1, rate: 0, total: 0 }]);
  };

  const addTrollyBench = () => {
    setItems([...items, { itemKey: "TOOL_TROLLY_1_WHEEL_BENCH", description: "1-Wheel Trolly & Bench", quantity: 1, rate: 1500, total: 1500 }]);
  };

  const addTrollyToolRent = () => {
    setItems([...items, { itemKey: "TOOL_TROLLY_1_WHEEL_RENT", description: "1-Wheel Trolly & Bench - Tool Rent", quantity: 1, rate: 1000, total: 1000 }]);
  };

  const add2WheelTrolly = () => {
    setItems([...items, { itemKey: "TOOL_TROLLY_2_WHEEL", description: "2-Wheel Trolly (Tools Used)", quantity: 1, rate: 200, total: 200 }]);
  };

  const addDistanceSurcharge = () => {
    setItems([...items, { itemKey: "DISTANCE_SURCHARGE", description: "Distance / Travel Surcharge", quantity: 1, rate: 500, total: 500 }]);
  };

  // 2. Expenses
  const [expenses, setExpenses] = useState<any[]>([]);
  
  const addExpense = () => {
    setExpenses([...expenses, { category: "OTHER", description: "", amount: 0 }]);
  };

  const updateExpense = (index: number, field: string, value: any) => {
    const newExp = [...expenses];
    newExp[index][field] = value;
    setExpenses(newExp);
  };

  const removeExpense = (index: number) => {
    setExpenses(expenses.filter((_, i) => i !== index));
  };

  // 3. Late Fee
  const [lateFee, setLateFee] = useState<number>(0);

  // 4. Payments
  const [payments, setPayments] = useState<any[]>([]);
  
  // 5. Discount
  const [discountAmount, setDiscountAmount] = useState<number>(0);

  const addPayment = (method: string) => {
    const balance = totalAmount - totalPaid;
    setPayments([...payments, { method, amount: balance > 0 ? balance : 0, notes: "" }]);
  };

  const updatePayment = (index: number, field: string, value: any) => {
    const newPayments = [...payments];
    newPayments[index][field] = value;
    setPayments(newPayments);
  };

  const removePayment = (index: number) => {
    setPayments(payments.filter((_, i) => i !== index));
  };

  // Calculations
  const itemsTotal = items.reduce((sum, it) => sum + Number(it.total), 0);
  const totalAmount = itemsTotal + Number(lateFee);
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount), 0);
  const balanceDue = totalAmount - totalPaid - Number(discountAmount);

  const handleSubmit = () => {
    setError(null);
    if (totalAmount <= 0) {
      setError("Total amount must be greater than 0");
      return;
    }
    if (payments.length > 0 && payments.some(p => Number(p.amount) <= 0)) {
      setError("Payment amounts must be greater than 0");
      return;
    }

    startTransition(async () => {
      const res = await generateAndCollectBill({
        dispatchId: dispatch.id,
        customerId: dispatch.customerId,
        items,
        expenses,
        lateFee,
        payments,
        discountAmount,
        collectorId,
      });

      if (res.success) {
        router.push(`/admin/billing/print/${res.invoiceId}`);
      } else {
        setError(res.error || "Failed to generate bill.");
      }
    });
  };

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-32">
      
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Receipt className="w-6 h-6 text-emerald-500" />
            Generate Invoice
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Dispatch #{dispatch.dispatchNo || dispatch.id.slice(-6)} • {dispatch.customer?.name}
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-emerald-400">₹{totalAmount.toLocaleString('en-IN')}</div>
          <div className="text-xs text-zinc-500 font-medium">TOTAL BILL AMOUNT</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* LEFT COLUMN: Line Items & Expenses */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* LINE ITEMS */}
          <section className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h2 className="text-lg font-bold text-white">Billable Charges</h2>
                <p className="text-xs text-zinc-400">All machine base rates, tools used, and charges below are 100% editable. Modify descriptions, quantities, rates, or totals inline.</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button type="button" onClick={addTrollyBench} className="text-xs font-bold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-full transition-colors">
                  <Plus className="w-3 h-3" /> 1-Wheel Trolly & Bench (₹1,500)
                </button>
                <button type="button" onClick={addTrollyToolRent} className="text-xs font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 bg-cyan-500/10 border border-cyan-500/20 px-3 py-1.5 rounded-full transition-colors">
                  <Plus className="w-3 h-3" /> 1-Wheel Trolly & Bench - Tool Rent (₹1,000)
                </button>
                <button type="button" onClick={add2WheelTrolly} className="text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 bg-purple-500/10 border border-purple-500/20 px-3 py-1.5 rounded-full transition-colors">
                  <Plus className="w-3 h-3" /> 2-Wheel Trolly (₹200)
                </button>
                <button type="button" onClick={addDistanceSurcharge} className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-full transition-colors">
                  <Plus className="w-3 h-3" /> Distance Surcharge
                </button>
                <button type="button" onClick={addItem} className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-full transition-colors">
                  <Plus className="w-3 h-3" /> Add Item
                </button>
              </div>
            </div>
            
            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="flex items-start gap-3 p-3 bg-zinc-900 rounded-xl border border-zinc-800/50 group">
                  <div className="flex-1 space-y-2">
                    <input 
                      type="text" 
                      value={item.description} 
                      onChange={(e) => updateItem(idx, "description", e.target.value)}
                      placeholder="Description"
                      className="w-full bg-transparent text-sm text-white font-medium focus:outline-none border-b border-transparent focus:border-zinc-700 pb-1"
                    />
                    <div className="flex items-center gap-4 text-xs text-zinc-400">
                      <div className="flex items-center gap-2">
                        <span>Qty:</span>
                        <input type="number" value={item.quantity} onChange={(e) => updateItem(idx, "quantity", Number(e.target.value))} className="w-16 bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-white focus:outline-none focus:border-zinc-600" />
                      </div>
                      <div className="flex items-center gap-2">
                        <span>Rate: ₹</span>
                        <input type="number" value={item.rate} onChange={(e) => updateItem(idx, "rate", Number(e.target.value))} className="w-24 bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-white focus:outline-none focus:border-zinc-600" />
                      </div>
                      <div className="flex items-center gap-2 ml-auto">
                        <span className="font-bold text-white">Total: ₹</span>
                        <input type="number" value={item.total} onChange={(e) => updateItem(idx, "total", Number(e.target.value))} className="w-28 bg-zinc-950 border border-zinc-800 rounded px-2 py-1 text-emerald-400 font-bold focus:outline-none focus:border-emerald-500 text-right" />
                      </div>
                    </div>
                  </div>
                  <button onClick={() => removeItem(idx)} className="text-zinc-600 hover:text-rose-400 p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            
            {/* LATE FEE */}
            <div className="mt-6 pt-4 border-t border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-amber-400">Late Wrap-up Surcharge</h3>
                <p className="text-xs text-zinc-500">Fee collected from customer for late finish</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-zinc-400">₹</span>
                <input 
                  type="number" 
                  value={lateFee} 
                  onChange={(e) => setLateFee(Number(e.target.value))}
                  className="w-32 bg-zinc-900 border border-amber-500/30 rounded-xl px-3 py-2 text-amber-400 font-bold focus:outline-none focus:border-amber-500 text-right"
                />
              </div>
            </div>
          </section>

          {/* SITE EXPENSES (Internal) */}
          <section className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-white">Site Expenses Log</h2>
                <p className="text-xs text-zinc-500">Record any cash spent on site (does not affect bill total)</p>
              </div>
              <button onClick={addExpense} className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 bg-amber-500/10 px-3 py-1.5 rounded-full transition-colors">
                <Plus className="w-3 h-3" /> Add Expense
              </button>
            </div>

            {expenses.length === 0 ? (
              <div className="text-center p-6 border border-dashed border-zinc-800 rounded-xl text-zinc-600 text-sm">
                No site expenses recorded.
              </div>
            ) : (
              <div className="space-y-3 mt-4">
                {expenses.map((exp, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-3 bg-zinc-900 rounded-xl border border-zinc-800">
                    <select 
                      value={exp.category} 
                      onChange={(e) => updateExpense(idx, "category", e.target.value)}
                      className="bg-zinc-950 text-xs text-zinc-300 border border-zinc-800 rounded-lg px-2 py-2 outline-none w-32"
                    >
                      <option value="DIESEL">Diesel</option>
                      <option value="REPAIR">Repair</option>
                      <option value="TRAVEL">Travel</option>
                      <option value="OTHER">Other</option>
                    </select>
                    <input 
                      type="text" 
                      value={exp.description} 
                      onChange={(e) => updateExpense(idx, "description", e.target.value)}
                      placeholder="Details"
                      className="flex-1 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-white outline-none"
                    />
                    <input 
                      type="number" 
                      value={exp.amount} 
                      onChange={(e) => updateExpense(idx, "amount", Number(e.target.value))}
                      placeholder="₹ Amount"
                      className="w-24 bg-zinc-950 border border-zinc-800 rounded-lg px-3 py-2 text-xs text-amber-400 font-bold text-right outline-none"
                    />
                    <button onClick={() => removeExpense(idx)} className="text-zinc-600 hover:text-rose-400 p-2">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* RIGHT COLUMN: Payments & Submission */}
        <div className="space-y-6">
          <div className="bg-emerald-950/20 border border-emerald-500/20 rounded-2xl p-6 shadow-xl sticky top-6">
            <h2 className="text-lg font-bold text-white mb-4">Payment Collection</h2>
            
            <div className="space-y-3 mb-6">
              {payments.map((p, idx) => (
                <div key={idx} className="p-3 bg-zinc-900 rounded-xl border border-zinc-800 relative">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider">{p.method.replace("_", " ")}</span>
                    <button onClick={() => removePayment(idx)} className="text-zinc-500 hover:text-rose-400">
                      <XIcon className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-zinc-500 font-bold">₹</span>
                    <input 
                      type="number" 
                      value={p.amount} 
                      onChange={(e) => updatePayment(idx, "amount", Number(e.target.value))}
                      className="flex-1 bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-white font-bold outline-none focus:border-emerald-500 text-lg"
                    />
                  </div>
                  <input 
                    type="text" 
                    value={p.notes} 
                    onChange={(e) => updatePayment(idx, "notes", e.target.value)}
                    placeholder={p.method === 'UPI' ? "Transaction ID / Ref" : "Optional notes"}
                    className="w-full bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-xs text-zinc-300 outline-none focus:border-emerald-500"
                  />
                </div>
              ))}
            </div>

            {/* Payment Method Selectors */}
            <div className="grid grid-cols-2 gap-2 mb-6">
              <button onClick={() => addPayment("CASH")} className="py-2 bg-zinc-900 border border-zinc-800 hover:border-emerald-500/50 rounded-xl text-xs font-bold text-zinc-300 transition-colors">
                + CASH
              </button>
              <button onClick={() => addPayment("UPI")} className="py-2 bg-zinc-900 border border-zinc-800 hover:border-emerald-500/50 rounded-xl text-xs font-bold text-zinc-300 transition-colors">
                + UPI / GPAY
              </button>
              <button onClick={() => addPayment("BANK_TRANSFER")} className="py-2 bg-zinc-900 border border-zinc-800 hover:border-emerald-500/50 rounded-xl text-xs font-bold text-zinc-300 transition-colors">
                + BANK TX
              </button>
              <button onClick={() => addPayment("CHEQUE")} className="py-2 bg-zinc-900 border border-zinc-800 hover:border-emerald-500/50 rounded-xl text-xs font-bold text-zinc-300 transition-colors">
                + CHEQUE
              </button>
            </div>

            {/* Discount / Write-off Section */}
            <div className="mb-6 border border-zinc-800 rounded-xl p-3 bg-zinc-900">
              <div className="flex justify-between items-center mb-2">
                <span className="text-xs font-bold text-amber-500 uppercase tracking-wider">Discount / Write-off</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-zinc-500 font-bold">₹</span>
                <input 
                  type="number" 
                  value={discountAmount} 
                  onChange={(e) => setDiscountAmount(Number(e.target.value))}
                  className="flex-1 bg-zinc-950 border border-zinc-800 rounded px-2 py-1.5 text-white font-bold outline-none focus:border-amber-500 text-lg"
                />
              </div>
            </div>

            <div className="pt-4 border-t border-emerald-500/20 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Total Bill</span>
                <span className="text-white font-bold">₹{totalAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-zinc-400">Collected</span>
                <span className="text-emerald-400 font-bold">₹{totalPaid.toLocaleString('en-IN')}</span>
              </div>
              {discountAmount > 0 && (
                <div className="flex justify-between text-sm text-amber-500">
                  <span>Discount Applied</span>
                  <span className="font-bold">-₹{discountAmount.toLocaleString('en-IN')}</span>
                </div>
              )}
              <div className="flex justify-between text-sm pt-2 border-t border-emerald-500/10">
                <span className="text-zinc-400">Balance Due</span>
                <span className={`font-bold ${balanceDue > 0 ? 'text-amber-400' : balanceDue < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                  ₹{balanceDue.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <p className="text-xs text-rose-300 leading-relaxed">{error}</p>
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={isPending || totalAmount <= 0}
              className="w-full mt-6 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded-xl shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
              {isPending ? "Generating..." : (totalPaid + discountAmount) >= totalAmount ? "Generate & Mark Paid" : "Generate Invoice"}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}

function XIcon(props: any) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
  );
}
