"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createVehicle, updateVehicle } from "@/app/staff/fleet/actions";
import { toast } from "sonner";

interface VehicleModalProps {
  isOpen: boolean;
  onClose: () => void;
  vehicle?: any; // If provided, edit mode
}

export default function VehicleModal({ isOpen, onClose, vehicle }: VehicleModalProps) {
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    
    const payload = {
      licensePlate: formData.get("licensePlate") as string,
      type: formData.get("type") as string,
      status: formData.get("status") as any,
    };

    try {
      if (vehicle) {
        await updateVehicle(vehicle.id, payload);
        toast.success("Vehicle updated successfully.");
      } else {
        await createVehicle(payload);
        toast.success("Vehicle added successfully.");
      }
      onClose();
    } catch (err: any) {
      toast.error(err.message || "Failed to save vehicle");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-slate-900 text-white border-slate-700">
        <DialogHeader>
          <DialogTitle>{vehicle ? "Edit Vehicle" : "Add Vehicle"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div className="space-y-2">
            <Label>License Plate</Label>
            <Input name="licensePlate" required defaultValue={vehicle?.licensePlate} className="bg-slate-800 border-slate-700" placeholder="e.g. KL-01-AB-1234" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Vehicle Type</Label>
              <Input name="type" required defaultValue={vehicle?.type || "APE"} className="bg-slate-800 border-slate-700" placeholder="e.g. APE, DOST, BOLERO" />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select name="status" defaultValue={vehicle?.status || "ACTIVE"}>
                <SelectTrigger className="bg-slate-800 border-slate-700">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="REPAIR">Repair</SelectItem>
                  <SelectItem value="SOLD">Sold</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-800">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              {loading ? "Saving..." : "Save Vehicle"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
