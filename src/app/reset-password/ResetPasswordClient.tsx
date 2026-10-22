"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Shield, KeyRound, ArrowLeft, CheckCircle2, AlertCircle, Phone,
  Lock, Sparkles, Send, Smartphone, User, Mail, ShieldCheck, RefreshCw
} from "lucide-react";
import {
  verifyNameAndEmailAction,
  requestPasswordResetOtp,
  verifyOtpAndResetPassword
} from "@/actions/credentials";
import {
  getFirebaseAuth,
  isFirebaseConfigured,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult
} from "@/lib/firebase";

function maskPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length >= 10) {
    const last4 = digits.slice(-4);
    const first2 = digits.slice(-10, -8);
    return `+91 ${first2}••••••${last4}`;
  }
  return phone;
}

export default function ResetPasswordClient({ prefilledIdentifier }: { prefilledIdentifier: string }) {
  const router = useRouter();

  // Mode: "name_email" (default) or "direct_phone"
  const [mode, setMode] = useState<"name_email" | "direct_phone">(
    prefilledIdentifier ? "direct_phone" : "name_email"
  );

  // Name & Email verification state
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [verifiedEmployee, setVerifiedEmployee] = useState<{
    name: string;
    role: string;
    phone: string;
    maskedPhone: string;
  } | null>(null);

  // Direct Phone state
  const [directPhone, setDirectPhone] = useState(prefilledIdentifier);

  // Active phone being targeted for OTP
  const [selectedPhone, setSelectedPhone] = useState(prefilledIdentifier);

  // OTP & Reset state
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Status flags
  const [verifyingIdentity, setVerifyingIdentity] = useState(false);
  const [loadingOtp, setLoadingOtp] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [firebaseStatus, setFirebaseStatus] = useState<string | null>(null);

  // Firebase Phone Auth
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);

  const formatPhoneNumber = (input: string) => {
    const cleaned = input.replace(/\D/g, "");
    if (cleaned.length === 10) return `+91${cleaned}`;
    if (cleaned.startsWith("91") && cleaned.length === 12) return `+${cleaned}`;
    return input.startsWith("+") ? input : `+${cleaned}`;
  };

  const dispatchSmsOtp = async (phoneToTarget: string) => {
    setLoadingOtp(true);
    setFirebaseStatus(null);
    setError(null);

    const formatted = formatPhoneNumber(phoneToTarget);

    // 1. Attempt Google Firebase Carrier SMS
    if (isFirebaseConfigured) {
      try {
        const auth = getFirebaseAuth();
        if (auth) {
          if (!recaptchaVerifierRef.current) {
            recaptchaVerifierRef.current = new RecaptchaVerifier(auth, "recaptcha-container", {
              size: "invisible",
              callback: () => {},
            });
          }
          const confirmation = await signInWithPhoneNumber(auth, formatted, recaptchaVerifierRef.current);
          setConfirmationResult(confirmation);
          setOtpSent(true);
          setFirebaseStatus(`Google Firebase SMS sent to ${formatted}! Check your phone.`);
          setLoadingOtp(false);
          return;
        }
      } catch (fbErr: any) {
        console.warn("[FIREBASE] SMS error, falling back to server OTP:", fbErr);
        // Fallback to internal server-generated OTP if reCAPTCHA or quotas hit issue
      }
    }

    // 2. Server built-in fallback OTP
    try {
      const res = await requestPasswordResetOtp(phoneToTarget);
      if (res.success) {
        setOtpSent(true);
        // Clean professional user experience: do not auto-fill OTP into the user input
        setOtp("");
      } else {
        setError(res.error || "Failed to generate OTP.");
      }
    } finally {
      setLoadingOtp(false);
    }
  };

  // Step 1: Verify Name & Email -> Automatically Select Phone -> Send SMS OTP
  const handleVerifyNameAndEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !email.trim()) {
      setError("Please enter both your registered Full Name and Email Address.");
      return;
    }

    setError(null);
    setVerifyingIdentity(true);
    try {
      const res = await verifyNameAndEmailAction({
        name: fullName,
        email: email,
      });

      if (!res.success || !res.phone) {
        setError(res.error || "Verification failed. Please check your Name and Email.");
        return;
      }

      // Automatically select the verified phone
      setVerifiedEmployee({
        name: res.employeeName || fullName,
        role: res.employeeRole || "Employee",
        phone: res.phone,
        maskedPhone: res.maskedPhone || res.phone,
      });
      setSelectedPhone(res.phone);

      // Automatically dispatch SMS OTP to that selected phone
      await dispatchSmsOtp(res.phone);
    } finally {
      setVerifyingIdentity(false);
    }
  };

  // Alternate Step 1: Direct Phone input
  const handleDirectPhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!directPhone.trim()) {
      setError("Please enter your registered mobile number.");
      return;
    }
    setSelectedPhone(directPhone.trim());
    await dispatchSmsOtp(directPhone.trim());
  };

  // Step 2: Verify OTP & Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const targetPhone = selectedPhone || directPhone || email;
    if (!targetPhone) {
      setError("Missing account phone number. Please verify your identity first.");
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

      // Confirm with Google Firebase if SMS was dispatched via Firebase
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
        phoneOrEmail: targetPhone,
        otp: otp.trim(),
        newPassword: newPassword.trim(),
        firebaseVerified: isFirebaseVerified,
      });

      if (res.success) {
        setSuccessMsg(res.message || "Password successfully updated! Redirecting to login...");
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
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4 sm:p-6 pb-28 font-sans">
      <div className="w-full max-w-md space-y-6">
        
        {/* Top Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Portal Sign In
        </Link>

        {/* Main Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl space-y-6">
          <div className="text-center space-y-2">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 mb-2">
              <KeyRound className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">OTP Password Reset</h1>
            <p className="text-xs text-slate-400">
              {otpSent
                ? "Enter the 6-digit SMS code sent to your registered mobile."
                : "Verify your Name & Email to automatically send a reset OTP to your phone."}
            </p>
          </div>

          {/* Verification Mode Switcher (if not yet sent OTP) */}
          {!otpSent && (
            <div className="grid grid-cols-2 gap-1 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs font-semibold">
              <button
                type="button"
                onClick={() => {
                  setMode("name_email");
                  setError(null);
                }}
                className={`py-2 rounded-lg transition-all ${
                  mode === "name_email"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Name & Email Verify
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode("direct_phone");
                  setError(null);
                }}
                className={`py-2 rounded-lg transition-all ${
                  mode === "direct_phone"
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Direct Mobile No.
              </button>
            </div>
          )}

          {/* Success Notification */}
          {successMsg ? (
            <div className="p-5 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-sm flex flex-col items-center gap-2 text-center animate-in fade-in">
              <CheckCircle2 className="h-10 w-10 text-emerald-400" />
              <p className="font-bold text-base">{successMsg}</p>
              <p className="text-xs text-emerald-400/80">Taking you back to the sign in portal...</p>
            </div>
          ) : !otpSent ? (
            /* STEP 1: VERIFICATION FORM */
            mode === "name_email" ? (
              <form onSubmit={handleVerifyNameAndEmail} className="space-y-4">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Registered Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="e.g. Suresh Kumar"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-10 pr-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                {/* Email Address */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Registered Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g. suresh@zerogroup.in"
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

                {/* Verify & Send OTP Button */}
                <button
                  type="submit"
                  disabled={verifyingIdentity || loadingOtp}
                  className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:from-indigo-500 hover:to-blue-500 active:scale-[0.98] disabled:opacity-60"
                >
                  {verifyingIdentity || loadingOtp ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Verifying Identity & Sending SMS...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Verify Identity & Send SMS OTP
                    </>
                  )}
                </button>
              </form>
            ) : (
              /* Direct Mobile Number Form */
              <form onSubmit={handleDirectPhoneSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                    Registered Mobile Number
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                      type="tel"
                      required
                      value={directPhone}
                      onChange={(e) => setDirectPhone(e.target.value)}
                      placeholder="9876543210 or +919876543210"
                      className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-10 pr-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                </div>

                {error && (
                  <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    <p>{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loadingOtp || !directPhone.trim()}
                  className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:from-indigo-500 hover:to-blue-500 active:scale-[0.98] disabled:opacity-60"
                >
                  {loadingOtp ? (
                    <>
                      <RefreshCw className="h-4 w-4 animate-spin" />
                      Sending SMS OTP...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send SMS OTP to Mobile
                    </>
                  )}
                </button>
              </form>
            )
          ) : (
            /* STEP 2: ENTER OTP & NEW PASSWORD (UNLOCKED ONCE VERIFIED & OTP SENT) */
            <form onSubmit={handleResetPassword} className="space-y-4">
              
              {/* Verified Identity Badge with masked phone */}
              <div className="p-3.5 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-300 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold flex items-center gap-1.5 text-indigo-200">
                    <ShieldCheck className="h-4 w-4 text-emerald-400" />
                    Identity Verified
                  </span>
                  {verifiedEmployee && (
                    <span className="text-[10px] uppercase font-bold tracking-wider bg-indigo-500/20 text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-500/30">
                      {verifiedEmployee.role}
                    </span>
                  )}
                </div>
                <p className="text-slate-300 text-xs">
                  Account: <strong className="text-white">{verifiedEmployee?.name || "Verified User"}</strong> • Mobile:{" "}
                  <strong className="text-emerald-300 font-mono tracking-wider">
                    {maskPhoneNumber(verifiedEmployee?.phone || selectedPhone)}
                  </strong>
                </p>
              </div>

              {/* Status Message */}
              {firebaseStatus && (
                <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-blue-300 text-xs flex items-center gap-2">
                  <Smartphone className="h-4 w-4 shrink-0 text-blue-400" />
                  <p>{firebaseStatus}</p>
                </div>
              )}

              {/* 6-Digit OTP Input */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5 flex items-center justify-between">
                  <span>6-Digit Verification Code (OTP)</span>
                  <button
                    type="button"
                    onClick={() => dispatchSmsOtp(selectedPhone)}
                    disabled={loadingOtp}
                    className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
                  >
                    {loadingOtp ? "Resending..." : "Resend SMS"}
                  </button>
                </label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="• • • • • •"
                  className="w-full tracking-[0.5em] text-center font-mono text-2xl font-black rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white placeholder-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                />
                <p className="text-[11px] text-slate-500 mt-1 text-center">
                  Enter the 6-digit verification code sent to your registered mobile
                </p>
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
                    required
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password (min. 4 characters)"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-10 pr-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              {/* Confirm New Password */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-300 mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                  <input
                    type="password"
                    required
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
                className="w-full mt-2 flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-emerald-500/25 transition-all hover:from-emerald-500 hover:to-teal-500 active:scale-[0.98] disabled:opacity-60"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="h-4 w-4 animate-spin" />
                    Verifying OTP & Updating Password...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Confirm & Set New Password
                  </>
                )}
              </button>

              {/* Back to Step 1 Button */}
              <button
                type="button"
                onClick={() => {
                  setOtpSent(false);
                  setVerifiedEmployee(null);
                  setError(null);
                }}
                className="w-full text-center text-xs text-slate-400 hover:text-white pt-1 transition-colors"
              >
                ← Back to Identity Verification
              </button>
            </form>
          )}

          {/* Invisible Google reCAPTCHA container for Firebase Phone Auth */}
          <div id="recaptcha-container"></div>

          {/* Footer Badge */}
          <div className="border-t border-slate-800/60 pt-4 flex flex-col items-center justify-center text-[11px] text-slate-500 font-medium gap-1 text-center">
            <span className="flex items-center gap-1.5 text-slate-400">
              <Shield className="h-3.5 w-3.5 text-emerald-400" />
              <span>Zero Group Identity & Access Management</span>
            </span>
            <span className="text-[10px] text-slate-600">
              Protected by 256-bit SSL encryption
            </span>
          </div>
        </div>

      </div>
    </div>
  );
}
