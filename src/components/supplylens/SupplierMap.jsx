import React from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup, Tooltip } from 'react-leaflet';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, AlertTriangle, ArrowRight } from "lucide-react";
import 'leaflet/dist/leaflet.css';

// Fix for default marker icon issues in React-Leaflet if we used standard markers
// But we will use CircleMarkers for better performance and styling control

const countryCoordinates = {
  "China": [35.8617, 104.1954],
  "USA": [37.0902, -95.7129],
  "United States": [37.0902, -95.7129],
  "Germany": [51.1657, 10.4515],
  "India": [20.5937, 78.9629],
  "Vietnam": [14.0583, 108.2772],
  "Taiwan": [23.6978, 120.9605],
  "Japan": [36.2048, 138.2529],
  "South Korea": [35.9078, 127.7669],
  "Mexico": [23.6345, -102.5528],
  "Brazil": [-14.2350, -51.9253],
  "Turkey": [38.9637, 35.2433],
  "Italy": [41.8719, 12.5674],
  "France": [46.2276, 2.2137],
  "United Kingdom": [55.3781, -3.4360],
  "UK": [55.3781, -3.4360],
  "Spain": [40.4637, -3.7492],
  "Poland": [51.9194, 19.1451],
  "Netherlands": [52.1326, 5.2913],
  "Canada": [56.1304, -106.3468],
  "Australia": [-25.2744, 133.7751],
  "Indonesia": [-0.7893, 113.9213],
  "Thailand": [15.8700, 100.9925],
  "Malaysia": [4.2105, 101.9758],
  "Singapore": [1.3521, 103.8198],
  "Hong Kong": [22.3193, 114.1694],
  "Bangladesh": [23.6850, 90.3563],
  "Switzerland": [46.8182, 8.2275],
  "Sweden": [60.1282, 18.6435],
  "Belgium": [50.5039, 4.4699],
  "Austria": [47.5162, 14.5501],
  "Ireland": [53.1424, -7.6921],
  "Norway": [60.4720, 8.4689],
  "Denmark": [56.2639, 9.5018],
  "Finland": [61.9241, 25.7482],
  "Portugal": [39.3999, -8.2245],
  "Czech Republic": [49.8175, 15.4730],
  "Romania": [45.9432, 24.9668],
  "Hungary": [47.1625, 19.5033],
  "Slovakia": [48.6690, 19.6990],
  "Philippines": [12.8797, 121.7740],
  "Pakistan": [30.3753, 69.3451],
  "Sri Lanka": [7.8731, 80.7718],
  "Egypt": [26.8206, 30.8025],
  "South Africa": [-30.5595, 22.9375],
  "Israel": [31.0461, 34.8516],
  "UAE": [23.4241, 53.8478],
  "Saudi Arabia": [23.8859, 45.0792]
};

export default function SupplierMap({ suppliers, sites, onViewSupplier }) {
  const defaultCenter = [20, 0]; // Global view
  const defaultZoom = 2;

  const getCoords = (country) => {
    if (!country) return null;
    // Try exact match
    if (countryCoordinates[country]) return countryCoordinates[country];
    // Try case insensitive
    const key = Object.keys(countryCoordinates).find(k => k.toLowerCase() === country.toLowerCase());
    if (key) return countryCoordinates[key];
    return null;
  };

  const getRiskColor = (level) => {
    switch (level) {
      case 'critical': return '#ff0066'; // Bright neon red
      case 'high': return '#ff6600'; // Neon orange
      case 'medium': return '#00d4ff'; // Bright cyan
      default: return '#00ff88'; // Neon green
    }
  };

  const getRiskGlow = (level) => {
    switch (level) {
      case 'critical': return '0 0 20px rgba(255,0,102,0.8), 0 0 40px rgba(255,0,102,0.4)';
      case 'high': return '0 0 20px rgba(255,102,0,0.8), 0 0 40px rgba(255,102,0,0.4)';
      case 'medium': return '0 0 15px rgba(0,212,255,0.6), 0 0 30px rgba(0,212,255,0.3)';
      default: return '0 0 15px rgba(0,255,136,0.6), 0 0 30px rgba(0,255,136,0.3)';
    }
  };

  // Combine supplier main address (if geocoded) and sites - use useMemo to prevent infinite loops
  const mapPoints = React.useMemo(() => {
    const points = [];

    // 1. Process Sites
    (sites || []).forEach(site => {
      const supplier = suppliers.find(s => s.id === site.supplier_id);
      if (!supplier) return;

      let lat = site.lat;
      let lon = site.lon;

      if (!lat || !lon) {
        // Try to find coords from country
        const coords = getCoords(site.country || supplier.country);
        if (coords) {
          // Add jitter to prevent perfect stacking
          lat = coords[0] + (Math.random() - 0.5) * 2;
          lon = coords[1] + (Math.random() - 0.5) * 2;
        } else {
           // If unknown country, skip to avoid random placement
           return; 
        }
      }

      points.push({
        id: site.id,
        name: site.site_name,
        supplierName: supplier.legal_name,
        supplier: supplier,
        lat,
        lon,
        riskLevel: supplier.risk_level,
        type: 'site',
        location: `${site.city ? site.city + ', ' : ''}${site.country}`
      });
    });

    // 2. Process Suppliers (Headquarters) without sites
    suppliers.forEach(supplier => {
      if (!(sites || []).some(s => s.supplier_id === supplier.id)) {
         const coords = getCoords(supplier.country);
         if (!coords) return; // Skip if we can't locate

         points.push({
          id: supplier.id,
          name: "Headquarters",
          supplierName: supplier.legal_name,
          supplier: supplier,
          lat: coords[0] + (Math.random() - 0.5) * 2,
          lon: coords[1] + (Math.random() - 0.5) * 2,
          riskLevel: supplier.risk_level,
          type: 'hq',
          location: supplier.country
        });
      }
    });

    return points;
  }, [suppliers, sites]);

  return (
    <Card className="border-none shadow-2xl overflow-hidden h-full relative group">
      {/* 3D Depth Effect */}
      <div className="absolute -inset-1 bg-gradient-to-br from-[#86b027]/30 via-[#02a1e8]/30 to-emerald-500/20 rounded-2xl blur-2xl opacity-60 group-hover:opacity-80 transition-all duration-500" />
      <div className="absolute -inset-0.5 bg-gradient-to-tr from-slate-200 via-white to-slate-100 rounded-2xl" />
      
      <div className="relative bg-white rounded-2xl overflow-hidden shadow-inner">
        <CardHeader className="border-b border-slate-200 bg-gradient-to-r from-slate-100 via-slate-50 to-blue-100 shadow-sm p-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-gradient-to-br from-[#86b027] via-[#86b027] to-[#6a8f20] shadow-lg shadow-[#86b027]/30 relative">
                <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-xl" />
                <MapPin className="w-5 h-5 text-white relative z-10" />
              </div>
              <div>
                <div className="text-slate-900 tracking-tight">Global Supply Chain Network</div>
                <div className="text-xs text-slate-500 font-normal mt-0.5">{mapPoints.length} locations mapped</div>
              </div>
            </CardTitle>
            <Badge className="bg-gradient-to-r from-[#02a1e8] to-blue-600 text-white border-0 shadow-lg shadow-blue-500/30 px-3 py-1">Live View</Badge>
          </div>
        </CardHeader>
        <div className="h-[450px] w-full relative bg-gradient-to-br from-slate-100 via-blue-50 to-slate-50">
          {/* 3D Frame Effect */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/50 via-transparent to-black/5 pointer-events-none z-10" />
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white to-transparent opacity-60 z-10" />
          
          <MapContainer 
            center={defaultCenter} 
            zoom={1.8} 
            minZoom={1.5}
            maxZoom={6}
            style={{ height: '100%', width: '100%' }}
            scrollWheelZoom={true}
            dragging={true}
            doubleClickZoom={true}
            attributionControl={false}
            className="z-0"
            zoomControl={false}
          >
            {/* Modern Light Map */}
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />
          
          {mapPoints.map((point) => {
            const isCritical = point.riskLevel === 'critical';
            const isHigh = point.riskLevel === 'high';
            
            return (
              <React.Fragment key={point.id}>
                {/* Outer glow ring - larger for high risk */}
                <CircleMarker
                  center={[point.lat, point.lon]}
                  radius={isCritical ? 22 : isHigh ? 18 : 14}
                  pathOptions={{ 
                    color: getRiskColor(point.riskLevel),
                    fillColor: getRiskColor(point.riskLevel),
                    fillOpacity: 0.08,
                    weight: 0
                  }}
                />
                
                {/* Middle ring */}
                <CircleMarker
                  center={[point.lat, point.lon]}
                  radius={isCritical ? 12 : isHigh ? 10 : 8}
                  pathOptions={{ 
                    color: getRiskColor(point.riskLevel),
                    fillColor: getRiskColor(point.riskLevel),
                    fillOpacity: 0.25,
                    weight: 1.5,
                    opacity: 0.6
                  }}
                />
                
                {/* Inner core - smaller and more precise */}
                <CircleMarker
                  center={[point.lat, point.lon]}
                  radius={isCritical ? 5 : isHigh ? 4.5 : 3.5}
                  pathOptions={{ 
                    color: '#ffffff',
                    fillColor: getRiskColor(point.riskLevel),
                    fillOpacity: 1,
                    weight: 2,
                    className: 'supplier-marker-core'
                  }}
                  eventHandlers={{
                    click: () => onViewSupplier(point.supplier)
                  }}
                >
                  <Tooltip direction="top" offset={[0, -10]} opacity={0.95}>
                    <div className="text-xs font-bold text-slate-900">{point.supplierName}</div>
                    <div className="text-[10px] text-slate-500">{point.location}</div>
                  </Tooltip>
                  
                  <Popup className="custom-popup">
                    <div className="p-1 min-w-[220px]">
                      <div className="flex items-start justify-between mb-2 pb-2 border-b border-slate-100">
                        <h4 className="font-semibold text-sm text-slate-900">{point.supplierName}</h4>
                        <Badge 
                          className={`uppercase text-[10px] px-2 py-0.5 ${
                            isCritical ? 'bg-red-100 text-red-700' :
                            isHigh ? 'bg-orange-100 text-orange-700' :
                            point.riskLevel === 'medium' ? 'bg-amber-100 text-amber-700' :
                            'bg-emerald-100 text-emerald-700'
                          } border-0`}
                        >
                          {point.riskLevel} risk
                        </Badge>
                      </div>
                      
                      <div className="text-xs text-slate-600 space-y-2 mb-3">
                        <div className="flex items-center gap-1.5 text-slate-700">
                          <MapPin className="w-3.5 h-3.5 text-slate-400" /> 
                          <span className="font-medium">{point.location}</span>
                        </div>
                        <div className="text-slate-500">{point.name}</div>
                        
                        {point.supplier.risk_score !== undefined && (
                          <div className="bg-slate-50 p-2 rounded-lg mt-2">
                            <div className="text-[10px] text-slate-500 uppercase font-semibold mb-1">Risk Score</div>
                            <div className="font-mono font-bold text-slate-700">{point.supplier.risk_score}/100</div>
                          </div>
                        )}
                      </div>
                      
                      <Button 
                        size="sm" 
                        className="w-full h-7 text-xs bg-gradient-to-r from-[#86b027] to-[#6a8f20] hover:from-[#769c22] hover:to-[#5a7c1a] text-white shadow-md"
                        onClick={() => onViewSupplier(point.supplier)}
                      >
                        View Details <ArrowRight className="w-3 h-3 ml-1" />
                      </Button>
                    </div>
                  </Popup>
                </CircleMarker>
              </React.Fragment>
            );
          })}
        </MapContainer>
        
        {/* Compact Legend - Clean Design */}
        <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-sm border border-slate-200 shadow-xl rounded-xl z-[1000] overflow-hidden">
          <div className="p-3">
            <h5 className="font-bold text-[10px] text-slate-800 mb-2 flex items-center gap-1.5 pb-2 border-b border-slate-100 uppercase tracking-wide">
              <AlertTriangle className="w-3.5 h-3.5 text-slate-600" />
              Risk Index
            </h5>
            <div className="space-y-1.5">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full shadow-md" style={{ backgroundColor: '#ff0066' }}></div>
                <div className="flex flex-col leading-none">
                  <span className="font-semibold text-slate-700 text-[10px]">Critical</span>
                  <span className="text-[9px] text-slate-400">{mapPoints.filter(p => p.riskLevel === 'critical').length} sites</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full shadow-md" style={{ backgroundColor: '#ff6600' }}></div>
                <div className="flex flex-col leading-none">
                  <span className="font-semibold text-slate-700 text-[10px]">High</span>
                  <span className="text-[9px] text-slate-400">{mapPoints.filter(p => p.riskLevel === 'high').length} sites</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full shadow-md" style={{ backgroundColor: '#00d4ff' }}></div>
                <div className="flex flex-col leading-none">
                  <span className="font-semibold text-slate-700 text-[10px]">Medium</span>
                  <span className="text-[9px] text-slate-400">{mapPoints.filter(p => p.riskLevel === 'medium').length} sites</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full shadow-md" style={{ backgroundColor: '#00ff88' }}></div>
                <div className="flex flex-col leading-none">
                  <span className="font-semibold text-slate-700 text-[10px]">Low</span>
                  <span className="text-[9px] text-slate-400">{mapPoints.filter(p => p.riskLevel === 'low').length} sites</span>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Modern Stat Card with 3D Effect */}
        <div className="absolute bottom-3 left-3 z-[400]">
          <div className="bg-white/95 backdrop-blur-sm border border-slate-200 shadow-xl px-4 py-2.5 rounded-xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-[#86b027]/5 via-transparent to-blue-500/5" />
            <div className="relative">
              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Global Network</div>
              <div className="text-2xl font-black bg-gradient-to-r from-[#86b027] to-emerald-600 bg-clip-text text-transparent mt-0.5">
                {mapPoints.length} <span className="text-sm text-slate-400 bg-clip-text bg-gradient-to-r from-slate-400 to-slate-500">sites</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      </div>
    </Card>
  );
}