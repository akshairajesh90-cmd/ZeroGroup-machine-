"use client";

import React, { useState } from "react";
import { 
  Truck, MapPin, Navigation, ExternalLink, X, 
  Calendar, User, Cog, Clock, Wrench, ShieldCheck 
} from "lucide-react";
import { format } from "date-fns";

export interface ToolDeploymentRecord {
  id: string;
  quantity: number;
  dispatch: {
    id: string;
    dateOfService: string | Date;
    status: string;
    location: string;
    latitude?: number | string | null;
    longitude?: number | string | null;
    mapLink?: string | null;
    deliveredAt?: string | Date | null;
    customer?: {
      name: string;
      phone?: string | null;
    } | null;
    driver?: {
      fullName: string;
      phone?: string | null;
    } | null;
    operator?: {
      fullName: string;
      phone?: string | null;
    } | null;
    vehicle?: {
      licensePlate: string;
      modelName?: string | null;
    } | null;
    machine?: {
      name: string;
    } | null;
  };
}

export interface ToolDeploymentsModalProps {
  toolName: string;
  totalDeployed: number;
  deployments: ToolDeploymentRecord[];
}

export function ToolDeploymentsModal({
  toolName,
  totalDeployed,
  deployments,
}: ToolDeploymentsModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-400 hover:text-rose-300 hover:underline transition-colors"
      >
        <Truck className="h-3.5 w-3.5" />
        <span>{totalDeployed} Deployed (View Sites)</span>
      </button>

      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Accent Header Stripe */}
            <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-rose-500 via-amber-500 to-indigo-500" />

            {/* Modal Header */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
                  <Wrench className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    {toolName} — Active Sites & Deployments
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {totalDeployed} unit(s) currently deployed across {deployments.length} jobsite(s)
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
              {deployments.length === 0 ? (
                <div className="p-8 text-center text-slate-500">
                  No active jobsite deployments found for this item.
                </div>
              ) : (
                deployments.map((d) => {
                  const disp = d.dispatch;
                  const numLat = disp.latitude ? Number(disp.latitude) : null;
                  const numLng = disp.longitude ? Number(disp.longitude) : null;
                  const hasCoords = numLat !== null && numLng !== null && !isNaN(numLat) && !isNaN(numLng);
                  const mapUrl =
                    disp.mapLink ||
                    (hasCoords
                      ? `https://www.google.com/maps/dir/?api=1&destination=${numLat},${numLng}`
                      : null);

                  return (
                    <div
                      key={d.id}
                      className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-3"
                    >
                      {/* Top Bar: Date, Status & Units */}
                      <div className="flex items-center justify-between border-b border-slate-800/80 pb-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-200">
                            {format(new Date(disp.dateOfService), "dd MMM yyyy")}
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                              disp.status === "DELIVERED"
                                ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                : disp.status === "IN_PROGRESS"
                                ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                : "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                            }`}
                          >
                            {disp.status}
                          </span>
                        </div>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-rose-500/15 text-rose-300 border border-rose-500/30">
                          {d.quantity} {d.quantity === 1 ? "Unit" : "Units"}
                        </span>
                      </div>

                      {/* Site & Location */}
                      <div>
                        <div className="text-sm font-bold text-white">
                          {disp.customer?.name || "Customer Site"}
                        </div>
                        <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                          <span>{disp.location}</span>
                        </div>
                        {hasCoords && (
                          <div className="mt-1 flex items-center gap-2 text-xs">
                            <span className="font-mono text-slate-500 text-[11px]">
                              {numLat?.toFixed(5)}, {numLng?.toFixed(5)}
                            </span>
                            {mapUrl && (
                              <a
                                href={mapUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] text-emerald-400 hover:text-emerald-300 font-bold hover:underline"
                              >
                                <Navigation className="w-3 h-3 fill-emerald-400" />
                                <span>Navigate to Site</span>
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Logistics Info: Vehicle, Driver, Operator, Machine */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                        {disp.vehicle && (
                          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-900 border border-slate-800">
                            <Truck className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                            <div className="min-w-0">
                              <span className="text-[10px] text-slate-500 block">Delivered via Truck</span>
                              <span className="font-bold text-white truncate block">
                                {disp.vehicle.licensePlate || disp.vehicle.modelName}
                              </span>
                            </div>
                          </div>
                        )}

                        {disp.driver && (
                          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-900 border border-slate-800">
                            <User className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                            <div className="min-w-0">
                              <span className="text-[10px] text-slate-500 block">Transport Driver</span>
                              <span className="font-bold text-white truncate block">
                                {disp.driver.fullName}
                              </span>
                            </div>
                          </div>
                        )}

                        {disp.operator && (
                          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-900 border border-slate-800">
                            <User className="w-3.5 h-3.5 text-purple-400 shrink-0" />
                            <div className="min-w-0">
                              <span className="text-[10px] text-slate-500 block">Operator Custody</span>
                              <span className="font-bold text-white truncate block">
                                {disp.operator.fullName}
                              </span>
                            </div>
                          </div>
                        )}

                        {disp.machine && (
                          <div className="flex items-center gap-2 p-2 rounded-xl bg-slate-900 border border-slate-800">
                            <Cog className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                            <div className="min-w-0">
                              <span className="text-[10px] text-slate-500 block">Accompanying Machine</span>
                              <span className="font-bold text-white truncate block">
                                {disp.machine.name}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
