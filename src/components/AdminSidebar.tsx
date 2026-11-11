"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Shield,
  LayoutDashboard,
  CalendarDays,
  Truck,
  Users,
  Receipt,
  Wallet,
  PiggyBank,
  SlidersHorizontal,
  FileSpreadsheet,
  LogOut,
  MapPin,
  Wrench,
  BarChart2,
  Trash2,
  HardHat,
  ClipboardList,
  UserCog,
  KeyRound,
  User,
  Globe,
  MessageSquare,
} from "lucide-react";
import { handleSignOut } from "@/actions/auth";
import { getPendingPasswordResetCountAction } from "@/actions/credentials";

interface AdminSidebarProps {
  userName: string;
  userEmail: string;
  role: string;
}

export default function AdminSidebar({ userName, userEmail, role }: AdminSidebarProps) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [pendingResetCount, setPendingResetCount] = useState<number>(0);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let isMounted = true;
    const fetchCount = async () => {
      try {
        const res = await getPendingPasswordResetCountAction();
        if (isMounted && res.success && typeof res.count === "number") {
          setPendingResetCount(res.count);
        }
      } catch {
        // Silently catch polling errors
      }
    };

    fetchCount();
    const interval = setInterval(fetchCount, 20000);

    const handleUpdate = () => {
      fetchCount();
    };
    window.addEventListener("reset-requests-updated", handleUpdate);

    return () => {
      isMounted = false;
      clearInterval(interval);
      window.removeEventListener("reset-requests-updated", handleUpdate);
    };
  }, [pathname]);

  // Handle mobile drawer keyboard trap, Esc key, and scroll lock
  useEffect(() => {
    if (!isMobileMenuOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        setIsMobileMenuOpen(false);
        triggerRef.current?.focus();
        return;
      }

      if (e.key === "Tab") {
        const drawerEl = document.getElementById("admin-mobile-drawer");
        if (!drawerEl) return;
        const focusables = drawerEl.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        if (focusables.length === 0) return;

        const first = focusables[0];
        const last = focusables[focusables.length - 1];

        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isMobileMenuOpen]);

  const navGroups = [
    {
      title: "Morning Briefing",
      items: [
        { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
        { label: "Operations Chat", href: "/admin/chat", icon: MessageSquare },
        { label: "ID & Passwords Hub", href: "/admin/credentials", icon: KeyRound },
        { label: "Analytics and Projects", href: "/staff/projects", icon: BarChart2 },
        { label: "Crew Directory", href: "/staff/directory", icon: Users },
      ]
    },
    {
      title: "Dispatch & Ops",
      items: [
        { label: "Dispatch Board", href: "/staff/orders", icon: ClipboardList },
        { label: "Daily Dispatches", href: "/staff/dispatch", icon: CalendarDays },
        { label: "Live Operations", href: "/admin/live/map", icon: MapPin },
      ]
    },
    {
      title: "Fleet & Logistics",
      items: [
        { label: "Fleet and Machines", href: "/staff/fleet", icon: Truck },
        { label: "Tools Inventory", href: "/staff/tools", icon: Wrench },
        { label: "Asset Maintenance", href: "/staff/maintenance", icon: Wrench },
      ]
    },
    {
      title: "Closing & Finance",
      items: [
        { label: "Expenses and Store", href: "/staff/expenses", icon: Receipt },
        { label: "Weekly Cash Flow", href: "/owner/ledger", icon: FileSpreadsheet },
        { label: "Cash Collections", href: "/staff/cash", icon: Wallet },
        { label: "Billing", href: "/admin/billing", icon: Receipt },
        { label: "Invoices", href: "/staff/invoices", icon: ClipboardList },
        { label: "Weekly Settlements", href: "/staff/settlements", icon: FileSpreadsheet },
        { label: "Salary Advances", href: "/admin/advances", icon: PiggyBank },
        { label: "Manual Adjustments", href: "/admin/adjustments", icon: SlidersHorizontal },
      ]
    },
    {
      title: "Portals & System",
      items: [
        { label: "Office Staff Portal", href: "/staff/dashboard", icon: UserCog },
        { label: "Driver Mobile App", href: "/driver/home", icon: Truck },
        { label: "Field Operator App", href: "/operator/home", icon: HardHat },
        { label: "Trash & Recovery", href: "/owner/trash", icon: Trash2 },
        { label: "Public Website & Yard", href: "/admin/settings/website", icon: Globe },
      ]
    }
  ];

  return (
    <>
      {/* Mobile Hamburger Button */}
      <button
        ref={triggerRef}
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        aria-label="Toggle navigation menu"
        aria-expanded={isMobileMenuOpen}
        aria-controls="admin-mobile-drawer"
        className="lg:hidden fixed bottom-6 left-6 z-40 p-3 rounded-lg bg-blue-600 border border-blue-700 text-white hover:bg-blue-700 active:scale-95 transition-transform shadow-lg flex items-center justify-center touch-manipulation select-none min-w-[48px] min-h-[48px]"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={isMobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}></path></svg>
      </button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Sidebar Content */}
      <aside
        id="admin-mobile-drawer"
        aria-label="Admin navigation drawer"
        role={isMobileMenuOpen ? "dialog" : undefined}
        aria-modal={isMobileMenuOpen ? "true" : undefined}
        className={`fixed lg:static inset-y-0 left-0 z-[45] w-64 flex flex-col border-r border-slate-800 bg-slate-900 font-sans shadow-md transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center gap-3 border-b border-slate-800 px-6 pt-4 lg:pt-0 pl-16 lg:pl-6">
          <div className="flex h-9 w-9 items-center justify-center bg-amber-500 shadow-sm text-slate-950 rounded-lg">
            <Shield className="h-5 w-5 text-slate-950" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="font-bold tracking-tight text-white text-base">ZERO GROUP</h2>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-amber-400">
              {role === "OWNER" ? "Owner Portal" : "Admin Portal"}
            </p>
          </div>
        </div>

        {/* Nav Groups */}
        <nav className="flex-1 overflow-y-auto py-4 space-y-5 px-3">
          {navGroups.map((group) => (
            <div key={group.title}>
              <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                {group.title}
              </p>
              <div className="space-y-0.5">
                {group.items.map((item) => {
                  const Icon = item.icon;
                  const isDanger = group.title === "System";
                  const isActive = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch={true}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all active:scale-[0.98] active:opacity-80 ${
                        isActive 
                          ? (isDanger ? "bg-rose-500/20 text-rose-400 font-semibold" : "bg-slate-800 text-amber-400 font-semibold border-l-2 border-amber-500")
                          : (isDanger ? "text-rose-400 hover:bg-rose-500/10" : "text-slate-300 hover:bg-slate-800/80 hover:text-white")
                      }`}
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${isActive ? (isDanger ? "text-rose-600" : "text-amber-400") : (isDanger ? "text-rose-500" : "text-slate-400")}`} strokeWidth={1.5} />
                      <span className="flex-1">{item.label}</span>
                      {item.href === "/admin/credentials" && pendingResetCount > 0 && (
                        <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-amber-500 text-slate-950 font-bold shadow-sm">
                          {pendingResetCount}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User Profile & Sign Out */}
        <div className="border-t border-slate-800 p-4 shrink-0">
          <div className="flex items-center justify-between rounded-lg bg-slate-950 p-3 border border-slate-800">
            <Link 
              href="/admin/profile"
              className="flex items-center gap-2.5 overflow-hidden hover:opacity-80 transition-opacity"
              title="View & Edit My Profile"
            >
              <div className="h-8 w-8 rounded-lg bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 font-bold text-xs shrink-0">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <p className="truncate text-xs font-semibold text-white">{userName}</p>
                <p className="truncate text-[10px] text-slate-400">{userEmail}</p>
              </div>
            </Link>
            <div className="flex items-center gap-1">
              <Link
                href="/admin/profile"
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
                title="My Profile & IDs"
              >
                <User className="h-4 w-4" />
              </Link>
              <form action={handleSignOut}>
                <button
                  type="submit"
                  className="rounded-lg p-2 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

