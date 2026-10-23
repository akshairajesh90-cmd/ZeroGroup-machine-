"use client";

import React, { useState } from "react";
import Link from "next/link";
import {
  Shield, Users, KeyRound, CheckCircle2, Clock, AlertTriangle, Eye, EyeOff,
  Copy, Check, Plus, Search, Filter, Phone, Mail, MapPin, Sparkles,
  FileText, ExternalLink, Lock, RefreshCw, X, ShieldCheck, UserCheck, UserX
} from "lucide-react";
import {
  createManagedEmployee, updateManagedEmployee, verifyOfficialIdAction,
  revokeOfficialIdAction, adminSetPasswordAction, adminGenerateOtpAction,
  resolvePasswordResetRequestAction
} from "@/actions/credentials";
import { Role, CrewRole } from "@prisma/client";

type CredentialEmployee = {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: Role;
  address: string;
  officialIdType: string;
  officialIdNumber: string;
  drivingLicenseNumber: string;
  employeeCode: string;
  isIdVerified: boolean;
  idVerifiedAt: string | null;
  idVerifiedBy: string | null;
  idVerifiedRole: string | null;
  capableRoles: CrewRole[];
  displayPassword: string;
  resetOtp: string | null;
  resetOtpExpires: string | null;
  resetRequested?: boolean;
  resetRequestedAt?: string | null;
  resetRequestNotes?: string | null;
  documents: { id: string; type: string; documentNumber: string; attachmentUrl: string; status: string }[];
  profilePhotoUrl: string | null;
  baseDailyWage: number | null;
  fixedSalary: number | null;
};

const ALL_CREW_ROLES: { value: CrewRole; label: string }[] = [
  { value: "DRIVER", label: "Fleet Driver" },
  { value: "MIXER_OPERATOR", label: "Mixer Operator" },
  { value: "HYDRAULIC_OPERATOR", label: "Hydraulic Operator" },
  { value: "LIFT_OPERATOR", label: "Lift Operator" },
  { value: "VIBRATOR_OPERATOR", label: "Vibrator Operator" },
  { value: "P_VIBRATOR", label: "Petrol Vibrator" },
  { value: "TROLLY_1_WHEEL", label: "1-Wheel Trolly" },
  { value: "TROLLY_2_WHEEL", label: "2-Wheel Trolly" },
  { value: "WORKER_LEADER", label: "Site Leader" },
  { value: "HELPER", label: "General Helper" },
  { value: "PANI_HELPER", label: "Pani Helper" },
];

function formatResetTime(isoString?: string | null) {
  if (!isoString) return "Just now";
  try {
    const d = new Date(isoString);
    let hours = d.getHours();
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";
    hours = hours % 12 || 12;
    return `${String(hours).padStart(2, "0")}:${minutes} ${ampm}`;
  } catch {
    return "Recently";
  }
}

export default function CredentialsHubClient({
  initialEmployees,
  currentUserRole,
  backUrl,
  hubTitle,
}: {
  initialEmployees: CredentialEmployee[];
  currentUserRole: string;
  backUrl: string;
  hubTitle: string;
}) {
  const [employees, setEmployees] = useState(initialEmployees);
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("ALL");
  const [verificationFilter, setVerificationFilter] = useState<string>("ALL");

  // Mask/Reveal password state
  const [revealedPasswords, setRevealedPasswords] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modals state
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSetPassOpen, setIsSetPassOpen] = useState(false);
  const [isOtpOpen, setIsOtpOpen] = useState(false);
  const [selectedEmp, setSelectedEmp] = useState<CredentialEmployee | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formPassword, setFormPassword] = useState("zero123");
  const [formRole, setFormRole] = useState<Role>("DRIVER");
  const [formAddress, setFormAddress] = useState("");
  const [formLicense, setFormLicense] = useState("");
  const [formAadhaar, setFormAadhaar] = useState("");
  const [formSkills, setFormSkills] = useState<CrewRole[]>([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Active OTP state
  const [activeOtpData, setActiveOtpData] = useState<{
    otp: string;
    phone: string;
    resetUrl: string;
    employeeName: string;
  } | null>(null);

  // Document preview modal
  const [previewDocUrl, setPreviewDocUrl] = useState<string | null>(null);

  const isAdminOrOwner = currentUserRole === "ADMIN" || currentUserRole === "OWNER";

  // Filter available roles to assign
  const creatableRoles: Role[] = isAdminOrOwner
    ? ["DRIVER", "OPERATOR", "WORKER", "STAFF", "ADMIN"]
    : ["DRIVER", "OPERATOR", "WORKER", "STAFF"];

  // Toggle Password Visibility
  const toggleRevealPassword = (empId: string) => {
    setRevealedPasswords((prev) => ({ ...prev, [empId]: !prev[empId] }));
  };

  // Copy text to clipboard
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // 1. Verify / Revoke Official ID
  const handleToggleVerification = async (emp: CredentialEmployee) => {
    setActionLoading(true);
    try {
      if (emp.isIdVerified) {
        const res = await revokeOfficialIdAction(emp.id);
        if (res.success) {
          setEmployees((prev) =>
            prev.map((e) => (e.id === emp.id ? { ...e, isIdVerified: false, idVerifiedAt: null, idVerifiedBy: null } : e))
          );
        }
      } else {
        const res = await verifyOfficialIdAction(emp.id);
        if (res.success) {
          setEmployees((prev) =>
            prev.map((e) =>
              e.id === emp.id
                ? {
                    ...e,
                    isIdVerified: true,
                    idVerifiedAt: new Date().toISOString(),
                    idVerifiedBy: currentUserRole,
                    idVerifiedRole: currentUserRole,
                  }
                : e
            )
          );
        }
      }
    } finally {
      setActionLoading(false);
    }
  };

  // 2. Open Create Modal
  const openCreateModal = () => {
    setFormName("");
    setFormEmail("");
    setFormPhone("");
    setFormPassword("zero123");
    setFormRole("DRIVER");
    setFormAddress("");
    setFormLicense("");
    setFormAadhaar("");
    setFormSkills([]);
    setActionError(null);
    setIsCreateOpen(true);
  };

  // Submit Create
  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await createManagedEmployee({
        name: formName,
        email: formEmail,
        phone: formPhone,
        password: formPassword,
        role: formRole,
        address: formAddress,
        drivingLicenseNumber: formLicense,
        officialIdNumber: formAadhaar,
        capableRoles: formSkills,
      });

      if (res.success && res.data) {
        const newEmp = res.data as any;
        setEmployees((prev) => [
          {
            id: newEmp.id,
            name: newEmp.name,
            email: formEmail,
            phone: newEmp.phone || formPhone,
            role: newEmp.role,
            address: newEmp.address || formAddress,
            officialIdType: "DRIVING_LICENSE",
            officialIdNumber: formAadhaar,
            drivingLicenseNumber: formLicense,
            employeeCode: newEmp.employeeCode || `ZG-${newEmp.id.slice(-4).toUpperCase()}`,
            isIdVerified: false,
            idVerifiedAt: null,
            idVerifiedBy: null,
            idVerifiedRole: null,
            capableRoles: formSkills,
            displayPassword: formPassword,
            resetOtp: null,
            resetOtpExpires: null,
            resetRequested: false,
            resetRequestedAt: null,
            resetRequestNotes: null,
            documents: [],
            profilePhotoUrl: null,
            baseDailyWage: null,
            fixedSalary: null,
          },
          ...prev,
        ]);
        setIsCreateOpen(false);
      } else {
        setActionError(res.error || "Failed to create user.");
      }
    } finally {
      setActionLoading(false);
    }
  };

  // 3. Open Edit Modal
  const openEditModal = (emp: CredentialEmployee) => {
    setSelectedEmp(emp);
    setFormName(emp.name);
    setFormPhone(emp.phone);
    setFormRole(emp.role);
    setFormAddress(emp.address);
    setFormLicense(emp.drivingLicenseNumber);
    setFormAadhaar(emp.officialIdNumber);
    setFormSkills(emp.capableRoles);
    setActionError(null);
    setIsEditOpen(true);
  };

  // Submit Edit
  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await updateManagedEmployee(selectedEmp.id, {
        name: formName,
        phone: formPhone,
        role: formRole,
        address: formAddress,
        drivingLicenseNumber: formLicense,
        officialIdNumber: formAadhaar,
        capableRoles: formSkills,
      });

      if (res.success) {
        setEmployees((prev) =>
          prev.map((e) =>
            e.id === selectedEmp.id
              ? {
                  ...e,
                  name: formName,
                  phone: formPhone,
                  role: formRole,
                  address: formAddress,
                  drivingLicenseNumber: formLicense,
                  officialIdNumber: formAadhaar,
                  capableRoles: formSkills,
                }
              : e
          )
        );
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("reset-requests-updated"));
        }
        setIsEditOpen(false);
      } else {
        setActionError(res.error || "Failed to update employee.");
      }
    } finally {
      setActionLoading(false);
    }
  };

  // 4. Generate OTP Reset Action
  const handleGenerateOtp = async (emp: CredentialEmployee) => {
    setActionLoading(true);
    try {
      const res = await adminGenerateOtpAction(emp.id);
      if (res.success && res.otp) {
        setActiveOtpData({
          otp: res.otp,
          phone: res.phone || emp.phone,
          resetUrl: res.resetUrl || `/reset-password?phone=${emp.phone}`,
          employeeName: emp.name,
        });
        setIsOtpOpen(true);
      }
    } finally {
      setActionLoading(false);
    }
  };

  // 5. Direct Set Password
  const openSetPassModal = (emp: CredentialEmployee) => {
    setSelectedEmp(emp);
    setFormPassword("zero123");
    setActionError(null);
    setIsSetPassOpen(true);
  };

  const handleSetPassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmp) return;
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await resolvePasswordResetRequestAction({
        employeeId: selectedEmp.id,
        newPassword: formPassword,
      });
      if (res.success) {
        setEmployees((prev) =>
          prev.map((e) =>
            e.id === selectedEmp.id
              ? {
                  ...e,
                  displayPassword: formPassword,
                  resetRequested: false,
                  resetRequestedAt: null,
                  resetRequestNotes: null,
                }
              : e
          )
        );
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("reset-requests-updated"));
        }
        setIsSetPassOpen(false);
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("reset-requests-updated"));
        }
      } else {
        setActionError(res.error || "Failed to set password.");
      }
    } catch {
      setActionError("Failed to set password.");
    } finally {
      setActionLoading(false);
    }
  };

  // 6. Dismiss Pending Reset Request
  const handleDismissResetRequest = async (employeeId: string) => {
    setActionLoading(true);
    setActionError(null);
    try {
      const res = await resolvePasswordResetRequestAction({
        employeeId,
        dismissOnly: true,
      });
      if (res.success) {
        setEmployees((prev) =>
          prev.map((e) =>
            e.id === employeeId
              ? {
                  ...e,
                  resetRequested: false,
                  resetRequestedAt: null,
                  resetRequestNotes: null,
                }
              : e
          )
        );
        if (typeof window !== "undefined") {
          window.dispatchEvent(new Event("reset-requests-updated"));
        }
      } else {
        setActionError(res.error || "Failed to dismiss request.");
      }
    } catch {
      setActionError("Failed to dismiss request.");
    } finally {
      setActionLoading(false);
    }
  };

  // Filter Logic
  const filteredEmployees = employees.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.phone.includes(searchQuery) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.employeeCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.drivingLicenseNumber.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === "ALL" || emp.role === roleFilter;

    const matchesVerification =
      verificationFilter === "ALL" ||
      (verificationFilter === "VERIFIED" && emp.isIdVerified) ||
      (verificationFilter === "PENDING" && !emp.isIdVerified);

    return matchesSearch && matchesRole && matchesVerification;
  });

  const verifiedCount = employees.filter((e) => e.isIdVerified).length;
  const pendingCount = employees.length - verifiedCount;
  const pendingResetRequests = employees.filter((e) => e.resetRequested);

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20 font-sans">
      
      {/* ── Header Bar ────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <ShieldCheck className="h-6 w-6" />
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">{hubTitle}</h1>
          </div>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            Official ID verification, credentials, password reveal/reset & capability tags.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href={backUrl}
            className="text-xs font-bold text-slate-400 hover:text-white bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-xl transition-colors"
          >
            ← Back
          </Link>
          <button
            type="button"
            onClick={openCreateModal}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-indigo-500/20 active:scale-95 transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Add New Employee</span>
          </button>
        </div>
      </div>

      {/* ── Verification Metric Counters ──────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="text-2xl font-black text-white">{employees.length}</div>
          <div className="text-xs text-slate-400 font-semibold mt-1 flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-slate-500" />
            Total Team
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="text-2xl font-black text-emerald-400">{verifiedCount}</div>
          <div className="text-xs text-slate-400 font-semibold mt-1 flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
            Verified Official IDs
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="text-2xl font-black text-amber-400">{pendingCount}</div>
          <div className="text-xs text-slate-400 font-semibold mt-1 flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-amber-400" />
            Pending Verification
          </div>
        </div>

        <div className={`border rounded-2xl p-4 transition-all ${
          pendingResetRequests.length > 0
            ? "bg-amber-500/10 border-amber-500/40"
            : "bg-slate-900 border-slate-800"
        }`}>
          <div className={`text-2xl font-black ${pendingResetRequests.length > 0 ? "text-amber-400 animate-pulse" : "text-white"}`}>
            {pendingResetRequests.length}
          </div>
          <div className="text-xs text-slate-400 font-semibold mt-1 flex items-center gap-1.5">
            <KeyRound className={`h-3.5 w-3.5 ${pendingResetRequests.length > 0 ? "text-amber-400" : "text-slate-500"}`} />
            Reset Requests Pending
          </div>
        </div>
      </div>

      {/* ── Active Password Reset Requests Queue Panel ───────────────── */}
      {pendingResetRequests.length > 0 && (
        <div className="bg-gradient-to-r from-amber-500/10 via-orange-500/10 to-amber-500/10 border-2 border-amber-500/40 rounded-2xl p-4 sm:p-5 shadow-xl shadow-amber-500/5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-amber-500/20 pb-3">
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                <KeyRound className="h-5 w-5 animate-pulse" />
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    Pending Password Reset Requests
                  </h2>
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500 text-slate-950 shadow-sm animate-pulse">
                    {pendingResetRequests.length} ACTION REQUIRED
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Employees submitted password reset requests via the portal. Set a new password in 1 click or dismiss.
                </p>
              </div>
            </div>
          </div>

          {/* Request Items Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pendingResetRequests.map((req) => (
              <div
                key={req.id}
                className="bg-slate-900/90 border border-amber-500/30 rounded-xl p-4 space-y-3 shadow-md flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                        <span>{req.name}</span>
                        <span className="text-[10px] font-mono font-bold bg-slate-800 text-slate-300 px-1.5 py-0.2 rounded border border-slate-700">
                          {req.employeeCode}
                        </span>
                      </h3>
                      <span className="inline-block mt-1 text-[9px] font-black uppercase px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                        {req.role}
                      </span>
                    </div>
                    <span
                      suppressHydrationWarning
                      className="text-[10px] text-amber-400 font-medium flex items-center gap-1 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20 shrink-0"
                    >
                      <Clock className="w-3 h-3" />
                      {formatResetTime(req.resetRequestedAt)}
                    </span>
                  </div>

                  <div className="mt-2.5 space-y-1 text-xs text-slate-300">
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="font-mono text-slate-200">{req.phone || "No phone"}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span className="truncate text-slate-400">{req.email}</span>
                    </div>
                    {req.capableRoles && req.capableRoles.length > 0 && (
                      <div className="pt-1 flex flex-wrap gap-1">
                        {req.capableRoles.map((skill) => (
                          <span
                            key={skill}
                            className="text-[9px] font-bold bg-slate-950 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.5 rounded"
                          >
                            {skill.replace(/_/g, " ")}
                          </span>
                        ))}
                      </div>
                    )}
                    {req.resetRequestNotes && (
                      <div className="mt-2 p-2 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] text-slate-300 italic">
                        "{req.resetRequestNotes}"
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800 flex items-center gap-2">
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => openSetPassModal(req)}
                    className="flex-1 py-1.5 px-3 rounded-lg font-bold text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md shadow-emerald-500/20 active:scale-95 transition-all flex items-center justify-center gap-1.5"
                  >
                    <KeyRound className="w-3.5 h-3.5" />
                    <span>Set Password</span>
                  </button>
                  <button
                    type="button"
                    disabled={actionLoading}
                    onClick={() => handleDismissResetRequest(req.id)}
                    className="py-1.5 px-3 rounded-lg font-bold text-xs bg-slate-800 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-slate-700 hover:border-rose-500/40 active:scale-95 transition-all"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Search & Filter Controls ──────────────────────────────── */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="relative w-full md:w-80">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search name, phone, code, license..."
            className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-10 pr-4 py-2 text-xs text-white placeholder-slate-600 outline-none focus:border-indigo-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto flex-wrap">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 outline-none font-semibold"
          >
            <option value="ALL">All Roles</option>
            <option value="DRIVER">Drivers</option>
            <option value="OPERATOR">Operators</option>
            <option value="WORKER">Workers</option>
            <option value="STAFF">Office Staff</option>
            {isAdminOrOwner && <option value="ADMIN">Administrators</option>}
          </select>

          <select
            value={verificationFilter}
            onChange={(e) => setVerificationFilter(e.target.value)}
            className="bg-slate-950 border border-slate-800 text-slate-300 text-xs rounded-xl px-3 py-2 outline-none font-semibold"
          >
            <option value="ALL">All Status</option>
            <option value="VERIFIED">Verified Only</option>
            <option value="PENDING">Pending Review Only</option>
          </select>
        </div>
      </div>

      {/* ── Main Credentials & Official IDs Table ─────────────────── */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/80 text-[11px] font-black uppercase tracking-wider text-slate-400">
                <th className="py-3.5 px-4">Employee & Role</th>
                <th className="py-3.5 px-4">Official IDs & Verification</th>
                <th className="py-3.5 px-4">Capability Skills</th>
                <th className="py-3.5 px-4">Login Password</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {filteredEmployees.map((emp) => {
                const isRevealed = revealedPasswords[emp.id] || false;
                const licenseDoc = emp.documents.find((d) => d.type === "LICENSE");
                const aadhaarDoc = emp.documents.find((d) => d.type === "ID_PROOF");
                const isLockedForStaff = !isAdminOrOwner && (emp.role === "ADMIN" || emp.role === "OWNER");

                return (
                  <tr key={emp.id} className="hover:bg-slate-800/25 transition-colors">
                    
                    {/* Employee & Role */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center font-bold text-white text-sm shrink-0">
                          {emp.profilePhotoUrl ? (
                            <img src={emp.profilePhotoUrl} alt={emp.name} className="w-full h-full object-cover" />
                          ) : (
                            emp.name.charAt(0).toUpperCase()
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-white flex items-center gap-1.5 flex-wrap">
                            <span>{emp.name}</span>
                            <span className="text-[10px] font-mono font-bold bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded border border-slate-700">
                              {emp.employeeCode}
                            </span>
                            {emp.resetRequested && (
                              <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.5 rounded animate-pulse">
                                <KeyRound className="h-2.5 w-2.5" /> Reset Requested
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
                            <span>{emp.phone || "No phone"}</span>
                            <span>•</span>
                            <span className="truncate max-w-[140px]">{emp.email}</span>
                          </div>
                          <div className="mt-1">
                            <span className={`inline-flex text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${
                              emp.role === "ADMIN" || emp.role === "OWNER"
                                ? "bg-purple-500/15 text-purple-300 border-purple-500/30"
                                : emp.role === "STAFF"
                                ? "bg-indigo-500/15 text-indigo-300 border-indigo-500/30"
                                : emp.role === "DRIVER"
                                ? "bg-cyan-500/15 text-cyan-300 border-cyan-500/30"
                                : "bg-amber-500/15 text-amber-300 border-amber-500/30"
                            }`}>
                              {emp.role}
                            </span>
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Official IDs & Verification */}
                    <td className="py-3.5 px-4">
                      <div className="space-y-1.5">
                        <div className="text-[11px] text-slate-300 font-mono flex items-center gap-1.5">
                          <span className="text-slate-500 uppercase text-[9px] font-bold">DL:</span>
                          <strong>{emp.drivingLicenseNumber || "Not recorded"}</strong>
                          {licenseDoc && (
                            <button
                              type="button"
                              onClick={() => setPreviewDocUrl(licenseDoc.attachmentUrl)}
                              className="text-[10px] text-cyan-400 hover:text-cyan-300 underline font-sans"
                            >
                              [View DL]
                            </button>
                          )}
                        </div>

                        <div className="text-[11px] text-slate-300 font-mono flex items-center gap-1.5">
                          <span className="text-slate-500 uppercase text-[9px] font-bold">Aadhaar:</span>
                          <span>{emp.officialIdNumber || "Not recorded"}</span>
                          {aadhaarDoc && (
                            <button
                              type="button"
                              onClick={() => setPreviewDocUrl(aadhaarDoc.attachmentUrl)}
                              className="text-[10px] text-cyan-400 hover:text-cyan-300 underline font-sans"
                            >
                              [View ID]
                            </button>
                          )}
                        </div>

                        {/* Verification Action / Pill */}
                        <div className="pt-1 flex items-center gap-2">
                          {emp.isIdVerified ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
                              <CheckCircle2 className="h-3 w-3" />
                              Verified ({emp.idVerifiedRole ? `by ${emp.idVerifiedRole}` : "Verified"})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/30">
                              <Clock className="h-3 w-3" />
                              Pending Verification
                            </span>
                          )}

                          {!isLockedForStaff && (
                            <button
                              type="button"
                              onClick={() => handleToggleVerification(emp)}
                              disabled={actionLoading}
                              className={`text-[10px] font-bold px-2 py-0.5 rounded border transition-colors ${
                                emp.isIdVerified
                                  ? "bg-slate-800 text-slate-400 hover:text-rose-400 border-slate-700"
                                  : "bg-emerald-600 hover:bg-emerald-500 text-white border-emerald-500 shadow-sm"
                              }`}
                            >
                              {emp.isIdVerified ? "Revoke" : "Verify ID ✓"}
                            </button>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Capability Skills */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-1 max-w-[200px]">
                        {emp.capableRoles.length > 0 ? (
                          emp.capableRoles.map((skill) => (
                            <span
                              key={skill}
                              className="text-[10px] font-bold bg-slate-800 text-indigo-300 border border-slate-700 px-2 py-0.5 rounded"
                            >
                              {skill.replace("_", " ")}
                            </span>
                          ))
                        ) : (
                          <span className="text-[11px] text-slate-600 italic">Standard Role</span>
                        )}
                      </div>
                    </td>

                    {/* Login Password */}
                    <td className="py-3.5 px-4">
                      {isLockedForStaff ? (
                        <span className="text-[11px] text-slate-600 font-mono italic">
                          🔒 Administrator Protected
                        </span>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-xs bg-slate-950 px-2.5 py-1 rounded border border-slate-800 text-slate-200 min-w-[70px]">
                            {isRevealed ? emp.displayPassword : "••••••••"}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleRevealPassword(emp.id)}
                            className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white"
                            title={isRevealed ? "Hide Password" : "Show Password"}
                          >
                            {isRevealed ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleCopy(emp.displayPassword, emp.id)}
                            className="p-1 rounded bg-slate-800 text-slate-400 hover:text-white"
                            title="Copy Password"
                          >
                            {copiedId === emp.id ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      {isLockedForStaff ? (
                        <span className="text-[10px] text-slate-600 font-bold uppercase">Locked</span>
                      ) : (
                        <div className="flex items-center justify-end gap-1.5">
                          {/* OTP Reset Link: available for all field staff & employees except Admin/Owner */}
                          {emp.role !== "ADMIN" && emp.role !== "OWNER" && (
                            <button
                              type="button"
                              onClick={() => handleGenerateOtp(emp)}
                              disabled={actionLoading}
                              className="px-2.5 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 font-bold text-[11px] transition-colors flex items-center gap-1"
                              title="Generate 6-digit OTP reset link for employee mobile"
                            >
                              <KeyRound className="h-3 w-3" />
                              <span>OTP Link</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => openSetPassModal(emp)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[11px] border border-slate-700 transition-colors"
                          >
                            Set Pass
                          </button>

                          <button
                            type="button"
                            onClick={() => openEditModal(emp)}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-[11px] border border-slate-700 transition-colors"
                          >
                            Edit
                          </button>
                        </div>
                      )}
                    </td>

                  </tr>
                );
              })}
              {filteredEmployees.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500 text-xs">
                    No team members matched your search or filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── OTP Reset Link Generated Modal ────────────────────────── */}
      {isOtpOpen && activeOtpData && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-indigo-400" />
                <h3 className="font-bold text-white text-sm">6-Digit Password Reset OTP</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsOtpOpen(false)}
                className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1 bg-slate-800 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="text-center space-y-2 py-2">
              <p className="text-xs text-slate-400">
                Generated for <strong>{activeOtpData.employeeName}</strong> ({activeOtpData.phone})
              </p>
              <div className="inline-block bg-slate-950 border border-indigo-500/40 rounded-2xl px-6 py-3 font-mono text-3xl font-black text-indigo-300 tracking-widest shadow-inner">
                {activeOtpData.otp}
              </div>
              <p className="text-[11px] text-amber-400/90 font-medium">Valid for 15 minutes</p>
            </div>

            <div className="space-y-2 pt-2">
              <label className="block text-[11px] font-semibold text-slate-400 uppercase">1-Click Auto-Pre-filled Link</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={`${typeof window !== "undefined" ? window.location.origin : ""}${activeOtpData.resetUrl}`}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono text-slate-300 select-all"
                />
                <button
                  type="button"
                  onClick={() =>
                    handleCopy(
                      `${typeof window !== "undefined" ? window.location.origin : ""}${activeOtpData.resetUrl}`,
                      "link-otp"
                    )
                  }
                  className="px-3 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shrink-0"
                >
                  {copiedId === "link-otp" ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>

            {/* Direct WhatsApp OTP Dispatch Button */}
            {(() => {
              const digits = (activeOtpData.phone || "").replace(/\D/g, "");
              const phone10 = digits.length >= 10 ? digits.slice(-10) : digits;
              const origin = typeof window !== "undefined" ? window.location.origin : "";
              const fullResetUrl = `${origin}${activeOtpData.resetUrl}`;
              const waText = encodeURIComponent(
                `*ZERO GROUP — Password Reset*\n\nHello ${activeOtpData.employeeName},\nYour 6-digit verification code is: *${activeOtpData.otp}*\n\nClick this link to set your new password:\n${fullResetUrl}\n\nValid for 15 minutes.`
              );
              const waLink = `https://wa.me/91${phone10}?text=${waText}`;

              return (
                <div className="pt-2">
                  <a
                    href={waLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 transition-all active:scale-[0.98]"
                  >
                    <svg className="w-4 h-4 fill-current" viewBox="0 0 24 24">
                      <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
                    </svg>
                    <span>Send to {activeOtpData.employeeName}&apos;s WhatsApp</span>
                    <span>↗</span>
                  </a>
                </div>
              );
            })()}

            <button
              type="button"
              onClick={() => setIsOtpOpen(false)}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs"
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* ── Set Password Modal ─────────────────────────────────────── */}
      {isSetPassOpen && selectedEmp && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={handleSetPassSubmit}
            className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm">Directly Set Password</h3>
              <button
                type="button"
                onClick={() => setIsSetPassOpen(false)}
                className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1 bg-slate-800 rounded-lg"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Set a new login password for <strong>{selectedEmp.name}</strong>.
            </p>

            {actionError && <p className="text-xs text-rose-400">{actionError}</p>}

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">New Password</label>
              <input
                type="text"
                value={formPassword}
                onChange={(e) => setFormPassword(e.target.value)}
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white font-mono outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsSetPassOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-400 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold disabled:opacity-50"
              >
                {actionLoading ? "Saving..." : "Update Password"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Create / Edit Employee Modal ───────────────────────────── */}
      {(isCreateOpen || (isEditOpen && selectedEmp)) && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <form
            onSubmit={isCreateOpen ? handleCreateSubmit : handleEditSubmit}
            className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto space-y-4 shadow-2xl"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base">
                {isCreateOpen ? "Create New Team Member" : `Edit Details: ${selectedEmp?.name}`}
              </h3>
              <button
                type="button"
                onClick={() => {
                  setIsCreateOpen(false);
                  setIsEditOpen(false);
                }}
                className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1 bg-slate-800 rounded-lg"
              >
                ✕
              </button>
            </div>

            {actionError && <p className="text-xs text-rose-400">{actionError}</p>}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">Full Name</label>
                <input
                  type="text"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  required
                  placeholder="Employee name"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Phone Number</label>
                <input
                  type="text"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  required
                  placeholder="10-digit mobile"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-indigo-500"
                />
              </div>

              {isCreateOpen && (
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Email Address</label>
                  <input
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    required
                    placeholder="email@zerogroup.com"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              {isCreateOpen && (
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">Initial Password</label>
                  <input
                    type="text"
                    value={formPassword}
                    onChange={(e) => setFormPassword(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono outline-none focus:border-indigo-500"
                  />
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-300 mb-1">System Role</label>
                <select
                  value={formRole}
                  onChange={(e) => setFormRole(e.target.value as Role)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-semibold outline-none focus:border-indigo-500"
                >
                  {creatableRoles.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">Driving License No.</label>
                <input
                  type="text"
                  value={formLicense}
                  onChange={(e) => setFormLicense(e.target.value.toUpperCase())}
                  placeholder="KL-05-..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono outline-none focus:border-indigo-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-300 mb-1">Aadhaar / National ID No.</label>
                <input
                  type="text"
                  value={formAadhaar}
                  onChange={(e) => setFormAadhaar(e.target.value)}
                  placeholder="12-digit Aadhaar number"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white font-mono outline-none focus:border-indigo-500"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-300 mb-1">Residential Address</label>
                <textarea
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  rows={2}
                  placeholder="Full residential address"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-white outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Operator / Driver Skill Capability Selection (STAFF & ADMIN ONLY) */}
            <div className="pt-2 border-t border-slate-800 space-y-2">
              <label className="block text-xs font-black uppercase text-indigo-400">
                Certified Machinery & Crew Skills (Office Managed)
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {ALL_CREW_ROLES.map((skill) => {
                  const checked = formSkills.includes(skill.value);
                  return (
                    <label
                      key={skill.value}
                      className={`flex items-center gap-2 p-2 rounded-xl border cursor-pointer select-none transition-colors ${
                        checked
                          ? "bg-indigo-600/20 border-indigo-500 text-indigo-200"
                          : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormSkills([...formSkills, skill.value]);
                          } else {
                            setFormSkills(formSkills.filter((s) => s !== skill.value));
                          }
                        }}
                        className="rounded accent-indigo-500"
                      />
                      <span className="text-[11px] font-semibold">{skill.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => {
                  setIsCreateOpen(false);
                  setIsEditOpen(false);
                }}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-400 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-xs font-bold disabled:opacity-50"
              >
                {actionLoading ? "Saving..." : isCreateOpen ? "Create Employee" : "Save Changes"}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Document Preview Modal ─────────────────────────────────── */}
      {previewDocUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 max-w-2xl w-full max-h-[90vh] flex flex-col space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm">Official ID Document Inspection</h3>
              <button
                type="button"
                onClick={() => setPreviewDocUrl(null)}
                className="text-slate-400 hover:text-white text-xs font-bold px-2 py-1 bg-slate-800 rounded-lg"
              >
                ✕ Close
              </button>
            </div>
            <div className="flex-1 overflow-auto rounded-xl bg-slate-950 p-2 flex items-center justify-center min-h-[300px]">
              <img
                src={previewDocUrl}
                alt="Document preview"
                className="max-h-[70vh] max-w-full rounded-lg object-contain"
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
