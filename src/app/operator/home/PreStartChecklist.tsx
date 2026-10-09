"use client";

import { useState, useRef } from "react";
import { CheckCircle2, AlertTriangle, ShieldCheck, Camera, XCircle } from "lucide-react";
import { compressAndPreview } from "@/lib/imageCompression";
import { submitPreStartChecklist } from "@/actions/operator";

const CHECKLIST_ITEMS = [
  { id: "hydraulics", label: "Hydraulics & PTO" },
  { id: "outriggers", label: "Outriggers & Stabilizers" },
  { id: "eStop",      label: "Emergency Stop Tested" },
  { id: "leaks",      label: "No Visible Fluid Leaks" },
];

type CheckState = "UNCHECKED" | "PASS" | "FAIL";

export default function PreStartChecklist({
  operatorType,
  machineId,
}: {
  operatorType: string;
  machineId?: string;
}) {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [checks, setChecks] = useState<Record<string, CheckState>>({
    hydraulics: "UNCHECKED",
    outriggers:  "UNCHECKED",
    eStop:       "UNCHECKED",
    leaks:       "UNCHECKED",
    liability:   "UNCHECKED",
  });

  // Each FAIL requires a damage photo
  const [damagePhotos, setDamagePhotos] = useState<Record<string, { blob: Blob; previewUrl: string } | null>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const isSubcontractor = operatorType === "SUBCONTRACTOR";
  const failedItems = Object.entries(checks).filter(([, v]) => v === "FAIL");
  const hasAllChecked = Object.entries(checks).every(([key, v]) => {
    if (key === "liability" && !isSubcontractor) return true;
    return v !== "UNCHECKED";
  });
  const failsWithoutPhoto = failedItems.filter(([key]) => !damagePhotos[key]);
  const canUnlock = hasAllChecked && failsWithoutPhoto.length === 0;

  const toggle = (id: string, value: CheckState) => {
    setChecks(prev => ({ ...prev, [id]: value }));
    // Clear damage photo if toggling back to PASS
    if (value === "PASS" && damagePhotos[id]) {
      setDamagePhotos(prev => ({ ...prev, [id]: null }));
    }
  };

  const handlePhotoCapture = async (id: string, file: File | null) => {
    if (!file) return;
    const compressed = await compressAndPreview(file);
    setDamagePhotos(prev => ({ ...prev, [id]: compressed }));
  };

  const handleUnlock = async () => {
    if (!canUnlock) return;
    setIsSubmitting(true);

    const hasFail = failedItems.length > 0;
    if (hasFail && machineId) {
      const photos = failedItems
        .map(([key]) => damagePhotos[key] ? { blob: damagePhotos[key]!.blob, fieldName: `damage_${key}` } : null)
        .filter(Boolean) as { blob: Blob; fieldName: string }[];

      const result = await submitPreStartChecklist({
        machineId,
        hasFail: true,
        damageDescription: `Pre-start FAIL: ${failedItems.map(([k]) => k).join(", ")}`,
        photos,
      });

      if (!result.success) {
        alert("Failed to submit checklist: " + result.error);
        setIsSubmitting(false);
        return;
      }
    }

    setIsUnlocked(true);
    setIsSubmitting(false);
  };

  if (isUnlocked) {
    return (
      <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-7 h-7 text-emerald-500" />
          <div>
            <p className="text-base font-bold text-white">Pre-Start Complete</p>
            <p className="text-[10px] text-emerald-400 uppercase tracking-widest font-black mt-0.5">Machine Authorized</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5">
      <div className="flex items-center gap-2 mb-5">
        <AlertTriangle className="w-5 h-5 text-orange-500" />
        <h2 className="text-sm font-black text-white uppercase tracking-wider">Mandatory Pre-Start</h2>
      </div>

      <div className="space-y-3">
        {CHECKLIST_ITEMS.map((item) => (
          <div key={item.id}>
            {/* PASS / FAIL Toggle Row */}
            <div className="flex gap-2">
              <button
                onClick={() => toggle(item.id, "PASS")}
                className={`flex-1 h-14 rounded-xl font-black uppercase tracking-wide text-sm flex items-center justify-center gap-2 transition-all border-2 ${
                  checks[item.id] === "PASS"
                    ? "bg-emerald-600 border-emerald-500 text-white"
                    : "bg-zinc-950 border-zinc-700 text-zinc-400"
                }`}
              >
                <CheckCircle2 className="w-5 h-5" /> PASS
              </button>
              <div className="flex items-center justify-center min-w-[120px]">
                <span className="text-xs font-bold text-zinc-400 text-center leading-tight">{item.label}</span>
              </div>
              <button
                onClick={() => toggle(item.id, "FAIL")}
                className={`flex-1 h-14 rounded-xl font-black uppercase tracking-wide text-sm flex items-center justify-center gap-2 transition-all border-2 ${
                  checks[item.id] === "FAIL"
                    ? "bg-red-600 border-red-500 text-white"
                    : "bg-zinc-950 border-zinc-700 text-zinc-400"
                }`}
              >
                <XCircle className="w-5 h-5" /> FAIL
              </button>
            </div>

            {/* Damage Photo Upload — Only shown on FAIL */}
            {checks[item.id] === "FAIL" && (
              <div className="mt-2 ml-1">
                <input
                  ref={(el) => { fileInputRefs.current[item.id] = el; }}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => handlePhotoCapture(item.id, e.target.files?.[0] ?? null)}
                />
                {damagePhotos[item.id] ? (
                  <div className="flex items-center gap-3 p-3 bg-red-950/30 border border-red-500/30 rounded-xl">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={damagePhotos[item.id]!.previewUrl} alt="Damage" className="w-14 h-14 rounded-lg object-cover" />
                    <div>
                      <p className="text-xs font-bold text-red-400">Photo Captured ✓</p>
                      <button
                        onClick={() => fileInputRefs.current[item.id]?.click()}
                        className="text-[10px] text-zinc-400 underline mt-1"
                      >
                        Retake
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={() => fileInputRefs.current[item.id]?.click()}
                    className="w-full h-14 rounded-xl bg-red-950/30 border-2 border-red-500/60 border-dashed text-red-400 font-black text-xs uppercase tracking-wide flex items-center justify-center gap-2"
                  >
                    <Camera className="w-5 h-5" />
                    Required: Photo of Damage
                  </button>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Subcontractor Liability Handover */}
        {isSubcontractor && (
          <div className="mt-4">
            <div className="flex gap-2">
              <button
                onClick={() => toggle("liability", "PASS")}
                className={`flex-1 h-14 rounded-xl font-black uppercase tracking-wide text-sm flex items-center justify-center gap-2 transition-all border-2 ${
                  checks.liability === "PASS"
                    ? "bg-emerald-600 border-emerald-500 text-white"
                    : "bg-zinc-950 border-zinc-700 text-zinc-400"
                }`}
              >
                <CheckCircle2 className="w-5 h-5" /> ACCEPT
              </button>
              <div className="flex items-center justify-center min-w-[120px]">
                <span className="text-[10px] font-black text-red-400 uppercase text-center leading-tight">Liability Handover</span>
              </div>
              <button
                onClick={() => toggle("liability", "FAIL")}
                className={`flex-1 h-14 rounded-xl font-black uppercase tracking-wide text-sm flex items-center justify-center gap-2 transition-all border-2 ${
                  checks.liability === "FAIL"
                    ? "bg-red-600 border-red-500 text-white"
                    : "bg-zinc-950 border-zinc-700 text-zinc-400"
                }`}
              >
                <XCircle className="w-5 h-5" /> DENY
              </button>
            </div>
            <p className="text-[10px] text-zinc-500 mt-2 ml-1 leading-snug">
              Accepting transfers responsibility for this machine's current condition.
            </p>
          </div>
        )}
      </div>

      <button
        disabled={!canUnlock || isSubmitting}
        onClick={handleUnlock}
        className="mt-6 w-full h-16 rounded-xl font-black uppercase tracking-wider transition-colors disabled:bg-zinc-800 disabled:text-zinc-600 bg-orange-600 text-white active:bg-orange-700 flex items-center justify-center gap-2 text-base"
      >
        <CheckCircle2 className="w-6 h-6" />
        {isSubmitting ? "Submitting..." : "Unlock Machine"}
      </button>
    </div>
  );
}
