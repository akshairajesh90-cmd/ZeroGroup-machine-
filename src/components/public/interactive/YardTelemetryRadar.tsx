"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { Navigation, Zap, Clock, Truck } from "lucide-react";

interface DistrictData {
  name: string;
  angle: number;
  distance: number; // km from Pala depot
  hours: string;
  protocol: string;
  machines: number;
  color: string;
}

const DISTRICTS: DistrictData[] = [
  { name: "Kottayam", angle: 0, distance: 15, hours: "< 1 hr", protocol: "Priority Dispatch", machines: 12, color: "#fa5402" },
  { name: "Ernakulam", angle: 45, distance: 70, hours: "2–3 hrs", protocol: "NH-66 Direct Flatbed", machines: 8, color: "#f59e0b" },
  { name: "Idukki", angle: 90, distance: 95, hours: "3–5 hrs", protocol: "Ghat Road Transit", machines: 5, color: "#10b981" },
  { name: "Alappuzha", angle: 135, distance: 85, hours: "2–3 hrs", protocol: "Backwater Route", machines: 6, color: "#3b82f6" },
  { name: "Pathanamthitta", angle: 180, distance: 55, hours: "2 hrs", protocol: "MC Road Direct", machines: 7, color: "#8b5cf6" },
  { name: "Thrissur", angle: 215, distance: 110, hours: "3–4 hrs", protocol: "NH-544 Flatbed", machines: 4, color: "#ec4899" },
  { name: "Palakkad", angle: 250, distance: 150, hours: "4–5 hrs", protocol: "Coimbatore Bypass", machines: 3, color: "#14b8a6" },
  { name: "Malappuram", angle: 285, distance: 170, hours: "5 hrs", protocol: "Calicut Corridor", machines: 2, color: "#f97316" },
  { name: "Kozhikode", angle: 310, distance: 195, hours: "5–6 hrs", protocol: "NH-66 Northern", machines: 2, color: "#a78bfa" },
  { name: "Wayanad", angle: 330, distance: 185, hours: "5–6 hrs", protocol: "Sulthan Bathery Road", machines: 2, color: "#6ee7b7" },
  { name: "Kannur", angle: 350, distance: 230, hours: "6+ hrs", protocol: "NH-66 Far North", machines: 1, color: "#fca5a5" },
  { name: "Kasaragod", angle: 15, distance: 260, hours: "7+ hrs", protocol: "Scheduled Next-Day", machines: 1, color: "#c4b5fd" },
  { name: "Kollam", angle: 155, distance: 90, hours: "2–3 hrs", protocol: "NH-66 Southern", machines: 4, color: "#fdba74" },
  { name: "TVM", angle: 170, distance: 155, hours: "4–5 hrs", protocol: "Capital City Direct", machines: 3, color: "#67e8f9" },
];

export default function YardTelemetryRadar() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number>(0);
  const [selectedDistrict, setSelectedDistrict] = useState<DistrictData | null>(null);
  const [hoveredDistrict, setHoveredDistrict] = useState<string | null>(null);
  const sweepAngleRef = useRef(0);

  const getDistrictPos = useCallback((d: DistrictData, cx: number, cy: number, radius: number) => {
    const maxDist = 260;
    const r = (d.distance / maxDist) * radius * 0.88;
    const angle = (d.angle - 90) * (Math.PI / 180);
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * window.devicePixelRatio;
      canvas.height = rect.height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    };
    resize();
    window.addEventListener("resize", resize);

    let frame = 0;
    const draw = () => {
      animRef.current = requestAnimationFrame(draw);
      frame++;

      const rect = canvas.getBoundingClientRect();
      const W = rect.width;
      const H = rect.height;
      const cx = W / 2;
      const cy = H / 2;
      const R = Math.min(W, H) * 0.44;

      ctx.clearRect(0, 0, W, H);

      // ── Background
      ctx.fillStyle = "#050a12";
      ctx.fillRect(0, 0, W, H);

      // ── Radar rings (5 distance rings)
      for (let i = 1; i <= 5; i++) {
        const r = (i / 5) * R;
        ctx.beginPath();
        ctx.arc(cx, cy, r, 0, Math.PI * 2);
        ctx.strokeStyle = i === 1 ? "rgba(250,84,2,0.3)" : "rgba(255,255,255,0.06)";
        ctx.lineWidth = i === 1 ? 1.5 : 1;
        ctx.stroke();

        // Distance labels
        const distKm = Math.round((i / 5) * 260);
        ctx.fillStyle = "rgba(100,116,139,0.6)";
        ctx.font = `${Math.max(9, R * 0.038)}px monospace`;
        ctx.textAlign = "left";
        ctx.fillText(`${distKm}km`, cx + 4, cy - r + 12);
      }

      // ── Grid cross-hairs
      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      ctx.lineWidth = 0.5;
      ctx.beginPath(); ctx.moveTo(cx, cy - R); ctx.lineTo(cx, cy + R); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - R, cy); ctx.lineTo(cx + R, cy); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - R * 0.707, cy - R * 0.707); ctx.lineTo(cx + R * 0.707, cy + R * 0.707); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx + R * 0.707, cy - R * 0.707); ctx.lineTo(cx - R * 0.707, cy + R * 0.707); ctx.stroke();

      // ── Sweep line with trailing glow
      sweepAngleRef.current += 0.025;
      const sweep = sweepAngleRef.current;
      
      // Sweep gradient arc (20 deg trailing)
      for (let i = 0; i < 20; i++) {
        const a = sweep - (i / 20) * (Math.PI / 9);
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, R, a, a + 0.03);
        ctx.closePath();
        ctx.fillStyle = `rgba(250,84,2,${0.08 * (1 - i / 20)})`;
        ctx.fill();
      }

      // Leading edge line
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + R * Math.cos(sweep), cy + R * Math.sin(sweep));
      ctx.strokeStyle = "rgba(250,84,2,0.85)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // ── Transit vector lines from center to districts
      DISTRICTS.forEach((d) => {
        const pos = getDistrictPos(d, cx, cy, R);
        const isSelected = selectedDistrict?.name === d.name;
        const isHovered = hoveredDistrict === d.name;

        // Vector line
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(pos.x, pos.y);
        ctx.strokeStyle = isSelected
          ? d.color
          : isHovered
          ? `${d.color}80`
          : "rgba(255,255,255,0.08)";
        ctx.lineWidth = isSelected ? 1.5 : isHovered ? 1 : 0.5;
        ctx.setLineDash(isSelected ? [] : [4, 6]);
        ctx.stroke();
        ctx.setLineDash([]);

        // Animate pulse along the vector line for selected district
        if (isSelected) {
          const t = (frame / 60) % 1;
          const px = cx + (pos.x - cx) * t;
          const py = cy + (pos.y - cy) * t;
          ctx.beginPath();
          ctx.arc(px, py, 3, 0, Math.PI * 2);
          ctx.fillStyle = d.color;
          ctx.fill();
        }

        // District node
        const nodeR = isSelected ? 7 : isHovered ? 6 : 5;
        
        // Outer glow
        const gradient = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, nodeR * 2.5);
        gradient.addColorStop(0, `${d.color}60`);
        gradient.addColorStop(1, "transparent");
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, nodeR * 2.5, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Node dot
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, nodeR, 0, Math.PI * 2);
        ctx.fillStyle = isSelected || isHovered ? d.color : `${d.color}90`;
        ctx.fill();
        ctx.strokeStyle = "#050a12";
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Label
        const fontSize = Math.max(9, R * 0.042);
        ctx.font = `${isSelected ? "bold " : ""}${fontSize}px sans-serif`;
        ctx.fillStyle = isSelected ? "#ffffff" : isHovered ? d.color : "rgba(148,163,184,0.85)";
        ctx.textAlign = pos.x < cx ? "right" : "left";
        ctx.fillText(d.name, pos.x + (pos.x < cx ? -nodeR - 3 : nodeR + 3), pos.y + 4);

        // Machine count badge for selected
        if (isSelected) {
          ctx.font = `bold ${fontSize - 1}px monospace`;
          ctx.fillStyle = d.color;
          ctx.textAlign = pos.x < cx ? "right" : "left";
          ctx.fillText(`${d.machines} units`, pos.x + (pos.x < cx ? -nodeR - 3 : nodeR + 3), pos.y + 4 + fontSize + 2);
        }
      });

      // ── Center depot dot
      ctx.beginPath();
      ctx.arc(cx, cy, 10, 0, Math.PI * 2);
      const depotGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 20);
      depotGrad.addColorStop(0, "rgba(250,84,2,0.9)");
      depotGrad.addColorStop(1, "transparent");
      ctx.fillStyle = depotGrad;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(cx, cy, 6, 0, Math.PI * 2);
      ctx.fillStyle = "#fa5402";
      ctx.fill();
      ctx.strokeStyle = "#fff";
      ctx.lineWidth = 2;
      ctx.stroke();

      // Depot label
      ctx.font = `bold ${Math.max(10, R * 0.048)}px sans-serif`;
      ctx.fillStyle = "#ffffff";
      ctx.textAlign = "center";
      ctx.fillText("PALA DEPOT", cx, cy + 24);
      ctx.font = `${Math.max(8, R * 0.036)}px sans-serif`;
      ctx.fillStyle = "#fa5402";
      ctx.fillText("Central Yard", cx, cy + 36);
    };

    draw();

    // Click to select district
    const handleClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const W = rect.width;
      const H = rect.height;
      const cx = W / 2;
      const cy = H / 2;
      const R = Math.min(W, H) * 0.44;

      let hit: DistrictData | null = null;
      for (const d of DISTRICTS) {
        const pos = getDistrictPos(d, cx, cy, R);
        const dist = Math.hypot(mx - pos.x, my - pos.y);
        if (dist < 16) { hit = d; break; }
      }
      setSelectedDistrict(hit);
    };

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const W = rect.width;
      const H = rect.height;
      const cx = W / 2;
      const cy = H / 2;
      const R = Math.min(W, H) * 0.44;

      let hit: string | null = null;
      for (const d of DISTRICTS) {
        const pos = getDistrictPos(d, cx, cy, R);
        const dist = Math.hypot(mx - pos.x, my - pos.y);
        if (dist < 16) { hit = d.name; break; }
      }
      setHoveredDistrict(hit);
      canvas.style.cursor = hit ? "pointer" : "default";
    };

    // Touch support
    const handleTouchEnd = (e: TouchEvent) => {
      const touch = e.changedTouches[0];
      const rect = canvas.getBoundingClientRect();
      const mx = touch.clientX - rect.left;
      const my = touch.clientY - rect.top;
      const W = rect.width;
      const H = rect.height;
      const cx = W / 2;
      const cy = H / 2;
      const R = Math.min(W, H) * 0.44;

      let hit: DistrictData | null = null;
      for (const d of DISTRICTS) {
        const pos = getDistrictPos(d, cx, cy, R);
        const dist = Math.hypot(mx - pos.x, my - pos.y);
        if (dist < 20) { hit = d; break; }
      }
      setSelectedDistrict((prev) => prev?.name === hit?.name ? null : hit);
    };

    canvas.addEventListener("click", handleClick);
    canvas.addEventListener("mousemove", handleMouseMove);
    canvas.addEventListener("touchend", handleTouchEnd, { passive: true });

    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resize);
      canvas.removeEventListener("click", handleClick);
      canvas.removeEventListener("mousemove", handleMouseMove);
      canvas.removeEventListener("touchend", handleTouchEnd);
    };
  }, [selectedDistrict, hoveredDistrict, getDistrictPos]);

  return (
    <section className="relative py-20 md:py-28 bg-gradient-to-b from-[#070d16] to-slate-950 border-b border-slate-800/60 overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/25 text-xs font-bold text-blue-400 mb-4 uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-blue-400 animate-pulse" />
            Live Central Depot Distribution Matrix
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
            Pala Base Yard &rarr; <span className="text-[#fa5402]">All 14 Kerala Districts</span>
          </h2>
          <p className="mt-3 text-slate-400 text-sm max-w-xl mx-auto">
            Click any district node to view transit time, terrain protocol, and deployed fleet count.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-center">
          {/* Radar Canvas */}
          <div className="lg:col-span-3">
            <div className="rounded-2xl border border-slate-800/80 bg-[#050a12] overflow-hidden shadow-2xl">
              <canvas
                ref={canvasRef}
                className="w-full"
                style={{ height: "clamp(300px, 55vw, 500px)", display: "block" }}
              />
            </div>
            <p className="text-center text-xs text-slate-500 mt-2">
              Tap/click district nodes for deployment details
            </p>
          </div>

          {/* Info Panel */}
          <div className="lg:col-span-2 space-y-4">
            {selectedDistrict ? (
              <div
                className="rounded-2xl border p-6 space-y-4 transition-all"
                style={{ borderColor: selectedDistrict.color + "50", background: selectedDistrict.color + "08" }}
              >
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: selectedDistrict.color }} />
                  <h3 className="text-xl font-extrabold text-white">{selectedDistrict.name} District</h3>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                    <div className="flex items-center gap-1.5 text-slate-400 text-[10px] uppercase tracking-wider mb-1">
                      <Navigation className="w-3 h-3" />Distance
                    </div>
                    <p className="text-lg font-extrabold text-white font-mono">{selectedDistrict.distance} km</p>
                    <p className="text-[10px] text-slate-400">From Pala Central Depot</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                    <div className="flex items-center gap-1.5 text-slate-400 text-[10px] uppercase tracking-wider mb-1">
                      <Clock className="w-3 h-3" />Transit Time
                    </div>
                    <p className="text-lg font-extrabold font-mono" style={{ color: selectedDistrict.color }}>
                      {selectedDistrict.hours}
                    </p>
                    <p className="text-[10px] text-slate-400">Flatbed mobilization</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                    <div className="flex items-center gap-1.5 text-slate-400 text-[10px] uppercase tracking-wider mb-1">
                      <Truck className="w-3 h-3" />Protocol
                    </div>
                    <p className="text-xs font-bold text-white">{selectedDistrict.protocol}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800">
                    <div className="flex items-center gap-1.5 text-slate-400 text-[10px] uppercase tracking-wider mb-1">
                      <Zap className="w-3 h-3" />Active Fleet
                    </div>
                    <p className="text-lg font-extrabold text-white font-mono">{selectedDistrict.machines}</p>
                    <p className="text-[10px] text-slate-400">Deployed machines</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedDistrict(null)}
                  className="text-xs text-slate-500 hover:text-white transition-colors"
                >
                  ← Click another district
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-slate-900/80 border border-slate-800">
                  <p className="text-xs font-bold text-white mb-3">District Quick Stats</p>
                  <div className="space-y-2">
                    {[
                      { label: "Districts Covered", value: "14", color: "#fa5402" },
                      { label: "Central Hub Radius", value: "260 km", color: "#f59e0b" },
                      { label: "Priority Zones (< 2hr)", value: "5 districts", color: "#10b981" },
                      { label: "Total Fleet Deployed", value: "60+ units", color: "#3b82f6" },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">{item.label}</span>
                        <span className="font-bold font-mono" style={{ color: item.color }}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="p-4 rounded-xl bg-[#fa5402]/5 border border-[#fa5402]/20">
                  <p className="text-xs text-[#fa5402] font-bold mb-1">⚡ Central Kerala Priority Zone</p>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Kottayam, Ernakulam, Idukki, Alappuzha, and Pathanamthitta get sub-2-hour emergency mobilization from our Pala Depot.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
