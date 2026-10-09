"use client";

import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { Truck, HardHat, Wrench, MapPin } from "lucide-react";

// Fix missing marker icons in leaflet with Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface LiveMapProps {
  sites: any[];
}

export default function LiveMap({ sites }: LiveMapProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return (
    <div className="w-full h-[400px] bg-slate-900/50 rounded-2xl border border-slate-800 animate-pulse flex items-center justify-center">
      <MapPin className="w-8 h-8 text-slate-700" />
    </div>
  );

  // Filter sites that have at least one dispatch with GPS coordinates
  const markers: any[] = [];
  
  sites.forEach(site => {
    site.dispatches.forEach((d: any) => {
      if (d.latitude && d.longitude) {
        markers.push({
          id: d.id,
          location: site.location,
          status: d.status,
          lat: Number(d.latitude),
          lng: Number(d.longitude),
          driver: d.driver?.name || "No Driver",
          operator: d.operator?.name || "No Operator",
          vehicle: d.assignedVehicle ? `${d.assignedVehicle.licensePlate}` : "Pending Vehicle",
          machineCount: (d.machine ? 1 : 0) + (d.dispatchAssets?.length || 0),
          toolCount: d.dispatchTools?.length || 0
        });
      }
    });
  });

  // Default center if no pins (fallback coordinates - perhaps city center)
  const defaultCenter: [number, number] = markers.length > 0 
    ? [markers[0].lat, markers[0].lng] 
    : [25.2048, 55.2708]; // Dubai as default

  return (
    <div className="w-full h-[500px] rounded-2xl overflow-hidden border-2 border-slate-700/50 shadow-2xl relative z-10">
      <MapContainer 
        center={defaultCenter} 
        zoom={markers.length > 0 ? 12 : 5} 
        scrollWheelZoom={true} 
        style={{ height: "100%", width: "100%" }}
        className="z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          className="map-tiles"
        />
        
        {markers.map((m, i) => (
          <Marker key={i} position={[m.lat, m.lng]}>
            <Popup className="custom-popup">
              <div className="p-1 min-w-[200px]">
                <h3 className="font-bold text-sm mb-1">{m.location}</h3>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-sm inline-block mb-3 ${
                  m.status === 'PENDING' ? 'bg-amber-100 text-amber-700' : 
                  m.status === 'EN_ROUTE' ? 'bg-blue-100 text-blue-700' : 
                  'bg-emerald-100 text-emerald-700'
                }`}>
                  {m.status.replace("_", " ")}
                </span>
                
                <div className="space-y-1.5 text-xs text-slate-700">
                  <div className="flex items-center gap-1.5">
                    <Truck className="w-3 h-3 text-indigo-500" />
                    <strong>{m.driver}</strong> ({m.vehicle})
                  </div>
                  <div className="flex items-center gap-1.5">
                    <HardHat className="w-3 h-3 text-amber-600" />
                    <strong>{m.operator}</strong>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Wrench className="w-3 h-3 text-emerald-600" />
                    {m.machineCount} Machines, {m.toolCount} Tools
                  </div>
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
