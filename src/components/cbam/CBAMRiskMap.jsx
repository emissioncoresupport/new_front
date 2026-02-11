import React from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Euro, Factory, Info, TrendingUp } from "lucide-react";

// Fix for default leaflet markers
import L from 'leaflet';
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const RISK_DATA = [
  { 
    country: "China", 
    lat: 35.8617, 
    lng: 104.1954, 
    risk: "High", 
    carbonPrice: 8.5, 
    cbamCost: 78.5,
    exporters: 12,
    volume: "High"
  },
  { 
    country: "India", 
    lat: 20.5937, 
    lng: 78.9629, 
    risk: "Critical", 
    carbonPrice: 0, 
    cbamCost: 88.5,
    exporters: 8,
    volume: "High"
  },
  { 
    country: "Turkey", 
    lat: 38.9637, 
    lng: 35.2433, 
    risk: "High", 
    carbonPrice: 0, 
    cbamCost: 88.5,
    exporters: 5,
    volume: "Medium"
  },
  { 
    country: "Vietnam", 
    lat: 14.0583, 
    lng: 108.2772, 
    risk: "Critical", 
    carbonPrice: 0, 
    cbamCost: 88.5,
    exporters: 4,
    volume: "Medium"
  },
  { 
    country: "USA", 
    lat: 37.0902, 
    lng: -95.7129, 
    risk: "Medium", 
    carbonPrice: 15, 
    cbamCost: 73.5,
    exporters: 3,
    volume: "Low"
  },
  { 
    country: "Brazil", 
    lat: -14.2350, 
    lng: -51.9253, 
    risk: "High", 
    carbonPrice: 2, 
    cbamCost: 86.5,
    exporters: 2,
    volume: "Low"
  },
  {
    country: "Russia",
    lat: 61.5240,
    lng: 105.3188,
    risk: "High",
    carbonPrice: 0,
    cbamCost: 88.5,
    exporters: 6,
    volume: "High"
  },
  {
    country: "South Korea",
    lat: 35.9078,
    lng: 127.7669,
    risk: "Medium",
    carbonPrice: 12,
    cbamCost: 76.5,
    exporters: 4,
    volume: "Medium"
  }
];

const getColor = (risk) => {
  switch(risk) {
    case 'Critical': return '#ef4444'; // Red-500
    case 'High': return '#f97316'; // Orange-500
    case 'Medium': return '#eab308'; // Yellow-500
    default: return '#86b027'; // Brand Green
  }
};

const getRadius = (volume) => {
  switch(volume) {
    case 'High': return 24;
    case 'Medium': return 18;
    default: return 12;
  }
};

export default function CBAMRiskMap() {
  return (
    <div className="h-full w-full relative overflow-hidden bg-white">
      <MapContainer 
        center={[25, 10]} 
        zoom={1.5} 
        style={{ height: '100%', width: '100%', background: '#FAFAFA' }}
        attributionControl={false}
        zoomControl={false}
        dragging={true}
        scrollWheelZoom={false}
        doubleClickZoom={false}
        touchZoom={false}
        className="z-0"
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        />

        {RISK_DATA.map((data, idx) => (
          <CircleMarker 
            key={idx}
            center={[data.lat, data.lng]}
            radius={getRadius(data.volume)}
            pathOptions={{ 
              color: getColor(data.risk), 
              fillColor: getColor(data.risk), 
              fillOpacity: 0.15,
              weight: 0.5
            }}
          >
            {/* Inner circle for precision */}
            <CircleMarker 
              center={[data.lat, data.lng]}
              radius={4}
              pathOptions={{
                color: '#fff',
                fillColor: getColor(data.risk),
                fillOpacity: 1,
                weight: 2
              }}
            />
            
            <Popup className="custom-popup">
              <div className="p-2 min-w-[200px]">
                <div className="flex items-center justify-between mb-2 pb-2 border-b border-slate-100">
                  <span className="font-medium text-slate-900 text-sm">
                    {data.country}
                  </span>
                  <Badge className={`${data.risk === 'Critical' ? 'bg-red-100 text-red-700' : data.risk === 'High' ? 'bg-orange-100 text-orange-700' : 'bg-green-100 text-green-700'} border-0 text-xs`}>
                    {data.risk}
                  </Badge>
                </div>
                
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-slate-50 p-2 rounded">
                        <div className="text-[9px] text-slate-500 uppercase">Carbon Price</div>
                        <div className="font-mono text-sm font-medium text-slate-900">€{data.carbonPrice}</div>
                    </div>
                    <div className="bg-slate-50 p-2 rounded">
                        <div className="text-[9px] text-slate-500 uppercase">CBAM Cost</div>
                        <div className="font-mono text-sm font-medium text-red-600">+€{data.cbamCost}/t</div>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center text-xs text-slate-600 pt-1">
                    <span>Suppliers</span>
                    <span className="font-medium text-slate-900">{data.exporters}</span>
                  </div>
                </div>
              </div>
            </Popup>
            
            <Tooltip direction="top" offset={[0, -20]} opacity={0.95}>
              <div className="text-xs font-medium">{data.country}</div>
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>

      {/* Minimalist Legend */}
      <div className="absolute bottom-3 right-3 bg-white/90 backdrop-blur-sm border border-slate-200/80 px-3 py-2 rounded-lg z-[1000] shadow-[0_2px_8px_rgba(0,0,0,0.06)]">
        <div className="flex items-center gap-3 text-[10px]">
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
            <span className="text-slate-700">Critical</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-orange-500" />
            <span className="text-slate-700">High</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#86b027]" />
            <span className="text-slate-700">Low</span>
          </div>
        </div>
      </div>
    </div>
  );
}