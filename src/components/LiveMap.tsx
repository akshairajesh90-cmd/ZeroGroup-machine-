"use client";

import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Truck, HardHat, Wrench, MapPin, Navigation, ExternalLink, Activity } from "lucide-react";

// Fix missing marker icons in leaflet with Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

const siteMarkerIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const operatorMarkerIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const driverMarkerIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// Haversine formula
function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

function MapController({
  focusCenter,
  bounds,
}: {
  focusCenter?: [number, number] | null;
  bounds?: L.LatLngBoundsExpression | null;
}) {
  const map = useMap();
  useEffect(() => {
    if (bounds) {
      map.fitBounds(bounds, { padding: [50, 50], maxZoom: 15 });
    } else if (focusCenter) {
      map.flyTo(focusCenter, 14, { duration: 1.2 });
    }
  }, [focusCenter, bounds, map]);
  return null;
}

interface LiveMapProps {
  sites: any[];
  focusCoords?: [number, number] | null;
  routeDestCoords?: [number, number] | null;
  onSelectPerson?: (person: any, destination: any) => void;
}

export default function LiveMap({
  sites,
  focusCoords,
  routeDestCoords,
  onSelectPerson,
}: LiveMapProps) {
  const [mounted, setMounted] = useState(false);
  const [roadRoutes, setRoadRoutes] = useState<
    Record<
      string,
      {
        positions: [number, number][];
        distanceKm: number;
        durationMins: number;
        isRoadSnapped: boolean;
      }
    >
  >({});

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-full h-[500px] bg-slate-900/50 rounded-2xl border border-slate-800 animate-pulse flex items-center justify-center">
        <MapPin className="w-8 h-8 text-slate-700" />
      </div>
    );
  }

  // Extract site markers, worker markers, and route polyline pairs
  const siteMarkers: any[] = [];
  const workerMarkers: any[] = [];
  const routePolylines: {
    id: string;
    positions: [number, number][];
    workerName: string;
    siteLocation: string;
    distanceKm: number;
  }[] = [];

  sites.forEach((site) => {
    site.dispatches.forEach((d: any) => {
      const siteLat = d.latitude ? Number(d.latitude) : null;
      const siteLng = d.longitude ? Number(d.longitude) : null;

      // 1. Site Marker
      if (siteLat && siteLng) {
        siteMarkers.push({
          id: `site-${d.id}`,
          dispatchId: d.id,
          location: site.location,
          status: d.status,
          lat: siteLat,
          lng: siteLng,
          driver: d.driver?.name || "No Driver",
          operator: d.operator?.name || "No Operator",
          vehicle: d.assignedVehicle ? `${d.assignedVehicle.licensePlate}` : "Pending Vehicle",
          machineCount: (d.machine ? 1 : 0) + (d.dispatchAssets?.length || 0),
          toolCount: d.dispatchTools?.length || 0,
        });
      }

      // 2. Operator Marker & Route
      const opLat = d.operator?.lastLatitude ? Number(d.operator.lastLatitude) : null;
      const opLng = d.operator?.lastLongitude ? Number(d.operator.lastLongitude) : null;

      if (opLat && opLng) {
        workerMarkers.push({
          id: `op-${d.operator.id || d.id}`,
          person: d.operator,
          type: "OPERATOR",
          name: d.operator.name,
          phone: d.operator.phone,
          lat: opLat,
          lng: opLng,
          siteLocation: site.location,
          destination: {
            location: site.location,
            latitude: siteLat,
            longitude: siteLng,
            customerName: d.customer?.name,
            dispatchStatus: d.status,
          },
        });

        // Add Route line if site is also pinned
        if (siteLat && siteLng) {
          routePolylines.push({
            id: `route-op-${d.id}`,
            positions: [
              [opLat, opLng],
              [siteLat, siteLng],
            ],
            workerName: d.operator.name,
            siteLocation: site.location,
            distanceKm: calculateDistanceKm(opLat, opLng, siteLat, siteLng),
          });
        }
      }

      // 3. Driver Marker & Route
      const drvLat = d.driver?.lastLatitude ? Number(d.driver.lastLatitude) : null;
      const drvLng = d.driver?.lastLongitude ? Number(d.driver.lastLongitude) : null;

      if (drvLat && drvLng) {
        workerMarkers.push({
          id: `drv-${d.driver.id || d.id}`,
          person: d.driver,
          type: "DRIVER",
          name: d.driver.name,
          phone: d.driver.phone,
          lat: drvLat,
          lng: drvLng,
          siteLocation: site.location,
          destination: {
            location: site.location,
            latitude: siteLat,
            longitude: siteLng,
            customerName: d.customer?.name,
            dispatchStatus: d.status,
          },
        });

        if (siteLat && siteLng) {
          routePolylines.push({
            id: `route-drv-${d.id}`,
            positions: [
              [drvLat, drvLng],
              [siteLat, siteLng],
            ],
            workerName: d.driver.name,
            siteLocation: site.location,
            distanceKm: calculateDistanceKm(drvLat, drvLng, siteLat, siteLng),
          });
        }
      }
    });
  });

  // Asynchronously fetch road-snapped geometry for active route lines
  useEffect(() => {
    if (routePolylines.length === 0) return;
    let isCancelled = false;

    routePolylines.forEach((route) => {
      if (roadRoutes[route.id]) return; // Already fetched

      fetch("/api/routing/directions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          origin: route.positions[0],
          destination: route.positions[1],
        }),
      })
        .then((res) => res.json())
        .then((data) => {
          if (isCancelled) return;
          if (data.success && data.coordinates && data.coordinates.length > 0) {
            setRoadRoutes((prev) => ({
              ...prev,
              [route.id]: {
                positions: data.coordinates,
                distanceKm: data.distanceKm,
                durationMins: data.durationMins,
                isRoadSnapped: data.isRoadSnapped ?? true,
              },
            }));
          }
        })
        .catch((err) => {
          console.warn("[LiveMap] Road route fetch failed:", err);
        });
    });

    return () => {
      isCancelled = true;
    };
  }, [routePolylines.length]);

  // Calculate default center (Kerala or first marker)
  const defaultCenter: [number, number] =
    focusCoords ||
    (siteMarkers.length > 0
      ? [siteMarkers[0].lat, siteMarkers[0].lng]
      : workerMarkers.length > 0
      ? [workerMarkers[0].lat, workerMarkers[0].lng]
      : [9.9312, 76.2673]); // Kochi default

  // Bounds if focus + dest coords provided
  const mapBounds: L.LatLngBoundsExpression | null =
    focusCoords && routeDestCoords
      ? L.latLngBounds([focusCoords, routeDestCoords])
      : null;

  return (
    <div className="w-full h-[500px] rounded-3xl overflow-hidden border-2 border-slate-700/60 shadow-2xl relative z-10">
      <MapContainer
        center={defaultCenter}
        zoom={siteMarkers.length > 0 || workerMarkers.length > 0 ? 12 : 8}
        scrollWheelZoom={true}
        style={{ height: "100%", width: "100%" }}
        className="z-0"
      >
        <MapController focusCenter={focusCoords} bounds={mapBounds} />

        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          className="map-tiles"
        />

        {/* 1. Route Polylines Connecting Workers to Destination Sites (Following Roads) */}
        {routePolylines.map((route) => {
          const road = roadRoutes[route.id];
          const positions = road?.positions?.length ? road.positions : route.positions;
          const dist = road?.distanceKm ?? route.distanceKm;
          const dur = road?.durationMins;
          return (
            <Polyline
              key={route.id}
              positions={positions}
              pathOptions={{
                color: "#2563eb",
                weight: 4.5,
                opacity: 0.9,
                dashArray: road?.isRoadSnapped ? undefined : "6, 8",
              }}
            >
              <Popup className="custom-popup">
                <div className="p-1 text-xs space-y-1">
                  <span className="font-bold text-blue-600 block">
                    Route: {route.workerName} → {route.siteLocation}
                  </span>
                  <div className="text-slate-600 font-mono space-y-0.5">
                    <div>
                      Distance: <strong>{dist} km</strong>{" "}
                      <span className="text-[10px] text-emerald-600 font-semibold">
                        {road?.isRoadSnapped ? "(Road Routed)" : "(Direct)"}
                      </span>
                    </div>
                    {dur && dur > 0 && (
                      <div className="text-slate-500">
                        Est. Drive Time: ~{dur} mins
                      </div>
                    )}
                  </div>
                </div>
              </Popup>
            </Polyline>
          );
        })}

        {/* 2. Job Site Markers (Violet) */}
        {siteMarkers.map((m) => (
          <Marker key={m.id} position={[m.lat, m.lng]} icon={siteMarkerIcon}>
            <Popup className="custom-popup">
              <div className="p-1 min-w-[210px] space-y-2">
                <div>
                  <h3 className="font-bold text-sm text-slate-900">{m.location}</h3>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-sm inline-block mt-1 ${
                      m.status === "PENDING"
                        ? "bg-amber-100 text-amber-700"
                        : m.status === "EN_ROUTE"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {m.status.replace("_", " ")}
                  </span>
                </div>

                <div className="space-y-1 text-xs text-slate-700 pt-1 border-t border-slate-200">
                  <div className="flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5 text-blue-600" />
                    <strong>{m.driver}</strong> ({m.vehicle})
                  </div>
                  <div className="flex items-center gap-1.5">
                    <HardHat className="w-3.5 h-3.5 text-amber-600" />
                    <strong>{m.operator}</strong>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5 text-emerald-600" />
                    {m.machineCount} Machines, {m.toolCount} Tools
                  </div>
                </div>

                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${m.lat},${m.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 text-[11px] font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                >
                  <Navigation className="w-3 h-3" /> Navigate to Site
                </a>
              </div>
            </Popup>
          </Marker>
        ))}

        {/* 3. Field Personnel Markers (Orange for Operators, Blue for Drivers) */}
        {workerMarkers.map((wm) => (
          <Marker
            key={wm.id}
            position={[wm.lat, wm.lng]}
            icon={wm.type === "DRIVER" ? driverMarkerIcon : operatorMarkerIcon}
          >
            <Popup className="custom-popup">
              <div className="p-1 min-w-[210px] space-y-2">
                <div className="flex items-center justify-between">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md text-white ${
                      wm.type === "DRIVER" ? "bg-blue-600" : "bg-amber-600"
                    }`}
                  >
                    {wm.type}
                  </span>
                  <span className="text-[10px] text-emerald-600 font-bold flex items-center gap-1">
                    <Activity className="w-2.5 h-2.5" /> LIVE GPS
                  </span>
                </div>

                <div>
                  <h4 className="font-bold text-sm text-slate-900">{wm.name}</h4>
                  <p className="text-xs text-slate-600">Assigned Site: {wm.siteLocation}</p>
                </div>

                <div className="pt-2 border-t border-slate-200 flex flex-col gap-1.5">
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&origin=${wm.lat},${wm.lng}&destination=${encodeURIComponent(
                      wm.destination?.latitude && wm.destination?.longitude
                        ? `${wm.destination.latitude},${wm.destination.longitude}`
                        : wm.siteLocation
                    )}&travelmode=driving`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full py-1.5 px-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1 text-center"
                  >
                    <Navigation className="w-3 h-3" /> Get Driving Route
                  </a>

                  {onSelectPerson && (
                    <button
                      type="button"
                      onClick={() => onSelectPerson(wm.person, wm.destination)}
                      className="w-full py-1 px-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-semibold transition-colors"
                    >
                      View Route Details Modal
                    </button>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}

      </MapContainer>
    </div>
  );
}
