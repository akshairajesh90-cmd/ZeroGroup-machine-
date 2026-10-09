"use client";

import React, { useState, useEffect } from "react";
import {
    X,
    Clock,
    Users,
    Wrench,
    UserCheck,
    AlertTriangle,
    CheckCircle2,
    Plus,
    Trash2,
    Save,
    Loader2,
    ShieldAlert,
} from "lucide-react";

interface StaffFieldDiaryOverrideModalProps {
    isOpen: boolean;
    onClose: () => void;
    dispatch: any;
    onSaved?: () => void;
}

export function StaffFieldDiaryOverrideModal({
    isOpen,
    onClose,
    dispatch,
    onSaved,
}: StaffFieldDiaryOverrideModalProps) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    // Existing diary log if available
    const existingDiary = dispatch?.fieldDiaryLogs?.[0] || null;

    // Form State
    const [siteStatus, setSiteStatus] = useState<string>("IN_PROGRESS");
    const [arrivalTime, setArrivalTime] = useState<string>("");
    const [departureTime, setDepartureTime] = useState<string>("");
    const [internalHelperCount, setInternalHelperCount] = useState<number>(0);
    const [notes, setNotes] = useState<string>("");

    // Attendance state
    const [attendanceList, setAttendanceList] = useState<
        Array<{ employeeId: string; name: string; role: string; isPresent: boolean }>
    >([]);

    // External Labor state
    const [externalLaborList, setExternalLaborList] = useState<
        Array<{ subLeaderName: string; workerCount: number; cashPaid: number; notes: string }>
    >([]);

    // Equipment Verification state (Relational tool verifications)
    const [equipmentList, setEquipmentList] = useState<
        Array<{
            dispatchToolId: string;
            toolName: string;
            quantity: number;
            variant?: string | null;
            isReturned: boolean;
            condition: string;
            notes: string;
        }>
    >([]);

    useEffect(() => {
        if (!dispatch) return;

        const diary = dispatch.fieldDiaryLogs?.[0] || null;

        setSiteStatus(diary?.siteStatus || "IN_PROGRESS");

        // Format ISO or Date strings to HH:mm for time inputs
        const formatTimeForInput = (dateVal: any) => {
            if (!dateVal) return "";
            const d = new Date(dateVal);
            if (isNaN(d.getTime())) return "";
            const hours = String(d.getHours()).padStart(2, "0");
            const minutes = String(d.getMinutes()).padStart(2, "0");
            return `${hours}:${minutes}`;
        };

        setArrivalTime(formatTimeForInput(diary?.arrivalTime));
        setDepartureTime(formatTimeForInput(diary?.departureTime));
        setInternalHelperCount(diary?.internalHelperCount || 0);
        setNotes(diary?.notes || "");

        // Populate assigned crew attendance
        const assignedCrew = dispatch.crewAssignments || dispatch.crew || [];
        const existingAttLogs = diary?.attendanceLogs || [];

        const attMap = new Map<string, boolean>();
        existingAttLogs.forEach((att: any) => attMap.set(att.employeeId, att.isPresent));

        const initialAttendance = assignedCrew.map((c: any) => {
            const empId = c.employeeId || c.id;
            const empName = c.employee?.name || c.name || "Worker";
            const empRole = c.assignedRole || c.role || "CREW";
            const isPresent = attMap.has(empId) ? (attMap.get(empId) ?? true) : true;
            return { employeeId: empId, name: empName, role: empRole, isPresent };
        });
        setAttendanceList(initialAttendance);

        // Populate External Labor Logs
        const existingExt = diary?.externalLabor || [];
        if (existingExt.length > 0) {
            setExternalLaborList(
                existingExt.map((e: any) => ({
                    subLeaderName: e.subLeaderName || "",
                    workerCount: e.workerCount || 0,
                    cashPaid: Number(e.cashPaid) || 0,
                    notes: e.notes || "",
                }))
            );
        } else {
            setExternalLaborList([]);
        }

        // Populate Dispatched Equipment Tool Verifications
        const dispatchedTools = dispatch.dispatchTools || [];
        const existingEqLogs = diary?.equipmentVerifications || [];

        const eqMap = new Map<string, { isReturned: boolean; condition: string; notes: string }>();
        existingEqLogs.forEach((eq: any) => {
            eqMap.set(eq.dispatchToolId, {
                isReturned: eq.isReturned ?? true,
                condition: eq.condition || "OK",
                notes: eq.notes || "",
            });
        });

        const initialEquipment = dispatchedTools.map((dt: any) => {
            const toolName = dt.tool?.name || dt.name || "Tool";
            const verified = eqMap.get(dt.id) || { isReturned: true, condition: "OK", notes: "" };
            return {
                dispatchToolId: dt.id,
                toolName,
                quantity: dt.quantity || 1,
                variant: dt.variant,
                isReturned: verified.isReturned,
                condition: verified.condition,
                notes: verified.notes,
            };
        });
        setEquipmentList(initialEquipment);
    }, [dispatch]);

    if (!isOpen || !dispatch) return null;

    const handleToggleAttendance = (index: number) => {
        setAttendanceList((prev) =>
            prev.map((item, i) => (i === index ? { ...item, isPresent: !item.isPresent } : item))
        );
    };

    const handleAddExternalLabor = () => {
        setExternalLaborList((prev) => [
            ...prev,
            { subLeaderName: "", workerCount: 1, cashPaid: 0, notes: "" },
        ]);
    };

    const handleRemoveExternalLabor = (index: number) => {
        setExternalLaborList((prev) => prev.filter((_, i) => i !== index));
    };

    const handleExternalLaborChange = (index: number, field: string, value: any) => {
        setExternalLaborList((prev) =>
            prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
        );
    };

    const handleEquipmentChange = (index: number, field: string, value: any) => {
        setEquipmentList((prev) =>
            prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
        );
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        setErrorMessage(null);

        try {
            // Build ISO Date/Times for arrival and departure based on dispatch date
            const dispatchDateStr = new Date(dispatch.dateOfService).toISOString().split("T")[0];

            let arrivalIso: string | null = null;
            if (arrivalTime) {
                arrivalIso = new Date(`${dispatchDateStr}T${arrivalTime}:00`).toISOString();
            }

            let departureIso: string | null = null;
            if (departureTime) {
                departureIso = new Date(`${dispatchDateStr}T${departureTime}:00`).toISOString();
            }

            const payload = {
                dispatchId: dispatch.id,
                date: dispatchDateStr,
                siteStatus,
                arrivalTime: arrivalIso,
                departureTime: departureIso,
                internalHelperCount: Number(internalHelperCount) || 0,
                notes,
                attendance: attendanceList.map((a) => ({
                    employeeId: a.employeeId,
                    isPresent: a.isPresent,
                })),
                externalLabor: externalLaborList,
                equipment: equipmentList.map((e) => ({
                    dispatchToolId: e.dispatchToolId,
                    isReturned: e.isReturned,
                    condition: e.condition,
                    notes: e.notes,
                })),
            };

            const res = await fetch("/api/staff/diary/override", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload),
            });

            const data = await res.json();

            if (!res.ok || !data.success) {
                throw new Error(data.error || "Failed to save Field Diary 2 override.");
            }

            if (onSaved) onSaved();
            onClose();
        } catch (err: any) {
            setErrorMessage(err.message || "An unexpected error occurred.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
                {/* Header */}
                <div className="p-6 border-b border-slate-800 flex justify-between items-start bg-slate-950/50">
                    <div>
                        <div className="flex items-center gap-3">
                            <h3 className="text-xl font-black text-white">
                                Staff Override: Field Diary 2
                            </h3>
                            {existingDiary?.isStaffOverridden && (
                                <span className="bg-amber-500/10 text-amber-400 border border-amber-500/20 text-xs font-bold px-2.5 py-1 rounded-full flex items-center gap-1">
                                    <ShieldAlert className="w-3.5 h-3.5" />
                                    Overridden by Staff
                                </span>
                            )}
                        </div>
                        <p className="text-sm text-slate-400 mt-1">
                            Customer: <strong className="text-white">{dispatch.customer?.name}</strong> • Site:{" "}
                            <strong className="text-white">{dispatch.location}</strong>
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form Body */}
                <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                    {errorMessage && (
                        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-red-400 text-sm font-semibold flex items-center gap-2">
                            <AlertTriangle className="w-5 h-5 shrink-0" />
                            {errorMessage}
                        </div>
                    )}

                    {/* Section 1: Timings & Helper Count */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-bold text-blue-400 uppercase tracking-wider flex items-center gap-2">
                            <Clock className="w-4 h-4" /> Site Status & Timings
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1">Site Status</label>
                                <select
                                    value={siteStatus}
                                    onChange={(e) => setSiteStatus(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:border-blue-500 outline-none"
                                >
                                    <option value="IN_PROGRESS">In Progress</option>
                                    <option value="COMPLETED">Completed</option>
                                    <option value="PAUSED">Paused</option>
                                    <option value="CANCELLED">Cancelled</option>
                                </select>
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1">Arrival Time</label>
                                <input
                                    type="time"
                                    value={arrivalTime}
                                    onChange={(e) => setArrivalTime(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:border-blue-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1">Departure Time</label>
                                <input
                                    type="time"
                                    value={departureTime}
                                    onChange={(e) => setDepartureTime(e.target.value)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:border-blue-500 outline-none"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-400 mb-1">Internal Helpers</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={internalHelperCount}
                                    onChange={(e) => setInternalHelperCount(parseInt(e.target.value) || 0)}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-white focus:border-blue-500 outline-none"
                                />
                            </div>
                        </div>

                        <div>
                            <label className="block text-xs font-bold text-slate-400 mb-1">Site Notes</label>
                            <textarea
                                rows={2}
                                value={notes}
                                onChange={(e) => setNotes(e.target.value)}
                                placeholder="Add staff notes or observations..."
                                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:border-blue-500 outline-none resize-none"
                            />
                        </div>
                    </div>

                    {/* Section 2: Internal Crew Attendance */}
                    <div className="space-y-4 border-t border-slate-800 pt-6">
                        <h4 className="text-sm font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-2">
                            <UserCheck className="w-4 h-4" /> Internal Crew Attendance
                        </h4>

                        {attendanceList.length === 0 ? (
                            <p className="text-xs text-slate-500 italic">No internal crew assigned to this dispatch.</p>
                        ) : (
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                                {attendanceList.map((item, idx) => (
                                    <div
                                        key={item.employeeId}
                                        onClick={() => handleToggleAttendance(idx)}
                                        className={`p-3 rounded-2xl border cursor-pointer transition-all flex items-center justify-between ${item.isPresent
                                                ? "bg-emerald-950/30 border-emerald-500/40 text-emerald-300"
                                                : "bg-slate-950 border-slate-800 text-slate-500 hover:border-slate-700"
                                            }`}
                                    >
                                        <div>
                                            <p className="text-sm font-bold">{item.name}</p>
                                            <span className="text-[10px] uppercase font-bold text-slate-400">
                                                {item.role.replace(/_/g, " ")}
                                            </span>
                                        </div>
                                        <div
                                            className={`w-6 h-6 rounded-full flex items-center justify-center border ${item.isPresent
                                                    ? "bg-emerald-500 border-emerald-400 text-slate-950"
                                                    : "border-slate-700 text-transparent"
                                                }`}
                                        >
                                            <CheckCircle2 className="w-4 h-4 stroke-[3]" />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Section 3: External Labor Log */}
                    <div className="space-y-4 border-t border-slate-800 pt-6">
                        <div className="flex justify-between items-center">
                            <h4 className="text-sm font-bold text-purple-400 uppercase tracking-wider flex items-center gap-2">
                                <Users className="w-4 h-4" /> External Labor Log
                            </h4>
                            <button
                                type="button"
                                onClick={handleAddExternalLabor}
                                className="text-xs bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 px-3 py-1.5 rounded-xl font-bold flex items-center gap-1 transition-colors"
                            >
                                <Plus className="w-3.5 h-3.5" /> Add Sub-leader
                            </button>
                        </div>

                        {externalLaborList.length === 0 ? (
                            <p className="text-xs text-slate-500 italic">No external labor recorded for this site.</p>
                        ) : (
                            <div className="space-y-3">
                                {externalLaborList.map((ext, idx) => (
                                    <div
                                        key={idx}
                                        className="p-4 bg-slate-950 border border-slate-800 rounded-2xl grid grid-cols-1 sm:grid-cols-12 gap-3 items-center"
                                    >
                                        <div className="sm:col-span-4">
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase">Sub-leader Name</label>
                                            <input
                                                type="text"
                                                value={ext.subLeaderName}
                                                onChange={(e) => handleExternalLaborChange(idx, "subLeaderName", e.target.value)}
                                                placeholder="e.g. Ramesh"
                                                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-purple-500"
                                            />
                                        </div>
                                        <div className="sm:col-span-2">
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase">Workers</label>
                                            <input
                                                type="number"
                                                min="1"
                                                value={ext.workerCount}
                                                onChange={(e) => handleExternalLaborChange(idx, "workerCount", parseInt(e.target.value) || 0)}
                                                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-purple-500"
                                            />
                                        </div>
                                        <div className="sm:col-span-3">
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase">Cash Paid (₹)</label>
                                            <input
                                                type="number"
                                                min="0"
                                                value={ext.cashPaid}
                                                onChange={(e) => handleExternalLaborChange(idx, "cashPaid", parseFloat(e.target.value) || 0)}
                                                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-purple-500"
                                            />
                                        </div>
                                        <div className="sm:col-span-2">
                                            <label className="block text-[10px] font-bold text-slate-500 uppercase">Notes</label>
                                            <input
                                                type="text"
                                                value={ext.notes}
                                                onChange={(e) => handleExternalLaborChange(idx, "notes", e.target.value)}
                                                placeholder="Optional"
                                                className="w-full bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-white outline-none focus:border-purple-500"
                                            />
                                        </div>
                                        <div className="sm:col-span-1 flex justify-end">
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveExternalLabor(idx)}
                                                className="p-1.5 text-slate-500 hover:text-red-400 rounded-lg hover:bg-slate-900"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Section 4: Relational Equipment / Tool Verification */}
                    <div className="space-y-4 border-t border-slate-800 pt-6">
                        <h4 className="text-sm font-bold text-amber-400 uppercase tracking-wider flex items-center gap-2">
                            <Wrench className="w-4 h-4" /> Relational Tool & Equipment Return Verification
                        </h4>

                        {equipmentList.length === 0 ? (
                            <p className="text-xs text-slate-500 italic">No equipment tools dispatched to this site.</p>
                        ) : (
                            <div className="space-y-3">
                                {equipmentList.map((eq, idx) => (
                                    <div
                                        key={eq.dispatchToolId}
                                        className={`p-4 rounded-2xl border transition-all ${eq.condition === "OK" && eq.isReturned
                                                ? "bg-slate-950 border-slate-800"
                                                : "bg-amber-950/20 border-amber-500/40"
                                            }`}
                                    >
                                        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
                                            <div className="sm:col-span-4">
                                                <span className="text-sm font-bold text-white block">{eq.toolName}</span>
                                                <span className="text-[10px] text-slate-400 font-medium">
                                                    Qty Sent: <strong>{eq.quantity}</strong> {eq.variant ? `(${eq.variant})` : ""}
                                                </span>
                                            </div>

                                            <div className="sm:col-span-3 flex items-center gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => handleEquipmentChange(idx, "isReturned", !eq.isReturned)}
                                                    className={`w-full py-1.5 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border ${eq.isReturned
                                                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                                                            : "bg-red-500/10 text-red-400 border-red-500/30"
                                                        }`}
                                                >
                                                    {eq.isReturned ? (
                                                        <>
                                                            <CheckCircle2 className="w-3.5 h-3.5" /> Returned
                                                        </>
                                                    ) : (
                                                        <>
                                                            <AlertTriangle className="w-3.5 h-3.5" /> Not Returned
                                                        </>
                                                    )}
                                                </button>
                                            </div>

                                            <div className="sm:col-span-2">
                                                <select
                                                    value={eq.condition}
                                                    onChange={(e) => handleEquipmentChange(idx, "condition", e.target.value)}
                                                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:border-amber-500 outline-none"
                                                >
                                                    <option value="OK">OK / Intact</option>
                                                    <option value="DAMAGED">Damaged</option>
                                                    <option value="MISSING">Missing</option>
                                                </select>
                                            </div>

                                            <div className="sm:col-span-3">
                                                <input
                                                    type="text"
                                                    value={eq.notes}
                                                    onChange={(e) => handleEquipmentChange(idx, "notes", e.target.value)}
                                                    placeholder="Condition notes (e.g. handle cracked)"
                                                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 text-xs text-white focus:border-amber-500 outline-none"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </form>

                {/* Footer */}
                <div className="p-4 border-t border-slate-800 bg-slate-950 flex justify-end items-center gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-xl border border-slate-800 text-slate-300 font-bold text-sm hover:bg-slate-900 transition-colors"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={isSubmitting}
                        className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm flex items-center gap-2 transition-colors disabled:opacity-50 shadow-lg shadow-blue-600/20"
                    >
                        {isSubmitting ? (
                            <>
                                <Loader2 className="w-4 h-4 animate-spin" /> Saving Override...
                            </>
                        ) : (
                            <>
                                <Save className="w-4 h-4" /> Save Field Diary 2 Override
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}
