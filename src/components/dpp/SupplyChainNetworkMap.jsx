import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Globe, MapPin, Factory, Package, TrendingUp } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, Polyline } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix leaflet marker icons
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

export default function SupplyChainNetworkMap({ dppRecords, suppliers, supplierMappings, products }) {
  const [selectedNode, setSelectedNode] = useState(null);

  // Country coordinates
  const countryCoords = {
    'China': [35.8617, 104.1954],
    'Germany': [51.1657, 10.4515],
    'United States': [37.0902, -95.7129],
    'India': [20.5937, 78.9629],
    'Japan': [36.2048, 138.2529],
    'United Kingdom': [55.3781, -3.4360],
    'France': [46.2276, 2.2137],
    'Italy': [41.8719, 12.5674],
    'Netherlands': [52.1326, 5.2913],
    'Belgium': [50.5039, 4.4699]
  };

  // Build network data
  const supplierLocations = suppliers.map(s => ({
    id: s.id,
    name: s.legal_name,
    country: s.country,
    coords: countryCoords[s.country] || [51.5074, -0.1278],
    tier: s.tier,
    risk_level: s.risk_level
  }));

  // Calculate product flows
  const productFlows = supplierMappings.map(m => {
    const supplier = suppliers.find(s => s.id === m.supplier_id);
    const product = products.find(p => p.id === m.sku_id);
    
    if (!supplier || !product) return null;
    
    return {
      from: countryCoords[supplier.country] || [51.5074, -0.1278],
      to: [52.3676, 4.9041], // Amsterdam (company HQ example)
      supplier: supplier.legal_name,
      product: product.name,
      volume: m.annual_volume || 0
    };
  }).filter(Boolean);

  // Network statistics
  const stats = {
    totalSuppliers: suppliers.length,
    countries: [...new Set(suppliers.map(s => s.country))].length,
    tier1: suppliers.filter(s => s.tier === 'tier_1').length,
    highRisk: suppliers.filter(s => s.risk_level === 'high' || s.risk_level === 'critical').length
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Factory className="w-4 h-4 text-slate-500" />
              <p className="text-xs text-slate-500 uppercase font-bold">Total Suppliers</p>
            </div>
            <h3 className="text-2xl font-bold text-slate-900">{stats.totalSuppliers}</h3>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-4 h-4 text-blue-600" />
              <p className="text-xs text-slate-500 uppercase font-bold">Countries</p>
            </div>
            <h3 className="text-2xl font-bold text-blue-600">{stats.countries}</h3>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Package className="w-4 h-4 text-emerald-600" />
              <p className="text-xs text-slate-500 uppercase font-bold">Tier 1 Suppliers</p>
            </div>
            <h3 className="text-2xl font-bold text-emerald-600">{stats.tier1}</h3>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="w-4 h-4 text-rose-600" />
              <p className="text-xs text-slate-500 uppercase font-bold">High Risk</p>
            </div>
            <h3 className="text-2xl font-bold text-rose-600">{stats.highRisk}</h3>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="w-5 h-5 text-[#86b027]" />
            Global Supply Chain Network
          </CardTitle>
          <p className="text-sm text-slate-500">Visualizing supplier locations and product flows</p>
        </CardHeader>
        <CardContent>
          <div className="h-[500px] w-full rounded-lg overflow-hidden border">
            <MapContainer 
              center={[30, 10]} 
              zoom={2} 
              style={{ height: "100%", width: "100%" }}
              minZoom={2}
              maxZoom={8}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              {supplierLocations.map((loc, idx) => (
                <Marker key={idx} position={loc.coords}>
                  <Popup>
                    <div className="text-xs">
                      <h4 className="font-bold">{loc.name}</h4>
                      <p className="text-slate-600">{loc.country}</p>
                      <Badge variant="outline" className="mt-1 text-xs">{loc.tier}</Badge>
                    </div>
                  </Popup>
                </Marker>
              ))}

              {productFlows.slice(0, 20).map((flow, idx) => (
                <Polyline 
                  key={idx}
                  positions={[flow.from, flow.to]}
                  color="#86b027"
                  weight={2}
                  opacity={0.6}
                />
              ))}
            </MapContainer>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Supplier Distribution by Country</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(
                suppliers.reduce((acc, s) => {
                  acc[s.country] = (acc[s.country] || 0) + 1;
                  return acc;
                }, {})
              )
                .sort((a, b) => b[1] - a[1])
                .slice(0, 8)
                .map(([country, count], idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-slate-400" />
                      <span className="font-medium">{country}</span>
                    </div>
                    <Badge variant="outline">{count} suppliers</Badge>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Risk Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {['low', 'medium', 'high', 'critical'].map(level => {
                const count = suppliers.filter(s => s.risk_level === level).length;
                const percentage = suppliers.length > 0 ? Math.round((count / suppliers.length) * 100) : 0;
                
                return (
                  <div key={level} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium capitalize">{level} Risk</span>
                      <span className="text-slate-500">{count} ({percentage}%)</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${
                          level === 'low' ? 'bg-emerald-600' :
                          level === 'medium' ? 'bg-amber-500' :
                          level === 'high' ? 'bg-orange-500' : 'bg-rose-600'
                        }`}
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}