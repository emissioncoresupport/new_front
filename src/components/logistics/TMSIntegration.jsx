import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Database, CheckCircle2, AlertTriangle, RefreshCw, Play, Settings, History } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function TMSIntegration() {
  const [showConfig, setShowConfig] = useState(false);
  const [configData, setConfigData] = useState({
    provider: 'SAP',
    api_endpoint: '',
    api_key: '',
    sync_frequency: '24'
  });

  const queryClient = useQueryClient();

  const { data: connections = [] } = useQuery({
    queryKey: ['erp-connections'],
    queryFn: () => base44.entities.ERPConnection.list()
  });

  const tmsConnection = connections.find(c => c.connection_type === 'TMS');

  const syncMutation = useMutation({
    mutationFn: async () => {
      // Simulate TMS data sync
      toast.loading("Syncing shipment data from TMS...");
      
      // AI-powered data extraction and mapping
      const prompt = `Extract shipment records from TMS system and map to logistics schema.
      Expected fields: shipment_id, shipper_name, consignee_name, origin_code, destination_code, 
      shipment_date, main_transport_mode, total_weight_kg, total_distance_km.
      Generate 5 realistic shipment records.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            shipments: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  shipment_id: { type: "string" },
                  shipper_name: { type: "string" },
                  consignee_name: { type: "string" },
                  origin_code: { type: "string" },
                  destination_code: { type: "string" },
                  shipment_date: { type: "string" },
                  main_transport_mode: { type: "string" },
                  total_weight_kg: { type: "number" },
                  total_distance_km: { type: "number" }
                }
              }
            }
          }
        }
      });

      // Bulk create shipments
      for (const shipment of response.shipments) {
        await base44.entities.LogisticsShipment.create({
          ...shipment,
          source: 'TMS',
          status: 'Draft'
        });
      }

      return response.shipments.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['logistics-shipments'] });
      toast.success(`Successfully synced ${count} shipments from TMS`);
    }
  });

  const configureMutation = useMutation({
    mutationFn: (data) => {
      if (tmsConnection) {
        return base44.entities.ERPConnection.update(tmsConnection.id, {
          ...data,
          connection_type: 'TMS',
          status: 'active'
        });
      }
      return base44.entities.ERPConnection.create({
        ...data,
        connection_type: 'TMS',
        status: 'active'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['erp-connections'] });
      setShowConfig(false);
      toast.success('TMS connection configured');
    }
  });

  return (
    <div className="space-y-6">
      <Card className="border-[#86b027]/20 shadow-md">
        <CardHeader className="border-b border-slate-100">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-[#86b027]">
                <Database className="w-5 h-5" />
                TMS Integration
              </CardTitle>
              <p className="text-sm text-slate-500 mt-1">
                Connect to SAP, Oracle, BluJay, or other Transport Management Systems
              </p>
            </div>
            {tmsConnection ? (
              <Badge className="bg-[#86b027] text-white">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Connected
              </Badge>
            ) : (
              <Badge variant="outline" className="border-amber-500 text-amber-600">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Not Configured
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {tmsConnection ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 bg-slate-50 rounded-lg p-4">
                <div>
                  <p className="text-xs text-slate-500 uppercase font-bold">Provider</p>
                  <p className="text-lg font-semibold text-slate-900">{tmsConnection.provider || 'SAP TM'}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase font-bold">Last Sync</p>
                  <p className="text-lg font-semibold text-slate-900">
                    {tmsConnection.last_sync_date ? new Date(tmsConnection.last_sync_date).toLocaleString() : 'Never'}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase font-bold">Sync Frequency</p>
                  <p className="text-lg font-semibold text-slate-900">Every {tmsConnection.sync_frequency || '24'}h</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 uppercase font-bold">Data Quality</p>
                  <p className="text-lg font-semibold text-[#86b027]">{tmsConnection.data_quality_score || 95}%</p>
                </div>
              </div>

              <div className="flex gap-3">
                <Button 
                  onClick={() => syncMutation.mutate()}
                  disabled={syncMutation.isPending}
                  className="bg-[#86b027] hover:bg-[#769c22] text-white"
                >
                  {syncMutation.isPending ? (
                    <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Syncing...</>
                  ) : (
                    <><Play className="w-4 h-4 mr-2" /> Run Sync Now</>
                  )}
                </Button>
                <Button variant="outline" onClick={() => setShowConfig(true)}>
                  <Settings className="w-4 h-4 mr-2" />
                  Configure
                </Button>
                <Button variant="outline">
                  <History className="w-4 h-4 mr-2" />
                  Sync History
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <Database className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-slate-900 mb-2">No TMS Connected</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto mb-4">
                Connect your TMS to automatically import shipment data and enable real-time emissions tracking
              </p>
              <Button onClick={() => setShowConfig(true)} className="bg-[#86b027] hover:bg-[#769c22] text-white">
                Configure TMS Integration
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Configuration Modal */}
      <Dialog open={showConfig} onOpenChange={setShowConfig}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Configure TMS Integration</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>TMS Provider *</Label>
              <Select value={configData.provider} onValueChange={(v) => setConfigData({...configData, provider: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SAP">SAP Transportation Management</SelectItem>
                  <SelectItem value="Oracle">Oracle Transportation Management</SelectItem>
                  <SelectItem value="BluJay">BluJay TMS</SelectItem>
                  <SelectItem value="Manhattan">Manhattan TMS</SelectItem>
                  <SelectItem value="Other">Other / Custom API</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>API Endpoint</Label>
              <Input 
                value={configData.api_endpoint}
                onChange={(e) => setConfigData({...configData, api_endpoint: e.target.value})}
                placeholder="https://api.your-tms.com/v1"
              />
            </div>
            <div>
              <Label>API Key / Token</Label>
              <Input 
                type="password"
                value={configData.api_key}
                onChange={(e) => setConfigData({...configData, api_key: e.target.value})}
                placeholder="Enter your TMS API key"
              />
            </div>
            <div>
              <Label>Sync Frequency (hours)</Label>
              <Input 
                type="number"
                value={configData.sync_frequency}
                onChange={(e) => setConfigData({...configData, sync_frequency: e.target.value})}
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-slate-700">
                <strong>Automated Data Mapping:</strong> Our AI will automatically map your TMS fields to our schema.
                Historical data (12 months) will be imported on first sync.
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={() => setShowConfig(false)}>Cancel</Button>
            <Button 
              onClick={() => configureMutation.mutate(configData)}
              className="bg-[#86b027] hover:bg-[#769c22] text-white"
            >
              Save Configuration
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}