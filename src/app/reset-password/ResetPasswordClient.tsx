"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Shield,
  KeyRound,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  User,
  Phone,
  Building2,
  FileText,
  BadgeCheck,
  Check,
} from "lucide-react";
import { submitPasswordResetRequestAction } from "@/actions/credentials";

export const CREW_ALLOCATION_GROUPS = [
  {
    category: "Machine & Equipment Operators",
    roles: [
      { value: "MIXER_OPERATOR", label: "Concrete Mixer Operator" },
      { value: "HYDRAULIC_OPERATOR", label: "Hydraulic Machine Operator" },
      { value: "LIFT_OPERATOR", label: "Lift / Hoist Operator" },
      { value: "VIBRATOR_OPERATOR", label: "Vibrator Operator" },
      { value: "P_VIBRATOR", label: "Petrol Vibrator Operator" },
      { value: "OPERATOR", label: "General Machine Operator" },
    ],
  },
  {
    category: "Drivers & Transport",
    roles: [
      { value: "DRIVER", label: "Fleet Driver" },
    ],
  },
  {
    category: "Site & Trolly Crew",
    roles: [
      { value: "WORKER_LEADER", label: "Site Leader / Mason Lead" },
      { value: "SUB_LEADER", label: "Sub Leader" },
      { value: "TROLLY_1_WHEEL", label: "1-Wheel Trolly Operator" },
      { value: "TROLLY_2_WHEEL", label: "2-Wheel Trolly Operator" },
      { value: "HELPER", label: "General Helper (Site Labour)" },
      { value: "WORKER", label: "General Site Crew / Worker" },
    ],
  },
  {
    category: "Office & Operations Support",
    roles: [
      { value: "STAFF", label: "Office Staff / Depot Assistant" },
    ],
  },
];

export default function ResetPasswordClient({
  prefilledIdentifier = "",
}: {
  prefilledIdentifier?: string;
}) {
  const isNumeric = /^\+?\d+$/.test(prefilledIdentifier.trim());
  const [name, setName] = useState(isNumeric ? "" : prefilledIdentifier);
  const [phone, setPhone] = useState(isNumeric ? prefilledIdentifier : "");
  const [selectedRoles, setSelectedRoles] = useState<string[]>(["OPERATOR"]);
  const [notes, setNotes] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submittedData, setSubmittedData] = useState<{
    name: string;
    role: string;
    roles: string[];
    phone: string;
    capableRoles?: string[];
  } | null>(null);

  const toggleRole = (roleValue: string) => {
    setSelectedRoles((prev) => {
      if (prev.includes(roleValue)) {
        if (prev.length === 1) return prev; // Keep at least one selected
        return prev.filter((r) => r !== roleValue);
      } else {
        return [...prev, roleValue];
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg("Please enter your registered Full Name.");
      return;
    }
    if (!phone.trim()) {
      setErrorMsg("Please enter your registered Mobile Number.");
      return;
    }
    if (selectedRoles.length === 0) {
      setErrorMsg("Please select at least one role / crew skill.");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await submitPasswordResetRequestAction({
        name: name.trim(),
        phone: phone.trim(),
        role: selectedRoles[0],
        roles: selectedRoles,
        notes: notes.trim(),
      });

      if (res.success) {
        setSubmittedData({
          name: res.employeeName || name.trim(),
          role: res.employeeRole || selectedRoles[0],
          roles: selectedRoles,
          phone: res.phone || phone.trim(),
          capableRoles: res.capableRoles || [],
        });
      } else {
        setErrorMsg(res.error || "Details verification failed. Please check your Name, Phone Number, and Role.");
      }
    } catch {
      setErrorMsg("Connection error. Please check your network and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 relative selection:bg-amber-500 selection:text-slate-950 font-sans">
      {/* Main Container */}
      <div className="w-full max-w-lg relative z-10">
        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-slate-900 shadow-md mb-3 border border-slate-800 overflow-hidden p-1">
            <Image
              src="/logo.png"
              alt="ZERO GROUP Logo"
              width={64}
              height={64}
              className="h-full w-full object-contain"
              priority
            />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
            ZERO GROUP
            <span className="text-[10px] px-2 py-0.5 rounded uppercase tracking-wider bg-slate-800 text-amber-400 border border-slate-700 font-semibold">
              PORTAL
            </span>
          </h1>
          <p className="text-xs font-medium text-slate-400 mt-1">
            Employee Password Reset Request • Crew & Role Verified
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-sm p-6 sm:p-8">
          {!submittedData ? (
            <>
              <div className="mb-6">
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <BadgeCheck className="w-5 h-5 text-amber-400" strokeWidth={1.5} />
                  <span>Verify Identity & Request Reset</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Enter your registered Name, Mobile Number, and Role. Once verified, Office Staff will set your password.
                </p>
              </div>

              {errorMsg && (
                <div className="mb-5 flex items-start gap-2.5 p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" strokeWidth={1.5} />
                  <span className="leading-relaxed">{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-slate-400" strokeWidth={1.5} />
                    <span>Full Registered Name</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rajan Pillai"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-colors font-sans"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Must match your official company crew or ID record.
                  </p>
                </div>

                {/* Mobile Number */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400" strokeWidth={1.5} />
                    <span>Registered Mobile Number</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9847111003"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-colors font-mono"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Enter the 10-digit phone number on file with Zero Group.
                  </p>
                </div>

                {/* Designated Role(s) / Crew Allocation Selection */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-slate-400" strokeWidth={1.5} />
                      <span>Select Your Role(s) / Crew Skills</span>
                    </label>
                    <span className="text-[11px] font-semibold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                      {selectedRoles.length} selected
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 mb-2.5">
                    Select one or multiple roles. Operators handling multiple machines can select all applicable roles.
                  </p>

                  <div className="space-y-3 max-h-72 overflow-y-auto pr-1 border border-slate-800 rounded-lg p-2.5 bg-slate-950/60">
                    {CREW_ALLOCATION_GROUPS.map((group) => (
                      <div key={group.category} className="space-y-1.5">
                        <span className="text-[10px] font-semibold tracking-wider uppercase text-slate-400 px-1 block">
                          ── {group.category} ──
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                          {group.roles.map((r) => {
                            const isSelected = selectedRoles.includes(r.value);
                            return (
                              <button
                                key={r.value}
                                type="button"
                                onClick={() => toggleRole(r.value)}
                                className={`min-h-[42px] px-3 py-2 rounded-lg text-xs font-medium text-left flex items-center justify-between transition-colors border ${
                                  isSelected
                                    ? "bg-amber-500/15 border-amber-500/60 text-amber-300 shadow-sm font-semibold"
                                    : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                                }`}
                              >
                                <span className="flex items-center gap-1.5 truncate">
                                  <span className="truncate">{r.label}</span>
                                </span>
                                <span
                                  className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ml-1.5 ${
                                    isSelected
                                      ? "bg-amber-500 border-amber-500 text-slate-950"
                                      : "border-slate-700 bg-slate-950"
                                  }`}
                                >
                                  {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Optional Note */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400" strokeWidth={1.5} />
                    <span>Note to Office Staff (Optional)</span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Forgotten PIN, reporting at Pala Yard"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-colors resize-none"
                  />
                </div>

                {/* Info Box */}
                <div className="rounded-lg bg-slate-950 border border-slate-800 p-3 text-[11px] text-slate-400 space-y-1">
                  <div className="flex items-center gap-1.5 text-amber-400 font-semibold">
                    <Shield className="w-3.5 h-3.5 text-amber-400" strokeWidth={1.5} />
                    <span>Crew Allocation Verification:</span>
                  </div>
                  <p className="leading-relaxed">
                    Matches your name, phone, and any of your designated dispatch or capable crew skills. Once verified, office staff will update your credentials.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-bold text-sm bg-amber-500 hover:bg-amber-400 text-slate-950 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-colors mt-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>Verifying & Forwarding...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 text-slate-950" strokeWidth={1.5} />
                      <span>Verify & Forward to Staff</span>
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            /* Confirmation Card */
            <div className="text-center py-2 space-y-5">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mx-auto shadow-sm">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" strokeWidth={1.5} />
              </div>

              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Request Verified & Forwarded
                </h2>
                <p className="text-xs text-slate-400 mt-1.5">
                  Your identity and crew role have been confirmed against company records.
                </p>
              </div>

              {/* Verified Identity Badge Card */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 text-left space-y-2 shadow-sm">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                    <BadgeCheck className="w-3.5 h-3.5 text-emerald-400" strokeWidth={1.5} /> Verified Crew Member
                  </span>
                  <div className="flex flex-wrap gap-1 justify-end max-w-[65%]">
                    {submittedData.roles && submittedData.roles.length > 0 ? (
                      submittedData.roles.map((r) => (
                        <span key={r} className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          {r.replace(/_/g, " ")}
                        </span>
                      ))
                    ) : (
                      <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        {submittedData.role}
                      </span>
                    )}
                  </div>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between py-0.5">
                    <span className="text-slate-500">Employee Name:</span>
                    <strong className="text-white font-semibold">{submittedData.name}</strong>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-slate-500">Registered Mobile:</span>
                    <span className="font-mono text-slate-300">{submittedData.phone}</span>
                  </div>
                  {submittedData.capableRoles && submittedData.capableRoles.length > 0 && (
                    <div className="pt-1">
                      <span className="text-slate-500 block text-[11px] mb-1">Crew Allocation Capabilities:</span>
                      <div className="flex flex-wrap gap-1">
                        {submittedData.capableRoles.map((skill) => (
                          <span
                            key={skill}
                            className="text-[10px] font-medium bg-slate-900 text-slate-300 border border-slate-800 px-1.5 py-0.5 rounded"
                          >
                            {skill.replace(/_/g, " ")}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="flex justify-between py-0.5 pt-1 border-t border-slate-800">
                    <span className="text-slate-500">Queue Status:</span>
                    <span className="text-amber-400 font-semibold flex items-center gap-1">
                      <Clock className="w-3 h-3 text-amber-400" strokeWidth={1.5} /> Waiting for Staff Approval
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-950 border border-slate-800 rounded-lg p-3.5 text-left text-xs text-slate-400 leading-relaxed space-y-1">
                <div className="font-semibold text-white flex items-center gap-1.5 text-[11px]">
                  <Building2 className="w-3.5 h-3.5 text-amber-400" strokeWidth={1.5} /> Next Steps:
                </div>
                <p>
                  Please contact your yard dispatcher or office staff. Once approved, you can log in with your updated credentials.
                </p>
              </div>

              <div className="pt-2">
                <Link
                  href="/login"
                  className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-bold text-xs bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 transition-colors shadow-sm"
                >
                  <ArrowLeft className="w-4 h-4" strokeWidth={1.5} />
                  <span>Back to Portal Sign In</span>
                </Link>
              </div>
            </div>
          )}

          <div className="mt-6 pt-5 border-t border-slate-800 text-center">
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors font-medium"
            >
              <ArrowLeft className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>Back to Portal Login</span>
            </Link>
          </div>
        </div>

        {/* Footer info */}
        <p className="text-center text-[11px] text-slate-500 mt-6">
          Zero Group Operations & Fleet Management Portal
        </p>
      </div>
    </div>
  );
}
