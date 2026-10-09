"use client";

import { useState } from "react";
import { updateMachineStatus } from "@/actions/assets";
import { MachineStatus } from "@prisma/client";

export default function MachineStatusToggle({ machineId, initialStatus }: { machineId: string, initialStatus: MachineStatus }) {
  const [loading, setLoading] = useState(false);

  const handleStatusChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newStatus = e.target.value as MachineStatus;
    setLoading(true);
    try {
      await updateMachineStatus(machineId, newStatus);
    } catch (err) {
      console.error(err);
      alert("Failed to update status");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center gap-3">
      <span className="text-sm font-medium text-gray-700">Status Override:</span>
      <select
        value={initialStatus}
        onChange={handleStatusChange}
        disabled={loading}
        className={`border-gray-300 rounded-md shadow-sm text-sm focus:ring-indigo-500 focus:border-indigo-500 ${
          initialStatus === "AVAILABLE" ? "bg-green-50 text-green-700" :
          initialStatus === "RENTED" ? "bg-blue-50 text-blue-700" :
          initialStatus === "REPAIR" ? "bg-yellow-50 text-yellow-700" :
          "bg-red-50 text-red-700"
        }`}
      >
        <option value="AVAILABLE">Available</option>
        <option value="RENTED">Rented / In Use</option>
        <option value="REPAIR">In Repair</option>
        <option value="RETIRED">Retired</option>
      </select>
    </div>
  );
}
