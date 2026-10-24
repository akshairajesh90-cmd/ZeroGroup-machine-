"use client";

import React, { useState, useTransition } from "react";
type OperatorType = "INTERNAL" | "SUBCONTRACTOR";
import {
  UserPlus,
  Users,
  Phone,
  Building2,
  Clock,
  Search,
  Filter,
  HardHat,
  MoreVertical,
  Edit2,
  Trash2,
  Receipt,
  UserCheck,
  UserX,
} from "lucide-react";
import CreateOperatorModal from "@/components/operators/CreateOperatorModal";
import EditOperatorModal from "@/components/operators/EditOperatorModal";
import { softDeleteEmployee, toggleEmployeeActiveStatus } from "@/actions/employees";
import Link from "next/link";

interface OperatorRow {
  id: string;
  name: string;
  operatorType: OperatorType;
  contractorCoName: string | null;
  phone: string | null;
  role: any;
  defaultCrewRole: string | null;
  capableRoles: string[];
  roleRates?: { crewRole: string; wagePerDay: number }[];
  baseDailyWage: number | null;
  dailyBataRate: number | null;
  isActive?: boolean;
  createdAt: string;
}

const crewRoleMeta: Record<string, { label: string; icon: string; bg: string; text: string; border: string }> = {
  MIXER_OPERATOR:     { label: "Mixer Operator",     icon: "🛠️", bg: "bg-orange-500/10",  text: "text-orange-400",  border: "border-orange-500/20" },
  HYDRAULIC_OPERATOR: { label: "Hydraulic Operator", icon: "🚜", bg: "bg-amber-500/10",   text: "text-amber-400",   border: "border-amber-500/20" },
  VIBRATOR_OPERATOR:  { label: "Vibrator Operator",  icon: "⚡", bg: "bg-yellow-500/10",  text: "text-yellow-400",  border: "border-yellow-500/20" },
  LIFT_OPERATOR:      { label: "Lift Operator",      icon: "🏗️", bg: "bg-blue-500/10",    text: "text-blue-400",    border: "border-blue-500/20" },
  WORKER_LEADER:      { label: "Worker Leader",      icon: "👷", bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/20" },
  SUB_LEADER:         { label: "Sub Leader",         icon: "👥", bg: "bg-teal-500/10",    text: "text-teal-400",    border: "border-teal-500/20" },
  DRIVER:             { label: "Driver",             icon: "🚚", bg: "bg-cyan-500/10",    text: "text-cyan-400",    border: "border-cyan-500/20" },
  HELPER:             { label: "Helper",             icon: "🤝", bg: "bg-slate-500/10",   text: "text-slate-400",   border: "border-slate-500/20" },
  PANI_HELPER:        { label: "Pani Helper",        icon: "💧", bg: "bg-sky-500/10",     text: "text-sky-400",     border: "border-sky-500/20" },
  TROLLY_1_WHEEL:     { label: "1-Wheel Trolly",     icon: "🛞", bg: "bg-violet-500/10",  text: "text-violet-400",  border: "border-violet-500/20" },
  TROLLY_2_WHEEL:     { label: "2-Wheel Trolly",     icon: "🛞", bg: "bg-purple-500/10",  text: "text-purple-400",  border: "border-purple-500/20" },
  P_VIBRATOR:         { label: "Petrol Vibrator",    icon: "⛽", bg: "bg-rose-500/10",    text: "text-rose-400",    border: "border-rose-500/20" },
};

interface Props {
  operators: OperatorRow[];
}

export default function OperatorsClientPage({ operators: initialOperators }: Props) {
  const [operators, setOperators] = useState(initialOperators);
  const [showModal, setShowModal] = useState(false);
  const [editingOperator, setEditingOperator] = useState<OperatorRow | null>(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | OperatorType>("ALL");
  const [filterRole, setFilterRole] = useState<string>("ALL");
  const [, startTransition] = useTransition();

  // Refresh list after creation (router.refresh alternative using startTransition)
  const handleSuccess = () => {
    startTransition(() => {
      window.location.reload();
    });
  };

  const filtered = operators.filter((op) => {
    const matchType = filterType === "ALL" || op.operatorType === filterType;
    const matchRole =
      filterRole === "ALL"
        ? true
        : filterRole === "UNALLOCATED"
        ? (!op.defaultCrewRole && (!op.capableRoles || op.capableRoles.length === 0))
        : (op.capableRoles?.includes(filterRole) || op.defaultCrewRole === filterRole);

    const searchLower = search.trim().toLowerCase();
    const matchSearch =
      searchLower === "" ||
      op.name.toLowerCase().includes(searchLower) ||
      op.phone?.includes(searchLower) ||
      op.contractorCoName?.toLowerCase().includes(searchLower) ||
      (op.defaultCrewRole && op.defaultCrewRole.toLowerCase().includes(searchLower)) ||
      (op.capableRoles && op.capableRoles.some(r => r.toLowerCase().includes(searchLower) || crewRoleMeta[r]?.label.toLowerCase().includes(searchLower)));

    return matchType && matchRole && matchSearch;
  });

  const internalCount = operators.filter((o) => o.operatorType === "INTERNAL").length;
  const subCount = operators.filter((o) => o.operatorType === "SUBCONTRACTOR").length;
  const allocatedCount = operators.filter((o) => Boolean(o.defaultCrewRole)).length;

  return (
    <>
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-black text-white">Field Operators & Crew Roles</h1>
            <p className="text-zinc-500 text-sm mt-1">
              Manage operator profiles, primary crew role allocations, and login PINs
            </p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-blue-500/20 hover:from-blue-500 hover:to-violet-500 transition-all"
          >
            <UserPlus className="h-4 w-4" />
            Add Operator
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          <StatCard
            label="Total Operators"
            value={operators.length}
            icon={<Users className="h-5 w-5 text-blue-400" />}
            accent="blue"
          />
          <StatCard
            label="Crew Role Allocated"
            value={allocatedCount}
            icon={<HardHat className="h-5 w-5 text-amber-400" />}
            accent="emerald"
          />
          <StatCard
            label="Subcontractors"
            value={subCount}
            icon={<Building2 className="h-5 w-5 text-violet-400" />}
            accent="violet"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, phone, company, or crew role..."
              className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/60 pl-11 pr-4 py-3 text-sm text-white placeholder-zinc-600 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-all"
            />
          </div>

          {/* Crew Role Filter */}
          <div className="relative">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="appearance-none rounded-2xl border border-zinc-800 bg-zinc-900/60 pl-11 pr-8 py-3 text-sm text-amber-300 font-bold focus:border-amber-500/50 focus:outline-none transition-all"
            >
              <option value="ALL">All Crew Roles</option>
              <option value="MIXER_OPERATOR">🛠️ Mixer Operator</option>
              <option value="HYDRAULIC_OPERATOR">🚜 Hydraulic Operator</option>
              <option value="VIBRATOR_OPERATOR">⚡ Vibrator Operator</option>
              <option value="LIFT_OPERATOR">🏗️ Lift Operator</option>
              <option value="WORKER_LEADER">👷 Worker Leader</option>
              <option value="DRIVER">🚚 Driver</option>
              <option value="UNALLOCATED">⚪ Unallocated</option>
            </select>
          </div>

          {/* Type Filter */}
          <div className="relative">
            <Filter className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500 pointer-events-none" />
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value as typeof filterType)}
              className="appearance-none rounded-2xl border border-zinc-800 bg-zinc-900/60 pl-11 pr-8 py-3 text-sm text-white focus:border-blue-500/50 focus:outline-none transition-all"
            >
              <option value="ALL">All Types</option>
              <option value="INTERNAL">Internal Only</option>
              <option value="SUBCONTRACTOR">Subcontractors Only</option>
            </select>
          </div>
        </div>

        {/* Operator List */}
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900/40 overflow-hidden">
          <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-4">
            <p className="text-xs font-bold uppercase tracking-widest text-zinc-400">
              {filtered.length} Operator{filtered.length !== 1 ? "s" : ""}
            </p>
          </div>

          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-zinc-800 mb-4">
                <HardHat className="h-8 w-8 text-zinc-600" />
              </div>
              <p className="text-zinc-400 font-semibold">No operators found</p>
              <p className="text-zinc-600 text-sm mt-1">
                {search ? "Try a different search" : 'Click "Add Operator" to onboard your first field operator'}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800/60">
              {filtered.map((op) => (
                <OperatorRow key={op.id} operator={op} onEdit={() => setEditingOperator(op)} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal */}
      {showModal && (
        <CreateOperatorModal
          onClose={() => setShowModal(false)}
          onSuccess={handleSuccess}
        />
      )}
      {editingOperator && (
        <EditOperatorModal
          operator={editingOperator}
          onClose={() => setEditingOperator(null)}
          onSuccess={handleSuccess}
        />
      )}
    </>
  );
}

// ─── Operator Row ─────────────────────────────────────────────────────────────
function OperatorRow({ operator: op, onEdit }: { operator: OperatorRow; onEdit: () => void }) {
  const isInternal = op.operatorType === "INTERNAL";
  const [showDropdown, setShowDropdown] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  const handleToggleStatus = async () => {
    const nextStatus = op.isActive === false;
    const actionWord = nextStatus ? "enable" : "disable";
    if (!confirm(`Are you sure you want to ${actionWord} operator ${op.name}? ${!nextStatus ? "This will revoke active sessions and prevent login." : ""}`)) return;
    setIsToggling(true);
    const res = await toggleEmployeeActiveStatus(op.id, nextStatus);
    if (res.success) {
      window.location.reload();
    } else {
      alert(res.error || `Failed to ${actionWord} operator.`);
      setIsToggling(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this operator?")) return;
    setIsDeleting(true);
    const res = await softDeleteEmployee(op.id);
    if (res.success) {
      window.location.reload();
    } else {
      alert(res.error || "Failed to delete");
      setIsDeleting(false);
    }
  };

  const date = new Date(op.createdAt).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="flex items-center gap-4 px-6 py-4 hover:bg-zinc-800/30 transition-colors">
      {/* Avatar */}
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl font-black text-sm ${
          isInternal
            ? "bg-emerald-500/15 text-emerald-400"
            : "bg-violet-500/15 text-violet-400"
        }`}
      >
        {op.name.charAt(0).toUpperCase()}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Link 
            href={`/staff/operators/${op.id}`} 
            className="font-semibold text-white text-sm hover:text-blue-400 hover:underline transition-colors truncate block"
          >
            {op.name}
          </Link>
          {op.isActive === false ? (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20">
              Disabled
            </span>
          ) : (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Active
            </span>
          )}
        </div>
        {op.contractorCoName && (
          <p className="text-xs text-zinc-500 truncate">{op.contractorCoName}</p>
        )}
      </div>

      {/* Phone */}
      <div className="hidden sm:flex items-center gap-2 text-zinc-400 text-xs">
        <Phone className="h-3.5 w-3.5" />
        <span className="font-mono">{op.phone ? `+91 ${op.phone.slice(0, 5)} ${op.phone.slice(5)}` : "N/A"}</span>
      </div>

      {/* Multi-Role Capabilities Badges with Per-Role Wages */}
      <div className="flex flex-wrap items-center gap-1.5 max-w-md">
        {op.capableRoles && op.capableRoles.length > 0 ? (
          op.capableRoles.map((rId) => {
            const meta = crewRoleMeta[rId];
            if (!meta) return null;
            const isPrimary = op.defaultCrewRole === rId;
            const roleRate =
              op.roleRates?.find((rr) => rr.crewRole === rId)?.wagePerDay ?? op.baseDailyWage;

            return (
              <span
                key={rId}
                title={
                  rId === "LIFT_OPERATOR"
                    ? `Lift Operator: Base ₹${roleRate ?? 0}/day for 1st Floor + ₹100 per additional floor`
                    : isPrimary
                    ? `Primary Assigned Role — ₹${roleRate ?? 0}/day`
                    : `Qualified Role — ₹${roleRate ?? 0}/day`
                }
                className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-[11px] font-bold border transition-colors ${
                  meta.bg
                } ${meta.text} ${meta.border} ${
                  isPrimary ? "ring-1 ring-amber-400/50 shadow-sm shadow-amber-400/20" : ""
                }`}
              >
                <span>{meta.icon}</span>
                <span>{meta.label}</span>
                {roleRate != null && (
                  <span className="ml-0.5 px-1.5 py-0.2 rounded-md bg-zinc-950/70 text-emerald-400 font-mono text-[10px] font-black border border-emerald-500/30">
                    ₹{Number(roleRate).toLocaleString("en-IN")}/d
                    {rId === "LIFT_OPERATOR" && (
                      <span className="text-amber-300 ml-1 font-sans text-[9px] font-bold" title="+₹100 per extra floor above 1st floor">
                        +₹100/fl
                      </span>
                    )}
                  </span>
                )}
                {isPrimary && (
                  <span className="text-[10px] text-amber-300 font-black" title="Primary Role">
                    ★
                  </span>
                )}
              </span>
            );
          })
        ) : op.defaultCrewRole && crewRoleMeta[op.defaultCrewRole] ? (
          (() => {
            const meta = crewRoleMeta[op.defaultCrewRole];
            const roleRate =
              op.roleRates?.find((rr) => rr.crewRole === op.defaultCrewRole)?.wagePerDay ??
              op.baseDailyWage;
            return (
              <span
                className={`inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-[11px] font-bold border ${meta.bg} ${meta.text} ${meta.border}`}
              >
                <span>{meta.icon}</span>
                <span>{meta.label}</span>
                {roleRate != null && (
                  <span className="ml-0.5 px-1.5 py-0.2 rounded-md bg-zinc-950/70 text-emerald-400 font-mono text-[10px] font-black border border-emerald-500/30">
                    ₹{Number(roleRate).toLocaleString("en-IN")}/d
                  </span>
                )}
              </span>
            );
          })()
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1 text-[10px] font-semibold text-zinc-500 bg-zinc-800/40 border border-zinc-700/40">
            Unallocated {op.baseDailyWage ? `(₹${op.baseDailyWage}/d)` : ""}
          </span>
        )}
      </div>

      {/* Daily Bata Rate if any */}
      {op.dailyBataRate ? (
        <span
          className="hidden xl:inline-flex text-[11px] font-mono text-zinc-400 shrink-0 bg-zinc-900 border border-zinc-800 px-2 py-0.5 rounded-lg"
          title="Daily Bata / Food Allowance"
        >
          Bata: ₹{op.dailyBataRate}/d
        </span>
      ) : null}

      {/* Type badge */}
      <span
        className={`inline-flex items-center gap-1.5 shrink-0 rounded-xl px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border ${
          isInternal
            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
            : "bg-violet-500/10 text-violet-400 border-violet-500/20"
        }`}
      >
        <span>{isInternal ? "🏢" : "🌐"}</span>
        <span>{isInternal ? "Company Worker" : "Outside Worker"}</span>
        {!isInternal && (
          <span className="ml-0.5 px-1.5 py-0.5 rounded-md bg-violet-950/80 text-violet-300 font-mono text-[9px] font-black border border-violet-500/30">
            Flat ₹1,200/d
          </span>
        )}
      </span>

      {/* Date */}
      <div className="hidden lg:flex items-center gap-1.5 text-zinc-600 text-xs shrink-0">
        <Clock className="h-3 w-3" />
        {date}
      </div>

      {/* Actions */}
      <div className="relative shrink-0 ml-auto">
        <button 
          onClick={() => setShowDropdown(!showDropdown)}
          className="p-2 rounded-xl text-zinc-500 hover:text-white hover:bg-zinc-800 transition-colors"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
        
        {showDropdown && (
          <div className="absolute right-0 top-full mt-1 w-36 rounded-xl border border-zinc-800 bg-zinc-900 shadow-xl overflow-hidden z-10">
            <Link
              href={`/staff/operators/${op.id}`}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors text-left"
            >
              <Receipt className="h-4 w-4" /> Ledger
            </Link>
            <button 
              onClick={() => { setShowDropdown(false); onEdit(); }}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-zinc-300 hover:bg-zinc-800 hover:text-white transition-colors text-left"
            >
              <Edit2 className="h-4 w-4" /> Edit
            </button>
            <button 
              onClick={() => { setShowDropdown(false); handleToggleStatus(); }}
              disabled={isToggling}
              className={`flex w-full items-center gap-2 px-4 py-2.5 text-sm transition-colors text-left disabled:opacity-50 ${
                op.isActive === false
                  ? "text-emerald-400 hover:bg-emerald-500/10"
                  : "text-amber-400 hover:bg-amber-500/10"
              }`}
            >
              {op.isActive === false ? (
                <>
                  <UserCheck className="h-4 w-4" /> Enable
                </>
              ) : (
                <>
                  <UserX className="h-4 w-4" /> Disable
                </>
              )}
            </button>
            <button 
              onClick={() => { setShowDropdown(false); handleDelete(); }}
              disabled={isDeleting}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-sm text-red-400 hover:bg-red-500/10 transition-colors text-left disabled:opacity-50"
            >
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// â”€â”€ Stat Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent: "blue" | "emerald" | "violet";
}) {
  const colors = {
    blue: "border-blue-500/20 bg-blue-500/5",
    emerald: "border-emerald-500/20 bg-emerald-500/5",
    violet: "border-violet-500/20 bg-violet-500/5",
  };
  return (
    <div
      className={`rounded-3xl border p-5 ${colors[accent]}`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-zinc-500">{label}</p>
          <p className="text-3xl font-black text-white mt-1">{value}</p>
        </div>
        <div className="rounded-2xl bg-zinc-800/60 p-3">{icon}</div>
      </div>
    </div>
  );
}

