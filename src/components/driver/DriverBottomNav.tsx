"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Truck, 
  CalendarDays, 
  Fuel, 
  Wrench, 
  MessageSquare 
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  matchPrefix?: string;
}

const NAV_ITEMS: NavItem[] = [
  { label: "My Shift", href: "/driver/home", icon: Truck },
  { label: "Dispatches", href: "/driver/dispatches", icon: CalendarDays, matchPrefix: "/driver/orders" },
  { label: "Log Fuel", href: "/driver/expenses", icon: Fuel },
  { label: "Portal", href: "/driver/portal", icon: Wrench },
  { label: "Chat", href: "/driver/chat", icon: MessageSquare },
];

export default function DriverBottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-800/90 bg-slate-900/95 backdrop-blur-xl shadow-2xl pb-[max(0.6rem,env(safe-area-inset-bottom))] pt-2 px-3">
      <div className="flex max-w-lg mx-auto items-center justify-between gap-1">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.matchPrefix && pathname?.startsWith(item.matchPrefix));

          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={true}
              className={`flex-1 flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition-all duration-200 select-none touch-manipulation active:scale-95 ${
                isActive
                  ? "bg-cyan-500/15 border border-cyan-500/35 text-cyan-400 font-bold shadow-md shadow-cyan-500/10"
                  : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50 border border-transparent"
              }`}
            >
              <div className="relative flex items-center justify-center">
                <Icon className={`h-5 w-5 transition-transform duration-200 ${isActive ? "scale-110 text-cyan-300" : ""}`} />
                {isActive && (
                  <span className="absolute -top-1 -right-1 w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                )}
              </div>
              <span className={`text-[10px] mt-1 tracking-tight truncate max-w-full ${isActive ? "font-black text-cyan-300" : "font-semibold"}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
