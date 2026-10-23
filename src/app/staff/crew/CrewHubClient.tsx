"use client";

import React, { useState } from "react";
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
} from "lucide-react";

interface RoleRate {
  id: string;
  crewRole: string;
  wagePerDay: number;
}

interface EmployeeItem {
  id: string;
  name: string;
  role: string;
  phone: string | null;
  profilePhotoUrl: string | null;
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

interface WorkTypeRateItem {
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

export default function CrewHubClient({ employees, workTypeRates, currentUserEmployeeId }: Props) {
  const [activeTab, setActiveTab] = useState<"directory" | "rates">("directory");
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const filteredEmployees = employees.filter((e) => {
    const matchesSearch =
      e.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (e.phone && e.phone.includes(searchTerm)) ||
      (e.contractorCoName && e.contractorCoName.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesRole =
      roleFilter === "ALL" ? true : e.role === roleFilter || e.defaultCrewRole === roleFilter;

    return matchesSearch && matchesRole;
  });

  const operatorsList = employees.filter((e) => e.role === "OPERATOR");

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-8 space-y-6">
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
            <Users className="w-8 h-8 text-emerald-400" />
            Crew Directory & Operator Rates
          </h1>
          <p className="text-slate-400 text-sm mt-1">
            Personnel contact list, field communications, and operator role work rate cards.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 p-1.5 rounded-2xl">
          <button
            onClick={() => setActiveTab("directory")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "directory"
                ? "bg-emerald-600 text-white shadow-lg shadow-emerald-600/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <Phone className="w-3.5 h-3.5" />
            Crew Directory ({employees.length})
          </button>
          <button
            onClick={() => setActiveTab("rates")}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === "rates"
                ? "bg-amber-600 text-white shadow-lg shadow-amber-600/20"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <HardHat className="w-3.5 h-3.5" />
            Operator Rates ({operatorsList.length})
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by name, phone number, company..."
            className="w-full bg-slate-900/90 border border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500/50"
          />
        </div>

        <div className="flex items-center gap-2">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-slate-900/90 border border-slate-800 rounded-2xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-emerald-500/50"
          >
            <option value="ALL">All Roles</option>
            <option value="OPERATOR">Operators</option>
            <option value="DRIVER">Drivers</option>
            <option value="WORKER">Workers</option>
            <option value="STAFF">Office Staff</option>
          </select>
        </div>
      </div>

      {/* TAB 1: CREW DIRECTORY */}
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
                className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all shadow-lg flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-white text-sm">
                        {emp.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-base leading-snug">{emp.name}</h3>
                        <p className="text-xs text-slate-400 flex items-center gap-1.5 mt-0.5">
                          <span className="font-semibold text-emerald-400">{emp.role}</span>
                          {emp.defaultCrewRole && (
                            <span className="text-slate-500">• {emp.defaultCrewRole}</span>
                          )}
                        </p>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                        emp.operatorType === "INTERNAL"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                      }`}
                    >
                      {emp.operatorType || "INTERNAL"}
                    </span>
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
                        Role Rate Cards
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {emp.roleRates.map((rr) => (
                          <span
                            key={rr.id}
                            className="text-[11px] px-2 py-0.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300"
                          >
                            {rr.crewRole}: <strong className="text-amber-400">{formatCurrency(rr.wagePerDay)}</strong>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between text-xs text-slate-500">
                  <span>ID: {emp.id.slice(-6)}</span>
                  <Link
                    href={`/staff/operators/${emp.id}`}
                    className="text-emerald-400 hover:text-emerald-300 font-semibold flex items-center gap-1"
                  >
                    Details <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* TAB 2: OPERATOR RATE CARDS & WORK PRICING */}
      {activeTab === "rates" && (
        <div className="space-y-6">
          {/* Work-Type Rates Matrix */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <HardHat className="w-5 h-5 text-amber-400" />
                  Machine Work-Type Rate Matrix
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Standard job payouts for machine operators vs customer rental charges.
                </p>
              </div>
              <Link
                href="/staff/operators"
                className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs transition-all shadow"
              >
                Manage Operator Profiles →
              </Link>
            </div>

            {workTypeRates.length === 0 ? (
              <p className="text-sm text-slate-500 italic py-6 text-center">
                No work-type rates configured yet. Rates can be set in Admin Settings.
              </p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {workTypeRates.map((wtr) => (
                  <div
                    key={wtr.id}
                    className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                          {wtr.machineType}
                        </span>
                        <span className="text-[11px] px-2 py-0.5 rounded-md bg-slate-800 text-slate-300">
                          {wtr.workType}
                        </span>
                      </div>
                      <div className="mt-2 space-y-1 text-xs">
                        <div className="flex justify-between py-1 border-b border-slate-800/80">
                          <span className="text-slate-400">Operator Payout:</span>
                          <span className="font-bold text-emerald-400 text-sm">
                            {formatCurrency(wtr.payoutRate)} / day
                          </span>
                        </div>
                        {wtr.customerCharge && (
                          <div className="flex justify-between py-1">
                            <span className="text-slate-400">Customer Charge:</span>
                            <span className="font-bold text-slate-200">
                              {formatCurrency(wtr.customerCharge)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Individual Operator Rate Cards */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              Per-Operator Role Wage Cards
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {operatorsList.map((op) => (
                <div
                  key={op.id}
                  className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="h-8 w-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center font-bold text-amber-400 text-xs">
                          {op.name.charAt(0)}
                        </div>
                        <div>
                          <h4 className="font-bold text-white text-sm">{op.name}</h4>
                          <p className="text-[11px] text-slate-400">
                            {op.defaultCrewRole || "General Operator"}
                          </p>
                        </div>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-bold text-emerald-400">
                          {op.baseDailyWage ? formatCurrency(op.baseDailyWage) : "₹1,000"} / day
                        </span>
                        {op.dailyBataRate ? (
                          <p className="text-[10px] text-slate-500">
                            + {formatCurrency(op.dailyBataRate)} Bata
                          </p>
                        ) : null}
                      </div>
                    </div>

                    {/* Role Rates list */}
                    {op.roleRates && op.roleRates.length > 0 && (
                      <div className="mt-3 pt-2 border-t border-slate-800/80 space-y-1">
                        {op.roleRates.map((rr) => {
                          const meta = crewRoleMeta[rr.crewRole] || {
                            label: rr.crewRole,
                            icon: "⚙️",
                          };
                          return (
                            <div
                              key={rr.id}
                              className="flex items-center justify-between text-xs py-1 px-2 rounded-lg bg-slate-900"
                            >
                              <span className="text-slate-300 flex items-center gap-1.5">
                                <span>{meta.icon}</span>
                                {meta.label}
                              </span>
                              <span className="font-bold text-amber-400">
                                {formatCurrency(rr.wagePerDay)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-800/60 flex justify-end">
                    <Link
                      href={`/staff/operators/${op.id}`}
                      className="text-xs text-emerald-400 hover:underline font-semibold flex items-center gap-1"
                    >
                      Edit Wage Rates <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
