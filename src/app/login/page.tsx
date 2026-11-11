"use client";

import React from "react";
import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { authenticate } from "@/actions/auth";
import { Lock, Mail, ArrowRight, ArrowLeft, HardHat } from "lucide-react";

function LoginButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className="w-full flex items-center justify-center gap-2 rounded-lg bg-amber-500 hover:bg-amber-400 px-5 py-3 text-sm font-bold text-slate-950 shadow-sm transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
    >
      {pending ? (
        <span className="flex items-center gap-2">
          <svg className="h-4 w-4 animate-spin text-slate-950" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Authenticating Session...
        </span>
      ) : (
        <>
          <span>Sign In to Plant Portal</span>
          <ArrowRight className="h-4 w-4 text-slate-950" strokeWidth={1.5} />
        </>
      )}
    </button>
  );
}

export default function LoginPage() {
  const [errorMessage, dispatch] = useFormState(authenticate, undefined);

  return (
    <div className="relative min-h-screen w-full bg-slate-950 text-slate-100 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-sans selection:bg-amber-500 selection:text-slate-950">
      
      {/* Back to Public Site link */}
      <div className="absolute top-6 left-6 z-20">
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 px-3.5 py-2 rounded-lg shadow-sm transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5 text-slate-400" strokeWidth={1.5} />
          <span>Back to Yard Website</span>
        </Link>
      </div>

      <div className="relative z-10 w-full max-w-md">
        {/* Brand Header */}
        <div className="mb-8 text-center">
          <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-amber-500 text-slate-950 shadow-sm mb-4 border border-amber-400/30">
            <HardHat className="h-6 w-6 text-slate-950" strokeWidth={1.5} />
          </div>
          <div className="flex items-center justify-center gap-2 mb-1">
            <h1 className="text-2xl font-bold tracking-tight text-white">ZERO GROUP</h1>
            <span className="text-[10px] font-semibold uppercase tracking-wider bg-slate-800 text-amber-400 px-2 py-0.5 rounded border border-slate-700">
              INTERNAL
            </span>
          </div>
          <p className="text-xs font-medium text-slate-400">
            Central Logistics & Field ERP Portal
          </p>
        </div>

        {/* Login Card */}
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-sm">
          <form action={dispatch} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Staff Email or Registered Phone
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="email"
                  required
                  placeholder="name@zerogroup.com or 9847000000"
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-colors font-medium"
                />
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" strokeWidth={1.5} />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-300">
                  Account Password
                </label>
                <Link
                  href="/reset-password"
                  className="text-xs font-semibold text-amber-400 hover:text-amber-300 transition-colors"
                >
                  Forgot Password?
                </Link>
              </div>
              <div className="relative">
                <input
                  type="password"
                  name="password"
                  required
                  placeholder="••••••••••••"
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 pl-10 pr-4 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-colors"
                />
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" strokeWidth={1.5} />
              </div>
            </div>

            {errorMessage && (
              <div className="rounded-lg bg-rose-500/10 border border-rose-500/30 p-3 text-xs font-medium text-rose-300 flex items-center gap-2">
                <span className="font-semibold text-rose-400">Error:</span> {errorMessage}
              </div>
            )}

            <LoginButton />

            <div className="pt-2 text-center text-[11px] text-slate-500 border-t border-slate-800/80">
              <span className="font-mono text-slate-400">Strict 3-Layer Role Guard Active (OCC Enabled)</span>
            </div>
          </form>
        </div>

        {/* System Status Footnote */}
        <div className="mt-8 text-center text-xs text-slate-500">
          <p>ZERO GROUP Heavy Construction Machinery Rentals</p>
          <p className="mt-1 text-[11px] font-mono text-slate-500">Pala • Kottayam • Kerala</p>
        </div>
      </div>
    </div>
  );
}
