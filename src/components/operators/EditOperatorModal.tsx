"use client";

import React, { useState } from "react";
import {
  X,
  Loader2,
  Save,
  Check,
  Award,
  Layers,
  DollarSign,
  Trash2,
  Building2,
  User,
} from "lucide-react";
import { editEmployeeDetails, softDeleteEmployee } from "@/actions/employees";
import { Role } from "@prisma/client";
import {
  COMPANY_WORKER_ROLE_WAGES,
  OUTSIDE_WORKER_FLAT_WAGE,
  getDefaultWorkerWage,
} from "@/lib/pricingEngine";

export const ALL_CREW_ROLES = [
  { id: "MIXER_OPERATOR",     label: "Mixer Operator",     shortLabel: "Mixer",     icon: "🛠️", color: "orange" },
  { id: "HYDRAULIC_OPERATOR", label: "Hydraulic Operator", shortLabel: "Hydraulic", icon: "🚜", color: "amber" },
  { id: "VIBRATOR_OPERATOR",  label: "Vibrator Operator",  shortLabel: "Vibrator",  icon: "⚡", color: "yellow" },
  { id: "LIFT_OPERATOR",      label: "Lift Operator",      shortLabel: "Lift",      icon: "🏗️", color: "blue" },
  { id: "WORKER_LEADER",      label: "Company Site Leader", shortLabel: "Leader",    icon: "👷", color: "emerald" },
  { id: "SUB_LEADER",         label: "Sub Leader (Worker Provider)", shortLabel: "Sub-Leader",icon: "👥", color: "teal" },
  { id: "DRIVER",             label: "Driver",             shortLabel: "Driver",    icon: "🚚", color: "cyan" },
  { id: "HELPER",             label: "General Helper (Pani / Site Labour)", shortLabel: "Helper (Pani)", icon: "🤝", color: "slate" },
  { id: "TROLLY_1_WHEEL",     label: "1-Wheel Trolly Operator (Wheelbarrow / Ramp Handler)", shortLabel: "1W Trolly", icon: "🛞", color: "violet" },
  { id: "TROLLY_2_WHEEL",     label: "2-Wheel Trolly Handler (Concrete Cart)", shortLabel: "2W Trolly", icon: "🛞", color: "purple" },
  { id: "P_VIBRATOR",         label: "Petrol Vibrator",    shortLabel: "P-Vibrator",icon: "⛽", color: "rose" },
];

interface EditOperatorModalProps {
  operator: {
    id: string;
    name: string;
    phone: string | null;
    role: Role;
    operatorType?: "INTERNAL" | "SUBCONTRACTOR";
    contractorCoName?: string | null;
    defaultCrewRole?: string | null;
    capableRoles?: string[];
    roleRates?: { crewRole: string; wagePerDay: number }[];
    baseDailyWage?: number | null;
    dailyBataRate?: number | null;
  };
  onClose: () => void;
  onSuccess: () => void;
}

export default function EditOperatorModal({ operator, onClose, onSuccess }: EditOperatorModalProps) {
  const [name, setName] = useState(operator.name);
  const [phone, setPhone] = useState(operator.phone || "");
  const [role, setRole] = useState<Role>(operator.role || Role.OPERATOR);
  const [operatorType, setOperatorType] = useState<"INTERNAL" | "SUBCONTRACTOR">(
    operator.operatorType || "INTERNAL"
  );
  const [contractorCoName, setContractorCoName] = useState(operator.contractorCoName || "");

  // Multi-role capability state
  const initialCapable = operator.capableRoles && operator.capableRoles.length > 0
    ? operator.capableRoles
    : operator.defaultCrewRole
    ? [operator.defaultCrewRole]
    : ["MIXER_OPERATOR"];

  const [capableRoles, setCapableRoles] = useState<string[]>(initialCapable);
  const [defaultCrewRole, setDefaultCrewRole] = useState(
    operator.defaultCrewRole || initialCapable[0] || "MIXER_OPERATOR"
  );

  // Per-role custom wage rates map (roleId -> custom rate)
  const [roleRates, setRoleRates] = useState<Record<string, string>>(() => {
    const map: Record<string, string> = {};
    if (operator.roleRates) {
      operator.roleRates.forEach((rr) => {
        map[rr.crewRole] = String(rr.wagePerDay);
      });
    }
    return map;
  });

  const [showRateOverrides, setShowRateOverrides] = useState(false);
  const [baseDailyWage, setBaseDailyWage] = useState(operator.baseDailyWage ? String(operator.baseDailyWage) : "");
  const [dailyBataRate, setDailyBataRate] = useState(operator.dailyBataRate ? String(operator.dailyBataRate) : "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleOperatorTypeChange = (newType: "INTERNAL" | "SUBCONTRACTOR") => {
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
    const isHelper = roleId === "HELPER";
    const hasRole = isHelper
      ? capableRoles.includes("HELPER") || capableRoles.includes("PANI_HELPER")
      : capableRoles.includes(roleId);

    if (hasRole) {
      if (capableRoles.length <= (isHelper ? 2 : 1)) {
        // Keep at least one role
        return;
      }
      next = isHelper
        ? capableRoles.filter((r) => r !== "HELPER" && r !== "PANI_HELPER")
        : capableRoles.filter((r) => r !== roleId);
      if (defaultCrewRole === roleId || (isHelper && (defaultCrewRole === "HELPER" || defaultCrewRole === "PANI_HELPER"))) {
        setDefaultCrewRole(next[0] || "");
      }
    } else {
      next = isHelper
        ? Array.from(new Set([...capableRoles, "HELPER", "PANI_HELPER"]))
        : [...capableRoles, roleId];
      if (!defaultCrewRole) {
        setDefaultCrewRole(roleId);
      }
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

  const handleRoleRateChange = (roleId: string, val: string) => {
    setRoleRates((prev) => ({ ...prev, [roleId]: val }));
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to send ${operator.name} to Pending Deletions?`)) return;
    setLoading(true);
    setError("");
    try {
      const res = await softDeleteEmployee(operator.id);
      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.error || "Failed to soft delete.");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    // Strip non-numerics for phone
    let normalizedPhone = phone.replace(/\D/g, "");
    if (normalizedPhone.startsWith("91") && normalizedPhone.length === 12) {
      normalizedPhone = normalizedPhone.slice(2);
    }
    if (normalizedPhone.length !== 10) {
      setError("Phone number must be exactly 10 digits.");
      setLoading(false);
      return;
    }

    if (capableRoles.length === 0) {
      setError("Please select at least one role that this operator can perform.");
      setLoading(false);
      return;
    }

    // Format custom role rates for every capable role
    const formattedRoleRates = capableRoles.map((rId) => ({
      crewRole: rId,
      wagePerDay: Number(roleRates[rId] || baseDailyWage || 900),
    }));

    const primaryWage = Number(
      roleRates[defaultCrewRole] || formattedRoleRates[0]?.wagePerDay || baseDailyWage || 900
    );

    try {
      const res = await editEmployeeDetails(operator.id, {
        name,
        phone: normalizedPhone,
        role,
        operatorType,
        defaultCrewRole: defaultCrewRole || capableRoles[0] || null,
        capableRoles,
        roleRates: formattedRoleRates,
        baseDailyWage: primaryWage,
        dailyBataRate: dailyBataRate ? Number(dailyBataRate) : null,
      });

      if (res.success) {
        onSuccess();
        onClose();
      } else {
        setError(res.error || "Failed to update operator.");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md">
      <div className="w-full max-w-2xl max-h-[92vh] flex flex-col rounded-3xl border border-zinc-800 bg-zinc-950 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-zinc-800 shrink-0 bg-zinc-900/40">
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <Layers className="h-5 w-5 text-amber-400" />
              Edit Operator & Multi-Role Capabilities
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5">
              Select multiple operational roles this operator is qualified to perform on job sites.
            </p>
          </div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 rounded-xl bg-red-500/10 p-3 text-sm text-red-400 border border-red-500/20">
            {error}
          </div>
        )}

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Basic Details */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-white focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-1">Phone Number *</label>
              <input
                type="tel"
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-white font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Worker Category (Internal vs Outside Worker) */}
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
                    : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700"
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
                    : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:border-zinc-700"
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

          {/* MULTI-ROLE CAPABILITIES SELECTOR */}
          <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <label className="text-xs font-black uppercase tracking-wider text-amber-300 flex items-center gap-1.5">
                  <Award className="h-4 w-4 text-amber-400" />
                  Qualified Roles (Multiple Allowed)
                </label>
                <p className="text-[11px] text-zinc-400 mt-0.5">
                  Click to select all tasks this operator can handle. Selected: {capableRoles.length} role(s).
                </p>
              </div>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Multi-Skill Tagging
              </span>
            </div>

            {/* Role Grid Chips */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
              {ALL_CREW_ROLES.map((r) => {
                const isSelected = r.id === "HELPER"
                  ? capableRoles.includes("HELPER") || capableRoles.includes("PANI_HELPER")
                  : capableRoles.includes(r.id);
                const isDefault = defaultCrewRole === r.id;
                return (
                  <button
                    key={r.id}
                    type="button"
                    onClick={() => toggleRole(r.id)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-left transition-all ${
                      isSelected
                        ? "bg-amber-500/20 border-amber-500/50 text-white shadow-md shadow-amber-500/10"
                        : "bg-zinc-900/60 border-zinc-800 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200"
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="text-base">{r.icon}</span>
                      <div className="truncate">
                        <span className="text-xs font-bold block truncate">{r.label}</span>
                        {isDefault && (
                          <span className="text-[9px] font-bold text-amber-400 uppercase">★ Primary</span>
                        )}
                      </div>
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

          {/* Primary / Default Role Selector */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 flex items-center justify-between mb-1">
              <span>Primary / Default Crew Role</span>
              <span className="text-[10px] text-zinc-500 font-normal">Auto-selected during daily dispatch</span>
            </label>
            <select
              value={defaultCrewRole}
              onChange={(e) => setDefaultCrewRole(e.target.value)}
              className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-amber-300 font-bold focus:border-amber-500 focus:outline-none"
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
          </div>

          {/* PER-ROLE DAILY WAGE RATES (PERMANENTLY VISIBLE & EDITABLE) */}
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
                    : "Company workers earn role-specific rates (Mixer: ₹1,100, Vibrator: ₹900, Lift: ₹1,000 base + ₹100/fl, Helper: ₹750)."}
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
                        onChange={(e) => handleRoleRateChange(rId, e.target.value)}
                        placeholder={baseDailyWage || "900"}
                        className="w-full rounded-lg border border-zinc-700 bg-zinc-950 px-2.5 py-1.5 text-xs text-emerald-400 font-mono font-bold focus:border-emerald-500 focus:outline-none"
                      />
                      <span className="text-[10px] text-zinc-500">/d</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Daily Bata Rate */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-400 block mb-1">
              Daily Bata / Food Allowance (₹ / Day)
            </label>
            <input
              type="number"
              min="0"
              value={dailyBataRate}
              onChange={(e) => setDailyBataRate(e.target.value)}
              placeholder="e.g. 150"
              className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-white font-mono font-bold focus:border-zinc-500 focus:outline-none"
            />
          </div>

          {/* System Role */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-zinc-500 block mb-1">System Account Role</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-white focus:border-blue-500 focus:outline-none"
            >
              <option value="OPERATOR">Operator</option>
              <option value="DRIVER">Driver</option>
              <option value="WORKER">Worker (Helper)</option>
              <option value="STAFF">Office Staff</option>
            </select>
          </div>
        </form>

        {/* Modal Footer */}
        <div className="p-6 border-t border-zinc-800 bg-zinc-900/60 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            disabled={loading}
            onClick={handleDelete}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-red-950/40 border border-red-500/30 text-xs font-bold text-red-400 hover:bg-red-900/60 transition-colors flex items-center justify-center gap-1.5"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Send to Trash
          </button>

          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-zinc-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={handleSubmit}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 py-2.5 text-xs font-bold text-white hover:bg-blue-500 disabled:opacity-50 transition-colors shadow-lg shadow-blue-600/20"
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Multi-Role Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
