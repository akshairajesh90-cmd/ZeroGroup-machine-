"use client";

import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapPin } from "lucide-react";

// Fix Leaflet's default icon path issues in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface AssetMapClientProps {
  latitude: number | null | undefined;
  longitude: number | null | undefined;
  label: string;
}

export default function AssetMapClient({ latitude, longitude, label }: AssetMapClientProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // Null-Safety check requested by Enterprise Guardrails
  if (latitude == null || longitude == null) {
    return (
      <div className="w-full h-[400px] bg-slate-900/50 border border-slate-800 rounded-xl flex flex-col items-center justify-center text-slate-400 p-6 text-center">
        <MapPin className="w-12 h-12 mb-4 text-slate-600 opacity-50" />
        <h3 className="text-lg font-bold text-slate-300 mb-2">No active GPS data available</h3>
        <p className="text-sm">Asset is presumed at Yard/Base.</p>
      </div>
    );
  }

  const center: [number, number] = [latitude, longitude];

  return (
    <div className="w-full h-[400px] z-0 rounded-xl overflow-hidden border border-slate-800 shadow-xl">
      <MapContainer 
        center={center} 
        zoom={14} 
        scrollWheelZoom={true} 
        className="w-full h-full z-0"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <Marker position={center}>
          <Popup className="custom-popup">
            <div className="p-1 min-w-[150px]">
              <h3 className="font-bold text-slate-900 text-sm mb-1">{label}</h3>
              <div className="flex items-center gap-2 text-xs font-mono text-slate-500">
                <MapPin className="w-3 h-3" />
                {latitude.toFixed(4)}, {longitude.toFixed(4)}
              </div>
            </div>
          </Popup>
        </Marker>
      </MapContainer>
    </div>
  );
}
