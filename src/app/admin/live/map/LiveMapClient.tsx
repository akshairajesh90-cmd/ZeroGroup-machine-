"use client";

import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapPin, User, Settings2 } from "lucide-react";

// Fix Leaflet's default icon path issues in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface MapDispatchProps {
  id: string;
  location: string;
  latitude: number;
  longitude: number;
  status: string;
  machineId: string;
  machineType: string;
  operatorName: string;
}

export default function LiveMapClient({ dispatches }: { dispatches: MapDispatchProps[] }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  // Default to Kuttanad, Kerala if no active pins exist
  const defaultCenter: [number, number] = dispatches.length > 0 
    ? [dispatches[0].latitude, dispatches[0].longitude] 
    : [9.4246, 76.4357]; 

  return (
    <div className="w-full h-[600px] z-0">
      <MapContainer 
        center={defaultCenter} 
        zoom={11} 
        scrollWheelZoom={true} 
        className="w-full h-full z-0"
      >
        {/* OpenStreetMap Free Tiles (No API Key Required) */}
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {dispatches.map((dispatch) => (
          <Marker 
            key={dispatch.id} 
            position={[dispatch.latitude, dispatch.longitude]}
          >
            <Popup className="custom-popup">
              <div className="p-1 min-w-[200px]">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2">
                  <h3 className="font-bold text-slate-900 text-sm">{dispatch.location}</h3>
                  <span className={`text-[10px] font-bold px-2 py-1 rounded ${dispatch.status === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                    {dispatch.status === 'PENDING' ? 'EN ROUTE' : 'IN PROGRESS'}
                  </span>
                </div>
                
                {/* Body */}
                <div className="space-y-2 text-sm text-slate-700">
                  <div className="flex items-center gap-2">
                    <Settings2 className="w-4 h-4 text-slate-400" />
                    <span className="font-semibold text-indigo-700">{dispatch.machineId}</span> 
                    <span className="text-xs text-slate-500">({dispatch.machineType})</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-slate-400" />
                    Opr: <span className="font-medium text-slate-900">{dispatch.operatorName}</span>
                  </div>
                  <div className="flex items-center gap-2 mt-2 pt-2 border-t border-slate-100">
                    <MapPin className="w-4 h-4 text-slate-400" />
                    <span className="text-xs font-mono text-slate-500">
                      {dispatch.latitude.toFixed(4)}, {dispatch.longitude.toFixed(4)}
                    </span>
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
