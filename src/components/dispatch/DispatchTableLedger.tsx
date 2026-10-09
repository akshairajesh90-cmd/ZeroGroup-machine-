import React from "react";
import { 
  Phone, 
  MapPin, 
  Navigation, 
  ShieldAlert,
  Users,
  Truck,
  Wrench,
  FileText,
  DollarSign,
  Loader2
} from "lucide-react";
import { useRouter } from "next/navigation";

interface DispatchTableLedgerProps {
  dispatches: any[];
  userRole: string;
  isPending: boolean;
  onGenerateBill: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
  setResolvingDispatchId: (id: string) => void;
}

export function DispatchTableLedger({
  dispatches,
  userRole,
  isPending,
  onGenerateBill,
  onStatusChange,
  setResolvingDispatchId,
}: DispatchTableLedgerProps) {
  const router = useRouter();

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-950/90 border-b border-slate-800 text-slate-300 text-xs font-bold tracking-wide">
              <th className="p-4 w-[28%] border-r border-slate-800/60">
                Customer & Contact Details
              </th>
              <th className="p-4 w-[34%] border-r border-slate-800/60">
                Assigned Labor & Crew Breakdown
              </th>
              <th className="p-4 w-[38%]">
                Assigned Equipment, Setup Tools & Billing
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 text-xs">
            {dispatches.map((d) => {
              const hasLift = d.machine?.type === "LIFT" || (d.dispatchMachines?.some((dm: any) => dm.machine?.type === "LIFT")) || d.liftFloors > 1;
              const hasMixer = d.machine?.type === "MIXER" || (d.dispatchMachines?.some((dm: any) => dm.machine?.type === "MIXER")) || d.mixerCategory === "HYDRAULIC";
              const hasVib = d.vibratorType || (d.dispatchTools?.some((t: any) => t.tool?.toolType?.includes("VIBRATOR")));

              return (
                <tr key={d.id} className={`hover:bg-slate-800/30 transition-colors ${d.isFlagged ? "bg-red-950/20" : d.status === "FLAGGED_MAINTENANCE" ? "bg-amber-950/10" : ""}`}>
                  {/* COLUMN 1: Customer & Location */}
                  <td className="p-4 align-top border-r border-slate-800/60 space-y-2">
                    <div className="flex items-start justify-between">
                      <div>
                        <span className="font-extrabold text-white text-sm block">{d.customer?.name}</span>
                        <span className="text-slate-400 flex items-center gap-1 mt-0.5 text-[11px]">
                          <Phone className="w-3 h-3 text-amber-400" />
                          {d.customer?.phone || "No phone listed"}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        d.status === "COMPLETED" ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30" :
                        d.status === "DELIVERED" ? "bg-blue-500/20 text-blue-400 border border-blue-500/30" :
                        d.status === "FLAGGED_MAINTENANCE" ? "bg-amber-500/20 text-amber-400 border border-amber-500/40" :
                        d.status === "CANCELLED" || d.status === "POSTPONED" ? "bg-red-500/20 text-red-400 border border-red-500/30" :
                        "bg-slate-500/20 text-slate-400 border border-slate-500/30"
                      }`}>
                        {d.status === "FLAGGED_MAINTENANCE" ? "🔧 MAINT. HOLD" : d.status}
                      </span>
                    </div>

                    <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 space-y-1 text-slate-300">
                      <div className="flex items-start gap-1.5">
                        <MapPin className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                        <span className="font-medium text-slate-200">{d.location}</span>
                      </div>
                      {(d.mapLink || (d.latitude && d.longitude)) && (
                        <a
                          href={d.latitude && d.longitude ? `https://www.google.com/maps/dir/?api=1&destination=${d.latitude},${d.longitude}` : d.mapLink}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-blue-400 hover:text-blue-300 underline flex items-center gap-1 pt-1 font-mono"
                        >
                          <Navigation className="w-3 h-3" />
                          {d.latitude && d.longitude ? "GPS Confirmed Delivery Site ↗" : "Driver GPS Map Pin Link ↗"}
                        </a>
                      )}
                      <div className="text-[10px] text-slate-500 pt-1 flex items-center justify-between">
                        <span>Date: {new Date(d.dateOfService).toISOString().split("T")[0]}</span>
                        {d.siteBundleId && <span className="font-mono text-amber-400 uppercase">[{d.siteBundleId}]</span>}
                      </div>
                    </div>

                    {d.status === "FLAGGED_MAINTENANCE" && (
                      <div className="p-2 bg-amber-950/60 border border-amber-500/50 rounded-lg text-[11px] text-amber-200">
                        <strong className="text-amber-400 flex items-center gap-1">
                          <ShieldAlert className="w-3.5 h-3.5" /> ⚠ Machine on Maintenance Hold
                        </strong>
                        <p className="mt-1 text-amber-300/70">Asset is locked — cannot be re-assigned until serviced and cleared by Owner.</p>
                      </div>
                    )}
                    {d.isFlagged && (
                      <div className="p-2 bg-red-950/60 border border-red-500/50 rounded-lg text-[11px] text-red-300">
                        <strong className="text-red-400 flex items-center gap-1">
                          <ShieldAlert className="w-3.5 h-3.5" /> Incident / Dispute Reported:
                        </strong>
                        {d.conflictReport}
                        {userRole === "OWNER" && (
                          <button
                            onClick={() => setResolvingDispatchId(d.id)}
                            className="mt-1.5 w-full bg-red-600 hover:bg-red-500 text-white font-bold py-1 rounded text-[10px]"
                          >
                            Resolve Incident
                          </button>
                        )}
                      </div>
                    )}
                  </td>

                  {/* COLUMN 2: Assigned Labor Crew */}
                  <td className="p-4 align-top border-r border-slate-800/60 space-y-3">
                    <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex items-center justify-between border-b border-slate-800/80 pb-1.5">
                        <span className="text-[11px] font-black uppercase text-amber-400 flex items-center gap-1">
                          <Users className="w-3.5 h-3.5" /> Caller / Main Helper Leader
                        </span>
                        <span className="bg-amber-500/20 text-amber-300 font-bold px-2 py-0.5 rounded-full text-[11px]">
                          {d.helperCount > 0 ? `${d.helperCount} Helpers only` : "Direct Labor"}
                        </span>
                      </div>
                      
                      <div className="text-slate-200 font-bold text-sm">
                        {d.mainHelperName || d.mainHelper?.name || "No Main Helper / Caller specified"}
                      </div>
                      
                      {d.helperCount > 0 && (
                        <p className="text-[11px] text-slate-400 font-mono">
                          Total Helper Crew count represented by this caller leader: <strong className="text-white">{d.helperCount} Workers</strong>
                        </p>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="bg-slate-950 p-2 rounded-xl border border-slate-800/80">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Operator</span>
                        {d.operator ? (
                          <a href={`tel:${d.operator.phone || ''}`} className="font-bold text-amber-400 text-xs block truncate hover:underline flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {d.operator.name}
                          </a>
                        ) : (
                          <span className="font-bold text-amber-400 text-xs block truncate">
                            Optional / None
                          </span>
                        )}
                      </div>
                      <div className="bg-slate-950 p-2 rounded-xl border border-slate-800/80">
                        <span className="text-[10px] uppercase font-bold text-slate-500 block">Conveyance / Driver</span>
                        {d.publicTransportUsed ? (
                          <span className="font-bold text-slate-300 text-xs block truncate">
                            Public Transport / Outside
                          </span>
                        ) : d.driver ? (
                          <a href={`tel:${d.driver.phone || ''}`} className="font-bold text-slate-300 text-xs block truncate hover:underline flex items-center gap-1">
                            <Phone className="w-3 h-3" /> {d.driver.name}
                          </a>
                        ) : (
                          <span className="font-bold text-slate-300 text-xs block truncate">
                            Company Driver
                          </span>
                        )}
                      </div>
                    </div>

                    {(d.crewAssignments?.length > 0 || d.crewAssignments?.length > 0) && (
                      <div className="bg-slate-950/60 p-2 rounded-lg border border-slate-800/60 text-[11px] space-y-1">
                        <span className="text-slate-500 font-bold uppercase block text-[10px]">Additional Crew:</span>
                        {d.crewAssignments?.map((mo: any) => (
                          <div key={mo.id} className="flex justify-between text-slate-300">
                            <span className="flex items-center gap-1">Op: {mo.employee?.phone ? <a href={`tel:${mo.employee.phone}`} className="hover:underline text-amber-400 flex items-center gap-1"><Phone className="w-3 h-3" /> {mo.employee.name}</a> : mo.employee?.name}</span>
                          </div>
                        ))}
                        {d.crewAssignments?.map((mw: any) => (
                          <div key={mw.id} className="flex justify-between text-slate-300">
                            <span>Helper: {mw.employee?.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </td>

                  {/* COLUMN 3: Equipment, Setup & Bill Slip Action */}
                  <td className="p-4 align-top space-y-3">
                    <div className="flex flex-wrap gap-1.5">
                      {hasLift && (
                        <span className="bg-blue-950/80 text-blue-300 border border-blue-500/40 px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1">
                          <Truck className="w-3.5 h-3.5 text-blue-400" />
                          Lift ({d.liftFloors ?? 1} Floored used)
                        </span>
                      )}
                      {hasMixer && (
                        <span className="bg-amber-950/80 text-amber-300 border border-amber-500/40 px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1">
                          <Wrench className="w-3.5 h-3.5 text-amber-400" />
                          Mixer ({d.mixerCategory === "HYDRAULIC" ? "Hydraulic Machine" : "Standard Machine"})
                        </span>
                      )}
                      {hasVib && (
                        <span className="bg-purple-950/80 text-purple-300 border border-purple-500/40 px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1">
                          <span>Vibrator ({d.vibratorType || "PETROL"})</span>
                        </span>
                      )}
                      {d.hasTrollyBench && (
                        <span className="bg-emerald-950/80 text-emerald-300 border border-emerald-500/40 px-2.5 py-1 rounded-lg font-bold text-xs flex items-center gap-1">
                          <span>Trolly + Bench Stand</span>
                        </span>
                      )}
                    </div>

                    {/* Setup tools */}
                    <div className="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800/80 space-y-1.5">
                      <span className="text-xs font-bold text-slate-400 block">
                        Setup Tools Used (Auxiliary items & wire):
                      </span>
                      {d.dispatchTools && d.dispatchTools.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {d.dispatchTools.map((dt: any) => (
                            <span key={dt.toolId} className="px-2 py-0.5 bg-slate-800 text-slate-200 rounded text-[11px] font-bold border border-slate-700">
                              {dt.tool?.name} ×{dt.quantity}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-[11px] text-slate-500 italic">No specific setup tools logged</span>
                      )}
                    </div>

                    {/* BILLING ACTION LINK OR GENERATE BUTTON */}
                    <div className="pt-2 border-t border-slate-800/80 flex items-center gap-2">
                      {d.invoice ? (
                        <button
                          onClick={() => router.push(`/admin/billing/${d.invoice.id}`)}
                          className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
                        >
                          <FileText className="w-4 h-4" />
                          View Bill #{d.invoice.billNumber} (₹{Number(d.invoice.totalAmount).toLocaleString()}) →
                        </button>
                      ) : (
                        <button
                          disabled={isPending}
                          onClick={() => onGenerateBill(d.id)}
                          className="w-full bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold py-2.5 px-4 rounded-xl text-xs flex items-center justify-center gap-2 shadow-lg shadow-amber-500/20 transition-all"
                        >
                          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
                          Generate Bill Slip (Auto-Pull Ledger)
                        </button>
                      )}
                    </div>

                    {/* Status updates — blocked if machine is on maintenance hold */}
                    {d.status === "FLAGGED_MAINTENANCE" ? (
                      <div className="pt-2 border-t border-amber-800/40">
                        <p className="text-[11px] text-amber-500 font-bold text-center py-1">
                          🔒 Status transitions locked — machine under maintenance
                        </p>
                      </div>
                    ) : d.status !== "CANCELLED" && d.status !== "POSTPONED" && d.status !== "COMPLETED" ? (
                      <div className="flex items-center gap-1.5 pt-1">
                        {d.status === "PENDING" && (
                          <button
                            disabled={isPending}
                            onClick={() => onStatusChange(d.id, "DELIVERED")}
                            className="flex-1 bg-blue-600/80 hover:bg-blue-600 text-white font-bold py-1.5 rounded-lg text-[11px] transition-all"
                          >
                            Mark Delivered
                          </button>
                        )}
                        {d.status === "DELIVERED" && (
                          <button
                            disabled={isPending}
                            onClick={() => onStatusChange(d.id, "COMPLETED")}
                            className="flex-1 bg-emerald-600/80 hover:bg-emerald-600 text-white font-bold py-1.5 rounded-lg text-[11px] transition-all"
                          >
                            Mark Completed
                          </button>
                        )}
                        <button
                          onClick={() => onStatusChange(d.id, "CANCELLED")}
                          className="px-2 py-1.5 bg-slate-800 hover:bg-red-900/40 text-red-400 font-bold rounded-lg text-[11px] border border-slate-700"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
