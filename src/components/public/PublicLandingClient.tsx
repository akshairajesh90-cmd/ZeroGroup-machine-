"use client";

import React, { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { 
  Building2, Truck, Wrench, CheckCircle2, Phone, MessageSquare, 
  MapPin, ChevronRight, ArrowRight, HardHat, ExternalLink, 
  Layers, Navigation, UserCheck, AlertTriangle, ShieldCheck, Mail, Clock,
  Search, SlidersHorizontal, Gauge, Cog, Fuel, Check, LucideIcon,
  Eye, X, Zap, Calendar, Award, Sparkles
} from "lucide-react";
import { 
  CorporateWebsiteSettingsData,
  DEFAULT_CATALOG_ITEMS,
  DEFAULT_VALUE_PROPS,
  DEFAULT_KERALA_DISTRICTS,
  WebsiteCatalogItemData
} from "@/types/websiteSettings";
import { useInView } from "@/hooks/useInView";

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
  Zap,
};

// Central Kerala Hub districts for rapid < 2 hr mobilization calculations
const CENTRAL_KERALA_DISTRICTS = new Set([
  "Kottayam",
  "Ernakulam",
  "Idukki",
  "Alappuzha",
  "Pathanamthitta",
]);

// Helper for count-up animations with cubic ease-out and zero hydration mismatch
function useAnimatedCounter(target: number, isInView: boolean, durationMs = 1200) {
  const [count, setCount] = useState<number>(target);

  useEffect(() => {
    if (typeof window === "undefined" || typeof requestAnimationFrame === "undefined") {
      setCount(target);
      return;
    }
    if (!isInView) return;

    let startTime: number | null = null;
    let frameId: number;

    const animate = (now: number) => {
      if (!startTime) startTime = now;
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCount(Math.round(eased * target));

      if (progress < 1) {
        frameId = requestAnimationFrame(animate);
      } else {
        setCount(target);
      }
    };

    setCount(0);
    frameId = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frameId);
  }, [target, isInView, durationMs]);

  return count;
}

// Map machinery to equipment photography
const getMachineImage = (title: string, category: string): string => {
  const lower = (title + " " + category).toLowerCase();
  if (lower.includes("hoist") || lower.includes("winch") || lower.includes("crane")) {
    return "/images/machinery/material-hoist.jpg";
  }
  if (lower.includes("vibrator") || lower.includes("compactor") || lower.includes("compaction")) {
    return "/images/machinery/needle-vibrator.jpg";
  }
  if (lower.includes("pump") || lower.includes("drainage") || lower.includes("trash")) {
    return "/images/machinery/trash-pump.jpg";
  }
  return "/images/machinery/concrete-mixer.jpg";
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
      machines: WebsiteCatalogItemData[];
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
      groups[groupIdx].machines.push(item);
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

  // Quick-Spec Inspection Modal State
  const [inspectingMachine, setInspectingMachine] = useState<WebsiteCatalogItemData | null>(null);

  // Estimator Slider Days state (3 to 90 days)
  const [estimatorDays, setEstimatorDays] = useState<number>(7);

  // Scroll InView hooks for staggered and scroll-driven reveals
  const [tickerRef, isTickerInView] = useInView<HTMLDivElement>({ threshold: 0.1, once: true });
  const [valPropsRef, isValPropsInView] = useInView<HTMLDivElement>({ threshold: 0.1, once: true });
  const [catalogRef, isCatalogInView] = useInView<HTMLDivElement>({ threshold: 0.05, once: true });
  const [coverageRef, isCoverageInView] = useInView<HTMLDivElement>({ threshold: 0.1, once: true });
  const [inquiryRef, isInquiryInView] = useInView<HTMLDivElement>({ threshold: 0.05, once: true });

  // Animated counters for ticker bar
  const animatedDistricts = useAnimatedCounter(activeDistricts.length || 14, isTickerInView);
  const animatedFleetUnits = useAnimatedCounter(50, isTickerInView);
  const animatedMobilization = useAnimatedCounter(2, isTickerInView);
  const animatedOperatorRating = useAnimatedCounter(100, isTickerInView);

  // Handle ESC key to close Quick-Spec modal
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && inspectingMachine) {
        setInspectingMachine(null);
      }
    };
    if (typeof window !== "undefined") {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("keydown", handleKeyDown);
      }
    };
  }, [inspectingMachine]);

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

  // Dynamic calculated mobilization timeline based on district
  const calculatedTimeline = useMemo(() => {
    if (CENTRAL_KERALA_DISTRICTS.has(district)) {
      return "Within 2 Hours (Central Depot Priority Dispatch)";
    }
    return "Same-Day Direct Flatbed Mobilization (3-5 Hours)";
  }, [district]);

  const generateWhatsAppUrl = () => {
    const text = `*ZERO GROUP OFFICIAL MACHINERY HIRE INQUIRY*%0A*Company / Contractor:* ${companyName || contractorName || "Prospective Client"}%0A*Contact Person:* ${contractorName || "Site In-Charge"}%0A*Phone:* ${phone || "Not provided"}%0A*Site District:* ${district}, Kerala%0A*Equipment Requested:* ${selectedMachine}%0A*Certified Operator:* ${needOperator ? "YES (Operator Included)" : "NO (Machinery Only)"}%0A*Duration:* ${duration}%0A*Estimated Mobilization Timeline:* ${calculatedTimeline}%0A*Scope Notes:* ${notes || "Standard construction site pour"}%0A%0A_Please confirm machinery availability and commercial rate quotation._`;
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

  // Sync duration when estimator duration preset or slider changes
  const applyEstimatorDays = (days: number) => {
    setEstimatorDays(days);
    if (days <= 3) {
      setDuration("1 to 3 Days");
    } else if (days <= 7) {
      setDuration("1 Week");
    } else if (days <= 21) {
      setDuration("2 to 3 Weeks");
    } else {
      setDuration("1 Month or Long Term");
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
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-[#fa5402] selection:text-white relative overflow-x-hidden">
      
      {/* ── 1. EMERGENCY / NOTICE BANNER ─────────────────────────────────── */}
      {settings.maintenanceMode ? (
        <div className="bg-orange-950/80 border-b border-orange-800/60 text-orange-200 px-4 py-2.5 text-xs font-medium relative z-50">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-[#fa5402] shrink-0" strokeWidth={1.5} />
              <span>{settings.maintenanceNotice || "Scheduled fleet maintenance window. Emergency plant dispatch active via helpline."}</span>
            </div>
            <div className="flex items-center gap-2">
              <span>Emergency Dispatch Hotline:</span>
              <a href={`tel:${settings.emergencyPhone || settings.companyPhone}`} className="font-semibold underline hover:text-orange-100 ml-1">
                {settings.emergencyPhone || settings.companyPhone}
              </a>
            </div>
          </div>
        </div>
      ) : settings.publicNotice ? (
        <div className="bg-slate-900 border-b border-slate-800 text-slate-300 px-4 py-2 text-xs font-medium relative z-50">
          <div className="max-w-7xl mx-auto flex items-center justify-center gap-2 text-center">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
            <span>{settings.publicNotice}</span>
          </div>
        </div>
      ) : null}

      {/* ── 2. INDUSTRIAL HEADER ────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          
          {/* Logo & Heavy Machinery Tag */}
          <Link href="/" className="flex items-center gap-3.5 group min-w-0">
            <div className="relative h-11 w-11 shrink-0 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Image
                src="/logo.png"
                alt="ZERO GROUP Logo"
                width={44}
                height={44}
                className="h-full w-full object-contain drop-shadow-[0_2px_8px_rgba(250,84,2,0.25)]"
                priority
              />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold tracking-tight text-white group-hover:text-[#fa5402] transition-colors truncate">
                  ZERO GROUP
                </span>
                <span className="hidden sm:inline-block text-[10px] font-bold uppercase tracking-wider bg-[#fa5402]/10 text-[#fa5402] px-2 py-0.5 rounded border border-[#fa5402]/25">
                  MACHINERY
                </span>
              </div>
              <p className="text-xs font-medium text-slate-400 truncate">
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
              className="hover:text-[#fa5402] transition-colors flex items-center gap-1.5 cursor-pointer py-1"
            >
              <Cog className="w-4 h-4 text-slate-400" strokeWidth={1.5} />
              <span>Machinery Fleet</span>
            </a>
            <a
              href="#estimator"
              onClick={(e) => {
                e.preventDefault();
                scrollToId("estimator");
              }}
              className="hover:text-[#fa5402] transition-colors flex items-center gap-1.5 cursor-pointer py-1"
            >
              <SlidersHorizontal className="w-4 h-4 text-slate-400" strokeWidth={1.5} />
              <span>Rental Estimator</span>
            </a>
            <a
              href="#operations"
              onClick={(e) => {
                e.preventDefault();
                scrollToId("operations");
              }}
              className="hover:text-[#fa5402] transition-colors flex items-center gap-1.5 cursor-pointer py-1"
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
              className="hover:text-[#fa5402] transition-colors flex items-center gap-1.5 cursor-pointer py-1"
            >
              <Phone className="w-4 h-4 text-slate-400" strokeWidth={1.5} />
              <span>Hire Quotation</span>
            </a>
          </nav>

          {/* Actions & Portal Access */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            <a
              href={`tel:${settings.companyPhone}`}
              className="hidden sm:flex items-center gap-2 text-xs font-semibold text-slate-300 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 px-3 py-2 rounded-lg transition-colors"
            >
              <Phone className="h-3.5 w-3.5 text-[#fa5402]" strokeWidth={1.5} />
              <span>{settings.companyPhone}</span>
            </a>

            {sessionUser ? (
              <Link
                href={getDashboardLink()}
                className="flex items-center gap-2 text-xs font-bold bg-[#fa5402] hover:bg-[#e04b01] text-white px-3.5 py-2 rounded-lg shadow-sm transition-all hover:shadow-[0_0_15px_rgba(250,84,2,0.4)]"
              >
                <UserCheck className="h-4 w-4 text-white" strokeWidth={1.5} />
                <span>{sessionUser.role} Portal</span>
                <ArrowRight className="h-4 w-4 text-white" strokeWidth={1.5} />
              </Link>
            ) : (
              <Link
                href="/login"
                className="flex items-center gap-2 text-xs font-bold bg-[#fa5402] hover:bg-[#e04b01] text-white px-3.5 py-2 rounded-lg shadow-sm transition-all hover:shadow-[0_0_15px_rgba(250,84,2,0.4)]"
              >
                <ShieldCheck className="h-4 w-4 text-white" strokeWidth={1.5} />
                <span>Crew Login</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* ── 3. HERO SECTION (CINEMATIC INDUSTRIAL ATMOSPHERE & MOTION) ───── */}
      <section className="relative bg-slate-950 pt-14 pb-16 sm:pt-20 sm:pb-24 border-b border-slate-800/80 overflow-hidden">
        
        {/* Layer 1: Dark Industrial Spotlight Mesh with Logo Brand Orange */}
        <div className="absolute inset-0 hero-spotlight-mesh pointer-events-none" />

        {/* Layer 2: Architectural Grid Pattern with Radial Falloff */}
        <div className="absolute inset-0 industrial-grid-pattern pointer-events-none" />

        {/* Layer 3: Fine Industrial Grain / Noise */}
        <div className="absolute inset-0 industrial-noise pointer-events-none opacity-40" />

        {/* Top & Bottom Precision Accent Lines */}
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-[#fa5402]/25 to-transparent" />
        <div className="absolute bottom-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-slate-700/40 to-transparent" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10 text-center">
          
          {/* Eyebrow Badge (Hero Choreography Step 1: 0.1s delay) */}
          <div className="hero-stagger-1 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-[#fa5402]/30 text-xs font-medium text-[#fa5402] mb-6 shadow-[0_0_20px_rgba(250,84,2,0.15)] max-w-full">
            <span className="w-2 h-2 rounded-full bg-[#fa5402] shrink-0 animate-ping" />
            <span className="font-semibold tracking-wide uppercase truncate">
              {settings.heroBadge || "KERALA COMMERCIAL INFRASTRUCTURE & CONSTRUCTION LOGISTICS"}
            </span>
          </div>

          {/* Main Headline (Hero Choreography Step 2: 0.25s delay) */}
          <h1 className="hero-stagger-2 text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white max-w-4xl mx-auto leading-[1.15]">
            {settings.heroHeadline || "Heavy Construction Equipment & Precision Plant Logistics"}
          </h1>

          {/* Subheadline (Hero Choreography Step 3: 0.4s delay) */}
          <p className="hero-stagger-3 mt-5 text-sm sm:text-base md:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed font-normal">
            {settings.heroSubheadline || "Commercial concrete mixers, vertical material hoists, and heavy de-watering plant supplied across Kerala with certified operators."}
          </p>

          {/* Action CTAs (Hero Choreography Step 4: 0.55s delay) */}
          <div className="hero-stagger-4 mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <a
              href="#inquiry"
              onClick={(e) => {
                e.preventDefault();
                scrollToId("inquiry");
              }}
              className="inline-flex items-center gap-2 bg-[#fa5402] hover:bg-[#e04b01] text-white font-bold text-xs sm:text-sm px-5 sm:px-6 py-3 sm:py-3.5 rounded-lg shadow-lg hover:shadow-[0_0_20px_rgba(250,84,2,0.45)] transition-all cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
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
              className="inline-flex items-center gap-2 bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white font-semibold text-xs sm:text-sm px-5 sm:px-6 py-3 sm:py-3.5 rounded-lg shadow-sm hover:border-slate-600 transition-all cursor-pointer transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <Search className="h-4 w-4 text-[#fa5402]" strokeWidth={1.5} />
              <span>{settings.heroSecondaryCta || "Search Plant Inventory"}</span>
            </a>
          </div>

          {/* Dynamic Value Proposition Highlights with Scroll Reveal */}
          <div 
            id="operations" 
            ref={valPropsRef}
            className={`scroll-mt-24 mt-14 sm:mt-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto text-left transition-all duration-700 ${
              isValPropsInView ? "opacity-100 translate-y-0" : "opacity-0 translate-y-8"
            }`}
          >
            {activeValueProps.map((vp, idx) => {
              const VpIcon = ICON_MAP[vp.iconName] || Truck;
              return (
                <div 
                  key={vp.id || idx} 
                  style={{ transitionDelay: `${idx * 80}ms` }}
                  className="p-5 rounded-xl bg-slate-900/80 backdrop-blur-sm border border-slate-800 hover:border-[#fa5402]/40 hover:bg-slate-900 transition-all duration-300 group equipment-card-lift min-w-0"
                >
                  <div className="flex items-center gap-2 text-[#fa5402] font-semibold text-xs mb-2">
                    <div className="p-1.5 rounded-md bg-[#fa5402]/10 border border-[#fa5402]/20 text-[#fa5402] group-hover:scale-110 transition-transform">
                      <VpIcon className="h-3.5 w-3.5" strokeWidth={1.5} />
                    </div>
                    <span className="truncate">{vp.badge}</span>
                  </div>
                  <h2 className="text-sm font-semibold text-white tracking-tight">{vp.title}</h2>
                  <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                    {vp.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 4. ANIMATED METRICS TICKER BAR (RESPONSIVE GRID) ─────────────── */}
      <section 
        ref={tickerRef}
        aria-label="Operational Metrics Ticker"
        className="relative bg-slate-900 border-y border-slate-800 py-6 overflow-hidden"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6 items-stretch">
            
            {/* Metric 1: Kerala Districts Covered */}
            <div className="p-3.5 sm:p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center gap-3 min-w-0">
              <div className="p-2 sm:p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[#fa5402] shrink-0 shadow-inner">
                <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-[#fa5402]" strokeWidth={1.5} />
              </div>
              <div className="min-w-0">
                <div className="flex items-baseline gap-1">
                  <span className="text-xl sm:text-2xl md:text-3xl font-extrabold font-mono text-white tracking-tight tabular-nums">
                    {animatedDistricts}
                  </span>
                  <span className="text-[#fa5402] font-bold text-[10px] sm:text-xs uppercase">Districts</span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-400 font-medium truncate">Kerala Districts Covered</p>
              </div>
            </div>

            {/* Metric 2: Certified Fleet Units */}
            <div className="p-3.5 sm:p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center gap-3 min-w-0">
              <div className="p-2 sm:p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[#fa5402] shrink-0 shadow-inner">
                <Gauge className="w-4 h-4 sm:w-5 sm:h-5 text-[#fa5402]" strokeWidth={1.5} />
              </div>
              <div className="min-w-0">
                <div className="flex items-baseline gap-1">
                  <span className="text-xl sm:text-2xl md:text-3xl font-extrabold font-mono text-white tracking-tight tabular-nums">
                    {animatedFleetUnits}+
                  </span>
                  <span className="text-[#fa5402] font-bold text-[10px] sm:text-xs uppercase">Machinery</span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-400 font-medium truncate">Certified Fleet Units</p>
              </div>
            </div>

            {/* Metric 3: Rapid Mobilization */}
            <div className="p-3.5 sm:p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center gap-3 min-w-0">
              <div className="p-2 sm:p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[#fa5402] shrink-0 shadow-inner">
                <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-[#fa5402]" strokeWidth={1.5} />
              </div>
              <div className="min-w-0">
                <div className="flex items-baseline gap-1">
                  <span className="text-xl sm:text-2xl md:text-3xl font-extrabold font-mono text-white tracking-tight tabular-nums">
                    &lt; {animatedMobilization} Hr
                  </span>
                  <span className="text-[#fa5402] font-bold text-[10px] sm:text-xs uppercase">Rapid</span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-400 font-medium truncate">Rapid Mobilization Speed</p>
              </div>
            </div>

            {/* Metric 4: Operator Certified */}
            <div className="p-3.5 sm:p-4 rounded-xl bg-slate-950/80 border border-slate-800/80 flex items-center gap-3 min-w-0">
              <div className="p-2 sm:p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[#fa5402] shrink-0 shadow-inner">
                <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400" strokeWidth={1.5} />
              </div>
              <div className="min-w-0">
                <div className="flex items-baseline gap-1">
                  <span className="text-xl sm:text-2xl md:text-3xl font-extrabold font-mono text-emerald-400 tracking-tight tabular-nums">
                    {animatedOperatorRating}%
                  </span>
                  <span className="text-emerald-400/80 font-bold text-[10px] sm:text-xs uppercase">Tested</span>
                </div>
                <p className="text-[11px] sm:text-xs text-slate-400 font-medium truncate">Operator Certified & Safe</p>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── 5. MACHINERY INVENTORY WITH VISUAL SHOWCASE & LIVE SEARCH ────── */}
      <section 
        id="machinery" 
        ref={catalogRef}
        className="scroll-mt-24 py-16 md:py-24 bg-slate-950 border-b border-slate-800 relative"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center max-w-3xl mx-auto mb-10">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#fa5402]">
              Fleet Inventory (<span>{activeItems.length}</span> available units)
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white mt-1.5 tracking-tight">
              {settings.catalogHeading || "Certified Construction Machinery Catalog"}
            </h2>
            <p className="mt-2 text-slate-400 text-sm max-w-xl mx-auto">
              {settings.catalogSubheading || "All machinery is serviced, pressure-tested, and certified prior to site mobilization."}
            </p>
          </div>

          {/* 🔍 LIVE SEARCH & FILTER BAR */}
          <div className="bg-slate-900/90 backdrop-blur-md border border-slate-800 p-4 rounded-xl mb-12 shadow-md max-w-4xl mx-auto">
            <div className="flex flex-col sm:flex-row items-stretch gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" strokeWidth={1.5} />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search machinery (e.g. 10/7, Reversible, 1 Ton Hoist, Vibrator, Diesel Pump)..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-10 pr-12 py-2.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-[#fa5402]/20 focus:border-[#fa5402] transition-colors"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-[#fa5402] hover:text-orange-400 px-1 py-0.5 rounded cursor-pointer transition-colors"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Category Quick Filter */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
                <button
                  type="button"
                  onClick={() => setActiveCategory("ALL")}
                  className={`px-3 py-2 text-xs font-medium rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                    activeCategory === "ALL"
                      ? "bg-[#fa5402] text-white font-bold shadow-sm"
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
                      className={`px-3 py-2 text-xs font-medium rounded-lg transition-all whitespace-nowrap cursor-pointer ${
                        isSelected
                          ? "bg-[#fa5402] text-white font-bold shadow-sm"
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
                  className="text-[#fa5402] hover:underline cursor-pointer font-semibold"
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
                  className="mt-4 px-4 py-2 bg-[#fa5402] hover:bg-[#e04b01] text-white text-xs font-bold rounded-lg transition-colors cursor-pointer shadow-sm"
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
                      <div className="p-2 rounded-lg bg-[#fa5402]/10 text-[#fa5402] border border-[#fa5402]/20">
                        <IconComponent className="w-5 h-5 text-[#fa5402]" strokeWidth={1.5} />
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
                          key={m.id || mIdx}
                          className="rounded-xl border border-slate-800 bg-slate-900/90 overflow-hidden flex flex-col justify-between equipment-card-lift metallic-edge shadow-sm relative group hover:border-[#fa5402]/50 min-w-0"
                        >
                          <div>
                            {/* Equipment Photo Banner with Smooth Scale Transition on Hover */}
                            <div className="relative h-48 sm:h-52 w-full overflow-hidden bg-slate-950 border-b border-slate-800">
                              <Image
                                src={m.imageUrl || getMachineImage(m.title, group.category)}
                                alt={m.title}
                                fill
                                sizes="(max-width: 768px) 100vw, 50vw"
                                className="object-cover object-center group-hover:scale-105 transition-transform duration-500 ease-out"
                                priority={mIdx < 2}
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/30 to-transparent" />
                              
                              {/* Floating classification and demand tags */}
                              <div className="absolute top-3 inset-x-3 flex items-center justify-between gap-2">
                                <span className="text-[10px] font-bold uppercase tracking-wider text-[#fa5402] bg-slate-950/85 backdrop-blur-md border border-[#fa5402]/30 px-2.5 py-1 rounded shadow-sm">
                                  {m.classification}
                                </span>
                                <span className="text-[10px] font-semibold text-slate-200 bg-slate-950/85 backdrop-blur-md border border-slate-700/80 px-2.5 py-1 rounded flex items-center gap-1.5 shadow-sm">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                  {m.demandTag}
                                </span>
                              </div>
                            </div>

                            <div className="p-6">
                              <h4 className="text-lg font-bold text-white tracking-tight group-hover:text-[#fa5402] transition-colors break-words">
                                {m.title}
                              </h4>

                              {/* Power specification badge */}
                              <div className="mt-3 py-1.5 px-3 rounded bg-slate-950 border border-slate-800/80 text-xs font-medium text-slate-300 flex items-center gap-2">
                                <Cog className="w-3.5 h-3.5 text-[#fa5402] shrink-0" strokeWidth={1.5} />
                                <span className="text-slate-400 font-normal">Drive:</span>
                                <span className="font-semibold text-white truncate">{m.power}</span>
                              </div>

                              {/* Specs bullets */}
                              <div className="mt-4 space-y-1.5">
                                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                                  Technical Specifications:
                                </p>
                                <ul className="space-y-1">
                                  {m.specs.map((spec, sIdx) => (
                                    <li key={sIdx} className="text-xs text-slate-300 flex items-start gap-2">
                                      <span className="w-1.5 h-1.5 rounded-full bg-[#fa5402] shrink-0 mt-1.5" />
                                      <span>{spec}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>

                              {/* Ideal For */}
                              <div className="mt-4 pt-3 border-t border-slate-800">
                                <p className="text-[11px] text-slate-400 leading-relaxed">
                                  <span className="font-semibold text-slate-300">Ideal For:</span> {m.idealFor}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Action Buttons: Quick-Spec Modal Trigger & Select for Quotation */}
                          <div className="p-6 pt-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                            <button
                              type="button"
                              onClick={() => setInspectingMachine(m)}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 hover:border-slate-700 font-semibold text-xs transition-colors cursor-pointer"
                            >
                              <Eye className="h-3.5 w-3.5 text-[#fa5402]" strokeWidth={1.5} />
                              <span>View Specs</span>
                            </button>

                            <a
                              href="#inquiry"
                              onClick={(e) => {
                                e.preventDefault();
                                handleSelectMachine(m.title);
                              }}
                              className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3.5 rounded-lg bg-slate-800 hover:bg-[#fa5402] text-slate-200 hover:text-white border border-slate-700 hover:border-[#fa5402] font-bold text-xs transition-all cursor-pointer group/btn shadow-sm"
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

      {/* ── 6. INTERACTIVE RENTAL & MOBILIZATION ESTIMATOR WIDGET ────────── */}
      <section 
        id="estimator" 
        className="scroll-mt-24 py-16 md:py-20 bg-slate-900 border-b border-slate-800 relative"
      >
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center mb-10">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#fa5402]/10 border border-[#fa5402]/20 text-xs font-semibold text-[#fa5402] mb-2">
              <SlidersHorizontal className="w-3.5 h-3.5" strokeWidth={1.5} />
              <span>LOGISTICS & DURATION ENGINE</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Interactive Rental & Mobilization Estimator
            </h2>
            <p className="mt-2 text-slate-400 text-sm max-w-xl mx-auto leading-relaxed">
              Simulate deployment requirements, operator assignment, and transit lead time. Selected parameters flow directly into your WhatsApp inquiry payload.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-6 sm:p-8 shadow-xl">
            
            <div className="space-y-8">
              
              {/* Duration Slider & Quick Presets */}
              <div>
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
                  <label className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-[#fa5402]" strokeWidth={1.5} />
                    <span>Hire Duration: <strong className="text-[#fa5402] font-mono text-sm ml-1">{estimatorDays} Days ({duration})</strong></span>
                  </label>
                  <span className="text-xs text-slate-400">1 Day to 90 Days Contract</span>
                </div>

                {/* Range Slider */}
                <input
                  type="range"
                  min="1"
                  max="90"
                  value={estimatorDays}
                  onChange={(e) => applyEstimatorDays(parseInt(e.target.value, 10))}
                  className="w-full estimator-slider cursor-pointer"
                  aria-label="Rental duration in days"
                />

                {/* Preset Chips */}
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {[
                    { label: "1-3 Days (Pour)", days: 3 },
                    { label: "1 Week (Standard)", days: 7 },
                    { label: "2-3 Weeks (Slab)", days: 14 },
                    { label: "1 Month + (Contract)", days: 30 },
                  ].map((preset) => (
                    <button
                      key={preset.days}
                      type="button"
                      onClick={() => applyEstimatorDays(preset.days)}
                      className={`py-2 px-3 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                        estimatorDays === preset.days
                          ? "bg-[#fa5402] text-white border-[#fa5402] shadow-sm font-bold"
                          : "bg-slate-900 text-slate-300 hover:text-white border-slate-800 hover:border-slate-700"
                      }`}
                    >
                      {preset.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Operator Requirement Toggle */}
              <div>
                <label className="text-xs font-bold text-slate-200 uppercase tracking-wider mb-3 block flex items-center gap-2">
                  <HardHat className="w-4 h-4 text-[#fa5402]" strokeWidth={1.5} />
                  <span>Equipment Crew Mode:</span>
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Option 1: With Operator */}
                  <div
                    onClick={() => setNeedOperator(true)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      needOperator
                        ? "bg-[#fa5402]/10 border-[#fa5402] text-white shadow-[0_0_15px_rgba(250,84,2,0.2)]"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2 font-bold text-sm text-white">
                        <CheckCircle2 className={`w-4 h-4 ${needOperator ? "text-[#fa5402]" : "text-slate-600"}`} strokeWidth={1.5} />
                        <span>With Certified Operator</span>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded">
                        RECOMMENDED
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 mt-2 leading-relaxed">
                      Zero Group experienced plant technician included. Manages hydraulic batch consistency, pre-pour safety checks, and zero downtime risk.
                    </p>
                  </div>

                  {/* Option 2: Dry Lease */}
                  <div
                    onClick={() => setNeedOperator(false)}
                    className={`p-4 rounded-xl border transition-all cursor-pointer flex flex-col justify-between ${
                      !needOperator
                        ? "bg-[#fa5402]/10 border-[#fa5402] text-white shadow-[0_0_15px_rgba(250,84,2,0.2)]"
                        : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2 font-bold text-sm text-white">
                        <CheckCircle2 className={`w-4 h-4 ${!needOperator ? "text-[#fa5402]" : "text-slate-600"}`} strokeWidth={1.5} />
                        <span>Dry Lease (Machinery Only)</span>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
                        PLANT ONLY
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                      Machinery delivered to site for client-managed operation. Contractor provides licensed technician; pre-start verification applies.
                    </p>
                  </div>
                </div>
              </div>

              {/* Dynamic Dispatch Timeline Preview Card */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#fa5402] uppercase tracking-wider">
                    <Zap className="w-4 h-4 text-[#fa5402]" strokeWidth={1.5} />
                    <span>Calculated Mobilization Timeline</span>
                  </div>
                  <p className="text-sm font-semibold text-white">
                    {calculatedTimeline}
                  </p>
                  <p className="text-xs text-slate-400">
                    Deploying to <strong className="text-slate-200">{district} District</strong> via Central Machinery Yard flatbed carrier.
                  </p>
                </div>

                <a
                  href="#inquiry"
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToId("inquiry");
                  }}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg bg-[#fa5402] hover:bg-[#e04b01] text-white font-bold text-xs shadow-sm transition-colors cursor-pointer shrink-0"
                >
                  <span>Apply Parameters to Form</span>
                  <ArrowRight className="w-3.5 h-3.5" strokeWidth={1.5} />
                </a>
              </div>

            </div>
          </div>
        </div>
      </section>

      {/* ── 7. COMMERCIAL HIRE INQUIRY FORM ────────────────────────────── */}
      <section 
        id="inquiry" 
        ref={inquiryRef}
        className="scroll-mt-24 py-16 md:py-20 bg-slate-950 border-b border-slate-800"
      >
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          
          <div className="text-center mb-10">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#fa5402]">
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
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none focus:ring-2 focus:ring-[#fa5402]/20 focus:border-[#fa5402] transition-colors"
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
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none focus:ring-2 focus:ring-[#fa5402]/20 focus:border-[#fa5402] transition-colors"
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
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none focus:ring-2 focus:ring-[#fa5402]/20 focus:border-[#fa5402] transition-colors"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Job Site District (Kerala) *
                  </label>
                  <select
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-[#fa5402]/20 focus:border-[#fa5402] transition-colors"
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
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-[#fa5402]/20 focus:border-[#fa5402] transition-colors"
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
                    className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 outline-none focus:ring-2 focus:ring-[#fa5402]/20 focus:border-[#fa5402] transition-colors"
                  >
                    <option value="1 to 3 Days">1 to 3 Days (Pour Basis)</option>
                    <option value="1 Week">1 Week</option>
                    <option value="2 to 3 Weeks">2 to 3 Weeks</option>
                    <option value="1 Month or Long Term">1 Month or Long Term Contract</option>
                  </select>
                </div>
              </div>

              {/* Operator Requirement Toggle Checkbox */}
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
                  className="w-4 h-4 rounded text-[#fa5402] focus:ring-[#fa5402] border-slate-700 bg-slate-900 accent-[#fa5402] cursor-pointer"
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
                  className="w-full rounded-lg border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-100 placeholder-slate-500 outline-none focus:ring-2 focus:ring-[#fa5402]/20 focus:border-[#fa5402] resize-none transition-colors"
                />
              </div>

              <button
                type="submit"
                className="w-full flex items-center justify-center gap-2.5 rounded-lg bg-[#fa5402] hover:bg-[#e04b01] py-3.5 px-6 text-white font-bold text-sm shadow-md hover:shadow-[0_0_20px_rgba(250,84,2,0.4)] transition-all cursor-pointer"
              >
                <MessageSquare className="h-4 w-4 text-white" strokeWidth={1.5} />
                <span>Submit Quotation Request via WhatsApp Desk</span>
                <ArrowRight className="h-4 w-4 text-white" strokeWidth={1.5} />
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

      {/* ── 8. REGIONAL COVERAGE (100% RESPONSIVE NO-OVERFLOW GRID) ─────── */}
      <section 
        ref={coverageRef}
        className="py-14 bg-slate-900 border-b border-slate-800"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
            <div>
              <div className="flex items-center gap-2 text-[#fa5402] text-xs font-semibold uppercase tracking-wider mb-1">
                <Navigation className="w-4 h-4 text-[#fa5402]" strokeWidth={1.5} />
                <span>CENTRAL DEPOT DISTRIBUTION MATRIX</span>
              </div>
              <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Active Operational Districts Across Kerala
              </h3>
            </div>
            <div className="text-xs text-slate-300 bg-slate-950/80 border border-slate-800 px-3.5 py-1.5 rounded-lg flex items-center gap-2 w-fit">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0 animate-pulse" />
              <span>Full Flatbed Recovery & Crane Support Mobilized to All 14 Districts</span>
            </div>
          </div>

          {/* Responsive adaptive grid that accommodates long names like Thiruvananthapuram without clipping */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7 gap-3">
            {activeDistricts.map((dist, dIdx) => {
              const isCentral = CENTRAL_KERALA_DISTRICTS.has(dist);
              return (
                <div 
                  key={dIdx}
                  className={`p-3 rounded-xl border text-center transition-all min-w-0 overflow-hidden flex flex-col justify-between ${
                    isCentral 
                      ? "bg-slate-950/90 border-[#fa5402]/40 text-orange-300 shadow-sm shadow-[#fa5402]/5 hover:border-[#fa5402]"
                      : "bg-slate-950/50 border-slate-800/90 text-slate-300 hover:border-slate-700 hover:text-white"
                  }`}
                >
                  <p className="text-xs font-bold text-white truncate px-0.5" title={dist}>
                    {dist}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1 whitespace-nowrap">
                    {isCentral ? "⚡ < 2 Hr Transit" : "Scheduled Direct"}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── 9. QUICK-SPEC INSPECTION MODAL / DRAWER ─────────────────────── */}
      {inspectingMachine && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-labelledby="spec-modal-title"
        >
          <div 
            className="relative w-full max-w-2xl bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col min-w-0"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Top accent border matching Logo Orange */}
            <div className="h-1.5 bg-gradient-to-r from-[#fa5402] via-orange-400 to-[#e04b01]" />

            {/* Modal Equipment Photo Banner */}
            <div className="relative h-44 sm:h-52 w-full overflow-hidden bg-slate-950 border-b border-slate-800">
              <Image
                src={inspectingMachine.imageUrl || getMachineImage(inspectingMachine.title, inspectingMachine.category)}
                alt={inspectingMachine.title}
                fill
                className="object-cover object-center"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent" />
            </div>

            {/* Modal Header */}
            <div className="p-6 border-b border-slate-800 flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#fa5402] bg-[#fa5402]/10 border border-[#fa5402]/20 px-2.5 py-0.5 rounded">
                    {inspectingMachine.classification}
                  </span>
                  <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    {inspectingMachine.demandTag}
                  </span>
                </div>
                <h3 id="spec-modal-title" className="text-xl sm:text-2xl font-bold text-white tracking-tight break-words">
                  {inspectingMachine.title}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Category: <strong className="text-slate-200">{inspectingMachine.category}</strong>
                </p>
              </div>

              <button
                type="button"
                onClick={() => setInspectingMachine(null)}
                className="p-2 rounded-lg bg-slate-950 border border-slate-800 text-slate-400 hover:text-white hover:border-slate-700 transition-colors cursor-pointer shrink-0"
                aria-label="Close specification modal"
              >
                <X className="w-5 h-5" strokeWidth={1.5} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 custom-scrollbar">
              
              {/* Technical Specifications Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Power & Prime Mover</p>
                  <p className="text-sm font-semibold text-white mt-0.5 break-words">{inspectingMachine.power}</p>
                </div>

                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Pre-Delivery Testing</p>
                  <p className="text-sm font-semibold text-emerald-400 mt-0.5 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" strokeWidth={1.5} />
                    <span>Hydraulic Pressure & Load Tested</span>
                  </p>
                </div>
              </div>

              {/* Specification Bullets */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-[#fa5402] mb-3 flex items-center gap-2">
                  <Cog className="w-4 h-4 text-[#fa5402]" strokeWidth={1.5} />
                  <span>Full Engineering & Operational Specs</span>
                </h4>
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4">
                  <ul className="space-y-2">
                    {inspectingMachine.specs.map((spec, sIdx) => (
                      <li key={sIdx} className="text-xs text-slate-200 flex items-start gap-2.5">
                        <span className="w-2 h-2 rounded-full bg-[#fa5402] shrink-0 mt-1" />
                        <span className="leading-relaxed">{spec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Ideal Applications */}
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  Recommended Site Applications
                </h4>
                <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 leading-relaxed">
                  {inspectingMachine.idealFor}
                </div>
              </div>

              {/* Operator & Safety SLA Note */}
              <div className="p-4 rounded-xl bg-[#fa5402]/10 border border-[#fa5402]/20 text-xs text-orange-200 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-[#fa5402] shrink-0 mt-0.5" strokeWidth={1.5} />
                <div className="leading-relaxed">
                  <p className="font-bold text-orange-300">Zero Group Certified Operator Protocol</p>
                  <p className="text-slate-300 mt-0.5">
                    Every commercial plant machine is dispatched with verified oil/fuel levels, heavy chassis tie-down transport, and optional certified operator handling.
                  </p>
                </div>
              </div>

            </div>

            {/* Modal Footer / Actions */}
            <div className="p-4 sm:p-6 border-t border-slate-800 bg-slate-950 flex flex-col sm:flex-row items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setInspectingMachine(null)}
                className="w-full sm:w-auto px-4 py-2.5 rounded-lg border border-slate-800 hover:border-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer"
              >
                Close Inspection
              </button>

              <button
                type="button"
                onClick={() => {
                  handleSelectMachine(inspectingMachine.title);
                  setInspectingMachine(null);
                }}
                className="w-full sm:w-auto px-6 py-2.5 rounded-lg bg-[#fa5402] hover:bg-[#e04b01] text-white font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md hover:shadow-[0_0_15px_rgba(250,84,2,0.4)]"
              >
                <span>Select for Quotation</span>
                <ArrowRight className="w-4 h-4 text-white" strokeWidth={1.5} />
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ── 10. FLOATING INSTANT WHATSAPP DESK BUTTON ───────────────────── */}
      <a
        href={`https://wa.me/${cleanWhatsAppNumber}?text=${encodeURIComponent("Hello ZERO GROUP, I would like to inquire about machinery rental availability and commercial rates.")}`}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-40 bg-[#25D366] hover:bg-[#20ba5a] text-slate-950 font-bold text-xs py-3 px-4 rounded-full shadow-2xl flex items-center gap-2.5 transition-all hover:scale-105 hover:shadow-[0_0_25px_rgba(37,211,102,0.4)] cursor-pointer group"
        aria-label="Chat directly on WhatsApp"
      >
        <MessageSquare className="w-4 h-4 text-slate-950 fill-current shrink-0" />
        <span className="hidden sm:inline font-bold">Live Yard Desk</span>
      </a>

      {/* ── 11. INDUSTRIAL FOOTER ───────────────────────────────────────── */}
      <footer className="border-t border-slate-800 bg-slate-900 py-12 text-slate-400 text-xs relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-3 text-white">
              <div className="relative h-9 w-9 shrink-0 flex items-center justify-center">
                <Image
                  src="/logo.png"
                  alt="ZERO GROUP Logo"
                  width={36}
                  height={36}
                  className="h-full w-full object-contain"
                />
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
                <Phone className="w-3.5 h-3.5 text-[#fa5402]" strokeWidth={1.5} />
                <a href={`tel:${settings.companyPhone}`} className="hover:text-[#fa5402] font-medium">
                  {settings.companyPhone}
                </a>
              </li>
              <li className="flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-emerald-400" strokeWidth={1.5} />
                <a
                  href={`https://wa.me/${cleanWhatsAppNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-[#fa5402] font-medium"
                >
                  WhatsApp: +{cleanWhatsAppNumber}
                </a>
              </li>
              <li className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#fa5402]" strokeWidth={1.5} />
                <a href={`mailto:${settings.companyEmail}`} className="hover:text-[#fa5402] font-medium">
                  {settings.companyEmail}
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold text-white mb-2.5 text-xs">Field Logins & Portal</h4>
            <ul className="space-y-1.5 text-[11px]">
              <li>
                <Link href="/login" className="hover:text-[#fa5402] transition-colors">
                  Operator & Driver Sign In
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-[#fa5402] transition-colors">
                  Yard Admin & Staff Console
                </Link>
              </li>
              <li>
                <a href="#inquiry" className="hover:text-[#fa5402] transition-colors">
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
