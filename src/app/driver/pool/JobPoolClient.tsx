"use client";

import { useState } from "react";
import { format } from "date-fns";
import { claimDispatchAsDriver } from "./actions";
import { toast } from "sonner";
import { 
  MapPin, Clock, Truck, 
  ArrowRightLeft, PlusCircle, Navigation 
} from "lucide-react";
import { useRouter } from "next/navigation";

type Job = {
  id: string;
  location: string;
  dateOfService: string;
  status: string;
  driverId: string | null;
  driverName?: string;
  customerName?: string;
  machineId?: string;
  isToday: boolean;
};

export default function JobPoolClient({ 
  jobs, 
  currentEmployeeId 
}: { 
  jobs: Job[], 
  currentEmployeeId: string 
}) {
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const router = useRouter();

  const handleClaim = async (jobId: string, isSwap: boolean) => {
    if (claimingId) return;
    setClaimingId(jobId);
    
    try {
      const res = await claimDispatchAsDriver(jobId);
      if (res.success) {
        toast.success(isSwap ? "Job swapped successfully!" : "Job claimed successfully!");
        router.refresh();
      } else {
        toast.error(res.error || "Failed to claim job.");
      }
    } catch (err) {
      toast.error("Network error.");
    } finally {
      setClaimingId(null);
    }
  };

  const myJobs = jobs.filter(j => j.driverId === currentEmployeeId);
  const otherJobs = jobs.filter(j => j.driverId !== currentEmployeeId);

  return (
    <div className="min-h-screen bg-zinc-950 font-sans text-white p-6 pb-24">
      {/* Header */}
      <header className="mb-6">
        <h1 className="text-2xl font-black tracking-tight text-white">Job Pool</h1>
        <p className="text-xs text-zinc-500 font-bold tracking-widest uppercase mt-1">
          Select or swap your next run
        </p>
      </header>

      <div className="space-y-6">
        {/* My Claimed Jobs */}
        {myJobs.length > 0 && (
          <section>
            <h2 className="text-[11px] font-black uppercase tracking-widest text-emerald-500 mb-3 flex items-center gap-2">
              <Navigation className="w-3 h-3" />
              My Claimed Jobs
            </h2>
            <div className="space-y-3">
              {myJobs.map(job => (
                <div key={job.id} className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 shadow-xl">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                      CLAIMED BY YOU
                    </span>
                    <span className="text-[10px] text-emerald-600 font-black uppercase">{job.isToday ? "TODAY" : "TOMORROW"}</span>
                  </div>
                  <h3 className="text-base font-black text-white">{job.customerName || "Unknown Client"}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <MapPin className="w-3 h-3 text-emerald-400 shrink-0" />
                    <p className="text-sm font-medium text-emerald-100">{job.location}</p>
                  </div>
                  {job.machineId && (
                    <div className="flex items-center gap-2 mt-1">
                      <Truck className="w-3 h-3 text-emerald-400 shrink-0" />
                      <p className="text-xs font-medium text-emerald-300">{job.machineId}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Available Jobs */}
        <section>
          <h2 className="text-[11px] font-black uppercase tracking-widest text-zinc-500 mb-3 flex items-center gap-2">
            <Clock className="w-3 h-3" />
            Available / Swap Pool
          </h2>
          
          {otherJobs.length === 0 ? (
            <div className="bg-zinc-900/60 border border-zinc-800 rounded-2xl p-6 text-center">
              <p className="text-sm font-bold text-zinc-500">No available jobs in the pool right now.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {otherJobs.map(job => {
                const isUnassigned = !job.driverId;
                const isSwap = !isUnassigned;

                return (
                  <div key={job.id} className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
                    <div className="p-4 border-b border-zinc-800">
                      <div className="flex justify-between items-start mb-2">
                        {isUnassigned ? (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                            UNASSIGNED
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                            CLAIMED: {job.driverName}
                          </span>
                        )}
                        <span className="text-[10px] text-zinc-500 font-black uppercase">
                          {job.isToday ? "TODAY" : "TOMORROW"}
                        </span>
                      </div>
                      
                      <h3 className="text-lg font-black text-white">{job.customerName || "Unknown Client"}</h3>
                      
                      <div className="flex items-center gap-2 mt-2">
                        <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                        <p className="text-sm font-medium text-zinc-300">{job.location}</p>
                      </div>
                      
                      {job.machineId && (
                        <div className="flex items-center gap-2 mt-1">
                          <Truck className="w-3.5 h-3.5 text-zinc-500 shrink-0" />
                          <p className="text-xs font-medium text-zinc-500">{job.machineId}</p>
                        </div>
                      )}
                    </div>
                    
                    <button
                      disabled={claimingId === job.id}
                      onClick={() => handleClaim(job.id, isSwap)}
                      className={`w-full py-4 text-sm font-black transition-all flex items-center justify-center gap-2 disabled:opacity-50 ${
                        isSwap 
                          ? "bg-zinc-800 hover:bg-zinc-700 text-white" 
                          : "bg-amber-500 hover:bg-amber-400 text-zinc-950"
                      }`}
                    >
                      {claimingId === job.id ? (
                        "PROCESSING..."
                      ) : isSwap ? (
                        <><ArrowRightLeft className="w-4 h-4" /> SWAP / TAKE OVER</>
                      ) : (
                        <><PlusCircle className="w-4 h-4" /> CLAIM JOB</>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
