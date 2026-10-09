"use client";

import { useState, useEffect } from "react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter } from "@/components/ui/dialog";
import { calculateDispatchPricing, PricingInput, DEFAULT_PRICING } from "@/lib/pricingEngine";

const STANDARD_CATEGORIES = [
  { id: 'LIFT', label: 'Lift (ലിഫ്റ്റ്)' },
  { id: 'MACHINE', label: 'Machine (മിഷ്യൻ)' },
  { id: 'VIBRATOR', label: 'Vibrator (വൈബ്രേറ്റർ)' },
  { id: 'THUMBA', label: 'Thumba (തൂമ്പ)' },
  { id: 'CHAR_SHEET', label: 'Char Sheet (ചാർ ഷീറ്റ്)' },
  { id: '8X4_SHEET', label: '8x4 Sheet (8X4 ഷീറ്റ്)' },
  { id: 'LABOR', label: 'Labor (പണിക്കൂലി)' },
  { id: 'TRANSPORT', label: 'Transport (വണ്ടിക്കൂലി)' },
  { id: 'KOTTA', label: 'Kotta (കൊട്ട)' },
  { id: 'CHATTI', label: 'Chatti (ചട്ടി)' },
  { id: 'SHOVEL', label: 'Shovel (ഷവൽ)' },
  { id: 'KAIKOTTU', label: 'Kaikottu (കൈക്കോട്ട്)' },
  { id: 'CHERIYA_CHATTI', label: 'Cheriya Chatti (ചെറിയ ചട്ടി)' },
  { id: 'VISHA', label: 'Visha (വീഷ)' },
  { id: 'TROLLY', label: 'Trolly (ട്രോളി)' },
  { id: 'PADUTHA', label: 'Padutha (പടുത)' },
];

export default function DispatchBillingModal({ 
  isOpen, 
  onClose, 
  dispatch,
  onSuccess
}: { 
  isOpen: boolean, 
  onClose: () => void, 
  dispatch: any,
  onSuccess: () => void
}) {
  const [prices, setPrices] = useState<Record<string, string>>({});
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [customExpenses, setCustomExpenses] = useState<{ id: string, name: string, amount: string }[]>([]);
  const [payments, setPayments] = useState<{method: string, amount: string}[]>([]);
  const [dueDate, setDueDate] = useState<string>("");
  const [notes, setNotes] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Explicit lift floors override state
  const [liftFloors, setLiftFloors] = useState<number>(1);

  useEffect(() => {
    if (isOpen && dispatch) {
      const initQtys: Record<string, number> = {};
      const initialPrices: Record<string, string> = {};

      // Helper to safely add quantities
      const addQty = (key: string, qty: number) => {
        initQtys[key] = (initQtys[key] || 0) + qty;
      };
      
      // Extract lift floors from dispatch if it's a lift
      const floors = Math.max(0, dispatch.liftFloors || 0);
      setLiftFloors(floors);

      // 1 & 2. Map Machine & Lift Strictly
      const machineType = dispatch.machine?.type || dispatch.dispatchMachines?.[0]?.machine?.type;
      
      if (machineType === 'MIXER' || machineType === 'CONCRETE_MIXER' || dispatch.mixerCategory === 'HYDRAULIC') {
        addQty('MACHINE', 1);
        initialPrices['MACHINE'] = DEFAULT_PRICING.MIXER.toString();
      } else if (machineType === 'LIFT') {
        addQty('LIFT', 1);
        initialPrices['LIFT'] = (DEFAULT_PRICING.LIFT_BASE + (floors * DEFAULT_PRICING.LIFT_PER_FLOOR)).toString();
      }

      // 3. Map Vibrator
      if (dispatch.vibratorType || machineType === 'VIBRATOR') {
        addQty('VIBRATOR', 1);
        initialPrices['VIBRATOR'] = DEFAULT_PRICING.PETROL_VIBRATOR_CUSTOMER_CHARGE.toString();
      }

      // 4. Map Tools
      if (dispatch.dispatchTools && Array.isArray(dispatch.dispatchTools)) {
        dispatch.dispatchTools.forEach((dt: any) => {
          const name = (dt.tool?.name || "").toLowerCase();
          const type = (dt.tool?.toolType || "").toLowerCase();
          const q = Number(dt.quantity) || 1;
          
          if (name.includes('trolly') || type.includes('trolly')) {
            addQty('TROLLY', q);
            if (name.includes('1 wheel') || type.includes('1_wheel')) {
              initialPrices['TROLLY'] = ((Number(initialPrices['TROLLY']) || 0) + (DEFAULT_PRICING.TROLLY_1_WHEEL * q)).toString();
            } else if (name.includes('2 wheel') || type.includes('2_wheel')) {
              initialPrices['TROLLY'] = ((Number(initialPrices['TROLLY']) || 0) + (DEFAULT_PRICING.TROLLY_2_WHEEL * q)).toString();
            } else {
              initialPrices['TROLLY'] = ((Number(initialPrices['TROLLY']) || 0) + (DEFAULT_PRICING.TROLLY_1_WHEEL * q)).toString();
            }
          }
          else if (name.includes('spade') || name.includes('thumba') || type.includes('spade')) {
            addQty('THUMBA', q);
            // Default rate for Thumba/Spade if you have one, else leave 0 for manual
          }
          else if (name.includes('vibrator') || type.includes('vibrator')) {
            addQty('VIBRATOR', q);
          }
          else if (name.includes('kotta')) addQty('KOTTA', q);
          else if (name.includes('cheriya chatti') || name.includes('cheriyachatti') || type.includes('cheriya')) addQty('CHERIYA_CHATTI', q);
          else if (name.includes('chatti') || type.includes('pan')) addQty('CHATTI', q);
          else if (name.includes('shovel')) addQty('SHOVEL', q);
          else if (name.includes('kaikottu')) addQty('KAIKOTTU', q);
          else if (name.includes('visha')) addQty('VISHA', q);
          else if (name.includes('padutha')) addQty('PADUTHA', q);
          else if (name.includes('char sheet')) addQty('CHAR_SHEET', q);
          else if (name.includes('8x4 sheet')) addQty('8X4_SHEET', q);
        });
      }

      // 5. Map Labor
      // Calculate actual number of workers assigned
      const laborCount = [dispatch.operatorId, dispatch.driverId, dispatch.workerId, dispatch.mainHelperId].filter(Boolean).length;
      if (laborCount > 0) {
        addQty('LABOR', laborCount);
        const isInternal = dispatch.operator?.operatorType === 'INTERNAL' || true;
        const dailyWage = isInternal ? DEFAULT_PRICING.INTERNAL_WORKER_WAGE : DEFAULT_PRICING.EXTERNAL_WORKER_WAGE;
        initialPrices['LABOR'] = (dailyWage * laborCount).toString();
      }

      setQuantities(initQtys);
      setPrices(initialPrices);
      setCustomExpenses([]);
      setPayments([]);
      setDueDate("");
      setNotes("");
    }
  }, [isOpen, dispatch]);

  const checklistTotal = Object.values(prices).reduce((sum, val) => sum + (Number(val) || 0), 0);
  const customTotal = customExpenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0);
  const totalAmount = checklistTotal + customTotal;
  const totalPaid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const remainingBalance = totalAmount - totalPaid;

  const handlePriceChange = (id: string, value: string) => {
    setPrices(prev => ({ ...prev, [id]: value }));
  };
  
  // Recalculate Lift Price when floors change
  useEffect(() => {
    if (quantities['LIFT'] > 0) {
      setPrices(prev => ({ 
        ...prev, 
        ['LIFT']: (DEFAULT_PRICING.LIFT_BASE + (liftFloors * DEFAULT_PRICING.LIFT_PER_FLOOR)).toString() 
      }));
    }
  }, [liftFloors, quantities]);

  const handleAddPayment = () => {
    setPayments([...payments, { method: "CASH", amount: remainingBalance > 0 ? remainingBalance.toString() : "" }]);
  };

  const handlePaymentChange = (index: number, field: 'method' | 'amount', value: string) => {
    const newPayments = [...payments];
    newPayments[index][field] = value;
    setPayments(newPayments);
  };

  const handleRemovePayment = (index: number) => {
    setPayments(payments.filter((_, i) => i !== index));
  };

  const handleAddCustomExpense = () => {
    setCustomExpenses([...customExpenses, { id: `exp-${Date.now()}`, name: "", amount: "" }]);
  };

  const handleCustomExpenseChange = (id: string, field: 'name' | 'amount', value: string) => {
    setCustomExpenses(customExpenses.map(exp => exp.id === id ? { ...exp, [field]: value } : exp));
  };

  const handleRemoveCustomExpense = (id: string) => {
    setCustomExpenses(customExpenses.filter(exp => exp.id !== id));
  };

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      
      const billableItems = [
        ...STANDARD_CATEGORIES.map(cat => ({
          itemKey: cat.id,
          description: cat.label,
          quantity: 1,
          rate: Number(prices[cat.id] || 0),
          total: Number(prices[cat.id] || 0)
        })),
        ...customExpenses.map(exp => ({
          itemKey: 'CUSTOM',
          description: exp.name || 'Custom Expense',
          quantity: 1,
          rate: Number(exp.amount || 0),
          total: Number(exp.amount || 0)
        }))
      ].filter(i => i.total > 0);

      const payload = {
        dispatchId: dispatch.id,
        customerId: dispatch.customerId,
        totalAmount,
        notes,
        dueDate: remainingBalance > 0 && dueDate ? new Date(dueDate).toISOString() : null,
        items: billableItems,
        payments: payments.map(p => ({
          method: p.method,
          amount: Number(p.amount)
        })).filter(p => p.amount > 0)
      };

      const res = await fetch('/api/admin/invoices', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) throw new Error("Failed to generate bill");
      onSuccess();
    } catch (error) {
      console.error(error);
      alert("Error generating bill");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!dispatch) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[95vh] overflow-y-auto bg-slate-900 border-slate-700 text-slate-100 p-0 overflow-hidden">
        
        {/* Receipt Header Style */}
        <div className="bg-slate-800 p-6 border-b border-slate-700 space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs text-slate-400 font-bold tracking-wider uppercase mb-1">No.</p>
              <p className="text-xl font-black text-rose-500">AUTO-GEN</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-slate-400 font-bold tracking-wider uppercase mb-1">Date</p>
              <p className="font-bold text-slate-200">
                {format(dispatch.dateOfService ? new Date(dispatch.dateOfService as string) : new Date(), 'dd/MM/yyyy')}
              </p>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div>
              <p className="text-xs text-slate-400 font-bold tracking-wider uppercase mb-1">Name</p>
              <p className="font-bold text-slate-200">{dispatch.customer?.name || "Unknown"}</p>
            </div>
            <div>
              <p className="text-xs text-slate-400 font-bold tracking-wider uppercase mb-1">Site</p>
              <p className="font-bold text-slate-200">{dispatch.location || dispatch.jobSite || "Unknown"}</p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-slate-400 font-bold tracking-wider uppercase mb-1">Operator</p>
              <p className="font-bold text-slate-200">{dispatch.operator?.name || "None"}</p>
            </div>
          </div>
        </div>

        <div className="px-6 py-2 space-y-6">
          {/* Two-Column Pre-Printed Checklist */}
          <div className="border border-slate-700 rounded-lg overflow-hidden bg-slate-800">
            <div className="grid grid-cols-2 gap-3 p-3">
              {STANDARD_CATEGORIES.map((cat) => (
                <div key={cat.id} className="flex items-center justify-between bg-slate-900/50 border border-slate-800 p-2.5 rounded-lg hover:border-emerald-500/50 transition-colors group">
                  <div className="flex items-center">
                    <span className="text-sm font-semibold text-slate-300 group-hover:text-white transition-colors">{cat.label}</span>
                    {quantities[cat.id] > 0 && (
                      <span className="ml-3 bg-emerald-500 text-slate-950 text-[10px] font-black px-2 py-0.5 rounded-full shadow-sm animate-pulse whitespace-nowrap">
                        QTY: {quantities[cat.id]} {cat.id === 'LIFT' ? ` | ${liftFloors} FL` : ''}
                      </span>
                    )}
                  </div>
                  
                  <div className="flex flex-col gap-1 items-end">
                    {cat.id === 'LIFT' && quantities['LIFT'] > 0 && (
                      <div className="flex items-center gap-1">
                        <span className="text-[10px] text-slate-500 font-bold uppercase">Floors:</span>
                        <input 
                          type="number" 
                          value={liftFloors}
                          onChange={(e) => setLiftFloors(Math.max(0, parseInt(e.target.value) || 0))}
                          className="w-12 h-5 bg-slate-800 text-white text-xs text-center rounded border border-slate-700"
                        />
                      </div>
                    )}
                    <div className="flex items-center bg-slate-950 rounded border border-slate-800 w-24 overflow-hidden focus-within:border-emerald-500 focus-within:ring-1 focus-within:ring-emerald-500 transition-all">
                      <span className="pl-2 text-slate-500 text-xs font-bold">₹</span>
                      <Input 
                        type="number"
                        value={prices[cat.id] || ""}
                        onChange={(e) => handlePriceChange(cat.id, e.target.value)}
                        placeholder="0.00"
                        className="w-full h-8 border-0 bg-transparent rounded-none text-emerald-400 font-bold focus-visible:ring-0 focus-visible:ring-offset-0 px-1 text-right placeholder:text-slate-700"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Custom Expenses */}
              {customExpenses.map((exp) => (
                <div key={exp.id} className="grid grid-cols-12 hover:bg-slate-700/30 transition-colors group border-t border-slate-700 bg-slate-800">
                  <div className="col-span-8 p-3 flex items-center border-r border-slate-700">
                    <Input 
                      value={exp.name} 
                      onChange={(e) => handleCustomExpenseChange(exp.id, 'name', e.target.value)} 
                      className="w-full h-8 border-0 bg-transparent rounded-none text-slate-100 focus-visible:ring-0 focus-visible:ring-offset-0 px-1"
                      placeholder="e.g., Food, Travel, Extra Material..."
                    />
                  </div>
                  <div className="col-span-4 flex items-center pr-2">
                    <Input 
                      type="number" 
                      value={exp.amount} 
                      onChange={(e) => handleCustomExpenseChange(exp.id, 'amount', e.target.value)} 
                      className="flex-1 h-8 border-0 bg-transparent rounded-none text-right font-bold text-emerald-400 focus-visible:ring-0 focus-visible:ring-offset-0 px-2"
                      placeholder="0"
                    />
                    <button onClick={() => handleRemoveCustomExpense(exp.id)} className="text-rose-500 hover:text-rose-400 ml-1 font-bold px-1 py-1">×</button>
                  </div>
                </div>
              ))}
            
            <div className="p-3 bg-slate-800/80 flex justify-center border-t border-slate-700">
              <Button variant="ghost" size="sm" onClick={handleAddCustomExpense} className="text-slate-400 hover:text-white hover:bg-slate-700 text-xs">
                + Add Custom Expense
              </Button>
            </div>

            <div className="grid grid-cols-12 bg-slate-900 font-bold border-t border-slate-700">
              <div className="col-span-8 p-4 text-right border-r border-slate-700 text-slate-400 uppercase tracking-wider text-sm">
                Total Cash
              </div>
              <div className="col-span-4 p-4 text-right text-emerald-400 text-lg">
                ₹{totalAmount.toFixed(2)}
              </div>
            </div>
          </div>

          {/* Payments Section */}
          <div className="space-y-3 pt-2">
            <h3 className="font-bold text-sm text-emerald-400 uppercase tracking-wider">Payment Collection</h3>
            
            <div className="space-y-2">
              {payments.map((p, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <Select value={p.method} onValueChange={(val) => handlePaymentChange(index, 'method', val || '')}>
                    <SelectTrigger className="w-32 bg-slate-800 border-slate-700 text-slate-100"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CASH">CASH</SelectItem>
                      <SelectItem value="UPI">UPI/GPAY</SelectItem>
                      <SelectItem value="BANK_TRANSFER">BANK TRANSFER</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input 
                    type="number" 
                    placeholder="Amount" 
                    value={p.amount} 
                    onChange={(e) => handlePaymentChange(index, 'amount', e.target.value)} 
                    className="flex-1 bg-slate-800 border-slate-700 text-slate-100 placeholder:text-slate-500 font-bold"
                  />
                  <button onClick={() => handleRemovePayment(index)} className="text-rose-500 hover:text-rose-400 ml-2 font-bold px-2">×</button>
                </div>
              ))}
              
              <Button variant="secondary" size="sm" onClick={handleAddPayment} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 border-dashed">
                + Add Payment Entry
              </Button>
            </div>
            
            <div className="flex justify-between items-center bg-slate-800 border border-slate-700 p-4 rounded-lg font-bold text-sm mt-4">
              <span className="text-slate-400">Total Paid: <span className="text-emerald-400 ml-2 text-base">₹{totalPaid.toFixed(2)}</span></span>
              <span className="text-slate-400 text-base">Balance: <span className={remainingBalance > 0 ? "text-rose-400 ml-2 text-lg" : "text-emerald-400 ml-2 text-lg"}>₹{Math.max(0, remainingBalance).toFixed(2)}</span></span>
            </div>
          </div>

          {/* Delayed Money / Due Date */}
          {remainingBalance > 0 && (
            <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-lg space-y-3">
              <h4 className="font-bold text-rose-400 text-sm">Outstanding Balance Detected (₹{remainingBalance.toFixed(2)})</h4>
              <div>
                <p className="text-xs text-rose-300/70 mb-2 font-medium">When did the customer promise to pay the remainder?</p>
                <Input 
                  type="date" 
                  value={dueDate} 
                  onChange={(e) => setDueDate(e.target.value)} 
                  className="w-full bg-slate-900 border-rose-500/30 text-rose-100"
                />
              </div>
            </div>
          )}

        </div>

        <DialogFooter className="p-6 bg-slate-800 border-t border-slate-700">
          <Button variant="outline" onClick={onClose} disabled={isSubmitting} className="border-slate-600 text-slate-300 hover:bg-slate-700 hover:text-white">Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold">
            {isSubmitting ? "Saving..." : "Save & Settle Bill"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
