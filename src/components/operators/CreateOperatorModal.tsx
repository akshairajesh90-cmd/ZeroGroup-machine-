"use client";

import React, { useState, useCallback, useTransition } from "react";
import { createOperator } from "@/actions/operator";
import {
  X,
  UserPlus,
  Phone,
  Lock,
  Shuffle,
  Copy,
  CheckCircle,
  ChevronDown,
  AlertCircle,
  User,
  Building2,
  Award,
  Check,
  DollarSign,
} from "lucide-react";
import { ALL_CREW_ROLES } from "./EditOperatorModal";
import {
  COMPANY_WORKER_ROLE_WAGES,
  OUTSIDE_WORKER_FLAT_WAGE,
  getDefaultWorkerWage,
} from "@/lib/pricingEngine";

const DEFAULT_ROLE_WAGES: Record<string, string> = {
  MIXER_OPERATOR: "1100",
  HYDRAULIC_OPERATOR: "1100",
  VIBRATOR_OPERATOR: "900",
  LIFT_OPERATOR: "1000",
  WORKER_LEADER: "1200",
  SUB_LEADER: "1100",
  DRIVER: "1000",
  HELPER: "750",
  PANI_HELPER: "700",
  TROLLY_1_WHEEL: "800",
  TROLLY_2_WHEEL: "850",
  P_VIBRATOR: "900",
};

interface CreateOperatorModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

type OperatorTypeValue = "INTERNAL" | "SUBCONTRACTOR";

interface SuccessCredentials {
  name: string;
  phone: string;
  rawPin: string;
}

export default function CreateOperatorModal({
  onClose,
  onSuccess,
}: CreateOperatorModalProps) {
  const [isPending, startTransition] = useTransition();

  // Form fields
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [operatorType, setOperatorType] = useState<OperatorTypeValue>("INTERNAL");
  const [capableRoles, setCapableRoles] = useState<string[]>(["MIXER_OPERATOR"]);
  const [defaultCrewRole, setDefaultCrewRole] = useState("MIXER_OPERATOR");
  const [roleRates, setRoleRates] = useState<Record<string, string>>({
    MIXER_OPERATOR: "1100",
  });
  const [isCrewLeader, setIsCrewLeader] = useState(false);
  const [contractorCoName, setContractorCoName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleOperatorTypeChange = (newType: OperatorTypeValue) => {
    setOperatorType(newType);
    setRoleRates((prev) => {
      const updated: Record<string, string> = {};
      capableRoles.forEach((roleId) => {
        if (newType === "SUBCONTRACTOR") {
          updated[roleId] = String(OUTSIDE_WORKER_FLAT_WAGE);
        } else {
          updated[roleId] = String(COMPANY_WORKER_ROLE_WAGES[roleId] ?? 1100);
        }
      });
      return updated;
    });
  };

  const toggleRole = (roleId: string) => {
    let next: string[];
    if (capableRoles.includes(roleId)) {
      if (capableRoles.length === 1) return;
      next = capableRoles.filter((r) => r !== roleId);
      if (defaultCrewRole === roleId) {
        setDefaultCrewRole(next[0] || "");
      }
    } else {
      next = [...capableRoles, roleId];
      if (!defaultCrewRole) {
        setDefaultCrewRole(roleId);
      }
      // Populate default wage based on worker type (Outside worker flat 1200 vs Company worker role rate)
      const defaultWage =
        operatorType === "SUBCONTRACTOR"
          ? String(OUTSIDE_WORKER_FLAT_WAGE)
          : String(COMPANY_WORKER_ROLE_WAGES[roleId] ?? 1100);

      setRoleRates((prev) => ({
        ...prev,
        [roleId]: prev[roleId] || defaultWage,
      }));
    }
    setCapableRoles(next);
  };

  // Success state
  const [credentials, setCredentials] = useState<SuccessCredentials | null>(null);
  const [copied, setCopied] = useState(false);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const formatPhoneDisplay = (raw: string) => {
    const digits = raw.replace(/\D/g, "").slice(0, 10);
    if (digits.length <= 5) return digits;
    return `${digits.slice(0, 5)} ${digits.slice(5)}`;
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatPhoneDisplay(e.target.value);
    setPhone(formatted);
  };

  const generatePin = useCallback(() => {
    const p = Math.floor(1000 + Math.random() * 9000).toString();
    setPin(p);
  }, []);

  const copyCredentials = () => {
    if (!credentials) return;
    const text = `Operator: ${credentials.name}\nPhone: ${credentials.phone}\nPIN: ${credentials.rawPin}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    });
  };

  // ── Form Submission ────────────────────────────────────────────────────────
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const rawPhone = phone.replace(/\D/g, "");
    if (rawPhone.length !== 10) {
      setError("Phone number must be exactly 10 digits.");
      return;
    }
    if (!/^\d{4}$/.test(pin)) {
      setError("PIN must be exactly 4 digits.");
      return;
    }
    if (!name.trim()) {
      setError("Full name is required.");
      return;
    }
    if (capableRoles.length === 0) {
      setError("Please select at least one role this operator can perform.");
      return;
    }

    const formattedRoleRates = capableRoles.map((rId) => ({
      crewRole: rId,
      wagePerDay: Number(roleRates[rId] || DEFAULT_ROLE_WAGES[rId] || 900),
    }));

    const primaryWage = Number(
      roleRates[defaultCrewRole] || formattedRoleRates[0]?.wagePerDay || 900
    );

    startTransition(async () => {
      const result = await createOperator({
        name: name.trim(),
        phone: rawPhone,
        pin,
        operatorType,
        isCrewLeader,
        defaultCrewRole: defaultCrewRole || capableRoles[0] || null,
        capableRoles,
        roleRates: formattedRoleRates,
        baseDailyWage: primaryWage,
        contractorCoName: operatorType === "SUBCONTRACTOR" ? contractorCoName : undefined,
      });

      if (!result.success) {
        setError(result.error ?? "Something went wrong.");
        return;
      }

      // Show success credential reveal
      if (result.credentials) {
        setCredentials(result.credentials);
      }
    });
  };

  // ── SUCCESS SCREEN ─────────────────────────────────────────────────────────
  if (credentials) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-3xl border border-emerald-500/30 bg-zinc-900 shadow-2xl shadow-emerald-500/10 overflow-hidden animate-in zoom-in-95 duration-200">
          {/* Green success header */}
          <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-6 py-8 text-center">
            <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-white/20">
              <CheckCircle className="h-9 w-9 text-white" />
            </div>
            <h2 className="text-xl font-black text-white">Operator Created!</h2>
            <p className="text-emerald-100 text-sm mt-1">
              Share these credentials with the field operator. This PIN will never be shown again.
            </p>
          </div>

          {/* Credentials card */}
          <div className="p-6 space-y-4">
            <div className="rounded-2xl border border-zinc-700 bg-zinc-800/60 p-5 space-y-3">
              <CredRow label="Operator Name" value={credentials.name} icon={<User className="h-4 w-4 text-zinc-400" />} />
              <CredRow label="Phone Number" value={credentials.phone} icon={<Phone className="h-4 w-4 text-zinc-400" />} />
              <div className="flex items-center justify-between rounded-xl bg-amber-500/10 border border-amber-500/30 px-4 py-3">
                <div className="flex items-center gap-3">
                  <Lock className="h-4 w-4 text-amber-400" />
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400/70">4-Digit PIN</p>
                    <p className="text-2xl font-black text-amber-300 tracking-[0.4em]">{credentials.rawPin}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Copy button */}
            <button
              onClick={copyCredentials}
              className={`w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 font-bold text-sm transition-all ${
                copied
                  ? "bg-emerald-600 text-white"
                  : "bg-zinc-700 hover:bg-zinc-600 text-white"
              }`}
            >
              {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              {copied ? "Copied to Clipboard!" : "Copy Credentials"}
            </button>

            <button
              onClick={() => {
                onSuccess();
                onClose();
              }}
              className="w-full rounded-2xl border border-zinc-700 py-3.5 text-sm font-bold text-zinc-300 hover:bg-zinc-800 transition-colors"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── FORM SCREEN ────────────────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-3xl border border-zinc-700 bg-zinc-900 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 shadow-lg">
              <UserPlus className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-black text-white">Add Field Operator</h2>
              <p className="text-xs text-zinc-500">Generates Phone + PIN login credentials</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-xl p-2 text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">

          {/* Error banner */}
          {error && (
            <div className="flex items-center gap-3 rounded-2xl border border-rose-500/30 bg-rose-500/10 px-4 py-3">
              <AlertCircle className="h-5 w-5 shrink-0 text-rose-400" />
              <p className="text-sm font-medium text-rose-300">{error}</p>
            </div>
          )}

          {/* Full Name */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Full Name *
            </label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Rajan Kumar"
                required
                className="w-full rounded-2xl border border-zinc-700 bg-zinc-800/60 pl-11 pr-4 py-3.5 text-sm text-white placeholder-zinc-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all"
              />
            </div>
          </div>

          {/* Phone Number */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Phone Number * <span className="text-zinc-600 normal-case">(10 digits)</span>
            </label>
            <div className="relative">
              <Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
              <span className="absolute left-11 top-1/2 -translate-y-1/2 text-sm font-bold text-zinc-500 select-none">
                +91
              </span>
              <input
                type="tel"
                inputMode="numeric"
                value={phone}
                onChange={handlePhoneChange}
                placeholder="98765 43210"
                required
                className="w-full rounded-2xl border border-zinc-700 bg-zinc-800/60 pl-24 pr-4 py-3.5 text-sm text-white placeholder-zinc-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all font-mono tracking-wide"
              />
            </div>
            <p className="text-[11px] text-zinc-600 pl-1">
              This becomes the login ID — must be unique.
            </p>
          </div>

          {/* Operator Type */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Worker Category *
              </label>
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                operatorType === "INTERNAL"
                  ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                  : "bg-violet-500/10 text-violet-300 border-violet-500/30"
              }`}>
                {operatorType === "INTERNAL" ? "🏢 Role-Specific Wages" : "🌐 Flat ₹1,200/Day Rate"}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleOperatorTypeChange("INTERNAL")}
                className={`flex items-center gap-2.5 p-3 rounded-2xl border text-left transition-all ${
                  operatorType === "INTERNAL"
                    ? "bg-emerald-500/15 border-emerald-500 text-white ring-1 ring-emerald-500/30 shadow-lg shadow-emerald-500/10"
                    : "bg-zinc-800/60 border-zinc-700/60 text-zinc-400 hover:border-zinc-600"
                }`}
              >
                <div className={`p-2 rounded-xl ${operatorType === "INTERNAL" ? "bg-emerald-500/20 text-emerald-300" : "bg-zinc-800 text-zinc-500"}`}>
                  <Building2 className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-black text-white">Company Worker</p>
                  <p className="text-[10px] text-zinc-400">Role-specific daily rates</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleOperatorTypeChange("SUBCONTRACTOR")}
                className={`flex items-center gap-2.5 p-3 rounded-2xl border text-left transition-all ${
                  operatorType === "SUBCONTRACTOR"
                    ? "bg-violet-500/15 border-violet-500 text-white ring-1 ring-violet-500/30 shadow-lg shadow-violet-500/10"
                    : "bg-zinc-800/60 border-zinc-700/60 text-zinc-400 hover:border-zinc-600"
                }`}
              >
                <div className={`p-2 rounded-xl ${operatorType === "SUBCONTRACTOR" ? "bg-violet-500/20 text-violet-300" : "bg-zinc-800 text-zinc-500"}`}>
                  <User className="h-4 w-4" />
                </div>
                <div>
                  <p className="text-xs font-black text-white">Outside Worker</p>
                  <p className="text-[10px] text-zinc-400">Flat ₹1,200/d across roles</p>
                </div>
              </button>
            </div>
          </div>

          {/* Contractor Company Name — conditional */}
          {operatorType === "SUBCONTRACTOR" && (
            <div className="space-y-1.5 animate-in slide-in-from-top-2 duration-200">
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Contractor / Agency Name
              </label>
              <input
                type="text"
                value={contractorCoName}
                onChange={(e) => setContractorCoName(e.target.value)}
                placeholder="e.g. Sharma & Sons Contractors"
                className="w-full rounded-2xl border border-zinc-700 bg-zinc-800/60 px-4 py-3.5 text-sm text-white placeholder-zinc-600 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all"
              />
            </div>
          )}

          {/* MULTI-ROLE CAPABILITIES SELECTOR */}
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                  <Award className="h-4 w-4 text-amber-400" />
                  Qualified Roles (Multiple Allowed) *
                </label>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Select all tasks this operator is qualified to perform ({capableRoles.length} selected).
                </p>
              </div>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Multi-Skill
              </span>
            </div>

            {/* Role Grid Chips */}
            <div className="grid grid-cols-2 gap-2 pt-1 max-h-48 overflow-y-auto pr-1">
              {ALL_CREW_ROLES.map((r) => {
                const isSelected = capableRoles.includes(r.id);
                const isDefault = defaultCrewRole === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => toggleRole(r.id)}
                    className={`flex items-center justify-between p-2 rounded-xl border text-left transition-all ${
                      isSelected
                        ? "bg-amber-500/20 border-amber-500/50 text-white shadow-md shadow-amber-500/10"
                        : "bg-zinc-800/60 border-zinc-700/60 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
                    }`}
                  >
                    <div className="flex items-center gap-1.5 truncate">
                      <span className="text-sm">{r.icon}</span>
                      <span className="text-xs font-bold truncate">{r.label}</span>
                    </div>
                    <div
                      className={`h-4 w-4 shrink-0 rounded-md flex items-center justify-center border transition-all ${
                        isSelected
                          ? "bg-amber-500 border-amber-400 text-zinc-950 font-black"
                          : "border-zinc-700 bg-zinc-950"
                      }`}
                    >
                      {isSelected && <Check className="h-3 w-3 stroke-[3]" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Primary / Default Role Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center justify-between">
              <span>Primary / Default Crew Role *</span>
              <span className="text-[10px] text-zinc-500 font-normal">Default assignment in dispatch</span>
            </label>
            <div className="relative">
              <select
                value={defaultCrewRole}
                onChange={(e) => setDefaultCrewRole(e.target.value)}
                className="w-full appearance-none rounded-2xl border border-zinc-700 bg-zinc-800/80 px-4 py-3.5 text-sm text-amber-300 font-bold focus:border-amber-500 focus:outline-none focus:ring-1 focus:ring-amber-500/50 transition-all"
              >
                {capableRoles.map((rId) => {
                  const meta = ALL_CREW_ROLES.find((r) => r.id === rId);
                  return (
                    <option key={rId} value={rId}>
                      {meta?.icon || "🛠️"} {meta?.label || rId}
                    </option>
                  );
                })}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
            </div>
          </div>

          {/* PER-ROLE DAILY WAGE RATES (EACH ROLE HAS ITS OWN WAGE) */}
          <div className={`rounded-2xl border p-4 space-y-3 ${
            operatorType === "SUBCONTRACTOR"
              ? "border-violet-500/30 bg-violet-500/5"
              : "border-emerald-500/30 bg-emerald-500/5"
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <label className={`text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
                  operatorType === "SUBCONTRACTOR" ? "text-violet-300" : "text-emerald-400"
                }`}>
                  <DollarSign className="h-4 w-4" />
                  {operatorType === "SUBCONTRACTOR"
                    ? "Outside Worker Daily Wage Rates (₹ / Day)"
                    : "Company Worker Daily Wage Rates (₹ / Day)"}
                </label>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  {operatorType === "SUBCONTRACTOR"
                    ? "Outside workers are paid a flat ₹1,200/day across roles by default. Adjust any role below if necessary."
                    : "Company workers have role-specific pay rates (Mixer: ₹1,100, Vibrator: ₹900, Lift: ₹1,000 base + ₹100/floor, Helper: ₹750)."}
                </p>
              </div>
              <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${
                operatorType === "SUBCONTRACTOR"
                  ? "bg-violet-500/20 text-violet-300 border-violet-500/30"
                  : "bg-emerald-500/20 text-emerald-300 border-emerald-500/30"
              }`}>
                {operatorType === "SUBCONTRACTOR" ? "Flat ₹1,200/d Rate Card" : "Standard Rate Card"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
              {capableRoles.map((rId) => {
                const meta = ALL_CREW_ROLES.find((r) => r.id === rId);
                const isPrimary = defaultCrewRole === rId;
                return (
                  <div
                    key={rId}
                    className={`flex items-center justify-between p-2.5 rounded-xl border bg-zinc-900/90 transition-all ${
                      isPrimary ? "border-amber-500/50 ring-1 ring-amber-500/20" : "border-zinc-800"
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <span className="text-base shrink-0">{meta?.icon || "🛠️"}</span>
                      <div className="truncate">
                        <span className="text-xs font-bold text-white block truncate">
                          {meta?.label || rId}
                        </span>
                        {rId === "LIFT_OPERATOR" && (
                          <span className="text-[10px] text-indigo-400 font-semibold block truncate">
                            Base 1st Fl (+₹100/extra fl)
                          </span>
                        )}
                        {isPrimary && (
                          <span className="text-[9px] font-black text-amber-400 uppercase tracking-wider">
                            ★ Primary
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0 w-32">
                      <span className="text-xs font-bold text-emerald-400">₹</span>
                      <input
                        type="number"
                        min="0"
                        value={roleRates[rId] || ""}
                        onChange={(e) =>
                          setRoleRates((prev) => ({ ...prev, [rId]: e.target.value }))
                        }
                        placeholder={DEFAULT_ROLE_WAGES[rId] || "900"}
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-xs text-emerald-400 font-mono font-bold focus:border-emerald-500 focus:outline-none"
                      />
                      <span className="text-[10px] text-zinc-500">/d</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Crew Leader Checkbox */}
          <div className="flex items-center gap-3 bg-zinc-800/40 p-4 rounded-2xl border border-zinc-700/50">
            <input
              type="checkbox"
              id="isCrewLeader"
              checked={isCrewLeader}
              onChange={(e) => setIsCrewLeader(e.target.checked)}
              className="w-5 h-5 rounded border-zinc-600 text-blue-500 focus:ring-blue-500/50 bg-zinc-900"
            />
            <label htmlFor="isCrewLeader" className="flex flex-col cursor-pointer">
              <span className="text-sm font-bold text-white">Designate as Crew Leader</span>
              <span className="text-xs text-zinc-400">Allows allocating work to other operators</span>
            </label>
          </div>

          {/* PIN */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              4-Digit PIN *
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={4}
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  placeholder="••••"
                  required
                  className="w-full rounded-2xl border border-zinc-700 bg-zinc-800/60 pl-11 pr-4 py-3.5 text-lg font-black tracking-[0.5em] text-white placeholder-zinc-700 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500/50 transition-all"
                />
              </div>
              <button
                type="button"
                onClick={generatePin}
                title="Auto-generate PIN"
                className="flex items-center gap-2 rounded-2xl border border-zinc-700 bg-zinc-800 px-4 py-3.5 text-sm font-bold text-zinc-300 hover:bg-zinc-700 hover:text-white transition-colors whitespace-nowrap"
              >
                <Shuffle className="h-4 w-4" />
                Generate
              </button>
            </div>
            {pin.length === 4 && (
              <div className="flex gap-1.5 pl-1 animate-in fade-in duration-200">
                {pin.split("").map((digit, i) => (
                  <span
                    key={i}
                    className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/20 border border-blue-500/40 text-base font-black text-blue-300"
                  >
                    {digit}
                  </span>
                ))}
                <span className="ml-2 self-center text-xs text-zinc-500">Write it down before submitting</span>
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="pt-2 space-y-3">
            <button
              type="submit"
              disabled={isPending}
              className="w-full flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 py-4 text-sm font-black text-white shadow-lg shadow-blue-500/20 hover:from-blue-500 hover:to-violet-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? (
                <>
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/20 border-t-white" />
                  Creating Operator...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4" />
                  Create Operator & Get Credentials
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-2xl border border-zinc-700 py-3.5 text-sm font-bold text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ── Helper sub-component ────────────────────────────────────────────────────
function CredRow({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-zinc-900/60 px-4 py-2.5">
      {icon}
      <div>
        <p className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">{label}</p>
        <p className="text-sm font-semibold text-white">{value}</p>
      </div>
    </div>
  );
}
