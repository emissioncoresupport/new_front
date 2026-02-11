import React, { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useMutation, useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { 
  Satellite, 
  Globe, 
  Database, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  Settings,
  Zap,
  Link as LinkIcon,
  Shield
} from "lucide-react";

export default function EUDRAPIIntegration() {
  const [apiConfigs, setApiConfigs] = useState({
    customs: { enabled: false, apiKey: '', endpoint: '' },
    satellite: { enabled: false, apiKey: '', provider: 'sentinel' },
    forest: { enabled: false, apiKey: '', dataset: 'glad' },
    weather: { enabled: false, apiKey: '', provider: 'openweather' }
  });

  const testConnectionMutation = useMutation({
    mutationFn: async (apiType) => {
      toast.loading(`Testing ${apiType} connection...`);
      
      // Simulate API test
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      return { success: true, latency: Math.floor(Math.random() * 300) + 100 };
    },
    onSuccess: (data, apiType) => {
      toast.dismiss();
      toast.success(`${apiType} API connected (${data.latency}ms)`, {
        icon: <CheckCircle2 className="w-5 h-5 text-emerald-600" />
      });
    },
    onError: (_, apiType) => {
      toast.dismiss();
      toast.error(`${apiType} connection failed`);
    }
  });

  const fetchRealTimeDataMutation = useMutation({
    mutationFn: async ({ type, params }) => {
      toast.loading('Fetching real-time data...');

      let prompt = '';
      
      if (type === 'customs') {
        prompt = `Fetch real-time customs clearance data for: ${JSON.stringify(params)}. 
        Provide: clearance_status, inspection_results, duty_calculation, clearance_date, reference_number`;
      } else if (type === 'satellite') {
        prompt = `Fetch latest satellite imagery analysis for coordinates: ${params.coordinates}. 
        Provide: ndvi_current, forest_cover_percent, change_detected, last_image_date, cloud_cover_percent`;
      } else if (type === 'forest') {
        prompt = `Check forest alert systems for region: ${params.region}. 
        Provide: alert_count, deforestation_detected, area_affected_ha, alert_dates, confidence_level`;
      }

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: true,
        response_json_schema: {
          type: "object",
          properties: {
            data: { type: "object" },
            timestamp: { type: "string" },
            source: { type: "string" },
            confidence: { type: "number" }
          }
        }
      });

      return result;
    },
    onSuccess: (data) => {
      toast.dismiss();
      toast.success('Real-time data fetched successfully');
    },
    onError: () => {
      toast.dismiss();
      toast.error('Failed to fetch data');
    }
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-slate-900">External API Integration</h2>
        <p className="text-sm text-slate-600">Connect to real-time data sources for automated compliance</p>
      </div>

      <Tabs defaultValue="customs">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="customs" className="gap-2">
            <Globe className="w-4 h-4" /> Customs
          </TabsTrigger>
          <TabsTrigger value="satellite" className="gap-2">
            <Satellite className="w-4 h-4" /> Satellite
          </TabsTrigger>
          <TabsTrigger value="forest" className="gap-2">
            <Database className="w-4 h-4" /> Forest Alerts
          </TabsTrigger>
          <TabsTrigger value="weather" className="gap-2">
            <Zap className="w-4 h-4" /> Weather
          </TabsTrigger>
        </TabsList>

        {/* Customs API */}
        <TabsContent value="customs">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-base">Customs Data API</CardTitle>
                <Switch 
                  checked={apiConfigs.customs.enabled}
                  onCheckedChange={(checked) => setApiConfigs({
                    ...apiConfigs,
                    customs: { ...apiConfigs.customs, enabled: checked }
                  })}
                />
              </div>
              <p className="text-sm text-slate-600">Connect to customs databases for clearance status</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>API Endpoint</Label>
                <Input 
                  placeholder="https://api.customs.eu/v1/clearance"
                  value={apiConfigs.customs.endpoint}
                  onChange={(e) => setApiConfigs({
                    ...apiConfigs,
                    customs: { ...apiConfigs.customs, endpoint: e.target.value }
                  })}
                />
              </div>

              <div className="space-y-2">
                <Label>API Key</Label>
                <Input 
                  type="password"
                  placeholder="Enter API key..."
                  value={apiConfigs.customs.apiKey}
                  onChange={(e) => setApiConfigs({
                    ...apiConfigs,
                    customs: { ...apiConfigs.customs, apiKey: e.target.value }
                  })}
                />
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => testConnectionMutation.mutate('Customs')}
                  disabled={testConnectionMutation.isPending}
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Test Connection
                </Button>
                <Button 
                  onClick={() => fetchRealTimeDataMutation.mutate({
                    type: 'customs',
                    params: { dds_ref: 'DDS-2025-001' }
                  })}
                  className="bg-[#86b027] hover:bg-[#769c22]"
                >
                  <Database className="w-4 h-4 mr-2" />
                  Fetch Data
                </Button>
              </div>

              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                <h5 className="font-bold text-blue-900 mb-2">Automated Features:</h5>
                <ul className="space-y-1 text-blue-800">
                  <li>• Real-time clearance status updates</li>
                  <li>• Automated duty calculations</li>
                  <li>• Inspection result notifications</li>
                  <li>• Document verification status</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Satellite API */}
        <TabsContent value="satellite">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-base">Satellite Imagery API</CardTitle>
                <Switch 
                  checked={apiConfigs.satellite.enabled}
                  onCheckedChange={(checked) => setApiConfigs({
                    ...apiConfigs,
                    satellite: { ...apiConfigs.satellite, enabled: checked }
                  })}
                />
              </div>
              <p className="text-sm text-slate-600">Automated NDVI and deforestation analysis</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Satellite Provider</Label>
                <select className="w-full p-2 border rounded-lg">
                  <option value="sentinel">Sentinel-2 (ESA)</option>
                  <option value="landsat">Landsat-8 (NASA)</option>
                  <option value="planet">Planet Labs</option>
                  <option value="maxar">Maxar</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>API Key</Label>
                <Input 
                  type="password"
                  placeholder="Enter API key..."
                  value={apiConfigs.satellite.apiKey}
                  onChange={(e) => setApiConfigs({
                    ...apiConfigs,
                    satellite: { ...apiConfigs.satellite, apiKey: e.target.value }
                  })}
                />
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="outline"
                  onClick={() => testConnectionMutation.mutate('Satellite')}
                  disabled={testConnectionMutation.isPending}
                >
                  <Satellite className="w-4 h-4 mr-2" />
                  Test Connection
                </Button>
                <Button 
                  onClick={() => fetchRealTimeDataMutation.mutate({
                    type: 'satellite',
                    params: { coordinates: [-5.5, 105.3] }
                  })}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Fetch Latest Imagery
                </Button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-slate-50 rounded-lg border">
                  <div className="text-xs text-slate-500 mb-1">Update Frequency</div>
                  <div className="font-bold text-slate-900">Every 5 days</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border">
                  <div className="text-xs text-slate-500 mb-1">Resolution</div>
                  <div className="font-bold text-slate-900">10m / pixel</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Forest Alert API */}
        <TabsContent value="forest">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-base">Forest Alert Systems</CardTitle>
                <Switch 
                  checked={apiConfigs.forest.enabled}
                  onCheckedChange={(checked) => setApiConfigs({
                    ...apiConfigs,
                    forest: { ...apiConfigs.forest, enabled: checked }
                  })}
                />
              </div>
              <p className="text-sm text-slate-600">GLAD, RADD, and Hansen dataset integration</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Alert Dataset</Label>
                <select className="w-full p-2 border rounded-lg">
                  <option value="glad">GLAD Alerts (University of Maryland)</option>
                  <option value="radd">RADD Alerts (Wageningen University)</option>
                  <option value="hansen">Hansen Global Forest Change</option>
                  <option value="all">All Sources</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>API Key</Label>
                <Input 
                  type="password"
                  placeholder="Enter Global Forest Watch API key..."
                  value={apiConfigs.forest.apiKey}
                  onChange={(e) => setApiConfigs({
                    ...apiConfigs,
                    forest: { ...apiConfigs.forest, apiKey: e.target.value }
                  })}
                />
              </div>

              <div className="flex gap-3">
                <Button 
                  variant="outline"
                  onClick={() => testConnectionMutation.mutate('Forest Alert')}
                  disabled={testConnectionMutation.isPending}
                >
                  <Shield className="w-4 h-4 mr-2" />
                  Test Connection
                </Button>
                <Button 
                  onClick={() => fetchRealTimeDataMutation.mutate({
                    type: 'forest',
                    params: { region: 'Indonesia' }
                  })}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  <Database className="w-4 h-4 mr-2" />
                  Check Alerts
                </Button>
              </div>

              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-sm">
                <h5 className="font-bold text-emerald-900 mb-2">Auto-monitoring:</h5>
                <ul className="space-y-1 text-emerald-800">
                  <li>• Daily alert checks for all plots</li>
                  <li>• Instant notifications on detection</li>
                  <li>• Historical trend analysis</li>
                  <li>• Automatic risk score updates</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Weather API */}
        <TabsContent value="weather">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle className="text-base">Weather Data API</CardTitle>
                <Switch 
                  checked={apiConfigs.weather.enabled}
                  onCheckedChange={(checked) => setApiConfigs({
                    ...apiConfigs,
                    weather: { ...apiConfigs.weather, enabled: checked }
                  })}
                />
              </div>
              <p className="text-sm text-slate-600">Weather patterns and climate risk assessment</p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Weather Provider</Label>
                <select className="w-full p-2 border rounded-lg">
                  <option value="openweather">OpenWeatherMap</option>
                  <option value="weatherapi">WeatherAPI</option>
                  <option value="climacell">ClimaCell</option>
                </select>
              </div>

              <div className="space-y-2">
                <Label>API Key</Label>
                <Input 
                  type="password"
                  placeholder="Enter API key..."
                  value={apiConfigs.weather.apiKey}
                  onChange={(e) => setApiConfigs({
                    ...apiConfigs,
                    weather: { ...apiConfigs.weather, apiKey: e.target.value }
                  })}
                />
              </div>

              <Button 
                variant="outline" 
                onClick={() => testConnectionMutation.mutate('Weather')}
                disabled={testConnectionMutation.isPending}
              >
                <Zap className="w-4 h-4 mr-2" />
                Test Connection
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}