import React from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { handleSignOut } from "@/actions/auth";
import { IOSInstallPrompt } from "@/components/driver/IOSInstallPrompt";
import IntervalLocationTracker from "@/components/IntervalLocationTracker";
import AdminReturnBanner from "@/components/AdminReturnBanner";
import DriverHeaderProfile from "@/components/driver/DriverHeaderProfile";
import DriverBottomNav from "@/components/driver/DriverBottomNav";
import { Truck, LogOut } from "lucide-react";

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

  return (
    <div className="flex min-h-screen flex-col bg-slate-950 text-slate-100 font-sans">
      <IntervalLocationTracker
        intervalMs={15000}
        movingIntervalMs={15000}
        idleIntervalMs={120000}
        employeeId={(session.user as any).employeeId || session.user.id}
      />
      <AdminReturnBanner userRole={session.user.role} />

      {/* PWA Mobile Top Header */}
      <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-800/80 bg-slate-900/90 px-4 backdrop-blur-xl">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 shadow-md shadow-cyan-500/20">
            <Truck className="h-5 w-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-black tracking-tight text-white">ZERO GROUP</h1>
            <p className="text-[10px] font-bold text-cyan-400">Driver & Operator PWA</p>
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
              className="rounded-xl p-2 text-slate-400 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      </header>

      {/* Main Field App Content with safe bottom clearance above navigation bar */}
      <main className="flex-1 p-4 sm:p-6 max-w-lg mx-auto w-full pb-36">
        {children}
      </main>

      {/* iOS Safari Add to Home Screen Prompt */}
      <IOSInstallPrompt />

      {/* Interactive Mobile Bottom Navigation Bar with Active Highlighting */}
      <DriverBottomNav />
    </div>
  );
}
