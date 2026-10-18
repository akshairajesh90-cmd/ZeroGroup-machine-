"use client";

import { useState } from "react";
import Link from "next/link";
import { format } from "date-fns";
import dynamic from "next/dynamic";
import { 
  ArrowLeft, Info, Banknote, Fuel, MapPin, 
  Wrench, AlertTriangle, Plus, CheckCircle2 
} from "lucide-react";
import { createMaintenanceTicket, closeMaintenanceTicket, logStaffFuel } from "@/actions/fleet";
import { EditMachineModal } from "./EditMachineModal";

const DynamicAssetMap = dynamic(
  () => import("../../components/AssetMapClient"),
  { ssr: false }
);

export default function MachineDetailClient({ 
  machine, latitude, longitude, latestLocation, isFinancialAuth 
}: any) {
  const [activeTab, setActiveTab] = useState<"HISTORY" | "MAINTENANCE" | "FUEL">("HISTORY");
  
  // Modals
  const [showFuelModal, setShowFuelModal] = useState(false);
  const [showRepairModal, setShowRepairModal] = useState(false);
  const [showCloseRepairModal, setShowCloseRepairModal] = useState<string | null>(null); // ticket ID

  // Form States
  const [fuelForm, setFuelForm] = useState({ liters: "", totalCost: "", odometerReading: "", date: format(new Date(), "yyyy-MM-dd") });
  const [repairForm, setRepairForm] = useState({ issueDescription: "" });
  const [closeForm, setCloseForm] = useState({ mechanicName: "", partsCost: "", laborCost: "", resolutionNotes: "" });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFuelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await logStaffFuel({
      assetId: machine.id,
      assetType: "MACHINE",
      liters: Number(fuelForm.liters),
      totalCost: Number(fuelForm.totalCost),
      odometerReading: fuelForm.odometerReading ? Number(fuelForm.odometerReading) : undefined,
      date: fuelForm.date
    });
    setLoading(false);
    if (res.success) setShowFuelModal(false);
    else setError(res.error);
  };

  const handleRepairSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await createMaintenanceTicket({
      assetId: machine.id,
      assetType: "MACHINE",
      issueDescription: repairForm.issueDescription
    });
    setLoading(false);
    if (res.success) setShowRepairModal(false);
    else setError(res.error);
  };

  const handleCloseRepairSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showCloseRepairModal) return;
    setLoading(true);
    setError(null);
    const res = await closeMaintenanceTicket(showCloseRepairModal, {
      mechanicName: closeForm.mechanicName,
      partsCost: Number(closeForm.partsCost),
      laborCost: Number(closeForm.laborCost),
      resolutionNotes: closeForm.resolutionNotes
    });
    setLoading(false);
    if (res.success) setShowCloseRepairModal(null);
    else setError(res.error);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8 pb-20">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/staff/fleet" className="px-3 py-2 bg-slate-900 border border-slate-700 hover:bg-slate-800 rounded-lg text-slate-300 text-sm font-medium transition-colors flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Fleet
            </Link>
            <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-cyan-400">
              {machine.machineId}
            </h1>
          </div>
          <div className="flex gap-2">
            <EditMachineModal machine={machine} />
            <button onClick={() => setShowRepairModal(true)} className="px-4 py-2 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors">
              <Wrench className="w-4 h-4" /> Report Breakdown
            </button>
            <button onClick={() => setShowFuelModal(true)} className="px-4 py-2 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors">
              <Fuel className="w-4 h-4" /> Log Diesel
            </button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-2">
              <Info className="w-5 h-5 text-indigo-400" />
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Status & Type</h3>
            </div>
            <p className="text-2xl font-black text-white mb-2">{machine.type}</p>
            <span className={`px-2 py-1 rounded text-xs font-black ${
                machine.status === 'AVAILABLE' ? 'bg-emerald-500/20 text-emerald-400' :
                machine.status === 'REPAIR' ? 'bg-rose-500/20 text-rose-400 animate-pulse' :
                'bg-blue-500/20 text-blue-400'
              }`}>
              {machine.status}
            </span>
          </div>

          {isFinancialAuth ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <Banknote className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Op. Payout</h3>
              </div>
              <p className="text-3xl font-black text-emerald-400">₹{Number(machine.operatorDailyPayout).toFixed(2)}</p>
            </div>
          ) : (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex items-center justify-center opacity-50">
              <p className="text-slate-500 text-sm font-bold">Financials Masked</p>
            </div>
          )}

          {isFinancialAuth ? (
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-2">
                <Fuel className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Fuel Threshold</h3>
              </div>
              <p className="text-3xl font-black text-amber-400">₹{Number(machine.fuelConsumptionThreshold).toFixed(2)}</p>
            </div>
          ) : (
             <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex items-center justify-center opacity-50">
               <p className="text-slate-500 text-sm font-bold">Financials Masked</p>
             </div>
          )}
        </div>

        {/* Map Section */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 h-[400px]">
          <h2 className="text-lg font-black mb-4 flex items-center gap-2 text-white">
            <MapPin className="text-indigo-400 w-5 h-5" /> Last Known Location
          </h2>
          <DynamicAssetMap 
            latitude={latitude}
            longitude={longitude}
            label={latestLocation || "Unknown Location"}
          />
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-slate-800 pb-2 mt-8">
          <button onClick={() => setActiveTab("HISTORY")} className={`pb-2 px-2 font-bold text-sm transition-colors flex items-center gap-2 ${activeTab === "HISTORY" ? "border-b-2 border-indigo-500 text-indigo-400" : "text-slate-400 hover:text-slate-200"}`}>
            Dispatch History
          </button>
          <button onClick={() => setActiveTab("MAINTENANCE")} className={`pb-2 px-2 font-bold text-sm transition-colors flex items-center gap-2 ${activeTab === "MAINTENANCE" ? "border-b-2 border-rose-500 text-rose-400" : "text-slate-400 hover:text-slate-200"}`}>
            Maintenance Logs
          </button>
          <button onClick={() => setActiveTab("FUEL")} className={`pb-2 px-2 font-bold text-sm transition-colors flex items-center gap-2 ${activeTab === "FUEL" ? "border-b-2 border-amber-500 text-amber-400" : "text-slate-400 hover:text-slate-200"}`}>
            Fuel Logs
          </button>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden min-h-[400px]">
          {/* HISTORY TAB */}
          {activeTab === "HISTORY" && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-slate-950 text-slate-500 border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4 font-black">Date</th>
                    <th className="px-6 py-4 font-black">Location</th>
                    <th className="px-6 py-4 font-black">Status</th>
                    {isFinancialAuth && <th className="px-6 py-4 font-black text-right">Revenue (₹)</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {machine.dispatches.map((d: any) => (
                    <tr key={d.id} className="hover:bg-slate-800/50">
                      <td className="px-6 py-4 text-slate-300">{format(new Date(d.dateOfService), 'PPP')}</td>
                      <td className="px-6 py-4 font-medium text-slate-200">{d.location}</td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 rounded text-[10px] font-black bg-slate-800 text-slate-400 uppercase tracking-wider">{d.status}</span>
                      </td>
                      {isFinancialAuth && <td className="px-6 py-4 text-right font-mono text-emerald-400">{Number(d.customerCharge).toFixed(2)}</td>}
                    </tr>
                  ))}
                  {machine.dispatches.length === 0 && (
                    <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-500">No dispatch history.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* MAINTENANCE TAB */}
          {activeTab === "MAINTENANCE" && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-slate-950 text-slate-500 border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4 font-black">Reported On</th>
                    <th className="px-6 py-4 font-black">Issue</th>
                    <th className="px-6 py-4 font-black">Status</th>
                    <th className="px-6 py-4 font-black">Resolution</th>
                    {isFinancialAuth && <th className="px-6 py-4 font-black text-right">Total Cost (₹)</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {machine.maintenanceTickets.map((t: any) => (
                    <tr key={t.id} className="hover:bg-slate-800/50">
                      <td className="px-6 py-4 text-slate-300 whitespace-nowrap">{format(new Date(t.createdAt), 'MMM dd, yyyy')}</td>
                      <td className="px-6 py-4 font-medium text-slate-200 max-w-xs truncate" title={t.issueDescription}>{t.issueDescription}</td>
                      <td className="px-6 py-4">
                        {t.status === "OPEN" ? (
                          <button onClick={() => setShowCloseRepairModal(t.id)} className="px-2 py-1 rounded bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 text-[10px] font-black uppercase tracking-wider border border-rose-500/20 transition-colors">
                            Mark Fixed
                          </button>
                        ) : (
                          <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-wider border border-emerald-500/20">
                            RESOLVED
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-xs">
                        {t.status === "RESOLVED" ? (
                          <div>
                            <span className="font-bold text-slate-300">{t.mechanicName}:</span> {t.resolutionNotes}
                          </div>
                        ) : "—"}
                      </td>
                      {isFinancialAuth && (
                        <td className="px-6 py-4 text-right font-mono text-rose-400 font-bold">
                          {t.status === "RESOLVED" ? (Number(t.partsCost) + Number(t.laborCost)).toFixed(2) : "—"}
                        </td>
                      )}
                    </tr>
                  ))}
                  {machine.maintenanceTickets.length === 0 && (
                    <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500">No maintenance tickets found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* FUEL TAB */}
          {activeTab === "FUEL" && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-slate-950 text-slate-500 border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4 font-black">Date</th>
                    <th className="px-6 py-4 font-black text-right">Liters</th>
                    <th className="px-6 py-4 font-black text-right">Odometer</th>
                    {isFinancialAuth && <th className="px-6 py-4 font-black text-right">Total Cost (₹)</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {machine.fuelLogs.map((f: any) => (
                    <tr key={f.id} className="hover:bg-slate-800/50">
                      <td className="px-6 py-4 text-slate-300">{format(new Date(f.date), 'MMM dd, yyyy')}</td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-amber-400">{Number(f.liters).toFixed(1)} L</td>
                      <td className="px-6 py-4 text-right font-mono text-slate-400">{f.odometerReading ? `${f.odometerReading} km` : "—"}</td>
                      {isFinancialAuth && <td className="px-6 py-4 text-right font-mono text-emerald-400">₹{Number(f.totalCost).toFixed(2)}</td>}
                    </tr>
                  ))}
                  {machine.fuelLogs.length === 0 && (
                    <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-500">No fuel logs found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* FUEL MODAL */}
      {showFuelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 bg-amber-500/10">
              <h2 className="text-lg font-black text-amber-400 flex items-center gap-2"><Fuel className="w-5 h-5"/> Log Diesel Fill</h2>
            </div>
            <form onSubmit={handleFuelSubmit} className="p-6 space-y-4">
              {error && <div className="text-xs text-rose-400 p-2 bg-rose-500/10 rounded">{error}</div>}
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500">Date</label>
                <input type="date" required value={fuelForm.date} onChange={e => setFuelForm({...fuelForm, date: e.target.value})} className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white outline-none focus:border-amber-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500">Liters *</label>
                  <input type="number" step="0.1" required value={fuelForm.liters} onChange={e => setFuelForm({...fuelForm, liters: e.target.value})} className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white outline-none focus:border-amber-500" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500">Total Cost (₹) *</label>
                  <input type="number" required value={fuelForm.totalCost} onChange={e => setFuelForm({...fuelForm, totalCost: e.target.value})} className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white outline-none focus:border-amber-500" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500">Odometer / Hours (Optional)</label>
                <input type="number" value={fuelForm.odometerReading} onChange={e => setFuelForm({...fuelForm, odometerReading: e.target.value})} className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white outline-none focus:border-amber-500" />
              </div>
              <div className="flex gap-3 pt-4 border-t border-slate-800">
                <button type="button" onClick={() => setShowFuelModal(false)} className="flex-1 py-2 text-slate-400 font-bold hover:text-white">Cancel</button>
                <button type="submit" disabled={loading} className="flex-1 py-2 bg-amber-600 hover:bg-amber-500 text-white font-black rounded-lg disabled:opacity-50">Save Log</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* REPAIR MODAL */}
      {showRepairModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 bg-rose-500/10">
              <h2 className="text-lg font-black text-rose-400 flex items-center gap-2"><Wrench className="w-5 h-5"/> Report Breakdown</h2>
              <p className="text-xs text-rose-300/70 mt-1 font-medium">This will set the machine status to REPAIR.</p>
            </div>
            <form onSubmit={handleRepairSubmit} className="p-6 space-y-4">
              {error && <div className="text-xs text-rose-400 p-2 bg-rose-500/10 rounded">{error}</div>}
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500">Describe Issue *</label>
                <textarea required rows={4} value={repairForm.issueDescription} onChange={e => setRepairForm({...repairForm, issueDescription: e.target.value})} placeholder="e.g. Engine leaking oil..." className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white outline-none focus:border-rose-500 resize-none" />
              </div>
              <div className="flex gap-3 pt-4 border-t border-slate-800">
                <button type="button" onClick={() => setShowRepairModal(false)} className="flex-1 py-2 text-slate-400 font-bold hover:text-white">Cancel</button>
                <button type="submit" disabled={loading} className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-lg disabled:opacity-50">Submit Ticket</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CLOSE REPAIR MODAL */}
      {showCloseRepairModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 bg-emerald-500/10">
              <h2 className="text-lg font-black text-emerald-400 flex items-center gap-2"><CheckCircle2 className="w-5 h-5"/> Resolve Ticket</h2>
              <p className="text-xs text-emerald-300/70 mt-1 font-medium">This will create an Expense and set status to AVAILABLE.</p>
            </div>
            <form onSubmit={handleCloseRepairSubmit} className="p-6 space-y-4">
              {error && <div className="text-xs text-rose-400 p-2 bg-rose-500/10 rounded">{error}</div>}
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500">Mechanic / Workshop Name *</label>
                <input type="text" required value={closeForm.mechanicName} onChange={e => setCloseForm({...closeForm, mechanicName: e.target.value})} className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white outline-none focus:border-emerald-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500">Parts Cost (₹) *</label>
                  <input type="number" required value={closeForm.partsCost} onChange={e => setCloseForm({...closeForm, partsCost: e.target.value})} className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white outline-none focus:border-emerald-500" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500">Labor Cost (₹) *</label>
                  <input type="number" required value={closeForm.laborCost} onChange={e => setCloseForm({...closeForm, laborCost: e.target.value})} className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white outline-none focus:border-emerald-500" />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500">Resolution Notes *</label>
                <textarea required rows={3} value={closeForm.resolutionNotes} onChange={e => setCloseForm({...closeForm, resolutionNotes: e.target.value})} placeholder="What was fixed?" className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white outline-none focus:border-emerald-500 resize-none" />
              </div>
              <div className="flex gap-3 pt-4 border-t border-slate-800">
                <button type="button" onClick={() => setShowCloseRepairModal(null)} className="flex-1 py-2 text-slate-400 font-bold hover:text-white">Cancel</button>
                <button type="submit" disabled={loading} className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-lg disabled:opacity-50">Mark Resolved</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
