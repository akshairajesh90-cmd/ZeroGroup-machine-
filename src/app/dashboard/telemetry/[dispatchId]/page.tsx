"use client";
/**
 * Page 2: GPS Telemetry & Geofence Map Tracker
 * Shows location ping trail for a dispatch on a Leaflet map.
 * Geofence circle centred on Pala, Kerala (9.7117, 76.6853).
 */

import { useEffect, useState, useRef } from "react";
import { useParams } from "next/navigation";
import { GEOFENCE_CENTER, GEOFENCE_RADIUS_METERS } from "@/lib/geofence";

type Ping = {
    id: string;
    latitude: number;
    longitude: number;
    isInsideGeofence: boolean;
    distanceFromCenter: number;
    recordedAt: string;
    employee: { name: string; role: string } | null;
};

export default function TelemetryPage() {
    const params = useParams();
    const dispatchId = params?.dispatchId as string;
    const [pings, setPings] = useState<Ping[]>([]);
    const [error, setError] = useState<string | null>(null);
    const mapRef = useRef<HTMLDivElement>(null);
    const mapInstance = useRef<unknown>(null);

    useEffect(() => {
        if (!dispatchId) return;
        fetch(`/api/telemetry/ping?dispatchId=${dispatchId}`)
            .then((r) => r.json())
            .then((d) => setPings(d.pings ?? []))
            .catch(() => setError("Failed to load telemetry data"));
    }, [dispatchId]);

    // Dynamic Leaflet import (SSR-safe)
    useEffect(() => {
        if (!mapRef.current || mapInstance.current) return;
        import("leaflet").then((L) => {
            /* eslint-disable @typescript-eslint/no-require-imports */
            require("leaflet/dist/leaflet.css");

            const map = L.default.map(mapRef.current!, {
                center: [GEOFENCE_CENTER.lat, GEOFENCE_CENTER.lon],
                zoom: 11,
            });

            L.default
                .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                    attribution: "© OpenStreetMap contributors",
                })
                .addTo(map);

            // Draw geofence circle
            L.default
                .circle([GEOFENCE_CENTER.lat, GEOFENCE_CENTER.lon], {
                    radius: GEOFENCE_RADIUS_METERS,
                    color: "#f59e0b",
                    fillColor: "#f59e0b",
                    fillOpacity: 0.05,
                    weight: 2,
                    dashArray: "6 4",
                })
                .addTo(map)
                .bindPopup(`Geofence: ${GEOFENCE_CENTER.label} · ${GEOFENCE_RADIUS_METERS / 1000} km radius`);

            // Centre marker
            L.default
                .marker([GEOFENCE_CENTER.lat, GEOFENCE_CENTER.lon])
                .addTo(map)
                .bindPopup(`📍 ${GEOFENCE_CENTER.label} (Geofence Centre)`);

            // Ping trail
            pings.forEach((p, i) => {
                const color = p.isInsideGeofence ? "#22c55e" : "#ef4444";
                const isLast = i === pings.length - 1;

                const marker = L.default
                    .circleMarker([p.latitude, p.longitude], {
                        radius: isLast ? 10 : 6,
                        color,
                        fillColor: color,
                        fillOpacity: isLast ? 1 : 0.7,
                        weight: isLast ? 3 : 1,
                    })
                    .addTo(map);

                marker.bindPopup(
                    `<strong>${p.employee?.name ?? "Unknown"}</strong><br/>` +
                    `${new Date(p.recordedAt).toLocaleString("en-IN")}<br/>` +
                    `${p.isInsideGeofence ? "✅ Inside" : "🚨 Outside"} geofence<br/>` +
                    `Distance: ${(p.distanceFromCenter / 1000).toFixed(2)} km`
                );
            });

            // Draw polyline trace
            if (pings.length > 1) {
                L.default
                    .polyline(pings.map((p) => [p.latitude, p.longitude] as [number, number]), {
                        color: "#6366f1",
                        weight: 2,
                        opacity: 0.8,
                    })
                    .addTo(map);
            }

            mapInstance.current = map;
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pings]);

    const lastPing = pings[pings.length - 1];

    return (
        <div className="p-6 space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-amber-400">📡 GPS Telemetry</h1>
                <p className="text-sm text-slate-400 mt-0.5">
                    Dispatch <span className="font-mono text-slate-300">{dispatchId}</span> · Live trail
                </p>
            </div>

            {error && (
                <div className="text-red-400 text-sm bg-red-900/20 border border-red-700 rounded-lg px-4 py-3">
                    {error}
                </div>
            )}

            {/* Stats row */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: "Total Pings", value: pings.length },
                    {
                        label: "Status",
                        value: lastPing
                            ? lastPing.isInsideGeofence
                                ? "✅ Inside Geofence"
                                : "🚨 Outside Geofence"
                            : "—",
                    },
                    {
                        label: "Last Distance",
                        value: lastPing
                            ? `${(lastPing.distanceFromCenter / 1000).toFixed(2)} km from Pala`
                            : "—",
                    },
                ].map((stat) => (
                    <div
                        key={stat.label}
                        className="rounded-xl border border-slate-700 bg-slate-800 p-4"
                    >
                        <p className="text-xs text-slate-500">{stat.label}</p>
                        <p className="text-lg font-bold text-slate-100 mt-1">{stat.value}</p>
                    </div>
                ))}
            </div>

            {/* Map */}
            <div
                ref={mapRef}
                className="w-full rounded-2xl overflow-hidden border border-slate-700"
                style={{ height: "480px", background: "#1e293b" }}
            />

            {/* Ping log */}
            <div>
                <h2 className="text-sm font-semibold text-slate-400 mb-2">Recent Pings</h2>
                <div className="space-y-1 max-h-64 overflow-y-auto">
                    {[...pings].reverse().slice(0, 50).map((p) => (
                        <div
                            key={p.id}
                            className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 py-1"
                        >
                            <span suppressHydrationWarning>{new Date(p.recordedAt).toLocaleTimeString("en-IN")}</span>
                            <span>{p.employee?.name ?? "—"}</span>
                            <span className={p.isInsideGeofence ? "text-green-400" : "text-red-400"}>
                                {p.isInsideGeofence ? "Inside" : "Outside"} ({(p.distanceFromCenter / 1000).toFixed(1)} km)
                            </span>
                        </div>
                    ))}
                    {pings.length === 0 && (
                        <p className="text-slate-600 text-xs text-center py-4">No pings recorded yet.</p>
                    )}
                </div>
            </div>
        </div>
    );
}
