import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/serverAuth";
import { Role } from "@prisma/client";
import { notFound } from "next/navigation";
import dynamic from "next/dynamic";
import { format } from "date-fns";
import { MapPin, Info, ArrowLeft, Fuel, Banknote } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const DynamicAssetMap = dynamic(
  () => import("../../components/AssetMapClient"),
  { ssr: false }
);

interface MachineReportPageProps {
  params: { id: string };
  searchParams: { page?: string };
}

export default async function MachineReportPage({ params, searchParams }: MachineReportPageProps) {
  const session = await requireAuth({ allowedRoles: [Role.OWNER, Role.STAFF] });
  const isFinancialAuth = session.role === Role.OWNER || session.role === "ADMIN";

  const currentPage = Number(searchParams.page) || 1;
  const take = 10;
  const skip = (currentPage - 1) * take;

  const [machine, totalDispatches] = await Promise.all([
    prisma.machine.findUnique({
      where: { id: params.id },
      include: {
        dispatches: {
          orderBy: { dateOfService: "desc" },
          take: take,
          skip: skip,
        }
      }
    }),
    prisma.dailyDispatch.count({
      where: { machineId: params.id }
    })
  ]);

  if (!machine) {
    notFound();
  }

  const latestDispatch = machine.dispatches[0];
  const latitude = latestDispatch?.latitude ? Number(latestDispatch.latitude) : null;
  const longitude = latestDispatch?.longitude ? Number(latestDispatch.longitude) : null;
  
  const totalPages = Math.ceil(totalDispatches / take);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-8 font-sans">
      <div className="max-w-6xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="flex items-center gap-4">
          <Link href="/admin/fleet">
            <Button variant="outline" className="bg-slate-900 border-slate-700 hover:bg-slate-800 text-slate-300">
              <ArrowLeft className="w-4 h-4 mr-2" /> Back to Fleet
            </Button>
          </Link>
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">
            Machine Report: {machine.machineId}
          </h1>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-2">
              <Info className="w-5 h-5 text-indigo-400" />
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Status & Type</h3>
            </div>
            <p className="text-2xl font-bold text-white mb-1">{machine.type}</p>
            <span className={`px-2 py-1 rounded text-xs font-bold ${
                machine.status === 'AVAILABLE' ? 'bg-emerald-500/20 text-emerald-400' :
                machine.status === 'REPAIR' ? 'bg-red-500/20 text-red-400' :
                'bg-amber-500/20 text-amber-400'
              }`}>
              {machine.status}
            </span>
          </div>

          {isFinancialAuth ? (
            <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center gap-3 mb-2">
                <Banknote className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Op. Payout</h3>
              </div>
              <p className="text-3xl font-bold text-emerald-400">
                ₹{Number(machine.operatorDailyPayout).toFixed(2)}
              </p>
              <p className="text-xs text-slate-500 mt-1">Per day rate</p>
            </div>
          ) : (
            <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-xl flex items-center justify-center opacity-50">
              <p className="text-slate-500 text-sm font-semibold">Financial Data Masked</p>
            </div>
          )}

          {isFinancialAuth ? (
            <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-xl">
              <div className="flex items-center gap-3 mb-2">
                <Fuel className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Fuel Threshold</h3>
              </div>
              <p className="text-3xl font-bold text-amber-400">
                ₹{Number(machine.fuelConsumptionThreshold).toFixed(2)}
              </p>
              <p className="text-xs text-slate-500 mt-1">Expected daily usage</p>
            </div>
          ) : (
             <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-xl flex items-center justify-center opacity-50">
               <p className="text-slate-500 text-sm font-semibold">Financial Data Masked</p>
             </div>
          )}
        </div>

        {/* Map Section */}
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <MapPin className="text-indigo-400" /> Current Location
          </h2>
          <DynamicAssetMap 
            latitude={latitude}
            longitude={longitude}
            label={latestDispatch?.location || "Unknown Location"}
          />
        </div>

        {/* History Table */}
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-xl font-bold mb-4">Dispatch History</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-slate-900/80 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4 whitespace-nowrap">Date</th>
                  <th className="px-6 py-4 whitespace-nowrap">Location</th>
                  <th className="px-6 py-4 whitespace-nowrap">Status</th>
                  {isFinancialAuth && <th className="px-6 py-4 whitespace-nowrap text-right">Revenue (₹)</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {machine.dispatches.map((dispatch) => (
                  <tr key={dispatch.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 text-slate-300 whitespace-nowrap">
                      {format(new Date(dispatch.dateOfService), 'PPP')}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-200">
                      {dispatch.location}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        dispatch.status === 'COMPLETED' ? 'bg-emerald-500/20 text-emerald-400' :
                        dispatch.status === 'PENDING' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-blue-500/20 text-blue-400'
                      }`}>
                        {dispatch.status}
                      </span>
                    </td>
                    {isFinancialAuth && (
                      <td className="px-6 py-4 text-right font-mono text-emerald-400">
                        {Number(dispatch.customerCharge).toFixed(2)}
                      </td>
                    )}
                  </tr>
                ))}
                {machine.dispatches.length === 0 && (
                  <tr>
                    <td colSpan={isFinancialAuth ? 4 : 3} className="px-6 py-8 text-center text-slate-500">
                      No dispatch history found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-800">
              <p className="text-sm text-slate-400">
                Showing page {currentPage} of {totalPages}
              </p>
              <div className="flex gap-2">
                <Link href={`/admin/fleet/machine/${params.id}?page=${Math.max(1, currentPage - 1)}`}>
                  <Button variant="outline" disabled={currentPage === 1} className="bg-slate-900 border-slate-700 text-slate-300">
                    Previous
                  </Button>
                </Link>
                <Link href={`/admin/fleet/machine/${params.id}?page=${Math.min(totalPages, currentPage + 1)}`}>
                  <Button variant="outline" disabled={currentPage === totalPages} className="bg-slate-900 border-slate-700 text-slate-300">
                    Next
                  </Button>
                </Link>
              </div>
            </div>
          )}
        </div>
        
      </div>
    </div>
  );
}
