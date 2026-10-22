"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import {
  User, Mail, Phone, MapPin, Shield, CheckCircle2, AlertTriangle,
  Upload, Camera, FileText, Lock, KeyRound, Clock, CreditCard,
  Briefcase, Sparkles, Check, ChevronRight, Eye, ArrowLeft, ShieldCheck
} from "lucide-react";
import { updateOwnProfile, linkOfficialDocument, changeOwnPassword } from "@/actions/profile";
import { compressCameraPhoto } from "@/lib/imageCompression";

type DocumentItem = {
  id: string;
  type: string;
  documentNumber: string;
  attachmentUrl: string;
  status: string;
  createdAt: string;
};

type ProfileProps = {
  initialProfile: {
    userId: string;
    employeeId: string;
    email: string;
    name: string;
    role: string;
    phone: string;
    address: string;
    gpayNumber: string;
    upiId: string;
    officialIdType: string;
    officialIdNumber: string;
    drivingLicenseNumber: string;
    employeeCode: string;
    profilePhotoUrl: string | null;
    isIdVerified: boolean;
    idVerifiedAt: string | null;
    idVerifiedBy: string | null;
    idVerifiedRole: string | null;
    capableRoles: string[];
    documents: DocumentItem[];
  };
  backUrl: string;
  portalTitle: string;
};

const ROLE_LABELS: Record<string, string> = {
  ADMIN: "System Administrator",
  OWNER: "Executive Owner",
  STAFF: "Operations Staff",
  DRIVER: "Fleet Driver",
  OPERATOR: "Heavy Machinery Operator",
  WORKER: "Field Worker / Crew",
};

const CREW_SKILL_LABELS: Record<string, string> = {
  DRIVER: "Fleet Transport Driver",
  MIXER_OPERATOR: "Concrete Mixer Operator",
  HYDRAULIC_OPERATOR: "Hydraulic Rig Operator",
  LIFT_OPERATOR: "Material Lift Operator",
  VIBRATOR_OPERATOR: "Concrete Vibrator Operator",
  P_VIBRATOR: "Petrol Vibrator Specialist",
  TROLLY_1_WHEEL: "1-Wheel Trolly Operator",
  TROLLY_2_WHEEL: "2-Wheel Trolly Operator",
  WORKER_LEADER: "Site Crew Leader",
  HELPER: "General Field Helper",
  PANI_HELPER: "Pani System Specialist",
};

export default function UserProfileClient({ initialProfile, backUrl, portalTitle }: ProfileProps) {
  const [profile, setProfile] = useState(initialProfile);
  const [name, setName] = useState(profile.name);
  const [phone, setPhone] = useState(profile.phone);
  const [address, setAddress] = useState(profile.address);
  const [gpayNumber, setGpayNumber] = useState(profile.gpayNumber);
  const [upiId, setUpiId] = useState(profile.upiId);
  const [drivingLicense, setDrivingLicense] = useState(profile.drivingLicenseNumber);
  const [aadhaarNumber, setAadhaarNumber] = useState(profile.officialIdNumber);

  // Upload & Save states
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const [uploadingDocType, setUploadingDocType] = useState<"LICENSE" | "ID_PROOF" | null>(null);
  const [docUploadMsg, setDocUploadMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPass, setChangingPass] = useState(false);
  const [passMsg, setPassMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Document preview modal
  const [previewDocUrl, setPreviewDocUrl] = useState<string | null>(null);

  const avatarInputRef = useRef<HTMLInputElement>(null);
  const licenseInputRef = useRef<HTMLInputElement>(null);
  const aadhaarInputRef = useRef<HTMLInputElement>(null);

  // 1. Upload Avatar Photo
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    let file = e.target.files?.[0];
    if (!file) return;

    setAvatarUploading(true);
    setProfileMsg(null);

    try {
      try {
        const compressedBlob = await compressCameraPhoto(file);
        file = new File([compressedBlob], file.name, { type: compressedBlob.type || "image/jpeg" });
      } catch (cErr) {
        console.warn("Client compression skipped:", cErr);
      }

      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload/profile-photo", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (res.ok && data.url) {
        setProfile((prev) => ({ ...prev, profilePhotoUrl: data.url }));
        setProfileMsg({ type: "success", text: "Profile avatar updated successfully!" });
      } else {
        setProfileMsg({ type: "error", text: data.error || "Failed to upload photo." });
      }
    } catch (err: any) {
      setProfileMsg({ type: "error", text: err.message || "Upload error" });
    } finally {
      setAvatarUploading(false);
      if (avatarInputRef.current) avatarInputRef.current.value = "";
    }
  };

  // 2. Upload Document Scan
  const handleDocFileUpload = async (type: "LICENSE" | "ID_PROOF", e: React.ChangeEvent<HTMLInputElement>) => {
    let file = e.target.files?.[0];
    if (!file) return;

    setUploadingDocType(type);
    setDocUploadMsg(null);

    try {
      try {
        const compressedBlob = await compressCameraPhoto(file);
        file = new File([compressedBlob], file.name, { type: compressedBlob.type || "image/jpeg" });
      } catch (cErr) {
        console.warn("Client compression skipped:", cErr);
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("isDocument", "true");

      const res = await fetch("/api/upload/profile-photo", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (res.ok && data.url) {
        const docNum = type === "LICENSE" ? drivingLicense : aadhaarNumber;
        const linkRes = await linkOfficialDocument({
          type,
          documentNumber: docNum || "PENDING_NUMBER",
          attachmentUrl: data.url,
        });

        if (linkRes.success) {
          setProfile((prev) => ({
            ...prev,
            isIdVerified: false,
            documents: [linkRes.data as any, ...prev.documents.filter((d) => d.type !== type)],
          }));
          setDocUploadMsg({
            type: "success",
            text: `${type === "LICENSE" ? "Driving License" : "Aadhaar Card"} uploaded! Pending Office Staff review.`,
          });
        }
      } else {
        setDocUploadMsg({ type: "error", text: data.error || "Document upload failed." });
      }
    } catch (err: any) {
      setDocUploadMsg({ type: "error", text: err.message || "Upload error" });
    } finally {
      setUploadingDocType(null);
      if (type === "LICENSE" && licenseInputRef.current) licenseInputRef.current.value = "";
      if (type === "ID_PROOF" && aadhaarInputRef.current) aadhaarInputRef.current.value = "";
    }
  };

  // 3. Save Personal & Official ID Info
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    setProfileMsg(null);

    try {
      const res = await updateOwnProfile({
        name,
        phone,
        address,
        gpayNumber,
        upiId,
        drivingLicenseNumber: drivingLicense,
        officialIdNumber: aadhaarNumber,
      });

      if (res.success) {
        setProfile((prev) => ({
          ...prev,
          name,
          phone,
          address,
          gpayNumber,
          upiId,
          drivingLicenseNumber: drivingLicense,
          officialIdNumber: aadhaarNumber,
        }));
        setProfileMsg({ type: "success", text: "Profile details saved successfully!" });
      } else {
        setProfileMsg({ type: "error", text: res.error || "Failed to save profile." });
      }
    } finally {
      setSavingProfile(false);
    }
  };

  // 4. Change Password
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPassMsg(null);

    if (newPassword !== confirmPassword) {
      setPassMsg({ type: "error", text: "New passwords do not match." });
      return;
    }
    if (newPassword.length < 4) {
      setPassMsg({ type: "error", text: "Password must be at least 4 characters long." });
      return;
    }

    setChangingPass(true);
    try {
      const res = await changeOwnPassword(currentPassword, newPassword);
      if (res.success) {
        setPassMsg({ type: "success", text: "Password updated successfully!" });
        setCurrentPassword("");
        setNewPassword("");
        setConfirmPassword("");
      } else {
        setPassMsg({ type: "error", text: res.error || "Failed to change password." });
      }
    } finally {
      setChangingPass(false);
    }
  };

  const licenseDoc = profile.documents.find((d) => d.type === "LICENSE");
  const aadhaarDoc = profile.documents.find((d) => d.type === "ID_PROOF");

  return (
    <div className="max-w-2xl mx-auto space-y-5 pb-24 font-sans text-slate-100">
      
      {/* ── Top Navigation Bar ────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <Link
          href={backUrl}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-bold transition-all active:scale-95"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to {portalTitle}</span>
        </Link>

        <span className="text-[11px] font-bold text-slate-400 bg-slate-900/80 px-3 py-1.5 rounded-full border border-slate-800">
          Official Profile
        </span>
      </div>

      {/* ── Profile Hero Card ─────────────────────────────────────────── */}
      <div className="bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-7 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5 relative z-10 text-center sm:text-left">
          
          {/* Avatar with Camera Button */}
          <div className="relative shrink-0">
            <div className="w-24 h-24 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 p-0.5 shadow-xl shadow-indigo-500/20">
              <div className="w-full h-full rounded-[14px] bg-slate-950 overflow-hidden flex items-center justify-center text-white font-black text-3xl">
                {profile.profilePhotoUrl ? (
                  <img
                    src={profile.profilePhotoUrl}
                    alt={profile.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  profile.name.charAt(0).toUpperCase()
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => avatarInputRef.current?.click()}
              disabled={avatarUploading}
              className="absolute -bottom-1 -right-1 p-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg border-2 border-slate-900 transition-all active:scale-90"
              title="Change Photo"
            >
              <Camera className="h-3.5 w-3.5" />
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleAvatarChange}
            />
          </div>

          {/* Employee Details & Badge */}
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
              <h1 className="text-2xl font-black text-white tracking-tight">{profile.name}</h1>
              <span className="text-xs font-mono font-bold bg-indigo-500/20 text-indigo-300 px-2.5 py-0.5 rounded-full border border-indigo-500/30">
                {profile.employeeCode}
              </span>
            </div>
            
            <p className="text-sm font-semibold text-slate-400">
              {ROLE_LABELS[profile.role] || profile.role}
            </p>

            {/* Verification Status Banner */}
            <div className="pt-1 flex items-center justify-center sm:justify-start">
              {profile.isIdVerified ? (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-sm">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                  Official ID Verified {profile.idVerifiedRole && `by ${profile.idVerifiedRole}`}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 shadow-sm">
                  <Clock className="h-3.5 w-3.5 text-amber-400" />
                  ID Verification Pending Review
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Profile Alert Messages */}
      {profileMsg && (
        <div
          className={`p-4 rounded-2xl border text-xs sm:text-sm flex items-center gap-3 animate-in fade-in ${
            profileMsg.type === "success"
              ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
              : "bg-rose-500/15 border-rose-500/30 text-rose-300"
          }`}
        >
          {profileMsg.type === "success" ? <Check className="h-5 w-5 shrink-0" /> : <AlertTriangle className="h-5 w-5 shrink-0" />}
          <span>{profileMsg.text}</span>
        </div>
      )}

      {/* ── Certified Machinery & Crew Skills (READ-ONLY) ───────────── */}
      {(profile.role === "OPERATOR" || profile.role === "DRIVER" || profile.capableRoles.length > 0) && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-3.5">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/25">
                <Briefcase className="h-4 w-4" />
              </div>
              <div>
                <h2 className="text-sm font-black text-white">Certified Machinery & Skills</h2>
                <p className="text-[11px] text-slate-400">Assigned & verified by Office Staff</p>
              </div>
            </div>
            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-400 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 shrink-0">
              <Lock className="h-3 w-3 text-amber-400" /> Read-Only
            </span>
          </div>

          <div className="flex flex-col gap-2.5 pt-1">
            {profile.capableRoles.length > 0 ? (
              profile.capableRoles.map((roleKey) => (
                <div
                  key={roleKey}
                  className="flex items-center justify-between p-3 rounded-2xl bg-slate-950/80 border border-slate-800 hover:border-indigo-500/30 transition-all"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400 shrink-0" />
                    <span className="text-xs font-bold text-slate-200">
                      {CREW_SKILL_LABELS[roleKey] || roleKey}
                    </span>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/25 shrink-0 ml-2">
                    Verified ✓
                  </span>
                </div>
              ))
            ) : (
              <div className="text-xs text-slate-500 italic p-3 bg-slate-950/60 rounded-xl border border-slate-800 col-span-full">
                No machinery tags assigned yet. Contact office staff to add certified operator tags.
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Official Identification & Document Uploads ────────────── */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="border-b border-slate-800/80 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/15 text-cyan-400 border border-cyan-500/25">
              <CreditCard className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white">Official Government IDs</h2>
              <p className="text-[11px] text-slate-400">Driving License & Aadhaar verification</p>
            </div>
          </div>
          <span className="text-[10px] font-bold text-cyan-400 bg-cyan-500/10 px-2.5 py-1 rounded-lg border border-cyan-500/25">
            KYC Documents
          </span>
        </div>

        {docUploadMsg && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
              docUploadMsg.type === "success"
                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                : "bg-rose-500/15 border-rose-500/30 text-rose-300"
            }`}
          >
            {docUploadMsg.type === "success" ? <Check className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
            <span>{docUploadMsg.text}</span>
          </div>
        )}

        <div className="space-y-3.5">
          {/* Driving License Card */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">Driving License</span>
              {licenseDoc ? (
                <span className="text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  File Uploaded ✓
                </span>
              ) : (
                <span className="text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  No File Attached
                </span>
              )}
            </div>

            <input
              type="text"
              value={drivingLicense}
              onChange={(e) => setDrivingLicense(e.target.value.toUpperCase())}
              placeholder="License No: KL-05-2021-0012345"
              className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-xs font-mono text-white placeholder-slate-600 outline-none focus:border-cyan-500"
            />

            <div className="flex items-center gap-2">
              <input
                ref={licenseInputRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => handleDocFileUpload("LICENSE", e)}
              />
              <button
                type="button"
                onClick={() => licenseInputRef.current?.click()}
                disabled={uploadingDocType === "LICENSE"}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 py-2.5 text-xs font-bold text-slate-200 transition-colors"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>{uploadingDocType === "LICENSE" ? "Uploading..." : licenseDoc ? "Replace Photo" : "Upload Photo"}</span>
              </button>

              {licenseDoc?.attachmentUrl && (
                <button
                  type="button"
                  onClick={() => setPreviewDocUrl(licenseDoc.attachmentUrl)}
                  className="px-3.5 py-2.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>View</span>
                </button>
              )}
            </div>
          </div>

          {/* Aadhaar / National ID Card */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-200">Aadhaar / National ID</span>
              {aadhaarDoc ? (
                <span className="text-[10px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  File Uploaded ✓
                </span>
              ) : (
                <span className="text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full">
                  No File Attached
                </span>
              )}
            </div>

            <input
              type="text"
              value={aadhaarNumber}
              onChange={(e) => setAadhaarNumber(e.target.value)}
              placeholder="12-digit Aadhaar Number"
              className="w-full rounded-xl border border-slate-800 bg-slate-900 px-3.5 py-2.5 text-xs font-mono text-white placeholder-slate-600 outline-none focus:border-cyan-500"
            />

            <div className="flex items-center gap-2">
              <input
                ref={aadhaarInputRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => handleDocFileUpload("ID_PROOF", e)}
              />
              <button
                type="button"
                onClick={() => aadhaarInputRef.current?.click()}
                disabled={uploadingDocType === "ID_PROOF"}
                className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 py-2.5 text-xs font-bold text-slate-200 transition-colors"
              >
                <Upload className="h-3.5 w-3.5" />
                <span>{uploadingDocType === "ID_PROOF" ? "Uploading..." : aadhaarDoc ? "Replace Scan" : "Upload Scan"}</span>
              </button>

              {aadhaarDoc?.attachmentUrl && (
                <button
                  type="button"
                  onClick={() => setPreviewDocUrl(aadhaarDoc.attachmentUrl)}
                  className="px-3.5 py-2.5 rounded-xl bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 border border-cyan-500/30 text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  <Eye className="h-3.5 w-3.5" />
                  <span>View</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── Contact & Residential Details ──────────────────────────── */}
      <form onSubmit={handleSaveProfile} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="border-b border-slate-800/80 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/25">
              <User className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white">Contact & Payout Info</h2>
              <p className="text-[11px] text-slate-400">Personal address & UPI details</p>
            </div>
          </div>
          <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-lg border border-indigo-500/25">
            Personal
          </span>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Full Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Registered Mobile Number</label>
            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-500" />
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="10-digit mobile number"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-9 pr-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Residential Address</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-500" />
              <textarea
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                rows={2}
                placeholder="House name, street, locality, city, pincode"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 pl-9 pr-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Google Pay (GPay) Mobile</label>
              <input
                type="text"
                value={gpayNumber}
                onChange={(e) => setGpayNumber(e.target.value)}
                placeholder="e.g. 9847000096"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">UPI ID (Bata Payouts)</label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="e.g. name@okhdfcbank"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={savingProfile}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-xs sm:text-sm shadow-lg shadow-indigo-500/25 transition-all active:scale-[0.98] disabled:opacity-50"
        >
          {savingProfile ? "Saving Profile Changes..." : "Save Profile Details"}
        </button>
      </form>

      {/* ── Security: Password Change ──────────────────────────────── */}
      <form onSubmit={handleChangePassword} className="bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
        <div className="border-b border-slate-800/80 pb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/25">
              <Lock className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-sm font-black text-white">Change Account Password</h2>
              <p className="text-[11px] text-slate-400">Self-service password update</p>
            </div>
          </div>
          <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/25">
            Security
          </span>
        </div>

        {passMsg && (
          <div
            className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
              passMsg.type === "success"
                ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-300"
                : "bg-rose-500/15 border-rose-500/30 text-rose-300"
            }`}
          >
            {passMsg.type === "success" ? <Check className="h-4 w-4 shrink-0" /> : <AlertTriangle className="h-4 w-4 shrink-0" />}
            <span>{passMsg.text}</span>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              placeholder="••••••••"
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-600 outline-none focus:border-amber-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                placeholder="Min. 4 characters"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-600 outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                placeholder="Re-enter password"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-600 outline-none focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={changingPass}
          className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs transition-colors disabled:opacity-50"
        >
          {changingPass ? "Updating Password..." : "Update Password"}
        </button>
      </form>

      {/* ── Document Preview Modal ─────────────────────────────────── */}
      {previewDocUrl && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 max-w-xl w-full max-h-[90vh] flex flex-col space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-sm">Official ID Document Preview</h3>
              <button
                type="button"
                onClick={() => setPreviewDocUrl(null)}
                className="text-slate-400 hover:text-white text-xs font-bold px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors"
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
