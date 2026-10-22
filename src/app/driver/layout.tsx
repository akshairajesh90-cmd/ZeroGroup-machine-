import React from "react";
import Link from "next/link";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { handleSignOut } from "@/actions/auth";
import { IOSInstallPrompt } from "@/components/driver/IOSInstallPrompt";
import IntervalLocationTracker from "@/components/IntervalLocationTracker";
import AdminReturnBanner from "@/components/AdminReturnBanner";
import DriverHeaderProfile from "@/components/driver/DriverHeaderProfile";
import { Truck, CalendarDays, Receipt, LogOut, Wrench } from "lucide-react";


export default async function DriverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  const role = session.user.role;
  if (role !== "DRIVER" && role !== "OPERATOR" && role !== "OWNER" && role !== "STAFF" && role !== "ADMIN") {
    redirect("/");
  }

  const bottomNavItems = [
    { label: "My Shift",   href: "/driver/home",       icon: Truck },
    { label: "Dispatches", href: "/driver/dispatches",  icon: CalendarDays },
    { label: "Log Fuel",   href: "/driver/expenses",    icon: Receipt },
    { label: "Portal",     href: "/driver/portal",      icon: Wrench },
    { label: "Chat",       href: "/driver/chat",        icon: Truck },
  ];


  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100 font-sans pb-20">
      <IntervalLocationTracker intervalMs={900000} />
      <AdminReturnBanner userRole={session.user.role} />
      {/* PWA Mobile Top Header */}
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-800/80 bg-slate-900/90 px-4 backdrop-blur-xl">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-md shadow-cyan-500/20">
            <Truck className="h-4 w-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-white">ZERO GROUP</h1>
            <p className="text-[10px] font-semibold text-cyan-400">Driver & Operator PWA</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="rounded-lg bg-slate-800 px-2 py-0.5 text-[10px] font-bold text-slate-300 border border-slate-700/50">
            {role}
          </span>
          <DriverHeaderProfile />
          <form action={handleSignOut}>
            <button
              type="submit"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </header>

      {/* Main Field App Content */}
      <main className="flex-1 p-4 sm:p-6 max-w-lg mx-auto w-full">
        {children}
      </main>

      {/* iOS Safari Add to Home Screen Prompt */}
      <IOSInstallPrompt />

      {/* Mobile Bottom Navigation Bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-800/90 bg-slate-900/95 px-4 py-2 backdrop-blur-xl shadow-2xl">
        <div className="flex max-w-lg mx-auto items-center justify-around">
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={true}
                className="flex flex-col items-center gap-1 py-1 px-3 text-slate-400 hover:text-cyan-400 active:text-cyan-400 active:scale-95 transition-all touch-manipulation select-none"
              >
                <Icon className="h-5 w-5" />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
