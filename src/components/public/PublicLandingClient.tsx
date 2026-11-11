"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { 
  Building2, Truck, Wrench, CheckCircle2, Phone, MessageSquare, 
  MapPin, ChevronRight, ArrowRight, HardHat, ExternalLink, 
  Layers, Navigation, UserCheck, AlertTriangle, ShieldCheck, Mail, Clock,
  Search, SlidersHorizontal, Gauge, Cog, Fuel, Check, LucideIcon
} from "lucide-react";
import { 
  CorporateWebsiteSettingsData,
  DEFAULT_CATALOG_ITEMS,
  DEFAULT_VALUE_PROPS,
  DEFAULT_KERALA_DISTRICTS
} from "@/types/websiteSettings";

interface PublicLandingProps {
  sessionUser?: {
    name?: string | null;
    role?: string;
  } | null;
  settings: CorporateWebsiteSettingsData;
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

export default function PublicLandingClient({ sessionUser, settings }: PublicLandingProps) {
  const activeItems = useMemo(() => {
    const raw = settings.catalogItems && settings.catalogItems.length > 0 ? settings.catalogItems : DEFAULT_CATALOG_ITEMS;
    return raw.filter((item) => item.isActive !== false);
  }, [settings.catalogItems]);

  const activeValueProps = useMemo(() => {
    const raw = settings.valueProps && settings.valueProps.length > 0 ? settings.valueProps : DEFAULT_VALUE_PROPS;
    return raw.filter((vp) => vp.isActive !== false);
  }, [settings.valueProps]);

  const activeDistricts = useMemo(() => {
    return settings.districtsCovered && settings.districtsCovered.length > 0
      ? settings.districtsCovered
      : DEFAULT_KERALA_DISTRICTS;
  }, [settings.districtsCovered]);

  // Group dynamic items by category while preserving order
  const dynamicCatalogGroups = useMemo(() => {
    const groups: Array<{
      category: string;
      subtext?: string;
      icon: LucideIcon;
      machines: Array<{
        title: string;
        power: string;
        specs: string[];
        idealFor: string;
        classification: string;
        tag: string;
      }>;
    }> = [];

    const categoryMap = new Map<string, number>();

    for (const item of activeItems) {
      if (!categoryMap.has(item.category)) {
        categoryMap.set(item.category, groups.length);
        groups.push({
          category: item.category,
          subtext: item.categorySubtext || undefined,
          icon: ICON_MAP[item.categoryIcon] || Cog,
          machines: [],
        });
      }
      const groupIdx = categoryMap.get(item.category)!;
      groups[groupIdx].machines.push({
        title: item.title,
        power: item.power,
        specs: item.specs || [],
        idealFor: item.idealFor,
        classification: item.classification,
        tag: item.demandTag,
      });
    }

    return groups;
  }, [activeItems]);

  const initialSelectedMachine = activeItems.length > 0 ? activeItems[0].title : "Hydraulic Reversible Drum Mixer (10/7 & 10/14 Cu. Ft.)";
  const [selectedMachine, setSelectedMachine] = useState(initialSelectedMachine);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [contractorName, setContractorName] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [phone, setPhone] = useState("");
  const [district, setDistrict] = useState(activeDistricts[0] || "Kottayam");
  const [duration, setDuration] = useState("1 Week");
  const [needOperator, setNeedOperator] = useState(true);
  const [notes, setNotes] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const getCategoryLabel = (category: string) => {
    const lower = category.toLowerCase();
    if (lower.startsWith("concrete") || lower.includes("mixers") || lower.includes("batching")) return "Concrete";
    if (lower.includes("hoist") || lower.includes("winch")) return "Material Hoists";
    if (lower.includes("compaction") || lower.includes("vibrator")) return "Compaction";
    if (lower.includes("pump") || lower.includes("drainage")) return "Pumping";
    return category;
  };

  const getMachineDropdownLabel = (title: string) => {
    if (title.includes("Reversible Drum Mixer")) return "Hydraulic Reversible Drum Mixer";
    if (title.includes("Heavy-Duty Diesel Concrete Mixer")) return "Heavy-Duty Diesel Concrete Mixer";
    if (title.includes("Heavy Material Hoist")) return "High-Rise Material Hoist (1 Ton)";
    if (title.includes("Portable Cantilever")) return "Portable Rope Winch Crane";
    if (title.includes("Needle Vibrator")) return "High-Frequency Needle Vibrator Rig";
    if (title.includes("Plate Compactor")) return "Plate Compactor";
    if (title.includes("Trash Pump")) return "Diesel De-Watering Trash Pump";
    return title;
  };

  const cleanWhatsAppNumber = (settings.whatsappNumber || "919447123456").replace(/\D/g, "");

  const filteredFleet = useMemo(() => {
    return dynamicCatalogGroups.map(group => {
      const label = getCategoryLabel(group.category);
      if (activeCategory !== "ALL" && group.category !== activeCategory && label !== activeCategory) {
        return null;
      }
      const matchingMachines = group.machines.filter(m => {
        if (!searchQuery.trim()) return true;
        const q = searchQuery.toLowerCase();
        return (
          m.title.toLowerCase().includes(q) ||
          m.power.toLowerCase().includes(q) ||
          m.idealFor.toLowerCase().includes(q) ||
          m.classification.toLowerCase().includes(q) ||
          m.specs.some(s => s.toLowerCase().includes(q))
        );
      });
      if (matchingMachines.length === 0) return null;
      return { ...group, machines: matchingMachines };
    }).filter(Boolean) as typeof dynamicCatalogGroups;
  }, [dynamicCatalogGroups, searchQuery, activeCategory]);

  const totalMatchingMachines = filteredFleet.reduce((acc, g) => acc + g.machines.length, 0);

  const generateWhatsAppUrl = () => {
    const text = `*ZERO GROUP OFFICIAL MACHINERY HIRE INQUIRY*%0A*Company / Contractor:* ${companyName || contractorName || "Prospective Client"}%0A*Contact Person:* ${contractorName || "Site In-Charge"}%0A*Phone:* ${phone || "Not provided"}%0A*Site District:* ${district}, Kerala%0A*Equipment Requested:* ${selectedMachine}%0A*Certified Operator:* ${needOperator ? "YES (Operator Included)" : "NO (Machinery Only)"}%0A*Duration:* ${duration}%0A*Scope Notes:* ${notes || "Standard construction site pour"}%0A%0A_Please confirm machinery availability and commercial rate quotation._`;
    return `https://wa.me/${cleanWhatsAppNumber}?text=${text}`;
  };

  const handleInquirySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    if (typeof window !== "undefined") {
      window.open(generateWhatsAppUrl(), "_blank");
    }
  };

  const scrollToId = (id: string) => {
    if (typeof window === "undefined") return;
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.location.hash = id;
    }
  };

  const handleSelectMachine = (machineTitle: string) => {
    setSelectedMachine(machineTitle);
    scrollToId("inquiry");
    if (typeof window !== "undefined") {
      setTimeout(() => {
        const selectEl = document.getElementById("equipment-dropdown");
        if (selectEl) {
          selectEl.focus();
        }
      }, 400);
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
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-amber-500 selection:text-slate-950">
      
      {/* ── 1. EMERGENCY / NOTICE BANNER ─────────────────────────────────── */}
      {settings.maintenanceMode ? (
        <div className="bg-amber-950/80 border-b border-amber-800/60 text-amber-200 px-4 py-2.5 text-xs font-medium">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" strokeWidth={1.5} />
              <span>{settings.maintenanceNotice || "Scheduled fleet maintenance window. Emergency plant dispatch active via helpline."}</span>
            </div>
            <div className="flex items-center gap-2">
              <span>Emergency Dispatch Hotline:</span>
              <a href={`tel:${settings.emergencyPhone || settings.companyPhone}`} className="font-semibold underline hover:text-amber-100 ml-1">
                {settings.emergencyPhone || settings.companyPhone}
              </a>
            </div>
          </div>
        </div>
      ) : settings.publicNotice ? (
        <div className="bg-slate-900 border-b border-slate-800 text-slate-300 px-4 py-2 text-xs font-medium">
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-center">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <span>{settings.publicNotice}</span>
          </div>
        </div>
      ) : null}

      {/* ── 2. INDUSTRIAL HEADER ────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-slate-900/95 backdrop-blur-md border-b border-slate-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Logo & Heavy Machinery Tag */}
          <Link href="/" className="flex items-center gap-3.5 group">
            <div className="h-11 w-11 rounded-lg bg-amber-500 flex items-center justify-center text-slate-950 shadow-sm border border-amber-400/30 group-hover:bg-amber-400 transition-colors">
              <HardHat className="h-6 w-6 text-slate-950" strokeWidth={1.5} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-white">ZERO GROUP</span>
                <span className="text-[10px] font-semibold uppercase tracking-wider bg-slate-800 text-amber-400 px-2 py-0.5 rounded border border-slate-700">
                  MACHINERY
                </span>
              </div>
              <p className="text-xs font-medium text-slate-400">
                {settings.headerSubtitle || "Commercial Construction Machinery & Lift Rentals"}
              </p>
            </div>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden lg:flex items-center gap-8 text-xs font-semibold text-slate-300">
            <a
              href="#machinery"
              onClick={(e) => {
                e.preventDefault();
                scrollToId("machinery");
              }}
              className="hover:text-amber-400 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Cog className="w-4 h-4 text-slate-400" strokeWidth={1.5} />
              <span>Machinery Fleet</span>
            </a>
            <a
              href="#operations"
              onClick={(e) => {
                e.preventDefault();
                scrollToId("operations");
              }}
              className="hover:text-amber-400 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Truck className="w-4 h-4 text-slate-400" strokeWidth={1.5} />
              <span>Yard Logistics</span>
            </a>
            <a
              href="#inquiry"
              onClick={(e) => {
                e.preventDefault();
                scrollToId("inquiry");
              }}
              className="hover:text-amber-400 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Phone className="w-4 h-4 text-slate-400" strokeWidth={1.5} />
              <span>Hire Quotation</span>
            </a>
          </nav>

          {/* Actions & Portal Access */}
          <div className="flex items-center gap-3">
            <a
              href={`tel:${settings.companyPhone}`}
              className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-300 bg-slate-800 hover:bg-slate-700 border border-slate-700 px-3.5 py-2 rounded-lg transition-colors"
            >
              <Phone className="h-3.5 w-3.5 text-amber-400" strokeWidth={1.5} />
              <span>{settings.companyPhone}</span>
            </a>

            {sessionUser ? (
              <Link
                href={getDashboardLink()}
                className="flex items-center gap-2 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 px-3.5 py-2 rounded-lg shadow-sm transition-colors"
              >
                <UserCheck className="h-4 w-4 text-slate-950" strokeWidth={1.5} />
                <span>{sessionUser.role} Portal</span>
                <ArrowRight className="h-4 w-4 text-slate-950" strokeWidth={1.5} />
              </Link>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-2 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 px-3.5 py-2 rounded-lg shadow-sm transition-colors"
              >
                <ShieldCheck className="h-4 w-4 text-slate-950" strokeWidth={1.5} />
                <span>Crew Login</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ── 3. HERO SECTION (INDUSTRIAL DARK BRANDING) ──────────────────── */}
      <section className="relative bg-slate-950 pt-14 pb-16 md:pt-20 md:pb-24 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          
          {/* Eyebrow Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-medium text-amber-400 mb-6 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
            <span className="font-semibold">{settings.heroBadge || "KERALA COMMERCIAL INFRASTRUCTURE & CONSTRUCTION LOGISTICS"}</span>
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-5xl font-bold tracking-tight text-white max-w-4xl mx-auto leading-tight">
            {settings.heroHeadline || "Heavy Construction Equipment & Precision Plant Logistics"}
          </h1>

          <p className="mt-4 text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
            {settings.heroSubheadline || "Commercial concrete mixers, vertical material hoists, and heavy de-watering plant supplied across Kerala with certified operators."}
          </p>

          {/* Action CTAs */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3.5">
            <a
              href="#inquiry"
              onClick={(e) => {
                e.preventDefault();
                scrollToId("inquiry");
              }}
              className="inline-flex items-center gap-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm px-6 py-3 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <span>{settings.heroPrimaryCta || "Request Hire Quotation"}</span>
              <ArrowRight className="h-4 w-4" strokeWidth={1.5} />
            </a>

            <a
              href="#machinery"
              onClick={(e) => {
                e.preventDefault();
                scrollToId("machinery");
              }}
              className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-medium text-sm px-6 py-3 rounded-lg shadow-sm transition-colors cursor-pointer"
            >
              <Search className="h-4 w-4 text-slate-400" strokeWidth={1.5} />
              <span>{settings.heroSecondaryCta || "Search Plant Inventory"}</span>
            </a>
          </div>

          {/* Dynamic Value Proposition Highlights */}
          <div id="operations" className="scroll-mt-24 mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto text-left">
            {activeValueProps.map((vp, idx) => {
              const VpIcon = ICON_MAP[vp.iconName] || Truck;
              return (
                <div key={vp.id || idx} className="p-5 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 transition-all">
                  <div className="flex items-center gap-2 text-amber-400 font-semibold text-xs mb-2">
                    <VpIcon className="h-4 w-4 text-amber-400" strokeWidth={1.5} />
                    <span>{vp.badge}</span>
                  </div>
                  <h2 className="text-sm font-semibold text-white">{vp.title}</h2>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {vp.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 4. MACHINERY INVENTORY & SPECIFICATIONS WITH LIVE SEARCH ─────── */}
      <section id="machinery" className="scroll-mt-24 py-16 md:py-20 bg-slate-950 border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-10">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
              Fleet Inventory (<span>{activeItems.length}</span> available units)
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mt-1.5 tracking-tight">
              {settings.catalogHeading || "Certified Construction Machinery Catalog"}
            </h2>
            <p className="mt-2 text-slate-400 text-sm max-w-xl mx-auto">
              {settings.catalogSubheading || "All machinery is serviced, pressure-tested, and certified prior to site mobilization."}
            </p>
          </div>

          {/* 🔍 LIVE SEARCH & FILTER BAR */}
          <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl mb-10 shadow-sm max-w-4xl mx-auto">
            <div className="flex flex-col sm:flex-row items-stretch gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" strokeWidth={1.5} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search machinery (e.g. 10/7, Reversible, 1 Ton Hoist, Vibrator, Diesel Pump)..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-12 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-amber-400 hover:text-amber-300 px-1 py-0.5 rounded cursor-pointer transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Category Quick Filter */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                <button
                  type="button"
                  onClick={() => setActiveCategory("ALL")}
                  className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                    activeCategory === "ALL"
                      ? "bg-amber-500 text-slate-950 font-bold shadow-sm"
                      : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
                  }`}
                >
                  All Fleet
                </button>
                {dynamicCatalogGroups.map(group => {
                  const label = getCategoryLabel(group.category);
                  const isSelected = activeCategory === group.category || activeCategory === label;
                  return (
                    <button
                      key={group.category}
                      type="button"
                      onClick={() => setActiveCategory(prev => (prev === label || prev === group.category) ? "ALL" : label)}
                      className={`px-3 py-2 text-xs font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                        isSelected
                          ? "bg-amber-500 text-slate-950 font-bold shadow-sm"
                          : "bg-slate-950 text-slate-400 hover:text-white border border-slate-800"
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>

            {searchQuery && (
              <div className="mt-3 pt-3 border-t border-slate-800 text-xs text-slate-400 flex items-center justify-between">
                <span>Found <strong className="text-white">{totalMatchingMachines}</strong> matching machines for &ldquo;{searchQuery}&rdquo;</span>
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="text-amber-400 hover:underline cursor-pointer font-semibold"
                >
                  Reset search
                </button>
              </div>
            )}
          </div>

          {/* Machine Category Sections */}
          <div className="space-y-16">
            {filteredFleet.length === 0 ? (
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-12 text-center max-w-xl mx-auto">
                <Search className="h-8 w-8 text-slate-600 mx-auto mb-3" strokeWidth={1.5} />
                <h3 className="text-base font-semibold text-white">No equipment matches your search query</h3>
                <p className="text-xs text-slate-400 mt-1">Try adjusting keywords or clearing category filters to view all equipment.</p>
                <button
                  type="button"
                  onClick={() => { setSearchQuery(""); setActiveCategory("ALL"); }}
                  className="mt-4 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Reset Search Filter
                </button>
              </div>
            ) : (
              filteredFleet.map((group, gIdx) => {
                const IconComponent = group.icon;
                return (
                  <div key={gIdx} className="space-y-6">
                    <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
                      <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
                        <IconComponent className="w-5 h-5 text-amber-400" strokeWidth={1.5} />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white tracking-tight">
                          {group.category}
                        </h3>
                        {group.subtext && (
                          <p className="text-xs text-slate-400">
                            {group.subtext}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {group.machines.map((m, mIdx) => (
                        <div
                          key={mIdx}
                          className="rounded-xl border border-slate-800 bg-slate-900 p-6 flex flex-col justify-between hover:border-slate-700 transition-colors shadow-sm"
                        >
                          <div>
                            <div className="flex items-start justify-between gap-3 mb-2">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded">
                                {m.classification}
                              </span>
                              <span className="text-[10px] font-medium text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                                {m.tag}
                              </span>
                            </div>

                            <h4 className="text-base font-bold text-white tracking-tight">
                              {m.title}
                            </h4>

                            <div className="mt-3 py-1.5 px-2.5 rounded bg-slate-950 border border-slate-800 text-xs font-medium text-slate-300 flex items-center gap-2">
                              <span className="text-slate-400 font-normal">Drive:</span>
                              <span className="font-semibold text-white">{m.power}</span>
                            </div>

                            <div className="mt-4 space-y-1.5">
                              <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                                Technical Specifications:
                              </p>
                              <ul className="space-y-1">
                                {m.specs.map((spec, sIdx) => (
                                  <li key={sIdx} className="text-xs text-slate-300 flex items-start gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                                    <span>{spec}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            <div className="mt-4 pt-3 border-t border-slate-800">
                              <p className="text-[11px] text-slate-400">
                                <span className="font-semibold text-slate-300">Ideal For:</span> {m.idealFor}
                              </p>
                            </div>
                          </div>

                          <div className="mt-6 pt-4 border-t border-slate-800">
                            <a
                              href="#inquiry"
                              onClick={(e) => {
                                e.preventDefault();
                                handleSelectMachine(m.title);
                              }}
                              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-amber-500 text-slate-200 hover:text-slate-950 border border-slate-700 hover:border-amber-500 font-bold text-xs transition-colors cursor-pointer group/btn"
                            >
                              <span>Select for Quotation</span>
                              <ArrowRight className="h-3.5 w-3.5 group-hover/btn:translate-x-0.5 transition-transform" strokeWidth={1.5} />
                            </a>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </section>

      {/* ── 5. COMMERCIAL HIRE INQUIRY FORM ────────────────────────────── */}
      <section id="inquiry" className="scroll-mt-24 py-16 md:py-20 bg-slate-950 border-t border-slate-800">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center mb-10">
            <span className="text-xs font-semibold uppercase tracking-wider text-amber-400">
              Commercial Operations Desk
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-white mt-1.5 tracking-tight">
              {settings.inquiryHeading || "Request Machinery Hire Quotation"}
            </h2>
            <p className="mt-2 text-slate-400 text-sm max-w-lg mx-auto">
              {settings.inquirySubheading || "Submit your project schedule below. Central Yard dispatch will confirm machine availability and issue formal hire rates."}
            </p>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 sm:p-8 shadow-sm">
            <form onSubmit={handleInquirySubmit} className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Contracting Firm / Company Name
                  </label>
                  <input
                    type="text"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Kerala Builders & Infra Ltd"
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Site Engineer / Contact Person *
                  </label>
                  <input
                    type="text"
                    required
                    value={contractorName}
                    onChange={(e) => setContractorName(e.target.value)}
                    placeholder="e.g. Thomas Mathew (Site In-Charge)"
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Contact Phone / WhatsApp *
                  </label>
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="10-digit mobile number"
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Job Site District (Kerala) *
                  </label>
                  <select
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-colors"
                  >
                    {activeDistricts.map((dist) => (
                      <option key={dist} value={dist}>
                        {dist}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="equipment-dropdown" className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Required Equipment *
                  </label>
                  <select
                    id="equipment-dropdown"
                    value={selectedMachine}
                    onChange={(e) => setSelectedMachine(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-colors"
                  >
                    {activeItems.map((m) => (
                      <option key={m.id || m.title} value={m.title}>
                        {getMachineDropdownLabel(m.title)}
                      </option>
                    ))}
                    <option value="Multiple Machinery Combination Package">
                      Multiple Machinery Combination Package
                    </option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Estimated Hire Duration *
                  </label>
                  <select
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-colors"
                  >
                    <option value="1 to 3 Days">1 to 3 Days (Pour Basis)</option>
                    <option value="1 Week">1 Week</option>
                    <option value="2 to 3 Weeks">2 to 3 Weeks</option>
                    <option value="1 Month or Long Term">1 Month or Long Term Contract</option>
                  </select>
                </div>
              </div>

              {/* Operator Requirement Toggle */}
              <div className="flex items-center justify-between p-3.5 rounded-lg bg-slate-950 border border-slate-800">
                <div>
                  <p className="text-xs font-semibold text-white">Include Certified Machine Operator</p>
                  <p className="text-[11px] text-slate-400">
                    Experienced equipment operator supplied with machine for hydraulic safety and batch consistency.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={needOperator}
                  onChange={(e) => setNeedOperator(e.target.checked)}
                  className="w-4 h-4 rounded text-amber-500 focus:ring-amber-500 border-slate-700 bg-slate-900 accent-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Site Scope & Special Requirements
                </label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. 4th floor roof slab pour next Monday; 3-phase power available at site."
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 resize-none transition-colors"
                />
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 py-3 px-6 text-slate-950 font-bold text-sm shadow-sm transition-colors cursor-pointer"
              >
                <MessageSquare className="h-4 w-4 text-slate-950" strokeWidth={1.5} />
                <span>Submit Quotation Request via WhatsApp Desk</span>
                <ArrowRight className="h-4 w-4 text-slate-950" strokeWidth={1.5} />
              </button>

              {submitted && (
                <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs text-center font-medium flex items-center justify-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" strokeWidth={1.5} />
                  <span>
                    Inquiry prepared. If WhatsApp did not launch automatically,{" "}
                    <a
                      href={generateWhatsAppUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold underline text-emerald-200 hover:text-emerald-100"
                    >
                      click here to open WhatsApp directly
                    </a>
                    .
                  </span>
                </div>
              )}
            </form>
          </div>
        </div>
      </section>

      {/* ── 6. INDUSTRIAL FOOTER ────────────────────────────────────────── */}
      <footer className="border-t border-slate-800 bg-slate-900 py-12 text-slate-400 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-white">
              <div className="h-8 w-8 rounded-lg bg-amber-500 flex items-center justify-center text-slate-950 font-bold text-xs shadow-sm">
                ZG
              </div>
              <span className="text-base font-bold text-white">ZERO GROUP</span>
            </div>
            <p className="text-slate-400 leading-relaxed text-[11px]">
              {settings.footerCopy || "Heavy construction machinery hire, hydraulic batching mixers, high-rise material hoists, and site engineering logistics across Kerala."}
            </p>
            <p className="font-mono text-[11px] text-slate-400">
              GSTIN: {settings.gstinNumber}
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-2.5 text-xs">Central Base Yard</h4>
            <p className="leading-relaxed text-[11px] text-slate-400">
              {settings.storeAddress}<br />
              Coordinates: {settings.storeLatitude.toFixed(4)}, {settings.storeLongitude.toFixed(4)}<br />
              Hours: {settings.operatingHours || "Mon – Sun: 6:00 AM – 9:00 PM"}
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-2.5 text-xs">Yard Operations Desk</h4>
            <ul className="space-y-1.5 text-[11px]">
              <li className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-amber-400" strokeWidth={1.5} />
                <a href={`tel:${settings.companyPhone}`} className="hover:text-amber-400 font-medium">
                  {settings.companyPhone}
                </a>
              </li>
              <li className="flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-400" strokeWidth={1.5} />
                <a
                  href={`https://wa.me/${cleanWhatsAppNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-amber-400 font-medium"
                >
                  WhatsApp: +{cleanWhatsAppNumber}
                </a>
              </li>
              <li className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-amber-400" strokeWidth={1.5} />
                <a href={`mailto:${settings.companyEmail}`} className="hover:text-amber-400 font-medium">
                  {settings.companyEmail}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-2.5 text-xs">Field Logins & Portal</h4>
            <ul className="space-y-1.5 text-[11px]">
              <li>
                <Link href="/login" className="hover:text-amber-400 transition-colors">
                  Operator & Driver Sign In
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-amber-400 transition-colors">
                  Yard Admin & Staff Console
                </Link>
              </li>
              <li>
                <a href="#inquiry" className="hover:text-amber-400 transition-colors">
                  Commercial Plant Hire Rate Inquiry
                </a>
              </li>
              <li className="pt-2 text-[10px] text-slate-400">
                Operating across 14 Kerala districts
              </li>
            </ul>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-10 pt-6 border-t border-slate-800/60 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-4">
          <p>© {new Date().getFullYear()} ZERO GROUP Machinery Rentals. All rights reserved.</p>
          <p className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Industrial Equipment Safety Compliance Verified</span>
          </p>
        </div>
      </footer>
    </div>
  );
}
