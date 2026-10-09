import { prisma } from "@/lib/prisma";
import Link from "next/link";

async function getCustomerPortalData() {
    const customers = await prisma.customer.findMany({
        where: { isPendingDelete: false },
        orderBy: { name: "asc" },
        include: {
            dispatches: {
                where: { isPendingDelete: false },
                orderBy: { dateOfService: "desc" },
                take: 5,
                select: {
                    id: true,
                    location: true,
                    dateOfService: true,
                    status: true,
                    workType: true,
                    machine: { select: { machineId: true, type: true } },
                    operator: { select: { name: true } },
                },
            },
            invoices: {
                orderBy: { issuedDate: "desc" },
                take: 3,
                select: {
                    id: true,
                    invoiceNumber: true,
                    totalAmount: true,
                    status: true,
                    issuedDate: true,
                    dueDate: true,
                },
            },
            _count: {
                select: {
                    dispatches: true,
                    invoices: true,
                },
            },
        },
    });
    return customers;
}

const DISPATCH_STATUS_COLOR: Record<string, string> = {
    PENDING: "text-yellow-400",
    IN_PROGRESS: "text-blue-400",
    COMPLETED: "text-green-400",
    CANCELLED: "text-red-400",
};

const INVOICE_STATUS_COLOR: Record<string, string> = {
    DRAFT: "text-slate-400",
    SENT: "text-blue-400",
    PARTIAL: "text-yellow-400",
    PAID: "text-green-400",
    UNPAID: "text-red-400",
    CANCELLED: "text-red-600",
};

export default async function CustomerPortalPage() {
    const customers = await getCustomerPortalData();

    const totalDispatches = customers.reduce((s, c) => s + c._count.dispatches, 0);
    const totalInvoices = customers.reduce((s, c) => s + c._count.invoices, 0);
    const activeCustomers = customers.filter(
        (c) => c.dispatches.some((d) => d.status === "IN_PROGRESS")
    ).length;

    return (
        <div className="p-6 space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-amber-400">🏢 Customer Portal</h1>
                <p className="text-sm text-slate-400 mt-0.5">Site manager view · Jobs & invoices by customer</p>
            </div>

            {/* Aggregated stats */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: "Total Customers", value: customers.length },
                    { label: "Active Sites", value: activeCustomers },
                    { label: "Total Dispatches", value: totalDispatches },
                ].map((s) => (
                    <div key={s.label} className="rounded-xl border border-slate-700 bg-slate-800 p-4">
                        <p className="text-xs text-slate-500">{s.label}</p>
                        <p className="text-3xl font-bold text-amber-400 mt-1">{s.value}</p>
                    </div>
                ))}
            </div>

            {/* Customer cards */}
            <div className="space-y-6">
                {customers.map((customer) => {
                    const activeDispatch = customer.dispatches.find((d) => d.status === "IN_PROGRESS");
                    const unpaidInvoices = customer.invoices.filter(
                        (i) => i.status === "UNPAID" || i.status === "SENT" || i.status === "PARTIAL"
                    );
                    const totalOutstanding = customer.invoices
                        .filter((i) => i.status !== "PAID" && i.status !== "CANCELLED")
                        .reduce((sum, i) => sum + Number(i.totalAmount), 0);

                    return (
                        <div
                            key={customer.id}
                            className="rounded-2xl border border-slate-700 bg-slate-800/60 overflow-hidden"
                        >
                            {/* Customer header */}
                            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700 bg-slate-800">
                                <div>
                                    <h3 className="font-bold text-slate-100 text-base">{customer.name}</h3>
                                    <p className="text-xs text-slate-400 mt-0.5">{customer.address}</p>
                                    <p className="text-xs text-slate-500">{customer.phone}</p>
                                </div>
                                <div className="text-right">
                                    {activeDispatch && (
                                        <span className="text-xs bg-blue-900 text-blue-200 px-2 py-1 rounded-full mr-2">
                                            🔄 Active Job
                                        </span>
                                    )}
                                    {totalOutstanding > 0 && (
                                        <span className="text-xs bg-yellow-900 text-yellow-200 px-2 py-1 rounded-full">
                                            ₹{totalOutstanding.toLocaleString("en-IN")} outstanding
                                        </span>
                                    )}
                                    <p className="text-xs text-slate-500 mt-2">
                                        {customer._count.dispatches} dispatches · {customer._count.invoices} invoices
                                    </p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-0 divide-x divide-slate-700">
                                {/* Recent dispatches */}
                                <div className="p-4">
                                    <h4 className="text-xs font-semibold text-slate-400 mb-2">Recent Jobs</h4>
                                    <div className="space-y-2">
                                        {customer.dispatches.slice(0, 3).map((d) => (
                                            <div key={d.id} className="flex items-center justify-between">
                                                <div className="min-w-0">
                                                    <p className="text-xs text-slate-300 truncate">{d.location}</p>
                                                    <p className="text-[10px] text-slate-500">
                                                        {d.machine?.machineId ?? "—"} · {new Date(d.dateOfService).toLocaleDateString("en-IN")}
                                                    </p>
                                                </div>
                                                <span
                                                    className={`text-[10px] font-semibold ml-2 flex-shrink-0 ${DISPATCH_STATUS_COLOR[d.status] ?? ""
                                                        }`}
                                                >
                                                    {d.status}
                                                </span>
                                            </div>
                                        ))}
                                        {customer.dispatches.length === 0 && (
                                            <p className="text-[10px] text-slate-600">No dispatches</p>
                                        )}
                                    </div>
                                </div>

                                {/* Invoices */}
                                <div className="p-4">
                                    <h4 className="text-xs font-semibold text-slate-400 mb-2">Invoices</h4>
                                    <div className="space-y-2">
                                        {customer.invoices.map((inv) => (
                                            <div key={inv.id} className="flex items-center justify-between">
                                                <div className="min-w-0">
                                                    <p className="text-xs text-slate-300 font-mono truncate">
                                                        #{inv.invoiceNumber}
                                                    </p>
                                                    <p className="text-[10px] text-slate-500">
                                                        Due: {new Date(inv.dueDate).toLocaleDateString("en-IN")}
                                                    </p>
                                                </div>
                                                <div className="text-right ml-2 flex-shrink-0">
                                                    <p className="text-xs font-bold text-amber-400">
                                                        ₹{Number(inv.totalAmount).toLocaleString("en-IN")}
                                                    </p>
                                                    <p
                                                        className={`text-[10px] font-semibold ${INVOICE_STATUS_COLOR[inv.status] ?? ""
                                                            }`}
                                                    >
                                                        {inv.status}
                                                    </p>
                                                </div>
                                            </div>
                                        ))}
                                        {customer.invoices.length === 0 && (
                                            <p className="text-[10px] text-slate-600">No invoices</p>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Active dispatch telemetry link */}
                            {activeDispatch && (
                                <div className="border-t border-slate-700 px-5 py-2 bg-blue-900/10">
                                    <Link
                                        href={`/telemetry/${activeDispatch.id}`}
                                        className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                                    >
                                        📡 Track active job — {activeDispatch.location} →
                                    </Link>
                                </div>
                            )}
                        </div>
                    );
                })}
                {customers.length === 0 && (
                    <div className="text-center py-16 text-slate-600">
                        No customers yet. Add customers via the admin panel.
                    </div>
                )}
            </div>
        </div>
    );
}
