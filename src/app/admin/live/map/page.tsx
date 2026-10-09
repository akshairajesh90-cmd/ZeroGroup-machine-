import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay, subDays, startOfWeek, endOfWeek } from "date-fns";
import { requireAuth } from "@/lib/serverAuth";
import { Role } from "@prisma/client";
import nextDynamic from "next/dynamic";

export const dynamic = "force-dynamic";

const LiveMapClient = nextDynamic(() => import("./LiveMapClient"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[600px] bg-slate-900 animate-pulse flex items-center justify-center rounded-2xl border border-slate-800">
      <span className="text-slate-500 font-medium">Initializing GPS Systems...</span>
    </div>
  )
});

export default async function LiveMapPage({
  searchParams
}: {
  searchParams?: { view?: string; date?: string }
}) {
  await requireAuth({ allowedRoles: [Role.OWNER, Role.ADMIN, Role.STAFF] });

  const view = searchParams?.view || "today";
  const customDate = searchParams?.date;

  let rangeStart: Date;
  let rangeEnd: Date;

  if (view === "weekly") {
    rangeStart = startOfWeek(new Date(), { weekStartsOn: 1 }); // Monday
    rangeEnd = endOfWeek(new Date(), { weekStartsOn: 1 });     // Sunday
  } else if (view === "date" && customDate) {
    const parsed = new Date(customDate);
    rangeStart = startOfDay(parsed);
    rangeEnd = endOfDay(parsed);
  } else {
    // Default: today
    rangeStart = startOfDay(new Date());
    rangeEnd = endOfDay(new Date());
  }

  // 1. Fetch field employees who have GPS pings in the time range
  const fieldEmployees = await prisma.employee.findMany({
    where: {
      role: { in: ["DRIVER", "OPERATOR"] },
      lastLatitude: { not: null },
      lastLongitude: { not: null },
      lastLocationUpdate: {
        gte: view === "today" ? new Date(Date.now() - 24 * 60 * 60 * 1000) : rangeStart,
        lte: rangeEnd,
      },
    },
    include: {
      // Get their dispatches in the range to find machine assignment
      operatorDispatches: {
        where: {
          dateOfService: { gte: rangeStart, lte: rangeEnd },
          isPendingDelete: false,
        },
        include: { machine: true, customer: true },
        orderBy: { dateOfService: "desc" },
        take: 1,
      },
      driverDispatches: {
        where: {
          dateOfService: { gte: rangeStart, lte: rangeEnd },
          isPendingDelete: false,
        },
        include: { machine: true, customer: true },
        orderBy: { dateOfService: "desc" },
        take: 1,
      },
    },
  });

  // 2. Also fetch today's dispatches for crew assignment lookup
  const allDispatches = await prisma.dailyDispatch.findMany({
    where: {
      dateOfService: { gte: rangeStart, lte: rangeEnd },
      isPendingDelete: false,
    },
    include: {
      machine: true,
      customer: true,
      operator: { select: { id: true, name: true } },
      driver: { select: { id: true, name: true } },
      crewAssignments: {
        include: { employee: { select: { id: true, name: true } } }
      }
    }
  });

  // Build a quick employee→dispatch lookup map
  const empDispatchMap = new Map<string, any>();
  allDispatches.forEach(d => {
    if (d.operatorId) {
      if (!empDispatchMap.has(d.operatorId)) empDispatchMap.set(d.operatorId, d);
    }
    if (d.driverId) {
      if (!empDispatchMap.has(d.driverId)) empDispatchMap.set(d.driverId, d);
    }
    d.crewAssignments?.forEach(ca => {
      if (ca.employeeId && !empDispatchMap.has(ca.employeeId)) {
        empDispatchMap.set(ca.employeeId, d);
      }
    });
  });

  // 3. Serialize for the client
  const pins = fieldEmployees
    .filter(e => e.lastLatitude !== null && e.lastLongitude !== null)
    .map(emp => {
      const dispatch = empDispatchMap.get(emp.id)
        || emp.operatorDispatches?.[0]
        || emp.driverDispatches?.[0];
      return {
        id: emp.id,
        name: emp.name,
        role: emp.role,
        latitude: Number(emp.lastLatitude),
        longitude: Number(emp.lastLongitude),
        lastUpdate: emp.lastLocationUpdate?.toISOString() || null,
        machineId: dispatch?.machine?.machineId || null,
        machineType: dispatch?.machine?.type || null,
        customerName: dispatch?.customer?.name || null,
        dispatchLocation: dispatch?.location || null,
        dispatchStatus: dispatch?.status || null,
      };
    });

  // 4. Weekly summary: group dispatches by date for the stats panel
  const dateSummary: Record<string, number> = {};
  if (view === "weekly") {
    allDispatches.forEach(d => {
      const key = new Date(d.dateOfService).toISOString().split("T")[0];
      dateSummary[key] = (dateSummary[key] || 0) + 1;
    });
  }

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30">
              📍
            </span>
            Live GPS Command Map
          </h1>
          <p className="text-slate-400 mt-1.5 text-sm font-medium">
            Real-time location of Operators and Drivers — pings every 5 min (Operators) / 15 min (Drivers).
          </p>
        </div>

        {/* View Toggle + Date Picker */}
        <form method="GET" className="flex items-center gap-2 flex-wrap">
          <a
            href="/admin/live/map?view=today"
            className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${view === "today" ? "bg-indigo-500/20 text-indigo-400 border-indigo-500/40" : "bg-slate-900 text-slate-400 border-slate-700 hover:text-white"}`}
          >
            Today
          </a>
          <a
            href="/admin/live/map?view=weekly"
            className={`px-4 py-2 rounded-xl text-sm font-bold border transition-all ${view === "weekly" ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40" : "bg-slate-900 text-slate-400 border-slate-700 hover:text-white"}`}
          >
            This Week
          </a>
          <div className="flex items-center gap-2">
            <input
              type="date"
              name="date"
              defaultValue={customDate || ""}
              className="bg-slate-900 border border-slate-700 text-slate-300 text-sm rounded-xl px-3 py-2 focus:border-indigo-500 outline-none"
            />
            <button
              type="submit"
              name="view"
              value="date"
              className="px-4 py-2 rounded-xl text-sm font-bold bg-slate-800 border border-slate-700 text-slate-300 hover:text-white transition-all"
            >
              Go
            </button>
          </div>
        </form>
      </div>

      {/* Weekly Stats Bar */}
      {view === "weekly" && Object.keys(dateSummary).length > 0 && (
        <div className="grid grid-cols-7 gap-2">
          {Object.entries(dateSummary).sort(([a], [b]) => a.localeCompare(b)).map(([date, count]) => (
            <a
              key={date}
              href={`/admin/live/map?view=date&date=${date}`}
              className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-center hover:border-indigo-500/50 transition-all group"
            >
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
                {new Date(date).toLocaleDateString("en-IN", { weekday: "short" })}
              </div>
              <div className="text-lg font-black text-white mt-1 group-hover:text-indigo-400">{count}</div>
              <div className="text-[10px] text-slate-500">dispatches</div>
            </a>
          ))}
        </div>
      )}

      {/* Active Field Personnel Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="text-2xl font-black text-white">{pins.length}</div>
          <div className="text-xs text-slate-400 font-semibold mt-1">Active on Map</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="text-2xl font-black text-cyan-400">{pins.filter(p => p.role === "DRIVER").length}</div>
          <div className="text-xs text-slate-400 font-semibold mt-1">Drivers Tracking</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="text-2xl font-black text-orange-400">{pins.filter(p => p.role === "OPERATOR").length}</div>
          <div className="text-xs text-slate-400 font-semibold mt-1">Operators Tracking</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="text-2xl font-black text-emerald-400">{allDispatches.length}</div>
          <div className="text-xs text-slate-400 font-semibold mt-1">Total Dispatches</div>
        </div>
      </div>

      {/* Map */}
      <div className="rounded-2xl overflow-hidden border border-slate-800 shadow-2xl" style={{ height: "550px" }}>
        <LiveMapClient pins={pins} />
      </div>

      {/* Personnel List below map */}
      {pins.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800">
            <h2 className="text-sm font-black text-white uppercase tracking-widest">Field Personnel — Last Known Positions</h2>
          </div>
          <div className="divide-y divide-slate-800/60">
            {pins.map(pin => (
              <div key={pin.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-800/30 transition-colors">
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${pin.role === "DRIVER" ? "bg-cyan-500/20 text-cyan-400" : "bg-orange-500/20 text-orange-400"}`}>
                    {pin.role}
                  </span>
                  <span className="text-white font-bold text-sm">{pin.name}</span>
                  {pin.machineId && (
                    <span className="text-slate-500 text-xs">— {pin.machineId} {pin.machineType ? `(${pin.machineType})` : ""}</span>
                  )}
                  {pin.customerName && (
                    <span className="text-slate-500 text-xs">@ {pin.customerName}</span>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-xs text-slate-400 font-mono">
                    {pin.lastUpdate ? new Date(pin.lastUpdate).toLocaleTimeString("en-IN") : "—"}
                  </div>
                  <div className="text-[10px] text-slate-600 font-mono">
                    {pin.latitude.toFixed(4)}, {pin.longitude.toFixed(4)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {pins.length === 0 && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center">
          <div className="text-4xl mb-3">📡</div>
          <h3 className="text-white font-bold">No Active GPS Pings</h3>
          <p className="text-slate-400 text-sm mt-1">
            No Operators or Drivers have pinged their location
            {view === "today" ? " in the last 24 hours." : " for this date range."}
          </p>
        </div>
      )}

    </div>
  );
}
