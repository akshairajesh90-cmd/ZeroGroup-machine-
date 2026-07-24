import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay } from "date-fns";
import { requireAuth } from "@/lib/serverAuth";
import { Role } from "@prisma/client";
import dynamic from "next/dynamic";

export const dynamicConfig = "force-dynamic";

// 1. SSR Crash Preventer: Load Leaflet Map purely on the client side
const LiveMapClient = dynamic(() => import("./LiveMapClient"), { 
  ssr: false,
  loading: () => (
    <div className="w-full h-[600px] bg-slate-900 animate-pulse flex items-center justify-center rounded-2xl border border-slate-800">
      <span className="text-slate-500 font-medium">Initializing GPS Systems...</span>
    </div>
  )
});

export default async function LiveMapPage() {
  // Enforce security
  await requireAuth({ allowedRoles: [Role.OWNER, Role.STAFF] });

  const todayStart = startOfDay(new Date());
  const todayEnd = endOfDay(new Date());

  // 2. Fetch Active Dispatches with GPS Data
  const activeDispatches = await prisma.dailyDispatch.findMany({
    where: {
      dateOfService: { gte: todayStart, lte: todayEnd },
      status: { in: ["PENDING", "DELIVERED"] }, // EN_ROUTE and IN_PROGRESS equivalents
      latitude: { not: null },
      longitude: { not: null }
    },
    include: {
      machine: true,
      operator: true
    }
  });

  // 3. Serialize Decimal Coordinates to JS Numbers
  const serializedDispatches = activeDispatches.map(dispatch => ({
    id: dispatch.id,
    location: dispatch.location,
    latitude: Number(dispatch.latitude),
    longitude: Number(dispatch.longitude),
    status: dispatch.status,
    machineId: dispatch.machine?.machineId || "Independent Crew",
    machineType: dispatch.machine?.type || "Labor",
    operatorName: dispatch.operator?.name || "No Operator"
  }));

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
          Admin GPS Map
        </h1>
        <p className="text-slate-400 mt-2 text-sm font-medium">
          Live satellite telemetry of deployed fleet and personnel.
        </p>
      </div>

      <div className="rounded-2xl overflow-hidden border border-slate-800 shadow-2xl relative z-0">
        <LiveMapClient dispatches={serializedDispatches} />
      </div>
    </div>
  );
}
