"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Phone,
  MessageSquare,
  Building2,
  HardHat,
  Calendar,
  MapPin,
  Clock,
  DollarSign,
  TrendingUp,
  Layers,
  ChevronRight,
  ShieldCheck,
  Award,
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  Edit2,
  Sparkles,
  Calculator,
  UserCheck,
  Activity,
  Receipt,
  Truck,
  Wrench,
} from "lucide-react";
import EditOperatorModal, { ALL_CREW_ROLES } from "@/components/operators/EditOperatorModal";
import { calculateLiftOperatorWage, LIFT_OPERATOR_PER_FLOOR_RATE, OUTSIDE_WORKER_FLAT_WAGE } from "@/lib/pricingEngine";

export interface SerializedOperator {
  id: string;
  name: string;
  phone: string | null;
  role: string;
  operatorType: "INTERNAL" | "SUBCONTRACTOR";
  contractorCoName: string | null;
  defaultCrewRole: string | null;
  capableRoles: string[];
  roleRates: { id: string; crewRole: string; wagePerDay: number }[];
  baseDailyWage: number | null;
  dailyBataRate: number | null;
  createdAt: string;
  profilePhotoUrl: string | null;
  userEmail: string | null;
  userPin: string | null;
  lastLatitude: number | null;
  lastLongitude: number | null;
  lastLocationUpdate: string | null;
  salaryAdvances: {
    id: string;
    amount: number;
    date: string;
    notes: string | null;
    status: string;
    createdAt: string;
  }[];
  locationPings: {
    id: string;
    latitude: number;
    longitude: number;
    accuracy: number | null;
    timestamp: string;
    source: string;
  }[];
  recentDispatches: {
    id: string;
    dateOfService: string;
    customerName: string;
    location: string;
    mapLink: string | null;
    assignedRole: string;
    machineName: string | null;
    liftFloors: number | null;
    wagePaid: number | null;
    status: string;
  }[];
  attendanceHistory: {
    id: string;
    markedAt: string;
    customerName: string;
    siteStatus: string;
    isPresent: boolean;
  }[];
}

const crewRoleMeta: Record<string, { label: string; icon: string; bg: string; text: string; border: string }> = {
  MIXER_OPERATOR:     { label: "Mixer Operator",     icon: "🛠️", bg: "bg-orange-500/10",  text: "text-orange-400",  border: "border-orange-500/30" },
  HYDRAULIC_OPERATOR: { label: "Hydraulic Operator", icon: "🚜", bg: "bg-amber-500/10",   text: "text-amber-400",   border: "border-amber-500/30" },
  VIBRATOR_OPERATOR:  { label: "Vibrator Operator",  icon: "⚡", bg: "bg-yellow-500/10",  text: "text-yellow-400",  border: "border-yellow-500/30" },
  LIFT_OPERATOR:      { label: "Lift Operator",      icon: "🏗️", bg: "bg-blue-500/10",    text: "text-blue-400",    border: "border-blue-500/30" },
  WORKER_LEADER:      { label: "Worker Leader",      icon: "👷", bg: "bg-emerald-500/10", text: "text-emerald-400", border: "border-emerald-500/30" },
  SUB_LEADER:         { label: "Sub Leader",         icon: "👥", bg: "bg-teal-500/10",    text: "text-teal-400",    border: "border-teal-500/30" },
  DRIVER:             { label: "Driver",             icon: "🚚", bg: "bg-cyan-500/10",    text: "text-cyan-400",    border: "border-cyan-500/30" },
  HELPER:             { label: "Helper",             icon: "🤝", bg: "bg-slate-500/10",   text: "text-slate-400",   border: "border-slate-500/30" },
  PANI_HELPER:        { label: "Pani Helper",        icon: "💧", bg: "bg-sky-500/10",     text: "text-sky-400",     border: "border-sky-500/30" },
  TROLLY_1_WHEEL:     { label: "1-Wheel Trolly",     icon: "🛞", bg: "bg-violet-500/10",  text: "text-violet-400",  border: "border-violet-500/30" },
  TROLLY_2_WHEEL:     { label: "2-Wheel Trolly",     icon: "🛞", bg: "bg-purple-500/10",  text: "text-purple-400",  border: "border-purple-500/30" },
  P_VIBRATOR:         { label: "Petrol Vibrator",    icon: "⛽", bg: "bg-rose-500/10",    text: "text-rose-400",    border: "border-rose-500/30" },
};

export default function OperatorProfileClient({ operator }: { operator: SerializedOperator }) {
  const [activeTab, setActiveTab] = useState<"rates" | "dispatches" | "advances" | "gps">("rates");
  const [calcFloor, setCalcFloor] = useState<number>(1);
  const [showEditModal, setShowEditModal] = useState(false);

  const isInternal = operator.operatorType === "INTERNAL";
  const cleanPhone = operator.phone ? operator.phone.replace(/\D/g, "") : "";
  const waPhone = cleanPhone.length === 10 ? `91${cleanPhone}` : cleanPhone;

  // Total pending advances calculation
  const totalAdvances = operator.salaryAdvances.reduce((acc, curr) => acc + curr.amount, 0);
  const pendingAdvances = operator.salaryAdvances
    .filter((a) => a.status === "PENDING")
    .reduce((acc, curr) => acc + curr.amount, 0);

  // Lift operator base rate calculation
  const liftRoleRate = operator.roleRates.find((r) => r.crewRole === "LIFT_OPERATOR")?.wagePerDay 
    ?? (isInternal ? (operator.baseDailyWage ?? 1000) : OUTSIDE_WORKER_FLAT_WAGE);
  const calculatedLiftFloorWage = calculateLiftOperatorWage(liftRoleRate, calcFloor);

  return (
    <div className="min-h-screen bg-zinc-950 text-white p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Top Breadcrumb & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Link
            href="/staff/operators"
            className="inline-flex items-center gap-2 text-sm font-semibold text-zinc-400 hover:text-white transition-colors group"
          >
            <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
            Back to Operators List
          </Link>

          <div className="flex items-center gap-3">
            {operator.phone && (
              <>
                <a
                  href={`tel:${operator.phone}`}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600 hover:text-white transition-all text-xs font-bold"
                >
                  <Phone className="w-3.5 h-3.5" /> Call Operator
                </a>
                <a
                  href={`https://wa.me/${waPhone}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-green-600/20 text-green-400 border border-green-500/30 hover:bg-green-600 hover:text-white transition-all text-xs font-bold"
                >
                  <MessageSquare className="w-3.5 h-3.5" /> WhatsApp
                </a>
              </>
            )}
            <button
              onClick={() => setShowEditModal(true)}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-all text-xs font-bold shadow-lg shadow-blue-600/20"
            >
              <Edit2 className="w-3.5 h-3.5" /> Edit Operator
            </button>
          </div>
        </div>

        {/* HERO PROFILE HEADER */}
        <div className="bg-gradient-to-r from-zinc-900 via-zinc-900/90 to-zinc-950 border border-zinc-800 rounded-3xl p-6 md:p-8 shadow-2xl relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
            <div className="flex items-center gap-5">
              {/* Avatar Photo */}
              <div
                className={`relative flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl text-2xl font-black shadow-inner border ${
                  isInternal
                    ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 shadow-emerald-950"
                    : "bg-purple-500/15 text-purple-400 border-purple-500/30 shadow-purple-950"
                }`}
              >
                {operator.profilePhotoUrl ? (
                  <img
                    src={operator.profilePhotoUrl}
                    alt={operator.name}
                    className="w-full h-full rounded-2xl object-cover"
                  />
                ) : (
                  operator.name.charAt(0).toUpperCase()
                )}
                <span
                  className={`absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-zinc-950 ${
                    operator.lastLocationUpdate ? "bg-emerald-500" : "bg-zinc-600"
                  }`}
                  title={operator.lastLocationUpdate ? "Live Signal Active" : "Offline"}
                />
              </div>

              {/* Name & Titles */}
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-2xl md:text-3xl font-black text-white tracking-tight">
                    {operator.name}
                  </h1>

                  {/* Worker Type Badge */}
                  <span
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black tracking-wide border uppercase ${
                      isInternal
                        ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/30"
                        : "bg-purple-500/15 text-purple-300 border-purple-500/30"
                    }`}
                  >
                    {isInternal ? (
                      <>
                        <Building2 className="w-3.5 h-3.5" /> Company Worker
                      </>
                    ) : (
                      <>
                        <HardHat className="w-3.5 h-3.5" /> Outside Worker
                      </>
                    )}
                  </span>

                  {operator.contractorCoName && (
                    <span className="text-xs px-2.5 py-0.5 rounded-lg bg-zinc-800 text-zinc-300 border border-zinc-700">
                      Co: {operator.contractorCoName}
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-4 text-xs text-zinc-400 font-medium">
                  {operator.phone && (
                    <span className="flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-zinc-500" />
                      +91 {operator.phone}
                    </span>
                  )}
                  {operator.userEmail && (
                    <span className="flex items-center gap-1.5">
                      <UserCheck className="w-3.5 h-3.5 text-zinc-500" />
                      {operator.userEmail}
                    </span>
                  )}
                  <span className="flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                    Onboarded: {new Date(operator.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                  {operator.userPin && (
                    <span className="flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800 font-mono text-[11px] text-zinc-300 border border-zinc-700">
                      PIN: {operator.userPin}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quick Status Pill */}
            <div className="flex flex-col md:items-end gap-1.5 bg-zinc-950/60 p-4 rounded-2xl border border-zinc-800/80">
              <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Default Primary Role</span>
              <div className="flex items-center gap-2">
                {operator.defaultCrewRole && crewRoleMeta[operator.defaultCrewRole] ? (
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-sm font-bold border ${crewRoleMeta[operator.defaultCrewRole].bg} ${crewRoleMeta[operator.defaultCrewRole].text} ${crewRoleMeta[operator.defaultCrewRole].border}`}>
                    <span>{crewRoleMeta[operator.defaultCrewRole].icon}</span>
                    {crewRoleMeta[operator.defaultCrewRole].label}
                  </span>
                ) : (
                  <span className="text-sm font-bold text-zinc-400">Not Assigned</span>
                )}
              </div>
            </div>
          </div>

          {/* Quick Metrics Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-zinc-800/70">
            <div className="bg-zinc-950/40 p-3.5 rounded-2xl border border-zinc-800/50">
              <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Base Daily Wage</p>
              <p className="text-xl font-black text-white mt-1">
                ₹{operator.baseDailyWage ? operator.baseDailyWage.toLocaleString("en-IN") : isInternal ? "1,100" : "1,200"}
                <span className="text-xs font-normal text-zinc-500"> /day</span>
              </p>
            </div>

            <div className="bg-zinc-950/40 p-3.5 rounded-2xl border border-zinc-800/50">
              <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Daily Food Bata</p>
              <p className="text-xl font-black text-amber-400 mt-1">
                ₹{operator.dailyBataRate ? operator.dailyBataRate.toLocaleString("en-IN") : "0"}
                <span className="text-xs font-normal text-zinc-500"> /day</span>
              </p>
            </div>

            <div className="bg-zinc-950/40 p-3.5 rounded-2xl border border-zinc-800/50">
              <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Pending Advance</p>
              <p className={`text-xl font-black mt-1 ${pendingAdvances > 0 ? "text-rose-400" : "text-emerald-400"}`}>
                ₹{pendingAdvances.toLocaleString("en-IN")}
              </p>
            </div>

            <div className="bg-zinc-950/40 p-3.5 rounded-2xl border border-zinc-800/50">
              <p className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Dispatches Done</p>
              <p className="text-xl font-black text-indigo-400 mt-1">
                {operator.recentDispatches.length}
                <span className="text-xs font-normal text-zinc-500"> sites</span>
              </p>
            </div>
          </div>
        </div>

        {/* NAVIGATION TABS */}
        <div className="flex border-b border-zinc-800 gap-2">
          <button
            onClick={() => setActiveTab("rates")}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all ${
              activeTab === "rates"
                ? "border-blue-500 text-blue-400 bg-blue-500/5"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Layers className="w-4 h-4" /> Multi-Role Wage Rate Card
            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-zinc-800 text-zinc-300">
              {operator.capableRoles.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("dispatches")}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all ${
              activeTab === "dispatches"
                ? "border-blue-500 text-blue-400 bg-blue-500/5"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Truck className="w-4 h-4" /> Work & Dispatch History
            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-zinc-800 text-zinc-300">
              {operator.recentDispatches.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("advances")}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all ${
              activeTab === "advances"
                ? "border-blue-500 text-blue-400 bg-blue-500/5"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Receipt className="w-4 h-4" /> Salary Advances
            {pendingAdvances > 0 && (
              <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/30">
                ₹{pendingAdvances}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("gps")}
            className={`flex items-center gap-2 px-5 py-3 text-sm font-bold border-b-2 transition-all ${
              activeTab === "gps"
                ? "border-blue-500 text-blue-400 bg-blue-500/5"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            <Activity className="w-4 h-4" /> Live GPS & Attendance
          </button>
        </div>

        {/* TAB 1: MULTI-ROLE CAPABILITIES & WAGE RATE CARD */}
        {activeTab === "rates" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Explanatory Rule Callout */}
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Multi-Role Capability Architecture
                </h3>
                <p className="text-xs text-zinc-400 max-w-2xl leading-relaxed">
                  {isInternal ? (
                    <>
                      <strong className="text-emerald-400">Zero Group Company Worker:</strong> Paid role-specific wages configured in their rate card. When deployed on a site, their wage automatically locks to the job role they fulfill for that day.
                    </>
                  ) : (
                    <>
                      <strong className="text-purple-400">Outside Worker / Subcontractor:</strong> Flat daily wage of ₹{OUTSIDE_WORKER_FLAT_WAGE}/day across standard operations, unless specifically customized.
                    </>
                  )}
                </p>
              </div>

              <button
                onClick={() => setShowEditModal(true)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-xl text-xs font-bold border border-zinc-700 transition-colors shrink-0"
              >
                Modify Role Wages
              </button>
            </div>

            {/* Qualified Roles Grid */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Qualified Roles & Daily Rates ({operator.capableRoles.length} roles)
              </h4>

              {operator.capableRoles.length === 0 ? (
                <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-8 text-center text-zinc-500">
                  <HardHat className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
                  <p className="font-semibold text-zinc-400">No specific roles tagged yet</p>
                  <p className="text-xs mt-1">Click "Modify Role Wages" to tag the machines and tasks this operator can run.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {operator.capableRoles.map((roleId) => {
                    const meta = crewRoleMeta[roleId];
                    if (!meta) return null;
                    const isPrimary = operator.defaultCrewRole === roleId;
                    const customRate = operator.roleRates.find((r) => r.crewRole === roleId)?.wagePerDay;
                    const finalWage = customRate ?? (isInternal ? (operator.baseDailyWage ?? 1100) : OUTSIDE_WORKER_FLAT_WAGE);

                    return (
                      <div
                        key={roleId}
                        className={`rounded-2xl p-5 border transition-all ${
                          isPrimary
                            ? "bg-zinc-900/90 border-blue-500/40 shadow-lg shadow-blue-500/5 ring-1 ring-blue-500/20"
                            : "bg-zinc-900/50 border-zinc-800 hover:border-zinc-700"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3 mb-3">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{meta.icon}</span>
                            <div>
                              <h5 className="font-bold text-white text-sm">{meta.label}</h5>
                              <p className="text-[10px] text-zinc-500 font-mono">{roleId}</p>
                            </div>
                          </div>
                          {isPrimary && (
                            <span className="px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 text-[10px] font-black border border-blue-500/30">
                              PRIMARY
                            </span>
                          )}
                        </div>

                        <div className="flex items-baseline justify-between pt-3 border-t border-zinc-800/80 mt-2">
                          <span className="text-xs text-zinc-400 font-medium">Daily Wage:</span>
                          <span className="text-lg font-black text-emerald-400">
                            ₹{finalWage.toLocaleString("en-IN")}
                            <span className="text-xs font-normal text-zinc-500"> /day</span>
                          </span>
                        </div>

                        {roleId === "LIFT_OPERATOR" && (
                          <div className="mt-3 p-2.5 rounded-xl bg-blue-500/10 border border-blue-500/20 text-[11px] text-blue-300">
                            🏗️ Includes floor scaling: +₹{LIFT_OPERATOR_PER_FLOOR_RATE}/floor above Floor 1.
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* LIFT OPERATOR FLOOR SCALING CALCULATOR WIDGET */}
            <div className="bg-gradient-to-br from-zinc-900 via-zinc-900 to-blue-950/20 border border-blue-500/30 rounded-3xl p-6 md:p-8 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                  <h3 className="text-lg font-black text-white flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-blue-400" />
                    Lift Operator Floor Wage Matrix
                  </h3>
                  <p className="text-xs text-zinc-400 mt-1">
                    Lift operators earn base pay for 1st Floor, and +₹{LIFT_OPERATOR_PER_FLOOR_RATE} for each additional floor above 1.
                  </p>
                </div>

                <div className="flex items-center gap-2 bg-zinc-950 p-2 rounded-xl border border-zinc-800">
                  <span className="text-xs font-bold text-zinc-400">Select Floor:</span>
                  {[1, 2, 3, 4, 5].map((fl) => (
                    <button
                      key={fl}
                      onClick={() => setCalcFloor(fl)}
                      className={`px-3 py-1 rounded-lg text-xs font-black transition-all ${
                        calcFloor === fl
                          ? "bg-blue-600 text-white shadow-md shadow-blue-500/30"
                          : "bg-zinc-800 text-zinc-400 hover:text-white"
                      }`}
                    >
                      {fl}F
                    </button>
                  ))}
                </div>
              </div>

              {/* Calculator Output Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
                <div className="bg-zinc-950/80 p-4 rounded-2xl border border-zinc-800">
                  <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Base Pay (Floor 1)</span>
                  <p className="text-2xl font-black text-white mt-1">₹{liftRoleRate.toLocaleString("en-IN")}</p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">Covering ground / 1st floor</p>
                </div>

                <div className="bg-zinc-950/80 p-4 rounded-2xl border border-zinc-800">
                  <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">
                    Floor {calcFloor} Add-on ({Math.max(0, calcFloor - 1)} × ₹{LIFT_OPERATOR_PER_FLOOR_RATE})
                  </span>
                  <p className="text-2xl font-black text-blue-400 mt-1">
                    +₹{(Math.max(0, calcFloor - 1) * LIFT_OPERATOR_PER_FLOOR_RATE).toLocaleString("en-IN")}
                  </p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    {calcFloor > 1 ? `${calcFloor - 1} extra floor(s) altitude` : "No height increment"}
                  </p>
                </div>

                <div className="bg-blue-600/10 p-4 rounded-2xl border border-blue-500/40 ring-1 ring-blue-500/20">
                  <span className="text-[11px] font-black text-blue-400 uppercase tracking-wider">
                    Total Daily Wage for Floor {calcFloor}
                  </span>
                  <p className="text-3xl font-black text-emerald-400 mt-1">
                    ₹{calculatedLiftFloorWage.toLocaleString("en-IN")}
                  </p>
                  <p className="text-[11px] text-emerald-400/80 mt-0.5 font-semibold">
                    Automatically applied on dispatch
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: WORK & DISPATCH HISTORY */}
        {activeTab === "dispatches" && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
              Site Dispatches & History ({operator.recentDispatches.length})
            </h4>

            {operator.recentDispatches.length === 0 ? (
              <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-12 text-center text-zinc-500">
                <Truck className="w-10 h-10 mx-auto mb-3 text-zinc-600" />
                <p className="font-semibold text-zinc-400">No dispatch records found</p>
                <p className="text-xs mt-1">This operator has not been deployed on active dispatches yet.</p>
              </div>
            ) : (
              <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-zinc-900/90 text-xs font-bold uppercase text-zinc-400 border-b border-zinc-800">
                      <tr>
                        <th className="px-6 py-4">Date</th>
                        <th className="px-6 py-4">Customer & Site</th>
                        <th className="px-6 py-4">Role on Job</th>
                        <th className="px-6 py-4">Machine / Asset</th>
                        <th className="px-6 py-4">Wage Earned</th>
                        <th className="px-6 py-4">Status</th>
                        <th className="px-6 py-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60">
                      {operator.recentDispatches.map((d) => (
                        <tr key={d.id} className="hover:bg-zinc-800/30 transition-colors">
                          <td className="px-6 py-4 whitespace-nowrap text-zinc-300 font-mono text-xs">
                            {new Date(d.dateOfService).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })}
                          </td>
                          <td className="px-6 py-4">
                            <p className="font-semibold text-white">{d.customerName}</p>
                            <p className="text-xs text-zinc-500 flex items-center gap-1 mt-0.5">
                              <MapPin className="w-3 h-3" /> {d.location}
                            </p>
                          </td>
                          <td className="px-6 py-4">
                            <span className="px-2.5 py-1 rounded-lg bg-zinc-800 text-zinc-200 text-xs font-bold border border-zinc-700">
                              {d.assignedRole}
                            </span>
                            {d.liftFloors && d.liftFloors > 1 && (
                              <span className="ml-1 text-[11px] text-blue-400 font-semibold">
                                ({d.liftFloors} Floors)
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-zinc-400 text-xs font-mono">
                            {d.machineName || "—"}
                          </td>
                          <td className="px-6 py-4 font-black text-emerald-400">
                            {d.wagePaid ? `₹${d.wagePaid.toLocaleString("en-IN")}` : "Standard"}
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`text-[11px] font-black px-2.5 py-1 rounded-full uppercase ${
                                d.status === "COMPLETED"
                                  ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                  : d.status === "IN_PROGRESS"
                                  ? "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                                  : "bg-blue-500/15 text-blue-400 border border-blue-500/30"
                              }`}
                            >
                              {d.status.replace("_", " ")}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <Link
                              href={`/staff/dispatch`}
                              className="text-xs font-bold text-blue-400 hover:text-blue-300 hover:underline"
                            >
                              View Board
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SALARY ADVANCES */}
        {activeTab === "advances" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Advance Metrics */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-zinc-900/60 p-5 rounded-2xl border border-zinc-800">
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Total Advances Taken</span>
                <p className="text-2xl font-black text-white mt-1">₹{totalAdvances.toLocaleString("en-IN")}</p>
                <p className="text-xs text-zinc-500 mt-1">All recorded advances</p>
              </div>

              <div className="bg-zinc-900/60 p-5 rounded-2xl border border-zinc-800">
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wider">Settled Amount</span>
                <p className="text-2xl font-black text-emerald-400 mt-1">
                  ₹{(totalAdvances - pendingAdvances).toLocaleString("en-IN")}
                </p>
                <p className="text-xs text-zinc-500 mt-1">Deducted in payroll settlements</p>
              </div>

              <div className="bg-rose-500/10 p-5 rounded-2xl border border-rose-500/30 ring-1 ring-rose-500/20">
                <span className="text-[11px] font-black text-rose-400 uppercase tracking-wider">Current Pending Balance</span>
                <p className="text-3xl font-black text-rose-400 mt-1">₹{pendingAdvances.toLocaleString("en-IN")}</p>
                <p className="text-xs text-rose-300/80 mt-1 font-semibold">To be recovered in next settlement</p>
              </div>
            </div>

            {/* Advances Table */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Advance Ledger Entries ({operator.salaryAdvances.length})
                </h4>
                <Link
                  href="/admin/advances"
                  className="text-xs font-bold text-blue-400 hover:text-blue-300 hover:underline flex items-center gap-1"
                >
                  Manage in Advances Hub <ExternalLink className="w-3 h-3" />
                </Link>
              </div>

              {operator.salaryAdvances.length === 0 ? (
                <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-12 text-center text-zinc-500">
                  <Receipt className="w-10 h-10 mx-auto mb-3 text-zinc-600" />
                  <p className="font-semibold text-zinc-400">No salary advances recorded</p>
                  <p className="text-xs mt-1">Operator has not requested any salary advances.</p>
                </div>
              ) : (
                <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <thead className="bg-zinc-900/90 text-xs font-bold uppercase text-zinc-400 border-b border-zinc-800">
                        <tr>
                          <th className="px-6 py-4">Date</th>
                          <th className="px-6 py-4">Amount</th>
                          <th className="px-6 py-4">Notes / Reason</th>
                          <th className="px-6 py-4">Status</th>
                          <th className="px-6 py-4 text-right">Recorded At</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-800/60">
                        {operator.salaryAdvances.map((adv) => (
                          <tr key={adv.id} className="hover:bg-zinc-800/30 transition-colors">
                            <td className="px-6 py-4 whitespace-nowrap text-zinc-300 font-mono text-xs">
                              {new Date(adv.date).toLocaleDateString("en-IN", {
                                day: "numeric",
                                month: "short",
                                year: "numeric",
                              })}
                            </td>
                            <td className="px-6 py-4 font-black text-rose-400">
                              ₹{adv.amount.toLocaleString("en-IN")}
                            </td>
                            <td className="px-6 py-4 text-zinc-300 text-xs">
                              {adv.notes || "Emergency / Cash advance"}
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase ${
                                  adv.status === "SETTLED"
                                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                                    : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                                }`}
                              >
                                {adv.status}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-right text-zinc-500 text-xs font-mono">
                              {new Date(adv.createdAt).toLocaleDateString("en-IN")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: LIVE GPS & ATTENDANCE */}
        {activeTab === "gps" && (
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Last Known Coordinates Card */}
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-3xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <span className={`w-3 h-3 rounded-full ${operator.lastLatitude ? "bg-emerald-500 animate-ping" : "bg-zinc-600"}`} />
                  <h3 className="text-lg font-black text-white">Last Recorded GPS Location</h3>
                </div>
                {operator.lastLatitude && operator.lastLongitude ? (
                  <div className="space-y-1">
                    <p className="text-sm font-mono text-zinc-300">
                      Latitude: <strong className="text-white">{operator.lastLatitude.toFixed(6)}</strong> | Longitude: <strong className="text-white">{operator.lastLongitude.toFixed(6)}</strong>
                    </p>
                    {operator.lastLocationUpdate && (
                      <p className="text-xs text-zinc-400">
                        Updated: {new Date(operator.lastLocationUpdate).toLocaleString("en-IN")}
                      </p>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-zinc-500">No GPS coordinates recorded for this device yet.</p>
                )}
              </div>

              {operator.lastLatitude && operator.lastLongitude && (
                <a
                  href={`https://www.google.com/maps?q=${operator.lastLatitude},${operator.lastLongitude}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-lg shadow-blue-500/20"
                >
                  <MapPin className="w-4 h-4" /> Open in Google Maps
                </a>
              )}
            </div>

            {/* GPS Pings Table */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Recent Device Pings ({operator.locationPings.length})
              </h4>

              {operator.locationPings.length === 0 ? (
                <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-2xl p-10 text-center text-zinc-500">
                  <Activity className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
                  <p className="font-semibold text-zinc-400">No telemetry pings logged</p>
                  <p className="text-xs mt-1">Pings will automatically appear when the worker logs into Capacitor mobile or web.</p>
                </div>
              ) : (
                <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-zinc-900/90 text-xs font-bold uppercase text-zinc-400 border-b border-zinc-800">
                      <tr>
                        <th className="px-6 py-4">Timestamp</th>
                        <th className="px-6 py-4">Latitude</th>
                        <th className="px-6 py-4">Longitude</th>
                        <th className="px-6 py-4">Accuracy</th>
                        <th className="px-6 py-4 text-right">Source</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-800/60 font-mono text-xs">
                      {operator.locationPings.map((ping) => (
                        <tr key={ping.id} className="hover:bg-zinc-800/30 transition-colors">
                          <td className="px-6 py-4 text-zinc-300">
                            {new Date(ping.timestamp).toLocaleString("en-IN")}
                          </td>
                          <td className="px-6 py-4 text-white font-bold">{ping.latitude.toFixed(6)}</td>
                          <td className="px-6 py-4 text-white font-bold">{ping.longitude.toFixed(6)}</td>
                          <td className="px-6 py-4 text-zinc-400">{ping.accuracy ? `${ping.accuracy.toFixed(1)} m` : "—"}</td>
                          <td className="px-6 py-4 text-right text-zinc-500">{ping.source}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

      </div>

      {/* Edit Operator Modal */}
      {showEditModal && (
        <EditOperatorModal
          operator={{
            id: operator.id,
            name: operator.name,
            phone: operator.phone,
            role: operator.role as any,
            operatorType: operator.operatorType,
            contractorCoName: operator.contractorCoName,
            defaultCrewRole: operator.defaultCrewRole,
            capableRoles: operator.capableRoles,
            roleRates: operator.roleRates,
            baseDailyWage: operator.baseDailyWage,
            dailyBataRate: operator.dailyBataRate,
          }}
          onClose={() => setShowEditModal(false)}
          onSuccess={() => {
            setShowEditModal(false);
            window.location.reload();
          }}
        />
      )}
    </div>
  );
}
