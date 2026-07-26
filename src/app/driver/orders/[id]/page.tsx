import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { format } from "date-fns";
import {
  ArrowLeft, MapPin, Phone, CheckCircle2, Circle,
  Wrench, Users, Calendar, Banknote, FileText
} from "lucide-react";
import SaveLocationButton from "./SaveLocationButton";

export const dynamic = "force-dynamic";

const STATUS_STYLE: Record<string, { label: string; cls: string; dot: string }> = {
  PENDING:     { label: "Pending",     cls: "bg-amber-500/15 text-amber-400 border-amber-500/30",   dot: "bg-amber-400" },
  ACCEPTED:    { label: "Accepted",    cls: "bg-blue-500/15 text-blue-400 border-blue-500/30",     dot: "bg-blue-400" },
  IN_PROGRESS: { label: "In Progress", cls: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",     dot: "bg-cyan-400 animate-pulse" },
  COMPLETED:   { label: "Completed",   cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", dot: "bg-emerald-400" },
  CANCELLED:   { label: "Cancelled",   cls: "bg-red-500/15 text-red-400 border-red-500/30",       dot: "bg-red-400" },
};

const MACHINE_EMOJI: Record<string, string> = {
  MIXER: "🪣", LIFT: "🏗️", VIBRATOR: "🔧", PANI: "💧", INDEPENDENT: "👷",
};

function getChecklist(status: string) {
  const done = status === "COMPLETED";
  const inProg = status === "IN_PROGRESS" || done;
  const accepted = status === "ACCEPTED" || inProg;
  return [
    { label: "Pre-start safety check",    done: accepted },
    { label: "Machine delivered to site",  done: inProg },
    { label: "Work completed on site",     done: done },
    { label: "Machine returned to yard",   done: done },
  ];
}

export default async function OrderDetailPage({ params }: { params: { id: string } }) {
  const session = await auth();
  if (!session?.user?.employeeId) redirect("/");

  const empId = session.user.employeeId;
  const role  = session.user.role;

  const dispatch = await prisma.dailyDispatch.findUnique({
    where: { id: params.id },
    include: {
      customer: true,
      machine:  true,
      lift:     true,
      vibrator: true,
      operator: { select: { name: true } },
      driver:   { select: { name: true } },
    },
  });

  if (!dispatch) notFound();

  // Security: only allow the assigned operator/driver (or OWNER/STAFF) to view
  const isAdmin = role === "OWNER" || role === "STAFF";
  const isAssigned = dispatch.operatorId === empId || dispatch.driverId === empId;
  if (!isAdmin && !isAssigned) redirect("/driver/dispatches");

  // Determine Pickup Location (where the machine was last dispatched)
  let pickupLocation = "Zero Group Yard (or returned location)";
  let pickupMapLink: string | null = null;
  if (dispatch.machineId) {
    const prevDispatch = await prisma.dailyDispatch.findFirst({
      where: {
        machineId: dispatch.machineId,
        dateOfService: { lt: dispatch.dateOfService },
      },
      orderBy: { dateOfService: "desc" },
    });
    if (prevDispatch) {
      pickupLocation = prevDispatch.location;
      pickupMapLink = prevDispatch.mapLink;
    }
  }

  const s         = STATUS_STYLE[dispatch.status] ?? STATUS_STYLE.PENDING;
  const emoji     = MACHINE_EMOJI[dispatch.machine?.type ?? ""] ?? "⚙️";
  const checklist = getChecklist(dispatch.status);

  return (
    <div className="space-y-4 pb-8">
      {/* Back */}
      <Link
        href="/driver/dispatches"
        className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors pt-2"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Dispatches
      </Link>

      {/* Header Card */}
      <div className="bg-gradient-to-br from-slate-900 to-slate-950 border border-white/8 rounded-2xl p-5 shadow-xl">
        <div className="flex items-start gap-4">
          <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-white/5 flex items-center justify-center text-3xl shrink-0">
            {emoji}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-black text-white leading-tight">
              {dispatch.machine?.machineId ?? "Independent Work"}
              {dispatch.lift ? <span className="text-[12px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-md ml-2 align-middle">+ {dispatch.lift.machineId}</span> : null}
              {dispatch.vibrator ? <span className="text-[12px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded-md ml-2 align-middle">+ {dispatch.vibrator.machineId}</span> : null}
            </h1>
            <p className="text-sm text-cyan-400 font-semibold mt-0.5">
              {dispatch.machine?.type ?? "LABOUR"}{dispatch.machine?.notes ? ` · ${dispatch.machine.notes.split("(")[0].trim()}` : ""}
            </p>
            <div className="mt-2">
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${s.cls}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />{s.label}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Job Details Grid */}
      <div className="bg-slate-900/70 border border-white/5 rounded-2xl p-4">
        <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-4">Job Details</h2>
        <div className="space-y-3">
          {[
            { icon: MapPin,       label: "Pickup Location", value: pickupLocation, accent: "text-amber-400", href: pickupMapLink },
            { icon: MapPin,       label: "Destination", value: dispatch.location, href: dispatch.mapLink },
            { icon: Calendar,     label: "Date",        value: format(new Date(dispatch.dateOfService), "EEEE, d MMMM yyyy") },
            { icon: Wrench,       label: "Work Type",   value: dispatch.workType },
            { icon: Users,        label: "Helpers",     value: `${dispatch.helperCount} helper(s)` },
            ...(dispatch.notes ? [{ icon: FileText, label: "Notes", value: dispatch.notes }] : []),
          ].map((row) => (
            <div key={row.label} className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-slate-800 flex items-center justify-center shrink-0 mt-0.5">
                  <row.icon className="w-3.5 h-3.5 text-slate-400" />
                </div>
                <div>
                  <p className="text-[11px] text-slate-500 font-semibold uppercase tracking-wide">{row.label}</p>
                  <p className={`text-sm font-bold text-white mt-0.5 ${(row as any).accent ?? ""}`}>{row.value}</p>
                </div>
              </div>
              {(row as any).href ? (
                <a href={(row as any).href} target="_blank" rel="noopener noreferrer" className="shrink-0 flex items-center justify-center w-8 h-8 bg-cyan-500/20 text-cyan-400 rounded-full hover:bg-cyan-500/30 transition border border-cyan-500/30">
                  <MapPin className="w-3.5 h-3.5" />
                </a>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      {/* Customer Contact */}
      <div className="bg-slate-900/70 border border-white/5 rounded-2xl p-4">
        <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-4">Customer</h2>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-indigo-500/15 border border-indigo-500/20 flex items-center justify-center text-indigo-400 font-black text-sm">
            {dispatch.customer?.name?.charAt(0).toUpperCase() ?? "C"}
          </div>
          <div>
            <p className="text-sm font-black text-white">{dispatch.customer?.name}</p>
            <p className="text-xs text-slate-500">{dispatch.customer?.phone}</p>
          </div>
        </div>
        <a
          href={`tel:${dispatch.customer?.phone}`}
          className="flex items-center justify-center gap-2 w-full py-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-sm transition-all active:scale-[0.98] shadow-lg shadow-emerald-500/20"
        >
          <Phone className="w-4 h-4" /> Call Customer
        </a>
      </div>

      {/* Job Checklist */}
      <div className="bg-slate-900/70 border border-white/5 rounded-2xl p-4">
        <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-4">Job Checklist</h2>
        <div className="space-y-3">
          {checklist.map((item, i) => (
            <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${item.done ? "bg-emerald-500/5 border-emerald-500/20" : "bg-slate-800/30 border-slate-800"}`}>
              {item.done
                ? <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                : <Circle className="w-5 h-5 text-slate-600 shrink-0" />
              }
              <span className={`text-sm font-bold ${item.done ? "text-emerald-300" : "text-slate-400"}`}>
                {item.label}
              </span>
            </div>
          ))}
        </div>
      </div>
      
      {/* Save Current GPS Location */}
      <SaveLocationButton dispatchId={dispatch.id} />

    </div>
  );
}
