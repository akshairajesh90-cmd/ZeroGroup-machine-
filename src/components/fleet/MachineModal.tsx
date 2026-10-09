"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createMachine, updateMachine } from "@/app/staff/fleet/actions";
import { toast } from "sonner";

interface MachineModalProps {
  isOpen: boolean;
  onClose: () => void;
  machine?: any; // If provided, edit mode
}

export default function MachineModal({ isOpen, onClose, machine }: MachineModalProps) {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    
    const payload = {
      machineId: formData.get("machineId") as string,
      type: formData.get("type") as any,
      status: formData.get("status") as any,
      operatorDailyPayout: Number(formData.get("operatorDailyPayout")),
      fuelConsumptionThreshold: Number(formData.get("fuelConsumptionThreshold")),
    };

    try {
      if (machine) {
        await updateMachine(machine.id, payload);
        toast.success("Machine updated successfully.");
      } else {
        await createMachine(payload);
        toast.success("Machine added successfully.");
      }
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to save machine");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 text-white border-slate-700">
        <DialogHeader>
          <DialogTitle>{machine ? "Edit Machine" : "Add Machine"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div className="space-y-2">
            <Label>Machine ID</Label>
            <Input name="machineId" required defaultValue={machine?.machineId} className="bg-slate-800 border-slate-700" placeholder="e.g. JCB-01" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Machine Type</Label>
              <Select name="type" defaultValue={machine?.type || "MIXER"}>
                <SelectTrigger className="bg-slate-800 border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="MIXER">Mixer</SelectItem>
                  <SelectItem value="LIFT_3_FLOOR">3-Floor Lift</SelectItem>
                  <SelectItem value="VIBRATOR">Vibrator</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select name="status" defaultValue={machine?.status || "AVAILABLE"}>
                <SelectTrigger className="bg-slate-800 border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AVAILABLE">Available</SelectItem>
                  <SelectItem value="RENTED">Rented</SelectItem>
                  <SelectItem value="REPAIR">Repair</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Operator Daily Payout (₹)</Label>
              <Input name="operatorDailyPayout" type="number" step="0.01" required defaultValue={machine?.operatorDailyPayout || 0} className="bg-slate-800 border-slate-700" />
            </div>
            <div className="space-y-2">
              <Label>Fuel Threshold (Liters)</Label>
              <Input name="fuelConsumptionThreshold" type="number" step="0.01" required defaultValue={machine?.fuelConsumptionThreshold || 0} className="bg-slate-800 border-slate-700" />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {loading ? "Saving..." : "Save Machine"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
