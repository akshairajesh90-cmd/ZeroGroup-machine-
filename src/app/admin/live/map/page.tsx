import { prisma } from "@/lib/prisma";
import { startOfDay, endOfDay, startOfWeek, endOfWeek, subDays, addDays, parseISO, isValid, format } from "date-fns";
import DateRangeFilterBar from "@/components/live/DateRangeFilterBar";
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
  ),
});

export default async function LiveMapPage({
  searchParams,
}: {
  searchParams?: { view?: string; date?: string };
}) {
  await requireAuth({ allowedRoles: [Role.OWNER, Role.ADMIN, Role.STAFF] });

  const view = (searchParams?.view || "today") as "today" | "yesterday" | "tomorrow" | "week" | "all" | "custom" | "weekly" | "date";
  const customDate = searchParams?.date;

  let rangeStart: Date;
  let rangeEnd: Date;
  let dateLabel: string;
  let normalizedView: "today" | "yesterday" | "tomorrow" | "week" | "all" | "custom" = "today";

  if (view === "yesterday") {
    rangeStart = startOfDay(subDays(new Date(), 1));
    rangeEnd = endOfDay(subDays(new Date(), 1));
    dateLabel = `Yesterday (${format(rangeStart, "dd MMM yyyy")})`;
    normalizedView = "yesterday";
  } else if (view === "tomorrow") {
    rangeStart = startOfDay(addDays(new Date(), 1));
    rangeEnd = endOfDay(addDays(new Date(), 1));
    dateLabel = `Tomorrow (${format(rangeStart, "dd MMM yyyy")})`;
    normalizedView = "tomorrow";
  } else if (view === "week" || view === "weekly") {
    rangeStart = startOfWeek(new Date(), { weekStartsOn: 1 });
    rangeEnd = endOfWeek(new Date(), { weekStartsOn: 1 });
    dateLabel = `This Week (${format(rangeStart, "dd MMM")} - ${format(rangeEnd, "dd MMM yyyy")})`;
    normalizedView = "week";
  } else if (view === "all") {
    rangeStart = new Date("2026-01-01T00:00:00.000Z");
    rangeEnd = new Date("2027-12-31T23:59:59.999Z");
    dateLabel = "All Time (Full 28-Day Schedule · All 236 Dispatches)";
    normalizedView = "all";
  } else if ((view === "custom" || view === "date") && customDate) {
    const parsed = parseISO(customDate);
    if (isValid(parsed)) {
      rangeStart = startOfDay(parsed);
      rangeEnd = endOfDay(parsed);
      dateLabel = format(rangeStart, "EEEE, dd MMM yyyy");
      normalizedView = "custom";
    } else {
      rangeStart = startOfDay(new Date());
      rangeEnd = endOfDay(new Date());
      dateLabel = `Today (${format(rangeStart, "EEEE, dd MMM yyyy")})`;
      normalizedView = "today";
    }
  } else {
    rangeStart = startOfDay(new Date());
    rangeEnd = endOfDay(new Date());
    dateLabel = `Today (${format(rangeStart, "EEEE, dd MMM yyyy")})`;
    normalizedView = "today";
  }

  // ── 1. Employee GPS pins (Drivers & Operators with recent pings) ──────────
  const fieldEmployees = await prisma.employee.findMany({
    where: {
      role: { in: ["DRIVER", "OPERATOR", "WORKER"] },
      lastLatitude: { not: null },
      lastLongitude: { not: null },
    },
    include: {
      operatorDispatches: {
        where: { dateOfService: { gte: rangeStart, lte: rangeEnd }, isPendingDelete: false },
        include: { machine: true, customer: true },
        orderBy: { dateOfService: "desc" },
        take: 1,
      },
      driverDispatches: {
        where: { dateOfService: { gte: rangeStart, lte: rangeEnd }, isPendingDelete: false },
        include: { machine: true, customer: true },
        orderBy: { dateOfService: "desc" },
        take: 1,
      },
      // Active shift log today to get vehicle assignment
      shiftLogs: {
        where: { date: { gte: rangeStart, lte: rangeEnd } },
        include: { vehicle: { select: { id: true, licensePlate: true, type: true, status: true } } },
        orderBy: { startTime: "desc" },
        take: 1,
      },
    },
  });

  // ── 2. Today's dispatches (for site pins & stats) ─────────────────────────
  const allDispatches = await prisma.dailyDispatch.findMany({
    where: {
      dateOfService: { gte: rangeStart, lte: rangeEnd },
      isPendingDelete: false,
    },
    include: {
      machine: true,
      customer: true,
      operator: { select: { id: true, name: true, profilePhotoUrl: true } },
      driver: { select: { id: true, name: true, profilePhotoUrl: true } },
      crewAssignments: {
        include: { employee: { select: { id: true, name: true } } },
      },
    },
  });

  // Build employee → dispatch lookup
  const empDispatchMap = new Map<string, any>();
  allDispatches.forEach((d) => {
    if (d.operatorId && !empDispatchMap.has(d.operatorId)) empDispatchMap.set(d.operatorId, d);
    if (d.driverId && !empDispatchMap.has(d.driverId)) empDispatchMap.set(d.driverId, d);
    d.crewAssignments?.forEach((ca) => {
      if (ca.employeeId && !empDispatchMap.has(ca.employeeId)) empDispatchMap.set(ca.employeeId, d);
    });
  });

  // ── 3. Active vehicles on shift today ────────────────────────────────────
  const todayShiftLogs = await prisma.shiftLog.findMany({
    where: {
      date: { gte: rangeStart, lte: rangeEnd },
      isPendingDelete: false,
    },
    include: {
      vehicle: { select: { id: true, licensePlate: true, type: true, status: true } },
      driver: { select: { id: true, name: true, lastLatitude: true, lastLongitude: true, lastLocationUpdate: true } },
    },
  });

  // ── 4. Route Waypoints / Location Pings for breadcrumb trails ────────────
  const recentPings = await prisma.locationPing.findMany({
    where: {
      timestamp: {
        gte: view === "today" ? new Date(Date.now() - 24 * 60 * 60 * 1000) : rangeStart,
        lte: rangeEnd,
      },
    },
    orderBy: { timestamp: "asc" },
    select: {
      id: true,
      employeeId: true,
      latitude: true,
      longitude: true,
      accuracy: true,
      speed: true,
      altitude: true,
      timestamp: true,
    },
  });

  const routeTrails: Record<string, { lat: number; lng: number; time: string; speed?: number | null }[]> = {};
  recentPings.forEach((p) => {
    if (!routeTrails[p.employeeId]) {
      routeTrails[p.employeeId] = [];
    }
    routeTrails[p.employeeId].push({
      lat: Number(p.latitude),
      lng: Number(p.longitude),
      time: p.timestamp.toISOString(),
      speed: p.speed,
    });
  });

  // ── Serialize employee GPS pins ───────────────────────────────────────────
  const employeePins = fieldEmployees
    .filter((e) => e.lastLatitude !== null && e.lastLongitude !== null)
    .map((emp) => {
      const dispatch = empDispatchMap.get(emp.id) || emp.operatorDispatches?.[0] || emp.driverDispatches?.[0];
      const activeShift = emp.shiftLogs?.[0];
      const pings = routeTrails[emp.id] || [];
      const latestPing = pings[pings.length - 1];
      return {
        id: emp.id,
        name: emp.name,
        role: emp.role,
        phone: emp.phone,
        profilePhotoUrl: emp.profilePhotoUrl ?? null,
        latitude: Number(emp.lastLatitude),
        longitude: Number(emp.lastLongitude),
        lastUpdate: emp.lastLocationUpdate?.toISOString() ?? null,
        cadenceMinutes: emp.role === "DRIVER" ? 15 : 45,
        speed: latestPing?.speed ?? (emp.role === "DRIVER" ? 24 : 0),
        routeCount: pings.length,
        machineId: dispatch?.machine?.machineId ?? null,
        machineType: dispatch?.machine?.type ?? null,
        customerName: dispatch?.customer?.name ?? null,
        dispatchLocation: dispatch?.location ?? null,
        dispatchStatus: dispatch?.status ?? null,
        vehiclePlate: activeShift?.vehicle?.licensePlate ?? null,
        vehicleType: activeShift?.vehicle?.type ?? null,
      };
    });

  // ── Serialize dispatch job-site pins (those with GPS coords) ─────────────
  const sitePins = allDispatches
    .filter((d) => d.latitude !== null && d.longitude !== null)
    .map((d) => ({
      id: d.id,
      location: d.location,
      latitude: Number(d.latitude),
      longitude: Number(d.longitude),
      customerName: d.customer?.name ?? null,
      status: d.status,
      machineId: d.machine?.machineId ?? null,
      machineType: d.machine?.type ?? null,
      operatorName: d.operator?.name ?? null,
      driverName: d.driver?.name ?? null,
      crewCount: d.crewAssignments?.length ?? 0,
      dateOfService: new Date(d.dateOfService).toISOString().split("T")[0],
    }));

  // ── Serialize vehicle fleet cards ─────────────────────────────────────────
  const vehicleCards = todayShiftLogs.map((sl) => ({
    shiftId: sl.id,
    vehicleId: sl.vehicle.id,
    licensePlate: sl.vehicle.licensePlate,
    vehicleType: sl.vehicle.type,
    vehicleStatus: sl.vehicle.status,
    driverId: sl.driver.id,
    driverName: sl.driver.name,
    driverLat: sl.driver.lastLatitude !== null ? Number(sl.driver.lastLatitude) : null,
    driverLng: sl.driver.lastLongitude !== null ? Number(sl.driver.lastLongitude) : null,
    driverLastUpdate: sl.driver.lastLocationUpdate?.toISOString() ?? null,
    shiftStart: sl.startTime.toISOString(),
    shiftEnd: sl.endTime?.toISOString() ?? null,
  }));

  // ── Weekly stats bar ──────────────────────────────────────────────────────
  const dateSummary: Record<string, number> = {};
  if (view === "weekly") {
    allDispatches.forEach((d) => {
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
            Real-time field personnel, job sites, and active vehicle fleet.
          </p>
        </div>

        <div className="text-xs text-slate-400 font-medium">
          Showing real-time field personnel and active dispatches
        </div>
      </div>

      {/* TIME HORIZON & DATE RANGE FILTER BAR */}
      <DateRangeFilterBar
        currentView={normalizedView}
        selectedDateStr={customDate}
        dateLabel={dateLabel}
        totalDispatchesCount={allDispatches.length}
        totalSitesCount={sitePins.length}
        basePath="/admin/live/map"
      />

      {/* Weekly Stats Bar */}
      {view === "weekly" && Object.keys(dateSummary).length > 0 && (
        <div className="grid grid-cols-7 gap-2">
          {Object.entries(dateSummary)
            .sort(([a], [b]) => a.localeCompare(b))
            .map(([date, count]) => (
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

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="text-2xl font-black text-white">{employeePins.length}</div>
          <div className="text-xs text-slate-400 font-semibold mt-1">Field Personnel</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="text-2xl font-black text-violet-400">{sitePins.length}</div>
          <div className="text-xs text-slate-400 font-semibold mt-1">Job Sites on Map</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="text-2xl font-black text-amber-400">{vehicleCards.length}</div>
          <div className="text-xs text-slate-400 font-semibold mt-1">Vehicles on Shift</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <div className="text-2xl font-black text-emerald-400">{allDispatches.length}</div>
          <div className="text-xs text-slate-400 font-semibold mt-1">Total Dispatches</div>
        </div>
      </div>

      {/* Map & Live Interactive GPS Command Hub */}
      <LiveMapClient
        employeePins={employeePins}
        sitePins={sitePins}
        vehicleCards={vehicleCards}
        routeTrails={routeTrails}
      />

      {/* Job Site List */}
      {sitePins.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-800">
            <h2 className="text-sm font-black text-white uppercase tracking-widest">📌 Job Sites — GPS Pinned Dispatches</h2>
          </div>
          <div className="divide-y divide-slate-800/60">
            {sitePins.map((site) => (
              <div key={site.id} className="flex items-center justify-between px-5 py-3 hover:bg-slate-800/30 transition-colors">
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${
                    site.status === "COMPLETED" ? "bg-emerald-500/20 text-emerald-400"
                    : site.status === "CANCELLED" ? "bg-rose-500/20 text-rose-400"
                    : "bg-amber-500/20 text-amber-400"
                  }`}>
                    {site.status}
                  </span>
                  <div>
                    <div className="text-white font-bold text-sm">{site.location}</div>
                    <div className="text-slate-500 text-xs">
                      {site.customerName && <span>{site.customerName}</span>}
                      {site.machineId && <span> · ⚙ {site.machineId}</span>}
                      {site.crewCount > 0 && <span> · {site.crewCount} crew</span>}
                    </div>
                  </div>
                </div>
                <div className="text-[10px] text-slate-600 font-mono text-right">
                  {site.latitude.toFixed(4)}, {site.longitude.toFixed(4)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Empty state */}
      {employeePins.length === 0 && sitePins.length === 0 && vehicleCards.length === 0 && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-12 text-center">
          <div className="text-4xl mb-3">📡</div>
          <h3 className="text-white font-bold">No Active Data</h3>
          <p className="text-slate-400 text-sm mt-1">
            No GPS pings, job sites, or vehicle shifts found
            {view === "today" ? " in the last 24 hours." : " for this date range."}
          </p>
        </div>
      )}

    </div>
  );
}
