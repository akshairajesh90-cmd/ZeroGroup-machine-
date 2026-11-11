"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Building2, Phone, Mail, MapPin, Globe, AlertTriangle, 
  CheckCircle2, Save, ExternalLink, RefreshCw, Power, 
  Cog, Gauge, Fuel, Truck, HardHat, Wrench, ShieldCheck, 
  Clock, Plus, Trash2, ArrowUp, ArrowDown, Check, X, 
  Layers, SlidersHorizontal, Info, RotateCcw, LucideIcon
} from "lucide-react";
import { 
  CorporateWebsiteSettingsData, 
  WebsiteCatalogItemData,
  WebsiteValuePropData,
  DEFAULT_KERALA_DISTRICTS,
  DEFAULT_CATALOG_ITEMS,
  DEFAULT_VALUE_PROPS,
  AllowedIcons,
} from "@/types/websiteSettings";
import { updateCorporateWebsiteSettings } from "@/actions/websiteSettings";

interface WebsiteSettingsClientProps {
  initialSettings: CorporateWebsiteSettingsData;
}

const ICON_MAP: Record<string, LucideIcon> = {
  Cog,
  Building2,
  Gauge,
  Fuel,
  Truck,
  HardHat,
  Wrench,
  ShieldCheck,
  Clock,
  Phone,
};

type ActiveTab = "hero" | "catalog" | "valueprops" | "yard";

export default function WebsiteSettingsClient({ initialSettings }: WebsiteSettingsClientProps) {
  const [activeTab, setActiveTab] = useState<ActiveTab>("hero");
  const [formData, setFormData] = useState<CorporateWebsiteSettingsData>({
    ...initialSettings,
    catalogItems: initialSettings.catalogItems?.length ? initialSettings.catalogItems : DEFAULT_CATALOG_ITEMS,
    valueProps: initialSettings.valueProps?.length ? initialSettings.valueProps : DEFAULT_VALUE_PROPS,
    districtsCovered: initialSettings.districtsCovered?.length ? initialSettings.districtsCovered : DEFAULT_KERALA_DISTRICTS,
    heroBadge: initialSettings.heroBadge || "KERALA COMMERCIAL INFRASTRUCTURE & CONSTRUCTION LOGISTICS",
    heroPrimaryCta: initialSettings.heroPrimaryCta || "Request Hire Quotation",
    heroSecondaryCta: initialSettings.heroSecondaryCta || "Search Plant Inventory",
    emergencyPhone: initialSettings.emergencyPhone || initialSettings.companyPhone || "+91 94471 23456",
    footerCopy: initialSettings.footerCopy || "ZERO GROUP Equipment Rentals. All commercial plant certified under Kerala industrial equipment safety guidelines.",
    headerSubtitle: initialSettings.headerSubtitle || "Commercial Construction Machinery & Lift Rentals",
    catalogHeading: initialSettings.catalogHeading || "Certified Construction Machinery Catalog",
    catalogSubheading: initialSettings.catalogSubheading || "All machinery is serviced, pressure-tested, and certified prior to site mobilization.",
    inquiryHeading: initialSettings.inquiryHeading || "Request Machinery Hire Quotation",
    inquirySubheading: initialSettings.inquirySubheading || "Submit your project schedule below. Central Yard dispatch will confirm machine availability and issue formal hire rates.",
    operatingHours: initialSettings.operatingHours || "Mon – Sun: 6:00 AM – 9:00 PM",
  });

  const [isSaving, setIsSaving] = useState(false);
  const [conflictWarning, setConflictWarning] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [newDistrictInput, setNewDistrictInput] = useState("");

  // Save handler with Concurrency Check
  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setMessage(null);
    setConflictWarning(null);

    const payload = {
      ...formData,
      expectedUpdatedAt: initialSettings.updatedAt,
    };

    const res = await updateCorporateWebsiteSettings(payload);
    setIsSaving(false);

    if (res.success) {
      setMessage({
        type: "success",
        text: "Website content, fleet inventory, and yard details updated successfully. Live site revalidated.",
      });
      setTimeout(() => setMessage(null), 6000);
    } else {
      if ((res as { conflict?: boolean }).conflict) {
        setConflictWarning(res.error || "Conflict: Data modified by another user.");
      } else {
        setMessage({
          type: "error",
          text: res.error || "Failed to update settings. Please check all required fields.",
        });
      }
    }
  };

  const handleUseYardPreset = () => {
    setFormData((prev) => ({
      ...prev,
      storeName: "ZERO GROUP Heavy Machinery & Equipment Rentals",
      storeAddress: "Central Machinery Yard, Pala - Ponkunnam Road, Kottayam, Kerala 686575",
      storeLatitude: 9.5916,
      storeLongitude: 76.5222,
    }));
  };

  // Machinery Catalog Item CRUD
  const handleAddCatalogItem = () => {
    const newItem: WebsiteCatalogItemData = {
      id: `temp-${Date.now()}`,
      category: "Concrete Mixers & Batching",
      categorySubtext: "Heavy Duty Drum Machinery",
      categoryIcon: "Cog",
      title: "New Plant Machine",
      power: "Diesel / Electric Drive",
      specs: ["Industrial specification point 1", "Industrial specification point 2"],
      idealFor: "Commercial Construction Foundations",
      classification: "Commercial Heavy",
      demandTag: "High Demand",
      sortOrder: (formData.catalogItems?.length || 0),
      isActive: true,
    };

    setFormData((prev) => ({
      ...prev,
      catalogItems: [...(prev.catalogItems || []), newItem],
    }));
  };

  const handleRemoveCatalogItem = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      catalogItems: (prev.catalogItems || []).filter((_, idx) => idx !== index),
    }));
  };

  const handleMoveCatalogItem = (index: number, direction: "up" | "down") => {
    const items = [...(formData.catalogItems || [])];
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= items.length) return;
    const temp = items[index];
    items[index] = items[targetIdx];
    items[targetIdx] = temp;
    setFormData((prev) => ({ ...prev, catalogItems: items }));
  };

  const handleUpdateCatalogItem = (index: number, field: keyof WebsiteCatalogItemData, val: any) => {
    const items = [...(formData.catalogItems || [])];
    items[index] = { ...items[index], [field]: val };
    setFormData((prev) => ({ ...prev, catalogItems: items }));
  };

  const handleAddSpecBullet = (itemIdx: number) => {
    const items = [...(formData.catalogItems || [])];
    const currentSpecs = items[itemIdx].specs || [];
    items[itemIdx].specs = [...currentSpecs, "New specification feature"];
    setFormData((prev) => ({ ...prev, catalogItems: items }));
  };

  const handleUpdateSpecBullet = (itemIdx: number, specIdx: number, text: string) => {
    const items = [...(formData.catalogItems || [])];
    const specs = [...items[itemIdx].specs];
    specs[specIdx] = text;
    items[itemIdx].specs = specs;
    setFormData((prev) => ({ ...prev, catalogItems: items }));
  };

  const handleRemoveSpecBullet = (itemIdx: number, specIdx: number) => {
    const items = [...(formData.catalogItems || [])];
    items[itemIdx].specs = items[itemIdx].specs.filter((_, idx) => idx !== specIdx);
    setFormData((prev) => ({ ...prev, catalogItems: items }));
  };

  // Value Proposition CRUD
  const handleUpdateValueProp = (index: number, field: keyof WebsiteValuePropData, val: any) => {
    const props = [...(formData.valueProps || [])];
    props[index] = { ...props[index], [field]: val };
    setFormData((prev) => ({ ...prev, valueProps: props }));
  };

  // Kerala District Management
  const handleRemoveDistrict = (district: string) => {
    setFormData((prev) => ({
      ...prev,
      districtsCovered: (prev.districtsCovered || []).filter((d) => d !== district),
    }));
  };

  const handleAddDistrict = () => {
    const trimmed = newDistrictInput.trim();
    if (!trimmed) return;
    if (formData.districtsCovered?.includes(trimmed)) return;
    setFormData((prev) => ({
      ...prev,
      districtsCovered: [...(prev.districtsCovered || []), trimmed],
    }));
    setNewDistrictInput("");
  };

  const handleResetDistricts = () => {
    setFormData((prev) => ({
      ...prev,
      districtsCovered: DEFAULT_KERALA_DISTRICTS,
    }));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-6 lg:p-8 font-sans selection:bg-amber-500 selection:text-slate-950">
      <div className="max-w-6xl mx-auto space-y-6 pb-24">
        
        {/* Top Operational Bar */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <div className="flex items-center gap-2 text-amber-500 text-xs font-bold uppercase tracking-wider mb-1">
              <Globe className="w-4 h-4 text-amber-500" strokeWidth={1.5} />
              <span>Commercial CMS Control Center</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Public Website Content & Fleet Catalog
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Directly edit homepage headlines, plant machinery catalog, value propositions, and Central Yard coordinates.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/"
              target="_blank"
              className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white px-4 py-2.5 rounded-lg text-xs font-semibold shadow-sm transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" strokeWidth={1.5} />
              <span>View Public Website</span>
            </Link>

            <button
              type="button"
              onClick={() => handleSubmit()}
              disabled={isSaving}
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 px-5 py-2.5 rounded-lg text-xs font-bold shadow-sm transition-colors cursor-pointer"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" strokeWidth={1.5} />
                  <span>Save All Changes</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* OCC Stale Data Conflict Modal / Banner */}
        {conflictWarning && (
          <div className="p-4 rounded-xl border border-rose-500/50 bg-rose-950/40 text-rose-200 space-y-2 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" strokeWidth={1.5} />
              <div>
                <h4 className="text-sm font-bold text-rose-100">Optimistic Concurrency Conflict Detected</h4>
                <p className="text-xs text-rose-300 mt-0.5">{conflictWarning}</p>
                <div className="mt-3 flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => window.location.reload()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-500 text-slate-950 text-xs font-bold hover:bg-rose-400 transition-colors"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Reload Latest Data</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setConflictWarning(null)}
                    className="text-xs text-rose-300 underline hover:text-rose-100"
                  >
                    Dismiss Warning
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Notification Feedback */}
        {message && (
          <div
            className={`p-4 rounded-xl border text-sm flex items-center gap-3 shadow-sm ${
              message.type === "success"
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                : "bg-rose-500/10 border-rose-500/30 text-rose-300"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-400" strokeWidth={1.5} />
            ) : (
              <AlertTriangle className="w-5 h-5 shrink-0 text-rose-400" strokeWidth={1.5} />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-800 overflow-x-auto pb-px">
          <button
            type="button"
            onClick={() => setActiveTab("hero")}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "hero"
                ? "border-amber-500 text-amber-400 bg-slate-900/40"
                : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700"
            }`}
          >
            <Building2 className="w-4 h-4" strokeWidth={1.5} />
            <span>Hero & Announcements</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("catalog")}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "catalog"
                ? "border-amber-500 text-amber-400 bg-slate-900/40"
                : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700"
            }`}
          >
            <Cog className="w-4 h-4" strokeWidth={1.5} />
            <span>Fleet Catalog ({formData.catalogItems?.length || 0})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("valueprops")}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "valueprops"
                ? "border-amber-500 text-amber-400 bg-slate-900/40"
                : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700"
            }`}
          >
            <ShieldCheck className="w-4 h-4" strokeWidth={1.5} />
            <span>Value Propositions (Why Us)</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("yard")}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-colors whitespace-nowrap ${
              activeTab === "yard"
                ? "border-amber-500 text-amber-400 bg-slate-900/40"
                : "border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700"
            }`}
          >
            <MapPin className="w-4 h-4" strokeWidth={1.5} />
            <span>Central Yard & Coverage</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* ═════════════════════════════════════════════════════════════════ */}
          {/* TAB 1: HERO & ANNOUNCEMENTS                                      */}
          {/* ═════════════════════════════════════════════════════════════════ */}
          {activeTab === "hero" && (
            <div className="space-y-6">
              {/* Maintenance Toggle */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 sm:p-7 space-y-5">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-lg ${formData.maintenanceMode ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/20 text-emerald-400"}`}>
                      <Power className="w-5 h-5" strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-white">Emergency Fleet Maintenance Mode</h3>
                      <p className="text-xs text-slate-400">
                        When enabled, displays a high-visibility amber maintenance banner on the homepage with an emergency dispatch phone line.
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
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>

                {formData.maintenanceMode && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-xs font-semibold text-amber-400 mb-1.5">
                        Maintenance Alert Message
                      </label>
                      <input
                        type="text"
                        value={formData.maintenanceNotice || ""}
                        onChange={(e) => setFormData({ ...formData, maintenanceNotice: e.target.value })}
                        className="w-full rounded-lg border border-amber-500/40 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-500"
                        placeholder="Notice: Scheduled fleet maintenance window. Emergency plant dispatch active via helpline."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-amber-400 mb-1.5">
                        Emergency Hotline Phone
                      </label>
                      <input
                        type="text"
                        value={formData.emergencyPhone || ""}
                        onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                        className="w-full rounded-lg border border-amber-500/40 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-500"
                        placeholder="+91 94471 23456"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Public Operational Notice Ribbon (Active when Maintenance is OFF)
                  </label>
                  <input
                    type="text"
                    value={formData.publicNotice || ""}
                    onChange={(e) => setFormData({ ...formData, publicNotice: e.target.value })}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-500"
                    placeholder="Full machinery fleet operational. Direct flatbed site dispatch active from Central Yard."
                  />
                </div>
              </div>

              {/* Hero Banner Text */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 sm:p-7 space-y-5">
                <div className="border-b border-slate-800 pb-3 flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-amber-500" strokeWidth={1.5} />
                  <h3 className="text-sm font-bold text-white">Homepage Hero Brand Copy</h3>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Website Top Header Brand Subtitle
                  </label>
                  <input
                    type="text"
                    value={formData.headerSubtitle || ""}
                    onChange={(e) => setFormData({ ...formData, headerSubtitle: e.target.value })}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-500 transition-colors"
                    placeholder="Commercial Construction Machinery & Lift Rentals"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Appears below the ZERO GROUP logo in the sticky navigation header.</p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Hero Eyebrow Badge
                  </label>
                  <input
                    type="text"
                    value={formData.heroBadge || ""}
                    onChange={(e) => setFormData({ ...formData, heroBadge: e.target.value })}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-500"
                    placeholder="KERALA COMMERCIAL INFRASTRUCTURE & CONSTRUCTION LOGISTICS"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Hero Main Headline *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.heroHeadline}
                    onChange={(e) => setFormData({ ...formData, heroHeadline: e.target.value })}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm font-bold text-white placeholder-slate-500 outline-none focus:border-amber-500"
                    placeholder="Heavy Construction Equipment & Precision Plant Logistics"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Hero Subtitle Description *
                  </label>
                  <textarea
                    rows={3}
                    required
                    value={formData.heroSubheadline}
                    onChange={(e) => setFormData({ ...formData, heroSubheadline: e.target.value })}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-500 resize-none"
                    placeholder="Commercial concrete mixers, vertical material hoists, and heavy de-watering plant supplied across Kerala with certified operators."
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Primary CTA Button Label
                    </label>
                    <input
                      type="text"
                      value={formData.heroPrimaryCta || ""}
                      onChange={(e) => setFormData({ ...formData, heroPrimaryCta: e.target.value })}
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-500"
                      placeholder="Request Hire Quotation"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Secondary CTA Button Label
                    </label>
                    <input
                      type="text"
                      value={formData.heroSecondaryCta || ""}
                      onChange={(e) => setFormData({ ...formData, heroSecondaryCta: e.target.value })}
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-500"
                      placeholder="Search Plant Inventory"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Footer Commercial Disclaimer / Legal Copy
                  </label>
                  <input
                    type="text"
                    value={formData.footerCopy || ""}
                    onChange={(e) => setFormData({ ...formData, footerCopy: e.target.value })}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-500"
                    placeholder="ZERO GROUP Equipment Rentals. All commercial plant certified under Kerala industrial equipment safety guidelines."
                  />
                </div>
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════ */}
          {/* TAB 2: FLEET CATALOG MANAGER                                     */}
          {/* ═════════════════════════════════════════════════════════════════ */}
          {activeTab === "catalog" && (
            <div className="space-y-6">
              {/* Section Header Controls */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 sm:p-6 space-y-4">
                <div className="border-b border-slate-800 pb-2.5 flex items-center gap-2">
                  <Cog className="w-4 h-4 text-amber-500" strokeWidth={1.5} />
                  <h3 className="text-sm font-bold text-white">Machinery Catalog Section Header</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Catalog Section Main Title
                    </label>
                    <input
                      type="text"
                      value={formData.catalogHeading || ""}
                      onChange={(e) => setFormData({ ...formData, catalogHeading: e.target.value })}
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-500 transition-colors"
                      placeholder="Certified Construction Machinery Catalog"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Catalog Section Subtitle Description
                    </label>
                    <input
                      type="text"
                      value={formData.catalogSubheading || ""}
                      onChange={(e) => setFormData({ ...formData, catalogSubheading: e.target.value })}
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-500 transition-colors"
                      placeholder="All machinery is serviced, pressure-tested, and certified prior to site mobilization."
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between bg-slate-900 border border-slate-800 rounded-xl p-4 sm:p-5">
                <div>
                  <h3 className="text-sm font-bold text-white">Commercial Plant & Machinery Catalog</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Add, edit, or remove machines shown on the public equipment catalog with real-time specs and categories.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddCatalogItem}
                  className="inline-flex items-center gap-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs px-3.5 py-2 rounded-lg transition-colors cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Machine</span>
                </button>
              </div>

              {(!formData.catalogItems || formData.catalogItems.length === 0) ? (
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-10 text-center">
                  <Cog className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-300">Catalog is currently empty</p>
                  <p className="text-xs text-slate-500 mt-1">Click "Add Machine" above to create your first fleet entry.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {formData.catalogItems.map((item, itemIdx) => {
                    const IconComp = ICON_MAP[item.categoryIcon] || Cog;
                    return (
                      <div
                        key={item.id || `item-${itemIdx}`}
                        className={`bg-slate-900 border rounded-xl p-5 space-y-4 transition-all ${
                          item.isActive ? "border-slate-800" : "border-slate-800/40 opacity-60"
                        }`}
                      >
                        {/* Header bar of machine card */}
                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                          <div className="flex items-center gap-3">
                            <span className="text-xs font-mono font-bold text-amber-500 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                              #{itemIdx + 1}
                            </span>
                            <div className="flex items-center gap-2">
                              <IconComp className="w-4 h-4 text-amber-400" />
                              <span className="text-sm font-bold text-white">{item.title || "Untitled Machine"}</span>
                            </div>
                            <span className="text-[11px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                              {item.category}
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            {/* Sort buttons */}
                            <button
                              type="button"
                              onClick={() => handleMoveCatalogItem(itemIdx, "up")}
                              disabled={itemIdx === 0}
                              className="p-1.5 rounded bg-slate-950 text-slate-400 hover:text-white disabled:opacity-30 border border-slate-800"
                              title="Move Up"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveCatalogItem(itemIdx, "down")}
                              disabled={itemIdx === (formData.catalogItems?.length || 1) - 1}
                              className="p-1.5 rounded bg-slate-950 text-slate-400 hover:text-white disabled:opacity-30 border border-slate-800"
                              title="Move Down"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>

                            {/* Active Toggle */}
                            <label className="flex items-center gap-1.5 text-xs text-slate-300 ml-2 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={item.isActive}
                                onChange={(e) => handleUpdateCatalogItem(itemIdx, "isActive", e.target.checked)}
                                className="w-3.5 h-3.5 rounded text-amber-500 focus:ring-amber-500 border-slate-700 bg-slate-950"
                              />
                              <span>Active</span>
                            </label>

                            {/* Delete button */}
                            <button
                              type="button"
                              onClick={() => handleRemoveCatalogItem(itemIdx)}
                              className="p-1.5 rounded bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/30 ml-2"
                              title="Delete Machine"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Machine Details Form */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                              Machine Title *
                            </label>
                            <input
                              type="text"
                              value={item.title}
                              onChange={(e) => handleUpdateCatalogItem(itemIdx, "title", e.target.value)}
                              className="w-full rounded border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-white outline-none focus:border-amber-500"
                              placeholder="Hydraulic Reversible Drum Mixer (10/7 & 10/14 Cu. Ft.)"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                              Category Name *
                            </label>
                            <input
                              type="text"
                              value={item.category}
                              onChange={(e) => handleUpdateCatalogItem(itemIdx, "category", e.target.value)}
                              className="w-full rounded border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-white outline-none focus:border-amber-500"
                              placeholder="Concrete Mixers & Batching"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                              Category Icon
                            </label>
                            <select
                              value={item.categoryIcon}
                              onChange={(e) => handleUpdateCatalogItem(itemIdx, "categoryIcon", e.target.value)}
                              className="w-full rounded border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-white outline-none focus:border-amber-500"
                            >
                              {AllowedIcons.map((ic) => (
                                <option key={ic} value={ic}>
                                  {ic}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                          <div>
                            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                              Engine / Power Specifications *
                            </label>
                            <input
                              type="text"
                              value={item.power}
                              onChange={(e) => handleUpdateCatalogItem(itemIdx, "power", e.target.value)}
                              className="w-full rounded border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-white outline-none focus:border-amber-500"
                              placeholder="Kirloskar Water-Cooled Diesel / 3-Phase Electric"
                            />
                          </div>

                          <div>
                            <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                              Ideal For Job Applications *
                            </label>
                            <input
                              type="text"
                              value={item.idealFor}
                              onChange={(e) => handleUpdateCatalogItem(itemIdx, "idealFor", e.target.value)}
                              className="w-full rounded border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-white outline-none focus:border-amber-500"
                              placeholder="Commercial Slabs, Foundations, Rafts & Infrastructure"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                                Classification *
                              </label>
                              <input
                                type="text"
                                value={item.classification}
                                onChange={(e) => handleUpdateCatalogItem(itemIdx, "classification", e.target.value)}
                                className="w-full rounded border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-white outline-none focus:border-amber-500"
                                placeholder="Commercial Heavy"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                                Demand Tag *
                              </label>
                              <input
                                type="text"
                                value={item.demandTag}
                                onChange={(e) => handleUpdateCatalogItem(itemIdx, "demandTag", e.target.value)}
                                className="w-full rounded border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-white outline-none focus:border-amber-500"
                                placeholder="High Demand"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Bullet point specifications */}
                        <div className="pt-2 border-t border-slate-800/60">
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-[11px] font-semibold text-slate-400">
                              Technical Bullet Specifications ({item.specs?.length || 0})
                            </span>
                            <button
                              type="button"
                              onClick={() => handleAddSpecBullet(itemIdx)}
                              className="text-[10px] font-bold text-amber-400 hover:text-amber-300 flex items-center gap-1"
                            >
                              <Plus className="w-3 h-3" />
                              <span>Add Bullet Point</span>
                            </button>
                          </div>
                          <div className="space-y-1.5">
                            {item.specs?.map((spec, specIdx) => (
                              <div key={specIdx} className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                <input
                                  type="text"
                                  value={spec}
                                  onChange={(e) => handleUpdateSpecBullet(itemIdx, specIdx, e.target.value)}
                                  className="flex-1 rounded border border-slate-800 bg-slate-950 px-2.5 py-1 text-xs text-slate-200 outline-none focus:border-amber-500"
                                  placeholder="e.g. Hydraulic automatic loading hopper skip"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSpecBullet(itemIdx, specIdx)}
                                  className="text-slate-500 hover:text-rose-400 p-1"
                                  title="Delete specification"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════ */}
          {/* TAB 3: VALUE PROPOSITIONS                                        */}
          {/* ═════════════════════════════════════════════════════════════════ */}
          {activeTab === "valueprops" && (
            <div className="space-y-6">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
                <h3 className="text-sm font-bold text-white">Value Proposition Cards (Why Zero Group)</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  These 4 feature highlights appear right below the hero section on the homepage to establish operational credibility.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {(formData.valueProps || []).map((vp, vpIdx) => {
                  const IconComp = ICON_MAP[vp.iconName] || Truck;
                  return (
                    <div
                      key={vp.id || `vp-${vpIdx}`}
                      className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3.5"
                    >
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                        <div className="flex items-center gap-2">
                          <div className="p-1.5 rounded bg-amber-500/10 text-amber-400">
                            <IconComp className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-bold text-white">Card #{vpIdx + 1}</span>
                        </div>
                        <select
                          value={vp.iconName}
                          onChange={(e) => handleUpdateValueProp(vpIdx, "iconName", e.target.value)}
                          className="rounded border border-slate-800 bg-slate-950 px-2 py-1 text-xs text-white outline-none focus:border-amber-500"
                        >
                          {AllowedIcons.map((ic) => (
                            <option key={ic} value={ic}>
                              {ic}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                          Eyebrow Tag / Badge *
                        </label>
                        <input
                          type="text"
                          value={vp.badge}
                          onChange={(e) => handleUpdateValueProp(vpIdx, "badge", e.target.value)}
                          className="w-full rounded border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-amber-400 font-semibold outline-none focus:border-amber-500"
                          placeholder="Flatbed Transit"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                          Card Title *
                        </label>
                        <input
                          type="text"
                          value={vp.title}
                          onChange={(e) => handleUpdateValueProp(vpIdx, "title", e.target.value)}
                          className="w-full rounded border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-white font-bold outline-none focus:border-amber-500"
                          placeholder="Direct Site Mobilization"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                          Description Copy *
                        </label>
                        <textarea
                          rows={2}
                          value={vp.description}
                          onChange={(e) => handleUpdateValueProp(vpIdx, "description", e.target.value)}
                          className="w-full rounded border border-slate-800 bg-slate-950 px-2.5 py-1.5 text-xs text-slate-300 outline-none focus:border-amber-500 resize-none"
                          placeholder="Scheduled flatbed delivery from Kottayam yard directly to your project location."
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ═════════════════════════════════════════════════════════════════ */}
          {/* TAB 4: CENTRAL YARD & COVERAGE                                   */}
          {/* ═════════════════════════════════════════════════════════════════ */}
          {activeTab === "yard" && (
            <div className="space-y-6">
              {/* Base Yard Coordinates & Address */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 sm:p-7 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-amber-500" strokeWidth={1.5} />
                    <h3 className="text-sm font-bold text-white">Central Base Yard (Origin For Route Tracking)</h3>
                  </div>
                  <button
                    type="button"
                    onClick={handleUseYardPreset}
                    className="text-xs text-amber-400 hover:text-amber-300 font-semibold bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 px-3 py-1.5 rounded-lg transition-colors cursor-pointer"
                  >
                    Set Pala Kottayam Yard Coordinates
                  </button>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Central Yard Physical Address *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.storeAddress}
                    onChange={(e) => setFormData({ ...formData, storeAddress: e.target.value })}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-500"
                    placeholder="Central Machinery Yard, Pala - Ponkunnam Road, Kottayam, Kerala 686575"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Depot Latitude (GPS) *
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={formData.storeLatitude}
                      onChange={(e) => setFormData({ ...formData, storeLatitude: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs font-mono text-white outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Depot Longitude (GPS) *
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      value={formData.storeLongitude}
                      onChange={(e) => setFormData({ ...formData, storeLongitude: parseFloat(e.target.value) || 0 })}
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs font-mono text-white outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Central Yard Operating / Working Hours
                  </label>
                  <input
                    type="text"
                    value={formData.operatingHours || ""}
                    onChange={(e) => setFormData({ ...formData, operatingHours: e.target.value })}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-500 transition-colors"
                    placeholder="Mon – Sun: 6:00 AM – 9:00 PM"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Appears in the Central Base Yard contact block in the website footer.</p>
                </div>

                <p className="text-[11px] text-slate-400">
                  * Note: Coordinates are used by the system to compute driving polylines, km distances, and transit mobilization times to client sites.
                </p>
              </div>

              {/* Helplines and GSTIN */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 sm:p-7 space-y-5">
                <div className="border-b border-slate-800 pb-3 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-amber-500" strokeWidth={1.5} />
                  <h3 className="text-sm font-bold text-white">Commercial Helplines & Legal Identifiers</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Corporate Company Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.storeName}
                      onChange={(e) => setFormData({ ...formData, storeName: e.target.value })}
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white outline-none focus:border-amber-500"
                      placeholder="ZERO GROUP Heavy Machinery & Equipment Rentals"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Commercial GSTIN *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.gstinNumber}
                      onChange={(e) => setFormData({ ...formData, gstinNumber: e.target.value })}
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs font-mono text-white outline-none focus:border-amber-500"
                      placeholder="32AAACZ0000A1Z5"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Primary Phone Helpline *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.companyPhone}
                      onChange={(e) => setFormData({ ...formData, companyPhone: e.target.value })}
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white outline-none focus:border-amber-500"
                      placeholder="+91 94471 23456"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      WhatsApp Dispatch Number *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.whatsappNumber}
                      onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white outline-none focus:border-amber-500"
                      placeholder="919447123456"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Corporate Operations Email *
                    </label>
                    <input
                      type="email"
                      required
                      value={formData.companyEmail}
                      onChange={(e) => setFormData({ ...formData, companyEmail: e.target.value })}
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white outline-none focus:border-amber-500"
                      placeholder="operations@zerogroup.in"
                    />
                  </div>
                </div>
              </div>

              {/* Commercial Hire Inquiry Section Copy */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 sm:p-7 space-y-4">
                <div className="border-b border-slate-800 pb-3 flex items-center gap-2">
                  <Phone className="w-4 h-4 text-amber-500" strokeWidth={1.5} />
                  <h3 className="text-sm font-bold text-white">Commercial Hire Inquiry Section Copy</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Inquiry Section Main Title
                    </label>
                    <input
                      type="text"
                      value={formData.inquiryHeading || ""}
                      onChange={(e) => setFormData({ ...formData, inquiryHeading: e.target.value })}
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-500 transition-colors"
                      placeholder="Request Machinery Hire Quotation"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                      Inquiry Section Subtitle Description
                    </label>
                    <input
                      type="text"
                      value={formData.inquirySubheading || ""}
                      onChange={(e) => setFormData({ ...formData, inquirySubheading: e.target.value })}
                      className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-xs text-white placeholder-slate-500 outline-none focus:border-amber-500 transition-colors"
                      placeholder="Submit your project schedule below. Central Yard dispatch will confirm machine availability and issue formal hire rates."
                    />
                  </div>
                </div>
              </div>

              {/* Kerala Districts Covered */}
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 sm:p-7 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-white">Active Service Coverage Districts (Kerala)</h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      These districts appear in the hire inquiry quotation dropdown.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleResetDistricts}
                    className="text-xs text-slate-400 hover:text-white flex items-center gap-1 font-medium cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset All 14 Districts</span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {(formData.districtsCovered || []).map((district) => (
                    <span
                      key={district}
                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-950 border border-slate-800 text-xs font-medium text-slate-200"
                    >
                      <span>{district}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveDistrict(district)}
                        className="text-slate-500 hover:text-rose-400"
                        title={`Remove ${district}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>

                <div className="flex items-center gap-2 max-w-sm pt-2">
                  <input
                    type="text"
                    value={newDistrictInput}
                    onChange={(e) => setNewDistrictInput(e.target.value)}
                    placeholder="Add district..."
                    className="flex-1 rounded-lg border border-slate-800 bg-slate-950 px-3 py-1.5 text-xs text-white outline-none focus:border-amber-500"
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddDistrict();
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={handleAddDistrict}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 border border-slate-700"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Bottom Save Bar */}
          <div className="flex items-center justify-between border-t border-slate-800 pt-5">
            <span className="text-xs text-slate-400">
              * Edits are instantly revalidated across edge CDN and public home page upon saving.
            </span>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 disabled:opacity-50 text-slate-950 px-6 py-3 rounded-lg text-sm font-bold shadow-sm transition-colors cursor-pointer"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Saving CMS Settings...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" strokeWidth={1.5} />
                  <span>Save CMS Settings</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
