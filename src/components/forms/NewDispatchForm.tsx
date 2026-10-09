'use client';

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createDailyDispatch } from "@/actions/dispatch";
import { Tool } from "@prisma/client";

type Props = {
  customers: { id: string; name: string; phone: string }[];
  machines: { id: string; name: string; type: string }[];
  employees: { id: string; name: string; role: string }[];
  tools: Tool[];
};

type CrewAssignment = {
  employeeId: string;
  role: string;
};

export default function NewDispatchForm({ customers, machines, employees, tools }: Props) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State - Step 1: Jobsite
  const [customerId, setCustomerId] = useState("");
  const [location, setLocation] = useState("");
  const [dateOfService, setDateOfService] = useState("");
  const [workType, setWorkType] = useState("NORMAL");

  // Form State - Step 2: Assets & Tools
  const [primaryMachineId, setPrimaryMachineId] = useState("");
  const [secondaryMachineIds, setSecondaryMachineIds] = useState<string[]>([]);
  const [selectedTools, setSelectedTools] = useState<{toolId: string, quantity: number, variant?: string}[]>([]);

  // Form State - Step 3: Dynamic Crew
  const [driverId, setDriverId] = useState("");
  const [crewAssignments, setCrewAssignments] = useState<CrewAssignment[]>([]);
  const [externalSubLeaderName, setExternalSubLeaderName] = useState("");
  const [helperCount, setHelperCount] = useState(0);

  const drivers = employees.filter(e => e.role === "DRIVER");

  const toggleSecondaryMachine = (id: string) => {
    setSecondaryMachineIds(prev => 
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  };

  const addCrewMember = () => {
    setCrewAssignments([...crewAssignments, { employeeId: "", role: "MIXER_OPERATOR" }]);
  };

  const updateCrewMember = (index: number, field: "employeeId" | "role", value: string) => {
    const newArr = [...crewAssignments];
    newArr[index] = { ...newArr[index], [field]: value };
    setCrewAssignments(newArr);
  };

  const removeCrewMember = (index: number) => {
    setCrewAssignments(crewAssignments.filter((_, i) => i !== index));
  };

  const handleToolChange = (toolId: string, quantity: number, variant?: string) => {
    setSelectedTools(prev => {
      const existing = prev.find(t => t.toolId === toolId && t.variant === variant);
      if (quantity <= 0) {
        return prev.filter(t => !(t.toolId === toolId && t.variant === variant));
      }
      if (existing) {
        return prev.map(t => (t.toolId === toolId && t.variant === variant) ? { ...t, quantity } : t);
      }
      return [...prev, { toolId, quantity, variant }];
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (step < 3) {
      setStep(step + 1);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const payload = {
        customerId,
        location,
        dateOfService,
        workType,
        machineIds: [primaryMachineId, ...secondaryMachineIds].filter(Boolean),
        machineId: primaryMachineId || null,
        driverId: driverId || null,
        crewAssignments: crewAssignments.filter(c => c.employeeId),
        externalSubLeaderName: externalSubLeaderName || undefined,
        helperCount,
        toolItems: selectedTools,
      };

      const res = await createDailyDispatch(payload);
      if (res.error) {
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
    <div className="bg-white rounded-lg shadow max-w-4xl w-full p-6 mx-auto">
      <div className="mb-8 flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900">New Dispatch</h2>
        <span className="text-sm font-medium text-gray-500">Step {step} of 3</span>
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-md mb-6 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
            <h3 className="text-lg font-semibold border-b pb-2">Step 1: Jobsite & Dates</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Customer / Jobsite</label>
                <select 
                  required 
                  value={customerId} 
                  onChange={e => setCustomerId(e.target.value)}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="">Select Customer...</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                  ))}
                </select>
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Location Details</label>
                <input 
                  type="text" 
                  required 
                  value={location} 
                  onChange={e => setLocation(e.target.value)}
                  placeholder="e.g. 123 Main St, Site B"
                  className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Date of Service</label>
                <input 
                  type="date" 
                  required 
                  value={dateOfService} 
                  onChange={e => setDateOfService(e.target.value)}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Work Type</label>
                <select 
                  value={workType} 
                  onChange={e => setWorkType(e.target.value)}
                  className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                >
                  <option value="NORMAL">Normal</option>
                  <option value="TROLLY">Trolly</option>
                  <option value="LATE">Late / Extra</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <h3 className="text-lg font-semibold border-b pb-2">Step 2: Assign Assets & Tools</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Primary Machine</label>
              <select 
                value={primaryMachineId} 
                onChange={e => setPrimaryMachineId(e.target.value)}
                className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="">No Primary Machine (Labor Only)</option>
                {machines.map(m => (
                  <option key={m.id} value={m.id}>{m.name} - {m.type}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Secondary Machines (Optional)</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {machines.filter(m => m.id !== primaryMachineId).map(m => (
                  <label key={m.id} className="flex items-center space-x-2 bg-gray-50 p-2 rounded border cursor-pointer hover:bg-gray-100">
                    <input 
                      type="checkbox" 
                      checked={secondaryMachineIds.includes(m.id)}
                      onChange={() => toggleSecondaryMachine(m.id)}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="text-sm text-gray-900">{m.name} ({m.type})</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Tools Needed (Chatti, Kotta, Shawal, etc)</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {tools.map(tool => {
                  const selected = selectedTools.find(t => t.toolId === tool.id);
                  const qty = selected ? selected.quantity : 0;
                  return (
                    <div key={tool.id} className="flex items-center justify-between bg-gray-50 p-3 rounded border">
                      <div className="text-sm font-medium text-gray-900">{tool.name}</div>
                      <div className="flex items-center space-x-2">
                        <button type="button" onClick={() => handleToolChange(tool.id, Math.max(0, qty - 1))} className="px-2 py-1 bg-white border rounded shadow-sm text-gray-600 hover:bg-gray-50">-</button>
                        <span className="w-6 text-center text-sm">{qty}</span>
                        <button type="button" onClick={() => handleToolChange(tool.id, qty + 1)} className="px-2 py-1 bg-white border rounded shadow-sm text-gray-600 hover:bg-gray-50">+</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 animate-in fade-in slide-in-from-right-4">
            <h3 className="text-lg font-semibold border-b pb-2">Step 3: Crew Allocation</h3>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Driver</label>
              <select 
                value={driverId} 
                onChange={e => setDriverId(e.target.value)}
                className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              >
                <option value="">Unassigned</option>
                {drivers.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-sm font-medium text-gray-700">Dynamic Crew Assignments</label>
                <button type="button" onClick={addCrewMember} className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full font-bold">
                  + Add Crew
                </button>
              </div>
              
              <div className="space-y-3">
                {crewAssignments.length === 0 && <p className="text-sm text-gray-500 italic">No crew assigned yet. Click + Add Crew.</p>}
                {crewAssignments.map((crew, idx) => (
                  <div key={idx} className="flex items-center gap-3 bg-gray-50 p-3 rounded border">
                    <select 
                      className="flex-1 border-gray-300 rounded shadow-sm text-sm focus:border-indigo-500 focus:ring-indigo-500"
                      value={crew.employeeId}
                      onChange={e => updateCrewMember(idx, "employeeId", e.target.value)}
                    >
                      <option value="">Select Staff...</option>
                      {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                      ))}
                    </select>
                    <select 
                      className="flex-1 border-gray-300 rounded shadow-sm text-sm focus:border-indigo-500 focus:ring-indigo-500"
                      value={crew.role}
                      onChange={e => updateCrewMember(idx, "role", e.target.value)}
                    >
                      <option value="MIXER_OPERATOR">Mixer Operator</option>
                      <option value="HYDRAULIC_OPERATOR">Hydraulic Operator</option>
                      <option value="VIBRATOR_OPERATOR">Vibrator Operator</option>
                      <option value="LIFT_OPERATOR">Lift Operator</option>
                      <option value="WORKER_LEADER">Worker Leader</option>
                      <option value="SUB_LEADER">Sub Leader</option>
                      <option value="PANI_HELPER">Helper</option>
                      <option value="TROLLY_1_WHEEL">Trolly 1-Wheel</option>
                      <option value="TROLLY_2_WHEEL">Trolly 2-Wheel</option>
                    </select>
                    <button type="button" onClick={() => removeCrewMember(idx)} className="text-red-500 hover:text-red-700 font-bold px-2">X</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t">
              <label className="block text-sm font-medium text-gray-700 mb-1">External Labor Group (Optional)</label>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <input 
                    type="text" 
                    placeholder="External Sub-Leader Name"
                    value={externalSubLeaderName} 
                    onChange={e => setExternalSubLeaderName(e.target.value)}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">?? Will flag this dispatch for External Payment</p>
                </div>
                <div>
                  <input 
                    type="number" 
                    min="0"
                    placeholder="Worker Count"
                    value={helperCount} 
                    onChange={e => setHelperCount(parseInt(e.target.value) || 0)}
                    className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-between pt-6 border-t">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Back
            </button>
          ) : (
            <button
              type="button"
              onClick={() => router.back()}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Cancel
            </button>
          )}

          <button
            type="submit"
            disabled={loading}
            className="ml-3 inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
          >
            {step < 3 ? "Next Step" : (loading ? "Saving..." : "Create Dispatch")}
          </button>
        </div>
      </form>
    </div>
  );
}
