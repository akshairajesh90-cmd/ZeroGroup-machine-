"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Shield,
  Briefcase,
  LayoutDashboard,
  CalendarDays,
  Truck,
  Wallet,
  Receipt,
  MessageCircle,
  MapPin,
  FolderKanban,
  FileText,
  Wrench,
  LogOut,
  HardHat,
  BookOpen,
  Users,
  PiggyBank,
  SlidersHorizontal,
  PenTool,
  Activity,
  KeyRound,
  User,
} from "lucide-react";
import { handleSignOut } from "@/actions/auth";
import { useState } from "react";
import MyProfileModal from "./MyProfileModal";

interface StaffSidebarProps {
  userName: string;
  userEmail: string;
}

export default function StaffSidebar({ userName, userEmail }: StaffSidebarProps) {
  const pathname = usePathname();
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const navGroups = [
    {
      group: "Morning Briefing",
      links: [
        { label: "Dashboard", href: "/staff/dashboard", icon: LayoutDashboard },
        { label: "Analytics and Projects", href: "/staff/projects", icon: Activity },
        { label: "Crew Directory", href: "/staff/directory", icon: MessageCircle },
      ]
    },
    {
      group: "Dispatch & Ops",
      links: [
        { label: "Dispatch Board", href: "/staff/orders", icon: Briefcase },
        { label: "Daily Dispatches", href: "/staff/dispatch", icon: CalendarDays },
        { label: "Live Operations", href: "/admin/live/map", icon: MapPin },
      ]
    },
    {
      group: "Fleet & Logistics",
      links: [
        { label: "Fleet and Machines", href: "/staff/fleet", icon: Truck },
        { label: "Tools Inventory", href: "/staff/tools", icon: Wrench },
        { label: "Asset Maintenance", href: "/staff/maintenance", icon: PenTool },
      ]
    },
    {
      group: "Closing & Finance",
      links: [
        { label: "Expenses and Store", href: "/staff/expenses", icon: Receipt },
        { label: "Weekly Cash Flow", href: "/owner/ledger", icon: BookOpen },
        { label: "Cash Collections", href: "/staff/cash", icon: Wallet },
        { label: "Billing", href: "/admin/billing", icon: Receipt },
        { label: "Invoices", href: "/staff/invoices", icon: FileText },
        { label: "Weekly Settlements", href: "/staff/settlements", icon: BookOpen },
        { label: "Salary Advances", href: "/admin/advances", icon: PiggyBank },
        { label: "Manual Adjustments", href: "/admin/adjustments", icon: SlidersHorizontal },
      ]
    },
    {
      group: "HR Roster",
      links: [
        { label: "ID & Passwords Hub", href: "/staff/credentials", icon: KeyRound },
        { label: "Office Employees", href: "/staff/employees", icon: Shield },
        { label: "Field Workers", href: "/staff/workers", icon: Users },
        { label: "Drivers", href: "/staff/drivers", icon: Truck },
        { label: "Field Operators", href: "/staff/operators", icon: HardHat },
        { label: "External Sub-Leaders", href: "/staff/sub-leaders", icon: Users },
        { label: "Compliance Docs", href: "/staff/documents", icon: FileText },
      ]
    }
  ];

  return (
    <>
      {/* Mobile Hamburger Button */}
      <button
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        className="lg:hidden fixed bottom-6 left-6 z-[99999] p-3 rounded-full bg-emerald-600 border border-emerald-500 text-white hover:bg-emerald-500 active:scale-90 transition-transform shadow-2xl flex items-center justify-center touch-manipulation select-none"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d={isMobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"}></path></svg>
      </button>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Sidebar Content */}
      <aside className={`fixed lg:static inset-y-0 left-0 z-40 w-64 flex flex-col border-r border-zinc-800 bg-zinc-950 font-sans shadow-2xl transition-transform duration-300 ease-in-out ${isMobileMenuOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}>
        <Link href="/staff/dashboard" className="flex h-16 shrink-0 items-center gap-3 border-b border-zinc-800 px-6 bg-zinc-950/50 backdrop-blur-xl hover:bg-zinc-900 transition-colors pt-4 lg:pt-0 pl-16 lg:pl-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 shadow-lg shadow-emerald-500/20">
            <Briefcase className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold tracking-tight text-white text-base">ZERO GROUP</h2>
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
              Office Staff
            </p>
          </div>
        </Link>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {navGroups.map((group) => (
            <div key={group.group}>
              <p className="px-3 mb-2 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                {group.group}
              </p>
              <nav className="space-y-1">
                {group.links.map((item) => {
                  const Icon = item.icon;
                  const isActive = pathname.startsWith(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch={true}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition-all active:scale-[0.98] active:opacity-80 ${
                        isActive ? "bg-emerald-500/10 text-emerald-400" : "text-zinc-400 hover:bg-zinc-900/80 hover:text-white"
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${isActive ? "text-emerald-400" : "text-zinc-500"}`} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>

        <div className="shrink-0 border-t border-zinc-800 p-4 bg-zinc-950/80 backdrop-blur-xl">
          <div className="flex items-center justify-between rounded-xl bg-zinc-900/50 p-3 border border-zinc-800/80">
            <Link
              href="/staff/profile"
              className="flex items-center gap-2.5 overflow-hidden hover:opacity-80 transition-opacity"
              title="Edit Profile"
            >
              <div className="h-8 w-8 rounded-lg bg-emerald-600/30 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-xs shrink-0">
                {userName.charAt(0).toUpperCase()}
              </div>
              <div className="overflow-hidden">
                <p className="truncate text-xs font-semibold text-white">{userName}</p>
                <p className="truncate text-[10px] font-medium text-zinc-500">{userEmail}</p>
              </div>
            </Link>
            <div className="flex items-center gap-1">
              <Link
                href="/staff/profile"
                className="rounded-lg p-2 text-zinc-400 hover:bg-emerald-500/10 hover:text-emerald-400 transition-colors"
                title="My Profile & IDs"
              >
                <User className="h-4 w-4" />
              </Link>
              <form action={handleSignOut} onClick={e => e.stopPropagation()}>
                <button
                  type="submit"
                  className="rounded-lg p-2 text-zinc-400 hover:bg-emerald-500/10 hover:text-emerald-400 transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="h-4 w-4" />
                </button>
              </form>
            </div>
          </div>
        </div>
        <MyProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
      </aside>
    </>
  );
}

