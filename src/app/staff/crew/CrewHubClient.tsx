"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  HardHat,
  Phone,
  Search,
  Filter,
  DollarSign,
  Shield,
  Truck,
  UserCheck,
  ChevronRight,
  PhoneCall,
  Clock,
  Sparkles,
  ArrowLeft,
  CheckCircle2,
  Edit3,
  X,
  Save,
  Check,
  AlertCircle,
  Layers,
  Wrench,
  Percent,
  Power,
  Trash2,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import { saveEmployeeRoleRates } from "@/actions/hr";
import {
  toggleEmployeeActiveStatus,
  softDeleteEmployee,
  updateEmployeeOperatorType,
} from "@/actions/employees";
import {
  COMPANY_WORKER_ROLE_WAGES,
  OUTSIDE_WORKER_FLAT_WAGE,
  DEFAULT_PRICING,
} from "@/lib/pricingEngine";

export interface RoleRate {
  id: string;
  crewRole: string;
  wagePerDay: number;
}

export interface EmployeeItem {
  id: string;
  name: string;
  role: string;
  phone: string | null;
  profilePhotoUrl: string | null;
  isActive: boolean;
  operatorType: string;
  contractorCoName: string | null;
  defaultCrewRole: string | null;
  capableRoles: string[];
  roleRates: RoleRate[];
  baseDailyWage: number | null;
  dailyBataRate: number | null;
  lastSeenAt: string | null;
  createdAt: string;
}

export interface WorkTypeRateItem {
  id: string;
  machineType: string;
  workType: string;
  payoutRate: number;
  customerCharge: number | null;
}

interface Props {
  employees: EmployeeItem[];
  workTypeRates: WorkTypeRateItem[];
  currentUserEmployeeId: string;
}

export const crewRoleMeta: Record<
  string,
  {
    label: string;
    icon: string;
    bg: string;
    text: string;
    border: string;
    category: "machine" | "leader" | "trolly" | "helper";
    description: string;
    customerBillingNote?: string;
  }
> = {
  MIXER_OPERATOR: {
    label: "Mixer Operator",
    icon: "🛠️",
    bg: "bg-orange-500/10",
    text: "text-orange-400",
    border: "border-orange-500/20",
    category: "machine",
    description: "Standard concrete mixing machine operations",
    customerBillingNote: "Customer Machine Rent: ₹1,000 / day",
  },
  HYDRAULIC_OPERATOR: {
    label: "Hydraulic Operator",
    icon: "🚜",
    bg: "bg-amber-500/10",
    text: "text-amber-400",
    border: "border-amber-500/20",
    category: "machine",
    description: "Heavy hydraulic concrete mixing machinery",
    customerBillingNote: "Customer Machine Rent: ₹1,100 / day",
  },
  LIFT_OPERATOR: {
    label: "Lift Operator",
    icon: "🏗️",
    bg: "bg-blue-500/10",
    text: "text-blue-400",
    border: "border-blue-500/20",
    category: "machine",
    description: "Multi-floor construction lift & hoist operation",
    customerBillingNote: "Customer Rent: ₹1,700 base + ₹500 / floor",
  },
  VIBRATOR_OPERATOR: {
    label: "Vibrator Operator",
    icon: "⚡",
    bg: "bg-yellow-500/10",
    text: "text-yellow-400",
    border: "border-yellow-500/20",
    category: "machine",
    description: "Electric concrete needle vibrator compaction",
    customerBillingNote: "Equipment: ₹0 (No extra machine charge)",
  },
  P_VIBRATOR: {
    label: "Petrol Vibrator",
    icon: "⛽",
    bg: "bg-rose-500/10",
    text: "text-rose-400",
    border: "border-rose-500/20",
    category: "machine",
    description: "Engine-driven petrol vibrator for remote slabs",
    customerBillingNote: "Equipment: Covered by dedicated operator wage",
  },
  WORKER_LEADER: {
    label: "Company Site Leader",
    icon: "👷",
    bg: "bg-emerald-500/10",
    text: "text-emerald-400",
    border: "border-emerald-500/20",
    category: "leader",
    description: "On-site gang lead, supervision, and field diary",
    customerBillingNote: "Site supervision & gang coordination",
  },
  SUB_LEADER: {
    label: "Sub Leader (Worker Provider)",
    icon: "👥",
    bg: "bg-teal-500/10",
    text: "text-teal-400",
    border: "border-teal-500/20",
    category: "leader",
    description: "External labor coordinator & sub-gang provider",
    customerBillingNote: "Crew provider & subcontractor management",
  },
  DRIVER: {
    label: "Driver",
    icon: "🚚",
    bg: "bg-cyan-500/10",
    text: "text-cyan-400",
    border: "border-cyan-500/20",
    category: "leader",
    description: "Truck, tractor, and machinery road transport",
    customerBillingNote: "Fleet machinery delivery & collection",
  },
  TROLLY_1_WHEEL: {
    label: "1-Wheel Trolly Operator (Wheelbarrow / Ramp Handler)",
    icon: "🛞",
    bg: "bg-violet-500/10",
    text: "text-violet-400",
    border: "border-violet-500/20",
    category: "trolly",
    description: "Operates 1-wheel barrow on ramps, paired strictly with Bench",
    customerBillingNote: "Work Rate: ₹1,500 + Tool Rent: ₹1,000 (paired with Bench)",
  },
  TROLLY_2_WHEEL: {
    label: "2-Wheel Trolly Handler (Concrete Cart)",
    icon: "🛞",
    bg: "bg-purple-500/10",
    text: "text-purple-400",
    border: "border-purple-500/20",
    category: "trolly",
    description: "Flat-ground concrete cart transport",
    customerBillingNote: "Tool Rent: ₹200 / trolly (Tools Section)",
  },
  HELPER: {
    label: "General Helper (Pani / Site Labour)",
    icon: "🤝",
    bg: "bg-slate-500/10",
    text: "text-slate-400",
    border: "border-slate-500/20",
    category: "helper",
    description: "General site labour, mixing assist, shoveling, and curing",
    customerBillingNote: "Site labour & concrete placement assist",
  },
  PANI_HELPER: {
    label: "General Helper (Pani / Site Labour)",
    icon: "💧",
    bg: "bg-sky-500/10",
    text: "text-sky-400",
    border: "border-sky-500/20",
    category: "helper",
    description: "Water hose handling, slab curing, and site assist",
    customerBillingNote: "Water curing & site labour assist",
  },
};

const MASTER_ROLES_ORDER = [
  "MIXER_OPERATOR",
  "HYDRAULIC_OPERATOR",
  "LIFT_OPERATOR",
  "VIBRATOR_OPERATOR",
  "P_VIBRATOR",
  "WORKER_LEADER",
  "SUB_LEADER",
  "DRIVER",
  "TROLLY_1_WHEEL",
  "TROLLY_2_WHEEL",
  "HELPER",
  "PANI_HELPER",
];

export default function CrewHubClient({
  employees: initialEmployees,
  workTypeRates,
  currentUserEmployeeId,
}: Props) {
  const [employees, setEmployees] = useState<EmployeeItem[]>(initialEmployees);
  const [activeTab, setActiveTab] = useState<"directory" | "rates">("rates");
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "ACTIVE" | "DISABLED">("ALL");

  // Rates tab sub-filter
  const [ratesCrewFilter, setRatesCrewFilter] = useState<
    "ALL" | "WITH_RATES" | "SUBCONTRACTOR" | "INTERNAL" | "OPERATOR" | "WORKER" | "DRIVER"
  >("WITH_RATES");

  // Company Master Role Wages State (Editable Standard Rate Card)
  const [masterRoleWages, setMasterRoleWages] = useState<Record<string, number>>(COMPANY_WORKER_ROLE_WAGES);
  const [outsideWage, setOutsideWage] = useState<number>(OUTSIDE_WORKER_FLAT_WAGE);

  // Load any user-customized standard rates from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedMaster = localStorage.getItem("zero_group_master_role_wages");
      if (savedMaster) {
        try {
          setMasterRoleWages((prev) => ({ ...prev, ...JSON.parse(savedMaster) }));
        } catch (e) {}
      }
      const savedOutside = localStorage.getItem("zero_group_outside_flat_wage");
      if (savedOutside) {
        const val = Number(savedOutside);
        if (!isNaN(val) && val > 0) setOutsideWage(val);
      }
    }
  }, []);

  // Edit Standard Rate Card Modal State
  const [isEditingMasterRates, setIsEditingMasterRates] = useState(false);
  const [tempMasterWages, setTempMasterWages] = useState<Record<string, number>>(COMPANY_WORKER_ROLE_WAGES);
  const [tempOutsideWage, setTempOutsideWage] = useState<number>(OUTSIDE_WORKER_FLAT_WAGE);

  // Action status / banners
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Soft Delete confirmation modal state
  const [deleteCandidate, setDeleteCandidate] = useState<EmployeeItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Edit Individual Role Rates Modal State
  const [editingEmployee, setEditingEmployee] = useState<EmployeeItem | null>(null);
  const [modalRates, setModalRates] = useState<Record<string, { enabled: boolean; wage: number }>>({});
  const [isSavingRates, setIsSavingRates] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [saveErrorMsg, setSaveErrorMsg] = useState<string | null>(null);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const showToast = (type: "success" | "error", text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Open Edit Master Rates modal
  const handleOpenEditMasterRates = (highlightRoleKey?: string) => {
    setTempMasterWages({ ...masterRoleWages });
    setTempOutsideWage(outsideWage);
    setIsEditingMasterRates(true);
  };

  // Save Company Standard Rate Card
  const handleSaveMasterRates = () => {
    setMasterRoleWages(tempMasterWages);
    setOutsideWage(tempOutsideWage);

    if (typeof window !== "undefined") {
      localStorage.setItem("zero_group_master_role_wages", JSON.stringify(tempMasterWages));
      localStorage.setItem("zero_group_outside_flat_wage", String(tempOutsideWage));
    }

    setIsEditingMasterRates(false);
    showToast("success", "Company Standard Rate Card saved successfully!");
  };

  // Reset Standard Rate Card to Factory Defaults
  const handleResetMasterRatesToDefault = () => {
    setTempMasterWages({ ...COMPANY_WORKER_ROLE_WAGES });
    setTempOutsideWage(OUTSIDE_WORKER_FLAT_WAGE);
  };

  // Toggle Active / Disabled status
  const handleToggleActive = async (emp: EmployeeItem) => {
    setActionLoadingId(emp.id);
    const newStatus = !emp.isActive;

    try {
      const res = await toggleEmployeeActiveStatus(emp.id, newStatus);
      if (!res.success) {
        showToast("error", res.error || "Failed to update employee status.");
        return;
      }

      setEmployees((prev) =>
        prev.map((e) => (e.id === emp.id ? { ...e, isActive: newStatus } : e))
      );
      showToast(
        "success",
        `${emp.name} is now ${newStatus ? "ACTIVE" : "DISABLED"}.`
      );
    } catch (err: any) {
      showToast("error", err.message || "An unexpected error occurred.");
    } finally {
      setActionLoadingId(null);
    }
  };

  // Confirm Soft Delete
  const handleConfirmSoftDelete = async () => {
    if (!deleteCandidate) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const res = await softDeleteEmployee(deleteCandidate.id);
      if (!res.success) {
        setDeleteError(res.error || "Failed to soft-delete employee.");
        setIsDeleting(false);
        return;
      }

      // Remove from local state
      setEmployees((prev) => prev.filter((e) => e.id !== deleteCandidate.id));
      showToast("success", `${deleteCandidate.name} has been soft-deleted and moved to Trash.`);
      setDeleteCandidate(null);
    } catch (err: any) {
      setDeleteError(err.message || "An error occurred while deleting.");
    } finally {
      setIsDeleting(false);
    }
  };

  // Filtered employees for Directory tab
  const filteredEmployees = employees.filter((e) => {
    const matchesSearch =
      e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.phone && e.phone.includes(searchTerm)) ||
      (e.contractorCoName && e.contractorCoName.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesRole =
      roleFilter === "ALL"
        ? true
        : roleFilter === "SUBCONTRACTOR"
        ? e.operatorType === "SUBCONTRACTOR"
        : roleFilter === "INTERNAL"
        ? e.operatorType === "INTERNAL"
        : e.role === roleFilter || e.defaultCrewRole === roleFilter;

    const matchesStatus =
      statusFilter === "ALL"
        ? true
        : statusFilter === "ACTIVE"
        ? e.isActive
        : !e.isActive;

    return matchesSearch && matchesRole && matchesStatus;
  });

  // Rates tab personnel list
  const personnelWithRates = employees.filter((e) => e.roleRates && e.roleRates.length > 0);
  const fieldPersonnel = employees.filter((e) =>
    ["OPERATOR", "WORKER", "DRIVER", "STAFF"].includes(e.role)
  );

  const filteredRatesPersonnel = employees.filter((e) => {
    // Only field or active roles
    if (!["OPERATOR", "WORKER", "DRIVER", "STAFF"].includes(e.role)) return false;

    // Search filter
    if (searchTerm) {
      const match =
        e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.phone && e.phone.includes(searchTerm));
      if (!match) return false;
    }

    // Status filter
    if (statusFilter === "ACTIVE" && !e.isActive) return false;
    if (statusFilter === "DISABLED" && e.isActive) return false;

    if (ratesCrewFilter === "WITH_RATES") {
      return e.roleRates && e.roleRates.length > 0;
    }
    if (ratesCrewFilter === "SUBCONTRACTOR") return e.operatorType === "SUBCONTRACTOR";
    if (ratesCrewFilter === "INTERNAL") return e.operatorType === "INTERNAL";
    if (ratesCrewFilter === "OPERATOR") return e.role === "OPERATOR";
    if (ratesCrewFilter === "WORKER") return e.role === "WORKER";
    if (ratesCrewFilter === "DRIVER") return e.role === "DRIVER";
    return true; // ALL
  });

    const handleToggleWorkerType = async (emp: EmployeeItem) => {
    const nextType = emp.operatorType === "SUBCONTRACTOR" ? "INTERNAL" : "SUBCONTRACTOR";
    setActionLoadingId(emp.id);
    try {
      const res = await updateEmployeeOperatorType(emp.id, nextType);
      if (res.success) {
        setEmployees((prev) =>
          prev.map((e) => (e.id === emp.id ? { ...e, operatorType: nextType } : e))
        );
        if (editingEmployee && editingEmployee.id === emp.id) {
          setEditingEmployee((prev) => (prev ? { ...prev, operatorType: nextType } : null));
        }
        setToastMessage({
          type: "success",
          text: `${emp.name} switched to ${nextType === "SUBCONTRACTOR" ? "Outside Worker (Subcontractor)" : "Company Worker (Internal)"}!`,
        });
      } else {
        setToastMessage({
          type: "error",
          text: res.error || "Failed to update worker type",
        });
      }
    } catch (err: any) {
      setToastMessage({
        type: "error",
        text: err.message || "Failed to update worker type",
      });
    } finally {
      setActionLoadingId(null);
    }
  };

  // Open Edit Modal for an Employee
  const handleOpenEditRates = (emp: EmployeeItem) => {
    const initialMap: Record<string, { enabled: boolean; wage: number }> = {};
    MASTER_ROLES_ORDER.forEach((roleKey) => {
      const existing = emp.roleRates.find((rr) => rr.crewRole === roleKey);
      if (existing) {
        initialMap[roleKey] = { enabled: true, wage: existing.wagePerDay };
      } else {
        const defaultWage =
          emp.operatorType === "SUBCONTRACTOR"
            ? outsideWage
            : masterRoleWages[roleKey] ?? 1000;
        initialMap[roleKey] = { enabled: false, wage: defaultWage };
      }
    });

    setModalRates(initialMap);
    setEditingEmployee(emp);
    setSaveSuccessMsg(null);
    setSaveErrorMsg(null);
  };

  // Prefill all 12 roles with standard company defaults
  const handlePrefillDefaults = () => {
    if (!editingEmployee) return;
    const updated = { ...modalRates };
    MASTER_ROLES_ORDER.forEach((roleKey) => {
      const defaultWage =
        editingEmployee.operatorType === "SUBCONTRACTOR"
          ? outsideWage
          : masterRoleWages[roleKey] ?? 1000;
      updated[roleKey] = { enabled: true, wage: defaultWage };
    });
    setModalRates(updated);
  };

  // Save rates for employee
  const handleSaveRates = async () => {
    if (!editingEmployee) return;
    setIsSavingRates(true);
    setSaveErrorMsg(null);
    setSaveSuccessMsg(null);

    try {
      const ratesToSave = Object.entries(modalRates)
        .filter(([_, val]) => val.enabled && val.wage > 0)
        .map(([roleKey, val]) => ({
          crewRole: roleKey,
          wagePerDay: Number(val.wage),
        }));

      const res = await saveEmployeeRoleRates(editingEmployee.id, ratesToSave);
      if (!res.success) {
        setSaveErrorMsg(res.error || "Failed to save role rates");
        setIsSavingRates(false);
        return;
      }

      // Update local state
      setEmployees((prev) =>
        prev.map((emp) => {
          if (emp.id !== editingEmployee.id) return emp;
          return {
            ...emp,
            roleRates: ratesToSave.map((r, idx) => ({
              id: `temp-${Date.now()}-${idx}`,
              crewRole: r.crewRole,
              wagePerDay: r.wagePerDay,
            })),
          };
        })
      );

      setSaveSuccessMsg(`Role rates saved successfully for ${editingEmployee.name}!`);
      setTimeout(() => {
        setEditingEmployee(null);
      }, 1200);
    } catch (err: any) {
      setSaveErrorMsg(err.message || "An unexpected error occurred while saving.");
    } finally {
      setIsSavingRates(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
      {/* Toast Alert */}
      {toastMessage && (
        <div
          className={`fixed top-4 right-4 z-50 px-4 py-3 rounded-2xl border text-sm font-bold shadow-2xl flex items-center gap-2.5 animate-in fade-in slide-in-from-top-4 ${
            toastMessage.type === "success"
              ? "bg-emerald-950 border-emerald-500/40 text-emerald-300"
              : "bg-rose-950 border-rose-500/40 text-rose-300"
          }`}
        >
          {toastMessage.type === "success" ? (
            <Check className="w-4 h-4 shrink-0 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Link
              href="/staff/dashboard"
              className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">
              Workforce Operations
            </span>
          </div>
          <h1 className="text-3xl font-black text-white tracking-tight flex items-center gap-3">
            <DollarSign className="w-8 h-8 text-amber-400" />
            Role-Based Rates &amp; Crew Wage Matrix
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Company-wide master role rates, equipment work-type payouts, individual crew rate cards, soft delete &amp; disable controls.
          </p>
        </div>

        {/* Header Actions: Edit Master Rates & Tab Switch */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Direct Header Edit Standard Rate Card Button */}
          <button
            type="button"
            onClick={() => handleOpenEditMasterRates()}
            className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-amber-500/25 transition-all cursor-pointer"
          >
            <Edit3 className="w-4 h-4" />
            <span>Edit Standard Rate Card</span>
          </button>

          {/* Tab switch */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1.5 rounded-2xl">
            <button
              onClick={() => setActiveTab("rates")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === "rates"
                  ? "bg-amber-600 text-white shadow-lg shadow-amber-600/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <HardHat className="w-3.5 h-3.5" />
              Role-Based Rates &amp; Wage Matrix ({personnelWithRates.length})
            </button>
            <button
              onClick={() => setActiveTab("directory")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                activeTab === "directory"
                  ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              Crew Directory ({employees.length})
            </button>
          </div>
        </div>
      </div>

      {/* Search & Quick Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by worker name, phone number, company..."
            className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
          />
        </div>

        {/* Status filter: All, Active, Disabled */}
        <div className="flex items-center gap-1.5 bg-slate-900/90 border border-slate-800 rounded-2xl p-1">
          <button
            type="button"
            onClick={() => setStatusFilter("ALL")}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === "ALL"
                ? "bg-slate-800 text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            All ({employees.length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("ACTIVE")}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === "ACTIVE"
                ? "bg-emerald-600 text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Active ({employees.filter((e) => e.isActive).length})
          </button>
          <button
            type="button"
            onClick={() => setStatusFilter("DISABLED")}
            className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
              statusFilter === "DISABLED"
                ? "bg-rose-600 text-white shadow"
                : "text-slate-400 hover:text-white"
            }`}
          >
            Disabled ({employees.filter((e) => !e.isActive).length})
          </button>
        </div>

        {activeTab === "directory" ? (
          <div className="flex items-center gap-2">
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="bg-slate-900/90 border border-slate-800 rounded-2xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50"
            >
              <option value="ALL">All Company Roles</option>
              <option value="SUBCONTRACTOR">🏢 Outside Workers (Subcontractors)</option>
              <option value="INTERNAL">👷 Company Workers (Internal)</option>
              <option value="OPERATOR">Operators</option>
              <option value="WORKER">Workers</option>
              <option value="DRIVER">Drivers</option>
              <option value="STAFF">Office Staff</option>
            </select>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setRatesCrewFilter("WITH_RATES")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                ratesCrewFilter === "WITH_RATES"
                  ? "bg-amber-500 text-slate-950 shadow"
                  : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              With Role Rates ({personnelWithRates.length})
            </button>
            <button
              onClick={() => setRatesCrewFilter("SUBCONTRACTOR")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                ratesCrewFilter === "SUBCONTRACTOR"
                  ? "bg-purple-600 text-white shadow"
                  : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              🏢 Outside Workers ({employees.filter((e) => e.operatorType === "SUBCONTRACTOR").length})
            </button>
            <button
              onClick={() => setRatesCrewFilter("INTERNAL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                ratesCrewFilter === "INTERNAL"
                  ? "bg-blue-600 text-white shadow"
                  : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              👷 Company Workers ({employees.filter((e) => e.operatorType === "INTERNAL").length})
            </button>
            <button
              onClick={() => setRatesCrewFilter("ALL")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                ratesCrewFilter === "ALL"
                  ? "bg-amber-500 text-slate-950 shadow"
                  : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              All Field Crew ({fieldPersonnel.length})
            </button>
            <button
              onClick={() => setRatesCrewFilter("OPERATOR")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                ratesCrewFilter === "OPERATOR"
                  ? "bg-amber-500 text-slate-950 shadow"
                  : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              Operators ({employees.filter((e) => e.role === "OPERATOR").length})
            </button>
            <button
              onClick={() => setRatesCrewFilter("WORKER")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                ratesCrewFilter === "WORKER"
                  ? "bg-amber-500 text-slate-950 shadow"
                  : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              Workers &amp; Helpers ({employees.filter((e) => e.role === "WORKER").length})
            </button>
            <button
              onClick={() => setRatesCrewFilter("DRIVER")}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                ratesCrewFilter === "DRIVER"
                  ? "bg-amber-500 text-slate-950 shadow"
                  : "bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
              }`}
            >
              Drivers ({employees.filter((e) => e.role === "DRIVER").length})
            </button>
          </div>
        )}
      </div>

      {/* TAB 1: ROLE-BASED RATES & WAGE MATRIX */}
      {activeTab === "rates" && (
        <div className="space-y-8">
          {/* SECTION 1: MASTER ROLE-BASED WAGE MATRIX (STANDARD RATE CARD) */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    Standard Rate Card Common
                  </span>
                  <span className="text-xs text-slate-500 font-mono">12 Master Roles</span>
                </div>
                <h2 className="text-xl font-black text-white mt-1.5 flex items-center gap-2.5">
                  <HardHat className="w-5 h-5 text-amber-400" />
                  Section 1: Company Master Role-Based Wage Matrix (Master Rate Card)
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Baseline daily payout rates for internal company workers vs. outside subcontractor flat wages.
                </p>
              </div>

              {/* Actions & Outside Wage Badge */}
              <div className="flex items-center gap-3">
                <div className="px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">Outside Flat Wage:</span>
                  <span className="text-xs font-black text-emerald-400">
                    {formatCurrency(outsideWage)} / day
                  </span>
                </div>

                {/* Primary Edit Button for Section 1 */}
                <button
                  type="button"
                  onClick={() => handleOpenEditMasterRates()}
                  className="px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-amber-500/25 transition-all cursor-pointer"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Edit Standard Rate Card</span>
                </button>
              </div>
            </div>

            {/* 12 Master Roles Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {MASTER_ROLES_ORDER.map((roleKey) => {
                const meta = crewRoleMeta[roleKey];
                const internalWage = masterRoleWages[roleKey] ?? COMPANY_WORKER_ROLE_WAGES[roleKey] ?? 1000;
                return (
                  <div
                    key={roleKey}
                    className={`p-4 rounded-2xl bg-slate-950 border ${meta.border} flex flex-col justify-between hover:border-slate-700 transition-all shadow-md group`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">{meta.icon}</span>
                          <span className={`text-xs font-black tracking-wide ${meta.text}`}>
                            {meta.label}
                          </span>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-400 line-clamp-2 min-h-[32px] mt-1">
                        {meta.description}
                      </p>

                      <div className="mt-3 pt-2.5 border-t border-slate-800/80 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-400 font-medium">Internal Daily Wage:</span>
                          <span className="font-black text-amber-400 text-sm">
                            {formatCurrency(internalWage)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-slate-500">Outside Subcontractor:</span>
                          <span className="font-bold text-slate-300">
                            {formatCurrency(outsideWage)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-slate-900 space-y-2">
                      {meta.customerBillingNote && (
                        <span className="text-[10px] text-emerald-400/90 font-medium block">
                          💡 {meta.customerBillingNote}
                        </span>
                      )}

                      {/* Quick Edit button per card */}
                      <button
                        type="button"
                        onClick={() => handleOpenEditMasterRates(roleKey)}
                        className="w-full py-1 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-amber-400 hover:text-amber-300 text-[11px] font-bold flex items-center justify-center gap-1 transition-all"
                      >
                        <Edit3 className="w-3 h-3" />
                        Edit Rate
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* SECTION 2: MACHINE WORK-TYPE RATE MATRIX */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Wrench className="w-5 h-5 text-amber-400" />
                  Machine Work-Type &amp; Tool Rate Matrix
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Standard job payouts for machine operators vs customer rental charges.
                </p>
              </div>
              <span className="text-[11px] font-mono text-slate-400 bg-slate-950 px-3 py-1 rounded-xl border border-slate-800">
                Single Source: Pricing Engine
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Mixing Machine */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
                      <span>🛠️</span> Mixing Machine
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-orange-500/10 text-orange-300 border border-orange-500/20 font-bold">
                      Standard Concrete
                    </span>
                  </div>
                  <div className="mt-2 space-y-1.5 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-800/80">
                      <span className="text-slate-400">Customer Machine Rent:</span>
                      <span className="font-bold text-slate-200">
                        {formatCurrency(DEFAULT_PRICING.MIXER)} / day
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-400">Operator Payout:</span>
                      <span className="font-bold text-amber-400 text-sm">
                        {formatCurrency(masterRoleWages.MIXER_OPERATOR ?? COMPANY_WORKER_ROLE_WAGES.MIXER_OPERATOR)} / day
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Hydraulic Mixer */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                      <span>🚜</span> Hydraulic Mixer
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/20 font-bold">
                      Heavy Concrete
                    </span>
                  </div>
                  <div className="mt-2 space-y-1.5 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-800/80">
                      <span className="text-slate-400">Customer Machine Rent:</span>
                      <span className="font-bold text-slate-200">
                        {formatCurrency(DEFAULT_PRICING.HYDRAULIC_MIXER)} / day
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-400">Operator Payout:</span>
                      <span className="font-bold text-amber-400 text-sm">
                        {formatCurrency(masterRoleWages.HYDRAULIC_OPERATOR ?? COMPANY_WORKER_ROLE_WAGES.HYDRAULIC_OPERATOR)} / day
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Lift */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black text-blue-400 uppercase tracking-wider flex items-center gap-1.5">
                      <span>🏗️</span> Construction Lift
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-300 border border-blue-500/20 font-bold">
                      Multi-Floor
                    </span>
                  </div>
                  <div className="mt-2 space-y-1.5 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-800/80">
                      <span className="text-slate-400">Customer Machine Rent:</span>
                      <span className="font-bold text-slate-200">
                        ₹1,700 base (+₹500 / fl)
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-400">Operator Payout:</span>
                      <span className="font-bold text-amber-400 text-sm">
                        {formatCurrency(masterRoleWages.LIFT_OPERATOR ?? COMPANY_WORKER_ROLE_WAGES.LIFT_OPERATOR)} / day
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 1-Wheel Trolly & Bench */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black text-violet-400 uppercase tracking-wider flex items-center gap-1.5">
                      <span>🛞</span> 1-Wheel Trolly &amp; Bench
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-violet-500/10 text-violet-300 border border-violet-500/20 font-bold">
                      Work Specs
                    </span>
                  </div>
                  <div className="mt-2 space-y-1.5 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-800/80">
                      <span className="text-slate-400">Work + Tool Rent:</span>
                      <span className="font-bold text-slate-200">
                        ₹1,500 + ₹1,000 rent
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-400">Handler Payout:</span>
                      <span className="font-bold text-amber-400 text-sm">
                        {formatCurrency(masterRoleWages.TROLLY_1_WHEEL ?? COMPANY_WORKER_ROLE_WAGES.TROLLY_1_WHEEL)} / day
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2-Wheel Trolly */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black text-purple-400 uppercase tracking-wider flex items-center gap-1.5">
                      <span>🛞</span> 2-Wheel Concrete Trolly
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-300 border border-purple-500/20 font-bold">
                      Tools Section
                    </span>
                  </div>
                  <div className="mt-2 space-y-1.5 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-800/80">
                      <span className="text-slate-400">Tool Rent Charge:</span>
                      <span className="font-bold text-emerald-400">
                        ₹200 / trolly
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-400">Handler Payout:</span>
                      <span className="font-bold text-amber-400 text-sm">
                        {formatCurrency(masterRoleWages.TROLLY_2_WHEEL ?? COMPANY_WORKER_ROLE_WAGES.TROLLY_2_WHEEL)} / day
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Petrol & Electric Vibrator */}
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-black text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                      <span>⚡</span> Needle Vibrators
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-rose-500/10 text-rose-300 border border-rose-500/20 font-bold">
                      Compaction
                    </span>
                  </div>
                  <div className="mt-2 space-y-1.5 text-xs">
                    <div className="flex justify-between py-1 border-b border-slate-800/80">
                      <span className="text-slate-400">Customer Tool Rent:</span>
                      <span className="font-bold text-slate-200">
                        ₹0 (Covered by labor)
                      </span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span className="text-slate-400">Operator Payout:</span>
                      <span className="font-bold text-amber-400 text-sm">
                        ₹900 - ₹1,000 / day
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: INDIVIDUAL PERSONNEL ROLE WAGE CARDS & CONTROLS */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800/80 pb-4">
              <div>
                <h3 className="text-lg font-black text-white flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-emerald-400" />
                  Individual Personnel Role Wage Cards &amp; Management
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Custom per-role daily wages, active/disable controls, soft delete, and edit role rates.
                </p>
              </div>

              <div className="text-xs text-slate-400">
                Showing <strong className="text-white">{filteredRatesPersonnel.length}</strong> crew members
              </div>
            </div>

            {filteredRatesPersonnel.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                No crew members match the selected filter or search query.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredRatesPersonnel.map((person) => {
                  const hasCustomRates = person.roleRates && person.roleRates.length > 0;
                  const isLoading = actionLoadingId === person.id;

                  return (
                    <div
                      key={person.id}
                      className={`p-5 rounded-2xl border transition-all shadow-lg flex flex-col justify-between ${
                        person.isActive
                          ? "bg-slate-950 border-slate-800/90 hover:border-slate-700"
                          : "bg-slate-950/60 border-rose-950/40 opacity-75 hover:opacity-100"
                      }`}
                    >
                      <div>
                        {/* Header */}
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-white text-sm">
                              {person.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-white text-base leading-snug">
                                  {person.name}
                                </h4>
                                {/* Quick Edit Icon Button in Header */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditRates(person)}
                                  title="Edit Role Rates for this person"
                                  className="p-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition-all cursor-pointer"
                                >
                                  <Edit3 className="w-3 h-3" />
                                </button>
                              </div>
                              <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                                <span className="font-semibold text-amber-400">{person.role}</span>
                                {person.phone && (
                                  <span className="text-slate-500 font-mono text-[11px]">
                                    • {person.phone}
                                  </span>
                                )}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 flex-col items-end">
                            {/* Active vs Disabled badge */}
                            <span
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                person.isActive
                                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                                  : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                              }`}
                            >
                              {person.isActive ? "Active" : "Disabled"}
                            </span>

                            <button
                              type="button"
                              onClick={() => handleToggleWorkerType(person)}
                              title="Click to toggle Company Worker vs Outside Subcontractor"
                              className={`text-[10px] font-bold px-2 py-0.5 rounded-full transition-all cursor-pointer ${
                                person.operatorType === "INTERNAL"
                                  ? "bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20"
                                  : "bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 border border-purple-500/20"
                              }`}
                            >
                              {person.operatorType === "INTERNAL" ? "Company Worker" : "Outside Worker"}
                            </button>
                          </div>
                        </div>

                        {/* Base Wage info */}
                        <div className="flex items-center justify-between text-xs py-1.5 px-3 rounded-xl bg-slate-900/60 border border-slate-800/50 mb-3">
                          <span className="text-slate-400">Base Daily Wage:</span>
                          <span className="font-bold text-emerald-400">
                            {person.baseDailyWage ? formatCurrency(person.baseDailyWage) : "₹1,000"} / day
                          </span>
                        </div>

                        {/* Configured Role Rates list */}
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-[11px] uppercase font-bold text-slate-500 tracking-wider">
                            <span>Role Rates ({person.roleRates?.length || 0})</span>
                          </div>

                          {hasCustomRates ? (
                            <div className="space-y-1 mt-1">
                              {person.roleRates.map((rr) => {
                                const meta = crewRoleMeta[rr.crewRole] || {
                                  label: rr.crewRole,
                                  icon: "⚙️",
                                  text: "text-slate-300",
                                  border: "border-slate-800",
                                  bg: "bg-slate-900",
                                };
                                return (
                                  <div
                                    key={rr.id}
                                    className="flex items-center justify-between text-xs py-1.5 px-2.5 rounded-xl bg-slate-900/90 border border-slate-800/80"
                                  >
                                    <span className="text-slate-300 flex items-center gap-1.5 truncate max-w-[180px]">
                                      <span>{meta.icon}</span>
                                      <span className="truncate">{meta.label}</span>
                                    </span>
                                    <span className="font-black text-amber-400 ml-2">
                                      {formatCurrency(rr.wagePerDay)}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-xs text-slate-500 italic py-2">
                              No role rates set yet. (Uses company defaults).
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Card Action Controls: High-Visibility Edit Button, Disable/Enable, Soft Delete */}
                      <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          {/* Disable / Enable Toggle button */}
                          <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => handleToggleActive(person)}
                            title={person.isActive ? "Disable employee account" : "Enable employee account"}
                            className={`px-2 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1 border ${
                              person.isActive
                                ? "bg-slate-900 border-slate-800 text-slate-400 hover:text-amber-400 hover:border-amber-500/40"
                                : "bg-emerald-950/40 border-emerald-500/30 text-emerald-400 hover:bg-emerald-900/50"
                            } disabled:opacity-40 cursor-pointer`}
                          >
                            <Power className="w-3.5 h-3.5" />
                            <span>{person.isActive ? "Disable" : "Enable"}</span>
                          </button>

                          {/* Soft Delete button */}
                          <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => {
                              setDeleteError(null);
                              setDeleteCandidate(person);
                            }}
                            title="Soft delete crew member (Move to Trash)"
                            className="p-1.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-500 hover:text-rose-400 hover:border-rose-500/40 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        {/* HIGH-VISIBILITY PRIMARY AMBER EDIT BUTTON */}
                        <button
                          type="button"
                          onClick={() => handleOpenEditRates(person)}
                          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black transition-all flex items-center gap-1.5 shadow-lg shadow-amber-500/20 cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Edit Role Rates</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: CREW DIRECTORY */}
      {activeTab === "directory" && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredEmployees.length === 0 ? (
            <div className="col-span-full py-16 text-center text-slate-500">
              No team members match your search criteria.
            </div>
          ) : (
            filteredEmployees.map((emp) => (
              <div
                key={emp.id}
                className={`border rounded-2xl p-5 transition-all shadow-lg flex flex-col justify-between ${
                  emp.isActive
                    ? "bg-slate-900/80 border-slate-800 hover:border-slate-700"
                    : "bg-slate-950/60 border-rose-950/40 opacity-75 hover:opacity-100"
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-white text-sm">
                        {emp.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-bold text-white text-base leading-snug">{emp.name}</h3>
                          <button
                            type="button"
                            onClick={() => {
                              setActiveTab("rates");
                              handleOpenEditRates(emp);
                            }}
                            title="Edit Role Rates"
                            className="p-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition-all cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                        </div>
                        <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <span className="font-semibold text-emerald-400">{emp.role}</span>
                          {emp.defaultCrewRole && (
                            <span className="text-slate-500">• {emp.defaultCrewRole}</span>
                          )}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-col items-end">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          emp.isActive
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        }`}
                      >
                        {emp.isActive ? "Active" : "Disabled"}
                      </span>

                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          emp.operatorType === "INTERNAL"
                            ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                            : "bg-purple-500/10 text-purple-400 border border-purple-500/20"
                        }`}
                      >
                        {emp.operatorType || "INTERNAL"}
                      </span>
                    </div>
                  </div>

                  {/* Phone contact */}
                  {emp.phone ? (
                    <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between mt-3">
                      <span className="text-xs text-slate-300 font-mono">{emp.phone}</span>
                      <a
                        href={`tel:${emp.phone}`}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow"
                      >
                        <PhoneCall className="w-3 h-3" />
                        Call
                      </a>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-500 italic mt-3">No phone registered</p>
                  )}

                  {/* Role Rates preview if exists */}
                  {emp.roleRates && emp.roleRates.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-slate-800/60">
                      <p className="text-[11px] uppercase font-bold text-slate-500 tracking-wider mb-1.5">
                        Role Rate Cards ({emp.roleRates.length})
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {emp.roleRates.map((rr) => (
                          <span
                            key={rr.id}
                            className="text-[11px] px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300"
                          >
                            {rr.crewRole}:{" "}
                            <strong className="text-amber-400">{formatCurrency(rr.wagePerDay)}</strong>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
                  <div className="flex items-center gap-2">
                    {/* Disable / Enable Toggle button */}
                    <button
                      type="button"
                      disabled={actionLoadingId === emp.id}
                      onClick={() => handleToggleActive(emp)}
                      title={emp.isActive ? "Disable employee" : "Enable employee"}
                      className={`p-1.5 rounded-xl border text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                        emp.isActive
                          ? "bg-slate-950 border-slate-800 text-slate-400 hover:text-amber-400"
                          : "bg-emerald-950/40 border-emerald-500/30 text-emerald-400"
                      }`}
                    >
                      <Power className="w-3.5 h-3.5" />
                    </button>

                    {/* Soft Delete button */}
                    <button
                      type="button"
                      disabled={actionLoadingId === emp.id}
                      onClick={() => {
                        setDeleteError(null);
                        setDeleteCandidate(emp);
                      }}
                      title="Soft delete crew member (Move to Trash)"
                      className="p-1.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-500 hover:text-rose-400 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => {
                      setActiveTab("rates");
                      handleOpenEditRates(emp);
                    }}
                    className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md transition-all cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    Edit Role Rates
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* EDIT STANDARD RATE CARD MODAL (SECTION 1 EDIT) */}
      {isEditingMasterRates && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex items-start justify-between bg-slate-950/60">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    Master Wage Card
                  </span>
                  <span className="text-xs text-slate-500 font-mono">12 Standard Roles</span>
                </div>
                <h3 className="text-xl font-black text-white">
                  Edit Standard Rate Card Common
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Adjust default company-wide daily payout wages for each role and outside subcontractor flat wage.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsEditingMasterRates(false)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Actions */}
            <div className="px-6 py-3 bg-slate-950/40 border-b border-slate-800/60 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Update standard daily wage values:
              </span>
              <button
                type="button"
                onClick={handleResetMasterRatesToDefault}
                className="text-xs font-bold text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Factory Defaults
              </button>
            </div>

            {/* Outside Flat Wage Row */}
            <div className="p-6 overflow-y-auto space-y-3 flex-1">
              <div className="p-4 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 flex items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-base">🏢</span>
                    <span className="text-xs font-black text-emerald-300">
                      Outside Subcontractor Flat Wage
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    Standard flat daily wage applied to outside subcontracted workers.
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 font-bold">₹</span>
                  <input
                    type="number"
                    value={tempOutsideWage || ""}
                    onChange={(e) => setTempOutsideWage(Number(e.target.value))}
                    className="w-28 bg-slate-900 border border-emerald-500/50 rounded-xl px-3 py-1.5 text-sm font-black text-emerald-400 text-right focus:outline-none focus:border-emerald-400"
                  />
                  <span className="text-[11px] text-slate-500">/ day</span>
                </div>
              </div>

              {/* 12 Master Roles List */}
              {MASTER_ROLES_ORDER.map((roleKey) => {
                const meta = crewRoleMeta[roleKey];
                const currentVal = tempMasterWages[roleKey] ?? 1000;

                return (
                  <div
                    key={roleKey}
                    className="p-3.5 rounded-2xl bg-slate-950 border border-slate-800/80 flex items-center justify-between gap-4 hover:border-slate-700 transition-all"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-base">{meta.icon}</span>
                        <span className="text-xs font-bold text-white">{meta.label}</span>
                      </div>
                      <span className="text-[10px] text-slate-500 block mt-0.5">
                        {meta.description}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 font-bold">₹</span>
                      <input
                        type="number"
                        value={currentVal || ""}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setTempMasterWages((prev) => ({
                            ...prev,
                            [roleKey]: val,
                          }));
                        }}
                        className="w-28 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-sm font-black text-amber-400 text-right focus:outline-none focus:border-amber-500"
                      />
                      <span className="text-[11px] text-slate-500">/ day</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                12 Master Roles &amp; Subcontractor Rate Configured
              </span>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setIsEditingMasterRates(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveMasterRates}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  Save Standard Rate Card
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SOFT DELETE CONFIRMATION MODAL */}
      {deleteCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-white">Confirm Soft Delete</h3>
                <p className="text-xs text-slate-400">Moves employee to Admin Trash Hub</p>
              </div>
            </div>

            <p className="text-sm text-slate-300 leading-relaxed">
              Are you sure you want to soft delete <strong className="text-white">{deleteCandidate.name}</strong> ({deleteCandidate.role})?
            </p>

            <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-400 space-y-1">
              <p>• Active user login sessions will be instantly terminated.</p>
              <p>• Cannot be deleted if currently assigned to active dispatches.</p>
              <p>• Can be reviewed or permanently deleted by Admin in the Trash Hub.</p>
            </div>

            {deleteError && (
              <div className="p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setDeleteCandidate(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmSoftDelete}
                className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-all flex items-center gap-2 shadow-lg shadow-rose-600/20 disabled:opacity-50 cursor-pointer"
              >
                {isDeleting ? "Deleting..." : "Confirm Soft Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EDIT INDIVIDUAL ROLE RATES MODAL */}
      {editingEmployee && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex items-start justify-between bg-slate-950/60">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    Wage Configuration
                  </span>
                  <span className="text-xs text-slate-500 font-mono">
                    {editingEmployee.role} • {editingEmployee.operatorType || "INTERNAL"}
                  </span>
                </div>
                <h3 className="text-xl font-black text-white">
                  Edit Role Rates: {editingEmployee.name}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Configure daily payouts for each specific role this team member performs on site. Check to enable, uncheck to disable role.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setEditingEmployee(null)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Notification Banners */}
            {saveSuccessMsg && (
              <div className="m-4 p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0" />
                {saveSuccessMsg}
              </div>
            )}
            {saveErrorMsg && (
              <div className="m-4 p-3 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-bold flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                {saveErrorMsg}
              </div>
            )}

            {/* Worker Employment Classification Toggle */}
            <div className="px-6 py-3 bg-slate-950/70 border-b border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-white block">Worker Employment Classification</span>
                <span className="text-[11px] text-slate-400">
                  {editingEmployee.operatorType === "SUBCONTRACTOR"
                    ? "Outside Subcontractor (defaults to ₹1,500 outside flat wage)"
                    : "Internal Company Staff (tiered role wage default)"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleToggleWorkerType(editingEmployee)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                  editingEmployee.operatorType === "SUBCONTRACTOR"
                    ? "bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/30"
                    : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/30"
                }`}
              >
                {editingEmployee.operatorType === "SUBCONTRACTOR" ? "🏢 Outside Worker" : "👷 Company Worker"}
              </button>
            </div>

            {/* Modal Quick Actions */}
            <div className="px-6 py-3 bg-slate-950/40 border-b border-slate-800/60 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                Check roles to enable &amp; set custom daily wage (Uncheck to disable):
              </span>
              <button
                type="button"
                onClick={handlePrefillDefaults}
                className="text-xs font-bold text-amber-400 hover:text-amber-300 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Prefill Company Defaults
              </button>
            </div>

            {/* Roles List */}
            <div className="p-6 overflow-y-auto space-y-3 flex-1">
              {MASTER_ROLES_ORDER.map((roleKey) => {
                const meta = crewRoleMeta[roleKey];
                const state = modalRates[roleKey] || { enabled: false, wage: 1000 };
                const companyDefault =
                  editingEmployee.operatorType === "SUBCONTRACTOR"
                    ? outsideWage
                    : masterRoleWages[roleKey] ?? 1000;

                return (
                  <div
                    key={roleKey}
                    className={`p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-4 ${
                      state.enabled
                        ? "bg-slate-950 border-amber-500/40"
                        : "bg-slate-950/50 border-slate-800/80 opacity-70"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={state.enabled}
                        onChange={(e) => {
                          setModalRates((prev) => ({
                            ...prev,
                            [roleKey]: {
                              ...state,
                              enabled: e.target.checked,
                            },
                          }));
                        }}
                        className="w-4 h-4 rounded border-slate-700 text-amber-500 focus:ring-amber-500/40 cursor-pointer"
                      />

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-base">{meta.icon}</span>
                          <span className="text-xs font-bold text-white">{meta.label}</span>
                        </div>
                        <span className="text-[10px] text-slate-500 block mt-0.5">
                          Standard Default: {formatCurrency(companyDefault)} / day
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400 font-bold">₹</span>
                      <input
                        type="number"
                        disabled={!state.enabled}
                        value={state.wage || ""}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setModalRates((prev) => ({
                            ...prev,
                            [roleKey]: {
                              ...state,
                              wage: val,
                            },
                          }));
                        }}
                        placeholder={companyDefault.toString()}
                        className="w-24 bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-sm font-bold text-white text-right focus:outline-none focus:border-amber-500 disabled:opacity-40 disabled:cursor-not-allowed"
                      />
                      <span className="text-[11px] text-slate-500">/ day</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between">
              <span className="text-xs text-slate-400">
                {Object.values(modalRates).filter((v) => v.enabled && v.wage > 0).length} roles enabled
              </span>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setEditingEmployee(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSavingRates}
                  onClick={handleSaveRates}
                  className="px-5 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs transition-all flex items-center gap-2 shadow-lg shadow-amber-500/20 disabled:opacity-50 cursor-pointer"
                >
                  {isSavingRates ? (
                    <>Saving Rates...</>
                  ) : (
                    <>
                      <Save className="w-3.5 h-3.5" />
                      Save Rates
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
