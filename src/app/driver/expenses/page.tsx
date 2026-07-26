import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { format } from "date-fns";
import { Fuel, Clock, Receipt } from "lucide-react";
import FuelLogForm from "./FuelLogForm";

export const dynamic = "force-dynamic";

export default async function ExpensesPage() {
  const session = await auth();
  if (!session?.user?.employeeId) redirect("/");
  const empId = session.user.employeeId;

  const [machines, vehicles, recentLogs] = await Promise.all([
    prisma.machine.findMany({
      where: { status: { notIn: ["RETIRED", "REPAIR"] } },
      select: { id: true, machineId: true, type: true, notes: true },
      orderBy: { machineId: "asc" },
    }),
    prisma.vehicle.findMany({
      where: { status: { notIn: ["RETIRED", "REPAIR"] } },
      select: { id: true, licensePlate: true, type: true },
      orderBy: { licensePlate: "asc" },
    }),
    prisma.fuelLog.findMany({
      where: { driverId: empId },
      orderBy: { date: "desc" },
      take: 10,
      include: {
        machine: { select: { machineId: true } },
        vehicle: { select: { licensePlate: true, type: true } },
      },
    }),
  ]);

  // Serialize Decimals
  const serializedLogs = recentLogs.map((l) => ({
    id: l.id,
    date: l.date.toISOString(),
    liters: Number(l.liters),
    totalCost: Number(l.totalCost),
    odometerReading: l.odometerReading,
    assetLabel: l.machine?.machineId ?? l.vehicle?.licensePlate ?? "Unknown",
    assetType: l.machine ? "Machine" : "Vehicle",
  }));

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="pt-2">
        <div className="flex items-center gap-2">
          <Fuel className="w-5 h-5 text-orange-400" />
          <h1 className="text-xl font-black text-white">Log Fuel / Expense</h1>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">Record every refill — keep the physical receipt safe</p>
      </div>

      {/* Fuel Log Form */}
      <FuelLogForm machines={machines} vehicles={vehicles} />

      {/* Recent Logs */}
      {serializedLogs.length > 0 && (
        <div>
          <h2 className="text-[11px] font-black uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
            <Receipt className="w-3.5 h-3.5" /> Recent Fuel Logs
          </h2>
          <div className="bg-slate-900/70 border border-white/5 rounded-2xl divide-y divide-slate-800/70">
            {serializedLogs.map((log) => (
              <div key={log.id} className="flex items-center justify-between px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/20 flex items-center justify-center">
                    <Fuel className="w-3.5 h-3.5 text-orange-400" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{log.assetLabel}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded font-bold">{log.assetType}</span>
                      <span className="text-[11px] text-slate-500 flex items-center gap-1">
                        <Clock className="w-2.5 h-2.5" />
                        {format(new Date(log.date), "d MMM yyyy")}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-emerald-400">₹{log.totalCost.toLocaleString("en-IN")}</p>
                  <p className="text-[11px] text-slate-500">{log.liters}L</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
