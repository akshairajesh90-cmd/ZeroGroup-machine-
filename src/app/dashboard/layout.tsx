import { ReactNode } from "react";
import Link from "next/link";

const navLinks = [
    { href: "/dispatch-board", label: "Dispatch Board", icon: "📋" },
    { href: "/field-diary", label: "Field Diary", icon: "📓" },
    { href: "/settlements", label: "Settlements", icon: "💰" },
    { href: "/machines", label: "Fleet", icon: "🏗️" },
    { href: "/customer/portal", label: "Customers", icon: "🏢" },
];

export default function DashboardLayout({ children }: { children: ReactNode }) {
    return (
        <div className="flex min-h-screen bg-slate-950 text-slate-100">
            {/* Sidebar */}
            <aside className="w-60 flex-shrink-0 border-r border-slate-800 bg-slate-900 flex flex-col">
                <div className="px-6 py-5 border-b border-slate-800">
                    <span className="text-xl font-bold tracking-tight text-amber-400">
                        ⚙ IronRent
                    </span>
                    <p className="text-xs text-slate-500 mt-0.5">Heavy Equipment ERP</p>
                </div>
                <nav className="flex-1 p-4 space-y-1">
                    {navLinks.map((l) => (
                        <Link
                            key={l.href}
                            href={l.href}
                            className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-slate-300 hover:bg-slate-800 hover:text-amber-400 transition-colors"
                        >
                            <span>{l.icon}</span>
                            {l.label}
                        </Link>
                    ))}
                </nav>
                <div className="px-6 py-4 border-t border-slate-800 text-xs text-slate-600">
                    Pala, Kerala · 9.7117°N 76.6853°E
                </div>
            </aside>
            {/* Main content */}
            <main className="flex-1 overflow-auto">{children}</main>
        </div>
    );
}
