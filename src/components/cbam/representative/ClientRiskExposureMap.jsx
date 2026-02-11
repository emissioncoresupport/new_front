import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import { AlertTriangle, Download } from "lucide-react";

import 'leaflet/dist/leaflet.css';

const COUNTRY_COORDS = {
  'China': { lat: 35.8617, lng: 104.1954 },
  'India': { lat: 20.5937, lng: 78.9629 },
  'Turkey': { lat: 38.9637, lng: 35.2433 },
  'USA': { lat: 37.0902, lng: -95.7129 },
  'Brazil': { lat: -14.2350, lng: -51.9253 },
  'Russia': { lat: 61.5240, lng: 105.3188 },
  'Vietnam': { lat: 14.0583, lng: 108.2772 },
  'South Korea': { lat: 35.9078, lng: 127.7669 }
};

const getRiskColor = (riskLevel) => {
  switch(riskLevel) {
    case 'critical': return '#ef4444';
    case 'high': return '#f59e0b';
    case 'medium': return '#eab308';
    default: return '#86b027';
  }
};

export default function ClientRiskExposureMap({ clients, imports }) {
  const riskData = useMemo(() => {
    const countryRisks = {};
    
    clients.forEach(client => {
      const clientImports = imports.filter(i => i.eori_number === client.eori_number);
      
      clientImports.forEach(imp => {
        const country = imp.country_of_origin;
        if (!country || !COUNTRY_COORDS[country]) return;
        
        if (!countryRisks[country]) {
          countryRisks[country] = {
            country,
            clients: new Set(),
            totalEmissions: 0,
            imports: 0,
            riskLevel: 'low'
          };
        }
        
        countryRisks[country].clients.add(client.name);
        countryRisks[country].totalEmissions += imp.total_embedded_emissions || 0;
        countryRisks[country].imports += 1;
      });
    });

    // Calculate risk levels
    Object.values(countryRisks).forEach(risk => {
      const avgEmissions = risk.totalEmissions / risk.imports;
      if (avgEmissions > 2.5) risk.riskLevel = 'critical';
      else if (avgEmissions > 2.0) risk.riskLevel = 'high';
      else if (avgEmissions > 1.5) risk.riskLevel = 'medium';
    });

    return Object.values(countryRisks);
  }, [clients, imports]);

  const handleExport = () => {
    const exportData = riskData.map(r => ({
      country: r.country,
      clients: Array.from(r.clients).join('; '),
      imports: r.imports,
      totalEmissions: r.totalEmissions.toFixed(1),
      riskLevel: r.riskLevel
    }));
    
    const headers = Object.keys(exportData[0]);
    const csv = [
      headers.join(','),
      ...exportData.map(row => headers.map(h => row[h]).join(','))
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `client_risk_exposure_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Client Risk Exposure Map
            </CardTitle>
            <p className="text-xs text-slate-500 mt-1">Geographic risk distribution across client portfolio</p>
          </div>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="w-3 h-3 mr-1" /> Export
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="h-[350px] relative">
          <MapContainer 
            center={[25, 10]} 
            zoom={1.5} 
            style={{ height: '100%', width: '100%' }}
            attributionControl={false}
            zoomControl={false}
          >
            <TileLayer
              url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            />

            {riskData.map((risk, idx) => {
              const coords = COUNTRY_COORDS[risk.country];
              if (!coords) return null;

              return (
                <CircleMarker
                  key={idx}
                  center={[coords.lat, coords.lng]}
                  radius={Math.min(30, 10 + risk.imports * 2)}
                  pathOptions={{
                    color: getRiskColor(risk.riskLevel),
                    fillColor: getRiskColor(risk.riskLevel),
                    fillOpacity: 0.3,
                    weight: 2
                  }}
                >
                  <CircleMarker
                    center={[coords.lat, coords.lng]}
                    radius={5}
                    pathOptions={{
                      color: '#fff',
                      fillColor: getRiskColor(risk.riskLevel),
                      fillOpacity: 1,
                      weight: 2
                    }}
                  />
                  <Popup>
                    <div className="p-2 min-w-[200px]">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-bold text-sm">{risk.country}</span>
                        <Badge 
                          className={`text-[10px] ${
                            risk.riskLevel === 'critical' ? 'bg-red-100 text-red-700' :
                            risk.riskLevel === 'high' ? 'bg-orange-100 text-orange-700' :
                            'bg-yellow-100 text-yellow-700'
                          } border-0`}
                        >
                          {risk.riskLevel.toUpperCase()}
                        </Badge>
                      </div>
                      <div className="space-y-1 text-xs">
                        <p>Clients: <strong>{risk.clients.size}</strong></p>
                        <p>Imports: <strong>{risk.imports}</strong></p>
                        <p>Emissions: <strong>{risk.totalEmissions.toFixed(1)}</strong> tCO2e</p>
                        <div className="mt-2 pt-2 border-t border-slate-100">
                          <p className="text-[10px] text-slate-500">Active Clients:</p>
                          <p className="text-[10px] font-medium">
                            {Array.from(risk.clients).slice(0, 3).join(', ')}
                            {risk.clients.size > 3 && '...'}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Popup>
                </CircleMarker>
              );
            })}
          </MapContainer>

          {/* Legend */}
          <div className="absolute bottom-2 right-2 bg-white/95 backdrop-blur-sm border border-slate-200 p-2 rounded-lg z-[1000] text-[10px]">
            <div className="font-bold text-slate-800 mb-1.5 pb-1 border-b">Risk Levels</div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <span>Critical (&gt;2.5 tCO2e/t)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-orange-500" />
                <span>High (2.0-2.5)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                <span>Medium (1.5-2.0)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2 h-2 rounded-full bg-[#86b027]" />
                <span>Low (&lt;1.5)</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}