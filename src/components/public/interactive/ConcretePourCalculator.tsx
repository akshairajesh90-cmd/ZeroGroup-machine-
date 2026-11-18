"use client";

import React, { useState, useMemo } from "react";
import { Calculator, ArrowRight, Truck, HardHat, Zap } from "lucide-react";

type StructureType = "foundation" | "slab" | "column" | "retaining";

const STRUCTURE_LABELS: Record<StructureType, string> = {
  foundation: "Foundation / Footings",
  slab: "Roof / Floor Slab",
  column: "Columns / Beams",
  retaining: "Retaining Wall / Tank",
};

function calculateRecommendation(volume: number, hours: number, structure: StructureType) {
  // Approx 10/7 mixer: ~0.5 m³ per batch, ~6 batches/hr = 3 m³/hr actual output
  const mixerOutputPerHr = 2.8; // m³/hr actual on-site with loading/unloading
  const mixersNeeded = Math.ceil(volume / (hours * mixerOutputPerHr));

  // Cement bags (50kg): 1 m³ = ~8 bags for M20 standard mix
  const cementBags = Math.round(volume * 8);
  const totalBatches = Math.ceil(volume / 0.5);

  // Operator count
  const operatorsNeeded = mixersNeeded + 1; // 1 per mixer + 1 site supervisor
  const helpersNeeded = mixersNeeded * 2; // 2 helpers per mixer for loading

  // Recommend hoist for multi-floor
  const needHoist = ["slab", "column"].includes(structure) && volume > 20;

  // Vibrator always recommended for slab/column
  const needVibrator = ["slab", "column"].includes(structure);

  // Pump for foundation (dewatering if season)
  const needPump = structure === "foundation";

  const equipment = [
    { icon: "⚙", name: `${mixersNeeded}× 10/7 Reversible Drum Mixer`, reason: "Primary batching" },
    ...(needVibrator ? [{ icon: "⚡", name: "1× High-Freq Needle Vibrator", reason: "Concrete compaction" }] : []),
    ...(needHoist ? [{ icon: "🏗", name: "1× 1-Ton Material Hoist", reason: "High-rise material lift" }] : []),
    ...(needPump ? [{ icon: "💧", name: "1× Diesel Dewatering Pump", reason: "Foundation dewatering" }] : []),
  ];

  return {
    mixersNeeded,
    cementBags,
    totalBatches,
    operatorsNeeded,
    helpersNeeded,
    equipment,
    totalHireRateEst: `₹${(mixersNeeded * 1800 + (needVibrator ? 600 : 0) + (needHoist ? 2500 : 0) + (needPump ? 1200 : 0)).toLocaleString("en-IN")}/day`,
    pourTime: Math.round((volume / (mixersNeeded * mixerOutputPerHr)) * 10) / 10,
  };
}

interface ConcretePourCalculatorProps {
  onApplyToInquiry?: (params: { machine: string; duration: string; notes: string }) => void;
}

export default function ConcretePourCalculator({ onApplyToInquiry }: ConcretePourCalculatorProps) {
  const [volume, setVolume] = useState(30);
  const [hours, setHours] = useState(8);
  const [structure, setStructure] = useState<StructureType>("slab");

  const result = useMemo(() => calculateRecommendation(volume, hours, structure), [volume, hours, structure]);

  const handleApply = () => {
    const equipList = result.equipment.map((e) => e.name).join(", ");
    onApplyToInquiry?.({
      machine: result.equipment[0]?.name.replace(/^\d+×\s*/, "").trim() || "Concrete Mixer",
      duration: `${hours} Hours Pour (${volume} m³)`,
      notes: `Calculated pour: ${volume} m³ ${STRUCTURE_LABELS[structure]}. Recommended: ${equipList}. Crew: ${result.operatorsNeeded} operators + ${result.helpersNeeded} helpers. Cement: ${result.cementBags} bags.`,
    });
  };

  return (
    <section className="relative py-20 md:py-28 bg-slate-950 border-b border-slate-800/60">
      {/* Background */}
      <div className="absolute inset-0 pointer-events-none opacity-30">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#fa5402]/5 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-green-500/10 border border-green-500/25 text-xs font-bold text-green-400 mb-4 uppercase tracking-widest">
            <Calculator className="w-3.5 h-3.5" />
            Site Engineering Calculator
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Concrete Pour &amp; <span className="text-[#fa5402]">Fleet Planner</span>
          </h2>
          <p className="mt-3 text-slate-400 text-sm max-w-xl mx-auto">
            Enter your pour volume and target time. Get an instant equipment recommendation and estimated crew count — ready to send as your WhatsApp inquiry.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Input Column */}
          <div className="space-y-6">
            {/* Volume Slider */}
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800">
              <div className="flex justify-between items-baseline mb-3">
                <label className="text-xs font-bold text-white uppercase tracking-wider">Concrete Volume</label>
                <span className="text-2xl font-extrabold text-[#fa5402] font-mono">{volume} m³</span>
              </div>
              <input
                type="range"
                min={5}
                max={300}
                step={5}
                value={volume}
                onChange={(e) => setVolume(Number(e.target.value))}
                className="w-full estimator-slider cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>5 m³</span>
                <span>150 m³</span>
                <span>300 m³</span>
              </div>
            </div>

            {/* Target Hours Slider */}
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800">
              <div className="flex justify-between items-baseline mb-3">
                <label className="text-xs font-bold text-white uppercase tracking-wider">Target Pour Time</label>
                <span className="text-2xl font-extrabold text-[#f59e0b] font-mono">{hours} hrs</span>
              </div>
              <input
                type="range"
                min={2}
                max={24}
                step={1}
                value={hours}
                onChange={(e) => setHours(Number(e.target.value))}
                className="w-full estimator-slider cursor-pointer"
                style={{ accentColor: "#f59e0b" }}
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>2 hrs</span>
                <span>12 hrs</span>
                <span>24 hrs</span>
              </div>
            </div>

            {/* Structure Type */}
            <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800">
              <label className="text-xs font-bold text-white uppercase tracking-wider block mb-3">Structure Type</label>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(STRUCTURE_LABELS) as StructureType[]).map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setStructure(s)}
                    className={`py-2.5 px-3 text-xs font-semibold rounded-xl border transition-all cursor-pointer text-left ${
                      structure === s
                        ? "bg-[#fa5402] text-white border-[#fa5402] shadow-sm"
                        : "bg-slate-950 text-slate-400 border-slate-800 hover:border-[#fa5402]/40 hover:text-white"
                    }`}
                  >
                    {STRUCTURE_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Output Column */}
          <div className="space-y-5">
            {/* Summary Metrics */}
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Cement Bags (50kg)", value: result.cementBags.toString(), unit: "bags", color: "#fa5402" },
                { label: "Total Batch Cycles", value: result.totalBatches.toString(), unit: "cycles", color: "#f59e0b" },
                { label: "Actual Pour Time", value: result.pourTime.toString(), unit: "hrs", color: "#10b981" },
                { label: "Est. Hire Rate", value: result.totalHireRateEst, unit: "", color: "#3b82f6" },
              ].map((m) => (
                <div key={m.label} className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">{m.label}</p>
                  <p className="text-xl font-extrabold font-mono" style={{ color: m.color }}>{m.value}</p>
                  {m.unit && <p className="text-[10px] text-slate-500">{m.unit}</p>}
                </div>
              ))}
            </div>

            {/* Equipment Recommendation */}
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-[#fa5402]/20">
              <p className="text-xs font-bold text-[#fa5402] uppercase tracking-wider mb-3">Recommended Fleet Configuration</p>
              <div className="space-y-2.5">
                {result.equipment.map((eq, i) => (
                  <div key={i} className="flex items-center gap-3 p-2.5 rounded-lg bg-slate-950/60 border border-slate-800">
                    <span className="text-lg">{eq.icon}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-white truncate">{eq.name}</p>
                      <p className="text-[10px] text-slate-400">{eq.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Crew Count */}
            <div className="p-4 rounded-xl bg-slate-900/50 border border-slate-800">
              <p className="text-xs font-bold text-white mb-2.5 flex items-center gap-2">
                <HardHat className="w-4 h-4 text-[#fa5402]" strokeWidth={1.5} />
                Recommended Site Crew
              </p>
              <div className="flex gap-4">
                <div>
                  <p className="text-2xl font-extrabold text-[#fa5402] font-mono">{result.operatorsNeeded}</p>
                  <p className="text-[10px] text-slate-400">Certified Operators</p>
                </div>
                <div className="w-px bg-slate-800" />
                <div>
                  <p className="text-2xl font-extrabold text-white font-mono">{result.helpersNeeded}</p>
                  <p className="text-[10px] text-slate-400">Site Helpers / Loaders</p>
                </div>
              </div>
            </div>

            {/* Apply CTA */}
            <button
              type="button"
              onClick={handleApply}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-xl bg-gradient-to-r from-[#fa5402] to-[#e04b01] hover:from-[#e04b01] hover:to-[#c43d00] text-white font-bold text-sm shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 transition-all hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              <Truck className="w-4 h-4" strokeWidth={1.5} />
              Apply to WhatsApp Inquiry
              <ArrowRight className="w-4 h-4" strokeWidth={1.5} />
            </button>

            <p className="text-center text-[10px] text-slate-500">
              Estimates based on Kerala site conditions. Final rates confirmed by yard operations desk.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
