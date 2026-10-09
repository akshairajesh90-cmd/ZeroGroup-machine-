"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { usePathname, useRouter } from "next/navigation";
import { handleSignOut } from "@/actions/auth";
import { IOSInstallPrompt } from "@/components/driver/IOSInstallPrompt";
import AdminReturnBanner from "@/components/AdminReturnBanner";
import IntervalLocationTracker from "@/components/IntervalLocationTracker";
import { Truck, LogOut, Wrench, Wallet, ClipboardList, Eye, WifiOff } from "lucide-react";
import ImpersonateExitButton from "@/components/driver/ImpersonateExitButton";

export default function OperatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [isOffline, setIsOffline] = useState(false);

  // Bypass authentication and template layout for operator login
  if (pathname === "/operator/login") {
    return <>{children}</>;
  }

  const router = useRouter();

  useEffect(() => {
    // Register the main Service Worker
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch((err) => {
        console.error("Service Worker registration failed:", err);
      });
    }

    // Monitor network state
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    setIsOffline(!navigator.onLine);

    // Eagerly cache the NextAuth session for offline persistence
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then((reg) => {
        reg.active?.postMessage({ type: "CACHE_SESSION_NOW" });
      });
    }

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/");
      return;
    }
    if (status === "authenticated" && session?.user) {
      const role = session.user.role;
      if (role !== "OPERATOR" && role !== "OWNER" && role !== "STAFF" && role !== "ADMIN") {
        router.push("/");
        return;
      }
      if (pathname === "/operator/equipment") {
        router.push("/operator/home");
      }
    }
  }, [status, session, pathname, router]);

  const role = session?.user?.role || "OPERATOR";

  const bottomNavItems = [
    { label: "My Job",      href: "/operator/home",      icon: ClipboardList },
    { label: "Pay/Invoice", href: "/operator/pay",       icon: Wallet },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-slate-100 font-sans pb-24">
      <IntervalLocationTracker intervalMs={300000} />
      <AdminReturnBanner userRole={session?.user?.role || "OPERATOR"} />
      {(session as any)?.isImpersonating && (
        <div className="bg-rose-600 px-4 py-2 flex items-center justify-between sticky top-0 z-50">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-white animate-pulse" />
            <span className="text-[11px] font-black tracking-widest text-white uppercase">
              Impersonating
            </span>
          </div>
          <ImpersonateExitButton />
        </div>
      )}

      {/* ⚠️ OFFLINE BANNER — always visible when disconnected */}
      {isOffline && (
        <div className="sticky top-0 z-50 flex items-center justify-center gap-3 bg-zinc-700 px-4 py-3 border-b border-zinc-600">
          <WifiOff className="h-5 w-5 text-yellow-400 shrink-0" />
          <p className="text-sm font-black text-yellow-300 uppercase tracking-wide">
            ⚠️ OFFLINE MODE — Data will save automatically when signal returns.
          </p>
        </div>
      )}

      {/* Modern App Header */}
      <header className="sticky top-0 z-40 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/90 pt-safe-top">
        <div className="flex items-center justify-between px-4 h-[60px] max-w-lg mx-auto">
          {/* Status Indicators & Name */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="relative flex h-3 w-3">
                <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${isOffline ? "bg-red-400" : "bg-emerald-400"}`}></span>
                <span className={`relative inline-flex rounded-full h-3 w-3 ${isOffline ? "bg-red-500" : "bg-emerald-500"}`}></span>
              </span>
              <span className="text-white font-black tracking-tight text-lg">
                ZERO<span className="text-orange-500">GROUP</span>
              </span>
            </div>
            <div className="h-4 w-px bg-zinc-800 hidden sm:block" />
            <div className="hidden sm:flex flex-col">
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest leading-none">
                {session?.user?.operatorType === 'SUBCONTRACTOR' ? 'CONTRACTOR' : role}
              </span>
            </div>
          </div>
          
          <form action={handleSignOut}>
            <button
              type="submit"
              className="flex min-h-[48px] min-w-[48px] items-center justify-center rounded-lg text-zinc-400 hover:bg-rose-500/10 hover:text-rose-400 transition-colors"
              title="Sign Out"
            >
              <LogOut className="h-5 w-5" />
            </button>
          </form>
        </div>
      </header>

      {/* Main Field App Content */}
      <main className="flex-1 p-4 sm:p-6 max-w-lg mx-auto w-full">
        {children}
      </main>

      <IOSInstallPrompt />

      {/* Mobile Bottom Navigation Bar — Large Tap Targets */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-zinc-800/90 bg-zinc-900/95 px-2 pb-safe pt-2 backdrop-blur-xl shadow-2xl">
        <div className="flex max-w-lg mx-auto items-center justify-around h-[64px]">
          {bottomNavItems.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                prefetch={false}
                className="flex flex-col items-center justify-center gap-1 w-full h-full min-h-[48px] min-w-[48px] text-zinc-400 active:text-orange-500 transition-colors"
              >
                <Icon className="h-6 w-6" />
                <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
