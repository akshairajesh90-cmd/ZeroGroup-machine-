import React from "react";
import { Truck, PlusCircle, CheckCircle2, Clock, UserCheck, MapPin, Calendar, Wrench, ShieldAlert, Loader2, X, Users, FileText, Table, LayoutGrid, Phone, Navigation, DollarSign, UserPlus, AlertCircle, Layers, HardHat, Trash2, ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";

interface CreateDispatchModalProps {
  onClose: () => void;
  formData: any;
  setFormData: any;
  handleSubmit: (e: React.FormEvent) => void;
  isPending: boolean;
  customers: any[];
  machines: any[];
  employees: any[];
  tools: any[];
  dispatchError: string;
}

export function CreateDispatchModal({
  onClose,
  formData,
  setFormData,
  handleSubmit,
  isPending,
  customers,
  machines,
  employees,
  tools,
  dispatchError
}: CreateDispatchModalProps) {
  const [showNewCustomerModal, setShowNewCustomerModal] = React.useState(false);
  const [newCustName, setNewCustName] = React.useState("");
  const [newCustPhone, setNewCustPhone] = React.useState("");
  const [newCustAddress, setNewCustAddress] = React.useState("");
  
  const handleQuickCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setShowNewCustomerModal(false);
  };


  const { customerId, location, dateOfService, liftFloors, mixerCategory, vibratorType, hasTrollyBench, publicTransportUsed, driverId, mapLink, siteBundleId, machineId, operatorId, mainHelperId, mainHelperName, helperCount, status, selectedTools, crewAssignments } = formData;
  const setCustomerId = (v: any) => setFormData({ ...formData, customerId: v });
  const setLocation = (v: any) => setFormData({ ...formData, location: v });
  const setDateOfService = (v: any) => setFormData({ ...formData, dateOfService: v });
  const setLiftFloors = (v: any) => setFormData({ ...formData, liftFloors: v });
  const setMixerCategory = (v: any) => setFormData({ ...formData, mixerCategory: v });
  const setVibratorType = (v: any) => setFormData({ ...formData, vibratorType: v });
  const setHasTrollyBench = (v: any) => setFormData({ ...formData, hasTrollyBench: v });
  const setPublicTransportUsed = (v: any) => setFormData({ ...formData, publicTransportUsed: v });
  const setDriverId = (v: any) => setFormData({ ...formData, driverId: v });
  const setMapLink = (v: any) => setFormData({ ...formData, mapLink: v });
  const setMachineId = (v: any) => setFormData({ ...formData, machineId: v });
  const setOperatorId = (v: any) => setFormData({ ...formData, operatorId: v });
  const setMainHelperId = (v: any) => setFormData({ ...formData, mainHelperId: v });
  const setMainHelperName = (v: any) => setFormData({ ...formData, mainHelperName: v });
  const setHelperCount = (v: any) => setFormData({ ...formData, helperCount: v });
  const setSiteBundleId = (v: any) => setFormData({ ...formData, siteBundleId: v });
  const setStatus = (v: any) => setFormData({ ...formData, status: v });
  const setSelectedTools = (v: any) => setFormData({ ...formData, selectedTools: v });
  const setMultiOperators = (v: any) => setFormData({ ...formData, crewAssignments: v });
  const setMultiWorkers = (v: any) => setFormData({ ...formData, crewAssignments: v });

  const [operatorCountNeeded, setOperatorCountNeeded] = React.useState<number>(0);
  const [operatorSlots, setOperatorSlots] = React.useState<string[]>(["slot1", "slot2"]);
  const [customOperators, setCustomOperators] = React.useState<{ [slotIdx: number]: { name: string; phone?: string; wage?: string | number } }>({});
  const [customDriverDetails, setCustomDriverDetails] = React.useState<{ name: string; phone: string; vehicleNo: string }>({ name: "", phone: "", vehicleNo: "" });
  const [customMachines, setCustomMachines] = React.useState<{ id: string; name: string; qty: number; rate?: string | number }[]>([]);
  const [customToolsList, setCustomToolsList] = React.useState<{ id: string; name: string; malayalamName?: string; qty: number }[]>([]);
  const [leaderAllocations, setLeaderAllocations] = React.useState<{ id: string; leaderId: string; leaderName: string; helperCount: number; skillCategory?: string; dailyWage?: string | number }[]>([]);
  const [multiOperatorIds, setMultiOperatorIds] = React.useState<string[]>([]);
  const [multiWorkerIds, setMultiWorkerIds] = React.useState<string[]>([]);
  const [selectedMachineIds, setSelectedMachineIds] = React.useState<string[]>([]);
  const [toolQuantities, setToolQuantities] = React.useState<Record<string, number>>({});
  const [twoWheelTrollyQty, setTwoWheelTrollyQty] = React.useState<number>(0);
  const [notes, setNotes] = React.useState("");
  const [workCategory, setWorkCategory] = React.useState<"MACHINE" | "INDEPENDENT">("MACHINE");
  const [activeModes, setActiveModes] = React.useState<string[]>(["LIFT"]);
  const [showSetupTools, setShowSetupTools] = React.useState<boolean>(false);
  const toggleMode = (mode: string) => {
    let newModes = [];
    if (activeModes.includes(mode)) {
      newModes = activeModes.filter(m => m !== mode);
    } else {
      newModes = [...activeModes, mode];
    }
    setActiveModes(newModes);
  };


  const handleToolQuantityChange = (tId: string, qty: number) => {
    if (qty <= 0) {
      const next = { ...toolQuantities };
      delete next[tId];
      setToolQuantities(next);
    } else {
      setToolQuantities({ ...toolQuantities, [tId]: qty });
    }
  };

  const handleToolQtyChange = (tId: string, delta: number) => {
    const current = toolQuantities[tId] || 0;
    handleToolQuantityChange(tId, current + delta);
  };

  const handleAddLeaderRow = () => {
    setLeaderAllocations([...leaderAllocations, { id: Date.now().toString(), leaderId: "", leaderName: "", helperCount: 0, skillCategory: "General Pani Crew", dailyWage: "" }]);
  };

  const handleRemoveLeaderRow = (index: number) => {
    setLeaderAllocations(leaderAllocations.filter((_, i) => i !== index));
  };

  const handleLeaderRowChange = (index: number, field: string, value: any) => {
    const next = [...leaderAllocations];
    next[index] = { ...next[index], [field]: value };
    if (field === "leaderId" && value) next[index].leaderName = "";
    setLeaderAllocations(next);
  };

  const handleAddCustomMachine = () => {
    setCustomMachines([...customMachines, { id: "custom_m_" + Date.now(), name: "", qty: 1, rate: "" }]);
  };

  const handleRemoveCustomMachine = (id: string) => {
    setCustomMachines(customMachines.filter(m => m.id !== id));
  };

  const handleCustomMachineChange = (id: string, field: string, value: any) => {
    setCustomMachines(customMachines.map(m => m.id === id ? { ...m, [field]: value } : m));
  };

  const handleAddCustomTool = () => {
    setCustomToolsList([...customToolsList, { id: "custom_t_" + Date.now(), name: "", malayalamName: "", qty: 1 }]);
  };

  const handleRemoveCustomTool = (id: string) => {
    setCustomToolsList(customToolsList.filter(t => t.id !== id));
  };

  const handleCustomToolChange = (id: string, field: string, value: any) => {
    setCustomToolsList(customToolsList.map(t => t.id === id ? { ...t, [field]: value } : t));
  };

  const handleCustomToolQtyDelta = (id: string, delta: number) => {
    setCustomToolsList(customToolsList.map(t => {
      if (t.id === id) return { ...t, qty: Math.max(0, t.qty + delta) };
      return t;
    }));
  };

  const handleToggleMachine = (id: string) => {
    if (selectedMachineIds.includes(id)) {
      setSelectedMachineIds(selectedMachineIds.filter(x => x !== id));
    } else {
      setSelectedMachineIds([...selectedMachineIds, id]);
    }
  };

  const handleToggleMultiOperator = (id: string) => {
    if (multiOperatorIds.includes(id)) {
      setMultiOperatorIds(multiOperatorIds.filter(x => x !== id));
    } else {
      setMultiOperatorIds([...multiOperatorIds, id]);
    }
  };

  const handleToggleMultiWorker = (id: string) => {
    if (multiWorkerIds.includes(id)) {
      setMultiWorkerIds(multiWorkerIds.filter(x => x !== id));
    } else {
      setMultiWorkerIds([...multiWorkerIds, id]);
    }
  };




  return (
    <>\n      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 md:p-6 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-6xl w-full p-6 md:p-8 shadow-2xl max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                  <Truck className="w-6 h-6 text-amber-400" />
                  {formData.id ? "Edit Dispatch Booking Order" : "Create New Site Booking Order"}
                </h3>
                <p className="text-sm text-slate-400 mt-0.5">
                  Log customer, equipment selection, leader allocations, and initial setup items. Exact field tags and setup confirmation are completed via Operator and Driver field apps.
                </p>
              </div>
              <button
                onClick={() => onClose()}
                className="text-slate-400 hover:text-white p-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="mt-6 space-y-8">
              {/* Section 1: Customer & Site Details */}
              <div className="bg-slate-950/70 p-6 rounded-2xl border border-slate-800/80">
                <h4 className="text-base font-bold text-white mb-4 flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  Customer & Site Details
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-sm font-semibold text-slate-300">Customer / Contractor *</label>
                      <button
                        type="button"
                        onClick={() => setShowNewCustomerModal(true)}
                        className="text-xs font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1 transition-colors"
                      >
                        <UserPlus className="w-3.5 h-3.5" /> + Add New
                      </button>
                    </div>
                    <select
                      value={customerId}
                      onChange={(e) => setCustomerId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl py-2.5 px-3.5 text-sm text-white font-medium focus:border-amber-500 outline-none transition-colors"
                      required
                    >
                      <option value="" disabled>Select customer from ledger...</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>{c.name} ({c.phone || "No phone"})</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-slate-300 block mb-1.5">Site Location / Landmark *</label>
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="e.g. Kakkanad Pillar 42 / Aluva Site"
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl py-2.5 px-3.5 text-sm text-white font-medium focus:border-amber-500 outline-none transition-colors"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-slate-300 block mb-1.5">Service Date *</label>
                    <input
                      type="date"
                      value={dateOfService}
                      onChange={(e) => setDateOfService(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl py-2.5 px-3.5 text-sm text-white font-medium focus:border-amber-500 outline-none transition-colors"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Equipment Categories & Options */}
              <div className="bg-slate-950/70 p-6 rounded-2xl border border-slate-800/80 space-y-6">
                <div>
                  <h4 className="text-base font-bold text-white flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                    Equipment Categories & Options
                  </h4>
                  <p className="text-sm text-slate-400 mt-0.5">Select active service lines for this dispatch order.</p>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                  {[
                    { mode: "LIFT", label: "Lift Machine", icon: <Truck className="w-4 h-4 text-blue-400" /> },
                    { mode: "MIXER", label: "Concrete Mixer", icon: <Wrench className="w-4 h-4 text-amber-400" /> },
                    { mode: "VIBRATOR", label: "Vibrator Machine", icon: <Layers className="w-4 h-4 text-purple-400" /> },
                    { mode: "TROLLY", label: "Trolly & Bench Stand", icon: <HardHat className="w-4 h-4 text-emerald-400" /> },
                    { mode: "LABOR", label: "Pani Crew Only", icon: <Users className="w-4 h-4 text-rose-400" /> },
                    { mode: "CUSTOM", label: "Custom Equipment", icon: <PlusCircle className="w-4 h-4 text-cyan-400" /> },
                  ].map((cat) => {
                    const active = activeModes.includes(cat.mode);
                  

  return (
                      <button
                        key={cat.mode}
                        type="button"
                        onClick={() => toggleMode(cat.mode)}
                        className={`p-4 rounded-2xl border text-left flex flex-col justify-between transition-all ${
                          active
                            ? "bg-amber-500/10 border-amber-500/60 text-white shadow-lg shadow-amber-500/5"
                            : "bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          {cat.icon}
                          <span className={`w-2 h-2 rounded-full ${active ? "bg-amber-400" : "bg-slate-700"}`}></span>
                        </div>
                        <span className="font-bold text-sm">{cat.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Inline Options Strip if any category selected */}
                {(activeModes.includes("LIFT") || activeModes.includes("MIXER") || activeModes.includes("VIBRATOR") || activeModes.includes("TROLLY")) && (
                  <div className="pt-6 border-t border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {activeModes.includes("LIFT") && (
                      <div>
                        <label className="text-sm font-semibold text-slate-300 block mb-1.5">Lift Storeys / Floors</label>
                        <input
                          type="number"
                          min="1"
                          max="20"
                          value={liftFloors}
                          onChange={(e) => setLiftFloors(Number(e.target.value) || 1)}
                          className="w-full bg-slate-900 border border-slate-700/80 rounded-xl py-2 px-3 text-sm text-white font-bold focus:border-amber-500 outline-none"
                        />
                      </div>
                    )}

                    {activeModes.includes("MIXER") && (
                      <div>
                        <label className="text-sm font-semibold text-slate-300 block mb-1.5">Mixer Category</label>
                        <select
                          value={mixerCategory}
                          onChange={(e) => setMixerCategory(e.target.value as any)}
                          className="w-full bg-slate-900 border border-slate-700/80 rounded-xl py-2 px-3 text-sm text-white font-bold focus:border-amber-500 outline-none"
                        >
                          <option value="STANDARD">Standard Mixer</option>
                          <option value="HYDRAULIC">Hydraulic Machine</option>
                        </select>
                      </div>
                    )}

                    {activeModes.includes("VIBRATOR") && (
                      <div>
                        <label className="text-sm font-semibold text-slate-300 block mb-1.5">Vibrator Type</label>
                        <select
                          value={vibratorType}
                          onChange={(e) => setVibratorType(e.target.value as any)}
                          className="w-full bg-slate-900 border border-slate-700/80 rounded-xl py-2 px-3 text-sm text-white font-bold focus:border-amber-500 outline-none"
                        >
                          <option value="PETROL">Petrol Vibrator</option>
                          <option value="ELECTRIC">Electric Vibrator</option>
                          <option value="BOTH">Petrol + Electric</option>
                          <option value="NONE">No Vibrator Needed</option>
                        </select>
                      </div>
                    )}

                    {activeModes.includes("TROLLY") && (
                      <div className="flex items-center h-full pt-6">
                        <label className="flex items-center gap-3 cursor-pointer p-3 bg-slate-900 rounded-xl border border-slate-800 w-full">
                          <input
                            type="checkbox"
                            checked={hasTrollyBench}
                            onChange={(e) => setHasTrollyBench(e.target.checked)}
                            className="w-4 h-4 accent-amber-500 rounded"
                          />
                          <span className="text-sm font-bold text-white">Include Bench Stand</span>
                        </label>
                      </div>
                    )}
                  </div>
                )}

                {/* Specific Machine Selection & Custom Machines List */}
                {(activeModes.includes("LIFT") || activeModes.includes("MIXER") || activeModes.includes("VIBRATOR") || activeModes.includes("CUSTOM")) && (
                  <div className="pt-6 border-t border-slate-800/80 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <label className="text-xs font-bold text-slate-300 block">Specific Machine Unit Assignment & Custom Equipment</label>
                        <span className="text-xs text-slate-500">Select physical equipment fleet units or define custom rental machinery below.</span>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddCustomMachine}
                        className="px-3.5 py-1.5 rounded-xl bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-400 font-bold text-xs flex items-center gap-1.5 transition-all w-fit shadow-sm"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        + Add Custom / External Machine
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {machines.map((m) => {
                        const selected = selectedMachineIds.includes(m.id);
                      

  return (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => handleToggleMachine(m.id)}
                            className={`p-3 rounded-xl border text-left flex items-center justify-between text-xs transition-all ${
                              selected ? "bg-amber-500/20 border-amber-500 text-amber-200 font-bold" : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                            }`}
                          >
                            <div>
                              <div className="text-white font-semibold">{m.name}</div>
                              <div className="text-[10px] text-slate-500 font-mono">{m.category} â€¢ {m.serialNumber || "No SN"}</div>
                            </div>
                            <span className={`w-4 h-4 rounded-full border flex items-center justify-center ${selected ? "border-amber-400 bg-amber-400/20 text-amber-400 font-black" : "border-slate-700"}`}>
                              {selected && "âœ“"}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {customMachines.length > 0 && (
                      <div className="space-y-2 pt-2">
                        <span className="text-xs font-bold text-cyan-400 uppercase tracking-wider block">Custom / External Machinery Items:</span>
                        {customMachines.map((m) => (
                          <div key={m.id} className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center bg-slate-900/90 p-3 rounded-xl border border-cyan-500/30">
                            <div className="sm:col-span-6">
                              <input
                                type="text"
                                value={m.name}
                                onChange={(e) => handleCustomMachineChange(m.id, "name", e.target.value)}
                                placeholder="Custom Machine Name / Specification (e.g. 15HP Diesel Generator)"
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg py-1.5 px-3 text-xs text-white outline-none focus:border-cyan-400"
                              />
                            </div>
                            <div className="sm:col-span-2">
                              <input
                                type="number"
                                min="1"
                                value={m.qty}
                                onChange={(e) => handleCustomMachineChange(m.id, "qty", Number(e.target.value) || 1)}
                                placeholder="Qty"
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg py-1.5 px-3 text-xs text-center text-cyan-400 font-bold outline-none"
                              />
                            </div>
                            <div className="sm:col-span-3">
                              <input
                                type="text"
                                value={m.rate || ""}
                                onChange={(e) => handleCustomMachineChange(m.id, "rate", e.target.value)}
                                placeholder="Rate / Daily Charge (â‚¹)"
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg py-1.5 px-3 text-xs text-emerald-400 outline-none"
                              />
                            </div>
                            <div className="sm:col-span-1 flex justify-end">
                              <button
                                type="button"
                                onClick={() => handleRemoveCustomMachine(m.id)}
                                className="p-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Section 3: Personnel Allocation (Leaders & Helpers) */}
              <div className="bg-slate-950/70 p-6 rounded-2xl border border-slate-800/80 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                  <div>
                    <h4 className="text-base font-bold text-white flex items-center gap-2">
                      <Users className="w-5 h-5 text-amber-400" />
                      Leaders & Pani Helpers Allocation
                    </h4>
                    <p className="text-sm text-slate-400 mt-0.5">Assign internal or external leaders and specify exact worker counts per crew.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-sm font-bold text-slate-300 flex items-center gap-2 shadow-sm">
                      <span>Total Helpers:</span>
                      <span className="font-black text-amber-400 text-base">
                        {leaderAllocations.reduce((sum, l) => sum + Number(l.helperCount || 0), 0)}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddLeaderRow}
                      className="px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 font-bold text-xs flex items-center gap-1.5 transition-all shadow-sm whitespace-nowrap"
                    >
                      <UserPlus className="w-4 h-4" />
                      + Add Another Leader
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {leaderAllocations.map((row, idx) => (
                    <div
                      key={row.id}
                      className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center bg-slate-900/80 p-4 rounded-2xl border border-slate-800/80"
                    >
                      <div className="sm:col-span-1 text-center font-bold text-slate-500 text-sm">
                        #{idx + 1}
                      </div>

                      <div className="sm:col-span-3">
                        <label className="text-xs font-semibold text-slate-400 block mb-1">Select Internal Leader</label>
                        <select
                          value={row.leaderId || ""}
                          onChange={(e) => handleLeaderRowChange(idx, "leaderId", e.target.value || undefined)}
                          className="w-full bg-slate-950 border border-slate-700/80 rounded-xl py-2 px-3 text-sm text-white font-medium focus:border-amber-500 outline-none"
                        >
                          <option value="">-- External / Direct Caller --</option>
                          {employees.map((emp) => (
                            <option key={emp.id} value={emp.id}>{emp.name} ({emp.phone || "No Phone"})</option>
                          ))}
                        </select>
                      </div>

                      <div className="sm:col-span-3">
                        <label className="text-xs font-semibold text-slate-400 block mb-1">External Leader Name</label>
                        <input
                          type="text"
                          value={row.leaderName || ""}
                          onChange={(e) => handleLeaderRowChange(idx, "leaderName", e.target.value)}
                          placeholder="e.g. Raju Mestri"
                          disabled={!!row.leaderId}
                          className="w-full bg-slate-950 border border-slate-700/80 rounded-xl py-2 px-3 text-sm text-white font-medium disabled:opacity-40 focus:border-amber-500 outline-none"
                        />
                      </div>

                      <div className="sm:col-span-1">
                        <label className="text-xs font-semibold text-slate-400 block mb-1">Workers</label>
                        <input
                          type="number"
                          min="0"
                          max="100"
                          value={row.helperCount}
                          onChange={(e) => handleLeaderRowChange(idx, "helperCount", Number(e.target.value) || 0)}
                          className="w-full bg-slate-950 border border-slate-700/80 rounded-xl py-2 px-2 text-sm text-amber-400 font-bold text-center focus:border-amber-500 outline-none"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="text-xs font-semibold text-slate-400 block mb-1">Skill Category</label>
                        <input
                          type="text"
                          value={row.skillCategory || ""}
                          onChange={(e) => handleLeaderRowChange(idx, "skillCategory", e.target.value)}
                          placeholder="e.g. Mason / Bar Bender"
                          className="w-full bg-slate-950 border border-slate-700/80 rounded-xl py-2 px-2.5 text-xs text-white font-medium focus:border-amber-500 outline-none"
                        />
                      </div>

                      <div className="sm:col-span-1">
                        <label className="text-xs font-semibold text-slate-400 block mb-1">Rate (â‚¹)</label>
                        <input
                          type="text"
                          value={row.dailyWage || ""}
                          onChange={(e) => handleLeaderRowChange(idx, "dailyWage", e.target.value)}
                          placeholder="â‚¹/day"
                          className="w-full bg-slate-950 border border-slate-700/80 rounded-xl py-2 px-2 text-xs text-emerald-400 font-bold focus:border-amber-500 outline-none"
                        />
                      </div>

                      <div className="sm:col-span-1 flex justify-end">
                        {leaderAllocations.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveLeaderRow(idx)}
                            className="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors"
                            title="Remove leader row"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 4: Equipment Operators & Conveyance */}
              <div className="bg-slate-950/70 p-6 rounded-2xl border border-slate-800/80 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
                  <div>
                    <h4 className="text-base font-bold text-white flex items-center gap-2">
                      <Truck className="w-5 h-5 text-amber-400" />
                      Equipment Operators & Conveyance
                    </h4>
                    <p className="text-sm text-slate-400 mt-0.5">Assign operator slots or designate public conveyance.</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-slate-300">Operators Required:</span>
                    <select
                      value={operatorCountNeeded}
                      onChange={(e) => {
                        const target = Number(e.target.value);
                        setOperatorCountNeeded(target);
                        if (operatorSlots.length < target) {
                          setOperatorSlots([...operatorSlots, ...Array(target - operatorSlots.length).fill("")]);
                        }
                      }}
                      className="bg-slate-900 border border-slate-700 rounded-xl py-1.5 px-3 text-sm font-bold text-amber-400 outline-none focus:border-amber-500"
                    >
                      {[0, 1, 2, 3, 4, 5, 6, 7, 8].map((num) => (
                        <option key={num} value={num}>{num} {num === 1 ? "Operator" : "Operators"}</option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => {
                        const target = operatorCountNeeded + 1;
                        setOperatorCountNeeded(target);
                        if (operatorSlots.length < target) {
                          setOperatorSlots([...operatorSlots, ""]);
                        }
                      }}
                      className="px-3 py-1.5 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-400 font-bold text-xs flex items-center gap-1 transition-all shadow-sm whitespace-nowrap"
                    >
                      <PlusCircle className="w-3.5 h-3.5" />
                      + Add Slot
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                  {/* Operator Slots */}
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-slate-300 block">Operator Slot Assignments (`Internal or Custom`)</label>
                    {operatorCountNeeded === 0 ? (
                      <div className="p-4 bg-slate-900/60 rounded-xl border border-slate-800 text-sm text-slate-400 flex items-center gap-2.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>No operators requested (`e.g. direct rental`). Click '+ Add Slot' to assign any operator.</span>
                      </div>
                    ) : (
                      operatorSlots.slice(0, operatorCountNeeded).map((slotId, idx) => (
                        <div key={idx} className="p-3 bg-slate-900/90 rounded-2xl border border-slate-800 space-y-2">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-bold text-amber-400 w-16">Slot #{idx + 1}</span>
                            <select
                              value={slotId}
                              onChange={(e) => {
                                const next = [...operatorSlots];
                                next[idx] = e.target.value;
                                setOperatorSlots(next);
                                if (idx === 0) setOperatorId(e.target.value);
                              }}
                              className="flex-1 bg-slate-950 border border-slate-700/80 rounded-xl py-2 px-3 text-sm text-white font-medium focus:border-amber-500 outline-none"
                            >
                              <option value="">-- Assign Operator... --</option>
                              <option value="CUSTOM">-- Custom / External Operator --</option>
                              {employees
                                .filter((emp) => {
                                  const hasOpSkill = emp.skills?.includes("OPERATOR") || emp.role?.includes("OPERATOR");
                                  const canDualOperate = emp.canOperateLift && emp.canOperateMixer;
                                  if (workCategory === "MACHINE" || activeModes.includes("LIFT") || activeModes.includes("MIXER")) {
                                    return hasOpSkill || canDualOperate;
                                  }
                                  return true;
                                })
                                .map((emp) => {
                                  const badges: string[] = [];
                                  if (emp.canOperateLift && emp.canOperateMixer) badges.push("Lift+Mixer Dual");
                                  else if (emp.canOperateLift) badges.push("Lift");
                                  else if (emp.canOperateMixer) badges.push("Mixer");

                                

  return (
                                    <option key={emp.id} value={emp.id}>
                                      {emp.name} {emp.phone ? `(${emp.phone})` : ""} {badges.length > 0 ? `[${badges.join(" | ")}]` : ""}
                                    </option>
                                  );
                                })}
                            </select>
                          </div>

                          {slotId === "CUSTOM" && (
                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 pt-2 border-t border-slate-800/80">
                              <div className="sm:col-span-6">
                                <input
                                  type="text"
                                  value={customOperators[idx]?.name || ""}
                                  onChange={(e) => setCustomOperators({ ...customOperators, [idx]: { ...customOperators[idx], name: e.target.value } })}
                                  placeholder="Custom Operator Name *"
                                  className="w-full bg-slate-950 border border-slate-700 rounded-lg py-1.5 px-2.5 text-xs text-white outline-none focus:border-amber-500"
                                />
                              </div>
                              <div className="sm:col-span-3">
                                <input
                                  type="text"
                                  value={customOperators[idx]?.phone || ""}
                                  onChange={(e) => setCustomOperators({ ...customOperators, [idx]: { ...customOperators[idx], phone: e.target.value } })}
                                  placeholder="Phone No."
                                  className="w-full bg-slate-950 border border-slate-700 rounded-lg py-1.5 px-2.5 text-xs text-white outline-none focus:border-amber-500"
                                />
                              </div>
                              <div className="sm:col-span-3">
                                <input
                                  type="text"
                                  value={customOperators[idx]?.wage || ""}
                                  onChange={(e) => setCustomOperators({ ...customOperators, [idx]: { ...customOperators[idx], wage: e.target.value } })}
                                  placeholder="Wage (â‚¹/day)"
                                  className="w-full bg-slate-950 border border-slate-700 rounded-lg py-1.5 px-2.5 text-xs text-emerald-400 font-bold outline-none focus:border-amber-500"
                                />
                              </div>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  {/* Conveyance / Driver */}
                  <div className="space-y-3">
                    <label className="text-sm font-semibold text-slate-300 block">Transport & Conveyance Method</label>
                    <div className="p-4 bg-slate-900/80 rounded-2xl border border-slate-800/80 space-y-4">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={publicTransportUsed}
                          onChange={(e) => setPublicTransportUsed(e.target.checked)}
                          className="w-4 h-4 accent-amber-500 rounded"
                        />
                        <div>
                          <span className="text-sm font-bold text-white block">Public Transport / Auto / Client Pick-Up</span>
                          <span className="text-xs text-slate-400">Driver not required from internal pool</span>
                        </div>
                      </label>

                      {!publicTransportUsed && (
                        <div className="pt-3 border-t border-slate-800/80 space-y-3">
                          <div>
                            <label className="text-xs font-semibold text-slate-400 block mb-1.5">Assign Company / Custom Driver</label>
                            <select
                              value={driverId}
                              onChange={(e) => setDriverId(e.target.value)}
                              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl py-2.5 px-3.5 text-sm text-white font-medium focus:border-amber-500 outline-none"
                            >
                              <option value="">-- Select Company Driver --</option>
                              <option value="CUSTOM">-- Custom / External Driver --</option>
                              {employees
                                .filter((e) => e.skills?.includes("DRIVER") || e.role?.includes("DRIVER") || e.name.toLowerCase().includes("driver"))
                                .map((driver) => (
                                  <option key={driver.id} value={driver.id}>{driver.name} ({driver.phone || "No phone"})</option>
                                ))}
                            </select>
                          </div>

                          {driverId === "CUSTOM" && (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 p-3 bg-slate-950 rounded-xl border border-amber-500/30">
                              <input
                                type="text"
                                value={customDriverDetails.name}
                                onChange={(e) => setCustomDriverDetails({ ...customDriverDetails, name: e.target.value })}
                                placeholder="Custom Driver Name *"
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg py-1.5 px-2.5 text-xs text-white outline-none focus:border-amber-500"
                              />
                              <input
                                type="text"
                                value={customDriverDetails.phone}
                                onChange={(e) => setCustomDriverDetails({ ...customDriverDetails, phone: e.target.value })}
                                placeholder="Driver Phone No."
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg py-1.5 px-2.5 text-xs text-white outline-none focus:border-amber-500"
                              />
                              <input
                                type="text"
                                value={customDriverDetails.vehicleNo}
                                onChange={(e) => setCustomDriverDetails({ ...customDriverDetails, vehicleNo: e.target.value })}
                                placeholder="Vehicle / Pickup No."
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg py-1.5 px-2.5 text-xs text-amber-400 font-mono outline-none focus:border-amber-500"
                              />
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Section 5: Auxiliary Setup Tools Grid & Custom Items */}
              <div className="bg-slate-950/70 p-6 rounded-2xl border border-slate-800/80 space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-base font-bold text-white flex items-center gap-2">
                      <Wrench className="w-5 h-5 text-amber-400" />
                      Auxiliary Setup Tools & Custom Items
                    </h4>
                    <p className="text-sm text-slate-400 mt-0.5">Adjust database tool estimates or add custom site equipment below.</p>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddCustomTool}
                    className="px-3.5 py-1.5 rounded-xl bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 text-purple-400 font-bold text-xs flex items-center gap-1.5 transition-all w-fit shadow-sm"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    + Add Custom Tool / Item
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {tools
                    .filter((t) => {
                      const name = t.name.toLowerCase();
                      return !name.includes("cement") && !name.includes("bag");
                    })
                    .map((tool) => {
                      const qty = toolQuantities[tool.id] || 0;
                    

  return (
                        <div
                          key={tool.id}
                          className="h-full flex flex-col justify-between p-4 bg-slate-900/80 border border-slate-800/80 rounded-2xl hover:border-slate-700 transition-all"
                        >
                          <div>
                            <span className="font-bold text-sm text-slate-200 block">{tool.name}</span>
                            {tool.malayalamName && (
                              <span className="text-xs text-slate-400 font-normal block mt-0.5">{tool.malayalamName}</span>
                            )}
                          </div>
                          <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-800/60">
                            <button
                              type="button"
                              onClick={() => handleToolQtyChange(tool.id, -1)}
                              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center text-sm transition-colors"
                            >
                              -
                            </button>
                            <span className="font-black text-amber-400 text-sm">{qty}</span>
                            <button
                              type="button"
                              onClick={() => handleToolQtyChange(tool.id, 1)}
                              className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-bold flex items-center justify-center text-sm transition-colors"
                            >
                              +
                            </button>
                          </div>
                        </div>
                      );
                    })}

                  {customToolsList.map((tool) => (
                    <div
                      key={tool.id}
                      className="h-full flex flex-col justify-between p-4 bg-purple-950/20 border border-purple-500/40 rounded-2xl transition-all space-y-2"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-black uppercase tracking-wider text-purple-400 px-1.5 py-0.5 rounded bg-purple-500/10 border border-purple-500/30">Custom Tool</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveCustomTool(tool.id)}
                            className="text-slate-500 hover:text-red-400 transition-colors"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <input
                          type="text"
                          value={tool.name}
                          onChange={(e) => handleCustomToolChange(tool.id, "name", e.target.value)}
                          placeholder="Tool Name *"
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg py-1 px-2 text-xs text-white font-bold outline-none focus:border-purple-400"
                        />
                        <input
                          type="text"
                          value={tool.malayalamName || ""}
                          onChange={(e) => handleCustomToolChange(tool.id, "malayalamName", e.target.value)}
                          placeholder="Malayalam Name (`Optional`)"
                          className="w-full bg-slate-950 border border-slate-700 rounded-lg py-1 px-2 text-[11px] text-slate-300 outline-none focus:border-purple-400"
                        />
                      </div>
                      <div className="flex items-center justify-between mt-3 pt-2 border-t border-purple-500/20">
                        <button
                          type="button"
                          onClick={() => handleCustomToolQtyDelta(tool.id, -1)}
                          className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold flex items-center justify-center text-sm transition-colors border border-slate-700"
                        >
                          -
                        </button>
                        <span className="font-black text-purple-300 text-sm">{tool.qty}</span>
                        <button
                          type="button"
                          onClick={() => handleCustomToolQtyDelta(tool.id, 1)}
                          className="w-8 h-8 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold flex items-center justify-center text-sm transition-colors border border-slate-700"
                        >
                          +
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Section 6: Notes & Final Confirmation Strip */}
              <div className="bg-slate-950/70 p-6 rounded-2xl border border-slate-800/80 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="text-sm font-semibold text-slate-300 block mb-1.5">Special Booking Notes / Site Instructions</label>
                    <textarea
                      rows={2}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="e.g. Gate pass required, narrow alleyway approach..."
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl p-3 text-sm text-white font-medium focus:border-amber-500 outline-none resize-none"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-slate-300 block mb-1.5">Driver GPS Map Pin Link (`Optional`)</label>
                    <input
                      type="url"
                      value={mapLink}
                      onChange={(e) => setMapLink(e.target.value)}
                      placeholder="https://maps.google.com/..."
                      className="w-full bg-slate-900 border border-slate-700/80 rounded-xl py-2.5 px-3.5 text-sm text-white font-mono focus:border-amber-500 outline-none"
                    />
                    <span className="text-xs text-slate-500 mt-1 block">Provides turn-by-turn navigation directly inside driver field apps.</span>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center justify-end gap-3 pt-4 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => onClose()}
                    className="px-6 py-3 rounded-xl border border-slate-700 text-slate-300 font-bold hover:bg-slate-800 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className="w-full sm:w-auto px-8 py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-sm shadow-xl shadow-amber-500/20 flex items-center justify-center gap-2 transition-all"
                  >
                    {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <PlusCircle className="w-4 h-4" />}
                    Confirm & Create Booking Order
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>

      {/* QUICK INLINE ADD CUSTOMER MODAL */}
      {showNewCustomerModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-amber-400" />
                Quick Add Contractor / Customer
              </h3>
              <button onClick={() => setShowNewCustomerModal(false)} className="text-slate-400 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleQuickCustomerSubmit} className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Contractor / Customer Name *</label>
                <input
                  type="text"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  placeholder="e.g. Jose Contractors / Thomas"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:border-amber-500 outline-none font-bold"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Phone Number *</label>
                <input
                  type="tel"
                  value={newCustPhone}
                  onChange={(e) => setNewCustPhone(e.target.value)}
                  placeholder="e.g. 9847012345"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:border-amber-500 outline-none font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">Default Site Address / City (Optional)</label>
                <input
                  type="text"
                  value={newCustAddress}
                  onChange={(e) => setNewCustAddress(e.target.value)}
                  placeholder="e.g. Kakkanad, Kochi"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:border-amber-500 outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowNewCustomerModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow flex items-center gap-1.5"
                >
                  {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
                  Add Contractor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
