import { prisma } from "@/lib/prisma";
import Link from "next/link";

async function getFleetData() {
    const [machines, tickets, fuelLogs] = await Promise.all([
        prisma.machine.findMany({
            where: { isPendingDelete: false },
            orderBy: { createdAt: "desc" },
            include: {
                maintenanceTickets: {
                    where: { status: { not: "RESOLVED" } },
                    orderBy: { createdAt: "desc" },
                    take: 1,
                },
                dispatches: {
                    where: { status: "IN_PROGRESS" },
                    take: 1,
                    select: {
                        id: true,
                        location: true,
                        customer: { select: { name: true } },
                    },
                },
                fuelLogs: {
                    orderBy: { date: "desc" },
                    take: 1,
                    select: { liters: true, totalCost: true, date: true },
                },
            },
        }),
        prisma.maintenanceTicket.findMany({
            where: { status: { not: "RESOLVED" }, machineId: { not: null } },
            orderBy: { createdAt: "desc" },
            take: 10,
            include: { machine: { select: { machineId: true, type: true } } },
        }),
        prisma.fuelLog.findMany({
            where: { machineId: { not: null } },
            orderBy: { date: "desc" },
            take: 20,
            include: { machine: { select: { machineId: true } } },
        }),
    ]);
    return { machines, tickets, fuelLogs };
}

const STATUS_BADGE: Record<string, string> = {
    AVAILABLE: "bg-green-900 text-green-300",
    IN_USE: "bg-blue-900 text-blue-300",
    MAINTENANCE: "bg-yellow-900 text-yellow-300",
    RETIRED: "bg-red-900 text-red-300",
};

const MAINTENANCE_BADGE: Record<string, string> = {
    OPEN: "bg-red-900 text-red-300",
    IN_PROGRESS: "bg-yellow-900 text-yellow-300",
    RESOLVED: "bg-green-900 text-green-300",
};

export default async function FleetPage() {
    const { machines, tickets, fuelLogs } = await getFleetData();

    const totalValue = machines.length;
    const available = machines.filter((m) => m.status === "AVAILABLE").length;
    const inUse = machines.filter((m) => m.status === "RENTED").length;
    const maintenance = machines.filter((m) => m.status === "REPAIR").length;

    return (
        <div className="p-6 space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-amber-400">🏗️ Fleet Manager</h1>
                <p className="text-sm text-slate-400 mt-0.5">Asset lifecycle · Maintenance log · Fuel tracking</p>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-4 gap-4">
                {[
                    { label: "Total Fleet", value: totalValue, color: "text-slate-100" },
                    { label: "Available", value: available, color: "text-green-400" },
                    { label: "Deployed", value: inUse, color: "text-blue-400" },
                    { label: "In Maintenance", value: maintenance, color: "text-yellow-400" },
                ].map((s) => (
                    <div key={s.label} className="rounded-xl border border-slate-700 bg-slate-800 p-4">
                        <p className="text-xs text-slate-500">{s.label}</p>
                        <p className={`text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
                    </div>
                ))}
            </div>

            {/* Machine grid */}
            <div>
                <h2 className="font-semibold text-slate-300 text-sm mb-3">Machine Inventory</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {machines.map((m) => {
                        const ticket = m.maintenanceTickets[0];
                        const dispatch = m.dispatches[0];
                        const fuel = m.fuelLogs[0];
                        return (
                            <div
                                key={m.id}
                                className="rounded-2xl border border-slate-700 bg-slate-800/60 p-4 space-y-3"
                            >
                                <div className="flex items-center justify-between">
                                    <span className="font-bold text-amber-400 font-mono">{m.machineId}</span>
                                    <span
                                        className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_BADGE[m.status] ?? "bg-slate-700 text-slate-300"
                                            }`}
                                    >
                                        {m.status}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-300 font-medium">{m.type}</p>

                                {dispatch && (
                                    <div className="text-xs text-blue-300 bg-blue-900/20 rounded-lg px-2 py-1">
                                        🔄 {dispatch.customer?.name} — {dispatch.location}
                                    </div>
                                )}

                                {ticket && (
                                    <div
                                        className={`text-xs rounded-lg px-2 py-1 ${MAINTENANCE_BADGE[ticket.status] ?? ""
                                            }`}
                                    >
                                        🔧 {ticket.issueDescription.slice(0, 60)}…
                                    </div>
                                )}

                                {fuel && (
                                    <div className="text-xs text-slate-500">
                                        Last fuel: {Number(fuel.liters)}L · ₹{Number(fuel.totalCost)} ·{" "}
                                        {new Date(fuel.date).toLocaleDateString("en-IN")}
                                    </div>
                                )}

                                <div className="flex gap-2 pt-1">
                                    <Link
                                        href={`/telemetry/${m.dispatches[0]?.id ?? m.id}`}
                                        className="text-xs bg-slate-700 hover:bg-slate-600 text-slate-300 px-2 py-1 rounded-lg"
                                    >
                                        📡 Track
                                    </Link>
                                    <span className="text-xs text-slate-600">
                                        Rate: ₹{Number(m.operatorDailyPayout)}/day
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                    {machines.length === 0 && (
                        <p className="text-slate-600 text-sm col-span-full text-center py-8">
                            No machines in fleet. Add machines via the admin panel.
                        </p>
                    )}
                </div>
            </div>

            {/* Open tickets */}
            {tickets.length > 0 && (
                <div>
                    <h2 className="font-semibold text-slate-300 text-sm mb-3">Open Maintenance Tickets</h2>
                    <div className="rounded-xl border border-slate-700 overflow-hidden">
                        <table className="w-full text-xs text-slate-300">
                            <thead>
                                <tr className="border-b border-slate-700 bg-slate-800/60 text-slate-500">
                                    <th className="text-left px-4 py-2">Machine</th>
                                    <th className="text-left px-4 py-2">Issue</th>
                                    <th className="text-left px-4 py-2">Status</th>
                                    <th className="text-right px-4 py-2">Cost ₹</th>
                                </tr>
                            </thead>
                            <tbody>
                                {tickets.map((t) => (
                                    <tr key={t.id} className="border-b border-slate-800">
                                        <td className="px-4 py-2 font-mono text-amber-400">
                                            {t.machine?.machineId ?? "—"}
                                        </td>
                                        <td className="px-4 py-2">{t.issueDescription.slice(0, 60)}</td>
                                        <td className="px-4 py-2">
                                            <span
                                                className={`px-2 py-0.5 rounded-full ${MAINTENANCE_BADGE[t.status] ?? ""
                                                    }`}
                                            >
                                                {t.status}
                                            </span>
                                        </td>
                                        <td className="px-4 py-2 text-right tabular-nums">
                                            ₹{(Number(t.partsCost) + Number(t.laborCost)).toFixed(0)}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Recent fuel logs */}
            {fuelLogs.length > 0 && (
                <div>
                    <h2 className="font-semibold text-slate-300 text-sm mb-3">Recent Fuel Logs</h2>
                    <div className="rounded-xl border border-slate-700 overflow-hidden">
                        <table className="w-full text-xs text-slate-300">
                            <thead>
                                <tr className="border-b border-slate-700 bg-slate-800/60 text-slate-500">
                                    <th className="text-left px-4 py-2">Machine</th>
                                    <th className="text-right px-4 py-2">Litres</th>
                                    <th className="text-right px-4 py-2">Cost ₹</th>
                                    <th className="text-left px-4 py-2">Date</th>
                                </tr>
                            </thead>
                            <tbody>
                                {fuelLogs.map((f) => (
                                    <tr key={f.id} className="border-b border-slate-800">
                                        <td className="px-4 py-2 font-mono text-amber-400">
                                            {f.machine?.machineId ?? "—"}
                                        </td>
                                        <td className="px-4 py-2 text-right tabular-nums">{Number(f.liters)}</td>
                                        <td className="px-4 py-2 text-right tabular-nums">₹{Number(f.totalCost)}</td>
                                        <td className="px-4 py-2">{new Date(f.date).toLocaleDateString("en-IN")}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
