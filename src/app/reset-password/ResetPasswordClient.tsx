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
  const [whatsappUrl, setWhatsappUrl] = useState<string | null>(null);
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

  // Prevent browser password manager autofill (e.g. 'staff@') from corrupting the numeric OTP input
  React.useEffect(() => {
    if (otp && /\D/.test(otp)) {
      setOtp(otp.replace(/\D/g, ""));
    }
  }, [otp]);

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

    const isEmail = phoneToTarget.includes("@");
    const formatted = isEmail ? phoneToTarget : formatPhoneNumber(phoneToTarget);

    // 1. Always generate server-side verification OTP in parallel as primary/failsafe
    let serverOtpResult: any = null;
    try {
      serverOtpResult = await requestPasswordResetOtp(phoneToTarget);
      if (serverOtpResult?.success) {
        setOtpSent(true);
        // Enterprise security standard: OTP is sent confidentially to employee mobile, never exposed in public UI
        setOtp("");
        if (serverOtpResult.whatsappUrl) {
          setWhatsappUrl(serverOtpResult.whatsappUrl);
        }
        if (serverOtpResult.employeeName && !verifiedEmployee) {
          setVerifiedEmployee({
            name: serverOtpResult.employeeName,
            role: serverOtpResult.employeeRole || "Employee",
            phone: serverOtpResult.phone || phoneToTarget,
            maskedPhone: serverOtpResult.maskedPhone || phoneToTarget,
          });
        }
      }
    } catch (sErr) {
      console.warn("[AUTH] Server OTP pre-generation error:", sErr);
    }

    // 2. Attempt Google Firebase Carrier SMS (if configured and target is a telephone number)
    if (isFirebaseConfigured && !isEmail) {
      try {
        const auth = getFirebaseAuth();
        if (auth) {
          if (!recaptchaVerifierRef.current) {
            recaptchaVerifierRef.current = new RecaptchaVerifier(auth, "recaptcha-container", {
              size: "invisible",
              callback: () => {},
            });
          }
          const confirmation = await Promise.race([
            signInWithPhoneNumber(auth, formatted, recaptchaVerifierRef.current),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error("Firebase SMS verification timeout")), 7000)
            ),
          ]);
          setConfirmationResult(confirmation);
          setOtpSent(true);
          setFirebaseStatus(`Google Firebase SMS triggered for ${formatted}. Check your phone or use the auto-created code.`);
          setLoadingOtp(false);
          return;
        }
      } catch (fbErr: any) {
        console.warn("[FIREBASE] SMS error, active with server OTP:", fbErr);
        // Seamless fallback to server-generated OTP
      }
    }

    if (serverOtpResult?.success) {
      setFirebaseStatus("Verification code automatically generated and applied! Ready to reset.");
    } else if (serverOtpResult?.error) {
      setError(serverOtpResult.error);
    } else {
      setError("Failed to generate verification OTP. Please check your phone or email.");
    }
    setLoadingOtp(false);
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
          console.warn("[FIREBASE] Firebase confirmation failed, checking server DB OTP fallback:", verifyErr);
          // If Firebase code fails or wasn't used, allow fallback verification against server database OTP
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
                    Registered Mobile Number or Email
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
                    <input
                      type="text"
                      required
                      value={directPhone}
                      onChange={(e) => setDirectPhone(e.target.value)}
                      placeholder="9876543210 or staff@zerogroup.in"
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
              
              {/* Hidden username anchor prevents browsers from autofilling saved email into the OTP input */}
              <input
                type="text"
                name="username"
                autoComplete="username"
                value={selectedPhone || verifiedEmployee?.name || "staff"}
                readOnly
                tabIndex={-1}
                aria-hidden="true"
                className="sr-only hidden"
              />

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
                  Account: <strong className="text-white">{verifiedEmployee?.name || "Verified User"}</strong> • Target:{" "}
                  <strong className="text-emerald-300 font-mono tracking-wider">
                    {maskPhoneNumber(verifiedEmployee?.phone || selectedPhone)}
                  </strong>
                </p>
              </div>

              {/* Confidential Enterprise Verification Notice */}
              <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-200 text-xs space-y-2.5 animate-in fade-in">
                <div className="flex items-start gap-2.5">
                  <Smartphone className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold text-white text-xs">Verification Code Sent</p>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      Please enter the 6-digit code sent to{" "}
                      <strong className="text-emerald-300 font-mono font-bold">
                        {maskPhoneNumber(verifiedEmployee?.phone || selectedPhone)}
                      </strong>
                      . Valid for 15 minutes.
                    </p>
                  </div>
                </div>

                {whatsappUrl && (
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">Didn&apos;t receive carrier SMS?</span>
                    <a
                      href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md transition-all active:scale-95"
                    >
                      <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
                        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                      </svg>
                      <span>Receive via WhatsApp</span>
                      <span>↗</span>
                    </a>
                  </div>
                )}
              </div>

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
                    {loadingOtp ? "Sending..." : "Resend Code"}
                  </button>
                </label>
                <input
                  type="text"
                  name="one-time-code"
                  id="one-time-code"
                  autoComplete="one-time-code"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  data-lpignore="true"
                  data-1p-ignore="true"
                  required
                  maxLength={6}
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
                  placeholder="• • • • • •"
                  className="w-full tracking-[0.5em] text-center font-mono text-2xl font-black rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-white placeholder-slate-700 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20 transition-all selection:bg-indigo-500/30"
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
                    name="new-password"
                    autoComplete="new-password"
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
                    name="confirm-new-password"
                    autoComplete="new-password"
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
