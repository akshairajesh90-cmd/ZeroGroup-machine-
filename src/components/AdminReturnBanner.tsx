"use client";

import { useRouter } from "next/navigation";
import { ShieldAlert, ArrowLeft } from "lucide-react";

interface AdminReturnBannerProps {
  userRole?: string | null;
}

/**
 * Shown at the top of staff/driver/operator pages ONLY when an ADMIN/OWNER is browsing.
 * Role is passed from the server layout — never relies on client session cache.
 * Gives them a one-click return to the Admin Command Center.
 */
export default function AdminReturnBanner({ userRole }: AdminReturnBannerProps) {
  const router = useRouter();

  const isGodMode = userRole === "OWNER" || userRole === "ADMIN";

  // Only show when a God Mode user (OWNER/ADMIN) is viewing staff/operator/driver pages
  if (!isGodMode) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] flex items-center justify-between gap-3 bg-amber-500 px-4 py-2 shadow-lg">
      <div className="flex items-center gap-2">
        <ShieldAlert className="w-4 h-4 text-black shrink-0" />
        <span className="text-xs font-black text-black uppercase tracking-widest">
          GOD MODE — Viewing as {userRole}
        </span>
      </div>
      <button
        onClick={() => router.push("/admin/dashboard")}
        className="flex items-center gap-1.5 bg-black text-amber-400 text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-lg hover:bg-zinc-900 active:scale-95 transition-all"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        ← Admin Hub
      </button>
    </div>
  );
}
