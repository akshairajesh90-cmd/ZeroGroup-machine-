"use client";

import { useState } from "react";
import Link from "next/link";
import { toast } from "sonner";
import {
  Wrench, Truck, Plus, AlertTriangle, ShieldAlert,
  CheckCircle2, Clock, Hammer, FileWarning, ChevronRight, MapPin,
  Layers, Cpu,
} from "lucide-react";

import { softDeleteMachine, softDeleteVehicle } from "./actions";
import AddMachineModal from "./components/AddMachineModal";
import AddVehicleModal from "./components/AddVehicleModal";
import type { MachineType, MachineStatus, VehicleStatus } from "@prisma/client";

// ─── Strict TypeScript Interfaces ───────────────────────────────────────────

interface ActiveTicket {
  id: string;
  status: string;
  issueDescription: string;
}

export interface SerializedMachine {
  id: string;
  machineId: string;
  type: MachineType;
  status: MachineStatus;
  notes: string | null;
  operatorDailyPayout: number;
  fuelConsumptionThreshold: number;
  createdAt: string;
  activeTickets: ActiveTicket[];
  lastLocation: string | null;
  lastDispatchDate: string | null;
  lastCustomer: string | null;
}

export interface SerializedVehicle {
  id: string;
  licensePlate: string;
  type: string;
  status: VehicleStatus;
  createdAt: string;
  activeTickets: ActiveTicket[];
  hasExpiredDocs: boolean;
  hasExpiringDocs: boolean;
  lastDriver: string | null;
  lastShiftDate: string | null;
}

interface Props {
  initialMachines: SerializedMachine[];
  initialVehicles: SerializedVehicle[];
}

// ─── Status Badge Component ──────────────────────────────────────────────────

function StatusBadge({ status, hasActiveTicket }: { status: string; hasActiveTicket: boolean }) {
  // Active ticket overrides DB status for visual truthiness
  const effective = hasActiveTicket ? "REPAIR" : status;
  const map: Record<string, { label: string; cls: string; dot: string }> = {
    AVAILABLE: { label: "Available", cls: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30", dot: "bg-emerald-400" },
    RENTED:    { label: "Rented",    cls: "bg-blue-500/15 text-blue-400 border-blue-500/30",       dot: "bg-blue-400" },
    IN_USE:    { label: "In Use",    cls: "bg-blue-500/15 text-blue-400 border-blue-500/30",       dot: "bg-blue-400" },
    REPAIR:    { label: "In Repair", cls: "bg-red-500/15 text-red-400 border-red-500/30",          dot: "bg-red-400" },
  };
  const cfg = map[effective] ?? { label: effective, cls: "bg-slate-500/15 text-slate-400 border-slate-500/30", dot: "bg-slate-400" };
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border ${cfg.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${cfg.dot}`} />
      {cfg.label}
    </span>
  );
}

// ─── Machine Type Icon ───────────────────────────────────────────────────────

function MachineTypeIcon({ type }: { type: string }) {
  if (type === "HYDRAULIC_MIXER") {
    return <Cpu className="w-5 h-5 text-amber-400" />;
  }
  if (type === "LIFT") {
    return <Layers className="w-5 h-5 text-blue-400" />;
  }
  return <Wrench className="w-5 h-5 text-indigo-400" />;
}

// Derive a human-friendly type label
function getMachineLabel(type: string): string {
  if (type === "HYDRAULIC_MIXER") return "Hydraulic Mixing Machine";
  if (type === "MIXER") return "Mixing Machine";
  if (type === "LIFT") return "Lift";
  return type;
}

// ─── Machine Card ────────────────────────────────────────────────────────────

function MachineCard({ machine, onRetire }: { machine: SerializedMachine; onRetire: (id: string) => void }) {
  const hasTicket = machine.activeTickets.length > 0;

  return (
    <div className="group relative bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden transition-all duration-200 hover:border-indigo-500/40 hover:bg-white/8 hover:shadow-lg hover:shadow-indigo-500/10">
      {/* Fat-Finger primary link — entire top block is the tap target */}
      <Link href={`/admin/fleet/machine/${machine.id}`} className="block p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center shrink-0">
              <MachineTypeIcon type={machine.type} />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 mb-0.5">
                {getMachineLabel(machine.type)}
              </p>
              {/* BOLD, Large, Clickable Machine ID */}
              <h3 className="text-xl font-black text-white tracking-tight truncate group-hover:text-indigo-300 transition-colors">
                {machine.machineId}
              </h3>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-indigo-400 transition-colors shrink-0 mt-1" />
        </div>

        {/* Status Row */}
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <StatusBadge status={machine.status} hasActiveTicket={hasTicket} />
          {hasTicket && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold bg-orange-500/15 text-orange-400 border border-orange-500/30">
              <Hammer className="w-3 h-3" />
              {machine.activeTickets[0].issueDescription.slice(0, 20)}…
            </span>
          )}
        </div>

        {/* Last Location */}
        {machine.lastLocation && (
          <div className="flex items-center gap-2 mt-3">
            <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="text-xs text-slate-400 truncate">
              <span className="text-slate-500">Last: </span>
              <span className="font-semibold text-slate-300">{machine.lastLocation}</span>
              {machine.lastDispatchDate && (
                <span className="text-slate-600"> · {new Date(machine.lastDispatchDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
              )}
            </span>
          </div>
        )}

        {/* Financial Row */}
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="bg-white/5 rounded-xl p-3">
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Op. Payout</p>
            <p className="text-base font-black text-white mt-0.5">₹{machine.operatorDailyPayout.toLocaleString()}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3">
            <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Fuel Threshold</p>
            <p className="text-base font-black text-white mt-0.5">₹{machine.fuelConsumptionThreshold.toLocaleString()}</p>
          </div>
        </div>
      </Link>

      {/* Retire Button — separate from main link */}
      <div className="px-5 pb-5 pt-0">
        <button
          onClick={() => onRetire(machine.id)}
          className="w-full py-2 rounded-xl text-[11px] font-bold text-slate-500 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
        >
          Delete Asset (Soft Delete)
        </button>
      </div>
    </div>
  );
}

// ─── Vehicle Card ────────────────────────────────────────────────────────────

function VehicleCard({ vehicle, onRetire }: { vehicle: SerializedVehicle; onRetire: (id: string) => void }) {
  const hasTicket = vehicle.activeTickets.length > 0;

  return (
    <div className="group relative bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl overflow-hidden transition-all duration-200 hover:border-cyan-500/40 hover:bg-white/8 hover:shadow-lg hover:shadow-cyan-500/10">
      <Link href={`/admin/fleet/vehicle/${vehicle.id}`} className="block p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-2xl shrink-0">
              🚚
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wider text-cyan-400 mb-0.5">
                {vehicle.type}
              </p>
              <h3 className="text-xl font-black text-white tracking-tight font-mono truncate group-hover:text-cyan-300 transition-colors">
                {vehicle.licensePlate}
              </h3>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-slate-600 group-hover:text-cyan-400 transition-colors shrink-0 mt-1" />
        </div>

        {/* Status + Doc Badges */}
        <div className="flex flex-wrap items-center gap-2 mt-4">
          <StatusBadge status={vehicle.status} hasActiveTicket={hasTicket} />
          {vehicle.hasExpiredDocs && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold bg-red-500/15 text-red-400 border border-red-500/30">
              <ShieldAlert className="w-3 h-3" />
              Docs Expired
            </span>
          )}
          {!vehicle.hasExpiredDocs && vehicle.hasExpiringDocs && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
              <FileWarning className="w-3 h-3" />
              Docs Expiring Soon
            </span>
          )}
          {hasTicket && (
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-bold bg-orange-500/15 text-orange-400 border border-orange-500/30">
              <Hammer className="w-3 h-3" />
              In Shop
            </span>
          )}
        </div>

        {/* Last Driver / Shift */}
        {vehicle.lastDriver && (
          <div className="flex items-center gap-2 mt-3">
            <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
            <span className="text-xs text-slate-400 truncate">
              <span className="text-slate-500">Driver: </span>
              <span className="font-semibold text-slate-300">{vehicle.lastDriver.split(" ")[0]}</span>
              {vehicle.lastShiftDate && (
                <span className="text-slate-600"> · {new Date(vehicle.lastShiftDate).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}</span>
              )}
            </span>
          </div>
        )}

        {/* Compliance notice */}
        {vehicle.hasExpiredDocs && (
          <div className="mt-4 flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl px-3 py-2">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <p className="text-[11px] text-red-300 font-medium">
              One or more compliance documents have expired. Vehicle must not be dispatched.
            </p>
          </div>
        )}
      </Link>

      <div className="px-5 pb-5 pt-0">
        <button
          onClick={() => onRetire(vehicle.id)}
          className="w-full py-2 rounded-xl text-[11px] font-bold text-slate-500 hover:text-red-400 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 transition-all"
        >
          Delete Vehicle (Soft Delete)
        </button>
      </div>
    </div>
  );
}

// ─── Main Client Component ───────────────────────────────────────────────────

export default function FleetManagerClient({ initialMachines, initialVehicles }: Props) {
  const [activeTab, setActiveTab] = useState<"machines" | "vehicles">("machines");
  const [machineModalOpen, setMachineModalOpen] = useState(false);
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [machines, setMachines] = useState(initialMachines);
  const [vehicles, setVehicles] = useState(initialVehicles);

  const handleRetireMachine = async (id: string) => {
    if (!confirm("Retire this machine? All historical data will be preserved (soft-delete).")) return;
    try {
      await softDeleteMachine(id);
      setMachines(prev => prev.filter(m => m.id !== id));
      toast.success("Machine deleted from project. Admin can undo from Trash.");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to retire machine.");
    }
  };

  const handleRetireVehicle = async (id: string) => {
    if (!confirm("Retire this vehicle? All historical data will be preserved (soft-delete).")) return;
    try {
      await softDeleteVehicle(id);
      setVehicles(prev => prev.filter(v => v.id !== id));
      toast.success("Vehicle deleted from project. Admin can undo from Trash.");
    } catch (e: any) {
      toast.error(e.message ?? "Failed to retire vehicle.");
    }
  };

  const tabs = [
    { key: "machines" as const, label: "Machines", count: machines.length, icon: Wrench },
    { key: "vehicles" as const, label: "Vehicles", count: vehicles.length, icon: Truck },
  ];

  // Summary stats
  const machineInRepair = machines.filter(m => m.activeTickets.length > 0 || m.status === "REPAIR").length;
  const vehicleDocsExpired = vehicles.filter(v => v.hasExpiredDocs).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-slate-950/80 backdrop-blur-xl border-b border-white/5 px-4 py-4 md:px-8">
        <div className="max-w-5xl mx-auto flex items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-black text-white tracking-tight">Fleet Command</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              {machines.length} machines · {vehicles.length} vehicles
            </p>
          </div>
          <button
            onClick={() => activeTab === "machines" ? setMachineModalOpen(true) : setVehicleModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold text-sm transition-all shadow-lg shadow-indigo-500/20"
          >
            <Plus className="w-4 h-4" />
            Add {activeTab === "machines" ? "Machine" : "Vehicle"}
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 space-y-6">

        {/* Alert Banners */}
        {machineInRepair > 0 && (
          <div className="flex items-center gap-3 bg-orange-500/10 border border-orange-500/20 rounded-2xl px-4 py-3">
            <Hammer className="w-5 h-5 text-orange-400 shrink-0" />
            <p className="text-sm text-orange-300 font-semibold">
              {machineInRepair} machine{machineInRepair > 1 ? "s" : ""} currently under maintenance
            </p>
          </div>
        )}
        {vehicleDocsExpired > 0 && (
          <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 rounded-2xl px-4 py-3">
            <ShieldAlert className="w-5 h-5 text-red-400 shrink-0" />
            <p className="text-sm text-red-300 font-semibold">
              {vehicleDocsExpired} vehicle{vehicleDocsExpired > 1 ? "s have" : " has"} expired compliance documents
            </p>
          </div>
        )}

        {/* Tab Bar */}
        <div className="flex gap-2 bg-white/5 border border-white/10 rounded-2xl p-1.5">
          {tabs.map(({ key, label, count, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all ${
                activeTab === key
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                  : "text-slate-400 hover:text-white hover:bg-white/5"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                activeTab === key ? "bg-white/20" : "bg-white/10"
              }`}>
                {count}
              </span>
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === "machines" && (
          <div>
            {machines.length === 0 ? (
              <EmptyState
                icon={<Wrench className="w-12 h-12 text-slate-700" />}
                title="No active machines"
                subtitle="Add your first machine to get started tracking fleet operations."
                onAdd={() => setMachineModalOpen(true)}
                addLabel="Add Machine"
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {machines.map(m => (
                  <MachineCard key={m.id} machine={m} onRetire={handleRetireMachine} />
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "vehicles" && (
          <div>
            {vehicles.length === 0 ? (
              <EmptyState
                icon={<Truck className="w-12 h-12 text-slate-700" />}
                title="No active vehicles"
                subtitle="Add your first vehicle to manage fleet logistics and document compliance."
                onAdd={() => setVehicleModalOpen(true)}
                addLabel="Add Vehicle"
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {vehicles.map(v => (
                  <VehicleCard key={v.id} vehicle={v} onRetire={handleRetireVehicle} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <AddMachineModal open={machineModalOpen} onClose={() => setMachineModalOpen(false)} />
      <AddVehicleModal open={vehicleModalOpen} onClose={() => setVehicleModalOpen(false)} />
    </div>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyState({ icon, title, subtitle, onAdd, addLabel }: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onAdd: () => void;
  addLabel: string;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center space-y-4">
      <div className="opacity-40">{icon}</div>
      <h3 className="text-lg font-bold text-white">{title}</h3>
      <p className="text-sm text-slate-500 max-w-sm">{subtitle}</p>
      <button
        onClick={onAdd}
        className="flex items-center gap-2 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm transition-all"
      >
        <Plus className="w-4 h-4" /> {addLabel}
      </button>
    </div>
  );
}
