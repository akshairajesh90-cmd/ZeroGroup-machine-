"use client";

import React, { useState, useTransition } from "react";
import {
  X,
  Building2,
  Calendar,
  Truck,
  Wrench,
  Users,
  Settings,
  Plus,
  Trash2,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  ExternalLink,
} from "lucide-react";
import { updateDailyDispatch } from "@/actions/dispatch";
import { SiteLocationButtons } from "./SiteLocationButtons";
import { parseKeralaLocation } from "@/lib/gis/keralaGeoParser";
import { ShieldAlert, Compass } from "lucide-react";

interface EditDispatchModalProps {
  dispatch: any;
  machines: any[];
  employees: any[];
  tools: any[];
  vehicles: any[];
  customers: any[];
  onClose: () => void;
  onSuccess: () => void;
}

export function EditDispatchModal({
  dispatch,
  machines,
  employees,
  tools,
  vehicles,
  customers,
  onClose,
  onSuccess,
}: EditDispatchModalProps) {
  const [activeTab, setActiveTab] = useState<"site" | "work" | "fleet" | "crew" | "tools">("site");
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Tab 1: Jobsite & Schedule
  const [customerId, setCustomerId] = useState(dispatch.customerId || "");
  const [location, setLocation] = useState(dispatch.location || "");
  const [subLocality, setSubLocality] = useState(dispatch.subLocality || "");
  const [structuralAnchor, setStructuralAnchor] = useState(dispatch.structuralAnchor || "");
  const [isOffRoad, setIsOffRoad] = useState(Boolean(dispatch.isOffRoad));

  const geoAnalysis = React.useMemo(() => {
    const combined = [location, subLocality, structuralAnchor].filter(Boolean).join(", ");
    return parseKeralaLocation(combined || location);
  }, [location, subLocality, structuralAnchor]);
  const [mapLink, setMapLink] = useState(dispatch.mapLink || "");
  const [dateOfService, setDateOfService] = useState(() => {
    try {
      return new Date(dispatch.dateOfService).toISOString().split("T")[0];
    } catch {
      return new Date().toISOString().split("T")[0];
    }
  });
  const [status, setStatus] = useState<any>(dispatch.status || "PENDING");
  const [statusReason, setStatusReason] = useState("");

  // Tab 2: Work Parameters
  const [workType, setWorkType] = useState(dispatch.workType || "NORMAL");
  const [liftFloors, setLiftFloors] = useState<number>(dispatch.liftFloors || 1);
  const [mixerCategory, setMixerCategory] = useState(dispatch.mixerCategory || "STANDARD");
  const [vibratorType, setVibratorType] = useState<string>(dispatch.vibratorType || "NONE");
  const [hasTrollyBench, setHasTrollyBench] = useState<boolean>(dispatch.hasTrollyBench || false);
  const [publicTransportUsed, setPublicTransportUsed] = useState<boolean>(dispatch.publicTransportUsed || false);
  const [notes, setNotes] = useState(dispatch.notes || "");

  // Tab 3: Machines & Transport Fleet
  const [primaryMachineId, setPrimaryMachineId] = useState(() => {
    return dispatch.machineId || (dispatch.dispatchMachines?.[0]?.machineId) || "";
  });
  const [additionalMachineIds, setAdditionalMachineIds] = useState<string[]>(() => {
    const list = dispatch.dispatchMachines?.map((dm: any) => dm.machineId) || [];
    return list.filter((id: string) => id !== dispatch.machineId);
  });
  const [vehicleId, setVehicleId] = useState(dispatch.vehicleId || "");
  const [driverId, setDriverId] = useState(dispatch.driverId || "");

  // Tab 4: Dynamic Crew & Field Labour
  const [operatorId, setOperatorId] = useState(dispatch.operatorId || "");
  const [siteLeaderEmployeeId, setSiteLeaderEmployeeId] = useState(() => {
    const leaderAssignment = dispatch.crewAssignments?.find((ca: any) => ca.assignedRole === "WORKER_LEADER");
    return leaderAssignment?.employeeId || dispatch.siteLeaderEmployeeId || "";
  });
  const [workerId, setWorkerId] = useState(() => {
    const subLeaderAssignment = dispatch.crewAssignments?.find((ca: any) => ca.assignedRole === "SUB_LEADER");
    return subLeaderAssignment?.employeeId || dispatch.workerId || "";
  });
  const [mainHelperId, setMainHelperId] = useState(dispatch.mainHelperId || "");
  const [helperCount, setHelperCount] = useState<number>(dispatch.helperCount || 0);
  const [trollyWorkerCount, setTrollyWorkerCount] = useState<number>(dispatch.trollyWorkerCount || 0);

  // Tab 5: Setup Tools Management
  const [assignedTools, setAssignedTools] = useState<Array<{ toolId: string; quantity: number; variant?: string; toolName: string }>>(() => {
    if (dispatch.dispatchTools && dispatch.dispatchTools.length > 0) {
      return dispatch.dispatchTools.map((dt: any) => ({
        toolId: dt.toolId,
        quantity: dt.quantity || 1,
        variant: dt.variant || "",
        toolName: dt.tool?.name || "Tool",
      }));
    }
    return [];
  });
  const [selectedNewToolId, setSelectedNewToolId] = useState("");
  const [newToolQty, setNewToolQty] = useState(1);

  // Tool actions
  const handleAddTool = () => {
    if (!selectedNewToolId) return;
    const toolObj = tools.find((t) => t.id === selectedNewToolId);
    if (!toolObj) return;

    const existingIndex = assignedTools.findIndex((t) => t.toolId === selectedNewToolId);
    if (existingIndex >= 0) {
      const updated = [...assignedTools];
      updated[existingIndex].quantity += newToolQty;
      setAssignedTools(updated);
    } else {
      setAssignedTools([
        ...assignedTools,
        {
          toolId: toolObj.id,
          quantity: newToolQty,
          variant: toolObj.toolType || "",
          toolName: toolObj.name,
        },
      ]);
    }
    setSelectedNewToolId("");
    setNewToolQty(1);
  };

  const handleUpdateToolQty = (toolId: string, delta: number) => {
    setAssignedTools((prev) =>
      prev
        .map((t) => {
          if (t.toolId === toolId) {
            const nextQty = t.quantity + delta;
            return nextQty > 0 ? { ...t, quantity: nextQty } : null;
          }
          return t;
        })
        .filter(Boolean) as any
    );
  };

  const handleRemoveTool = (toolId: string) => {
    setAssignedTools((prev) => prev.filter((t) => t.toolId !== toolId));
  };

  // Submission
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!customerId) {
      setErrorMsg("Please select a customer.");
      setActiveTab("site");
      return;
    }
    if (!location.trim()) {
      setErrorMsg("Construction site location is required.");
      setActiveTab("site");
      return;
    }

    startTransition(async () => {
      // Build machine list
      const machineIds = Array.from(new Set([
        ...(primaryMachineId ? [primaryMachineId] : []),
        ...additionalMachineIds,
      ])).filter(Boolean);

      // Build crew assignments with explicit operational roles
      const crewAssignments: Array<{ employeeId: string; assignedRole: string; lockedWageRate?: number }> = [];

      if (operatorId) {
        crewAssignments.push({
          employeeId: operatorId,
          assignedRole: mixerCategory === "HYDRAULIC" ? "HYDRAULIC_OPERATOR" : "MIXER_OPERATOR",
          lockedWageRate: 1000,
        });
      }

      if (siteLeaderEmployeeId) {
        crewAssignments.push({
          employeeId: siteLeaderEmployeeId,
          assignedRole: "WORKER_LEADER",
          lockedWageRate: 1200,
        });
      }

      if (workerId) {
        crewAssignments.push({
          employeeId: workerId,
          assignedRole: "SUB_LEADER",
          lockedWageRate: 1000,
        });
      }

      if (mainHelperId) {
        crewAssignments.push({
          employeeId: mainHelperId,
          assignedRole: "HELPER",
          lockedWageRate: 800,
        });
      }

      const payload = {
        id: dispatch.id,
        version: dispatch.version,
        customerId,
        location: location.trim(),
        subLocality: subLocality.trim() || undefined,
        structuralAnchor: structuralAnchor.trim() || undefined,
        isOffRoad,
        mapLink: mapLink.trim() || null,
        dateOfService,
        status,
        statusReason: statusReason.trim() || undefined,
        workType,
        liftFloors: Number(liftFloors) || 1,
        mixerCategory,
        vibratorType: vibratorType === "NONE" ? null : vibratorType,
        hasTrollyBench,
        publicTransportUsed,
        machineId: primaryMachineId || null,
        machineIds,
        vehicleId: vehicleId || null,
        driverId: driverId || null,
        operatorId: operatorId || null,
        workerId: workerId || null,
        siteLeaderEmployeeId: siteLeaderEmployeeId || null,
        mainHelperId: mainHelperId || null,
        helperCount: Number(helperCount) || 0,
        trollyWorkerCount: Number(trollyWorkerCount) || 0,
        notes: notes.trim() || null,
        toolItems: assignedTools.map((t) => ({
          toolId: t.toolId,
          quantity: t.quantity,
          variant: t.variant || undefined,
        })),
        crewAssignments,
      };

      const res = await updateDailyDispatch(payload);

      if (res.success) {
        onSuccess();
      } else {
        setErrorMsg(res.error || "Failed to update dispatch.");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                Dispatch #{dispatch.id.slice(-6)}
              </span>
              <h2 className="text-lg font-black text-white">Edit Dispatch Ticket</h2>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Modify assigned crew, operators, drivers, machinery, and tools used
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isPending}
            className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-1 px-6 pt-3 border-b border-slate-800/80 bg-slate-950/20 overflow-x-auto">
          {[
            { id: "site", label: "1. Jobsite & Date", icon: Building2 },
            { id: "work", label: "2. Work & Concrete Specs", icon: Settings },
            { id: "fleet", label: "3. Machines & Fleet", icon: Truck },
            { id: "crew", label: "4. Crew & Workers", icon: Users },
            { id: "tools", label: "5. Setup Tools Used", icon: Wrench, count: assignedTools.length },
          ].map((tab: any) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
                  isActive
                    ? "border-amber-500 text-amber-400 bg-amber-500/5"
                    : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {tab.count !== undefined && (
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] ${isActive ? "bg-amber-400 text-slate-950 font-black" : "bg-slate-800 text-slate-300"}`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Error Alert */}
        {errorMsg && (
          <div className="mx-6 mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: Jobsite & Schedule */}
          {activeTab === "site" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Customer / Builder *
                  </label>
                  <select
                    value={customerId}
                    onChange={(e) => setCustomerId(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="">Select Customer</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} {c.phone ? `(${c.phone})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Service Date (Reschedule) *
                  </label>
                  <input
                    type="date"
                    value={dateOfService}
                    onChange={(e) => setDateOfService(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Site Location Address *
                </label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Skyline Towers, Block B, Kakkanad"
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Google Maps Pin Link (Optional)
                  </label>
                  <input
                    type="url"
                    value={mapLink}
                    onChange={(e) => setMapLink(e.target.value)}
                    placeholder="https://maps.google.com/..."
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Dispatch Status
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 font-bold"
                  >
                    <option value="PENDING">PENDING (Scheduled)</option>
                    <option value="EN_ROUTE">EN_ROUTE (Transit)</option>
                    <option value="IN_PROGRESS">IN_PROGRESS (On Site)</option>
                    <option value="COMPLETED">COMPLETED (Finished)</option>
                    <option value="POSTPONED">POSTPONED (Rescheduled)</option>
                    <option value="CANCELLED">CANCELLED (Void)</option>
                  </select>
                </div>
              </div>

              {/* Site Location & Turn-by-Turn Navigation Preview */}
              {(location.trim() || mapLink.trim()) && (
                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">
                    Site Location & Navigation Preview
                  </span>
                  <SiteLocationButtons
                    latitude={dispatch.latitude}
                    longitude={dispatch.longitude}
                    locationName={location}
                    customerName={customers.find((c) => c.id === customerId)?.name}
                    mapLink={mapLink}
                    variant="modal"
                    isOffRoad={dispatch.isOffRoad}
                    accessLatitude={dispatch.accessLatitude}
                    accessLongitude={dispatch.accessLongitude}
                    offRoadBearingDeg={dispatch.offRoadBearingDeg}
                    offRoadDistanceM={dispatch.offRoadDistanceM}
                    isCentroidVerified={dispatch.isCentroidVerified}
                    dwellConfidence={dispatch.dwellConfidence}
                  />
                </div>
              )}

              {(status === "CANCELLED" || status === "POSTPONED") && (
                <div>
                  <label className="block text-xs font-bold text-amber-400 uppercase tracking-wider mb-1.5">
                    Reason for Status Change (Audit Log)
                  </label>
                  <input
                    type="text"
                    value={statusReason}
                    onChange={(e) => setStatusReason(e.target.value)}
                    placeholder="Reason for cancellation or postponement..."
                    className="w-full bg-slate-950 border border-amber-500/40 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              )}
            </div>
          )}

          {/* TAB 2: Work & Concrete Specs */}
          {activeTab === "work" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Work Type
                  </label>
                  <select
                    value={workType}
                    onChange={(e) => setWorkType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="NORMAL">NORMAL Pouring</option>
                    <option value="TROLLY">TROLLY Work</option>
                    <option value="LATE">LATE Wrap-up</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Lift Storeys / Floors
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={liftFloors}
                    onChange={(e) => setLiftFloors(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">1 = Ground, 2+ adds ₹500/floor on bill</p>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Mixer Category
                  </label>
                  <select
                    value={mixerCategory}
                    onChange={(e) => setMixerCategory(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="STANDARD">STANDARD Concrete Mixer</option>
                    <option value="HYDRAULIC">HYDRAULIC Concrete Mixer</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Vibrator Motor Type
                  </label>
                  <select
                    value={vibratorType}
                    onChange={(e) => setVibratorType(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="NONE">None / Manual Tamp</option>
                    <option value="PETROL">Petrol Vibrator</option>
                    <option value="ELECTRIC">Electric Vibrator</option>
                  </select>
                </div>

                <div className="flex items-center gap-3 pt-6">
                  <input
                    type="checkbox"
                    id="publicTransport"
                    checked={publicTransportUsed}
                    onChange={(e) => setPublicTransportUsed(e.target.checked)}
                    className="w-4 h-4 rounded text-amber-500 bg-slate-950 border-slate-800"
                  />
                  <label htmlFor="publicTransport" className="text-xs font-bold text-slate-300 cursor-pointer">
                    Public Transport Used (Bus/Auto)
                  </label>
                </div>
              </div>

              {/* 1-Wheel Trolly & Bench Stand (Work & Concrete Specs) */}
              <div className="p-4 rounded-2xl border border-slate-800 bg-slate-950/70 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="trollyBench"
                      checked={hasTrollyBench}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setHasTrollyBench(checked);
                        if (checked && trollyWorkerCount <= 0) {
                          setTrollyWorkerCount(1);
                        }
                      }}
                      className="w-4 h-4 rounded text-amber-500 bg-slate-900 border-slate-700"
                    />
                    <label htmlFor="trollyBench" className="text-xs font-bold text-white cursor-pointer flex items-center gap-2">
                      1-Wheel Trolly & Bench Stand (Ramp Pouring Setup)
                    </label>
                  </div>
                  {hasTrollyBench && (
                    <span className="text-[10px] bg-amber-500/10 text-amber-400 font-bold px-2.5 py-1 rounded-full border border-amber-500/20">
                      Work Specs: ₹1,500/trolly + ₹1,000 tool rent
                    </span>
                  )}
                </div>

                {hasTrollyBench && (
                  <div className="pt-3 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-0.5">
                        No. of 1-Wheel Trollies Used on Bench
                      </label>
                      <p className="text-[11px] text-slate-500">
                        1-Wheel Trolly is exclusively used with the bench ramp for pouring. Specify the count used.
                      </p>
                    </div>

                    <div className="flex items-center border border-slate-700 rounded-xl overflow-hidden bg-slate-900 self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setTrollyWorkerCount(Math.max(1, (trollyWorkerCount || 1) - 1))}
                        className="px-3.5 py-1.5 text-slate-400 hover:text-white hover:bg-slate-800 text-sm font-bold transition-colors"
                      >
                        -
                      </button>
                      <span className="px-4 py-1.5 text-sm font-bold text-amber-400 min-w-[40px] text-center">
                        {trollyWorkerCount || 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => setTrollyWorkerCount((trollyWorkerCount || 1) + 1)}
                        className="px-3.5 py-1.5 text-slate-400 hover:text-white hover:bg-slate-800 text-sm font-bold transition-colors"
                      >
                        +
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Job Notes & Special Site Instructions
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Bring extra 60mm needle pin, narrow gate entrance..."
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-amber-500 resize-none"
                />
              </div>
            </div>
          )}

          {/* TAB 3: Machines & Transport Fleet */}
          {activeTab === "fleet" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Primary Concrete Machine
                  </label>
                  <select
                    value={primaryMachineId}
                    onChange={(e) => setPrimaryMachineId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="">No Machine (Independent Labor / Tools)</option>
                    {machines.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.machineId} — {m.type} ({m.status})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Additional / Secondary Machine
                  </label>
                  <select
                    value={additionalMachineIds[0] || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      setAdditionalMachineIds(val ? [val] : []);
                    }}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="">None</option>
                    {machines
                      .filter((m) => m.id !== primaryMachineId)
                      .map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.machineId} — {m.type} ({m.status})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Delivery Transport Vehicle
                  </label>
                  <select
                    value={vehicleId}
                    onChange={(e) => setVehicleId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="">No Company Vehicle Assigned</option>
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.licensePlate} — {v.model || v.type} ({v.status})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Fleet Driver
                  </label>
                  <select
                    value={driverId}
                    onChange={(e) => setDriverId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="">No Driver Assigned</option>
                    {employees
                      .filter((emp) => emp.role === "DRIVER" || emp.operatorType === "INTERNAL")
                      .map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} ({emp.role})
                        </option>
                      ))}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* TAB 4: Dynamic Crew & Field Labour */}
          {activeTab === "crew" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Machine Operator (Our Internal Worker)
                  </label>
                  <select
                    value={operatorId}
                    onChange={(e) => setOperatorId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="">No Operator Assigned</option>
                    {employees
                      .filter((emp) => emp.role === "OPERATOR" || emp.operatorType === "INTERNAL")
                      .map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} ({emp.role} - Internal Worker)
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Company Site Leader (Our Foreman)
                  </label>
                  <select
                    value={siteLeaderEmployeeId}
                    onChange={(e) => setSiteLeaderEmployeeId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="">No Company Site Leader Assigned</option>
                    {employees
                      .filter((emp) => emp.role === "WORKER_LEADER" || emp.operatorType === "INTERNAL")
                      .map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} ({emp.role})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Sub Leader / Outside Worker Provider
                  </label>
                  <select
                    value={workerId}
                    onChange={(e) => setWorkerId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="">No Sub Leader Assigned</option>
                    {employees
                      .filter((emp) => emp.role === "SUB_LEADER" || emp.role === "WORKER" || emp.operatorType === "SUBCONTRACTOR")
                      .map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} ({emp.role} - Outside Contractor)
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Assigned Helper / Pani Helper (Site Labour)
                  </label>
                  <select
                    value={mainHelperId}
                    onChange={(e) => setMainHelperId(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="">No Named Helper Assigned</option>
                    {employees
                      .filter((emp) => emp.role === "HELPER" || emp.role === "PANI_HELPER" || emp.role === "WORKER")
                      .map((emp) => (
                        <option key={emp.id} value={emp.id}>
                          {emp.name} ({emp.role})
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Total Helper Headcount (Pani + General)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={helperCount}
                    onChange={(e) => setHelperCount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    Trolly Worker Headcount
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={trollyWorkerCount}
                    onChange={(e) => setTrollyWorkerCount(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: Setup Tools Management */}
          {activeTab === "tools" && (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Informational Guidance on Trolly Types */}
              <div className="p-3 bg-purple-500/10 border border-purple-500/25 rounded-2xl text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-purple-200">
                <div className="flex items-center gap-2">
                  <Wrench className="w-4 h-4 text-purple-400 shrink-0" />
                  <span><strong>2-Wheel Trolly (Cart):</strong> Allocated here under Tools at <strong>₹200 / trolly</strong>.</span>
                </div>
                <span className="text-[11px] text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded-lg border border-slate-800">
                  1-Wheel Trolly only goes with Bench in <strong>Tab 2 (Work Specs)</strong>
                </span>
              </div>

              {/* Add Tool Selector Bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 p-3 bg-slate-950 border border-slate-800 rounded-2xl">
                <div className="flex-1">
                  <select
                    value={selectedNewToolId}
                    onChange={(e) => setSelectedNewToolId(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="">Select tool from inventory...</option>
                    {tools.map((t) => {
                      const is1Wheel = t.name.toLowerCase().includes("1-wheel");
                      const is2Wheel = t.name.toLowerCase().includes("2-wheel");
                      return (
                        <option key={t.id} value={t.id} disabled={is1Wheel}>
                          {t.name} {is1Wheel ? "— [Configured in Tab 2 with Bench]" : is2Wheel ? "(Rent: ₹200 / trolly)" : `(Rent: ₹${Number(t.dailyRate || 0)})`}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-bold">Qty:</span>
                  <input
                    type="number"
                    min="1"
                    value={newToolQty}
                    onChange={(e) => setNewToolQty(Math.max(1, Number(e.target.value)))}
                    className="w-16 bg-slate-900 border border-slate-700 rounded-xl px-2 py-2 text-xs text-white text-center focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={handleAddTool}
                    disabled={!selectedNewToolId}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 text-xs font-bold rounded-xl flex items-center gap-1.5 shadow transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Tool
                  </button>
                </div>
              </div>

              {/* Tools List */}
              {assignedTools.length === 0 ? (
                <div className="text-center py-10 border border-dashed border-slate-800 rounded-2xl text-slate-500 text-xs">
                  No tools currently assigned to this dispatch. Use the bar above to add tools.
                </div>
              ) : (
                <div className="space-y-2">
                  {assignedTools.map((tool) => (
                    <div
                      key={tool.toolId}
                      className="flex items-center justify-between p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl hover:border-slate-700 transition-colors"
                    >
                      <div>
                        <div className="font-bold text-sm text-white flex items-center gap-2">
                          <Wrench className="w-4 h-4 text-amber-500" />
                          {tool.toolName}
                          {tool.toolName.toLowerCase().includes("2-wheel") && (
                            <span className="text-[10px] bg-purple-500/15 text-purple-300 font-bold px-2 py-0.5 rounded border border-purple-500/30">
                              ₹200 / trolly (Rent: ₹{tool.quantity * 200})
                            </span>
                          )}
                        </div>
                        {tool.variant && (
                          <span className="text-[10px] text-slate-500 font-medium uppercase">
                            Variant: {tool.variant}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex items-center border border-slate-800 rounded-lg overflow-hidden bg-slate-900">
                          <button
                            type="button"
                            onClick={() => handleUpdateToolQty(tool.toolId, -1)}
                            className="px-2.5 py-1 text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-bold transition-colors"
                          >
                            -
                          </button>
                          <span className="px-3 py-1 text-xs font-bold text-white min-w-[28px] text-center">
                            {tool.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateToolQty(tool.toolId, 1)}
                            className="px-2.5 py-1 text-slate-400 hover:text-white hover:bg-slate-800 text-xs font-bold transition-colors"
                          >
                            +
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRemoveTool(tool.toolId)}
                          className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                          title="Remove Tool"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Footer Controls */}
          <div className="border-t border-slate-800 pt-4 flex items-center justify-between">
            <div className="text-xs text-slate-500">
              Last modified: {dispatch.updatedAt ? new Date(dispatch.updatedAt).toLocaleTimeString() : "N/A"}
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={onClose}
                disabled={isPending}
                className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all"
              >
                {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
                Save Dispatch Changes
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
