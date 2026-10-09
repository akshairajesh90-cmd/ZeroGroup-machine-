"use client";

import { useState, useEffect } from "react";
import { X, Save, Camera, Lock, Smartphone, CreditCard, Loader2 } from "lucide-react";
import { getMyProfile, updateMyProfile } from "@/actions/profile";

interface MyProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function MyProfileModal({ isOpen, onClose }: MyProfileModalProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    gpayNumber: "",
    upiId: "",
    profilePhotoUrl: "",
    newPassword: "",
    role: ""
  });

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      getMyProfile().then(res => {
        if (res.success && res.data) {
          setFormData({
            ...formData,
            ...res.data,
            newPassword: "" // don't show old password
          });
        }
        setLoading(false);
      });
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    const res = await updateMyProfile({
      phone: formData.phone,
      gpayNumber: formData.gpayNumber,
      upiId: formData.upiId,
      profilePhotoUrl: formData.profilePhotoUrl,
      newPassword: formData.newPassword
    });
    setSaving(false);
    if (res.success) {
      alert("Profile updated successfully!");
      onClose();
    } else {
      alert("Error: " + res.error);
    }
  };

  // Mock photo upload handler (since we don't have a real AWS/S3 setup ready here, we just use a URL prompt)
  const handlePhotoUpload = () => {
    const url = prompt("Enter the URL of your new profile photo:");
    if (url) {
      setFormData({ ...formData, profilePhotoUrl: url });
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-zinc-950 border border-zinc-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800 bg-zinc-900/50">
          <h2 className="text-xl font-black text-white">My Profile & Settings</h2>
          <button onClick={onClose} className="p-2 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-800 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center p-12">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
            <div className="flex flex-col items-center mb-8">
              <div className="relative group cursor-pointer" onClick={handlePhotoUpload}>
                {formData.profilePhotoUrl ? (
                  <img src={formData.profilePhotoUrl} alt="Profile" className="w-24 h-24 rounded-full object-cover border-4 border-zinc-800 group-hover:border-amber-500 transition-all" />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-zinc-800 border-4 border-zinc-700 flex items-center justify-center group-hover:border-amber-500 transition-all">
                    <span className="text-3xl font-black text-zinc-500">{formData.name.charAt(0)}</span>
                  </div>
                )}
                <div className="absolute bottom-0 right-0 p-2 bg-amber-500 text-black rounded-full shadow-lg group-hover:scale-110 transition-transform">
                  <Camera className="w-4 h-4" />
                </div>
              </div>
              <h3 className="mt-4 text-lg font-bold text-white">{formData.name}</h3>
              <p className="text-xs font-bold text-emerald-400 uppercase tracking-widest">{formData.role}</p>
              <p className="text-xs text-zinc-500 mt-1">{formData.email}</p>
            </div>

            <form id="profile-form" onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800 pb-2">Contact & Payments</h4>
                
                <div>
                  <label className="flex items-center gap-2 text-xs font-semibold text-zinc-400 mb-1.5">
                    <Smartphone className="w-3.5 h-3.5" /> Phone Number
                  </label>
                  <input
                    type="tel"
                    value={formData.phone || ""}
                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all outline-none"
                    placeholder="+91 98765 43210"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-xs font-semibold text-zinc-400 mb-1.5">
                    <CreditCard className="w-3.5 h-3.5" /> GPay Number
                  </label>
                  <input
                    type="tel"
                    value={formData.gpayNumber || ""}
                    onChange={e => setFormData({ ...formData, gpayNumber: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all outline-none"
                    placeholder="GPay Mobile Number"
                  />
                </div>

                <div>
                  <label className="flex items-center gap-2 text-xs font-semibold text-zinc-400 mb-1.5">
                    <CreditCard className="w-3.5 h-3.5" /> UPI ID
                  </label>
                  <input
                    type="text"
                    value={formData.upiId || ""}
                    onChange={e => setFormData({ ...formData, upiId: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all outline-none"
                    placeholder="name@okbank"
                  />
                </div>
              </div>

              <div className="space-y-4 pt-4">
                <h4 className="text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800 pb-2">Security</h4>
                
                <div>
                  <label className="flex items-center gap-2 text-xs font-semibold text-zinc-400 mb-1.5">
                    <Lock className="w-3.5 h-3.5" /> New Password (Optional)
                  </label>
                  <input
                    type="password"
                    value={formData.newPassword}
                    onChange={e => setFormData({ ...formData, newPassword: e.target.value })}
                    className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-white focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition-all outline-none"
                    placeholder="Leave blank to keep current"
                  />
                  <p className="text-[10px] text-zinc-500 mt-1.5">Entering a new password will log out your active sessions.</p>
                </div>
              </div>
            </form>
          </div>
        )}

        <div className="p-4 border-t border-zinc-800 bg-zinc-900/50">
          <button
            type="submit"
            form="profile-form"
            disabled={saving || loading}
            className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-black font-black py-3.5 rounded-xl transition-all active:scale-95 disabled:opacity-50"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
            {saving ? "Saving Changes..." : "Save Profile & Settings"}
          </button>
        </div>
      </div>
    </div>
  );
}
