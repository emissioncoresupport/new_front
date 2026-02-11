import React, { useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Truck, Factory, MapPin } from "lucide-react";

// Fix for default marker icon in React Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Simple hashing to generate consistent "random" coordinates for demo purposes
// In production, you'd use a geocoding service
const getCoordinates = (id, country) => {
    // Base coordinates for some countries
    const centers = {
        'China': [35.8617, 104.1954],
        'Germany': [51.1657, 10.4515],
        'USA': [37.0902, -95.7129],
        'India': [20.5937, 78.9629],
        'Vietnam': [14.0583, 108.2772],
        'Mexico': [23.6345, -102.5528],
        'Brazil': [-14.2350, -51.9253],
        'France': [46.2276, 2.2137],
        'Italy': [41.8719, 12.5674],
        'Spain': [40.4637, -3.7492],
    };

    const base = centers[country] || [20, 0]; // Default to somewhere near equator if unknown
    
    // Deterministic random offset based on ID
    const hash = id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const latOffset = (hash % 100 - 50) / 10; // +/- 5 degrees
    const lngOffset = (hash % 100 - 50) / 10;

    return [base[0] + latOffset, base[1] + lngOffset];
};

export default function SupplierNetworkMap({ suppliers, components }) {
    // HQ location (mock)
    const hqLocation = [52.5200, 13.4050]; // Berlin

    const markers = useMemo(() => {
        return suppliers.map(supplier => ({
            ...supplier,
            position: getCoordinates(supplier.id, supplier.country)
        }));
    }, [suppliers]);

    const connections = useMemo(() => {
        // Draw lines from suppliers to HQ for now, representing flow
        // In a real graph, we'd link Tier 2 -> Tier 1 -> HQ
        return markers.map(m => ({
            from: m.position,
            to: hqLocation,
            tier: m.tier,
            id: m.id
        }));
    }, [markers]);

    return (
        <Card className="h-[600px] overflow-hidden border-slate-200 relative">
            <MapContainer 
                center={[20, 0]} 
                zoom={2} 
                style={{ height: '100%', width: '100%' }}
                scrollWheelZoom={true}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                />

                {/* HQ Marker */}
                <Marker position={hqLocation}>
                    <Popup>
                        <div className="p-2">
                            <h3 className="font-bold flex items-center gap-2">
                                <Factory className="w-4 h-4" /> HQ / Manufacturing
                            </h3>
                            <p className="text-sm">Berlin, Germany</p>
                        </div>
                    </Popup>
                </Marker>

                {/* Supplier Markers */}
                {markers.map(supplier => (
                    <Marker key={supplier.id} position={supplier.position}>
                        <Popup>
                            <div className="p-2 min-w-[200px]">
                                <div className="flex justify-between items-start mb-2">
                                    <h3 className="font-bold text-slate-800">{supplier.legal_name}</h3>
                                    <Badge variant={
                                        supplier.risk_level === 'critical' ? 'destructive' :
                                        supplier.risk_level === 'high' ? 'destructive' :
                                        supplier.risk_level === 'medium' ? 'secondary' : 'default' // Default is usually primary/dark, maybe green is better for low risk but Shadcn default is black
                                    } className={
                                        supplier.risk_level === 'low' ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 
                                        supplier.risk_level === 'medium' ? 'bg-amber-100 text-amber-800 hover:bg-amber-200' : ''
                                    }>
                                        {supplier.risk_level} Risk
                                    </Badge>
                                </div>
                                <div className="text-sm space-y-1 text-slate-600">
                                    <p className="flex items-center gap-2"><MapPin className="w-3 h-3" /> {supplier.city}, {supplier.country}</p>
                                    <p className="text-xs">Tier: {supplier.tier?.replace('_', ' ').toUpperCase()}</p>
                                    {supplier.pfas_relevant && (
                                        <Badge variant="outline" className="mt-2 border-rose-200 text-rose-600 bg-rose-50 w-full justify-center">
                                            PFAS Relevant
                                        </Badge>
                                    )}
                                </div>
                            </div>
                        </Popup>
                    </Marker>
                ))}

                {/* Connections */}
                {connections.map(conn => (
                    <Polyline 
                        key={conn.id} 
                        positions={[conn.from, conn.to]}
                        pathOptions={{ 
                            color: conn.tier === 'tier_1' ? '#3b82f6' : '#94a3b8', 
                            weight: 1, 
                            opacity: 0.6,
                            dashArray: conn.tier === 'tier_1' ? null : '5, 5' 
                        }} 
                    />
                ))}
            </MapContainer>
            
            {/* Legend Overlay */}
            <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur p-4 rounded-lg shadow-lg z-[1000] border border-slate-200">
                <h4 className="font-bold text-sm mb-2">Network Legend</h4>
                <div className="space-y-2 text-xs">
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span>HQ / Manufacturing</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full bg-blue-300"></div>
                        <span>Tier 1 Supplier</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-3 h-0.5 bg-blue-500"></div>
                        <span>Direct Flow</span>
                    </div>
                </div>
            </div>
        </Card>
    );
}