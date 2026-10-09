"use client";

import { useState } from "react";
import Link from "next/link";
import { format, differenceInDays } from "date-fns";
import { 
  ArrowLeft, Info, Fuel, Wrench, FileText, 
  AlertTriangle, ShieldAlert, CheckCircle2, Upload
} from "lucide-react";
import { createMaintenanceTicket, closeMaintenanceTicket, logStaffFuel, uploadVehicleDocument } from "@/actions/fleet";

export default function VehicleDetailClient({ vehicle }: any) {
  const [activeTab, setActiveTab] = useState<"DOCS" | "MAINTENANCE" | "FUEL">("DOCS");
  
  // Modals
  const [showFuelModal, setShowFuelModal] = useState(false);
  const [showRepairModal, setShowRepairModal] = useState(false);
  const [showCloseRepairModal, setShowCloseRepairModal] = useState<string | null>(null);
  const [showDocModal, setShowDocModal] = useState(false);

  // Form States
  const [fuelForm, setFuelForm] = useState({ liters: "", totalCost: "", odometerReading: "", date: format(new Date(), "yyyy-MM-dd") });
  const [repairForm, setRepairForm] = useState({ issueDescription: "" });
  const [closeForm, setCloseForm] = useState({ mechanicName: "", partsCost: "", laborCost: "", resolutionNotes: "" });
  const [docForm, setDocForm] = useState({ type: "INSURANCE", documentNumber: "", issueDate: "", expiryDate: "" });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFuelSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null);
    const res = await logStaffFuel({
      assetId: vehicle.id,
      assetType: "VEHICLE",
      liters: Number(fuelForm.liters),
      totalCost: Number(fuelForm.totalCost),
      odometerReading: fuelForm.odometerReading ? Number(fuelForm.odometerReading) : undefined,
      date: fuelForm.date
    });
    setLoading(false);
    if (res.success) setShowFuelModal(false); else setError(res.error);
  };

  const handleRepairSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null);
    const res = await createMaintenanceTicket({
      assetId: vehicle.id,
      assetType: "VEHICLE",
      issueDescription: repairForm.issueDescription
    });
    setLoading(false);
    if (res.success) setShowRepairModal(false); else setError(res.error);
  };

  const handleCloseRepairSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showCloseRepairModal) return;
    setLoading(true); setError(null);
    const res = await closeMaintenanceTicket(showCloseRepairModal, {
      mechanicName: closeForm.mechanicName,
      partsCost: Number(closeForm.partsCost),
      laborCost: Number(closeForm.laborCost),
      resolutionNotes: closeForm.resolutionNotes
    });
    setLoading(false);
    if (res.success) setShowCloseRepairModal(null); else setError(res.error);
  };

  const handleDocSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError(null);
    const res = await uploadVehicleDocument({
      vehicleId: vehicle.id,
      type: docForm.type as any,
      documentNumber: docForm.documentNumber,
      issueDate: docForm.issueDate,
      expiryDate: docForm.expiryDate
    });
    setLoading(false);
    if (res.success) setShowDocModal(false); else setError(res.error);
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
            <h1 className="text-3xl font-black font-mono tracking-tight text-cyan-400">
              {vehicle.licensePlate}
            </h1>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowRepairModal(true)} className="px-4 py-2 bg-rose-500/10 text-rose-400 hover:bg-rose-500/20 border border-rose-500/20 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors">
              <Wrench className="w-4 h-4" /> Report Breakdown
            </button>
            <button onClick={() => setShowFuelModal(true)} className="px-4 py-2 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors">
              <Fuel className="w-4 h-4" /> Log Diesel
            </button>
          </div>
        </div>

        {/* Summary Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 flex flex-col md:flex-row gap-8 items-start">
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <Info className="w-5 h-5 text-cyan-400" />
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Vehicle Type & Status</h3>
            </div>
            <p className="text-2xl font-black text-white mb-2">{vehicle.type}</p>
            <span className={`px-2 py-1 rounded text-xs font-black ${
                vehicle.status === 'AVAILABLE' ? 'bg-emerald-500/20 text-emerald-400' :
                vehicle.status === 'REPAIR' ? 'bg-rose-500/20 text-rose-400 animate-pulse' :
                'bg-blue-500/20 text-blue-400'
              }`}>
              {vehicle.status}
            </span>
          </div>

          <div className="flex-1 border-l border-slate-800 pl-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-500 uppercase tracking-wider">Compliance Status</h3>
              <button onClick={() => setShowDocModal(true)} className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 bg-indigo-500/10 px-2 py-1 rounded">
                <Upload className="w-3 h-3" /> Update Docs
              </button>
            </div>
            <div className="space-y-3">
              {vehicle.documents.length === 0 ? (
                <p className="text-sm text-slate-500">No documents uploaded.</p>
              ) : (
                vehicle.documents.map((doc: any) => {
                  const daysLeft = differenceInDays(new Date(doc.expiryDate), new Date());
                  const isExpired = daysLeft < 0;
                  const isWarning = daysLeft >= 0 && daysLeft <= 15;
                  return (
                    <div key={doc.id} className={`flex items-center justify-between p-3 rounded-xl border ${
                      isExpired ? 'bg-rose-500/10 border-rose-500/30' : 
                      isWarning ? 'bg-amber-500/10 border-amber-500/30' : 
                      'bg-slate-800/50 border-slate-700/50'
                    }`}>
                      <div className="flex items-center gap-3">
                        <FileText className={`w-4 h-4 ${isExpired ? 'text-rose-400' : isWarning ? 'text-amber-400' : 'text-slate-400'}`} />
                        <div>
                          <p className="text-xs font-bold text-slate-300 uppercase">{doc.type}</p>
                          <p className="text-[10px] text-slate-500 font-mono mt-0.5">{doc.documentNumber}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-xs font-black ${isExpired ? 'text-rose-400' : isWarning ? 'text-amber-400' : 'text-emerald-400'}`}>
                          {isExpired ? 'EXPIRED' : `${daysLeft} days left`}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">Expires {format(new Date(doc.expiryDate), 'MMM dd, yyyy')}</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 border-b border-slate-800 pb-2 mt-8">
          <button onClick={() => setActiveTab("DOCS")} className={`pb-2 px-2 font-bold text-sm transition-colors flex items-center gap-2 ${activeTab === "DOCS" ? "border-b-2 border-indigo-500 text-indigo-400" : "text-slate-400 hover:text-slate-200"}`}>
            Documents Full List
          </button>
          <button onClick={() => setActiveTab("MAINTENANCE")} className={`pb-2 px-2 font-bold text-sm transition-colors flex items-center gap-2 ${activeTab === "MAINTENANCE" ? "border-b-2 border-rose-500 text-rose-400" : "text-slate-400 hover:text-slate-200"}`}>
            Maintenance Logs
          </button>
          <button onClick={() => setActiveTab("FUEL")} className={`pb-2 px-2 font-bold text-sm transition-colors flex items-center gap-2 ${activeTab === "FUEL" ? "border-b-2 border-amber-500 text-amber-400" : "text-slate-400 hover:text-slate-200"}`}>
            Fuel Logs
          </button>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden min-h-[400px]">
          
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
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {vehicle.maintenanceTickets.map((t: any) => (
                    <tr key={t.id} className="hover:bg-slate-800/50">
                      <td className="px-6 py-4 text-slate-300 whitespace-nowrap">{format(new Date(t.createdAt), 'MMM dd, yyyy')}</td>
                      <td className="px-6 py-4 font-medium text-slate-200 max-w-xs truncate">{t.issueDescription}</td>
                      <td className="px-6 py-4">
                        {t.status === "OPEN" ? (
                          <button onClick={() => setShowCloseRepairModal(t.id)} className="px-2 py-1 rounded bg-rose-500/20 text-rose-400 hover:bg-rose-500/30 text-[10px] font-black uppercase tracking-wider border border-rose-500/20">
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
                          <div><span className="font-bold text-slate-300">{t.mechanicName}:</span> {t.resolutionNotes}</div>
                        ) : "—"}
                      </td>
                    </tr>
                  ))}
                  {vehicle.maintenanceTickets.length === 0 && (
                    <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-500">No maintenance tickets found.</td></tr>
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
                    <th className="px-6 py-4 font-black">Logged By</th>
                    <th className="px-6 py-4 font-black text-right">Liters</th>
                    <th className="px-6 py-4 font-black text-right">Odometer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {vehicle.fuelLogs.map((f: any) => (
                    <tr key={f.id} className="hover:bg-slate-800/50">
                      <td className="px-6 py-4 text-slate-300">{format(new Date(f.date), 'MMM dd, yyyy')}</td>
                      <td className="px-6 py-4 text-slate-300">{f.driver?.name || "Staff"}</td>
                      <td className="px-6 py-4 text-right font-mono font-bold text-amber-400">{Number(f.liters).toFixed(1)} L</td>
                      <td className="px-6 py-4 text-right font-mono text-slate-400">{f.odometerReading ? `${f.odometerReading} km` : "—"}</td>
                    </tr>
                  ))}
                  {vehicle.fuelLogs.length === 0 && (
                    <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-500">No fuel logs found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* DOCS TAB */}
          {activeTab === "DOCS" && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-slate-950 text-slate-500 border-b border-slate-800">
                  <tr>
                    <th className="px-6 py-4 font-black">Type</th>
                    <th className="px-6 py-4 font-black">Doc #</th>
                    <th className="px-6 py-4 font-black">Issued</th>
                    <th className="px-6 py-4 font-black">Expires</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {vehicle.documents.map((d: any) => (
                    <tr key={d.id} className="hover:bg-slate-800/50">
                      <td className="px-6 py-4 text-slate-300 font-bold">{d.type}</td>
                      <td className="px-6 py-4 text-slate-400 font-mono text-xs">{d.documentNumber}</td>
                      <td className="px-6 py-4 text-slate-400">{format(new Date(d.issueDate), 'MMM dd, yyyy')}</td>
                      <td className="px-6 py-4 font-bold text-slate-200">{format(new Date(d.expiryDate), 'MMM dd, yyyy')}</td>
                    </tr>
                  ))}
                  {vehicle.documents.length === 0 && (
                    <tr><td colSpan={4} className="px-6 py-12 text-center text-slate-500">No compliance documents.</td></tr>
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
                <label className="text-[10px] font-black uppercase text-slate-500">Odometer km *</label>
                <input type="number" required value={fuelForm.odometerReading} onChange={e => setFuelForm({...fuelForm, odometerReading: e.target.value})} className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white outline-none focus:border-amber-500" />
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
              <p className="text-xs text-rose-300/70 mt-1 font-medium">This will set the vehicle status to REPAIR.</p>
            </div>
            <form onSubmit={handleRepairSubmit} className="p-6 space-y-4">
              {error && <div className="text-xs text-rose-400 p-2 bg-rose-500/10 rounded">{error}</div>}
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500">Describe Issue *</label>
                <textarea required rows={4} value={repairForm.issueDescription} onChange={e => setRepairForm({...repairForm, issueDescription: e.target.value})} placeholder="e.g. Brakes failing..." className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white outline-none focus:border-rose-500 resize-none" />
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

      {/* DOC MODAL */}
      {showDocModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 bg-indigo-500/10">
              <h2 className="text-lg font-black text-indigo-400 flex items-center gap-2"><Upload className="w-5 h-5"/> Upload Document</h2>
            </div>
            <form onSubmit={handleDocSubmit} className="p-6 space-y-4">
              {error && <div className="text-xs text-rose-400 p-2 bg-rose-500/10 rounded">{error}</div>}
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500">Document Type *</label>
                <select value={docForm.type} onChange={e => setDocForm({...docForm, type: e.target.value})} className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white outline-none focus:border-indigo-500">
                  <option value="INSURANCE">Insurance</option>
                  <option value="FITNESS_CERTIFICATE">Fitness Certificate</option>
                  <option value="ROAD_TAX">Road Tax</option>
                  <option value="PERMIT">Permit</option>
                  <option value="POLLUTION">Pollution (PUC)</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-slate-500">Doc Number (Policy / RC) *</label>
                <input type="text" required value={docForm.documentNumber} onChange={e => setDocForm({...docForm, documentNumber: e.target.value})} className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white outline-none focus:border-indigo-500" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500">Issue Date *</label>
                  <input type="date" required value={docForm.issueDate} onChange={e => setDocForm({...docForm, issueDate: e.target.value})} className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white outline-none focus:border-indigo-500" />
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase text-slate-500">Expiry Date *</label>
                  <input type="date" required value={docForm.expiryDate} onChange={e => setDocForm({...docForm, expiryDate: e.target.value})} className="w-full mt-1 bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white outline-none focus:border-indigo-500" />
                </div>
              </div>
              <div className="flex gap-3 pt-4 border-t border-slate-800">
                <button type="button" onClick={() => setShowDocModal(false)} className="flex-1 py-2 text-slate-400 font-bold hover:text-white">Cancel</button>
                <button type="submit" disabled={loading} className="flex-1 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-lg disabled:opacity-50">Save Document</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
