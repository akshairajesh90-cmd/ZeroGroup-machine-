"use client";

import React, { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapPin, User, Truck, Settings2 } from "lucide-react";

// Fix Leaflet's default icon path issues in Next.js
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

// Color-coded icons per role
const driverIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const operatorIcon = new L.Icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

interface PinProps {
  id: string;
  name: string;
  role: string;
  latitude: number;
  longitude: number;
  lastUpdate: string | null;
  machineId?: string | null;
  machineType?: string | null;
  customerName?: string | null;
  dispatchLocation?: string | null;
  dispatchStatus?: string | null;
}

export default function LiveMapClient({ pins }: { pins: PinProps[] }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="w-full h-full bg-slate-900 animate-pulse flex items-center justify-center">
        <span className="text-slate-500 font-medium">Loading GPS Map...</span>
      </div>
    );
  }

  const defaultCenter: [number, number] =
    pins.length > 0 ? [pins[0].latitude, pins[0].longitude] : [28.6139, 77.209];

  return (
    <div className="w-full h-full relative isolate">
      <MapContainer
        center={defaultCenter}
        zoom={12}
        scrollWheelZoom={true}
        className="w-full h-full z-0"
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {pins.map((pin) => (
          <Marker
            key={pin.id}
            position={[pin.latitude, pin.longitude]}
            icon={pin.role === "DRIVER" ? driverIcon : operatorIcon}
          >
            <Popup className="custom-popup" minWidth={220}>
              <div className="p-1">
                {/* Header */}
                <div className="flex items-center justify-between border-b border-slate-200 pb-2 mb-2">
                  <div className="flex items-center gap-1.5">
                    {pin.role === "DRIVER" ? (
                      <Truck className="w-4 h-4 text-blue-500" />
                    ) : (
                      <Settings2 className="w-4 h-4 text-orange-500" />
                    )}
                    <h3 className="font-black text-slate-900 text-sm">{pin.name}</h3>
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      pin.role === "DRIVER"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-orange-100 text-orange-700"
                    }`}
                  >
                    {pin.role}
                  </span>
                </div>

                {/* Body */}
                <div className="space-y-1.5 text-xs text-slate-600">
                  {pin.machineId && (
                    <div className="flex items-center gap-1.5">
                      <Settings2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span className="font-semibold text-indigo-700">{pin.machineId}</span>
                      {pin.machineType && <span className="text-slate-400">({pin.machineType})</span>}
                    </div>
                  )}
                  {pin.customerName && (
                    <div className="flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                      <span>{pin.customerName}</span>
                      {pin.dispatchLocation && <span className="text-slate-400">– {pin.dispatchLocation}</span>}
                    </div>
                  )}
                  {pin.dispatchStatus && (
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-slate-500">Status:</span>
                      <span
                        className={`font-bold ${
                          pin.dispatchStatus === "COMPLETED"
                            ? "text-emerald-600"
                            : pin.dispatchStatus === "CANCELLED"
                            ? "text-red-500"
                            : "text-amber-600"
                        }`}
                      >
                        {pin.dispatchStatus}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-1.5 border-t border-slate-100 pt-1.5 mt-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="font-mono text-[10px] text-slate-400">
                      {pin.latitude.toFixed(5)}, {pin.longitude.toFixed(5)}
                    </span>
                  </div>
                  {pin.lastUpdate && (
                    <div className="text-[10px] text-slate-400 font-mono text-right">
                      Last ping: {new Date(pin.lastUpdate).toLocaleString("en-IN")}
                    </div>
                  )}
                </div>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>

      {/* Legend overlay */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-slate-900/90 backdrop-blur-sm border border-slate-700 rounded-xl px-3 py-2 flex items-center gap-3 text-xs font-bold">
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" />
          <span className="text-slate-300">Driver</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-orange-500 inline-block" />
          <span className="text-slate-300">Operator</span>
        </div>
      </div>
    </div>
  );
}
