import React from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import StaffSidebar from "@/components/StaffSidebar";
import AdminReturnBanner from "@/components/AdminReturnBanner";

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  // Only STAFF, OWNER, or ADMIN can access /staff/* routes
  if (!session?.user || (session.user.role !== "STAFF" && session.user.role !== "OWNER" && session.user.role !== "ADMIN")) {
    redirect("/");
  }

  return (
    <div className="flex min-h-screen bg-zinc-950 text-slate-100 font-sans">
      <AdminReturnBanner userRole={session.user.role} />
      {/* Staff Sidebar */}
      <StaffSidebar
        userName={session.user.name || "Office Staff"}
        userEmail={session.user.email || ""}
      />

      {/* Main Content Area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Topbar */}
        <header className="flex h-16 items-center justify-between border-b border-zinc-800/80 bg-zinc-900/50 px-6 backdrop-blur-md">
          <div className="flex items-center gap-4">
            <span className="lg:hidden font-bold text-emerald-400">ZERO GROUP</span>
            <div className="hidden sm:flex items-center gap-2 rounded-full bg-zinc-800/60 px-3 py-1 text-xs text-zinc-400 border border-zinc-700/50">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Staff Portal • Operations Active</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="rounded-lg bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 text-xs font-semibold text-emerald-400">
              OFFICE STAFF
            </span>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 lg:p-8 bg-zinc-950">
          {children}
        </main>
      </div>
    </div>
  );
}
