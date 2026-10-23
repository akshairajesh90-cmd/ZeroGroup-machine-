"use client";

import React, { useState } from "react";
import Link from "next/link";
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
} from "lucide-react";
import { submitPasswordResetRequestAction } from "@/actions/credentials";
import { Role } from "@prisma/client";

const ROLE_OPTIONS: { value: Role; label: string; description: string }[] = [
  { value: "DRIVER", label: "Fleet Driver", description: "Transit mixer & truck drivers" },
  { value: "OPERATOR", label: "Machine / Plant Operator", description: "Mixer, pump & lift operators" },
  { value: "WORKER", label: "Site Worker / Trolly Crew", description: "Helpers, trolly crew, site crew" },
  { value: "STAFF", label: "Office Staff", description: "Depot & administration staff" },
];

export default function ResetPasswordClient({
  prefilledIdentifier = "",
}: {
  prefilledIdentifier?: string;
}) {
  // If prefilled is numeric, use as phone; otherwise use as name
  const isNumeric = /^\+?\d+$/.test(prefilledIdentifier.trim());
  const [name, setName] = useState(isNumeric ? "" : prefilledIdentifier);
  const [phone, setPhone] = useState(isNumeric ? prefilledIdentifier : "");
  const [role, setRole] = useState<Role>("DRIVER");
  const [notes, setNotes] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submittedData, setSubmittedData] = useState<{
    name: string;
    role: string;
    phone: string;
  } | null>(null);

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

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const res = await submitPasswordResetRequestAction({
        name: name.trim(),
        phone: phone.trim(),
        role: role,
        notes: notes.trim(),
      });

      if (res.success) {
        setSubmittedData({
          name: res.employeeName || name.trim(),
          role: res.employeeRole || role,
          phone: res.phone || phone.trim(),
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-center items-center p-4 sm:p-6 relative selection:bg-emerald-500 selection:text-white">
      {/* Background Ambient Glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 left-1/3 -translate-x-1/2 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-lg relative z-10">
        {/* Header Branding */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-500 p-0.5 shadow-xl shadow-emerald-500/20 mb-3">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <KeyRound className="w-7 h-7 text-emerald-400" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center justify-center gap-2">
            ZERO GROUP
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold tracking-normal">
              PORTAL
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Employee Password Reset Request • Internal Verification
          </p>
        </div>

        {/* Card */}
        <div className="bg-slate-900/85 border border-slate-800 rounded-3xl shadow-2xl backdrop-blur-xl p-6 sm:p-8">
          {!submittedData ? (
            <>
              <div className="mb-6">
                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                  <BadgeCheck className="w-5 h-5 text-emerald-400" />
                  <span>Verify Identity & Request Reset</span>
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Enter your registered Name, Mobile Number, and Role. Once verified against company records, Office Staff will update your password.
                </p>
              </div>

              {errorMsg && (
                <div className="mb-5 flex items-start gap-2.5 p-3.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs animate-shake">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                  <span className="leading-relaxed">{errorMsg}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Full Registered Name</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rajan Pillai"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all font-sans"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Must match your official company crew or ID record.
                  </p>
                </div>

                {/* Mobile Number */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Registered Mobile Number</span>
                  </label>
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9847111003"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all font-mono"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">
                    Enter the 10-digit phone number on file with Zero Group.
                  </p>
                </div>

                {/* Designated Role Selection */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Your Company Role</span>
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {ROLE_OPTIONS.map((opt) => {
                      const isSelected = role === opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() => setRole(opt.value)}
                          className={`text-left p-3 rounded-xl border text-xs transition-all ${
                            isSelected
                              ? "bg-emerald-500/15 border-emerald-500 text-white shadow-sm ring-1 ring-emerald-500/50"
                              : "bg-slate-950/70 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300"
                          }`}
                        >
                          <div className="font-bold flex items-center justify-between">
                            <span>{opt.label}</span>
                            {isSelected && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />}
                          </div>
                          <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">
                            {opt.description}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Optional Note */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-slate-400" />
                    <span>Note to Office Staff (Optional)</span>
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Forgotten PIN, reporting at Aluva Depot"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-all resize-none"
                  />
                </div>

                {/* Info Box */}
                <div className="rounded-xl bg-slate-950/60 border border-slate-800/80 p-3 text-[11px] text-slate-400 space-y-1">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-medium">
                    <Shield className="w-3.5 h-3.5" />
                    <span>Identity Verification:</span>
                  </div>
                  <p className="leading-relaxed">
                    Your request will be validated against database records before alerting office staff. Once approved, staff will set your new password.
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 active:scale-[0.99] text-slate-950 shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all mt-2"
                >
                  {isSubmitting ? (
                    <>
                      <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin" />
                      <span>Verifying & Forwarding...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>Verify & Forward to Staff</span>
                    </>
                  )}
                </button>
              </form>
            </>
          ) : (
            /* Confirmation Card */
            <div className="text-center py-2 space-y-5">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 mx-auto shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="w-9 h-9" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  Request Verified & Forwarded!
                </h2>
                <p className="text-xs text-slate-400 mt-1.5">
                  Your identity has been confirmed against company records and queued for Office Staff.
                </p>
              </div>

              {/* Verified Identity Badge Card */}
              <div className="bg-slate-950/80 border border-emerald-500/30 rounded-2xl p-4 text-left space-y-2 shadow-md">
                <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1">
                    <BadgeCheck className="w-3.5 h-3.5" /> Verified Employee
                  </span>
                  <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                    {submittedData.role}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between py-0.5">
                    <span className="text-slate-500">Employee Name:</span>
                    <strong className="text-white">{submittedData.name}</strong>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-slate-500">Registered Mobile:</span>
                    <span className="font-mono text-slate-300">{submittedData.phone}</span>
                  </div>
                  <div className="flex justify-between py-0.5">
                    <span className="text-slate-500">Queue Status:</span>
                    <span className="text-amber-400 font-semibold flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Waiting for Staff Approval
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3.5 text-left text-xs text-slate-300 leading-relaxed space-y-1">
                <div className="font-bold text-emerald-400 flex items-center gap-1.5 text-[11px]">
                  <Building2 className="w-3.5 h-3.5" /> Next Steps:
                </div>
                <p>
                  Please contact your depot dispatcher or office staff. Once approved, you can log in with your updated credentials.
                </p>
              </div>

              <div className="pt-2">
                <Link
                  href="/"
                  className="w-full inline-flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm bg-slate-800 hover:bg-slate-700 active:scale-[0.99] text-white border border-slate-700 transition-all shadow-md"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Portal Sign In</span>
                </Link>
              </div>
            </div>
          )}

          <div className="mt-6 pt-5 border-t border-slate-800/80 text-center">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-emerald-400 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
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
