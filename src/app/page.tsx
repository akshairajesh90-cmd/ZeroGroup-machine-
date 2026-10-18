"use client";

import React, { useState } from "react";
import { useFormState, useFormStatus } from "react-dom";
import { authenticate } from "@/actions/auth";
import { Shield, Truck, Lock, Mail, AlertCircle, ArrowRight, CheckCircle2 } from "lucide-react";

function LoginButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:from-indigo-500 hover:to-blue-500 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? (
        <span className="flex items-center gap-2">
          <svg className="h-4 w-4 animate-spin text-white" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Securing Session...
        </span>
      ) : (
        <>
          <span>Sign In to Portal</span>
          <ArrowRight className="h-4 w-4" />
        </>
      )}
    </button>
  );
}

export default function LoginPage() {
  const [errorMessage, dispatch] = useFormState(authenticate, undefined);
  const [activeTab, setActiveTab] = useState<"ADMIN" | "DRIVER">("ADMIN");

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-slate-950 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans">
      {/* Dynamic Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-indigo-600/15 blur-[120px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-10%] h-[500px] w-[500px] rounded-full bg-blue-600/15 blur-[120px] pointer-events-none" />

      <div className="relative z-10 w-full max-w-md">
        {/* Brand Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-indigo-600 via-blue-600 to-cyan-500 shadow-xl shadow-indigo-500/20 mb-4 ring-1 ring-white/20">
            <Shield className="h-7 w-7 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white sm:text-4xl">
            ZERO <span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">GROUP</span>
          </h1>
          <p className="mt-2 text-xs uppercase tracking-widest text-slate-400 font-semibold">
            Enterprise Equipment & Logistics Portal
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-3xl border border-slate-800/80 bg-slate-900/80 p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          {/* Role selector tab hint */}
          <div className="mb-6 flex rounded-xl bg-slate-950/80 p-1 border border-slate-800">
            <button
              type="button"
              onClick={() => setActiveTab("ADMIN")}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition-all ${
                activeTab === "ADMIN"
                  ? "bg-slate-800 text-white shadow-md"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Shield className="h-3.5 w-3.5 text-indigo-400" />
              Office / Admin
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("DRIVER")}
              className={`flex-1 flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition-all ${
                activeTab === "DRIVER"
                  ? "bg-slate-800 text-white shadow-md"
                  : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <Truck className="h-3.5 w-3.5 text-cyan-400" />
              Field / Driver App
            </button>
          </div>

          <form action={dispatch} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Email or Phone Number
              </label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  name="email"
                  type="text"
                  required
                  placeholder={activeTab === "ADMIN" ? "admin@zerogroup.com or 9876543210" : "driver@zerogroup.com or 9999999999"}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/90 pl-10 pr-4 py-3 text-sm text-white placeholder-slate-600 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                <input
                  name="password"
                  type="password"
                  required
                  placeholder="••••••••••••"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950/90 pl-10 pr-4 py-3 text-sm text-white placeholder-slate-600 outline-none transition-all focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            {errorMessage && (
              <div className="flex items-center gap-2 rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 text-xs font-medium text-rose-400">
                <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
                <p>{errorMessage}</p>
              </div>
            )}

            <div className="pt-2">
              <LoginButton />
            </div>
          </form>

          {/* Security badge footer */}
          <div className="mt-6 border-t border-slate-800/60 pt-4 flex items-center justify-between text-[11px] text-slate-500 font-medium">
            <span className="flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              Role-Based Zero-Trust Auth
            </span>
            <span>v2.2 Production</span>
          </div>
        </div>

        {/* System footer note */}
        <p className="mt-6 text-center text-xs text-slate-600">
          © {new Date().getFullYear()} ZERO GROUP Equipment Rentals. All rights reserved.
        </p>
      </div>
    </div>
  );
}
