"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { X, Loader2, Wrench } from "lucide-react";
import { createMachine } from "../actions";
import { MachineType, MachineStatus } from "@prisma/client";

// ─── Validation Schema ───────────────────────────────────────────────────────

const schema = z.object({
  machineId: z.string().min(2, "Machine ID must be at least 2 characters (e.g. MIX-001)").max(20),
  type: z.nativeEnum(MachineType),
  status: z.nativeEnum(MachineStatus),
  operatorDailyPayout: z
    .number({ error: "Enter a valid number" })
    .positive("Must be greater than 0"),
  fuelConsumptionThreshold: z
    .number({ error: "Enter a valid number" })
    .positive("Must be greater than 0"),
});

type FormData = z.infer<typeof schema>;

const MACHINE_TYPE_LABELS: Record<MachineType, string> = {
  MIXER: "🪣 Mixer",
  LIFT: "🏗️ Lift",
  VIBRATOR: "🔧 Vibrator",
  PANI: "💧 Pani (Water Pump)",
  INDEPENDENT: "👷 Independent Labor",
};

const STATUS_LABELS: Record<MachineStatus, string> = {
  AVAILABLE: "Available",
  RENTED: "Rented",
  REPAIR: "In Repair",
  RETIRED: "Retired",
};

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function AddMachineModal({ open, onClose }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: MachineType.MIXER,
      status: MachineStatus.AVAILABLE,
      operatorDailyPayout: 1200,
      fuelConsumptionThreshold: 2000,
    },
  });

  const onSubmit = async (data: FormData) => {
    try {
      await createMachine({
        machineId: data.machineId,
        type: data.type,
        status: data.status ?? MachineStatus.AVAILABLE,
        operatorDailyPayout: data.operatorDailyPayout,
        fuelConsumptionThreshold: data.fuelConsumptionThreshold,
      });
      toast.success(`Machine ${data.machineId} added to fleet!`);
      reset();
      onClose();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to create machine. Please try again.");
    }
  };

  const handleClose = () => {
    if (isSubmitting) return;
    reset();
    onClose();
  };

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        onClick={handleClose}
        aria-hidden="true"
      />

      {/* Sheet — slides up from bottom on mobile, centered on desktop */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Add Machine"
        className="fixed z-50 inset-x-0 bottom-0 md:inset-0 md:flex md:items-center md:justify-center"
      >
        <div className="w-full md:max-w-lg bg-slate-900 border border-white/10 rounded-t-3xl md:rounded-2xl shadow-2xl overflow-hidden">
          {/* Handle (mobile) */}
          <div className="flex justify-center pt-3 md:hidden">
            <div className="w-12 h-1 rounded-full bg-slate-700" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
                <Wrench className="w-5 h-5 text-indigo-400" />
              </div>
              <div>
                <h2 className="text-base font-black text-white">Add New Machine</h2>
                <p className="text-xs text-slate-500">Fill in machine details to register in fleet</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">

            {/* Machine ID */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Machine ID *
              </label>
              <input
                {...register("machineId")}
                placeholder="e.g. MIX-001, LFT-003"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-mono text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 transition-all"
              />
              {errors.machineId && (
                <p className="text-xs text-red-400 mt-1">{errors.machineId.message}</p>
              )}
            </div>

            {/* Type */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Machine Type *
              </label>
              <select
                {...register("type")}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
              >
                {Object.entries(MACHINE_TYPE_LABELS).map(([val, label]) => (
                  <option key={val} value={val} className="bg-slate-900">
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Initial Status
              </label>
              <select
                {...register("status")}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
              >
                {(["AVAILABLE", "RENTED", "REPAIR"] as MachineStatus[]).map((s) => (
                  <option key={s} value={s} className="bg-slate-900">
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>

            {/* Financial Fields */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Op. Daily Payout (₹) *
                </label>
                <input
                  type="number"
                  step="50"
                  {...register("operatorDailyPayout", { valueAsNumber: true })}
                  placeholder="1200"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                />
                {errors.operatorDailyPayout && (
                  <p className="text-xs text-red-400 mt-1">{errors.operatorDailyPayout.message}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                  Fuel Threshold (₹)
                </label>
                <input
                  type="number"
                  step="100"
                  {...register("fuelConsumptionThreshold", { valueAsNumber: true })}
                  placeholder="2000"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                />
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-black text-sm transition-all active:scale-[0.98] mt-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Adding Machine…
                </>
              ) : (
                "Add Machine to Fleet"
              )}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
