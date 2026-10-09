import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/serverAuth";
import { startOfDay, endOfDay, format, addDays } from "date-fns";
import PreStartChecklist from "./PreStartChecklist";
import DocketCanvas from "./DocketCanvas";
import { ClipboardList } from "lucide-react";
import CrewAllocation from "./CrewAllocation";
import UpdateSiteLocationButton from "@/components/operator/UpdateSiteLocationButton";
import { CollectPaymentButton } from "@/components/shared/CollectPaymentButton";
import { IdleDelayButton } from "@/components/shared/IdleDelayButton";
import { RequestAdvanceButton } from '@/components/operator/RequestAdvanceButton';
import LogExternalLaborForm from './LogExternalLaborForm';
import { DEFAULT_PRICING } from "@/lib/pricingEngine";
import ProfilePhotoUploader from "@/components/shared/ProfilePhotoUploader";
import AutoPinger from "@/components/operator/AutoPinger";

export const dynamic = "force-dynamic";

export default async function OperatorHomePage() {
  const { employeeId, role } = await requireAuth();

  const employee = await prisma.employee.findUnique({
    where: { id: employeeId },
    select: { name: true, profilePhotoUrl: true, operatorType: true, isCrewLeader: true },
  });
  
  const isCrewLeader = employee?.isCrewLeader || false;
  const operatorType = employee?.operatorType || "INTERNAL";

  // ─── Calculate current payroll week (Monday → Saturday) ──────────────────
  const now = new Date();
  const weekStart = new Date(now);
  const day = weekStart.getDay(); // 0=Sun, 1=Mon...6=Sat
  const diff = weekStart.getDate() - day + (day === 0 ? -6 : 1); // Monday
  weekStart.setDate(diff);
  weekStart.setHours(0, 0, 0, 0);

  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 5); // Saturday
  weekEnd.setHours(23, 59, 59, 999);

  // ─── Fetch this week's work dispatches ────────────────────────────────────
  const weeklyDispatches = await prisma.dailyDispatch.findMany({
    where: {
      OR: [
        { operatorId: employeeId },
        { crewAssignments: { some: { employeeId: employeeId } } },
      ],
      dateOfService: { gte: weekStart, lte: weekEnd },
      status: { notIn: ["CANCELLED", "POSTPONED", "NO_SHOW"] },
    },
    include: {
      customer: { select: { name: true } },
      machine:  { select: { machineId: true, type: true } },
    },
    orderBy: { dateOfService: "asc" },
  });

  // ─── Fetch this week's advances (all statuses visible to worker) ──────────
  const weeklyAdvances = await prisma.salaryAdvance.findMany({
    where: {
      employeeId: employeeId,
      date: { gte: weekStart, lte: weekEnd },
    },
    orderBy: { date: "asc" },
  });

  // ─── Build the Daily Diary ────────────────────────────────────────────────
  type DiaryEntry =
    | { type: "WORK"; date: Date; label: string; earned: number; dispatchId: string }
    | { type: "ADVANCE"; date: Date; label: string; deducted: number; status: string };

  const diaryEntries: DiaryEntry[] = [];

  const dailyWage = operatorType === "SUBCONTRACTOR"
    ? DEFAULT_PRICING.EXTERNAL_WORKER_WAGE
    : DEFAULT_PRICING.INTERNAL_WORKER_WAGE;

  for (const d of weeklyDispatches) {
    const earnedToday = Number(d.operatorDailyRate || dailyWage);
    const machineLabel = d.machine?.machineId ? `${d.machine.machineId}` : "Machine";
    diaryEntries.push({
      type:       "WORK",
      date:       new Date(d.dateOfService),
      label:      `Worked — ${machineLabel} @ ${d.customer?.name ?? "Site"}`,
      earned:     earnedToday,
      dispatchId: d.id,
    });
  }

  for (const adv of weeklyAdvances) {
    diaryEntries.push({
      type:     "ADVANCE",
      date:     new Date(adv.date),
      label:    adv.notes ?? "Office Cash Advance",
      deducted: Number(adv.amount),
      status:   adv.status,
    });
  }

  // Sort chronologically
  diaryEntries.sort((a, b) => a.date.getTime() - b.date.getTime());

  const totalEarned   = diaryEntries.filter(e => e.type === "WORK").reduce((s, e) => s + (e as any).earned, 0);
  const totalAdvances = diaryEntries.filter(e => e.type === "ADVANCE").reduce((s, e) => s + (e as any).deducted, 0);
  const estimatedPayout = totalEarned - totalAdvances;

  // ─── Today's active dispatch ──────────────────────────────────────────────
  const todayStart = startOfDay(new Date());
  const todayEnd   = endOfDay(new Date());

  const todayDispatches = await prisma.dailyDispatch.findMany({
    where: {
      dateOfService: { gte: todayStart, lte: todayEnd },
      ...(isCrewLeader ? {} : {
        OR: [
          { operatorId: employeeId },
          { crewAssignments: { some: { employeeId: employeeId } } },
        ]
      }),
    },
    include: {
      customer: { select: { name: true, phone: true } },
      machine:  { select: { machineId: true, type: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const subLeaders = await prisma.externalSubLeader.findMany({ select: { id: true, name: true } });
  const firstName = employee?.name?.split(" ")[0] ?? "Operator";
  const opType = operatorType || "INTERNAL";

  return (
    <div className="space-y-6">
      {/* Header with Profile Photo */}
      <div className="pt-2 flex items-center gap-4">
        <ProfilePhotoUploader
          name={employee?.name ?? "User"}
          currentPhotoUrl={employee?.profilePhotoUrl}
          size="lg"
        />
        <div>
          <p className="text-xs font-bold text-orange-500 uppercase tracking-widest">Operator Portal</p>
          <h1 className="text-2xl font-black text-white mt-0.5">{firstName} 👋</h1>
          <p className="text-[10px] text-zinc-600 font-medium mt-0.5">Tap photo to update</p>
        </div>
      </div>

      {/* ─── Saturday Payout Summary ──────────────────────────────── */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <p className="text-[11px] font-black uppercase tracking-widest text-zinc-500">Weekly Ledger</p>
            <p className="text-[10px] text-zinc-500 mt-0.5">
              {format(weekStart, "dd MMM")} – {format(weekEnd, "dd MMM")}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-wide">Saturday Payout</p>
            <span className={`text-2xl font-black tracking-tight ${estimatedPayout >= 0 ? "text-emerald-400" : "text-red-400"}`}>
              ₹{estimatedPayout.toLocaleString("en-IN")}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 divide-x divide-zinc-800">
          <div className="p-3">
            <p className="text-[10px] font-bold uppercase text-zinc-500">Earned</p>
            <p className="text-lg font-black text-white">₹{totalEarned.toLocaleString("en-IN")}</p>
          </div>
          <div className="p-3">
            <p className="text-[10px] font-bold uppercase text-amber-600">Advances Given</p>
            <p className="text-lg font-black text-amber-500">-₹{totalAdvances.toLocaleString("en-IN")}</p>
          </div>
        </div>
      </div>

      {/* ─── Daily Diary ─────────────────────────────────────────────── */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-xl">
        <div className="px-4 py-3 border-b border-zinc-800 flex items-center gap-2">
          <span className="text-base">📒</span>
          <h2 className="text-sm font-black text-white">Daily Diary</h2>
          <span className="ml-auto text-[10px] text-zinc-500 font-mono">
            {diaryEntries.length} entries this week
          </span>
        </div>

        {diaryEntries.length === 0 ? (
          <div className="p-6 text-center">
            <p className="text-sm text-zinc-500 font-bold">No entries for this week yet.</p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-800/60">
            {diaryEntries.map((entry, idx) => (
              <div key={idx} className="flex items-center gap-3 px-4 py-3">
                {/* Date column */}
                <div className="w-12 shrink-0 text-center">
                  <p className="text-[10px] font-black text-zinc-500 uppercase">
                    {format(entry.date, "MMM")}
                  </p>
                  <p className="text-base font-black text-white leading-none">
                    {format(entry.date, "dd")}
                  </p>
                  <p className="text-[9px] text-zinc-600 font-bold">
                    {format(entry.date, "EEE")}
                  </p>
                </div>

                {/* Divider */}
                <div className={`w-0.5 h-10 rounded-full shrink-0 ${
                  entry.type === "WORK" ? "bg-emerald-500/60" : "bg-amber-500/60"
                }`} />

                {/* Label */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-zinc-200 truncate">{entry.label}</p>
                  <p className={`text-[10px] font-black uppercase tracking-widest mt-0.5 ${
                    entry.type === "WORK" ? "text-emerald-500" : "text-amber-500"
                  }`}>
                    {entry.type === "WORK" ? "Work Day" : (
                      (entry as any).status === "SETTLED" ? "Advance • Settled" : "Advance • Pending"
                    )}
                  </p>
                </div>

                {/* Amount */}
                <div className="text-right shrink-0">
                  {entry.type === "WORK" ? (
                    <span className="text-base font-black text-emerald-400 font-mono">
                      +₹{(entry as any).earned.toLocaleString("en-IN")}
                    </span>
                  ) : (
                    <span className="text-base font-black text-amber-500 font-mono">
                      -₹{(entry as any).deducted.toLocaleString("en-IN")}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Running total footer */}
        <div className="px-4 py-3 border-t border-zinc-800 bg-zinc-950/50 flex items-center justify-between">
          <span className="text-xs font-bold text-zinc-500">Running Balance</span>
          <span className={`text-sm font-black font-mono ${estimatedPayout >= 0 ? "text-emerald-400" : "text-red-400"}`}>
            ₹{estimatedPayout.toLocaleString("en-IN")}
          </span>
        </div>
      </div>

      {/* ─── Today's Active Jobs ───────────────────────────────────────── */}
      {todayDispatches.length > 0 ? (
        <div className="space-y-12">
          {/* Automatically ping GPS for the active job every 5 mins */}
          <AutoPinger dispatchId={todayDispatches[0].id} employeeId={employeeId} />

          {todayDispatches.map((job) => (
            <div key={job.id} className="space-y-6">
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
                <h2 className="text-[11px] font-black uppercase tracking-widest text-zinc-500 mb-2">
                  {isCrewLeader ? "Site Assignment" : "Active Assignment"}
                </h2>
                <h3 className="text-xl font-black text-white leading-tight">
                  {job.machine?.machineId ?? "No Machine Assigned"}
                </h3>
                <p className="text-sm font-bold text-zinc-300 mt-2">{job.customer?.name ?? "Unknown Customer"}</p>
                <p className="text-xs text-zinc-500 mt-0.5">{job.location}</p>
                
                <UpdateSiteLocationButton dispatchId={job.id} initialMapLink={job.mapLink} />
              </div>

              {job.machineId && (
                <PreStartChecklist operatorType={opType} machineId={job.machineId} />
              )}

              {/* Crew Register — always show for the operator of this site */}
              <CrewAllocation dispatchId={job.id} />

              {isCrewLeader && (
                <LogExternalLaborForm 
                  dispatchId={job.id} 
                  subLeaders={subLeaders} 
                />
              )}

              {/* Link to dedicated Field Diary (offline capable) */}
              <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 shadow-xl">
                <h3 className="text-sm font-black text-white flex items-center gap-2 mb-2">
                  <ClipboardList className="w-4 h-4 text-emerald-400" /> Daily Field Diary
                </h3>
                <p className="text-xs text-zinc-500 mb-4 font-medium">Log hours, fuel, breakdowns and sync attendance to office.</p>
                <a 
                  href={`/operator/field-diary/${job.id}`}
                  className="w-full bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 font-bold py-3 px-4 rounded-xl flex items-center justify-center transition-colors text-sm"
                >
                  Open Field Diary
                </a>
              </div>

              <DocketCanvas
                dispatchId={job.id}
                machineType={(job as any).machine?.type}
                existingDocket={null}
              />
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center">
          <ClipboardList className="w-10 h-10 text-zinc-700 mx-auto mb-3" />
          <p className="text-base font-black text-zinc-300">No active docket today.</p>
          <p className="text-xs font-bold text-zinc-500 mt-2">You are not assigned to a machine today.</p>
        </div>
      )}
    </div>
  );
}

