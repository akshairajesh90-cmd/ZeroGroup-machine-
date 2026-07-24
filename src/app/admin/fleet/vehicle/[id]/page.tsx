import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/serverAuth";
import { Role } from "@prisma/client";
import { notFound } from "next/navigation";
import dynamic from "next/dynamic";
import { format, startOfDay, endOfDay } from "date-fns";
import { MapPin, Info, ArrowLeft, Truck, User } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const DynamicAssetMap = dynamic(
  () => import("../../components/AssetMapClient"),
  { ssr: false }
);

interface VehicleReportPageProps {
  params: { id: string };
  searchParams: { page?: string };
}

export default async function VehicleReportPage({ params, searchParams }: VehicleReportPageProps) {
  await requireAuth({ allowedRoles: [Role.OWNER, Role.STAFF] });
  // Vehicles don't have direct financial metrics on their summary card currently, 
  // but if we had expense tracking here, we would mask it based on role.

  const currentPage = Number(searchParams.page) || 1;
  const take = 10;
  const skip = (currentPage - 1) * take;

  const [vehicle, totalShiftLogs] = await Promise.all([
    prisma.vehicle.findUnique({
      where: { id: params.id },
      include: {
        shiftLogs: {
          orderBy: { date: "desc" },
          take: take,
          skip: skip,
          include: { driver: true }
        }
      }
    }),
    prisma.shiftLog.count({
      where: { vehicleId: params.id }
    })
  ]);

  if (!vehicle) {
    notFound();
  }

  // --- Vehicle Location Logic (CRITICAL) ---
  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());

  let latitude: number | null = null;
  let longitude: number | null = null;
  let locationLabel = "Base / Warehouse";

  // 1. Time-Bound Rule: Find ShiftLog for TODAY
  const todayShift = await prisma.shiftLog.findFirst({
    where: {
      vehicleId: vehicle.id,
      date: {
        gte: todayStart,
        lte: todayEnd,
      }
    },
    include: { driver: true },
    orderBy: { startTime: "desc" }
  });

  if (todayShift) {
    // 2. Find Driver's Active Dispatch for TODAY
    const activeDispatch = await prisma.dailyDispatch.findFirst({
      where: {
        driverId: todayShift.driverId,
        dateOfService: {
          gte: todayStart,
          lte: todayEnd,
        },
        status: { in: ['EN_ROUTE', 'IN_PROGRESS'] }
      },
      orderBy: { dateOfService: "desc" }
    });

    if (activeDispatch && activeDispatch.latitude && activeDispatch.longitude) {
      latitude = Number(activeDispatch.latitude);
      longitude = Number(activeDispatch.longitude);
      locationLabel = activeDispatch.location;
    } else {
       locationLabel = `Assigned to ${todayShift.driver.name} (No active GPS dispatch)`;
    }
  }

  const totalPages = Math.ceil(totalShiftLogs / take);

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
          <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">
            Vehicle Report: {vehicle.licensePlate}
          </h1>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-2">
              <Info className="w-5 h-5 text-indigo-400" />
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Status & Type</h3>
            </div>
            <p className="text-2xl font-bold text-white mb-1">{vehicle.type}</p>
            <span className={`px-2 py-1 rounded text-xs font-bold ${
                vehicle.status === 'AVAILABLE' ? 'bg-emerald-500/20 text-emerald-400' :
                vehicle.status === 'REPAIR' ? 'bg-red-500/20 text-red-400' :
                'bg-slate-500/20 text-slate-400'
              }`}>
              {vehicle.status}
            </span>
          </div>

          <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-2">
              <Truck className="w-5 h-5 text-blue-400" />
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">License Plate</h3>
            </div>
            <p className="text-3xl font-bold font-mono text-slate-200">
              {vehicle.licensePlate}
            </p>
            <p className="text-xs text-slate-500 mt-1">Official Registration</p>
          </div>
        </div>

        {/* Map Section */}
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <MapPin className="text-indigo-400" /> Current Location
          </h2>
          <DynamicAssetMap 
            latitude={latitude}
            longitude={longitude}
            label={locationLabel}
          />
        </div>

        {/* History Table */}
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-xl font-bold mb-4">Shift History</h2>
          
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs uppercase bg-slate-900/80 text-slate-400 border-b border-slate-800">
                <tr>
                  <th className="px-6 py-4 whitespace-nowrap">Date</th>
                  <th className="px-6 py-4 whitespace-nowrap">Driver</th>
                  <th className="px-6 py-4 whitespace-nowrap">Start Time</th>
                  <th className="px-6 py-4 whitespace-nowrap">End Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {vehicle.shiftLogs.map((shift) => (
                  <tr key={shift.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="px-6 py-4 text-slate-300 whitespace-nowrap">
                      {format(new Date(shift.date), 'PPP')}
                    </td>
                    <td className="px-6 py-4 font-medium text-slate-200 flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-400" />
                      {shift.driver?.name || "Unknown"}
                    </td>
                    <td className="px-6 py-4 text-slate-400 font-mono">
                      {format(new Date(shift.startTime), 'p')}
                    </td>
                    <td className="px-6 py-4 text-slate-400 font-mono">
                      {shift.endTime ? format(new Date(shift.endTime), 'p') : "Active"}
                    </td>
                  </tr>
                ))}
                {vehicle.shiftLogs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                      No shift history found.
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
                <Link href={`/admin/fleet/vehicle/${params.id}?page=${Math.max(1, currentPage - 1)}`}>
                  <Button variant="outline" disabled={currentPage === 1} className="bg-slate-900 border-slate-700 text-slate-300">
                    Previous
                  </Button>
                </Link>
                <Link href={`/admin/fleet/vehicle/${params.id}?page=${Math.min(totalPages, currentPage + 1)}`}>
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
