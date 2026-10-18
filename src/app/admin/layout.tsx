import React from "react";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

import AdminSidebar from "@/components/AdminSidebar";
import StaffSidebar from "@/components/StaffSidebar";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user || (session.user.role !== "OWNER" && session.user.role !== "ADMIN" && session.user.role !== "STAFF")) {
    redirect("/");
  }

  const role = session.user.role;

  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100 font-sans">
      {role === "STAFF" ? (
        <StaffSidebar userName={session.user.name || "Staff"} userEmail={session.user.email || ""} />
      ) : (
        <AdminSidebar userName={session.user.name || "Admin"} userEmail={session.user.email || ""} role={role} />
      )}

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
                  : role === "ADMIN"
                  ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                  : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
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
