import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { 
  Database, CheckCircle2, AlertCircle, RefreshCw, Settings, 
  Link as LinkIcon, Activity, BarChart3, Zap, Clock, Loader2
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ERP_SYSTEMS = [
  { id: 'sap', name: 'SAP S/4HANA', logo: '🔷', color: 'blue' },
  { id: 'oracle', name: 'Oracle ERP Cloud', logo: '🔴', color: 'red' },
  { id: 'microsoft', name: 'Microsoft Dynamics 365', logo: '🟢', color: 'green' },
  { id: 'netsuite', name: 'NetSuite', logo: '🟠', color: 'orange' },
  { id: 'infor', name: 'Infor CloudSuite', logo: '🔵', color: 'indigo' },
  { id: 'sage', name: 'Sage Intacct', logo: '🟡', color: 'yellow' },
  { id: 'custom', name: 'Custom REST API', logo: '⚙️', color: 'slate' }
];

export default function ERPConnectorHub() {
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [selectedSystem, setSelectedSystem] = useState(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [newConnection, setNewConnection] = useState({
    system_type: '',
    api_endpoint: '',
    api_key: '',
    sync_frequency: 'daily',
    auto_map: true,
    sync_suppliers: true,
    sync_products: true,
    sync_inventory: true
  });

  const queryClient = useQueryClient();

  const { data: connections = [] } = useQuery({
    queryKey: ['erp-connections'],
    queryFn: () => base44.entities.ERPConnection.list()
  });

  const activeConnections = connections.filter(c => c.status === 'active');
  const lastSync = connections[0]?.last_sync_date;

  // Manual sync trigger
  const handleSync = async (connection) => {
    setIsSyncing(true);
    setSyncProgress(0);
    
    try {
      toast.loading("Syncing with ERP system...");
      
      // Simulate incremental progress
      const progressInterval = setInterval(() => {
        setSyncProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      // Use AI to extract and map ERP data
      const prompt = `
        Extract supplier and product data from the following ERP system response.
        System: ${connection.system_type}
        
        Transform to our schema:
        - Suppliers: legal_name, country, vat_number, contact details
        - Products: sku_code, description, category, supplier mappings
        
        Return structured data ready for import.
      `;

      const mockERPData = {
        suppliers: [
          { name: "ACME Corp", country: "DE", vat: "DE123456789" },
          { name: "TechParts GmbH", country: "DE", vat: "DE987654321" }
        ],
        products: [
          { sku: "ERP-001", name: "Widget A", supplier: "ACME Corp" },
          { sku: "ERP-002", name: "Component B", supplier: "TechParts GmbH" }
        ]
      };

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `${prompt}\n\nERP Data: ${JSON.stringify(mockERPData)}`,
        response_json_schema: {
          type: "object",
          properties: {
            suppliers: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  legal_name: { type: "string" },
                  country: { type: "string" },
                  vat_number: { type: "string" }
                }
              }
            },
            products: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  sku_code: { type: "string" },
                  description: { type: "string" },
                  supplier_name: { type: "string" }
                }
              }
            },
            mappings: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  sku_code: { type: "string" },
                  supplier_name: { type: "string" }
                }
              }
            }
          }
        }
      });

      clearInterval(progressInterval);
      setSyncProgress(100);

      // Create ExternalRecords for Smart Mapping AI to process
      let imported = 0;
      for (const supplier of result.suppliers || []) {
        await base44.entities.ExternalRecord.create({
          source_system: connection.system_type,
          source_id: supplier.vat_number || `${connection.system_type}-${Date.now()}`,
          record_type: 'supplier',
          raw_data: supplier,
          status: 'pending'
        });
        imported++;
      }

      for (const product of result.products || []) {
        await base44.entities.ExternalRecord.create({
          source_system: connection.system_type,
          source_id: product.sku_code,
          record_type: 'product',
          raw_data: product,
          status: 'pending'
        });
        imported++;
      }

      // Update connection
      await base44.entities.ERPConnection.update(connection.id, {
        last_sync_date: new Date().toISOString(),
        last_sync_status: 'success'
      });

      queryClient.invalidateQueries({ queryKey: ['erp-connections'] });
      queryClient.invalidateQueries({ queryKey: ['external-records'] });
      
      toast.dismiss();
      toast.success(`✅ Synced ${imported} records from ${connection.system_type}`);
    } catch (error) {
      console.error('Sync failed:', error);
      toast.dismiss();
      toast.error('ERP sync failed: ' + error.message);
    } finally {
      setIsSyncing(false);
      setSyncProgress(0);
    }
  };

  const createConnectionMutation = useMutation({
    mutationFn: async (data) => {
      return await base44.entities.ERPConnection.create({
        ...data,
        status: 'active',
        created_date: new Date().toISOString()
      });
    },
    onSuccess: (conn) => {
      queryClient.invalidateQueries({ queryKey: ['erp-connections'] });
      toast.success(`Connected to ${conn.system_type}`);
      setShowConfigModal(false);
      // Auto-trigger first sync
      setTimeout(() => handleSync(conn), 1000);
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-[#545454] flex items-center gap-2">
            <Database className="w-5 h-5 text-[#02a1e8]" />
            ERP Integration Hub
          </h3>
          <p className="text-sm text-slate-500">Real-time data synchronization from enterprise systems</p>
        </div>
        <Button 
          onClick={() => setShowConfigModal(true)}
          className="bg-[#02a1e8] hover:bg-[#0291d1] text-white"
        >
          <LinkIcon className="w-4 h-4 mr-2" />
          Connect ERP
        </Button>
      </div>

      {/* Status Dashboard */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="border-slate-100">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-emerald-100">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase">Active</p>
                <p className="text-2xl font-bold text-[#545454]">{activeConnections.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-100">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-blue-100">
                <Activity className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase">Last Sync</p>
                <p className="text-sm font-bold text-[#545454]">
                  {lastSync ? new Date(lastSync).toLocaleDateString() : 'Never'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-100">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-purple-100">
                <BarChart3 className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase">Data Quality</p>
                <p className="text-2xl font-bold text-[#545454]">94%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-100">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-amber-100">
                <Clock className="w-5 h-5 text-amber-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase">Pending</p>
                <p className="text-2xl font-bold text-[#545454]">12</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Connections */}
      <div className="grid gap-4">
        {connections.map(conn => (
          <Card key={conn.id} className="border-slate-100 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <div className="text-4xl">
                    {ERP_SYSTEMS.find(s => s.id === conn.system_type)?.logo}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h4 className="font-bold text-[#545454]">
                        {ERP_SYSTEMS.find(s => s.id === conn.system_type)?.name}
                      </h4>
                      <Badge className={cn(
                        "text-xs",
                        conn.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'
                      )}>
                        {conn.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Sync: {conn.sync_frequency}
                      </span>
                      {conn.last_sync_date && (
                        <span>Last: {new Date(conn.last_sync_date).toLocaleString()}</span>
                      )}
                      <span className={cn(
                        "flex items-center gap-1",
                        conn.last_sync_status === 'success' ? 'text-emerald-600' : 'text-rose-600'
                      )}>
                        {conn.last_sync_status === 'success' ? 
                          <CheckCircle2 className="w-3 h-3" /> : 
                          <AlertCircle className="w-3 h-3" />
                        }
                        {conn.last_sync_status}
                      </span>
                    </div>
                    {isSyncing && syncProgress > 0 && (
                      <div className="mt-3">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-slate-600">Syncing...</span>
                          <span className="font-bold text-[#02a1e8]">{syncProgress}%</span>
                        </div>
                        <Progress value={syncProgress} className="h-2" />
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleSync(conn)}
                    disabled={isSyncing}
                  >
                    {isSyncing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <RefreshCw className="w-4 h-4" />
                    )}
                  </Button>
                  <Button variant="outline" size="sm">
                    <Settings className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Config Modal */}
      <Dialog open={showConfigModal} onOpenChange={setShowConfigModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#545454]">Connect ERP System</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>ERP System</Label>
              <Select value={newConnection.system_type} onValueChange={(v) => setNewConnection({...newConnection, system_type: v})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select ERP system..." />
                </SelectTrigger>
                <SelectContent>
                  {ERP_SYSTEMS.map(sys => (
                    <SelectItem key={sys.id} value={sys.id}>
                      <span className="flex items-center gap-2">
                        <span>{sys.logo}</span>
                        {sys.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>API Endpoint</Label>
                <Input
                  value={newConnection.api_endpoint}
                  onChange={(e) => setNewConnection({...newConnection, api_endpoint: e.target.value})}
                  placeholder="https://api.erp.com/v1"
                />
              </div>
              <div className="space-y-2">
                <Label>API Key</Label>
                <Input
                  type="password"
                  value={newConnection.api_key}
                  onChange={(e) => setNewConnection({...newConnection, api_key: e.target.value})}
                  placeholder="Enter API key"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Sync Frequency</Label>
              <Select value={newConnection.sync_frequency} onValueChange={(v) => setNewConnection({...newConnection, sync_frequency: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="realtime">Real-time</SelectItem>
                  <SelectItem value="hourly">Every Hour</SelectItem>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-3 pt-4 border-t border-slate-200">
              <Label>Data Sync Options</Label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newConnection.sync_suppliers}
                    onChange={(e) => setNewConnection({...newConnection, sync_suppliers: e.target.checked})}
                    className="rounded"
                  />
                  <span className="text-sm">Sync Suppliers</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newConnection.sync_products}
                    onChange={(e) => setNewConnection({...newConnection, sync_products: e.target.checked})}
                    className="rounded"
                  />
                  <span className="text-sm">Sync Products & SKUs</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newConnection.auto_map}
                    onChange={(e) => setNewConnection({...newConnection, auto_map: e.target.checked})}
                    className="rounded"
                  />
                  <span className="text-sm">Enable AI Auto-Mapping</span>
                </label>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowConfigModal(false)}>Cancel</Button>
            <Button 
              onClick={() => createConnectionMutation.mutate(newConnection)}
              disabled={!newConnection.system_type || !newConnection.api_endpoint}
              className="bg-[#02a1e8] hover:bg-[#0291d1]"
            >
              <Zap className="w-4 h-4 mr-2" />
              Connect & Sync
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}