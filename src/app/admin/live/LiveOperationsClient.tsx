"use client";

import React, { useTransition } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, MapPin, Truck, Wrench, Users, CheckCircle2, Clock } from "lucide-react";

// Types derived from Server Component serialization
interface DeployedSite {
  location: string;
  dispatches: any[];
}

interface LiveOperationsClientProps {
  deployedSites: DeployedSite[];
  idleMachines: any[];
  idleEmployees: any[];
}

export default function LiveOperationsClient({ 
  deployedSites, 
  idleMachines, 
  idleEmployees 
}: LiveOperationsClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Refresh Radar Function
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
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-bold transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-5 h-5 ${isPending ? "animate-spin" : ""}`} />
          Refresh Radar
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* ZONE 1: ACTIVE SITES (Deployed) */}
        <div className="lg:col-span-2 space-y-6">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            Active Sites ({deployedSites.length})
          </h2>
          
          {deployedSites.length === 0 ? (
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-8 text-center text-slate-500">
              No active dispatches currently on site.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {deployedSites.map((site, idx) => (
                <div key={idx} className="bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-xl p-5 shadow-xl relative overflow-hidden group">
                  <h3 className="text-lg font-bold text-white mb-4 border-b border-slate-800 pb-2">{site.location}</h3>
                  
                  <div className="space-y-4">
                    {site.dispatches.map((d, dIdx) => (
                      <div key={dIdx} className="bg-slate-800/50 rounded-lg p-3 text-sm border-l-4 border-emerald-500">
                        {/* Status Indicator */}
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-xs font-bold px-2 py-1 rounded ${d.status === 'PENDING' ? 'bg-amber-500/20 text-amber-400' : 'bg-emerald-500/20 text-emerald-400'}`}>
                            {d.status === 'PENDING' ? 'EN ROUTE' : 'IN PROGRESS'}
                          </span>
                        </div>
                        
                        {/* Asset Details */}
                        <div className="space-y-1 text-slate-300">
                          {d.machine && (
                            <div className="flex items-center gap-2">
                              <Wrench className="w-4 h-4 text-slate-400" />
                              <span className="font-semibold text-white">{d.machine.machineId}</span> ({d.machine.type})
                            </div>
                          )}
                          {d.operator && (
                            <div className="flex items-center gap-2">
                              <Users className="w-4 h-4 text-slate-400" />
                              Opr: <span className="font-semibold text-white">{d.operator.name}</span>
                            </div>
                          )}
                          {d.driver && (
                            <div className="flex items-center gap-2">
                              <Truck className="w-4 h-4 text-slate-400" />
                              Driver: <span className="font-semibold text-white">{d.driver.name}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
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

          <div className="bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-xl p-5 shadow-xl">
            <div className="mb-6">
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 border-b border-slate-800 pb-2">
                Available Machines ({idleMachines.length})
              </h3>
              {idleMachines.length === 0 ? (
                <p className="text-slate-600 text-sm">All machines deployed.</p>
              ) : (
                <ul className="space-y-2">
                  {idleMachines.map((m, i) => (
                    <li key={i} className="flex justify-between items-center text-sm bg-slate-800/30 p-2 rounded">
                      <span className="text-white font-medium">{m.machineId}</span>
                      <span className="text-slate-500">{m.type}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div>
              <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 border-b border-slate-800 pb-2">
                Available Crew ({idleEmployees.length})
              </h3>
              {idleEmployees.length === 0 ? (
                <p className="text-slate-600 text-sm">All crew deployed.</p>
              ) : (
                <ul className="space-y-2">
                  {idleEmployees.map((e, i) => (
                    <li key={i} className="flex justify-between items-center text-sm bg-slate-800/30 p-2 rounded">
                      <span className="text-white font-medium">{e.name}</span>
                      <span className="text-slate-500 text-xs px-2 py-1 bg-slate-800 rounded">{e.role}</span>
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
