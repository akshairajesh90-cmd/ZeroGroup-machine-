import React from "react";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { handleSignOut } from "@/actions/auth";
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
  CreditCard,
  UserCog,
} from "lucide-react";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user || (session.user.role !== "OWNER" && session.user.role !== "ADMIN")) {
    redirect("/");
  }

  const role = session.user.role;

  const navGroups = [
    {
      title: "Command Center",
      items: [
        { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
        { label: "Live Operations", href: "/admin/live-map", icon: MapPin },
        { label: "Analytics and Projects", href: "/staff/projects", icon: BarChart2 },
      ],
    },
    {
      title: "Operations Oversight",
      items: [
        { label: "Daily Dispatches", href: "/staff/dispatch", icon: CalendarDays },
      ],
    },
    {
      title: "Finance & Accounting",
      items: [
        { label: "Billing", href: "/admin/billing", icon: Receipt },
        { label: "Invoices", href: "/staff/invoices", icon: ClipboardList },
        { label: "Weekly Settlements", href: "/staff/settlements", icon: FileSpreadsheet },
        { label: "Cash Collections", href: "/staff/cash", icon: Wallet },
        { label: "Salary Advances", href: "/admin/advances", icon: PiggyBank },
        { label: "Manual Adjustments", href: "/admin/adjustments", icon: SlidersHorizontal },
        { label: "Expenses and Store", href: "/staff/expenses", icon: Receipt },
      ],
    },
    {
      title: "Access User Portals",
      items: [
        { label: "Office Staff Portal", href: "/staff/dashboard", icon: UserCog },
        { label: "Field Operator App", href: "/operator/home", icon: HardHat },
      ],
    },
    {
      title: "System",
      items: [
        { label: "Trash & Recovery", href: "/owner/trash", icon: Trash2 },
      ],
    },
  ];

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Sidebar */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-slate-800/80 bg-slate-900/90 backdrop-blur-xl">
        {/* Logo */}
        <div className="flex h-16 items-center gap-3 border-b border-slate-800/80 px-6 shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 shadow-lg shadow-indigo-500/20">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold tracking-tight text-white text-base">ZERO GROUP</h2>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-400">
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
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      prefetch={false}
                      className={`flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium transition-all ${
                        isDanger
                          ? "text-rose-400 hover:bg-rose-500/10 hover:text-rose-300"
                          : "text-slate-300 hover:bg-slate-800/80 hover:text-white"
                      }`}
                    >
                      <Icon className={`h-4 w-4 ${isDanger ? "text-rose-500" : "text-slate-400"}`} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* User Profile & Sign Out */}
        <div className="border-t border-slate-800/80 p-4 shrink-0">
          <div className="flex items-center justify-between rounded-xl bg-slate-950/60 p-3 border border-slate-800/50">
            <div className="overflow-hidden">
              <p className="truncate text-xs font-semibold text-white">{session.user.name}</p>
              <p className="truncate text-[10px] text-slate-400">{session.user.email}</p>
            </div>
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
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Top Bar */}
        <header className="flex h-16 items-center justify-between border-b border-slate-800/80 bg-slate-900/50 px-6 backdrop-blur-md shrink-0">
          <div className="flex items-center gap-4">
            <span className="lg:hidden font-bold text-indigo-400">ZERO GROUP</span>
            <div className="hidden sm:flex items-center gap-2 rounded-full bg-slate-800/60 px-3 py-1 text-xs text-slate-400 border border-slate-700/50">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>System Online · Live</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span
              className={`rounded-lg border px-2.5 py-1 text-xs font-semibold ${
                role === "OWNER"
                  ? "bg-indigo-500/10 border-indigo-500/20 text-indigo-400"
                  : "bg-amber-500/10 border-amber-500/20 text-amber-400"
              }`}
            >
              {role}
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 lg:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
