"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createAdminExpense } from "@/actions/expenses";

type Props = {
  machines?: { id: string, machineId: string, type: string }[];
  vehicles?: { id: string, licensePlate: string, type: string }[];
  employees?: { id: string, name: string, role: string }[];
  contractors?: { id: string, name: string, companyName: string | null }[];
  tools?: { id: string, toolId: string, toolType: string | null }[];
};

export default function NewExpenseForm({ machines = [], vehicles = [], employees = [], contractors = [], tools = [] }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [category, setCategory] = useState("DIESEL");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [machineId, setMachineId] = useState("");
  const [vehicleId, setVehicleId] = useState("");
  const [employeeId, setEmployeeId] = useState("");
  const [contractorId, setContractorId] = useState("");
  const [toolId, setToolId] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append("category", category);
      formData.append("amount", amount);
      formData.append("description", description);
      formData.append("date", date);
      if (machineId) formData.append("machineId", machineId);
      if (vehicleId) formData.append("vehicleId", vehicleId);
      if (employeeId) formData.append("employeeId", employeeId);
      if (contractorId) formData.append("contractorId", contractorId);
      if (toolId) formData.append("toolId", toolId);

      const res = await createAdminExpense(formData);
      if (res?.error) {
        setError(res.error);
      } else {
        router.back();
      }
    } catch (err: any) {
      setError(err.message || "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow max-w-lg w-full p-6 mx-auto mt-8">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">Log New Expense</h2>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-md mb-6 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
          <select 
            required 
            value={category} 
            onChange={e => {
              setCategory(e.target.value);
              setMachineId("");
              setVehicleId("");
              setEmployeeId("");
              setContractorId("");
              setToolId("");
            }}
            className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          >
            <option value="DIESEL">Diesel (Fuel)</option>
            <option value="REPAIR">Repair (Machine/Vehicle)</option>
            <option value="TRAVEL">Travel / Logistics</option>
            <option value="STAFF_ADVANCE">Staff Salary Advance</option>
            <option value="CONTRACTOR_ADVANCE">Contractor Advance</option>
            <option value="OUTSIDE_HELPER_WAGE">Outside Helper Wage</option>
            <option value="TOOL_PARTS">Tool Parts & Maintenance</option>
            <option value="WORKSHOP">Workshop General</option>
            <option value="RENT">Rent</option>
            <option value="PETTY_CASH">Petty Cash Fee</option>
            <option value="OTHER">Other</option>
          </select>
        </div>

        {(category === "DIESEL" || category === "REPAIR") && (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Link to Machine</label>
              <select 
                value={machineId} 
                onChange={e => { setMachineId(e.target.value); setVehicleId(""); }}
                className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="">No Machine</option>
                {machines.map(m => (
                  <option key={m.id} value={m.id}>{m.machineId} ({m.type})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Link to Vehicle</label>
              <select 
                value={vehicleId} 
                onChange={e => { setVehicleId(e.target.value); setMachineId(""); }}
                className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="">No Vehicle</option>
                {vehicles.map(v => (
                  <option key={v.id} value={v.id}>{v.licensePlate} ({v.type})</option>
                ))}
              </select>
            </div>
          </div>
        )}

        {category === "STAFF_ADVANCE" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Employee (Required for Advance)</label>
            <select 
              required
              value={employeeId} 
              onChange={e => setEmployeeId(e.target.value)}
              className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="" disabled>Select Staff Member...</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.id}>{emp.name} ({emp.role})</option>
              ))}
            </select>
          </div>
        )}

        {category === "CONTRACTOR_ADVANCE" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Select Contractor (Required for Advance)</label>
            <select 
              required
              value={contractorId} 
              onChange={e => setContractorId(e.target.value)}
              className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="" disabled>Select Contractor...</option>
              {contractors.map(c => (
                <option key={c.id} value={c.id}>{c.name} {c.companyName ? `(${c.companyName})` : ''}</option>
              ))}
            </select>
          </div>
        )}

        {category === "TOOL_PARTS" && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Link to Tool</label>
            <select 
              value={toolId} 
              onChange={e => setToolId(e.target.value)}
              className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
            >
              <option value="">No Tool</option>
              {tools.map(t => (
                <option key={t.id} value={t.id}>{t.toolId} ({t.toolType})</option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Amount (₹)</label>
          <input 
            type="number" 
            required 
            min="0"
            step="0.01"
            value={amount} 
            onChange={e => setAmount(e.target.value)}
            placeholder="0.00"
            className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
          <input 
            type="text" 
            required 
            value={description} 
            onChange={e => setDescription(e.target.value)}
            placeholder="e.g. Printer ink, Diesel for JCB"
            className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Date</label>
          <input 
            type="date" 
            required 
            value={date} 
            onChange={e => setDate(e.target.value)}
            className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
          />
        </div>

        <div className="flex justify-end pt-4 border-t gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {loading ? "Saving..." : "Log Expense"}
          </button>
        </div>
      </form>
    </div>
  );
}
