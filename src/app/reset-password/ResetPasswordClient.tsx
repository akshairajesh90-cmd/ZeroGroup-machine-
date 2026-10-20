"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shield, KeyRound, ArrowLeft, CheckCircle2, AlertCircle, Phone, Lock, Sparkles, Send, Smartphone } from "lucide-react";
import { requestPasswordResetOtp, verifyOtpAndResetPassword } from "@/actions/credentials";
import { getFirebaseAuth, isFirebaseConfigured, RecaptchaVerifier, signInWithPhoneNumber, ConfirmationResult } from "@/lib/firebase";

export default function ResetPasswordClient({ prefilledIdentifier }: { prefilledIdentifier: string }) {
  const router = useRouter();
  const [identifier, setIdentifier] = useState(prefilledIdentifier);
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  
  const [loadingOtp, setLoadingOtp] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [demoOtpHint, setDemoOtpHint] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [firebaseStatus, setFirebaseStatus] = useState<string | null>(null);

  // Firebase Phone Auth State
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  const isAutoLocked = Boolean(prefilledIdentifier);

  const formatPhoneNumber = (input: string) => {
    const cleaned = input.replace(/\D/g, "");
    if (cleaned.length === 10) return `+91${cleaned}`;
    if (cleaned.startsWith("91") && cleaned.length === 12) return `+${cleaned}`;
    return input.startsWith("+") ? input : `+${cleaned}`;
  };

  const handleRequestOtp = async () => {
    if (!identifier.trim()) {
      setError("Please enter your registered mobile number (or email).");
      return;
    }
    setError(null);
    setLoadingOtp(true);
    setFirebaseStatus(null);

    // Try Google Firebase Phone Auth if configured and input is a phone number
    const isPhone = !identifier.includes("@") && identifier.replace(/\D/g, "").length >= 10;
    
    if (isFirebaseConfigured && isPhone) {
      try {
        const auth = getFirebaseAuth();
        if (auth) {
          if (!recaptchaVerifierRef.current) {
            recaptchaVerifierRef.current = new RecaptchaVerifier(auth, "recaptcha-container", {
              size: "invisible",
              callback: () => {
                // reCAPTCHA solved
              },
            });
          }
          const formattedPhone = formatPhoneNumber(identifier.trim());
          const confirmation = await signInWithPhoneNumber(auth, formattedPhone, recaptchaVerifierRef.current);
          setConfirmationResult(confirmation);
          setOtpSent(true);
          setFirebaseStatus(`Google Firebase SMS sent to ${formattedPhone}! Check your phone.`);
          setLoadingOtp(false);
          return;
        }
      } catch (fbErr: any) {
        console.warn("[FIREBASE] Phone auth error, falling back to server OTP:", fbErr);
        // Fallback to server-generated OTP if reCAPTCHA or Firebase keys encounter issue
      }
    }

    // Default built-in OTP generation
    try {
      const res = await requestPasswordResetOtp(identifier);
      if (res.success) {
        setOtpSent(true);
        if (res.demoOtp) {
          setDemoOtpHint(res.demoOtp);
          setOtp(res.demoOtp); // Auto-fill for convenience if returned
        }
      } else {
        setError(res.error || "Failed to generate OTP.");
      }
    } finally {
      setLoadingOtp(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!identifier.trim()) {
      setError("Mobile number or email is required.");
      return;
    }
    if (!otp.trim() || otp.trim().length !== 6) {
      setError("Please enter the complete 6-digit OTP code.");
      return;
    }
    if (!newPassword || newPassword.length < 4) {
      setError("New password must be at least 4 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match. Please re-enter.");
      return;
    }

    setSubmitting(true);
    try {
      let isFirebaseVerified = false;

      // If SMS was delivered via Google Firebase, confirm with Firebase client first
      if (confirmationResult) {
        try {
          await confirmationResult.confirm(otp.trim());
          isFirebaseVerified = true;
        } catch (verifyErr: any) {
          setError("Invalid or expired SMS code from Google Firebase. Please try again.");
          setSubmitting(false);
          return;
        }
      }

      const res = await verifyOtpAndResetPassword({
        phoneOrEmail: identifier,
        otp: otp.trim(),
        newPassword: newPassword.trim(),
        firebaseVerified: isFirebaseVerified,
      });

      if (res.success) {
        setSuccessMsg(res.message || "Password successfully changed!");
        setTimeout(() => {
          router.push("/");
        }, 2000);
      } else {
        setError(res.error || "Failed to reset password.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 sm:p-6 font-sans">
      <div className="w-full max-w-md space-y-6">
        
        {/* Top Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Portal Sign In
        </Link>

        {/* Card Header */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 mb-2">
              <KeyRound className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">OTP Password Reset</h1>
            <p className="text-xs text-slate-400">
              {isAutoLocked
                ? "Your registered mobile number is pre-filled below."
                : "Enter your registered mobile or email to verify with a 6-digit code."}
            </p>
          </div>

          {/* Success Message */}
          {successMsg ? (
            <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm flex flex-col items-center gap-2 text-center animate-in fade-in">
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
              <p className="font-bold">{successMsg}</p>
              <p className="text-xs text-emerald-400/80">Redirecting to login portal...</p>
            </div>
          ) : (
            <form onSubmit={handleResetPassword} className="space-y-4">
              
              {/* Account Identifier (Phone / Email) */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>Registered Mobile or Email</span>
                  {isAutoLocked && (
                    <span className="text-[10px] text-emerald-400 font-bold bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                      ✓ Auto-Pre-filled
                    </span>
                  )}
                </label>
                <div className="relative">
                  <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="text"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    readOnly={isAutoLocked}
                    placeholder="9876543210 or driver@zerogroup.com"
                    className={`w-full rounded-xl border pl-10 pr-4 py-3 text-sm text-white placeholder-slate-600 outline-none transition-all ${
                      isAutoLocked
                        ? "bg-slate-900 border-slate-700 cursor-not-allowed opacity-90"
                        : "bg-slate-950 border-slate-800 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    }`}
                  />
                </div>
              </div>

              {/* Firebase SMS Status Pill */}
              {firebaseStatus && (
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs flex items-center gap-2">
                  <Smartphone className="h-4 w-4 shrink-0 text-blue-400" />
                  <p>{firebaseStatus}</p>
                </div>
              )}

              {/* OTP Generation / Hint */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={handleRequestOtp}
                  disabled={loadingOtp || !identifier.trim()}
                  className="text-xs font-bold text-indigo-400 hover:text-indigo-300 underline underline-offset-4 disabled:opacity-50"
                >
                  {loadingOtp ? "Dispatching SMS..." : otpSent ? "Resend 6-Digit SMS OTP" : isFirebaseConfigured ? "Send Carrier SMS via Firebase" : "Request / Generate 6-Digit OTP"}
                </button>
                {demoOtpHint && (
                  <span className="text-[11px] font-mono text-cyan-300 bg-cyan-500/20 px-2 py-0.5 rounded border border-cyan-500/30 flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> OTP: <strong>{demoOtpHint}</strong>
                  </span>
                )}
              </div>

              {/* Invisible Google reCAPTCHA container for Firebase */}
              <div id="recaptcha-container"></div>

              {/* 6-Digit OTP Input */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  6-Digit Verification Code (OTP)
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="e.g. 582914"
                  className="w-full tracking-widest text-center font-mono text-xl font-black rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white placeholder-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                />
              </div>

              {/* New Password */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-10 pr-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-10 pr-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              {/* Error Box */}
              {error && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <p>{error}</p>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-4 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:from-indigo-500 hover:to-blue-500 active:scale-[0.98] disabled:opacity-60"
              >
                {submitting ? "Verifying & Updating..." : "Confirm & Set New Password"}
              </button>
            </form>
          )}

          {/* Footer badge */}
          <div className="border-t border-slate-800/60 pt-4 flex flex-col items-center justify-center text-[11px] text-slate-500 font-medium gap-1">
            <span className="flex items-center gap-1.5">
              <Shield className="h-3.5 w-3.5 text-emerald-500" />
              <span>Secure 15-Minute Verified Handshake</span>
            </span>
            <span className="text-[10px] text-indigo-400 font-medium">
              ⚡ Google Firebase Automated Carrier SMS Gateway (10,000 Free SMS/Month)
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
