"use client";

import React from "react";
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
  MessageCircle,
  Smartphone,
  HardHat,
  Building2,
  Wrench,
  PenTool,
  FileText,
  Briefcase,
  Activity,
  Trash2,
  MapPin,
  ClipboardList,
  FolderKanban,
  BookOpen
} from "lucide-react";
import { handleSignOut } from "@/actions/auth";
import { useState } from "react";
import MyProfileModal from "./MyProfileModal";

interface AdminSidebarProps {
  userRole: "OWNER" | "STAFF" | "ADMIN";
  userName: string;
  userEmail: string;
}

export default function AdminSidebar({ userRole, userName, userEmail }: AdminSidebarProps) {
  const pathname = usePathname();
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const navGroups = [
    {
      group: "Executive Oversight",
      links: [
        { label: "Executive Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
        { label: "P&L Analytics", href: "/admin/analytics", icon: Activity },
        { label: "Staff Activity Log", href: "/admin/staff-log", icon: FileText },
        { label: "Pending Approvals", href: "/admin/trash", icon: Shield },
        { label: "Company Chat", href: "/admin/chat", icon: MessageCircle },
      ]
    },
    {
      group: "Command Center (God Mode)",
      links: [
        { label: "Operations Dashboard", href: "/staff/dashboard", icon: Briefcase },
        { label: "Live Operations", href: "/admin/live", icon: MapPin },
        { label: "Projects", href: "/staff/projects", icon: FolderKanban },
      ]
    },
    {
      group: "Operations",
      links: [
        { label: "Daily Dispatches", href: "/staff/dispatch", icon: CalendarDays },
        { label: "Dispatch Board", href: "/staff/orders", icon: ClipboardList },
        { label: "Fleet and Machines", href: "/staff/fleet", icon: Truck },
        { label: "Asset Maintenance", href: "/admin/maintenance", icon: PenTool },
        { label: "Tools Inventory", href: "/staff/tools", icon: Wrench },
      ]
    },
    {
      group: "Finance",
      links: [
        { label: "Billing", href: "/admin/billing", icon: Receipt },
        { label: "Invoices", href: "/staff/invoices", icon: FileSpreadsheet },
        { label: "Weekly Settlements", href: "/staff/settlements", icon: BookOpen },
        { label: "Cash Collections", href: "/staff/cash", icon: Wallet },
        { label: "Salary Advances", href: "/admin/advances", icon: PiggyBank },
        { label: "Manual Adjustments", href: "/admin/adjustments", icon: SlidersHorizontal },
        { label: "Expenses and Store", href: "/staff/expenses", icon: Receipt },
      ]
    },
    {
      group: "People and HR",
      links: [
        { label: "Office Employees", href: "/staff/employees", icon: Shield },
        { label: "Field Workers", href: "/staff/workers", icon: Users },
        { label: "Field Operators", href: "/staff/operators", icon: HardHat },
        { label: "External Sub-Leaders", href: "/staff/sub-leaders", icon: Users },
        { label: "Crew Directory", href: "/staff/directory", icon: MessageCircle },
        { label: "Compliance Docs", href: "/staff/documents", icon: FileText },
      ]
    }
  ];

  return (
    <aside className="hidden lg:flex w-64 flex-col border-r border-zinc-800 bg-zinc-950 font-sans shadow-xl">
      {/* Brand Header */}
      <Link href="/admin/dashboard" className="flex h-16 shrink-0 items-center gap-3 border-b border-zinc-800 px-6 bg-zinc-950/50 backdrop-blur-xl hover:bg-zinc-900 transition-colors">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-500 to-cyan-500 shadow-lg shadow-indigo-500/20">
          <Shield className="h-5 w-5 text-white" />
        </div>
        <div>
          <h2 className="font-bold tracking-tight text-white text-base">ZERO GROUP</h2>
          <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">
            {userRole === "OWNER" ? "Command Center" : "Executive Portal"}
          </p>
        </div>
      </Link>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
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
                    className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all ${
                      isActive
                        ? "bg-indigo-500/10 text-indigo-400 font-bold"
                        : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
                    }`}
                  >
                    <Icon className={`h-4 w-4 ${isActive ? "text-indigo-400" : "text-zinc-500"}`} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* User Footer */}
      <div className="border-t border-zinc-800 p-4 bg-zinc-950/50">
        <div 
          onClick={() => setIsProfileOpen(true)}
          className="flex items-center gap-3 mb-4 px-2 cursor-pointer hover:bg-zinc-900 py-2 rounded-xl transition-colors"
          title="Edit Profile"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-800 border border-zinc-700">
            <span className="text-sm font-bold text-white">
              {userName.charAt(0).toUpperCase()}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="truncate text-sm font-bold text-white">
              {userName}
            </p>
            <p className="truncate text-xs font-medium text-zinc-500">
              {userEmail}
            </p>
          </div>
        </div>
        <form action={handleSignOut}>
          <button
            type="submit"
            className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-500/10 px-4 py-2.5 text-sm font-bold text-red-500 hover:bg-red-500/20 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>Secure Logout</span>
          </button>
        </form>
      </div>
      <MyProfileModal isOpen={isProfileOpen} onClose={() => setIsProfileOpen(false)} />
    </aside>
  );
}
