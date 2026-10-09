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
} from "lucide-react";
import CreateOperatorModal from "@/components/operators/CreateOperatorModal";
import EditOperatorModal from "@/components/operators/EditOperatorModal";
import { softDeleteEmployee } from "@/actions/employees";
import Link from "next/link";

interface OperatorRow {
  id: string;
  name: string;
  operatorType: OperatorType;
  contractorCoName: string | null;
  phone: string | null;
  role: any;
  createdAt: string;
}

interface Props {
  operators: OperatorRow[];
}

export default function OperatorsClientPage({ operators: initialOperators }: Props) {
  const [operators, setOperators] = useState(initialOperators);
  const [showModal, setShowModal] = useState(false);
  const [editingOperator, setEditingOperator] = useState<OperatorRow | null>(null);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<"ALL" | OperatorType>("ALL");
  const [, startTransition] = useTransition();

  // Refresh list after creation (router.refresh alternative using startTransition)
  const handleSuccess = () => {
    startTransition(() => {
      // The server action does revalidatePath, so a hard reload picks up new data.
      // For a seamless UX without page reload, we leave the new operator out until
      // the user next visits; or we could push to the list optimistically.
      window.location.reload();
    });
  };

  const filtered = operators.filter((op) => {
    const matchType = filterType === "ALL" || op.operatorType === filterType;
    const matchSearch =
      search.trim() === "" ||
      op.name.toLowerCase().includes(search.toLowerCase()) ||
      op.phone?.includes(search) ||
      op.contractorCoName?.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  const internalCount = operators.filter((o) => o.operatorType === "INTERNAL").length;
  const subCount = operators.filter((o) => o.operatorType === "SUBCONTRACTOR").length;

  return (
    <>
      <div className="space-y-6">
        {/* Page header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-3xl font-black text-white">Field Operators</h1>
            <p className="text-zinc-500 text-sm mt-1">
              Manage operator accounts and Phone + PIN credentials
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
            label="Internal"
            value={internalCount}
            icon={<HardHat className="h-5 w-5 text-emerald-400" />}
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
              placeholder="Search by name, phone, or company..."
              className="w-full rounded-2xl border border-zinc-800 bg-zinc-900/60 pl-11 pr-4 py-3 text-sm text-white placeholder-zinc-600 focus:border-blue-500/50 focus:outline-none focus:ring-1 focus:ring-blue-500/20 transition-all"
            />
          </div>
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
        <Link 
          href={`/staff/operators/${op.id}`} 
          className="font-semibold text-white text-sm hover:text-blue-400 hover:underline transition-colors truncate block"
        >
          {op.name}
        </Link>
        {op.contractorCoName && (
          <p className="text-xs text-zinc-500 truncate">{op.contractorCoName}</p>
        )}
      </div>

      {/* Phone */}
      <div className="hidden sm:flex items-center gap-2 text-zinc-400 text-xs">
        <Phone className="h-3.5 w-3.5" />
        <span className="font-mono">{op.phone ? `+91 ${op.phone.slice(0, 5)} ${op.phone.slice(5)}` : "N/A"}</span>
      </div>

      {/* Type badge */}
      <span
        className={`hidden md:inline-flex shrink-0 rounded-xl px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border ${
          isInternal
            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
            : "bg-violet-500/10 text-violet-400 border-violet-500/20"
        }`}
      >
        {isInternal ? "Internal" : "Subcontractor"}
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

