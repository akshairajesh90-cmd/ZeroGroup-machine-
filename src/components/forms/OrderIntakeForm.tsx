"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase, Plus, X, ChevronRight, ChevronLeft, Truck, Users, Wrench,
  Zap, Flame, Layers, User, Phone, MapPin, Calendar, AlertTriangle,
  CheckCircle2, UserPlus, ArrowRight, Info,
} from "lucide-react";
import { createOrderWithAssets, createNewCustomer } from "@/actions/orders";
import { CrewRole } from "@prisma/client";
import {
  calculateLiftOperatorWage,
  COMPANY_WORKER_ROLE_WAGES,
  OUTSIDE_WORKER_FLAT_WAGE,
  getDefaultWorkerWage,
} from "@/lib/pricingEngine";

// ─────────────────────────────────────────────────────────────────────────────
// TYPES (serialized from server — no Decimal, no Date objects)
// ─────────────────────────────────────────────────────────────────────────────
type Customer = { id: string; name: string; phone: string; address: string };
type Machine = { id: string; machineId: string; type: string; status: string; operatorDailyPayout: number };
type Employee = {
  id: string;
  name: string;
  role: string;
  operatorType?: "INTERNAL" | "SUBCONTRACTOR" | string;
  capableRoles: string[];
  defaultCrewRole: string | null;
  baseDailyWage: number | null;
  phone: string | null;
  roleRates?: { crewRole: string; wagePerDay: number }[];
};
type Tool = { id: string; toolId: string; name: string; toolType: string | null; totalInventory: number };

type Props = {
  customers: Customer[];
  machines: Machine[];
  employees: Employee[];
  tools: Tool[];
};

type CrewAssignment = { employeeId: string; role: CrewRole; lockedWageRate: number };
type ExternalHelper = { name: string; headCount: number; lumpSumWage: number; notes: string };
type ToolItem = { toolId: string; quantity: number; variant?: string };

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────────────────
const MACHINE_TYPE_LABELS: Record<string, string> = {
  MIXER: "Mixing Machine",
  LIFT: "Lift",
  VIBRATOR: "Vibrator",
  PANI: "Pani Machine",
  INDEPENDENT: "Independent (Labor Only)",
};

const CREW_ROLE_OPTIONS: { value: CrewRole; label: string; requiresSkill: boolean; compatibleMachines?: string[] }[] = [
  { value: "MIXER_OPERATOR" as CrewRole, label: "Mixer Operator", requiresSkill: false, compatibleMachines: ["MIXER"] },
  { value: "HYDRAULIC_OPERATOR" as CrewRole, label: "Hydraulic Operator", requiresSkill: true, compatibleMachines: ["MIXER"] },
  { value: "LIFT_OPERATOR" as CrewRole, label: "Lift Operator", requiresSkill: true, compatibleMachines: ["LIFT"] },
  { value: "TROLLY_1_WHEEL" as CrewRole, label: "1-Wheel Trolly Operator", requiresSkill: true, compatibleMachines: ["MIXER", "LIFT"] },
  { value: "TROLLY_2_WHEEL" as CrewRole, label: "2-Wheel Trolly (No tag needed)", requiresSkill: false },
  { value: "P_VIBRATOR" as CrewRole, label: "Petrol Vibrator Operator", requiresSkill: false },
  { value: "VIBRATOR_OPERATOR" as CrewRole, label: "Electric Vibrator Helper", requiresSkill: false },
  { value: "SUB_LEADER" as CrewRole, label: "Sub-Leader / Site Leader", requiresSkill: false },
  { value: "PANI_HELPER" as CrewRole, label: "General Helper", requiresSkill: false },
  { value: "WORKER_LEADER" as CrewRole, label: "Worker Leader", requiresSkill: false },
  { value: "DRIVER" as CrewRole, label: "Driver", requiresSkill: false },
];

const WIRE_RENTAL_DEFAULT = 200; // Auto-applied for electric vibrators

// ─────────────────────────────────────────────────────────────────────────────
// STEP INDICATOR
// ─────────────────────────────────────────────────────────────────────────────
function StepDot({ step, current, label }: { step: number; current: number; label: string }) {
  const done = current > step;
  const active = current === step;
  return (
    <div className="flex flex-col items-center gap-1">
      <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold transition-all
        ${done ? "bg-emerald-500 text-white" : active ? "bg-indigo-500 text-white ring-4 ring-indigo-500/20" : "bg-zinc-800 text-zinc-500"}`}>
        {done ? <CheckCircle2 className="h-4 w-4" /> : step}
      </div>
      <span className={`text-[10px] font-semibold uppercase tracking-wider ${active ? "text-indigo-400" : done ? "text-emerald-400" : "text-zinc-600"}`}>
        {label}
      </span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// NEW CUSTOMER INLINE MODAL
// ─────────────────────────────────────────────────────────────────────────────
function NewCustomerModal({ onClose, onCreated }: { onClose: () => void; onCreated: (c: Customer) => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [isPending, startTransition] = useTransition();
  const [err, setErr] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    startTransition(async () => {
      const res = await createNewCustomer({ name, phone, address });
      if (res.success && res.customer) {
        onCreated(res.customer as Customer);
      } else {
        setErr(res.error || "Failed to create customer");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-md bg-zinc-900 border border-zinc-700 rounded-2xl shadow-2xl p-6 max-h-[90dvh] overflow-y-auto overscroll-contain animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-emerald-400" /> New Customer
          </h3>
          <button onClick={onClose} className="text-zinc-500 hover:text-white transition-colors"><X className="h-5 w-5" /></button>
        </div>
        {err && <p className="mb-4 text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-3">{err}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Customer / Site Name *</label>
            <input required value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Rajan Construction"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Phone *</label>
            <input required value={phone} onChange={e => setPhone(e.target.value)} placeholder="9XXXXXXXXX"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5">Address / Site Location</label>
            <input value={address} onChange={e => setAddress(e.target.value)} placeholder="Optional"
              className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500" />
          </div>
          <div className="flex gap-3 pt-2">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-sm font-medium text-zinc-400 hover:text-white transition-colors">Cancel</button>
            <button type="submit" disabled={isPending}
              className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-sm font-bold text-white hover:bg-emerald-400 disabled:opacity-60 transition-colors">
              {isPending ? "Saving..." : "Create Customer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN FORM
// ─────────────────────────────────────────────────────────────────────────────
export default function OrderIntakeForm({ customers: initialCustomers, machines, employees, tools }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);

  // Mutable local customers list (grows when staff creates inline)
  const [localCustomers, setLocalCustomers] = useState<Customer[]>(initialCustomers);

  // ── Step 1: Job Basics ───────────────────────────────────────────────────
  const [customerId, setCustomerId] = useState("");
  const [location, setLocation] = useState("");
  const [dateOfService, setDateOfService] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [mapLink, setMapLink] = useState("");

  // ── Step 2: Machines & Vibrators ────────────────────────────────────────
  const [primaryMachineId, setPrimaryMachineId] = useState("");
  const [secondaryMachineIds, setSecondaryMachineIds] = useState<string[]>([]);
  const [liftFloors, setLiftFloors] = useState(1);
  const [mixerCategory, setMixerCategory] = useState<"STANDARD" | "HYDRAULIC">("STANDARD");
  const [hasTrollyBench, setHasTrollyBench] = useState(false);
  const [vibratorType, setVibratorType] = useState<"PETROL" | "ELECTRIC" | "">("");
  const [wireRentalSurcharge, setWireRentalSurcharge] = useState(0);

  // ── Step 3: Crew ────────────────────────────────────────────────────────
  const [driverId, setDriverId] = useState("");
  const [publicTransportUsed, setPublicTransportUsed] = useState(false);
  const [crewAssignments, setCrewAssignments] = useState<CrewAssignment[]>([]);
  const [externalSubLeaderName, setExternalSubLeaderName] = useState("");
  const [externalHelpers, setExternalHelpers] = useState<ExternalHelper[]>([]);

  // ── Step 4: Tools ────────────────────────────────────────────────────────
  const [toolItems, setToolItems] = useState<ToolItem[]>([]);

  // ────────────────────────────────────────────────────────────────────────
  const primaryMachine = machines.find((m) => m.id === primaryMachineId);
  const primaryMachineType = primaryMachine?.type ?? "";

  const drivers = employees.filter((e) => e.role === "DRIVER");

  // Auto-apply wire surcharge when electric vibrator is selected
  const handleVibratorChange = (val: "PETROL" | "ELECTRIC" | "") => {
    setVibratorType(val);
    setWireRentalSurcharge(val === "ELECTRIC" ? WIRE_RENTAL_DEFAULT : 0);
  };

  const toggleSecondaryMachine = (id: string) => {
    setSecondaryMachineIds((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  // Crew helpers
  const addCrewMember = () => {
    setCrewAssignments((prev) => [
      ...prev,
      { employeeId: "", role: "MIXER_OPERATOR" as CrewRole, lockedWageRate: 0 },
    ]);
  };

  const getCrewWage = (empId: string, role: CrewRole, floors: number) => {
    const emp = employees.find((e) => e.id === empId);
    if (!emp) return 0;
    const isSubcontractor = emp.operatorType === "SUBCONTRACTOR";
    const explicitRate = emp.roleRates?.find((rr) => rr.crewRole === role)?.wagePerDay;

    let baseWage: number;
    if (explicitRate != null) {
      baseWage = Number(explicitRate);
    } else if (isSubcontractor) {
      baseWage = Number(emp.baseDailyWage ?? OUTSIDE_WORKER_FLAT_WAGE);
    } else {
      baseWage = Number(COMPANY_WORKER_ROLE_WAGES[role] ?? emp.baseDailyWage ?? 1100);
    }

    if (role === "LIFT_OPERATOR") {
      return calculateLiftOperatorWage(baseWage, floors);
    }
    return baseWage;
  };

  const updateCrew = (idx: number, field: keyof CrewAssignment, value: string | number) => {
    setCrewAssignments((prev) => {
      const next = [...prev];
      next[idx] = { ...next[idx], [field]: value } as CrewAssignment;
      // Auto-fill wage when employee or role changes
      if (field === "employeeId" || field === "role") {
        const empId = field === "employeeId" ? (value as string) : next[idx].employeeId;
        const role = field === "role" ? (value as CrewRole) : next[idx].role;
        if (empId) {
          next[idx].lockedWageRate = getCrewWage(empId, role, liftFloors);
        }
      }
      return next;
    });
  };

  const handleLiftFloorsChange = (floors: number) => {
    const validFloors = Math.max(1, floors);
    setLiftFloors(validFloors);
    setCrewAssignments((prev) =>
      prev.map((a) => {
        if (a.role === "LIFT_OPERATOR" && a.employeeId) {
          return { ...a, lockedWageRate: getCrewWage(a.employeeId, a.role, validFloors) };
        }
        return a;
      })
    );
  };

  const removeCrew = (idx: number) =>
    setCrewAssignments((prev) => prev.filter((_, i) => i !== idx));

  // External helper helpers
  const addExternalHelper = () =>
    setExternalHelpers((prev) => [...prev, { name: "", headCount: 1, lumpSumWage: 0, notes: "" }]);

  const updateExternal = (idx: number, field: keyof ExternalHelper, value: string | number) =>
    setExternalHelpers((prev) => {
      const next = [...prev];
      (next[idx] as any)[field] = value;
      return next;
    });

  const removeExternal = (idx: number) =>
    setExternalHelpers((prev) => prev.filter((_, i) => i !== idx));

  // Tool helpers
  const handleToolQty = (toolId: string, qty: number) => {
    setToolItems((prev) => {
      if (qty <= 0) return prev.filter((t) => t.toolId !== toolId);
      const existing = prev.find((t) => t.toolId === toolId);
      if (existing) return prev.map((t) => (t.toolId === toolId ? { ...t, quantity: qty } : t));
      return [...prev, { toolId, quantity: qty }];
    });
  };

  const getToolQty = (toolId: string) => toolItems.find((t) => t.toolId === toolId)?.quantity ?? 0;

  // ── Skill mismatch warning (live, before submit) ─────────────────────────
  const getSkillWarning = (assignment: CrewAssignment): string | null => {
    if (!assignment.employeeId) return null;
    const roleInfo = CREW_ROLE_OPTIONS.find((r) => r.value === assignment.role);
    if (!roleInfo?.requiresSkill) return null;
    const emp = employees.find((e) => e.id === assignment.employeeId);
    if (!emp) return null;
    if (!emp.capableRoles.includes(assignment.role)) {
      return `${emp.name} does not hold the "${roleInfo.label}" skill tag.`;
    }
    return null;
  };

  // ── Step validation ──────────────────────────────────────────────────────
  const canProceedStep1 = customerId && location && dateOfService;
  const canProceedStep2 = true; // Machines optional (labor-only is valid)
  const canProceedStep3 = true; // Crew optional
  const hasSkillViolation = crewAssignments.some((a) => getSkillWarning(a) !== null);

  // ── Submit ───────────────────────────────────────────────────────────────
  const handleSubmit = () => {
    setError(null);
    if (hasSkillViolation) {
      setError("Fix skill tag violations before submitting.");
      return;
    }
    startTransition(async () => {
      const res = await createOrderWithAssets({
        customerId,
        location,
        dateOfService,
        notes,
        mapLink,
        primaryMachineId: primaryMachineId || null,
        secondaryMachineIds,
        liftFloors,
        mixerCategory,
        hasTrollyBench,
        vibratorType: (vibratorType || null) as any,
        wireRentalSurcharge,
        driverId: driverId || null,
        publicTransportUsed,
        crewAssignments,
        externalSubLeaderName,
        externalHelpers,
        toolItems,
      });

      if (res.success) {
        router.push("/staff/dispatch");
      } else {
        setError(res.error || "Failed to create order.");
        setStep(1); // jump back to start so user sees error in context
      }
    });
  };

  // ────────────────────────────────────────────────────────────────────────
  // RENDER
  // ────────────────────────────────────────────────────────────────────────
  return (
    <>
      {showNewCustomerModal && (
        <NewCustomerModal
          onClose={() => setShowNewCustomerModal(false)}
          onCreated={(c) => {
            setLocalCustomers((prev) => [c, ...prev]);
            setCustomerId(c.id);
            setShowNewCustomerModal(false);
          }}
        />
      )}

      <div className="max-w-3xl mx-auto">
        {/* ── Header ── */}
        <div className="mb-8">
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Briefcase className="h-5 w-5 text-white" />
            </div>
            New Customer Order
          </h1>
          <p className="text-zinc-500 text-sm mt-1.5">Fill in all job details, assign crew and equipment, then submit.</p>
        </div>

        {/* ── Step Indicators ── */}
        <div className="flex items-center justify-between mb-8 px-2">
          <StepDot step={1} current={step} label="Job" />
          <div className={`flex-1 h-px mx-2 ${step > 1 ? "bg-emerald-500/40" : "bg-zinc-800"}`} />
          <StepDot step={2} current={step} label="Machines" />
          <div className={`flex-1 h-px mx-2 ${step > 2 ? "bg-emerald-500/40" : "bg-zinc-800"}`} />
          <StepDot step={3} current={step} label="Crew" />
          <div className={`flex-1 h-px mx-2 ${step > 3 ? "bg-emerald-500/40" : "bg-zinc-800"}`} />
          <StepDot step={4} current={step} label="Tools" />
          <div className={`flex-1 h-px mx-2 ${step > 4 ? "bg-emerald-500/40" : "bg-zinc-800"}`} />
          <StepDot step={5} current={step} label="Review" />
        </div>

        {/* ── Error Banner ── */}
        {error && (
          <div className="mb-6 flex items-start gap-3 bg-rose-500/10 border border-rose-500/30 rounded-2xl px-5 py-4">
            <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
            <p className="text-sm text-rose-300 font-medium">{error}</p>
          </div>
        )}

        <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 shadow-xl">

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* STEP 1: JOB BASICS */}
          {/* ══════════════════════════════════════════════════════════════ */}
          {step === 1 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
              <h2 className="text-base font-bold text-white border-b border-zinc-800 pb-3 flex items-center gap-2">
                <MapPin className="h-4 w-4 text-emerald-400" /> Job Site & Details
              </h2>

              {/* Customer */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Customer *</label>
                <div className="flex gap-2">
                  <select
                    required value={customerId} onChange={(e) => setCustomerId(e.target.value)}
                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500">
                    <option value="">Select existing customer...</option>
                    {localCustomers.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} — {c.phone}</option>
                    ))}
                  </select>
                  <button type="button" onClick={() => setShowNewCustomerModal(true)}
                    className="shrink-0 flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20 transition-colors text-sm font-semibold">
                    <Plus className="h-4 w-4" /> New
                  </button>
                </div>
              </div>

              {/* Date */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">
                  <Calendar className="inline h-3.5 w-3.5 mr-1" />Date of Service *
                </label>
                <input type="date" required value={dateOfService} onChange={(e) => setDateOfService(e.target.value)}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500" />
              </div>

              {/* Location */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Site Location *</label>
                <input type="text" required value={location} onChange={(e) => setLocation(e.target.value)}
                  placeholder="e.g. Kakkanad, Near Metro Station"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500" />
              </div>

              {/* Map Link */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Google Maps Link (Optional)</label>
                <input type="url" value={mapLink} onChange={(e) => setMapLink(e.target.value)}
                  placeholder="https://maps.google.com/..."
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500" />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Job Notes (Optional)</label>
                <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
                  placeholder="Special instructions, site contact, access code..."
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 resize-none" />
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* STEP 2: MACHINES & ACCESSORIES */}
          {/* ══════════════════════════════════════════════════════════════ */}
          {step === 2 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
              <h2 className="text-base font-bold text-white border-b border-zinc-800 pb-3 flex items-center gap-2">
                <Truck className="h-4 w-4 text-indigo-400" /> Machine & Equipment
              </h2>

              <div className="bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-4 py-3 flex items-start gap-2">
                <Info className="h-4 w-4 text-zinc-500 mt-0.5 shrink-0" />
                <p className="text-xs text-zinc-500">Leave "No Machine" selected for <strong className="text-zinc-400">Labor-Only</strong> orders (helpers only, no equipment).</p>
              </div>

              {/* Primary Machine */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Primary Machine</label>
                <select value={primaryMachineId} onChange={(e) => { setPrimaryMachineId(e.target.value); setSecondaryMachineIds([]); }}
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40 focus:border-indigo-500">
                  <option value="">No Machine (Labor Only)</option>
                  {machines.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.machineId} — {MACHINE_TYPE_LABELS[m.type] || m.type}
                    </option>
                  ))}
                </select>
              </div>

              {/* Machine-specific fields */}
              {primaryMachineType === "LIFT" && (
                <div className="bg-indigo-500/10 border border-indigo-500/20 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5"><Layers className="h-3.5 w-3.5" /> Lift Configuration</p>
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 mb-1.5">Number of Floors</label>
                    <input type="number" min={1} max={30} value={liftFloors} onChange={(e) => handleLiftFloorsChange(parseInt(e.target.value) || 1)}
                      className="w-32 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/40" />
                  </div>
                  <p className="text-xs text-zinc-500">⚠ Only operators with the <strong className="text-indigo-400">Lift Operator</strong> skill tag can be assigned below.</p>
                </div>
              )}

              {primaryMachineType === "MIXER" && (
                <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 space-y-3">
                  <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">Mixer Category</p>
                  <div className="flex gap-3">
                    {(["STANDARD", "HYDRAULIC"] as const).map((cat) => (
                      <label key={cat} className={`flex-1 flex items-center gap-2 cursor-pointer border rounded-xl px-4 py-2.5 transition-all text-sm font-medium
                        ${mixerCategory === cat ? "bg-amber-500/20 border-amber-500 text-amber-300" : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600"}`}>
                        <input type="radio" name="mixerCategory" value={cat} checked={mixerCategory === cat} onChange={() => setMixerCategory(cat)} className="hidden" />
                        {cat === "STANDARD" ? "Standard Mixer" : "Hydraulic Machine"}
                      </label>
                    ))}
                  </div>
                  {mixerCategory === "HYDRAULIC" && (
                    <p className="text-xs text-zinc-500">⚠ Only operators with the <strong className="text-amber-400">Hydraulic Operator</strong> skill tag can be assigned below.</p>
                  )}
                </div>
              )}

              {/* Trolly & Bench */}
              {primaryMachineId && (
                <label className="flex items-center gap-3 cursor-pointer bg-zinc-800/50 border border-zinc-700/50 rounded-xl px-4 py-3 hover:border-zinc-600 transition-colors">
                  <input type="checkbox" checked={hasTrollyBench} onChange={(e) => setHasTrollyBench(e.target.checked)}
                    className="h-4 w-4 rounded border-zinc-600 text-emerald-500 focus:ring-emerald-500 bg-zinc-800" />
                  <div>
                    <p className="text-sm font-medium text-zinc-200">Include Trolly Bench</p>
                    <p className="text-xs text-zinc-500">Requires a 1-Wheel Trolly operator with skill tag.</p>
                  </div>
                </label>
              )}

              {/* Vibrators */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Vibrator (Optional)</label>
                <div className="flex gap-3">
                  {(["", "PETROL", "ELECTRIC"] as const).map((v) => (
                    <label key={v} className={`flex-1 flex items-center justify-center gap-2 cursor-pointer border rounded-xl px-3 py-2.5 transition-all text-sm font-medium
                      ${vibratorType === v ? (v === "ELECTRIC" ? "bg-yellow-500/20 border-yellow-500 text-yellow-300" : v === "PETROL" ? "bg-orange-500/20 border-orange-500 text-orange-300" : "bg-zinc-700 border-zinc-500 text-zinc-300") : "bg-zinc-800 border-zinc-700 text-zinc-500 hover:border-zinc-600"}`}>
                      <input type="radio" name="vibratorType" value={v} checked={vibratorType === v} onChange={() => handleVibratorChange(v)} className="hidden" />
                      {v === "" ? "None" : v === "PETROL" ? <><Flame className="h-3.5 w-3.5" /> Petrol</> : <><Zap className="h-3.5 w-3.5" /> Electric</>}
                    </label>
                  ))}
                </div>
                {vibratorType === "ELECTRIC" && (
                  <div className="mt-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-3 flex items-center justify-between">
                    <p className="text-xs text-yellow-400 font-medium flex items-center gap-1.5"><Zap className="h-3.5 w-3.5" /> Wire Rental Surcharge Auto-Applied</p>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-zinc-500">₹</span>
                      <input type="number" min={0} value={wireRentalSurcharge} onChange={(e) => setWireRentalSurcharge(parseInt(e.target.value) || 0)}
                        className="w-20 bg-zinc-800 border border-zinc-700 rounded-lg px-2 py-1 text-sm text-white text-right focus:outline-none focus:ring-1 focus:ring-yellow-500" />
                    </div>
                  </div>
                )}
              </div>

              {/* Secondary machines */}
              {machines.filter((m) => m.id !== primaryMachineId).length > 0 && primaryMachineId && (
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Additional Machines (Optional)</label>
                  <div className="grid grid-cols-2 gap-2">
                    {machines.filter((m) => m.id !== primaryMachineId).map((m) => (
                      <label key={m.id} className={`flex items-center gap-2 cursor-pointer border rounded-xl px-3 py-2.5 transition-all text-sm
                        ${secondaryMachineIds.includes(m.id) ? "bg-indigo-500/10 border-indigo-500/40 text-indigo-300" : "bg-zinc-800 border-zinc-700 text-zinc-400 hover:border-zinc-600"}`}>
                        <input type="checkbox" checked={secondaryMachineIds.includes(m.id)} onChange={() => toggleSecondaryMachine(m.id)} className="hidden" />
                        <CheckCircle2 className={`h-4 w-4 shrink-0 ${secondaryMachineIds.includes(m.id) ? "text-indigo-400" : "text-zinc-700"}`} />
                        <span>{m.machineId} <span className="text-zinc-600">({MACHINE_TYPE_LABELS[m.type] || m.type})</span></span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* STEP 3: CREW ALLOCATION */}
          {/* ══════════════════════════════════════════════════════════════ */}
          {step === 3 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
              <h2 className="text-base font-bold text-white border-b border-zinc-800 pb-3 flex items-center gap-2">
                <Users className="h-4 w-4 text-purple-400" /> Crew Assignment
              </h2>

              {/* Driver */}
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Driver</label>
                <div className="flex gap-3">
                  <select value={driverId} onChange={(e) => setDriverId(e.target.value)}
                    disabled={publicTransportUsed}
                    className="flex-1 bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/40 focus:border-purple-500 disabled:opacity-40">
                    <option value="">Unassigned</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                  <label className="flex items-center gap-2 cursor-pointer bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-zinc-400 hover:border-zinc-600 transition-colors">
                    <input type="checkbox" checked={publicTransportUsed} onChange={(e) => { setPublicTransportUsed(e.target.checked); if (e.target.checked) setDriverId(""); }}
                      className="rounded border-zinc-600 text-purple-500 bg-zinc-700 focus:ring-purple-500" />
                    Public Transport
                  </label>
                </div>
              </div>

              {/* Internal Crew */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Company Operators & Workers</label>
                  <button type="button" onClick={addCrewMember}
                    className="flex items-center gap-1.5 text-xs font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-1.5 hover:bg-emerald-500/20 transition-colors">
                    <Plus className="h-3.5 w-3.5" /> Add
                  </button>
                </div>

                {crewAssignments.length === 0 && (
                  <p className="text-sm text-zinc-600 italic py-3 text-center border border-dashed border-zinc-800 rounded-xl">No crew assigned yet. Click Add.</p>
                )}

                <div className="space-y-3">
                  {crewAssignments.map((crew, idx) => {
                    const warning = getSkillWarning(crew);
                    const availableEmployees = employees.filter((e) => e.role !== "DRIVER");
                    return (
                      <div key={idx} className={`border rounded-xl p-3 space-y-2 transition-all ${warning ? "border-rose-500/40 bg-rose-500/5" : "border-zinc-700 bg-zinc-800/50"}`}>
                        <div className="flex gap-2">
                          <select value={crew.employeeId} onChange={(e) => updateCrew(idx, "employeeId", e.target.value)}
                            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500">
                            {availableEmployees.map((e) => {
                              const isSub = e.operatorType === "SUBCONTRACTOR";
                              const typePrefix = isSub ? "🌐 [Outside]" : "🏢 [Company]";
                              const rateHint = isSub
                                ? `Flat ₹${e.baseDailyWage || OUTSIDE_WORKER_FLAT_WAGE}/d`
                                : `Role rates`;
                              return (
                                <option key={e.id} value={e.id}>
                                  {typePrefix} {e.name} ({e.role}) — {rateHint}
                                </option>
                              );
                            })}
                          </select>
                          <button type="button" onClick={() => removeCrew(idx)} className="shrink-0 text-zinc-600 hover:text-rose-400 transition-colors px-2">
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                        <div className="flex gap-2">
                          <select value={crew.role} onChange={(e) => updateCrew(idx, "role", e.target.value)}
                            className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-emerald-500">
                            {CREW_ROLE_OPTIONS.map((r) => (
                              <option key={r.value} value={r.value}>
                                {r.requiresSkill ? "🔒 " : ""}{r.label}
                              </option>
                            ))}
                          </select>
                          <div className="flex items-center gap-1.5 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 min-w-[100px]">
                            <span className="text-xs text-zinc-500">₹</span>
                            <input type="number" min={0} value={crew.lockedWageRate}
                              onChange={(e) => updateCrew(idx, "lockedWageRate", parseInt(e.target.value) || 0)}
                              className="flex-1 bg-transparent text-sm text-white w-full focus:outline-none" placeholder="Wage" />
                          </div>
                        </div>
                        {crew.role === "LIFT_OPERATOR" && (
                          <p className="text-[11px] text-amber-300 font-semibold bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                            🏗️ Lift Floor {liftFloors}: Base + ₹{Math.max(0, liftFloors - 1) * 100} (+₹100/extra floor)
                          </p>
                        )}
                        {warning && (
                          <div className="flex items-center gap-2 text-xs text-rose-400 font-medium">
                            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                            {warning}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* External Sub-Leader */}
              <div className="pt-2 border-t border-zinc-800">
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">External Sub-Leader / Outside Operator (Optional)</label>
                <input type="text" value={externalSubLeaderName} onChange={(e) => setExternalSubLeaderName(e.target.value)}
                  placeholder="Name of the outside sub-operator called by crew leader"
                  className="w-full bg-zinc-800 border border-zinc-700 rounded-xl px-4 py-2.5 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-purple-500/40" />
                <p className="mt-1.5 text-xs text-zinc-600">This flags the dispatch for an external payment log in Expenses.</p>
              </div>

              {/* External Helpers */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Outside Helpers / Labor Groups</label>
                  <button type="button" onClick={addExternalHelper}
                    className="flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-1.5 hover:bg-amber-500/20 transition-colors">
                    <Plus className="h-3.5 w-3.5" /> Add Group
                  </button>
                </div>
                <div className="space-y-3">
                  {externalHelpers.map((h, idx) => (
                    <div key={idx} className="border border-amber-500/20 bg-amber-500/5 rounded-xl p-3 space-y-2">
                      <div className="flex gap-2">
                        <input type="text" placeholder="Helper / Group Name" value={h.name} onChange={(e) => updateExternal(idx, "name", e.target.value)}
                          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-500" />
                        <button type="button" onClick={() => removeExternal(idx)} className="shrink-0 text-zinc-600 hover:text-rose-400 transition-colors px-2"><X className="h-4 w-4" /></button>
                      </div>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">Head Count</label>
                          <input type="number" min={1} value={h.headCount} onChange={(e) => updateExternal(idx, "headCount", parseInt(e.target.value) || 1)}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500" />
                        </div>
                        <div className="flex-1">
                          <label className="text-[10px] text-zinc-500 uppercase tracking-wider block mb-1">Lump Sum Wage (₹)</label>
                          <input type="number" min={0} value={h.lumpSumWage} onChange={(e) => updateExternal(idx, "lumpSumWage", parseInt(e.target.value) || 0)}
                            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-amber-500" />
                        </div>
                      </div>
                      <input type="text" placeholder="Notes (optional)" value={h.notes} onChange={(e) => updateExternal(idx, "notes", e.target.value)}
                        className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-600 focus:outline-none focus:ring-1 focus:ring-amber-500" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* STEP 4: TOOLS */}
          {/* ══════════════════════════════════════════════════════════════ */}
          {step === 4 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
              <h2 className="text-base font-bold text-white border-b border-zinc-800 pb-3 flex items-center gap-2">
                <Wrench className="h-4 w-4 text-teal-400" /> Tools & Equipment
              </h2>
              <div className="bg-teal-500/10 border border-teal-500/20 rounded-xl px-4 py-3 flex items-start gap-2">
                <Info className="h-4 w-4 text-teal-400 mt-0.5 shrink-0" />
                <p className="text-xs text-teal-300">Tools assigned here are tracked by serial. Staff will be prompted to confirm returns when the job is completed.</p>
              </div>
              {tools.length === 0 ? (
                <p className="text-sm text-zinc-600 italic text-center py-6">No tools currently available in yard.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {tools.map((tool) => {
                    const qty = getToolQty(tool.id);
                    return (
                      <div key={tool.id} className={`flex items-center justify-between border rounded-xl px-4 py-3 transition-all
                        ${qty > 0 ? "border-teal-500/40 bg-teal-500/5" : "border-zinc-700 bg-zinc-800/50 hover:border-zinc-600"}`}>
                        <div>
                          <p className="text-sm font-medium text-white">{tool.name}</p>
                          <p className="text-xs text-zinc-500">{tool.toolId} • Stock: {tool.totalInventory}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button type="button" onClick={() => handleToolQty(tool.id, Math.max(0, qty - 1))}
                            className="h-7 w-7 rounded-lg bg-zinc-700 text-white text-sm font-bold hover:bg-zinc-600 transition-colors flex items-center justify-center">−</button>
                          <span className={`w-6 text-center text-sm font-bold ${qty > 0 ? "text-teal-400" : "text-zinc-600"}`}>{qty}</span>
                          <button type="button" onClick={() => handleToolQty(tool.id, Math.min(tool.totalInventory, qty + 1))}
                            className="h-7 w-7 rounded-lg bg-zinc-700 text-white text-sm font-bold hover:bg-zinc-600 transition-colors flex items-center justify-center">+</button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ══════════════════════════════════════════════════════════════ */}
          {/* STEP 5: REVIEW & CONFIRM */}
          {/* ══════════════════════════════════════════════════════════════ */}
          {step === 5 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4 duration-300">
              <h2 className="text-base font-bold text-white border-b border-zinc-800 pb-3 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Review & Confirm
              </h2>

              <div className="space-y-3 text-sm">
                {/* Customer & Job */}
                <div className="bg-zinc-800/60 rounded-xl p-4 space-y-1.5">
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Job Details</p>
                  <p className="text-zinc-300"><span className="text-zinc-500 w-24 inline-block">Customer:</span> {localCustomers.find((c) => c.id === customerId)?.name || "—"}</p>
                  <p className="text-zinc-300"><span className="text-zinc-500 w-24 inline-block">Date:</span> {dateOfService}</p>
                  <p className="text-zinc-300"><span className="text-zinc-500 w-24 inline-block">Location:</span> {location}</p>
                  {notes && <p className="text-zinc-300"><span className="text-zinc-500 w-24 inline-block">Notes:</span> {notes}</p>}
                </div>

                {/* Machine */}
                <div className="bg-zinc-800/60 rounded-xl p-4 space-y-1.5">
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Equipment</p>
                  <p className="text-zinc-300"><span className="text-zinc-500 w-24 inline-block">Machine:</span> {primaryMachine ? `${primaryMachine.machineId} (${MACHINE_TYPE_LABELS[primaryMachine.type] || primaryMachine.type})` : "Labor Only"}</p>
                  {primaryMachineType === "LIFT" && <p className="text-zinc-300"><span className="text-zinc-500 w-24 inline-block">Floors:</span> {liftFloors}</p>}
                  {primaryMachineType === "MIXER" && <p className="text-zinc-300"><span className="text-zinc-500 w-24 inline-block">Category:</span> {mixerCategory}</p>}
                  {vibratorType && <p className="text-zinc-300"><span className="text-zinc-500 w-24 inline-block">Vibrator:</span> {vibratorType} {wireRentalSurcharge > 0 ? `(Wire ₹${wireRentalSurcharge})` : ""}</p>}
                  {hasTrollyBench && <p className="text-zinc-300"><span className="text-zinc-500 w-24 inline-block">Trolly:</span> With Bench</p>}
                  {secondaryMachineIds.length > 0 && <p className="text-zinc-300"><span className="text-zinc-500 w-24 inline-block">Secondary:</span> {secondaryMachineIds.length} additional machine(s)</p>}
                </div>

                {/* Crew */}
                <div className="bg-zinc-800/60 rounded-xl p-4 space-y-1.5">
                  <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Crew</p>
                  {driverId ? <p className="text-zinc-300"><span className="text-zinc-500 w-24 inline-block">Driver:</span> {employees.find((e) => e.id === driverId)?.name}</p> : publicTransportUsed ? <p className="text-zinc-500 text-xs">Public transport</p> : <p className="text-zinc-500 text-xs">No driver assigned</p>}
                  {crewAssignments.filter((a) => a.employeeId).map((a, i) => (
                    <p key={i} className="text-zinc-300"><span className="text-zinc-500 w-24 inline-block">{CREW_ROLE_OPTIONS.find((r) => r.value === a.role)?.label}:</span>{employees.find((e) => e.id === a.employeeId)?.name} <span className="text-zinc-600 text-xs">₹{a.lockedWageRate}/day</span></p>
                  ))}
                  {externalSubLeaderName && <p className="text-amber-400 text-xs">External sub-leader: {externalSubLeaderName}</p>}
                  {externalHelpers.filter((h) => h.name).map((h, i) => (
                    <p key={i} className="text-amber-400 text-xs">Outside helper group: {h.name} × {h.headCount} @ ₹{h.lumpSumWage}</p>
                  ))}
                </div>

                {/* Tools */}
                {toolItems.length > 0 && (
                  <div className="bg-zinc-800/60 rounded-xl p-4 space-y-1.5">
                    <p className="text-xs font-bold text-zinc-500 uppercase tracking-wider mb-2">Tools</p>
                    {toolItems.map((t, i) => (
                      <p key={i} className="text-zinc-300"><span className="text-zinc-500 w-24 inline-block">{tools.find((tool) => tool.id === t.toolId)?.name}:</span> × {t.quantity}</p>
                    ))}
                  </div>
                )}
              </div>

              {hasSkillViolation && (
                <div className="flex items-start gap-3 bg-rose-500/10 border border-rose-500/30 rounded-xl p-4">
                  <AlertTriangle className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
                  <p className="text-sm text-rose-300">There are skill tag violations in crew assignments. Go back to Step 3 to fix them before submitting.</p>
                </div>
              )}
            </div>
          )}

          {/* ── Navigation Buttons ── */}
          <div className="flex items-center justify-between mt-8 pt-5 border-t border-zinc-800">
            <button type="button"
              onClick={() => step === 1 ? router.back() : setStep(step - 1)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-sm font-medium text-zinc-400 hover:text-white hover:border-zinc-600 transition-all">
              <ChevronLeft className="h-4 w-4" />
              {step === 1 ? "Cancel" : "Back"}
            </button>

            {step < 5 ? (
              <button type="button"
                onClick={() => setStep(step + 1)}
                disabled={step === 1 && !canProceedStep1}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-500 text-sm font-bold text-white hover:bg-indigo-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all">
                Next <ChevronRight className="h-4 w-4" />
              </button>
            ) : (
              <button type="button"
                onClick={handleSubmit}
                disabled={isPending || hasSkillViolation}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 text-sm font-bold text-white hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-lg shadow-emerald-500/20">
                {isPending ? (
                  <><span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Booking...</>
                ) : (
                  <>Confirm & Book Job <ArrowRight className="h-4 w-4" /></>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
