import { requireAuth } from "@/lib/serverAuth";
import { prisma } from "@/lib/prisma";
import nextDynamic from "next/dynamic";
import { redirect } from "next/navigation";
import { startOfDay, endOfDay } from "date-fns";
import Link from "next/link";
import { MapPin, Navigation, Truck, Phone } from "lucide-react";

export const dynamic = "force-dynamic";

const LiveMap = nextDynamic(() => import("@/components/LiveMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full bg-zinc-900 animate-pulse flex items-center justify-center">
      <span className="text-zinc-500 font-medium text-xs">Loading Live Route Map...</span>
    </div>
  ),
});

export default async function DriverLiveMapPage() {
  const { role, employeeId } = await requireAuth();

  // For security, only allow drivers or staff/owners
  if (role !== "DRIVER" && role !== "STAFF" && role !== "OWNER" && role !== "ADMIN") {
    redirect("/");
  }

  const isGodMode = ["ADMIN", "OWNER"].includes(role);
  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());

  const dispatches = await prisma.dailyDispatch.findMany({
    where: {
      ...(isGodMode ? {} : { driverId: employeeId }),
      dateOfService: { gte: todayStart, lte: todayEnd },
      isPendingDelete: false,
    },
    include: {
      customer: { select: { name: true, phone: true } },
      machine: { select: { machineId: true, type: true } },
      vehicle: { select: { id: true, licensePlate: true, type: true } },
      driver: { select: { id: true, name: true, lastLatitude: true, lastLongitude: true } },
    },
    orderBy: { routeStopOrder: "asc" },
  });

  const locationMap = new Map<string, any>();
  dispatches.forEach((d) => {
    const loc = d.location;
    if (!locationMap.has(loc)) {
      locationMap.set(loc, {
        location: loc,
        latitude: d.latitude ? Number(d.latitude) : null,
        longitude: d.longitude ? Number(d.longitude) : null,
        dispatches: [],
      });
    }
    locationMap.get(loc).dispatches.push({
      ...d,
      latitude: d.latitude ? Number(d.latitude) : null,
      longitude: d.longitude ? Number(d.longitude) : null,
      assignedVehicle: d.vehicle,
    });
  });

  const sites = Array.from(locationMap.values());

  return (
    <div className="space-y-4">
      <div className="pt-2 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-white">Live Route Map</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            {dispatches.length} Trip Stop{dispatches.length === 1 ? "" : "s"} Scheduled Today
          </p>
        </div>
      </div>
      
      {/* Map Container */}
      <div className="h-[calc(100dvh-18rem)] min-h-[380px] w-full rounded-2xl overflow-hidden border border-slate-800 shadow-xl">
        <LiveMap sites={sites} />
      </div>

      {/* Ordered Route Stop Cards */}
      {dispatches.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-400">Today&apos;s Route Itinerary</h2>
          <div className="space-y-2">
            {dispatches.map((d, idx) => (
              <div key={d.id} className="bg-slate-900 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="w-7 h-7 rounded-full bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center text-xs font-black shrink-0">
                    {idx + 1}
                  </span>
                  <div>
                    <h3 className="text-sm font-bold text-white">{d.customer?.name}</h3>
                    <p className="text-xs text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                      {d.location}
                    </p>
                    {d.vehicle && (
                      <p className="text-[11px] font-mono text-cyan-400 flex items-center gap-1 mt-0.5">
                        <Truck className="w-3 h-3 shrink-0" />
                        {d.vehicle.licensePlate} ({d.vehicle.type})
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {d.mapLink && (
                    <a
                      href={d.mapLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-400 transition-colors"
                      title="Navigate"
                    >
                      <Navigation className="w-4 h-4" />
                    </a>
                  )}
                  <Link
                    href={`/driver/orders/${d.id}`}
                    className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-all"
                  >
                    View
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
