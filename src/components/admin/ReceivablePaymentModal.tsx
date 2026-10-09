"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";

export default function ReceivablePaymentModal({ 
  invoice,
  isOpen, 
  onClose,
}: { 
  invoice: any | null,
  isOpen: boolean, 
  onClose: () => void, 
}) {
  const [amount, setAmount] = useState<string>("");
  const [method, setMethod] = useState<string>("CASH");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!invoice) return null;

  const remainingBalance = Number(invoice.totalAmount) - (Number(invoice.paidCash) + Number(invoice.paidUpi) + Number(invoice.paidBank));

  const handleSubmit = async () => {
    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      alert("Please enter a valid amount.");
      return;
    }
    if (numAmount > remainingBalance) {
      alert(`Amount cannot exceed the remaining balance of ₹${remainingBalance.toFixed(2)}`);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch(`/api/admin/invoices/${invoice.id}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: numAmount, method })
      });
      
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      
      alert("Payment logged successfully!");
      window.location.reload();
    } catch (e: any) {
      alert("Failed to log payment: " + e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Log Payment</DialogTitle>
          <DialogDescription>
            Record a new payment for Invoice <span className="font-bold text-slate-900">{invoice.invoiceNumber}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-slate-100 p-3 rounded flex justify-between items-center text-sm">
            <span className="font-bold text-slate-600">Remaining Balance:</span>
            <span className="font-bold text-rose-600 text-lg">₹{remainingBalance.toFixed(2)}</span>
          </div>

          <div className="space-y-3 pt-2">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Payment Method</label>
              <Select value={method} onValueChange={(val) => setMethod(val || 'CASH')}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="CASH">CASH</SelectItem>
                  <SelectItem value="UPI">UPI/GPAY</SelectItem>
                  <SelectItem value="BANK_TRANSFER">BANK TRANSFER</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-1 block">Amount Received (₹)</label>
              <Input 
                type="number" 
                placeholder="e.g. 1500" 
                value={amount} 
                onChange={(e) => setAmount(e.target.value)} 
                className="text-lg font-bold"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>Cancel</Button>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
            {isSubmitting ? "Saving..." : "Log Payment"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
