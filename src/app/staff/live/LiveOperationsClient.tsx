"use client";

import React, { useTransition } from "react";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { RefreshCw, MapPin, Truck, Wrench, Users, CheckCircle2, Clock, AlertTriangle, Hammer, HardHat } from "lucide-react";

// Dynamic import for Leaflet map to prevent SSR issues with 'window'
const LiveMap = dynamic(() => import("@/components/LiveMap"), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-[500px] bg-slate-900/50 rounded-2xl border border-slate-800 animate-pulse flex items-center justify-center">
      <MapPin className="w-8 h-8 text-slate-700" />
    </div>
  )
});

interface DeployedSite {
  location: string;
  dispatches: any[];
}

interface LiveOperationsClientProps {
  deployedSites: DeployedSite[];
  idleMachines: any[];
  idleEmployees: any[];
  idleTools: any[];
  idleVehicles: any[];
}

export default function LiveOperationsClient({ 
  deployedSites, 
  idleMachines, 
  idleEmployees,
  idleTools,
  idleVehicles
}: LiveOperationsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleRefresh = () => {
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <div className="p-4 md:p-8 space-y-8 animate-in fade-in duration-500 max-w-7xl mx-auto">
      
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <MapPin className="w-8 h-8 text-indigo-400" />
            Live Operations Command Center
          </h1>
          <p className="text-slate-400 mt-2 text-sm font-medium">
            Real-time logical tracking of all deployed assets and personnel.
          </p>
        </div>
        <button
          onClick={handleRefresh}
          disabled={isPending}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold transition-all disabled:opacity-50 shadow-lg shadow-indigo-500/20"
        >
          <RefreshCw className={`w-5 h-5 ${isPending ? "animate-spin" : ""}`} />
          Refresh Radar
        </button>
      </div>

      {/* MAP VIEW */}
      <div className="w-full mb-8">
        <LiveMap sites={deployedSites} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        
        {/* ZONE 1: ACTIVE SITES (Deployed) */}
        <div className="xl:col-span-2 space-y-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            Active Chain Operations ({deployedSites.length})
          </h2>
          
          {deployedSites.length === 0 ? (
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 text-center text-slate-500">
              No active dispatches currently on site.
            </div>
          ) : (
            <div className="space-y-6">
              {deployedSites.map((site, idx) => (
                <div key={idx} className="bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-2xl p-5 shadow-xl relative overflow-hidden group">
                  <div className="flex items-center justify-between mb-4 border-b border-slate-800 pb-3">
                    <h3 className="text-xl font-black text-white tracking-tight">{site.location}</h3>
                  </div>
                  
                  <div className="space-y-6">
                    {site.dispatches.map((d, dIdx) => {
                      const isPendingVehicle = d.driverId && !d.assignedVehicle;
                      
                      return (
                        <div key={dIdx} className="space-y-3">
                          <div className="flex items-center gap-3">
                            <span className={`text-xs font-bold px-3 py-1.5 rounded-lg ${
                              d.status === 'PENDING' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/20' : 
                              d.status === 'EN_ROUTE' ? 'bg-blue-500/20 text-blue-400 border border-blue-500/20' : 
                              'bg-emerald-500/20 text-emerald-400 border border-emerald-500/20'
                            }`}>
                              {d.status.replace("_", " ")}
                            </span>
                            {d.siteBundleId && (
                              <span className="text-xs font-semibold text-slate-400 px-2 py-1 rounded bg-slate-800 border border-slate-700">
                                {d.siteBundleId}
                              </span>
                            )}
                          </div>
                          
                          {/* CHAIN OPERATION UI */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            
                            {/* 1. TRANSPORT */}
                            <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800/80">
                              <h4 className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                <Truck className="w-3.5 h-3.5" /> Transport
                              </h4>
                              {d.driver ? (
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-md bg-indigo-500/20 text-indigo-400 flex items-center justify-center text-xs font-bold">
                                      {d.driver.name.charAt(0)}
                                    </div>
                                    <span className="text-sm font-semibold text-white">{d.driver.name}</span>
                                  </div>
                                  
                                  {d.assignedVehicle ? (
                                    <div className="ml-8 text-xs font-medium text-slate-400 flex items-center gap-1.5">
                                      <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                      {d.assignedVehicle.licensePlate} ({d.assignedVehicle.type})
                                    </div>
                                  ) : isPendingVehicle ? (
                                    <div className="ml-8 text-xs font-bold text-amber-400 flex items-center gap-1.5 bg-amber-500/10 px-2 py-1 rounded-md border border-amber-500/20 w-fit">
                                      <AlertTriangle className="w-3 h-3" />
                                      Vehicle Pending: Driver not clocked in
                                    </div>
                                  ) : (
                                    <div className="ml-8 text-xs text-slate-500">No Vehicle Assigned</div>
                                  )}
                                </div>
                              ) : (
                                <div className="text-sm text-slate-500 italic">External / No Transport</div>
                              )}
                            </div>

                            {/* 2. CARGO (Machines + Tools) */}
                            <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800/80">
                              <h4 className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                <Wrench className="w-3.5 h-3.5" /> Cargo
                              </h4>
                              
                              <div className="space-y-3">
                                {/* Legacy Machines fallback + New DispatchAssets */}
                                {d.machine && (
                                  <div className="text-sm font-semibold text-white flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                    {d.machine.machineId} <span className="text-xs text-slate-500 font-normal">({d.machine.type})</span>
                                  </div>
                                )}
                                {d.dispatchAssets?.map((da: any) => (
                                  <div key={da.id} className="text-sm font-semibold text-white flex items-center gap-2">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                    {da.machine.machineId} <span className="text-xs text-slate-500 font-normal">({da.machine.type})</span>
                                  </div>
                                ))}

                                {/* Tools */}
                                {d.dispatchTools?.length > 0 && (
                                  <div className="pt-2 border-t border-slate-800/50 mt-2 space-y-1">
                                    {d.dispatchTools.map((dt: any) => (
                                      <div key={dt.id} className="text-xs text-slate-300 flex items-center gap-2">
                                        <Hammer className="w-3 h-3 text-slate-500" />
                                        {dt.quantity}x {dt.tool.name} {dt.variant ? `(${dt.variant})` : ''}
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {!d.machine && (!d.dispatchAssets || d.dispatchAssets.length === 0) && (!d.dispatchTools || d.dispatchTools.length === 0) && (
                                  <div className="text-xs text-slate-500 italic">No cargo assigned</div>
                                )}
                              </div>
                            </div>

                            {/* 3. OPERATIONS (Crew) */}
                            <div className="bg-slate-950/50 rounded-xl p-4 border border-slate-800/80">
                              <h4 className="text-[10px] font-black text-amber-400 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                                <Users className="w-3.5 h-3.5" /> Operations
                              </h4>
                              
                              <div className="space-y-2">
                                {/* Operator */}
                                {d.operator && (
                                  <div className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-md bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold">
                                      <HardHat className="w-3.5 h-3.5" />
                                    </div>
                                    <span className="text-sm font-semibold text-white">{d.operator.name}</span>
                                    <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 rounded">OP</span>
                                  </div>
                                )}

                                {/* Multi Operators */}
                                {d.crewAssignments?.map((mo: any) => (
                                  <div key={mo.id} className="flex items-center gap-2">
                                    <div className="w-6 h-6 rounded-md bg-amber-500/20 text-amber-400 flex items-center justify-center text-xs font-bold">
                                      <HardHat className="w-3.5 h-3.5" />
                                    </div>
                                    <span className="text-sm font-semibold text-white">
                                      {mo.employee ? mo.employee.name : mo.externalName}
                                    </span>
                                    <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 rounded">OP</span>
                                  </div>
                                ))}

                                {/* Labor / Helpers */}
                                {d.dispatchLabor?.length > 0 && (
                                  <div className="pt-2 border-t border-slate-800/50 mt-2 space-y-1">
                                    {d.dispatchLabor.map((dl: any) => (
                                      <div key={dl.id} className="text-xs text-slate-300 flex flex-col gap-1">
                                        <div className="flex items-center gap-2">
                                          <Users className="w-3 h-3 text-slate-500" />
                                          <span className="font-semibold">{dl.employee ? dl.employee.name : dl.externalWorkerName}</span> (Crew Lead)
                                        </div>
                                        <div className="ml-5 text-slate-500">
                                          +{dl.helperCount} Helpers
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {!d.operator && (!d.crewAssignments || d.crewAssignments.length === 0) && (!d.dispatchLabor || d.dispatchLabor.length === 0) && (
                                  <div className="text-xs text-slate-500 italic">No operators assigned</div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ZONE 2: THE YARD (Idle/Base) */}
        <div className="space-y-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Clock className="w-5 h-5 text-slate-400" />
            The Yard (Idle)
          </h2>

          <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl p-5 shadow-xl space-y-6">
            
            {/* IDLE VEHICLES */}
            <div>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-800 pb-2 flex items-center gap-2">
                <Truck className="w-4 h-4" /> Vehicles ({idleVehicles.length})
              </h3>
              {idleVehicles.length === 0 ? (
                <p className="text-slate-600 text-xs italic">All vehicles deployed.</p>
              ) : (
                <ul className="space-y-1.5">
                  {idleVehicles.map((v, i) => (
                    <li key={i} className="flex justify-between items-center text-xs bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/50">
                      <span className="text-white font-bold">{v.licensePlate}</span>
                      <span className="text-slate-500">{v.type}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* IDLE MACHINES */}
            <div>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-800 pb-2 flex items-center gap-2">
                <Wrench className="w-4 h-4" /> Machines ({idleMachines.length})
              </h3>
              {idleMachines.length === 0 ? (
                <p className="text-slate-600 text-xs italic">All machines deployed.</p>
              ) : (
                <ul className="space-y-1.5">
                  {idleMachines.map((m, i) => (
                    <li key={i} className="flex justify-between items-center text-xs bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/50">
                      <span className="text-white font-bold">{m.machineId}</span>
                      <span className="text-slate-500">{m.type}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* IDLE TOOLS */}
            <div>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-800 pb-2 flex items-center gap-2">
                <Hammer className="w-4 h-4" /> Tools ({idleTools.length})
              </h3>
              {idleTools.length === 0 ? (
                <p className="text-slate-600 text-xs italic">All tools deployed.</p>
              ) : (
                <ul className="space-y-1.5">
                  {idleTools.map((t, i) => (
                    <li key={i} className="flex justify-between items-center text-xs bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/50">
                      <span className="text-white font-bold">{t.name}</span>
                      <span className="text-slate-500">{t.toolId}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* IDLE CREW */}
            <div>
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 border-b border-slate-800 pb-2 flex items-center gap-2">
                <Users className="w-4 h-4" /> Personnel ({idleEmployees.length})
              </h3>
              {idleEmployees.length === 0 ? (
                <p className="text-slate-600 text-xs italic">All crew deployed.</p>
              ) : (
                <ul className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
                  {idleEmployees.map((e, i) => (
                    <li key={i} className="flex justify-between items-center text-xs bg-slate-950/50 p-2.5 rounded-lg border border-slate-800/50">
                      <span className="text-white font-bold truncate max-w-[120px]">{e.name}</span>
                      <span className="text-slate-400 px-1.5 py-0.5 bg-slate-800 rounded font-medium">{e.role}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
