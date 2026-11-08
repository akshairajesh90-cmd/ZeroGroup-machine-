"use client";

import React, { useState } from "react";
import Link from "next/link";
import { 
  Building2, Truck, Wrench, CheckCircle2, Phone, MessageSquare, 
  MapPin, ChevronRight, ArrowRight, HardHat, ExternalLink, 
  Layers, Navigation, UserCheck, AlertTriangle, ShieldCheck, Mail, Clock
} from "lucide-react";
import { CorporateWebsiteSettingsData } from "@/actions/websiteSettings";

interface PublicLandingProps {
  sessionUser?: {
    name?: string | null;
    role?: string;
  } | null;
  settings: CorporateWebsiteSettingsData;
}

const CORPORATE_FLEET = [
  {
    category: "Heavy Concrete Mixers & Batching",
    subtext: "Hydraulic Reversible & Heavy Duty Drum Machinery",
    machines: [
      {
        title: "Hydraulic Reversible Drum Mixer (10/7 & 10/14 Cu. Ft.)",
        power: "Kirloskar Water-Cooled Diesel / 3-Phase Electric",
        specs: [
          "Hydraulic automatic loading hopper skip",
          "Calibrated water metering system with auto-cutoff",
          "Dual-direction discharge chute with anti-spill guard",
          "Towable chassis on heavy pneumatic radial tires",
        ],
        idealFor: "Commercial Slabs, Foundations, Rafts & Infrastructure",
        classification: "Commercial Heavy",
      },
      {
        title: "Heavy-Duty Diesel Concrete Mixer (10/7 Cu. Ft.)",
        power: "Heavy Single-Cylinder Air-Cooled Diesel Engine",
        specs: [
          "Precision-cast iron mixing drum with reinforced bevel gear",
          "Tow bar with heavy suspension for rough terrain haulage",
          "Low fuel consumption: under 1.2 L/hr continuous load",
          "Lockable engine housing with safety emergency cutoff",
        ],
        idealFor: "Residential Projects, Retaining Walls & Column Pours",
        classification: "Standard Plant",
      },
    ],
  },
  {
    category: "Vertical Material Hoists & Tower Winches",
    subtext: "Certified High-Rise Building Material Hoisting Systems",
    machines: [
      {
        title: "Builder's Heavy Material Hoist (1 Ton / 100+ Feet)",
        power: "Geared Electric Motor with Electromagnetic Fail-Safe Brake",
        specs: [
          "Automatic limit switches at top and floor levels",
          "Heavy steel cage with safety interlocking gates",
          "Certified wire rope with 6x safety factor",
          "Scaffolding wall-tie brackets & mast sections included",
        ],
        idealFor: "Multi-Storey Concrete, Masonry Blocks & Reinforcement Steel",
        classification: "Certified High-Rise",
      },
      {
        title: "Portable Cantilever Rope Winch Hoist (300 - 500 kg)",
        power: "High-Speed Single-Phase / 3-Phase Electric Winch",
        specs: [
          "360-degree rotating boom for safe parapet unloading",
          "Quick-clamp column mount for rapid roof installation",
          "Dead-man pendant control switch with emergency stop",
        ],
        idealFor: "Roof-Top Concreting, Finishing Materials & Interior Shifting",
        classification: "Rapid Setup",
      },
    ],
  },
  {
    category: "Concrete Compaction & Finishing Plant",
    subtext: "High-Frequency Needle Vibrators & Surface Screeds",
    machines: [
      {
        title: "High-Frequency Concrete Needle Vibrator Rig",
        power: "Honda 4-Stroke Petrol / Induction Electric Drive",
        specs: [
          "Choice of 40mm and 60mm flexible needle pokers",
          "Reinforced steel-braided rubber shafts (4m & 6m lengths)",
          "12,000 vibrations per minute for total void elimination",
          "Quick-release universal drive coupling",
        ],
        idealFor: "Dense RCC Slabs, Heavy Beams, Columns & Retaining Structures",
        classification: "Structural Essential",
      },
      {
        title: "Heavy Soil & Sand Plate Compactor",
        power: "Greaves / Honda 5 HP Industrial Engine",
        specs: [
          "Ductile iron base plate with curved edges to avoid gouging",
          "3,500 kg centrifugal compaction force",
          "Vibration-isolated ergonomic guide handle",
          "Built-in transport wheels for single-man site moving",
        ],
        idealFor: "Sub-Base Compaction, Trench Backfills & Interlocking Pavers",
        classification: "Earthwork",
      },
    ],
  },
  {
    category: "Industrial De-Watering & Pumping",
    subtext: "High-Discharge Sludge & Trench Drainage Units",
    machines: [
      {
        title: "Heavy-Duty Diesel De-Watering Trash Pump (3-Inch / 4-Inch)",
        power: "Single-Cylinder Industrial Diesel with Electric Start",
        specs: [
          "1,400 Litres/Minute high-volume displacement",
          "Silicon carbide mechanical seals for sandy / abrasive sludge",
          "Solids handling up to 28mm spherical diameter",
          "Complete suction hose, strainer, and delivery lay-flat hose kit",
        ],
        idealFor: "Monsoon Foundation Flooding, Deep Basement Excavations & Pits",
        classification: "Monsoon Fleet",
      },
    ],
  },
];

const KERALA_DISTRICTS = [
  "Ernakulam",
  "Kottayam",
  "Thrissur",
  "Alappuzha",
  "Pathanamthitta",
  "Idukki",
  "Kollam",
  "Thiruvananthapuram",
  "Palakkad",
  "Malappuram",
  "Kozhikode",
  "Kannur",
  "Wayanad",
  "Kasaragod",
];

export default function PublicLandingClient({ sessionUser, settings }: PublicLandingProps) {
  const [selectedMachine, setSelectedMachine] = useState("Hydraulic Reversible Drum Mixer (10/7 & 10/14 Cu. Ft.)");
  const [contractorName, setContractorName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [district, setDistrict] = useState("Kottayam");
  const [duration, setDuration] = useState("1 Week");
  const [needOperator, setNeedOperator] = useState(true);
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const cleanWhatsAppNumber = settings.whatsappNumber.replace(/\D/g, "");

  const generateWhatsAppUrl = () => {
    const text = `*OFFICIAL EQUIPMENT RENTAL INQUIRY*%0A*Company / Client:* ${companyName || contractorName || "Prospective Client"}%0A*Contact Person:* ${contractorName || "Site In-Charge"}%0A*Phone:* ${phone || "Not provided"}%0A*Job District:* ${district}, Kerala%0A*Required Machinery:* ${selectedMachine}%0A*Certified Operator Required:* ${needOperator ? "YES (Operator Included)" : "NO (Machinery Only)"}%0A*Hire Period:* ${duration}%0A*Site Details / Scope:* ${notes || "Standard construction pour"}%0A%0A_Please provide formal availability schedule and commercial quotation._`;
    return `https://wa.me/${cleanWhatsAppNumber}?text=${text}`;
  };

  const handleInquirySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (typeof window !== "undefined") {
      window.open(generateWhatsAppUrl(), "_blank");
    }
  };

  const getDashboardLink = () => {
    if (!sessionUser) return "/login";
    const role = sessionUser.role;
    if (role === "OWNER" || role === "ADMIN") return "/admin/dashboard";
    if (role === "STAFF") return "/staff/dashboard";
    if (role === "OPERATOR") return "/operator/home";
    return "/driver/home";
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-indigo-600 selection:text-white">
      {/* ── 1. MAINTENANCE / EMERGENCY BROADCAST BAR ────────────────────── */}
      {settings.maintenanceMode && (
        <div className="bg-amber-500/15 border-b border-amber-500/30 text-amber-200 px-4 py-2.5 text-xs font-semibold">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>{settings.maintenanceNotice}</span>
            </div>
            <div className="flex items-center gap-2 text-amber-300">
              <span>Emergency Operations Desk:</span>
              <a href={`tel:${settings.companyPhone}`} className="font-bold underline hover:text-white">
                {settings.companyPhone}
              </a>
            </div>
          </div>
        </div>
      )}

      {/* ── 2. CORPORATE HEADER ────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-slate-950/90 border-b border-slate-800/90">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          {/* Company Brand Logo */}
          <Link href="/" className="flex items-center gap-3.5 group">
            <div className="h-11 w-11 rounded-xl bg-slate-900 border border-slate-700/80 flex items-center justify-center text-indigo-400 shadow-md group-hover:border-indigo-500 transition-colors">
              <Building2 className="h-6 w-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-black tracking-tight text-white">ZERO GROUP</span>
                <span className="text-[10px] font-black uppercase tracking-wider bg-slate-800 text-slate-300 px-2 py-0.5 rounded border border-slate-700">
                  EQUIPMENT
                </span>
              </div>
              <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                Heavy Machinery & Plant Logistics
              </p>
            </div>
          </Link>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-bold uppercase tracking-wider text-slate-300">
            <a href="#machinery" className="hover:text-indigo-400 transition-colors">Equipment Fleet</a>
            <a href="#services" className="hover:text-indigo-400 transition-colors">Plant Solutions</a>
            <a href="#standards" className="hover:text-indigo-400 transition-colors">Engineering Standards</a>
            <a href="#inquiry" className="hover:text-indigo-400 transition-colors">Hire Quotation</a>
          </nav>

          {/* Actions & Portal Access */}
          <div className="flex items-center gap-3">
            <a
              href={`tel:${settings.companyPhone}`}
              className="hidden lg:flex items-center gap-2 text-xs font-bold text-slate-300 hover:text-white bg-slate-900 border border-slate-800 px-3.5 py-2.5 rounded-xl transition-all"
            >
              <Phone className="h-3.5 w-3.5 text-indigo-400" />
              <span>{settings.companyPhone}</span>
            </a>

            {sessionUser ? (
              <Link
                href={getDashboardLink()}
                className="flex items-center gap-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl shadow-md transition-all"
              >
                <UserCheck className="h-4 w-4" />
                <span>Go to {sessionUser.role} Portal</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-2 text-xs font-bold bg-slate-900 hover:bg-slate-800 border border-slate-700 hover:border-slate-600 text-slate-200 hover:text-white px-4 py-2.5 rounded-xl shadow-md transition-all"
              >
                <ShieldCheck className="h-4 w-4 text-indigo-400" />
                <span>Staff & Crew Portal</span>
                <ChevronRight className="h-4 w-4 text-slate-500" />
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ── 3. HERO SECTION ────────────────────────────────────────────── */}
      <section className="relative overflow-hidden pt-12 pb-20 md:pt-16 md:pb-28 border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          {/* Corporate Accreditation Strip */}
          <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-xs font-semibold text-slate-300 mb-6">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="font-mono text-slate-400">GSTIN: {settings.gstinNumber}</span>
            <span className="text-slate-600">|</span>
            <span>Central Base Yard: {settings.storeAddress.split(",")[0] || "Kottayam Central Hub"}</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white max-w-4xl mx-auto leading-tight">
            {settings.heroHeadline}
          </h1>

          <p className="mt-5 text-base sm:text-lg text-slate-400 max-w-3xl mx-auto leading-relaxed">
            {settings.heroSubheadline}
          </p>

          {/* Action CTAs */}
          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            <a
              href="#inquiry"
              className="inline-flex items-center gap-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm px-7 py-3.5 rounded-xl shadow-lg shadow-indigo-600/20 transition-all hover:scale-105"
            >
              <span>Submit Commercial Hire Request</span>
              <ArrowRight className="h-4 w-4" />
            </a>

            <a
              href="#machinery"
              className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-bold text-sm px-6 py-3.5 rounded-xl transition-all"
            >
              <span>Browse Plant Inventory</span>
              <Layers className="h-4 w-4 text-indigo-400" />
            </a>
          </div>

          {/* Operational Standards Matrix */}
          <div className="mt-14 grid grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto text-left">
            <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800">
              <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider mb-1.5">
                <Truck className="h-4 w-4" />
                <span>Flatbed Logistics</span>
              </div>
              <h2 className="text-sm font-bold text-white">Direct Site Transit</h2>
              <p className="text-xs text-slate-400 mt-1">
                Same-day machinery mobilization with road-snapped fleet tracking directly to your pour coordinates.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800">
              <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider mb-1.5">
                <HardHat className="h-4 w-4" />
                <span>Rigging Crew</span>
              </div>
              <h2 className="text-sm font-bold text-white">Certified Operators</h2>
              <p className="text-xs text-slate-400 mt-1">
                Experienced plant operators trained in hydraulic safety, batch consistency, and site coordination.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800">
              <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider mb-1.5">
                <Wrench className="h-4 w-4" />
                <span>Field Engineering</span>
              </div>
              <h2 className="text-sm font-bold text-white">Mobile Workshop Service</h2>
              <p className="text-xs text-slate-400 mt-1">
                Rapid breakdown response with replacement hydraulic pumps and spares on standby.
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900/70 border border-slate-800">
              <div className="flex items-center gap-2 text-indigo-400 font-bold text-xs uppercase tracking-wider mb-1.5">
                <Building2 className="h-4 w-4" />
                <span>Corporate Accounts</span>
              </div>
              <h2 className="text-sm font-bold text-white">Tax Invoices & Logs</h2>
              <p className="text-xs text-slate-400 mt-1">
                Formal commercial hire agreements, itemized GST billing, and verified machine run logs.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── 4. MACHINERY INVENTORY & SPECS ──────────────────────────────── */}
      <section id="machinery" className="py-20 bg-slate-900/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">
              Plant & Equipment Inventory
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white mt-2">
              Commercial Grade Construction Machinery
            </h2>
            <p className="mt-3 text-slate-400 text-sm">
              All machines undergo multi-point mechanical inspection, pressure testing, and lubrication prior to dispatch.
            </p>
          </div>

          <div className="space-y-12">
            {CORPORATE_FLEET.map((group, gIdx) => (
              <div key={gIdx} className="space-y-5">
                <div className="border-b border-slate-800 pb-2.5 flex flex-wrap items-baseline justify-between gap-2">
                  <h3 className="text-xl font-bold text-white flex items-center gap-2">
                    <span className="w-1.5 h-5 bg-indigo-500 rounded-full" />
                    {group.category}
                  </h3>
                  <span className="text-xs text-slate-400">{group.subtext}</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {group.machines.map((m, mIdx) => (
                    <div
                      key={mIdx}
                      className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 flex flex-col justify-between hover:border-slate-700 transition-colors"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-3">
                          <span className="text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-800 text-indigo-300 border border-slate-700">
                            {m.classification}
                          </span>
                          <span className="text-[11px] text-slate-400 font-mono">
                            Certified Unit
                          </span>
                        </div>

                        <h4 className="text-lg font-bold text-white mb-1.5">{m.title}</h4>
                        <p className="text-xs text-slate-400 mb-4 font-mono">
                          <span className="text-slate-300 font-bold">Drive:</span> {m.power}
                        </p>

                        <div className="space-y-2 mb-5">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                            Engineering Specifications:
                          </p>
                          <ul className="space-y-1.5">
                            {m.specs.map((spec, sIdx) => (
                              <li key={sIdx} className="text-xs text-slate-300 flex items-start gap-2">
                                <CheckCircle2 className="h-3.5 w-3.5 text-indigo-400 shrink-0 mt-0.5" />
                                <span>{spec}</span>
                              </li>
                            ))}
                          </ul>
                        </div>

                        <div className="p-2.5 rounded-lg bg-slate-950/70 border border-slate-800/80 mb-5">
                          <p className="text-[11px] text-slate-400">
                            <span className="font-bold text-slate-300">Target Application:</span> {m.idealFor}
                          </p>
                        </div>
                      </div>

                      <a
                        href="#inquiry"
                        onClick={() => setSelectedMachine(m.title)}
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white font-bold text-xs uppercase tracking-wider transition-colors"
                      >
                        <span>Select for Hire Quote</span>
                        <ArrowRight className="h-3.5 w-3.5" />
                      </a>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. CORPORATE HIRE INQUIRY FORM ──────────────────────────────── */}
      <section id="inquiry" className="py-20 bg-slate-950 border-t border-slate-800/80">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-10">
            <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">
              Commercial Operations Desk
            </span>
            <h2 className="text-3xl font-black text-white mt-2">
              Request Machinery Hire Quotation
            </h2>
            <p className="mt-2 text-slate-400 text-sm">
              Submit your project schedule. Our dispatch team confirms machinery availability and issues a formal quote.
            </p>
          </div>

          <div className="rounded-3xl border border-slate-800 bg-slate-900/90 p-6 sm:p-8 shadow-xl">
            <form onSubmit={handleInquirySubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Contracting Firm / Company Name
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Skyline Infrastructure Pvt Ltd"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Site Engineer / Contact Person *
                  </label>
                  <input
                    type="text"
                    required
                    value={contractorName}
                    onChange={(e) => setContractorName(e.target.value)}
                    placeholder="e.g. Alex Thomas (Site Manager)"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Contact Phone / WhatsApp *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="10-digit mobile number"
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Job Site District (Kerala) *
                  </label>
                  <select
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                  >
                    {KERALA_DISTRICTS.map((dist) => (
                      <option key={dist} value={dist}>
                        {dist}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Required Equipment *
                  </label>
                  <select
                    value={selectedMachine}
                    onChange={(e) => setSelectedMachine(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                  >
                    <option value="Hydraulic Reversible Drum Mixer (10/7 & 10/14 Cu. Ft.)">
                      Hydraulic Reversible Drum Mixer
                    </option>
                    <option value="Heavy-Duty Diesel Concrete Mixer (10/7 Cu. Ft.)">
                      Heavy-Duty Diesel Concrete Mixer
                    </option>
                    <option value="Builder's Heavy Material Hoist (1 Ton / 100+ Feet)">
                      High-Rise Material Hoist (1 Ton)
                    </option>
                    <option value="Portable Cantilever Rope Winch Hoist (300 - 500 kg)">
                      Portable Rope Winch Crane
                    </option>
                    <option value="High-Frequency Concrete Needle Vibrator Rig">
                      High-Frequency Needle Vibrator Rig
                    </option>
                    <option value="Heavy Soil & Sand Plate Compactor">
                      Plate Compactor
                    </option>
                    <option value="Heavy-Duty Diesel De-Watering Trash Pump (3-Inch / 4-Inch)">
                      Diesel De-Watering Trash Pump
                    </option>
                    <option value="Multiple Plant Combination Package">
                      Multiple Plant Combination Package
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                    Estimated Hire Duration *
                  </label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
                  >
                    <option value="1 to 3 Days">1 to 3 Days (Pour Basis)</option>
                    <option value="1 Week">1 Week</option>
                    <option value="2 to 3 Weeks">2 to 3 Weeks</option>
                    <option value="1 Month or Long Term">1 Month or Long Term Contract</option>
                  </select>
                </div>
              </div>

              {/* Operator Requirement Toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-950 border border-slate-800">
                <div>
                  <p className="text-xs font-bold text-white">Include Certified Plant Operator</p>
                  <p className="text-[11px] text-slate-400">
                    Experienced rig operator supplied with machine for safety and batch quality.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={needOperator}
                  onChange={(e) => setNeedOperator(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 bg-slate-900 border-slate-700"
                />
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-1.5">
                  Site Scope & Special Requirements
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. 5th floor slab pour scheduled for next Tuesday; 3-phase power available on site."
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-white placeholder-slate-600 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 resize-none"
                />
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 py-3.5 px-6 text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-indigo-600/20 transition-all hover:scale-[1.01]"
              >
                <MessageSquare className="h-4 w-4" />
                <span>Submit Quotation Request via WhatsApp Desk</span>
                <ArrowRight className="h-4 w-4" />
              </button>

              {submitted && (
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs text-center">
                  ✅ Inquiry prepared. If WhatsApp did not launch automatically,{" "}
                  <a
                    href={generateWhatsAppUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-bold underline"
                  >
                    click here to open WhatsApp directly
                  </a>
                  .
                </div>
              )}
            </form>
          </div>
        </div>
      </section>

      {/* ── 6. CORPORATE FOOTER ────────────────────────────────────────── */}
      <footer className="border-t border-slate-800/90 bg-slate-950 py-12 text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-white">
              <Building2 className="h-5 w-5 text-indigo-400" />
              <span className="text-base font-black">ZERO GROUP</span>
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              Heavy construction plant hire, hydraulic batching mixers, high-rise material hoists, and engineering site logistics.
            </p>
            <p className="font-mono text-[11px] text-slate-500">
              GSTIN: {settings.gstinNumber}
            </p>
          </div>

          <div>
            <h4 className="font-bold uppercase tracking-wider text-slate-200 mb-2.5 text-xs">Central Base Yard</h4>
            <p className="leading-relaxed text-[11px]">
              {settings.storeAddress}<br />
              GPS: {settings.storeLatitude.toFixed(4)}, {settings.storeLongitude.toFixed(4)}<br />
              Hours: Mon – Sun: 6:00 AM – 9:00 PM
            </p>
          </div>

          <div>
            <h4 className="font-bold uppercase tracking-wider text-slate-200 mb-2.5 text-xs">Operations Contact</h4>
            <ul className="space-y-1.5 text-[11px]">
              <li className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-indigo-400" />
                <a href={`tel:${settings.companyPhone}`} className="hover:text-white">
                  {settings.companyPhone}
                </a>
              </li>
              <li className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-indigo-400" />
                <a href={`mailto:${settings.companyEmail}`} className="hover:text-white">
                  {settings.companyEmail}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold uppercase tracking-wider text-slate-200 mb-2.5 text-xs">Internal Access</h4>
            <p className="text-slate-500 mb-3 text-[11px]">
              Registered staff, fleet drivers, and field operators access internal dispatch and logbooks below:
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-400 hover:text-indigo-300"
            >
              <span>Employee Portal Sign In</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 pt-5 border-t border-slate-900 flex flex-wrap items-center justify-between gap-4 text-[11px] text-slate-600">
          <p>© {new Date().getFullYear()} {settings.storeName}. All rights reserved.</p>
          <div className="flex items-center gap-4">
            <span className="text-emerald-500 font-mono">● Operations Active</span>
            <Link href="/login" className="hover:text-slate-400">Portal Login</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
