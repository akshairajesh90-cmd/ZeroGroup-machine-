"use client";

import { useState, useEffect, useRef, useOptimistic } from "react";
import {
  Camera, Droplets, Timer, Clock,
  CloudOff, Minus, Plus, ChevronRight, CheckCircle2,
} from "lucide-react";
import { submitDocket } from "@/actions/operator";
import { queueOfflineAction } from "@/lib/offlineQueue";
import { compressAndPreview } from "@/lib/imageCompression";

// ─── Swipe-to-Confirm Component ───────────────────────────────────────────────
function SwipeToConfirm({
  onConfirm,
  disabled,
  label,
}: {
  onConfirm: () => void;
  disabled: boolean;
  label: string;
}) {
  const [dragX, setDragX] = useState(0);
  const [confirmed, setConfirmed] = useState(false);
  const trackRef = useRef<HTMLDivElement>(null);
  const isDragging = useRef(false);
  const startX = useRef(0);

  const TRACK_WIDTH = typeof window !== "undefined" ? Math.min(window.innerWidth - 48, 420) : 380;
  const THUMB_WIDTH = 64;
  const MAX_DRAG = TRACK_WIDTH - THUMB_WIDTH - 8; // 8px padding

  const getClientX = (e: React.TouchEvent | React.MouseEvent) => {
    if ("touches" in e) return e.touches[0].clientX;
    return (e as React.MouseEvent).clientX;
  };

  const handleStart = (e: React.TouchEvent | React.MouseEvent) => {
    if (disabled || confirmed) return;
    isDragging.current = true;
    startX.current = getClientX(e) - dragX;
  };

  const handleMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!isDragging.current || disabled) return;
    const newX = Math.max(0, Math.min(MAX_DRAG, getClientX(e) - startX.current));
    setDragX(newX);
  };

  const handleEnd = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    if (dragX >= MAX_DRAG * 0.85) {
      setDragX(MAX_DRAG);
      setConfirmed(true);
      setTimeout(onConfirm, 200);
    } else {
      setDragX(0);
    }
  };

  return (
    <div
      ref={trackRef}
      className={`relative w-full h-16 rounded-xl overflow-hidden select-none touch-none ${
        disabled ? "opacity-40" : ""
      } ${confirmed ? "bg-emerald-600" : "bg-orange-600"}`}
    >
      {/* Track label */}
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-white font-black uppercase tracking-widest text-sm ml-16 opacity-80">
          {confirmed ? "Submitted!" : label}
        </span>
        {!confirmed && <ChevronRight className="text-white/60 w-5 h-5 ml-1" />}
        {confirmed && <CheckCircle2 className="text-white w-5 h-5 ml-2" />}
      </div>

      {/* Draggable thumb */}
      <div
        className="absolute top-1 left-1 w-14 h-14 bg-white rounded-lg flex items-center justify-center shadow-lg cursor-grab active:cursor-grabbing transition-shadow"
        style={{ transform: `translateX(${dragX}px)`, touchAction: "none" }}
        onMouseDown={handleStart}
        onMouseMove={handleMove}
        onMouseUp={handleEnd}
        onMouseLeave={handleEnd}
        onTouchStart={handleStart}
        onTouchMove={handleMove}
        onTouchEnd={handleEnd}
      >
        <ChevronRight className="w-7 h-7 text-orange-600" />
      </div>
    </div>
  );
}

// ─── Stepper Component ────────────────────────────────────────────────────────
function Stepper({
  label,
  value,
  unit,
  step = 1,
  onChange,
  icon: Icon,
}: {
  label: string;
  value: number;
  unit: string;
  step?: number;
  onChange: (n: number) => void;
  icon: React.ElementType;
}) {
  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 text-orange-400" />
        <label className="text-[10px] text-zinc-500 uppercase font-bold">{label}</label>
      </div>
      <div className="flex items-center justify-between gap-2">
        <button
          onClick={() => onChange(Math.max(0, value - step))}
          className="w-16 h-16 rounded-xl bg-zinc-800 text-white text-2xl font-black flex items-center justify-center active:bg-zinc-700 transition-colors"
        >
          <Minus className="w-6 h-6" />
        </button>
        <span className="text-3xl font-black text-white tabular-nums flex-1 text-center">
          {value} <span className="text-sm text-zinc-500 font-bold">{unit}</span>
        </span>
        <button
          onClick={() => onChange(value + step)}
          className="w-16 h-16 rounded-xl bg-zinc-800 text-white text-2xl font-black flex items-center justify-center active:bg-zinc-700 transition-colors"
        >
          <Plus className="w-6 h-6" />
        </button>
      </div>
    </div>
  );
}

// ─── Camera Capture Field ─────────────────────────────────────────────────────
function CameraField({
  label,
  fieldName,
  onCapture,
  preview,
}: {
  label: string;
  fieldName: string;
  onCapture: (blob: Blob, preview: string, fieldName: string) => void;
  preview?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const { blob, previewUrl } = await compressAndPreview(file);
    onCapture(blob, previewUrl, fieldName);
  };

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleChange}
      />
      {preview ? (
        <button
          onClick={() => inputRef.current?.click()}
          className="relative w-full rounded-xl overflow-hidden border-2 border-orange-500/50"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt={label} className="w-full h-28 object-cover" />
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
            <p className="text-white text-xs font-bold uppercase">Retake</p>
          </div>
          <div className="absolute top-2 left-2 bg-emerald-600 text-white text-[10px] font-black uppercase px-2 py-1 rounded-lg">
            ✓ Captured
          </div>
        </button>
      ) : (
        <button
          onClick={() => inputRef.current?.click()}
          className="w-full h-16 rounded-xl bg-zinc-950 border-2 border-dashed border-zinc-700 text-zinc-400 hover:border-orange-500/60 hover:text-orange-400 transition-colors flex items-center justify-center gap-3 font-black text-sm uppercase tracking-wide"
        >
          <Camera className="w-5 h-5" />
          {label}
        </button>
      )}
    </div>
  );
}

// ─── Main DocketCanvas ────────────────────────────────────────────────────────
export default function DocketCanvas({ dispatchId, machineType, existingDocket }: any) {
  const [isOffline, setIsOffline] = useState(false);

  const [formData, setFormData] = useState({
    dispatchId,
    startMeter: existingDocket?.startMeterReading ?? 0,
    endMeter: existingDocket?.endMeterReading ?? 0,
    waterAdded: existingDocket?.waterAddedVolume ?? 0,
    washoutMinutes: existingDocket?.washoutTimerMinutes ?? 0,
    standbyMinutes: existingDocket?.standbyMinutes ?? 0,
    clientName: existingDocket?.clientPrintedName ?? "",
  });

  // Photos stored as Blobs in IndexedDB — previews as local object URLs
  const [photos, setPhotos] = useState<{
    startMeterPhoto?: { blob: Blob; previewUrl: string };
    endMeterPhoto?: { blob: Blob; previewUrl: string };
    docketPhoto?: { blob: Blob; previewUrl: string };
  }>({});

  const [optimisticState, addOptimisticState] = useOptimistic(
    { status: "idle", error: null as string | null },
    (state, newState: { status: string; error?: string | null }) => ({ ...state, ...newState })
  );

  // Network monitor
  useEffect(() => {
    const on = () => setIsOffline(false);
    const off = () => setIsOffline(true);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    setIsOffline(!navigator.onLine);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);

  const updateField = (field: string, value: any) =>
    setFormData(prev => ({ ...prev, [field]: value }));

  const handlePhotoCapture = (blob: Blob, previewUrl: string, fieldName: string) => {
    setPhotos(prev => ({ ...prev, [fieldName]: { blob, previewUrl } }));
  };

  const handleSubmit = async () => {
    addOptimisticState({ status: "submitting" });

    const photoEntries = Object.entries(photos)
      .filter(([, v]) => v != null)
      .map(([fieldName, v]) => ({ blob: v!.blob, fieldName }));

    if (!navigator.onLine) {
      // Queue with raw Blobs in IndexedDB — NO base64 conversion
      await queueOfflineAction(
        "submitDocket",
        {
          dispatchId: formData.dispatchId,
          startMeter: formData.startMeter,
          endMeter: formData.endMeter,
          waterAdded: formData.waterAdded,
          washoutMinutes: formData.washoutMinutes,
          standbyMinutes: formData.standbyMinutes,
          clientName: formData.clientName,
          photoEntries,
        }
      );
      addOptimisticState({ status: "success" });
      return;
    }

    // Online: send photos directly
    try {
      const fd = new FormData();
      fd.append("dispatchId", formData.dispatchId);
      fd.append("startMeter", String(formData.startMeter));
      fd.append("endMeter", String(formData.endMeter));
      fd.append("waterAdded", String(formData.waterAdded));
      fd.append("washoutMinutes", String(formData.washoutMinutes));
      fd.append("standbyMinutes", String(formData.standbyMinutes));
      fd.append("clientName", formData.clientName);
      for (const { blob, fieldName } of photoEntries) {
        fd.append(fieldName, blob, `${fieldName}_${Date.now()}.jpg`);
      }
      const localId = await queueOfflineAction("SUBMIT_DOCKET", { ...formData });
      const result = await submitDocket(fd);
      if (!result.success) throw new Error(result.error);
      addOptimisticState({ status: "success" });
    } catch (err: any) {
      addOptimisticState({ status: "idle", error: err.message });
      alert("Error: " + err.message);
    }
  };

  const isConcrete = machineType === "MIXER" || machineType === "PUMP";
  const isSuccess = optimisticState.status === "success";
  const isSubmitting = optimisticState.status === "submitting";

  return (
    <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-5 space-y-6">

      {/* Offline Status */}
      {isOffline && (
        <div className="bg-zinc-800 border border-zinc-600 p-3 rounded-xl flex items-center gap-3">
          <CloudOff className="text-yellow-400 w-5 h-5" />
          <div>
            <p className="text-xs font-bold text-yellow-300 uppercase tracking-widest">Offline Mode</p>
            <p className="text-[10px] text-zinc-400">Docket will sync when connection returns.</p>
          </div>
        </div>
      )}

      {/* Hour Meters with Camera Capture */}
      {!!machineType && (
        <div>
          <h3 className="text-[11px] font-black uppercase tracking-widest text-zinc-500 mb-3">Hour Meters</h3>
          <div className="space-y-3">
            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
              <label className="text-[10px] text-zinc-500 uppercase font-bold block mb-2">Start Meter</label>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="number"
                  value={formData.startMeter || ""}
                  onChange={(e) => updateField("startMeter", parseFloat(e.target.value) || 0)}
                  className="w-full bg-transparent text-white font-black text-2xl outline-none"
                  placeholder="0.0"
                />
              </div>
              <CameraField
                label="Snap Meter Reading"
                fieldName="startMeterPhoto"
                onCapture={handlePhotoCapture}
                preview={photos.startMeterPhoto?.previewUrl}
              />
            </div>

            <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3">
              <label className="text-[10px] text-zinc-500 uppercase font-bold block mb-2">End Meter</label>
              <div className="flex items-center gap-2 mb-2">
                <input
                  type="number"
                  value={formData.endMeter || ""}
                  onChange={(e) => updateField("endMeter", parseFloat(e.target.value) || 0)}
                  className="w-full bg-transparent text-white font-black text-2xl outline-none"
                  placeholder="0.0"
                />
              </div>
              <CameraField
                label="Snap Meter Reading"
                fieldName="endMeterPhoto"
                onCapture={handlePhotoCapture}
                preview={photos.endMeterPhoto?.previewUrl}
              />
            </div>
          </div>
        </div>
      )}

      {/* Concrete & Washout (Steppers) */}
      {isConcrete && (
        <div className="space-y-3 border-t border-zinc-800 pt-5">
          <h3 className="text-[11px] font-black uppercase tracking-widest text-zinc-500 mb-2">Concrete & Washout</h3>
          <Stepper
            label="Water Added"
            value={formData.waterAdded}
            unit="L"
            step={5}
            onChange={(n) => updateField("waterAdded", n)}
            icon={Droplets}
          />
          <Stepper
            label="Washout Time"
            value={formData.washoutMinutes}
            unit="min"
            step={5}
            onChange={(n) => updateField("washoutMinutes", n)}
            icon={Timer}
          />
        </div>
      )}


      {/* Proof of Work — Camera instead of signature canvas */}
      <div className="border-t border-zinc-800 pt-5">
        <h3 className="text-[11px] font-black uppercase tracking-widest text-zinc-500 mb-3 flex items-center gap-2">
          <Camera className="w-4 h-4" /> Proof of Work
        </h3>
        <input
          type="text"
          placeholder="Client Printed Name"
          value={formData.clientName}
          onChange={(e) => updateField("clientName", e.target.value)}
          className="w-full bg-zinc-950 border border-zinc-800 rounded-xl p-4 text-white text-sm outline-none focus:border-orange-500 mb-3"
        />
        <CameraField
          label="Capture Signed Paper Docket"
          fieldName="docketPhoto"
          onCapture={handlePhotoCapture}
          preview={photos.docketPhoto?.previewUrl}
        />
      </div>

      {/* Swipe-to-Confirm Submit */}
      <SwipeToConfirm
        onConfirm={handleSubmit}
        disabled={isSubmitting || isSuccess}
        label={isOffline ? "Swipe to Save Offline" : "Swipe to Sync Docket"}
      />

      {isSuccess && (
        <p className="text-center text-xs font-bold text-emerald-400 uppercase tracking-widest">
          {isOffline ? "Saved locally. Will auto-sync." : "Docket Synced! ✓"}
        </p>
      )}
    </div>
  );
}
