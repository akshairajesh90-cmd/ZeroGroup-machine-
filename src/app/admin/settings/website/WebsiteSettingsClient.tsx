"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Building2, Phone, Mail, MapPin, Globe, Shield, AlertTriangle, 
  CheckCircle2, Save, ExternalLink, RefreshCw, MessageSquare, 
  FileText, Activity, Power
} from "lucide-react";
import { 
  CorporateWebsiteSettingsData, 
  updateCorporateWebsiteSettings 
} from "@/actions/websiteSettings";

interface WebsiteSettingsClientProps {
  initialSettings: CorporateWebsiteSettingsData;
}

export default function WebsiteSettingsClient({ initialSettings }: WebsiteSettingsClientProps) {
  const [formData, setFormData] = useState<CorporateWebsiteSettingsData>(initialSettings);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    const res = await updateCorporateWebsiteSettings(formData);
    setIsSaving(false);

    if (res.success) {
      setMessage({
        type: "success",
        text: "Corporate website settings and Central Yard coordinates updated successfully!",
      });
      setTimeout(() => setMessage(null), 5000);
    } else {
      setMessage({
        type: "error",
        text: res.error || "Failed to update settings. Please try again.",
      });
    }
  };

  const handleUseYardPreset = () => {
    setFormData((prev) => ({
      ...prev,
      storeName: "Zero Group Main Yard & Workshop Hub",
      storeAddress: "Central Machinery Yard, Pala - Ponkunnam Road, Kottayam, Kerala 686575",
      storeLatitude: 9.5916,
      storeLongitude: 76.5222,
    }));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 font-sans">
      <div className="max-w-5xl mx-auto space-y-8 pb-20">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold uppercase tracking-wider mb-1">
              <Globe className="w-4 h-4" />
              <span>Admin Control Center</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              Public Website & Central Yard Settings
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Manage corporate branding, contact helplines, base yard coordinates, and maintenance mode.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/"
              target="_blank"
              className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white px-4 py-2.5 rounded-xl text-xs font-bold transition-all"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>View Live Website</span>
            </Link>

            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSaving}
              className="inline-flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 disabled:opacity-50 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-lg shadow-indigo-500/25 transition-all"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Status Notification */}
        {message && (
          <div
            className={`p-4 rounded-2xl border text-sm flex items-center gap-3 ${
              message.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : "bg-rose-500/10 border-rose-500/30 text-rose-300"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Section 1: Maintenance Mode & Notices */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-xl ${formData.maintenanceMode ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/20 text-emerald-400"}`}>
                  <Power className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Maintenance Mode</h3>
                  <p className="text-xs text-slate-400">
                    Display a maintenance banner across the public website during fleet overhauls or holiday windows.
                  </p>
                </div>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.maintenanceMode}
                  onChange={(e) => setFormData({ ...formData, maintenanceMode: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-12 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
              </label>
            </div>

            {formData.maintenanceMode && (
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-amber-400 mb-2">
                  Public Maintenance Notice Message
                </label>
                <textarea
                  rows={2}
                  value={formData.maintenanceNotice}
                  onChange={(e) => setFormData({ ...formData, maintenanceNotice: e.target.value })}
                  className="w-full rounded-xl border border-amber-500/40 bg-slate-950 px-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500/20 resize-none"
                  placeholder="Notice message visible on public homepage..."
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                Public Operational Announcement (Top Ribbon)
              </label>
              <input
                type="text"
                value={formData.publicNotice}
                onChange={(e) => setFormData({ ...formData, publicNotice: e.target.value })}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                placeholder="e.g. Full equipment fleet operational across Central Kerala."
              />
            </div>
          </div>

          {/* Section 2: Corporate Brand & Content */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="border-b border-slate-800 pb-3 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-indigo-400" />
              <h3 className="text-base font-bold text-white">Corporate Identity & Public Copy</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Corporate Company Name
                </label>
                <input
                  type="text"
                  required
                  value={formData.storeName}
                  onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Commercial GSTIN / Registration No.
                </label>
                <input
                  type="text"
                  value={formData.gstinNumber}
                  onChange={(e) => setFormData({ ...formData, gstinNumber: e.target.value })}
                  placeholder="e.g. 32AAAAZ0000A1Z5"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                Public Hero Headline
              </label>
              <input
                type="text"
                required
                value={formData.heroHeadline}
                onChange={(e) => setFormData({ ...formData, heroHeadline: e.target.value })}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
              />
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                Public Hero Subtitle & Description
              </label>
              <textarea
                rows={2}
                required
                value={formData.heroSubheadline}
                onChange={(e) => setFormData({ ...formData, heroSubheadline: e.target.value })}
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 resize-none"
              />
            </div>
          </div>

          {/* Section 3: Communications & Helplines */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="border-b border-slate-800 pb-3 flex items-center gap-2">
              <Phone className="w-5 h-5 text-emerald-400" />
              <h3 className="text-base font-bold text-white">Helplines & Dispatch Desk Contacts</h3>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Primary Phone Helpline
                </label>
                <input
                  type="text"
                  required
                  value={formData.companyPhone}
                  onChange={(e) => setFormData({ ...formData, companyPhone: e.target.value })}
                  placeholder="+91 94470 00000"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  WhatsApp Dispatch Number
                </label>
                <input
                  type="text"
                  required
                  value={formData.whatsappNumber}
                  onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                  placeholder="919447000000"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Official Corporate Email
                </label>
                <input
                  type="email"
                  required
                  value={formData.companyEmail}
                  onChange={(e) => setFormData({ ...formData, companyEmail: e.target.value })}
                  placeholder="operations@zerogroup.in"
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Central Base Yard / Depot GPS */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
            <div className="border-b border-slate-800 pb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">Central Base Yard (Origin For Route Snapping)</h3>
              </div>
              <button
                type="button"
                onClick={handleUseYardPreset}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-bold bg-indigo-500/10 border border-indigo-500/20 px-3 py-1.5 rounded-lg transition-all"
              >
                Set Kottayam Yard Coordinates
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                Central Yard Physical Address
              </label>
              <input
                type="text"
                required
                value={formData.storeAddress}
                onChange={(e) => setFormData({ ...formData, storeAddress: e.target.value })}
                placeholder="Pala - Ponkunnam Road, Kottayam, Kerala 686575"
                className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Depot Latitude (GPS)
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={formData.storeLatitude}
                  onChange={(e) => setFormData({ ...formData, storeLatitude: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm font-mono text-white placeholder-slate-600 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-2">
                  Depot Longitude (GPS)
                </label>
                <input
                  type="number"
                  step="any"
                  required
                  value={formData.storeLongitude}
                  onChange={(e) => setFormData({ ...formData, storeLongitude: parseFloat(e.target.value) || 0 })}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-4 py-3 text-sm font-mono text-white placeholder-slate-600 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                />
              </div>
            </div>
            <p className="text-[11px] text-slate-500">
              * Note: These coordinates are used by the system to compute road driving polylines, km distances, and travel times from the Central Yard to active customer job sites.
            </p>
          </div>

          {/* Bottom Save Action */}
          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 disabled:opacity-50 text-white px-8 py-4 rounded-2xl text-sm font-bold shadow-xl shadow-indigo-600/25 transition-all"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Saving Corporate Settings...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Corporate Settings</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
