import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Polyline, Marker, Popup } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Map as MapIcon, Truck } from "lucide-react";

// Fix for default leaflet marker icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Major transport hub coordinates
const HUB_COORDS = {
    // Airports
    'TLV': [32.0114, 34.8867], // Tel Aviv
    'MST': [50.9378, 6.9603],  // Maastricht
    'PVG': [31.1443, 121.8083], // Shanghai Pudong
    'LHR': [51.4700, -0.4543],  // London Heathrow
    'AMS': [52.3105, 4.7683],   // Amsterdam
    'SZX': [22.6394, 113.8108], // Shenzhen
    'LGG': [50.6374, 5.4432],   // Liège
    'RTM': [51.9244, 4.4777],   // Rotterdam
    'NGB': [29.8737, 121.5644], // Ningbo
    'SHA': [31.1976, 121.3363], // Shanghai Hongqiao
    'NYC': [40.7128, -74.0060], // New York
    'JFK': [40.6413, -73.7781], // JFK Airport
    'LAX': [33.9416, -118.4085], // Los Angeles
    'HAM': [53.5511, 9.9937],   // Hamburg
    'SIN': [1.3644, 103.9915],  // Singapore
    'DXB': [25.2532, 55.3657],  // Dubai
    'HKG': [22.3080, 113.9185], // Hong Kong
    'FRA': [50.0379, 8.5622],   // Frankfurt
    'CDG': [49.0097, 2.5479],   // Paris CDG
    'IST': [41.2753, 28.7519],  // Istanbul
    'BRU': [50.9010, 4.4856],   // Brussels
    'ZRH': [47.4647, 8.5492],   // Zurich
    'MUC': [48.3538, 11.7861],  // Munich
    'MAD': [40.4983, -3.5676],  // Madrid
    'BCN': [41.2974, 2.0833],   // Barcelona
    'ATH': [37.9364, 23.9445],  // Athens
    'BER': [52.3667, 13.5033],  // Berlin
    'VIE': [48.1103, 16.5697],  // Vienna
    // Cities (fallback to major airport)
    'LONDON': [51.4700, -0.4543],
    'PARIS': [49.0097, 2.5479],
    'AMSTERDAM': [52.3105, 4.7683],
    'SHANGHAI': [31.1443, 121.8083],
    'TEL AVIV': [32.0114, 34.8867],
    'MAASTRICHT': [50.9378, 6.9603]
};

// Helper to get coords from string
const getCoords = async (code) => {
    if (!code) return null;
    const upper = code.toUpperCase().trim();
    
    // Check exact match
    if (HUB_COORDS[upper]) return HUB_COORDS[upper];
    
    // Check if it's contained in the hub names
    const matchingKey = Object.keys(HUB_COORDS).find(key => 
        key.includes(upper) || upper.includes(key)
    );
    if (matchingKey) return HUB_COORDS[matchingKey];
    
    // If not found, return center of map (will need geocoding for production)
    return [30, 10];
};

// Sync version for initial render
const getCoordsSync = (code) => {
    if (!code) return null;
    const upper = code.toUpperCase().trim();
    
    if (HUB_COORDS[upper]) return HUB_COORDS[upper];
    
    const matchingKey = Object.keys(HUB_COORDS).find(key => 
        key.includes(upper) || upper.includes(key)
    );
    if (matchingKey) return HUB_COORDS[matchingKey];
    
    return null;
};

export default function ShipmentRouteMap({ shipments = [], legs = [] }) {
    const [routes, setRoutes] = useState([]);

    useEffect(() => {
        let processedRoutes = [];

        // Mode 1: Live Legs (Draft Mode)
        if (legs && legs.length > 0) {
            processedRoutes = legs
                .filter(leg => leg.origin && leg.destination) // Only process complete legs
                .map((leg, idx) => {
                    const originCoords = getCoordsSync(leg.origin);
                    const destCoords = getCoordsSync(leg.destination);
                    
                    if (!originCoords || !destCoords) return null;
                    
                    return {
                        id: `leg-${idx}`,
                        shipment_id: `${leg.origin} → ${leg.destination}`,
                        origin: originCoords,
                        destination: destCoords,
                        mode: leg.mode,
                        distance: leg.distance,
                        co2: 0
                    };
                })
                .filter(r => r !== null);
        } 
        // Mode 2: Historical Shipments
        else if (shipments && shipments.length > 0) {
             processedRoutes = shipments.map(s => {
                const origin = "PVG"; 
                const dest = "LHR";   
                return {
                    id: s.id,
                    shipment_id: s.shipment_id,
                    origin: getCoordsSync(s.origin_code || origin),
                    destination: getCoordsSync(s.destination_code || dest),
                    mode: s.main_transport_mode,
                    co2: s.total_co2e_kg
                };
            }).filter(r => r.origin && r.destination);
        }

        // Add demo data if no routes exist
        if (!processedRoutes || processedRoutes.length === 0) {
            processedRoutes = [
                { id: 'demo1', shipment_id: 'DEMO-001', origin: HUB_COORDS['PVG'], destination: HUB_COORDS['AMS'], mode: 'Air', co2: 1200 },
                { id: 'demo2', shipment_id: 'DEMO-002', origin: HUB_COORDS['SZX'], destination: HUB_COORDS['LGG'], mode: 'Air', co2: 980 },
                { id: 'demo3', shipment_id: 'DEMO-003', origin: HUB_COORDS['NGB'], destination: HUB_COORDS['RTM'], mode: 'Sea', co2: 450 },
                { id: 'demo4', shipment_id: 'DEMO-004', origin: HUB_COORDS['NYC'], destination: HUB_COORDS['LHR'], mode: 'Air', co2: 850 },
                { id: 'demo5', shipment_id: 'DEMO-005', origin: HUB_COORDS['HAM'], destination: HUB_COORDS['DXB'], mode: 'Sea', co2: 320 }
            ];
        }

        setRoutes(processedRoutes);
    }, [shipments, legs]);

    return (
        <Card className="shadow-sm border-slate-200 overflow-hidden">
            <CardHeader className="pb-2 border-b border-slate-100 bg-slate-50/50 px-4 py-3">
                <CardTitle className="flex items-center gap-2 text-base text-slate-700">
                    <MapIcon className="w-4 h-4 text-[#86b027]" />
                    Live Shipment Trajectories
                    {routes.length > 0 && (
                        <span className="text-xs font-normal text-slate-500 ml-2">
                            ({routes.length} routes)
                        </span>
                    )}
                </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
            <div className="h-[400px] w-full relative z-0">
                {routes.length > 0 ? (
                    <MapContainer 
                        center={[30, 10]} 
                        zoom={2} 
                        style={{ height: "100%", width: "100%" }} 
                        minZoom={2}
                        maxZoom={18}
                        scrollWheelZoom={true}
                    >
                        <TileLayer
                            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                        />
                        
                        {routes.map((route, idx) => {
                            if (!route.origin || !route.destination) return null;
                            
                            return (
                                <React.Fragment key={`${route.id}-${idx}`}>
                                    <Polyline 
                                        positions={[route.origin, route.destination]} 
                                        color={
                                            route.mode === 'Air' ? '#02a1e8' : 
                                            route.mode === 'Sea' ? '#0891b2' : 
                                            route.mode === 'Road' ? '#86b027' : 
                                            '#769c22'
                                        } 
                                        weight={3} 
                                        opacity={0.8} 
                                        dashArray={route.mode === 'Air' ? '10, 10' : null}
                                    />
                                    <Marker position={route.origin}>
                                        <Popup>
                                            <div className="text-xs">
                                                <strong>Origin</strong><br/>
                                                {route.shipment_id?.split(' → ')[0] || 'Unknown'}<br/>
                                                Mode: {route.mode}
                                            </div>
                                        </Popup>
                                    </Marker>
                                    <Marker position={route.destination}>
                                        <Popup>
                                            <div className="text-xs">
                                                <strong>Destination</strong><br/>
                                                {route.shipment_id?.split(' → ')[1] || 'Unknown'}<br/>
                                                {route.distance && `Distance: ${route.distance} km`}
                                            </div>
                                        </Popup>
                                    </Marker>
                                </React.Fragment>
                            );
                        })}
                    </MapContainer>
                ) : (
                    <div className="h-full w-full flex items-center justify-center bg-slate-100">
                        <div className="text-center">
                            <Truck className="w-12 h-12 text-slate-300 mx-auto mb-2" />
                            <p className="text-sm text-slate-500">No routes to display</p>
                            <p className="text-xs text-slate-400">Add shipment legs to see the map</p>
                        </div>
                    </div>
                )}
                
                {/* Legend */}
                <div className="absolute bottom-4 left-4 z-[400] bg-white/95 backdrop-blur px-3 py-2 rounded-lg shadow-lg border border-slate-300 text-xs space-y-1">
                    <div className="font-bold mb-2 text-[#545454]">Transport Mode</div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-1 bg-[#02a1e8] border-b-2 border-[#02a1e8] border-dashed"></div>
                        <span className="text-slate-700">Air</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-1 bg-[#0891b2]"></div>
                        <span className="text-slate-700">Sea</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-1 bg-[#86b027]"></div>
                        <span className="text-slate-700">Road</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="w-4 h-1 bg-[#769c22]"></div>
                        <span className="text-slate-700">Rail</span>
                    </div>
                </div>
            </div>
            </CardContent>
        </Card>
    );
}