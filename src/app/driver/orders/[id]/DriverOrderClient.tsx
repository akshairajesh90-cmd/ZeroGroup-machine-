"use client";

import React, { useState, useEffect, useTransition } from "react";
import { updateDispatchStatus, reportDriverIncident } from "@/actions/dispatch";
import { updateDispatchMapLinkAction } from "../../actions";
import { queueOfflineAction, getPendingOfflineActions, syncOfflineQueue } from "@/lib/offlineQueue";
import { 
  Truck, 
  CheckCircle2, 
  AlertTriangle, 
  Wifi, 
  WifiOff, 
  Clock, 
  ShieldAlert, 
  MapPin, 
  User, 
  Wrench, 
  Loader2, 
  ChevronLeft,
  Calendar
} from "lucide-react";
import Link from "next/link";

interface DriverOrderClientProps {
  dispatch: any;
  userRole: string;
  groupAggregate?: {
    operators: { id: string; name: string }[];
    tools: { id: string; name: string; variant?: string; quantity: number }[];
  };
}

export default function DriverOrderClient({ dispatch: initialDispatch, userRole, groupAggregate }: DriverOrderClientProps) {
  const [dispatch, setDispatch] = useState(initialDispatch);
  const [isPending, startTransition] = useTransition();
  const [isOnline, setIsOnline] = useState(true);
  const [queuedItemsCount, setQueuedItemsCount] = useState(0);

  // Phase 1 (Drop-Off) verification states
  const [arrivedOperatorIds, setArrivedOperatorIds] = useState<string[]>(dispatch.arrivedOperatorIds || []);
  const [deliveredToolIds, setDeliveredToolIds] = useState<string[]>(dispatch.deliveredToolIds || []);
  
  // Phase 2 (Pick-Up) verification states
  const [returnedToolIds, setReturnedToolIds] = useState<string[]>(dispatch.returnedToolIds || []);

  // Standard checks (for single machine)
  const [checks, setChecks] = useState({
    oilCoolant: false,
    tireBrakes: false,
    auxTools: false,
    customerVerbal: false,
  });

  // Incident Modal
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const [conflictReport, setConflictReport] = useState("");
  const [msg, setMsg] = useState<{ type: "error" | "success" | "warning"; text: string } | null>(null);

  // Monitor online status and check queue
  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsOnline(navigator.onLine);

      const checkQueue = async () => {
        const items = await getPendingOfflineActions();
        setQueuedItemsCount(items.length);
      };
      checkQueue();

      const handleOnline = async () => {
        setIsOnline(true);
        // Attempt automatic sync of offline actions
        const syncRes = await syncOfflineQueue({
          UPDATE_DISPATCH_STATUS: async (payload) => await updateDispatchStatus(payload),
          REPORT_INCIDENT: async (payload) => await reportDriverIncident(payload),
        });
        if (syncRes.syncedCount > 0) {
          setMsg({ type: "success", text: `✅ Synced ${syncRes.syncedCount} queued field actions to server!` });
        }
        checkQueue();
      };

      const handleOffline = () => {
        setIsOnline(false);
      };

      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
      return () => {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
      };
    }
  }, []);

  const allChecked = checks.oilCoolant && checks.tireBrakes && checks.auxTools && checks.customerVerbal;

  // For Phase 1 (DELIVERED), we optionally require operators/tools to be confirmed (if any exist)
  // Actually, they don't HAVE to all be checked (what if someone is missing?), but they must explicitly submit the array of who IS there.
  // The original prompt said: "The driver MUST check what is physically present. Save these to arrivedOperatorIds."
  // So allChecked just gates the generic checks. 

  const handleTransitionStatus = (newStatus: string) => {
    setMsg(null);
    startTransition(async () => {
      const payload: any = { 
        dispatchId: dispatch.id, 
        status: newStatus 
      };

      if (newStatus === "DELIVERED") {
        payload.arrivedOperatorIds = arrivedOperatorIds;
        payload.deliveredToolIds = deliveredToolIds;
      } else if (newStatus === "COMPLETED") {
        payload.returnedToolIds = returnedToolIds;
      }

      if (isOnline) {
        const res = await updateDispatchStatus(payload);
        if (res.success) {
          setDispatch({ 
            ...dispatch, 
            status: newStatus,
            arrivedOperatorIds: newStatus === "DELIVERED" ? arrivedOperatorIds : dispatch.arrivedOperatorIds,
            deliveredToolIds: newStatus === "DELIVERED" ? deliveredToolIds : dispatch.deliveredToolIds,
            returnedToolIds: newStatus === "COMPLETED" ? returnedToolIds : dispatch.returnedToolIds,
          });
          setMsg({ type: "success", text: `Status updated to ${newStatus}!` });
        } else {
          await queueOfflineAction("UPDATE_DISPATCH_STATUS", payload);
          setDispatch({ ...dispatch, status: newStatus });
          setQueuedItemsCount(c => c + 1);
          setMsg({ type: "warning", text: `Offline/Timeout: Status ${newStatus} queued locally.` });
        }
      } else {
        await queueOfflineAction("UPDATE_DISPATCH_STATUS", payload);
        setDispatch({ ...dispatch, status: newStatus });
        setQueuedItemsCount(c => c + 1);
        setMsg({ type: "warning", text: `Offline: Status ${newStatus} queued locally.` });
      }
    });
  };

  const handleStartJourney = () => {
    setMsg(null);
    if (!navigator.geolocation) {
      handleTransitionStatus("EN_ROUTE");
      return;
    }
    
    // Will show loading state on the button
    startTransition(() => {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          const gmapLink = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
          try {
            await updateDispatchMapLinkAction(dispatch.id, gmapLink, latitude, longitude);
          } catch (e) {
            // ignore error
          }
          handleTransitionStatus("EN_ROUTE");
        },
        (error) => {
          // Graceful fallback to null,null if permission denied or unavailable
          handleTransitionStatus("EN_ROUTE");
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  };

  const handleReportIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!conflictReport.trim()) return;

    startTransition(async () => {
      const payload = { dispatchId: dispatch.id, conflictReport };
      if (isOnline) {
        const res = await reportDriverIncident(payload);
        if (res.success) {
          setDispatch({ ...dispatch, isFlagged: true, conflictReport });
          setMsg({ type: "success", text: "Incident reported directly to Admin Critical Alert Row." });
          setShowIncidentModal(false);
        } else {
          await queueOfflineAction("REPORT_INCIDENT", payload);
          setDispatch({ ...dispatch, isFlagged: true, conflictReport });
          setQueuedItemsCount(c => c + 1);
          setMsg({ type: "warning", text: "Queued incident report locally in IndexedDB." });
          setShowIncidentModal(false);
        }
      } else {
        await queueOfflineAction("REPORT_INCIDENT", payload);
        setDispatch({ ...dispatch, isFlagged: true, conflictReport });
        setQueuedItemsCount(c => c + 1);
        setMsg({ type: "warning", text: "Offline: Queued incident report locally. Will alert Admin when signal returns." });
        setShowIncidentModal(false);
      }
    });
  };

  return (
    <div className="space-y-5">
      {/* Top Navigation & Offline Badge */}
      <div className="flex items-center justify-between">
        <Link
          href="/driver/home"
          className="flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Shifts
        </Link>

        <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border ${
          isOnline && queuedItemsCount === 0
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
            : "bg-amber-500/10 border-amber-500/30 text-amber-400 animate-pulse"
        }`}>
          {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5 text-red-400" />}
          <span>{isOnline ? "Online" : "Offline Mode"}</span>
          {queuedItemsCount > 0 && (
            <span className="bg-amber-500 text-slate-950 px-1.5 py-0.2 rounded-full text-[10px]">
              {queuedItemsCount} Queued
            </span>
          )}
        </div>
      </div>

      {msg && (
        <div className={`p-4 rounded-2xl text-xs font-bold border flex items-center justify-between ${
          msg.type === "success" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400" :
          msg.type === "warning" ? "bg-amber-500/10 border-amber-500/30 text-amber-400" :
          "bg-red-500/10 border-red-500/30 text-red-400"
        }`}>
          <span>{msg.text}</span>
          <button onClick={() => setMsg(null)} className="text-slate-400 hover:text-white px-1">✕</button>
        </div>
      )}

      {/* Main Order Card */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
        <div className="flex items-start justify-between pb-4 border-b border-slate-800">
          <div>
            <span className="px-2.5 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-bold uppercase tracking-wider">
              {dispatch.workType} SHIFT
            </span>
            <h2 className="text-2xl font-black text-white mt-1.5">
              {dispatch.machine?.machineId ?? "INDEPENDENT CREW"}
            </h2>
            <p className="text-xs text-amber-400 font-semibold">{dispatch.machine?.type ?? "Trolly/Lift Labor"}</p>
          </div>

          <div className="text-right">
            <span className={`px-3 py-1.5 rounded-full text-xs font-black uppercase ${
              dispatch.status === "COMPLETED" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
              dispatch.status === "DELIVERED" ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" :
              "bg-amber-500/20 text-amber-400 border border-amber-500/30"
            }`}>
              {dispatch.status}
            </span>
          </div>
        </div>

        {/* Site Details */}
        <div className="space-y-2.5 text-xs text-slate-300 py-2">
          <div className="flex items-center gap-2.5">
            <User className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Customer: <strong className="text-white font-bold">{dispatch.customer?.name}</strong></span>
          </div>
          {dispatch.vehicle && (
            <div className="flex items-center gap-2.5">
              <Truck className="w-4 h-4 text-cyan-400 shrink-0" />
              <span>Assigned Vehicle: <strong className="text-cyan-300 font-bold font-mono">{dispatch.vehicle.licensePlate}</strong> ({dispatch.vehicle.type})</span>
            </div>
          )}
          <div className="flex items-center gap-2.5">
            <MapPin className="w-4 h-4 text-blue-400 shrink-0" />
            <span>Location: <strong className="text-white font-bold">{dispatch.location}</strong></span>
          </div>
          <div className="flex items-center gap-2.5">
            <Calendar className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Date: <strong className="text-white font-bold">{new Date(dispatch.dateOfService).toISOString().split("T")[0]}</strong></span>
          </div>
        </div>

        {/* Assigned Multi-Crew (Pani team) */}
        {(dispatch.crewAssignments?.length > 0 || dispatch.crewAssignments?.length > 0) && (
          <div className="pt-3 border-t border-slate-800 space-y-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400 block mb-1">
              Assigned Pani Crew & Helpers
            </span>
            {dispatch.crewAssignments?.map((mo: any) => (
              <div key={mo.id} className="text-xs text-slate-300 flex items-center justify-between bg-slate-950 p-2 rounded-xl border border-slate-800/80">
                <span>Operator: <strong className="text-white font-bold">{mo.employee?.name}</strong></span>
                <span className="text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-md font-bold">OPERATOR</span>
              </div>
            ))}
            {dispatch.crewAssignments?.map((mw: any) => (
              <div key={mw.id} className="text-xs text-slate-300 flex items-center justify-between bg-slate-950 p-2 rounded-xl border border-slate-800/80">
                <span>Helper: <strong className="text-white font-bold">{mw.employee?.name}</strong></span>
                <span className="text-[10px] bg-blue-500/20 text-blue-300 border border-blue-500/30 px-2 py-0.5 rounded-md font-bold">PANI HELPER</span>
              </div>
            ))}
          </div>
        )}

        {/* Auxiliary Tools list with Quantities */}
        {dispatch.dispatchTools && dispatch.dispatchTools.length > 0 && (
          <div className="pt-3 border-t border-slate-800">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
              Assigned Auxiliary Tools & Equipment
            </span>
            <div className="flex flex-wrap gap-2">
              {dispatch.dispatchTools.map((dt: any) => (
                <div key={dt.toolId} className="px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Wrench className="w-3.5 h-3.5 text-amber-400" />
                  <span>{dt.tool?.name}</span>
                  <span className="bg-amber-500 text-slate-950 px-1.5 py-0.2 rounded font-black text-[10px]">
                    ×{dt.quantity}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Flagged Banner */}
        {dispatch.isFlagged && (
          <div className="p-4 bg-red-950/40 border border-red-500/60 rounded-2xl space-y-1">
            <div className="flex items-center gap-1.5 text-red-400 font-bold text-xs uppercase">
              <ShieldAlert className="w-4 h-4 text-red-500 animate-pulse" />
              Incident Reported to Admin Alert Row
            </div>
            <p className="text-xs text-slate-300 font-mono italic">{dispatch.conflictReport}</p>
          </div>
        )}
      </div>

      {/* PRE-FLIGHT SAFETY CHECKLIST */}
      {/* START JOURNEY ACTIONS */}
      {dispatch.status === "PENDING" && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <h3 className="font-bold text-white text-sm">Start Journey</h3>
          <p className="text-xs text-slate-400">
            Click below to start your journey. This will capture your current GPS location for the Command Center.
          </p>

          <button
            disabled={isPending}
            onClick={handleStartJourney}
            className="w-full bg-blue-600 hover:bg-blue-500 text-white font-black py-3.5 rounded-2xl text-sm transition-all flex items-center justify-center gap-2 shadow-xl shadow-blue-500/20"
          >
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            {isPending ? "Locating & Starting..." : "Start Journey / En Route"}
          </button>
        </div>
      )}

      {/* PRE-FLIGHT SAFETY CHECKLIST */}
      {dispatch.status === "EN_ROUTE" && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Mandatory Pre-Flight Safety Checklist
            </h3>
            <span className="text-[11px] text-slate-400 font-bold uppercase">
              {Object.values(checks).filter(Boolean).length} / 4 Done
            </span>
          </div>

          <div className="space-y-3">
            {[
              { id: "oilCoolant", label: "Engine Oil & Water Coolant Level Verified" },
              { id: "tireBrakes", label: "Tire Pressure & Emergency Brakes Functional" },
              { id: "auxTools", label: "Auxiliary Vibrator / Hose Connections Secured" },
              { id: "customerVerbal", label: "Customer On-Site Verified Equipment Delivery" },
            ].map((item) => (
              <label
                key={item.id}
                onClick={() => setChecks({ ...checks, [item.id]: !checks[item.id as keyof typeof checks] })}
                className={`flex items-center gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                  checks[item.id as keyof typeof checks]
                    ? "bg-emerald-500/10 border-emerald-500/40 text-white font-bold"
                    : "bg-slate-950 border-slate-800 text-slate-400"
                }`}
              >
                <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                  checks[item.id as keyof typeof checks] ? "bg-emerald-500 border-emerald-400 text-slate-950" : "border-slate-700"
                }`}>
                  {checks[item.id as keyof typeof checks] && <CheckCircle2 className="w-4 h-4" />}
                </div>
                <span className="text-xs">{item.label}</span>
              </label>
            ))}
          </div>

          {/* PHASE 1: GROUP OPERATORS & TOOLS CONFIRMATION */}
          {(groupAggregate?.operators?.length || 0) > 0 && (
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-amber-400">Confirm Operator Arrival on Site</h4>
              {groupAggregate?.operators.map(op => (
                <label key={op.id} className="flex items-center gap-3 p-3 rounded-xl border bg-slate-950 border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-5 h-5 accent-emerald-500"
                    checked={arrivedOperatorIds.includes(op.id)}
                    onChange={(e) => {
                      if (e.target.checked) setArrivedOperatorIds([...arrivedOperatorIds, op.id]);
                      else setArrivedOperatorIds(arrivedOperatorIds.filter(id => id !== op.id));
                    }}
                  />
                  <span className="text-xs text-white">Operator {op.name} is on site</span>
                </label>
              ))}
            </div>
          )}

          {(groupAggregate?.tools?.length || 0) > 0 && (
            <div className="pt-4 border-t border-slate-800 space-y-3">
              <h4 className="text-xs font-bold text-blue-400">Confirm Tools Dropped Off</h4>
              {groupAggregate?.tools.map(tool => (
                <label key={tool.id} className="flex items-center gap-3 p-3 rounded-xl border bg-slate-950 border-slate-800 cursor-pointer">
                  <input
                    type="checkbox"
                    className="w-5 h-5 accent-blue-500"
                    checked={deliveredToolIds.includes(tool.id)}
                    onChange={(e) => {
                      if (e.target.checked) setDeliveredToolIds([...deliveredToolIds, tool.id]);
                      else setDeliveredToolIds(deliveredToolIds.filter(id => id !== tool.id));
                    }}
                  />
                  <span className="text-xs text-white">{tool.quantity}x {tool.name} {tool.variant ? `(${tool.variant})` : ""}</span>
                </label>
              ))}
            </div>
          )}

          <button
            disabled={!allChecked || isPending}
            onClick={() => handleTransitionStatus("DELIVERED")}
            className={`w-full py-3.5 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 shadow-xl ${
              allChecked
                ? "bg-blue-600 hover:bg-blue-500 text-white shadow-blue-500/20"
                : "bg-slate-800 text-slate-500 cursor-not-allowed"
            }`}
          >
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Confirm Checklist & Mark DELIVERED On-Site
          </button>
        </div>
      )}

      {/* SHIFT COMPLETION ACTIONS */}
      {dispatch.status === "DELIVERED" && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <h3 className="font-bold text-white text-sm">Shift Completion / Return to Base</h3>
          <p className="text-xs text-slate-400">
            Once construction work is finished for the day, mark the equipment shift completed.
          </p>

          {/* PHASE 2: TOOL PICK-UP VERIFICATION */}
          {(groupAggregate?.tools?.length || 0) > 0 && (
            <div className="pt-2 pb-4 space-y-3">
              <h4 className="text-xs font-bold text-rose-400 border-b border-slate-800 pb-2">
                Mandatory: Confirm tools loaded for return
              </h4>
              {groupAggregate?.tools.map(tool => (
                <label key={`return-${tool.id}`} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                  returnedToolIds.includes(tool.id) 
                    ? "bg-rose-500/10 border-rose-500/40" 
                    : "bg-slate-950 border-slate-800"
                }`}>
                  <input
                    type="checkbox"
                    className="w-5 h-5 accent-rose-500"
                    checked={returnedToolIds.includes(tool.id)}
                    onChange={(e) => {
                      if (e.target.checked) setReturnedToolIds([...returnedToolIds, tool.id]);
                      else setReturnedToolIds(returnedToolIds.filter(id => id !== tool.id));
                    }}
                  />
                  <div className="flex flex-col">
                    <span className="text-xs text-white font-bold">{tool.quantity}x {tool.name}</span>
                    {dispatch.deliveredToolIds?.includes(tool.id) && (
                      <span className="text-[10px] text-emerald-400">Confirmed dropped off earlier</span>
                    )}
                  </div>
                </label>
              ))}
            </div>
          )}

          <button
            disabled={isPending}
            onClick={() => handleTransitionStatus("COMPLETED")}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-black py-3.5 rounded-2xl text-sm transition-all flex items-center justify-center gap-2 shadow-xl shadow-emerald-500/20"
          >
            {isPending && <Loader2 className="w-4 h-4 animate-spin" />}
            Confirm Tools & Mark Shift COMPLETED
          </button>
        </div>
      )}

      {/* INCIDENT REPORT BUTTON */}
      <div className="pt-4">
        <button
          onClick={() => setShowIncidentModal(true)}
          className="w-full py-3 rounded-2xl bg-red-950/50 border-2 border-red-500/60 hover:bg-red-900/60 text-red-300 font-bold text-xs flex items-center justify-center gap-2 shadow-lg transition-all"
        >
          <AlertTriangle className="w-4 h-4 text-red-400" />
          Report Field Incident / Dispute (Alerts Admin Row)
        </button>
      </div>

      {/* INCIDENT MODAL */}
      {showIncidentModal && (
        <div className="fixed inset-0 bg-black/85 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-red-500/60 rounded-3xl max-w-md w-full p-6 shadow-2xl max-h-[90dvh] overflow-y-auto overscroll-contain">
            <h3 className="text-lg font-bold text-white flex items-center gap-2 text-red-400">
              <ShieldAlert className="w-5 h-5" />
              Report Field Incident / Dispute
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Briefly explain what happened on site (e.g. hose damage, payment dispute, customer delay). This queues locally or alerts Admin instantly.
            </p>

            <form onSubmit={handleReportIncident} className="mt-4 space-y-4">
              <textarea
                value={conflictReport}
                onChange={(e) => setConflictReport(e.target.value)}
                placeholder="e.g. Customer refused to pay for extended hours after 6 PM. Machine held on site."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white outline-none h-24"
                required
              />

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowIncidentModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 shadow"
                >
                  {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Submit Incident Report
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
