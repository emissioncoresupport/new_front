import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polygon, Polyline, CircleMarker, Tooltip, useMapEvents, useMap } from 'react-leaflet';
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { X, Pencil, Upload, Database, MapPin, CheckCircle2, Square, Circle as CircleIcon, Home, Layers } from "lucide-react";
import { toast } from "sonner";
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

function MapDrawingEvents({ onMapClick }) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng);
    }
  });
  return null;
}

function MapFitBounds({ bounds }) {
  const map = useMap();
  useEffect(() => {
    if (bounds && bounds.isValid()) {
      map.fitBounds(bounds);
    }
  }, [bounds, map]);
  return null;
}

export default function GeoJSONMapEditor({ onDataChange, initialData, readOnly }) {
  const [drawnPolygons, setDrawnPolygons] = useState([]);
  const [currentDrawing, setCurrentDrawing] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [activeTab, setActiveTab] = useState('draw');
  const [showGrid, setShowGrid] = useState(false);
  const [registryId, setRegistryId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const mapRef = React.useRef(null);

  useEffect(() => {
    if (initialData?.features) {
      const loaded = initialData.features.map((f, idx) => ({
        id: idx,
        name: f.properties?.name || `Plot ${idx + 1}`,
        coordinates: f.geometry.coordinates
      }));
      setDrawnPolygons(loaded);
    }
  }, [initialData]);

  const updateParent = (polygons) => {
    const featureCollection = {
      type: "FeatureCollection",
      features: polygons.map(p => ({
        type: "Feature",
        properties: { name: p.name },
        geometry: {
          type: "Polygon",
          coordinates: p.coordinates
        }
      }))
    };
    onDataChange(featureCollection);
  };

  const handleMapClick = (latlng) => {
    if (!isDrawing) return;
    setCurrentDrawing(prev => [...prev, [latlng.lat, latlng.lng]]);
  };

  const calculatePolygonArea = (coords) => {
    if (coords.length < 3) return 0;
    const R = 6371000;
    let area = 0;
    for (let i = 0; i < coords.length; i++) {
      const j = (i + 1) % coords.length;
      const lat1 = coords[i][1] * Math.PI / 180;
      const lat2 = coords[j][1] * Math.PI / 180;
      const lng1 = coords[i][0] * Math.PI / 180;
      const lng2 = coords[j][0] * Math.PI / 180;
      area += (lng2 - lng1) * (2 + Math.sin(lat1) + Math.sin(lat2));
    }
    area = Math.abs(area * R * R / 2);
    return area / 10000;
  };

  const finishDrawing = () => {
    if (currentDrawing.length < 3) {
      toast.error("Need at least 3 points");
      return;
    }
    
    const coords = currentDrawing.map(pt => [pt[1], pt[0]]);
    const area = calculatePolygonArea(coords);
    
    const newPoly = {
      id: Date.now(),
      name: `Plot ${drawnPolygons.length + 1}`,
      coordinates: [coords]
    };
    
    const updated = [...drawnPolygons, newPoly];
    setDrawnPolygons(updated);
    updateParent(updated);
    setCurrentDrawing([]);
    setIsDrawing(false);
    toast.success(`Plot added (${area.toFixed(2)} ha)`);
  };

  const cancelDrawing = () => {
    setCurrentDrawing([]);
    setIsDrawing(false);
  };

  const removePolygon = (id) => {
    const updated = drawnPolygons.filter(p => p.id !== id);
    setDrawnPolygons(updated);
    updateParent(updated);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target.result);
        let features = [];
        
        if (json.type === "FeatureCollection") features = json.features;
        else if (json.type === "Feature") features = [json];

        const processed = features.map((f, idx) => ({
          id: Date.now() + idx,
          name: f.properties?.name || `Import ${drawnPolygons.length + idx + 1}`,
          coordinates: f.geometry.coordinates
        }));

        const updated = [...drawnPolygons, ...processed];
        setDrawnPolygons(updated);
        updateParent(updated);
        toast.success(`Imported ${processed.length} plots`);
      } catch {
        toast.error("Invalid GeoJSON file");
      }
    };
    reader.readAsText(file);
  };

  const fetchRegistry = async () => {
    if (!registryId) return;
    setIsLoading(true);
    
    setTimeout(() => {
      const mockCoords = [
        [-12.97, -38.50],
        [-12.98, -38.48],
        [-12.99, -38.52],
        [-12.97, -38.50]
      ];
      
      const newPoly = {
        id: Date.now(),
        name: `Registry: ${registryId}`,
        coordinates: [mockCoords]
      };
      
      const updated = [...drawnPolygons, newPoly];
      setDrawnPolygons(updated);
      updateParent(updated);
      setIsLoading(false);
      setRegistryId('');
      toast.success("Plot fetched from registry");
    }, 1500);
  };

  const allCoords = drawnPolygons.flatMap(p => 
    p.coordinates[0].map(c => [c[1], c[0]])
  ).concat(currentDrawing);
  
  const bounds = allCoords.length > 0 ? L.latLngBounds(allCoords) : null;

  return (
    <div className="grid grid-cols-12 gap-4 h-[600px]">
      {/* Left Panel - Enhanced Controls */}
      <div className="col-span-4 bg-white/60 backdrop-blur-xl rounded-3xl p-6 overflow-y-auto space-y-4 border border-slate-200 shadow-[0_8px_32px_rgba(0,0,0,0.06)]">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-3 w-full bg-white/80 backdrop-blur-sm border border-slate-200 shadow-sm">
            <TabsTrigger value="draw" disabled={readOnly} className="data-[state=active]:bg-slate-900 data-[state=active]:text-white gap-1">
              <Pencil className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="upload" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white gap-1">
              <Upload className="w-4 h-4" />
            </TabsTrigger>
            <TabsTrigger value="registry" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white gap-1">
              <Database className="w-4 h-4" />
            </TabsTrigger>
          </TabsList>

          <TabsContent value="draw" className="space-y-4">
            {/* Helper Tools */}
            <div className="space-y-2 p-3 bg-white rounded-lg border shadow-sm">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-medium">Show Grid</Label>
                <Switch checked={showGrid} onCheckedChange={setShowGrid} />
              </div>
            </div>

            {/* Drawing Instructions */}
            <div className="text-sm text-slate-700 bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-slate-200 shadow-sm">
              <div className="flex items-start gap-2">
                <MapPin className="w-5 h-5 text-slate-900 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900">Quick Guide:</strong>
                  <ul className="mt-2 space-y-1 text-xs text-slate-600">
                    <li>• Click map to place points</li>
                    <li>• Click "Finish" to complete shape</li>
                    <li>• Min 3 points required</li>
                    <li>• Area auto-calculated</li>
                  </ul>
                </div>
              </div>
            </div>
            
            <Button
              onClick={isDrawing ? finishDrawing : () => setIsDrawing(true)}
              disabled={readOnly}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white shadow-lg"
              size="lg"
            >
              {isDrawing ? (
                <><CheckCircle2 className="w-5 h-5 mr-2" /> Finish Drawing</>
              ) : (
                <><Pencil className="w-5 h-5 mr-2" /> Start Drawing</>
              )}
            </Button>

            {isDrawing && currentDrawing.length > 0 && (
              <Button variant="outline" onClick={cancelDrawing} className="w-full border-slate-300 text-slate-700 hover:bg-slate-50">
                <X className="w-4 h-4 mr-2" /> Cancel ({currentDrawing.length} points)
              </Button>
            )}

            {drawnPolygons.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-light text-sm text-slate-900">Drawn Plots</h4>
                  <Badge className="bg-slate-900 text-white">{drawnPolygons.length}</Badge>
                </div>
                <div className="space-y-2 max-h-[200px] overflow-y-auto">
                  {drawnPolygons.map((poly, idx) => (
                    <div key={poly.id} className="flex items-center justify-between p-3 bg-white/80 backdrop-blur-sm rounded-xl border border-slate-200 hover:border-slate-400 transition-colors shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center">
                          <MapPin className="w-5 h-5 text-slate-900" />
                        </div>
                        <div className="text-xs">
                          <div className="font-medium text-slate-900">{poly.name}</div>
                          <div className="text-slate-500 font-light">{calculatePolygonArea(poly.coordinates[0]).toFixed(2)} ha</div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removePolygon(poly.id)}
                        disabled={readOnly}
                        className="hover:bg-slate-50"
                      >
                        <X className="w-4 h-4 text-slate-600" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="upload" className="space-y-4">
            <div className="text-sm text-slate-700 bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-slate-200">
              <div className="flex items-start gap-2">
                <Upload className="w-5 h-5 text-slate-900 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-slate-900">Upload GeoJSON File</strong>
                  <p className="text-xs mt-1 text-slate-600">Support for .geojson and .json files with polygon geometries</p>
                </div>
              </div>
            </div>
            
            <div className="border-2 border-dashed border-slate-300 rounded-xl p-8 hover:border-slate-400 transition-colors bg-white/80 backdrop-blur-sm">
              <label className="cursor-pointer flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center shadow-lg">
                  <Upload className="w-8 h-8 text-white" />
                </div>
                <div className="text-center">
                  <div className="text-sm font-medium text-slate-900">Click to upload or drag & drop</div>
                  <div className="text-xs text-slate-500 font-light mt-1">GeoJSON files only</div>
                </div>
                <input
                  type="file"
                  accept=".geojson,.json"
                  onChange={handleFileUpload}
                  disabled={readOnly}
                  className="hidden"
                />
              </label>
            </div>

            <div className="space-y-2">
              <h5 className="text-xs font-light text-slate-900 uppercase tracking-wide">Supported Formats</h5>
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-white/80 backdrop-blur-sm rounded-lg border border-slate-200 text-xs">
                  <div className="font-medium text-slate-900">.geojson</div>
                  <div className="text-slate-500 font-light">Standard format</div>
                </div>
                <div className="p-3 bg-white/80 backdrop-blur-sm rounded-lg border border-slate-200 text-xs">
                  <div className="font-medium text-slate-900">.json</div>
                  <div className="text-slate-500 font-light">JSON with geometry</div>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="registry" className="space-y-4">
            <div className="space-y-2">
              <Label>National Registry ID</Label>
              <div className="flex gap-2">
                <Input 
                  placeholder="e.g., CAR-BR-12345" 
                  value={registryId}
                  onChange={(e) => setRegistryId(e.target.value)}
                />
                <Button onClick={fetchRegistry} disabled={isLoading || !registryId}>
                  {isLoading ? "..." : "Fetch"}
                </Button>
              </div>
              <p className="text-xs text-slate-400">Supported: Brazil (CAR), Indonesia (STDB)</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Right Panel - Enhanced Map */}
      <div className="col-span-8 relative rounded-3xl overflow-hidden border border-slate-200 shadow-[0_8px_32px_rgba(0,0,0,0.06)]">
        {/* Map Controls Overlay */}
        <div className="absolute top-4 right-4 z-[1000] space-y-2">
          <div className="bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-2 border border-slate-200">
            <Button size="sm" variant="outline" className="w-full mb-1" onClick={() => mapRef.current?.setView?.([20, 0], 2)}>
              <Home className="w-4 h-4 mr-1" /> Reset
            </Button>
            <Button size="sm" variant="outline" className="w-full text-xs">
              <Layers className="w-4 h-4 mr-1" /> Satellite
            </Button>
          </div>
        </div>

        {/* Drawing Status */}
        {isDrawing && (
          <div className="absolute top-4 left-4 z-[1000] bg-slate-900 text-white px-4 py-2 rounded-xl shadow-lg backdrop-blur-sm">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
              <span className="text-sm font-medium">Drawing Active</span>
            </div>
            <div className="text-xs mt-1 font-light">{currentDrawing.length} points placed</div>
          </div>
        )}

        <MapContainer
          ref={mapRef}
          center={[20, 0]}
          zoom={2}
          style={{ height: '100%', width: '100%' }}
          className="z-0"
        >
          <TileLayer
            url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"
            attribution='Esri'
          />
          
          {showGrid && (
            <div style={{
              position: 'absolute',
              inset: 0,
              backgroundImage: 'linear-gradient(rgba(134,176,39,0.15) 1px, transparent 1px), linear-gradient(90deg, rgba(134,176,39,0.15) 1px, transparent 1px)',
              backgroundSize: '50px 50px',
              pointerEvents: 'none',
              zIndex: 400
            }} />
          )}

          {bounds && <MapFitBounds bounds={bounds} />}
          {isDrawing && <MapDrawingEvents onMapClick={handleMapClick} />}

          {drawnPolygons.map((poly, idx) => (
            <Polygon
              key={poly.id}
              positions={poly.coordinates[0].map(c => [c[1], c[0]])}
              pathOptions={{ 
                color: '#86b027', 
                fillColor: '#86b027', 
                fillOpacity: 0.25,
                weight: 3
              }}
            >
              <Tooltip permanent direction="center">
                <div className="text-xs font-bold">Plot {idx + 1}</div>
                <div className="text-[10px]">{calculatePolygonArea(poly.coordinates[0]).toFixed(2)} ha</div>
              </Tooltip>
            </Polygon>
          ))}

          {currentDrawing.length > 0 && (
            <>
              <Polyline
                positions={currentDrawing}
                pathOptions={{ color: '#ef4444', weight: 3, dashArray: '10, 5' }}
              />
              {currentDrawing.map((pos, idx) => (
                <CircleMarker
                  key={idx}
                  center={pos}
                  radius={6}
                  pathOptions={{ 
                    color: '#ffffff', 
                    fillColor: '#ef4444', 
                    fillOpacity: 1,
                    weight: 2
                  }}
                >
                  <Tooltip direction="top" offset={[0, -10]}>
                    Point {idx + 1}
                  </Tooltip>
                </CircleMarker>
              ))}
            </>
          )}
        </MapContainer>

        {/* Area Counter */}
        {drawnPolygons.length > 0 && (
          <div className="absolute bottom-4 left-4 z-[1000] bg-white/95 backdrop-blur-xl rounded-xl shadow-lg p-4 border border-slate-200">
            <div className="text-xs text-slate-500 uppercase font-light tracking-wide mb-1">Total Area</div>
            <div className="text-3xl font-light text-slate-900">
              {drawnPolygons.reduce((sum, poly) => sum + calculatePolygonArea(poly.coordinates[0]), 0).toFixed(2)}
            </div>
            <div className="text-xs text-slate-500 font-light">hectares</div>
          </div>
        )}
      </div>
    </div>
  );
}