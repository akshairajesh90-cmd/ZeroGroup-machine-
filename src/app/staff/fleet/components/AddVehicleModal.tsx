"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { X, Loader2, Truck } from "lucide-react";
import { createVehicle } from "../actions";
import { VehicleStatus } from "@prisma/client";

// ─── Validation Schema ───────────────────────────────────────────────────────

const schema = z.object({
  licensePlate: z
    .string()
    .min(4, "License plate must be at least 4 characters")
    .max(15),
  type: z.string().min(2, "Vehicle type is required").max(30),
  status: z.nativeEnum(VehicleStatus),
});

type FormData = z.infer<typeof schema>;

const COMMON_VEHICLE_TYPES = [
  "Flatbed Truck",
  "Pickup Truck",
  "Mini Truck",
  "Van",
  "Tata Ace",
  "Tempo",
  "SUV",
  "Other",
];

const STATUS_LABELS: Record<string, string> = {
  AVAILABLE: "Available",
  IN_USE: "In Use",
  REPAIR: "In Repair",
};

// ─── Component ───────────────────────────────────────────────────────────────

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function AddVehicleModal({ open, onClose }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: "Flatbed Truck",
      status: VehicleStatus.AVAILABLE,
      licensePlate: "",
    },
  });

  const typeValue = watch("type");

  const onSubmit = async (data: FormData) => {
    try {
      await createVehicle({
        licensePlate: data.licensePlate.toUpperCase(),
        type: data.type,
        status: data.status ?? VehicleStatus.AVAILABLE,
      });
      toast.success(`Vehicle ${data.licensePlate.toUpperCase()} registered!`);
      reset();
      onClose();
    } catch (e: any) {
      toast.error(e.message ?? "Failed to register vehicle. License plate may already be in use.");
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

      {/* Bottom Sheet / Centered Modal */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Add Vehicle"
        className="fixed z-50 inset-x-0 bottom-0 md:inset-0 md:flex md:items-center md:justify-center"
      >
        <div className="w-full md:max-w-lg bg-slate-900 border border-white/10 rounded-t-3xl md:rounded-2xl shadow-2xl overflow-hidden">
          {/* Drag Handle (mobile only) */}
          <div className="flex justify-center pt-3 md:hidden">
            <div className="w-12 h-1 rounded-full bg-slate-700" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center">
                <Truck className="w-5 h-5 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-base font-black text-white">Register Vehicle</h2>
                <p className="text-xs text-slate-500">Add a vehicle to fleet for logistics tracking</p>
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

            {/* License Plate */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                License Plate *
              </label>
              <input
                {...register("licensePlate")}
                placeholder="e.g. KL-01-AB-1234"
                autoCapitalize="characters"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm font-mono text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all uppercase"
                onChange={(e) => {
                  e.target.value = e.target.value.toUpperCase();
                  register("licensePlate").onChange(e);
                }}
              />
              {errors.licensePlate && (
                <p className="text-xs text-red-400 mt-1">{errors.licensePlate.message}</p>
              )}
            </div>

            {/* Vehicle Type — Quick Select Chips */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Vehicle Type *
              </label>
              <div className="flex flex-wrap gap-2 mb-3">
                {COMMON_VEHICLE_TYPES.filter(t => t !== "Other").map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setValue("type", t)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                      typeValue === t
                        ? "bg-cyan-600 border-cyan-500 text-white"
                        : "bg-white/5 border-white/10 text-slate-400 hover:text-white hover:border-white/20"
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <input
                {...register("type")}
                placeholder="Or type a custom vehicle type…"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 transition-all"
              />
              {errors.type && (
                <p className="text-xs text-red-400 mt-1">{errors.type.message}</p>
              )}
            </div>

            {/* Status */}
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                Initial Status
              </label>
              <div className="flex gap-2">
                {(["AVAILABLE", "IN_USE", "REPAIR"] as const).map((s) => (
                  <label key={s} className="flex-1 cursor-pointer">
                    <input
                      type="radio"
                      value={s}
                      {...register("status")}
                      className="sr-only"
                    />
                    <div className={`text-center py-2.5 rounded-xl text-xs font-bold border transition-all ${
                      watch("status") === s
                        ? s === "AVAILABLE"
                          ? "bg-emerald-600 border-emerald-500 text-white"
                          : s === "REPAIR"
                          ? "bg-red-600 border-red-500 text-white"
                          : "bg-blue-600 border-blue-500 text-white"
                        : "bg-white/5 border-white/10 text-slate-400 hover:text-white"
                    }`}>
                      {STATUS_LABELS[s]}
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Compliance Reminder */}
            <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl px-4 py-3">
              <span className="text-lg">📋</span>
              <p className="text-xs text-amber-300 leading-relaxed">
                Remember to upload RC, Insurance, and Fitness certificates in the vehicle detail page after registration.
              </p>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 py-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-black text-sm transition-all active:scale-[0.98] mt-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Registering…
                </>
              ) : (
                "Register Vehicle"
              )}
            </button>
          </form>
        </div>
      </div>
    </>
  );
}
