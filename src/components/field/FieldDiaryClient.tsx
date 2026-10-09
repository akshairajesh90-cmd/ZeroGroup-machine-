"use client";

import React, { useState, useEffect } from "react";
import { offlineDb } from "@/lib/offlineDb";
import {
  CheckCircle2,
  XCircle,
  Wifi,
  WifiOff,
  Loader2,
  Wrench,
  User,
  Users
} from "lucide-react";
import { syncFieldDiaries } from "@/lib/syncQueue";
import { submitToolReturn } from "@/actions/toolReturns";

interface CrewMember {
  id: string;
  name: string;
  role: string;
}

interface DispatchTool {
  id: string; // The dispatchTool relation ID
  name: string;
  quantity: number;
}

interface ToolState {
  status: "OK" | "DAMAGED" | "MISSING" | "LEFT_ON_SITE" | "PENDING";
  note: string;
}

interface FieldDiaryClientProps {
  dispatchId: string;
  date: string; // ISO date
  crew: CrewMember[];
  tools: DispatchTool[];
}

export default function FieldDiaryClient({ dispatchId, date, crew, tools }: FieldDiaryClientProps) {
  const [isOnline, setIsOnline] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [localDiaryId, setLocalDiaryId] = useState<string>("");

  // UI State
  const [siteStatus, setSiteStatus] = useState<string>("PENDING");
  const [attendance, setAttendance] = useState<Record<string, boolean>>({});
  const [equipment, setEquipment] = useState<Record<string, ToolState>>({});

  // External Labor State
  const [subLeaderName, setSubLeaderName] = useState("");
  const [workerCount, setWorkerCount] = useState<number | "">("");
  const [cashPaid, setCashPaid] = useState<number | "">("");

  // Initialize Dexie State & Network Listeners
  useEffect(() => {
    // Generate a unique local ID for this diary entry once on mount
    const newLocalId = `diary_${dispatchId}_${Date.now()}`;
    setLocalDiaryId(newLocalId);

    // Initial default state
    const defaultAtt: Record<string, boolean> = {};
    crew.forEach(c => { defaultAtt[c.id] = true; }); // Default present
    setAttendance(defaultAtt);

    const defaultEq: Record<string, ToolState> = {};
    tools.forEach(t => { defaultEq[t.id] = { status: "PENDING", note: "" }; });
    setEquipment(defaultEq);

    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);

      const handleOnline = async () => {
        setIsOnline(true);
        // We already have listeners in syncQueue.ts, but we can trigger it manually here too
        await syncFieldDiaries();
      };
      const handleOffline = () => setIsOnline(false);

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);

      // Capacitor Network hook logic (if running in Capacitor context)
      import("@capacitor/network").then(({ Network }) => {
        Network.addListener('networkStatusChange', status => {
          setIsOnline(status.connected);
        });
      }).catch(() => { });

      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, [dispatchId, crew, tools]);

  const handleSaveToIndexedDB = async () => {
    setIsSaving(true);
    try {
      // 1. Save Diary Log
      const diaryId = await offlineDb.diaryLogs.add({
        localId: localDiaryId,
        dispatchId,
        date,
        siteStatus,
        internalHelperCount: 0,
      });

      // 2. Save Attendance
      const attendanceRecords = Object.entries(attendance).map(([employeeId, isPresent]) => ({
        localDiaryId,
        employeeId,
        isPresent
      }));
      if (attendanceRecords.length > 0) {
        await offlineDb.attendance.bulkAdd(attendanceRecords);
      }

      // 3. Save Equipment (legacy boolean structure mapping for offline queue backward compatibility if needed, using custom object if extending schema later)
      const equipmentRecords = Object.entries(equipment).map(([dispatchToolId, state]) => ({
        localDiaryId,
        dispatchToolId,
        isVerified: state.status === "OK" || state.status === "DAMAGED",
        condition: state.status,
        notes: state.note
      }));
      if (equipmentRecords.length > 0) {
        await offlineDb.equipmentVerifications.bulkAdd(equipmentRecords as any); // Ignoring type limit if schema differs initially
      }

      // Direct module 4 tool return server action invocation if online
      if (isOnline) {
        for (const [dtId, state] of Object.entries(equipment)) {
          if (state.status !== "PENDING") {
            await submitToolReturn(dtId, state.status, state.note);
          }
        }
      }

      // 4. Save External Labor (if filled)
      if (subLeaderName && workerCount !== "") {
        await offlineDb.externalLabor.add({
          localDiaryId,
          subLeaderName,
          workerCount: Number(workerCount),
          cashPaid: Number(cashPaid || 0),
        });
      }

      alert("Saved! Diary recorded and tools verified.");

      if (isOnline) {
        await syncFieldDiaries();
      }

    } catch (error) {
      console.error("Save Error:", error);
      alert("Failed to save.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="max-w-md mx-auto space-y-6 pb-24">
      {/* OFFLINE BADGE */}
      <div className={`sticky top-0 z-50 flex items-center justify-center gap-2 p-3 text-sm font-black text-white uppercase tracking-wider ${isOnline ? "bg-emerald-600" : "bg-red-600 animate-pulse"
        }`}>
        {isOnline ? <Wifi className="w-5 h-5" /> : <WifiOff className="w-5 h-5" />}
        {isOnline ? "System Online - Auto Syncing" : "Offline Mode - Saved Locally"}
      </div>

      {/* 1. SITE STATUS */}
      <div className="px-4">
        <h2 className="text-sm font-bold text-slate-400 mb-3 uppercase tracking-wider">1. Site Status</h2>
        <div className="grid grid-cols-2 gap-3">
          {["PENDING", "EN_ROUTE", "IN_PROGRESS", "COMPLETED"].map(status => (
            <button
              key={status}
              onClick={() => setSiteStatus(status)}
              className={`p-6 rounded-2xl border-2 transition-all font-black text-xs md:text-sm shadow-xl flex items-center justify-center ${siteStatus === status
                ? "bg-blue-600 border-blue-400 text-white shadow-blue-500/20"
                : "bg-slate-900 border-slate-800 text-slate-500"
                }`}
            >
              {status.replace("_", " ")}
            </button>
          ))}
        </div>
      </div>

      {/* 2. CREW ATTENDANCE */}
      {crew.length > 0 && (
        <div className="px-4">
          <h2 className="text-sm font-bold text-slate-400 mb-3 uppercase tracking-wider">2. Crew Attendance</h2>
          <div className="space-y-3">
            {crew.map(member => (
              <div
                key={member.id}
                onClick={() => setAttendance(prev => ({ ...prev, [member.id]: !prev[member.id] }))}
                className={`p-5 rounded-3xl border-2 cursor-pointer transition-all flex items-center justify-between shadow-xl ${attendance[member.id]
                  ? "bg-emerald-950/40 border-emerald-500/60"
                  : "bg-red-950/40 border-red-500/60"
                  }`}
              >
                <div className="flex items-center gap-4">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shrink-0 ${attendance[member.id] ? "bg-emerald-600 text-white" : "bg-red-600 text-white"
                    }`}>
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">{member.name}</h3>
                    <p className="text-xs text-slate-400 font-bold">{member.role}</p>
                  </div>
                </div>
                {attendance[member.id] ? (
                  <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                ) : (
                  <XCircle className="w-8 h-8 text-red-500" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. EQUIPMENT VERIFICATION */}
      {tools.length > 0 && (
        <div className="px-4">
          <h2 className="text-sm font-bold text-slate-400 mb-3 uppercase tracking-wider">3. Equipment Verification</h2>
          <div className="space-y-4">
            {tools.map((tool) => {
              const state = equipment[tool.id] || { status: "PENDING", note: "" };
              const isVerified = state.status !== "PENDING";
              return (
                <div key={tool.id} className="p-5 rounded-3xl border-2 transition-all bg-slate-900 border-slate-800 shadow-xl space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${isVerified ? "bg-blue-600 text-white" : "bg-slate-800 text-slate-400"}`}>
                        <Wrench className="w-6 h-6" />
                      </div>
                      <div>
                        <h3 className="text-base font-black text-white">{tool.name}</h3>
                        <p className="text-xs text-slate-400 font-bold">Qty: {tool.quantity}</p>
                      </div>
                    </div>
                    <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${isVerified ? "bg-blue-500 border-blue-400 text-white" : "border-slate-700"}`}>
                      {isVerified && <CheckCircle2 className="w-5 h-5" />}
                    </div>
                  </div>

                  {/* Status Selection */}
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                    {(["OK", "DAMAGED", "MISSING", "LEFT_ON_SITE"] as const).map(s => (
                      <button
                        key={s}
                        onClick={() => setEquipment(prev => ({ ...prev, [tool.id]: { ...prev[tool.id], status: s } }))}
                        className={`py-2 px-1 text-xs font-bold rounded-xl border-2 transition-all ${state.status === s
                            ? s === 'OK' ? 'bg-emerald-600 border-emerald-500 text-white'
                              : s === 'DAMAGED' ? 'bg-orange-600 border-orange-500 text-white'
                                : s === 'MISSING' ? 'bg-red-600 border-red-500 text-white'
                                  : 'bg-blue-600 border-blue-500 text-white'
                            : 'bg-slate-800 border-slate-700 text-slate-400 hover:bg-slate-700'
                          }`}
                      >
                        {s.replace("_", " ")}
                      </button>
                    ))}
                  </div>

                  {/* Note Input */}
                  <input
                    type="text"
                    placeholder="Optional notes (required if damaged/missing/left)"
                    value={state.note}
                    onChange={(e) => setEquipment(prev => ({ ...prev, [tool.id]: { ...prev[tool.id], note: e.target.value } }))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-sm text-white focus:border-blue-500 outline-none placeholder:text-slate-600"
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 4. EXTERNAL LABOR FORM */}
      <div className="px-4">
        <h2 className="text-sm font-bold text-slate-400 mb-3 uppercase tracking-wider">4. Outside Labor</h2>
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-xl space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-400 block mb-1">Sub-Leader Name</label>
            <input
              type="text"
              value={subLeaderName}
              onChange={e => setSubLeaderName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-2xl p-4 text-white font-bold outline-none focus:border-blue-500 transition-colors"
              placeholder="Enter name (Optional)"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1">Worker Count</label>
              <div className="relative">
                <Users className="w-5 h-5 text-slate-500 absolute left-4 top-1/2 -translate-y-1/2" />
                <input
                  type="number"
                  value={workerCount}
                  onChange={e => setWorkerCount(e.target.value ? Number(e.target.value) : "")}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 pl-12 pr-4 text-white font-bold outline-none focus:border-blue-500 transition-colors"
                  placeholder="0"
                />
              </div>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-400 block mb-1">Cash Paid (₹)</label>
              <div className="relative">
                <span className="text-slate-500 font-black absolute left-5 top-1/2 -translate-y-1/2">₹</span>
                <input
                  type="number"
                  value={cashPaid}
                  onChange={e => setCashPaid(e.target.value ? Number(e.target.value) : "")}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl py-4 pl-10 pr-4 text-white font-bold outline-none focus:border-blue-500 transition-colors"
                  placeholder="0.00"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SAVE BUTTON */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-slate-950/80 backdrop-blur-md border-t border-slate-800">
        <button
          disabled={isSaving}
          onClick={handleSaveToIndexedDB}
          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-5 rounded-3xl text-lg shadow-xl shadow-emerald-500/20 transition-all flex items-center justify-center gap-3"
        >
          {isSaving ? <Loader2 className="w-6 h-6 animate-spin" /> : <CheckCircle2 className="w-6 h-6" />}
          {isSaving ? "Saving..." : "SUBMIT DIARY"}
        </button>
      </div>
    </div>
  );
}
