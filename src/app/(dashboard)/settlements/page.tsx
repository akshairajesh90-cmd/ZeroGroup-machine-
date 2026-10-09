"use client";
/**
 * Page 4: Owner Financial Settlement & Ledger Engine
 * Double-entry ledger view: debits the Owner, credits each worker directly.
 * NO Mesthiri deduction — wages go straight to Drivers / Operators.
 */

import { useEffect, useState, useTransition } from "react";
import {
    calculateWeeklySettlement,
    commitSettlement,
    markSettlementPaid,
    getSettlements,
} from "@/actions/settlement-actions";

type WageLine = {
    employeeId: string;
    employeeName: string;
    role: string;
    hoursWorked: number;
    hourlyRate: number;
    gross: number;
};

type SettlementRecord = {
    id: string;
    weekEnding: string;
    finalPayout: string;
    amountPaid: string;
    status: string;
    employee: { name: string; role: string } | null;
};

export default function SettlementsPage() {
    const [weekDate, setWeekDate] = useState(new Date().toISOString().split("T")[0]);
    const [preview, setPreview] = useState<WageLine[]>([]);
    const [total, setTotal] = useState(0);
    const [records, setRecords] = useState<SettlementRecord[]>([]);
    const [isPending, startTransition] = useTransition();
    const [msg, setMsg] = useState<string | null>(null);

    useEffect(() => {
        (async () => {
            const data = await getSettlements();
            setRecords(data.map((s) => ({
                ...s,
                weekEnding: s.weekEnding instanceof Date ? s.weekEnding.toISOString().split("T")[0] : String(s.weekEnding),
                finalPayout: String(s.finalPayout),
                amountPaid: String(s.amountPaid),
            })));
        })();
    }, []);

    function showMsg(m: string) {
        setMsg(m);
        setTimeout(() => setMsg(null), 4000);
    }

    async function handlePreview() {
        const summary = await calculateWeeklySettlement(weekDate);
        setPreview(summary.lines);
        setTotal(summary.totalPayable);
    }

    async function handleCommit() {
        if (preview.length === 0) return;
        startTransition(async () => {
            const result = await commitSettlement(weekDate, preview);
            if (result.ok) {
                showMsg(`✅ ${result.count} settlement records created`);
                setPreview([]);
                setTotal(0);
                const data = await getSettlements();
                setRecords(data.map((s) => ({
                    ...s,
                    weekEnding: s.weekEnding instanceof Date ? s.weekEnding.toISOString().split("T")[0] : String(s.weekEnding),
                    finalPayout: String(s.finalPayout),
                    amountPaid: String(s.amountPaid),
                })));
            } else {
                showMsg(`❌ ${result.error}`);
            }
        });
    }

    async function handleMarkPaid(id: string, amount: string) {
        const result = await markSettlementPaid(id, parseFloat(amount));
        if (result.ok) {
            setRecords((prev) =>
                prev.map((r) => (r.id === id ? { ...r, status: "PAID", amountPaid: amount } : r))
            );
            showMsg("✅ Marked as paid");
        } else {
            showMsg(`❌ ${result.error}`);
        }
    }

    const STATUS_COLOR: Record<string, string> = {
        PENDING: "text-yellow-400",
        PAID: "text-green-400",
        CANCELLED: "text-red-400",
    };

    return (
        <div className="p-6 space-y-8">
            <div>
                <h1 className="text-2xl font-bold text-amber-400">💰 Settlements Ledger</h1>
                <p className="text-sm text-slate-400 mt-0.5">
                    Direct worker wages · No mesthiri hierarchy · Double-entry
                </p>
            </div>

            {msg && (
                <div className="bg-slate-800 border border-slate-600 text-sm text-slate-200 px-4 py-2 rounded-lg">
                    {msg}
                </div>
            )}

            {/* Calculator */}
            <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-5 space-y-4">
                <h2 className="font-semibold text-slate-200 text-sm">Weekly Wage Calculator</h2>
                <div className="flex gap-3 items-end">
                    <div className="flex-1">
                        <label className="block text-xs text-slate-400 mb-1">Week Ending Date</label>
                        <input
                            type="date"
                            value={weekDate}
                            onChange={(e) => setWeekDate(e.target.value)}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
                        />
                    </div>
                    <button
                        onClick={handlePreview}
                        className="bg-indigo-700 hover:bg-indigo-600 text-white px-5 py-2 rounded-xl text-sm font-semibold"
                    >
                        Preview
                    </button>
                </div>

                {preview.length > 0 && (
                    <>
                        <div className="overflow-x-auto rounded-xl">
                            <table className="w-full text-xs text-slate-300">
                                <thead>
                                    <tr className="border-b border-slate-700 text-slate-500">
                                        <th className="text-left py-2 pr-3">Employee</th>
                                        <th className="text-left py-2 pr-3">Role</th>
                                        <th className="text-right py-2 pr-3">Hours</th>
                                        <th className="text-right py-2 pr-3">Rate/hr</th>
                                        <th className="text-right py-2">Gross ₹</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {preview.map((l) => (
                                        <tr key={l.employeeId} className="border-b border-slate-800">
                                            <td className="py-1.5 pr-3 font-medium">{l.employeeName}</td>
                                            <td className="py-1.5 pr-3 text-slate-400">{l.role}</td>
                                            <td className="py-1.5 pr-3 text-right tabular-nums">{l.hoursWorked.toFixed(1)}</td>
                                            <td className="py-1.5 pr-3 text-right tabular-nums">₹{l.hourlyRate}</td>
                                            <td className="py-1.5 text-right font-bold text-amber-400 tabular-nums">
                                                ₹{l.gross.toFixed(2)}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr>
                                        <td colSpan={4} className="pt-3 text-right font-semibold text-slate-300">
                                            Total Payable (Owner Debit)
                                        </td>
                                        <td className="pt-3 text-right font-bold text-2xl text-amber-400 tabular-nums">
                                            ₹{total.toFixed(2)}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                        <button
                            onClick={handleCommit}
                            disabled={isPending}
                            className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-semibold py-2.5 rounded-xl text-sm"
                        >
                            {isPending ? "Committing…" : "Commit Settlements to Ledger"}
                        </button>
                    </>
                )}
            </div>

            {/* Settlement records */}
            <div>
                <h2 className="font-semibold text-slate-300 text-sm mb-3">Settlement Records</h2>
                <div className="overflow-x-auto rounded-xl border border-slate-700">
                    <table className="w-full text-xs text-slate-300">
                        <thead>
                            <tr className="border-b border-slate-700 bg-slate-800/60 text-slate-500">
                                <th className="text-left px-4 py-2">Employee</th>
                                <th className="text-left px-4 py-2">Role</th>
                                <th className="text-left px-4 py-2">Week Ending</th>
                                <th className="text-right px-4 py-2">Payout ₹</th>
                                <th className="text-left px-4 py-2">Status</th>
                                <th className="px-4 py-2"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {records.map((r) => (
                                <tr key={r.id} className="border-b border-slate-800 hover:bg-slate-800/30">
                                    <td className="px-4 py-2 font-medium">{r.employee?.name ?? "—"}</td>
                                    <td className="px-4 py-2 text-slate-400">{r.employee?.role ?? "—"}</td>
                                    <td className="px-4 py-2">{r.weekEnding}</td>
                                    <td className="px-4 py-2 text-right tabular-nums font-semibold text-amber-400">
                                        ₹{parseFloat(r.finalPayout).toFixed(2)}
                                    </td>
                                    <td className={`px-4 py-2 font-semibold ${STATUS_COLOR[r.status] ?? ""}`}>
                                        {r.status}
                                    </td>
                                    <td className="px-4 py-2 text-right">
                                        {r.status === "PENDING" && (
                                            <button
                                                onClick={() => handleMarkPaid(r.id, r.finalPayout)}
                                                className="text-xs bg-green-800 hover:bg-green-700 text-green-200 px-2 py-0.5 rounded"
                                            >
                                                Mark Paid
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))}
                            {records.length === 0 && (
                                <tr>
                                    <td colSpan={6} className="px-4 py-6 text-center text-slate-600">
                                        No settlements yet — run the calculator above.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
