"use client";
/**
 * Page 3: Touch-First PWA Field Operator Form
 * Offline-capable: queues entries in localStorage when offline,
 * drains them via syncFieldDiaryBatch / syncFuelLogBatch when back online.
 */

import { useEffect, useState, useRef } from "react";
import { syncFieldDiaryBatch, syncFuelLogBatch } from "@/actions/field-diary-actions";
import type { FieldDiaryEntry, FuelLogEntry } from "@/actions/field-diary-actions";

type ActiveDispatch = {
    id: string;
    location: string;
    dateOfService: string;
    customer: { name: string };
    siteLeader: { id: string; name: string } | null;
};

const QUEUE_KEY = "ironrent_field_queue";
const FUEL_KEY = "ironrent_fuel_queue";

function genId() {
    return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function loadQueue<T>(key: string): T[] {
    try {
        return JSON.parse(localStorage.getItem(key) ?? "[]");
    } catch {
        return [];
    }
}

function saveQueue<T>(key: string, q: T[]) {
    localStorage.setItem(key, JSON.stringify(q));
}

export default function FieldDiaryPage() {
    const [dispatches, setDispatches] = useState<ActiveDispatch[]>([]);
    const [selectedId, setSelectedId] = useState<string>("");
    const [isOnline, setIsOnline] = useState(true);
    const [queueSize, setQueueSize] = useState(0);
    const [syncing, setSyncing] = useState(false);
    const [syncMsg, setSyncMsg] = useState<string | null>(null);
    const formRef = useRef<HTMLFormElement>(null);

    // Fuel form
    const [fuelForm, setFuelForm] = useState({
        liters: "",
        totalCost: "",
        machineId: "",
        date: new Date().toISOString().split("T")[0],
    });

    useEffect(() => {
        fetch("/api/dispatch-board")
            .then((r) => r.json())
            .then((d) => {
                const active = (d.dispatches ?? []).filter(
                    (x: { status: string }) => x.status === "IN_PROGRESS"
                );
                setDispatches(active);
                if (active.length > 0) setSelectedId(active[0].id);
            })
            .catch(() => { });

        const updateOnline = () => setIsOnline(navigator.onLine);
        window.addEventListener("online", updateOnline);
        window.addEventListener("offline", updateOnline);
        updateOnline();

        setQueueSize(
            loadQueue(QUEUE_KEY).length + loadQueue(FUEL_KEY).length
        );
        return () => {
            window.removeEventListener("online", updateOnline);
            window.removeEventListener("offline", updateOnline);
        };
    }, []);

    async function handleDiarySubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const dispatch = dispatches.find((d) => d.id === selectedId);
        if (!dispatch) return;

        const entry: FieldDiaryEntry = {
            clientId: genId(),
            dispatchId: selectedId,
            loggedByLeaderId: dispatch.siteLeader?.id ?? undefined,
            date: new Date().toISOString().split("T")[0],
            notes: fd.get("workNotes") as string,
            internalHelperCount: parseInt(fd.get("helperCount") as string) || 0,
        };

        if (isOnline) {
            const result = await syncFieldDiaryBatch([entry]);
            setSyncMsg(
                result.errors.length > 0
                    ? `Error: ${result.errors[0]}`
                    : `✅ Synced ${result.synced} entry`
            );
        } else {
            const q = loadQueue<FieldDiaryEntry>(QUEUE_KEY);
            q.push(entry);
            saveQueue(QUEUE_KEY, q);
            setQueueSize((n) => n + 1);
            setSyncMsg("📦 Saved offline — will sync when online");
        }

        formRef.current?.reset();
        setTimeout(() => setSyncMsg(null), 3000);
    }

    async function handleFuelSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        const entry: FuelLogEntry = {
            clientId: genId(),
            machineId: fuelForm.machineId || undefined,
            driverId: "session-driver-id", // replace with real session
            liters: parseFloat(fuelForm.liters),
            totalCost: parseFloat(fuelForm.totalCost),
            date: fuelForm.date,
        };

        if (isOnline) {
            const result = await syncFuelLogBatch([entry]);
            setSyncMsg(result.errors.length > 0 ? `Error: ${result.errors[0]}` : "✅ Fuel log saved");
        } else {
            const q = loadQueue<FuelLogEntry>(FUEL_KEY);
            q.push(entry);
            saveQueue(FUEL_KEY, q);
            setQueueSize((n) => n + 1);
            setSyncMsg("📦 Fuel log queued offline");
        }
        setFuelForm({ liters: "", totalCost: "", machineId: "", date: new Date().toISOString().split("T")[0] });
        setTimeout(() => setSyncMsg(null), 3000);
    }

    async function drainQueue() {
        setSyncing(true);
        const diaryQ = loadQueue<FieldDiaryEntry>(QUEUE_KEY);
        const fuelQ = loadQueue<FuelLogEntry>(FUEL_KEY);
        let total = 0;

        if (diaryQ.length > 0) {
            const r = await syncFieldDiaryBatch(diaryQ);
            total += r.synced;
            if (r.synced === diaryQ.length) saveQueue(QUEUE_KEY, []);
        }
        if (fuelQ.length > 0) {
            const r = await syncFuelLogBatch(fuelQ);
            total += r.synced;
            if (r.synced === fuelQ.length) saveQueue(FUEL_KEY, []);
        }

        setQueueSize(loadQueue(QUEUE_KEY).length + loadQueue(FUEL_KEY).length);
        setSyncing(false);
        setSyncMsg(`✅ Drained ${total} queued entries`);
        setTimeout(() => setSyncMsg(null), 3000);
    }

    return (
        <div className="p-6 max-w-2xl mx-auto space-y-8">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-amber-400">📓 Field Diary</h1>
                    <p className="text-sm text-slate-400 mt-0.5">Touch-first · PWA offline logger</p>
                </div>
                <div className="flex items-center gap-3">
                    <span
                        className={`text-xs font-medium px-2 py-1 rounded-full ${isOnline ? "bg-green-900 text-green-300" : "bg-red-900 text-red-300"
                            }`}
                    >
                        {isOnline ? "🟢 Online" : "🔴 Offline"}
                    </span>
                    {queueSize > 0 && (
                        <button
                            onClick={drainQueue}
                            disabled={syncing || !isOnline}
                            className="text-xs bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white px-3 py-1 rounded-full"
                        >
                            {syncing ? "Syncing…" : `Sync Queue (${queueSize})`}
                        </button>
                    )}
                </div>
            </div>

            {syncMsg && (
                <div className="bg-slate-800 border border-slate-600 text-sm text-slate-200 px-4 py-2 rounded-lg">
                    {syncMsg}
                </div>
            )}

            {/* Dispatch selector */}
            <div>
                <label className="block text-xs text-slate-400 mb-1">Active Dispatch</label>
                <select
                    value={selectedId}
                    onChange={(e) => setSelectedId(e.target.value)}
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-100"
                >
                    {dispatches.length === 0 && <option value="">No active dispatches</option>}
                    {dispatches.map((d) => (
                        <option key={d.id} value={d.id}>
                            {d.customer?.name} — {d.location} ({new Date(d.dateOfService).toLocaleDateString("en-IN")})
                        </option>
                    ))}
                </select>
            </div>

            {/* Run-sheet form */}
            <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-5">
                <h2 className="font-semibold text-slate-200 mb-4 text-sm">Run Sheet Entry</h2>
                <form ref={formRef} onSubmit={handleDiarySubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs text-slate-400 mb-1">Work Notes *</label>
                        <textarea
                            name="workNotes"
                            required
                            rows={3}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100 resize-none"
                            placeholder="Describe work done at site…"
                        />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Hours Worked</label>
                            <input
                                name="hoursWorked"
                                type="number"
                                step="0.5"
                                min="0"
                                max="24"
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
                                placeholder="8"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Fuel Used (L)</label>
                            <input
                                name="fuelUsed"
                                type="number"
                                step="0.1"
                                min="0"
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
                                placeholder="0"
                            />
                        </div>
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-amber-600 hover:bg-amber-500 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
                    >
                        💾 Save Run Sheet
                    </button>
                </form>
            </div>

            {/* Fuel log form */}
            <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-5">
                <h2 className="font-semibold text-slate-200 mb-4 text-sm">Diesel / Fuel Log</h2>
                <form onSubmit={handleFuelSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Litres *</label>
                            <input
                                required
                                type="number"
                                step="0.1"
                                value={fuelForm.liters}
                                onChange={(e) => setFuelForm((f) => ({ ...f, liters: e.target.value }))}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
                                placeholder="50"
                            />
                        </div>
                        <div>
                            <label className="block text-xs text-slate-400 mb-1">Total Cost ₹ *</label>
                            <input
                                required
                                type="number"
                                step="0.01"
                                value={fuelForm.totalCost}
                                onChange={(e) => setFuelForm((f) => ({ ...f, totalCost: e.target.value }))}
                                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
                                placeholder="4000"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs text-slate-400 mb-1">Date</label>
                        <input
                            type="date"
                            value={fuelForm.date}
                            onChange={(e) => setFuelForm((f) => ({ ...f, date: e.target.value }))}
                            className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-100"
                        />
                    </div>
                    <button
                        type="submit"
                        className="w-full bg-blue-700 hover:bg-blue-600 text-white font-semibold py-2.5 rounded-xl text-sm transition-colors"
                    >
                        ⛽ Log Fuel
                    </button>
                </form>
            </div>
        </div>
    );
}
