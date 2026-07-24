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
} from "lucide-react";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user || (session.user.role !== "OWNER" && session.user.role !== "STAFF")) {
    redirect("/");
  }

  const navItems = [
    { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { label: "Daily Dispatches", href: "/admin/dispatch", icon: CalendarDays },
    { label: "Fleet & Machines", href: "/admin/fleet", icon: Truck },
    { label: "Employees & Rates", href: "/admin/employees", icon: Users },
    { label: "Expenses & Store", href: "/admin/expenses", icon: Receipt },
    { label: "Cash Collections", href: "/admin/cash", icon: Wallet },
    { label: "Salary Advances", href: "/admin/advances", icon: PiggyBank },
    { label: "Manual Adjustments", href: "/admin/adjustments", icon: SlidersHorizontal },
    { label: "Weekly Settlements", href: "/admin/settlements", icon: FileSpreadsheet },
  ];

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans">
      {/* Sidebar Navigation */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-slate-800/80 bg-slate-900/90 backdrop-blur-xl">
        <div className="flex h-16 items-center gap-3 border-b border-slate-800/80 px-6">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 shadow-lg shadow-indigo-500/20">
            <Shield className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="font-bold tracking-tight text-white text-base">ZERO GROUP</h2>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-indigo-400">Office Portal</p>
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-4">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-sm font-medium text-slate-300 transition-all hover:bg-slate-800/80 hover:text-white"
              >
                <Icon className="h-4 w-4 text-slate-400 group-hover:text-indigo-400" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        {/* User profile & Sign Out */}
        <div className="border-t border-slate-800/80 p-4">
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

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar for mobile & quick search/status */}
        <header className="flex h-16 items-center justify-between border-b border-slate-800/80 bg-slate-900/50 px-6 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <span className="lg:hidden font-bold text-indigo-400">ZERO GROUP Admin</span>
            <div className="hidden sm:flex items-center gap-2 rounded-full bg-slate-800/60 px-3 py-1 text-xs text-slate-400 border border-slate-700/50">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>System Online · Phase 3 Active</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 text-xs font-semibold text-indigo-400">
              ADMIN ROLE
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
