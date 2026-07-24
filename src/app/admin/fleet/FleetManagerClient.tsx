"use client";

import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Wrench, Truck, Trash2, Edit2, Eye } from "lucide-react";
import Link from "next/link";
import { retireMachine, retireVehicle } from "./actions";
import MachineModal from "@/components/fleet/MachineModal";
import VehicleModal from "@/components/fleet/VehicleModal";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface FleetManagerClientProps {
  initialMachines: any[];
  initialVehicles: any[];
}

export default function FleetManagerClient({ initialMachines, initialVehicles }: FleetManagerClientProps) {
  const [machines] = useState(initialMachines);
  const [vehicles] = useState(initialVehicles);

  const [machineModalOpen, setMachineModalOpen] = useState(false);
  const [vehicleModalOpen, setVehicleModalOpen] = useState(false);
  const [selectedMachine, setSelectedMachine] = useState<any | null>(null);
  const [selectedVehicle, setSelectedVehicle] = useState<any | null>(null);

  const [isRetiring, setIsRetiring] = useState(false);

  const handleRetireMachine = async (id: string) => {
    if (!confirm("Are you sure you want to retire this machine? It will be removed from active inventory but its historical data will be preserved.")) return;
    setIsRetiring(true);
    try {
      await retireMachine(id);
      toast.success("Machine successfully retired.");
    } catch (err: any) {
      toast.error(err.message || "Failed to retire machine");
    } finally {
      setIsRetiring(false);
    }
  };

  const handleRetireVehicle = async (id: string) => {
    if (!confirm("Are you sure you want to retire this vehicle? It will be removed from active inventory but its historical data will be preserved.")) return;
    setIsRetiring(true);
    try {
      await retireVehicle(id);
      toast.success("Vehicle successfully retired.");
    } catch (err: any) {
      toast.error(err.message || "Failed to retire vehicle");
    } finally {
      setIsRetiring(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-500">
      
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black tracking-tight text-white flex items-center gap-3">
          <Wrench className="w-8 h-8 text-indigo-400" />
          Fleet & Machine Management
        </h1>
        <p className="text-slate-400 mt-2 text-sm font-medium">
          Manage construction assets, status, and track vehicle assignments.
        </p>
      </div>

      <Tabs defaultValue="machines" className="w-full">
        <TabsList className="bg-slate-900 border border-slate-800">
          <TabsTrigger value="machines" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
            Machines ({machines.length})
          </TabsTrigger>
          <TabsTrigger value="vehicles" className="data-[state=active]:bg-indigo-600 data-[state=active]:text-white">
            Vehicles ({vehicles.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="machines" className="mt-6 space-y-4">
          <div className="flex justify-end">
            <Button 
              onClick={() => { setSelectedMachine(null); setMachineModalOpen(true); }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2"
            >
              <Plus className="w-4 h-4" /> Add Machine
            </Button>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-slate-900 text-slate-400">
                  <tr>
                    <th className="px-6 py-4 whitespace-nowrap">Machine ID</th>
                    <th className="px-6 py-4 whitespace-nowrap">Type</th>
                    <th className="px-6 py-4 whitespace-nowrap">Current Location</th>
                    <th className="px-6 py-4 whitespace-nowrap">Status</th>
                    <th className="px-6 py-4 text-right whitespace-nowrap">Op. Payout (₹)</th>
                    <th className="px-6 py-4 text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {machines.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-white">{m.machineId}</td>
                      <td className="px-6 py-4 text-slate-300">{m.type}</td>
                      <td className="px-6 py-4 text-indigo-400 font-medium">
                        {m.dispatches?.[0]?.location || "Base / Warehouse"}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          m.status === 'AVAILABLE' ? 'bg-emerald-500/20 text-emerald-400' :
                          m.status === 'REPAIR' ? 'bg-red-500/20 text-red-400' :
                          'bg-amber-500/20 text-amber-400'
                        }`}>
                          {m.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right font-mono text-slate-300">
                        {m.operatorDailyPayout.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Link href={`/admin/fleet/machine/${m.id}`}>
                            <button 
                              className="p-2 bg-indigo-900/30 hover:bg-indigo-900/50 text-indigo-400 rounded transition-colors"
                              title="View Full Report"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </Link>
                          <button 
                            onClick={() => { setSelectedMachine(m); setMachineModalOpen(true); }}
                            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            disabled={isRetiring}
                            onClick={() => handleRetireMachine(m.id)}
                            className="p-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded transition-colors disabled:opacity-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {machines.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                        No machines found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="vehicles" className="mt-6 space-y-4">
          <div className="flex justify-end">
            <Button 
              onClick={() => { setSelectedVehicle(null); setVehicleModalOpen(true); }}
              className="bg-emerald-600 hover:bg-emerald-500 text-white gap-2"
            >
              <Plus className="w-4 h-4" /> Add Vehicle
            </Button>
          </div>

          <div className="bg-slate-900/50 border border-slate-800 rounded-xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs uppercase bg-slate-900 text-slate-400">
                  <tr>
                    <th className="px-6 py-4 whitespace-nowrap">License Plate</th>
                    <th className="px-6 py-4 whitespace-nowrap">Type</th>
                    <th className="px-6 py-4 whitespace-nowrap">Current Location</th>
                    <th className="px-6 py-4 whitespace-nowrap">Status</th>
                    <th className="px-6 py-4 text-right whitespace-nowrap">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {vehicles.map((v) => (
                    <tr key={v.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 font-bold text-white flex items-center gap-2">
                        <Truck className="w-4 h-4 text-slate-400" />
                        {v.licensePlate}
                      </td>
                      <td className="px-6 py-4 text-slate-300">{v.type}</td>
                      <td className="px-6 py-4 text-indigo-400 font-medium">
                        {v.shiftLogs?.[0] ? `Assigned to ${v.shiftLogs[0].driver?.firstName}` : "Base / Warehouse"}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-bold ${
                          v.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-400' :
                          v.status === 'REPAIR' ? 'bg-red-500/20 text-red-400' :
                          'bg-slate-500/20 text-slate-400'
                        }`}>
                          {v.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Link href={`/admin/fleet/vehicle/${v.id}`}>
                            <button 
                              className="p-2 bg-indigo-900/30 hover:bg-indigo-900/50 text-indigo-400 rounded transition-colors"
                              title="View Full Report"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </Link>
                          <button 
                            onClick={() => { setSelectedVehicle(v); setVehicleModalOpen(true); }}
                            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            disabled={isRetiring}
                            onClick={() => handleRetireVehicle(v.id)}
                            className="p-2 bg-red-900/30 hover:bg-red-900/50 text-red-400 rounded transition-colors disabled:opacity-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {vehicles.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-6 py-8 text-center text-slate-500">
                        No vehicles found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {machineModalOpen && (
        <MachineModal 
          isOpen={machineModalOpen} 
          onClose={() => setMachineModalOpen(false)} 
          machine={selectedMachine} 
        />
      )}
      
      {vehicleModalOpen && (
        <VehicleModal 
          isOpen={vehicleModalOpen} 
          onClose={() => setVehicleModalOpen(false)} 
          vehicle={selectedVehicle} 
        />
      )}
    </div>
  );
}
