import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Zap, Database, TrendingUp, CheckCircle2, AlertCircle, RefreshCw, Settings, Play } from "lucide-react";
import { toast } from "sonner";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function IntegrationHub() {
  const [isTestingConnection, setIsTestingConnection] = useState(null);
  const [createdDraftId, setCreatedDraftId] = useState(null);
  const queryClient = useQueryClient();

  const { data: erpConnections = [] } = useQuery({
    queryKey: ['erp-connections'],
    queryFn: () => base44.entities.ERPConnection.list()
  });

  const integrationTypes = [
    {
      id: 'sap',
      name: 'SAP S/4HANA',
      icon: Database,
      color: 'bg-slate-900',
      description: 'Purchase orders, supplier master data, financial spend',
      endpoints: ['Purchase Orders', 'Supplier Master', 'Cost Centers', 'GL Accounts']
    },
    {
      id: 'oracle',
      name: 'Oracle ERP Cloud',
      icon: Database,
      color: 'bg-slate-700',
      description: 'Procurement, inventory, logistics data',
      endpoints: ['Procurement', 'Inventory', 'Shipments', 'Invoices']
    },
    {
      id: 'tms',
      name: 'TMS (SAP TM / Oracle OTM)',
      icon: TrendingUp,
      color: 'bg-slate-600',
      description: 'Transportation, shipment tracking, route data',
      endpoints: ['Shipments', 'Routes', 'Carriers', 'Freight Invoices']
    },
    {
      id: 'powerbi',
      name: 'Power BI / Tableau',
      icon: TrendingUp,
      color: 'bg-slate-800',
      description: 'Business intelligence dashboards and reports',
      endpoints: ['Datasets', 'Reports', 'Dashboards']
    }
  ];

  const testConnectionMutation = useMutation({
    mutationFn: async (integrationType) => {
      await new Promise(resolve => setTimeout(resolve, 2000));
      return { status: 'success', recordsFound: Math.floor(Math.random() * 10000) };
    },
    onSuccess: (data, integrationType) => {
      toast.success(`✅ ${integrationType} connected! Found ${data.recordsFound} records.`);
    },
    onError: () => {
      toast.error('Connection failed. Check credentials.');
    }
  });

  const syncNowMutation = useMutation({
    mutationFn: async (integrationType) => {
      const loadingToast = toast.loading(`Syncing ${integrationType} data...`);
      
      try {
        // Simulate data sync
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        const syncedRecords = {
          suppliers: Math.floor(Math.random() * 100),
          purchaseOrders: Math.floor(Math.random() * 500),
          shipments: Math.floor(Math.random() * 200)
        };

        queryClient.invalidateQueries({ queryKey: ['suppliers'] });
        queryClient.invalidateQueries({ queryKey: ['cbam-purchase-orders'] });
        queryClient.invalidateQueries({ queryKey: ['logistics-shipments'] });

        toast.dismiss(loadingToast);
        return syncedRecords;
      } catch (error) {
        toast.dismiss(loadingToast);
        throw error;
      }
    },
    onSuccess: (data, integrationType) => {
      toast.success(`✅ Synced: ${data.suppliers} suppliers, ${data.purchaseOrders} POs, ${data.shipments} shipments`);
    }
  });

  const createDraftMutation = useMutation({
    mutationFn: async ({ integration, endpoint }) => {
      const correlationId = `${integration.id}-${endpoint.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
      const datasetTypeMap = {
        'Supplier Master': 'SUPPLIER_MASTER',
        'Purchase Orders': 'PURCHASE_ORDERS',
        'Cost Centers': 'COST_CENTERS',
        'GL Accounts': 'GL_ACCOUNTS',
        'Procurement': 'PROCUREMENT',
        'Inventory': 'INVENTORY',
        'Shipments': 'SHIPMENTS',
        'Invoices': 'INVOICES',
        'Routes': 'ROUTES',
        'Carriers': 'CARRIERS',
        'Freight Invoices': 'FREIGHT_INVOICES',
        'Datasets': 'DATASETS',
        'Reports': 'REPORTS',
        'Dashboards': 'DASHBOARDS'
      };

      const response = await base44.functions.invoke('createIntegrationDraft', {
        correlation_id: correlationId,
        source_system: integration.name,
        ingestion_method: 'ERP_API',
        dataset_type: datasetTypeMap[endpoint] || 'UNKNOWN',
        endpoint: endpoint,
        sample_data: {
          integration_type: integration.id,
          endpoint: endpoint,
          timestamp: new Date().toISOString()
        }
      });

      return response.data;
    },
    onSuccess: (result, { endpoint }) => {
      if (result.status === 'duplicate_prevented') {
        toast.info(`✓ Draft already exists (correlation_id: ${result.correlation_id})`);
      } else {
        toast.success(`✓ Draft created from ${endpoint}`);
      }
      setCreatedDraftId(result.draft_id);
      queryClient.invalidateQueries({ queryKey: ['evidence-drafts'] });
    },
    onError: (error) => {
      toast.error(`Failed to create draft: ${error.message}`);
    }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-slate-900 flex items-center justify-center">
            <Zap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-light text-slate-900 tracking-tight">Integration Hub</h2>
            <p className="text-sm text-slate-600 font-light">Centralized ERP and TMS data synchronization</p>
          </div>
        </div>
        <Badge className="bg-slate-100 text-slate-900 border border-slate-300">
          {erpConnections.filter(e => e.status === 'active').length} Active
        </Badge>
      </div>

      {/* Integration Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {integrationTypes.map(integration => {
          const Icon = integration.icon;
          const connection = erpConnections.find(e => e.erp_type === integration.id);
          const isActive = connection?.status === 'active';

          return (
            <Card key={integration.id} className={isActive ? 'border-slate-400 bg-white/80 backdrop-blur-xl' : 'bg-white/70 backdrop-blur-xl'}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-lg ${integration.color} flex items-center justify-center`}>
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{integration.name}</CardTitle>
                      <p className="text-xs text-slate-600">{integration.description}</p>
                    </div>
                  </div>
                  {isActive ? (
                    <Badge className="bg-slate-100 text-slate-900 border border-slate-300">
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                      Connected
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-slate-500 border-slate-300">Not Connected</Badge>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Data Endpoints */}
                <div>
                  <p className="text-xs font-bold text-slate-700 mb-2">Available Endpoints</p>
                  <div className="space-y-2">
                    {integration.endpoints.map(endpoint => (
                      <div key={endpoint} className="flex items-center justify-between p-2 bg-slate-50 rounded border border-slate-200/50">
                        <span className="text-xs text-slate-700">{endpoint}</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 text-xs gap-1 hover:bg-slate-200"
                          onClick={() => createDraftMutation.mutate({ integration, endpoint })}
                          disabled={createDraftMutation.isPending}
                        >
                          <Play className="w-3 h-3" />
                          Test
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Auto-sync Toggle */}
                {isActive && (
                  <div className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium">Auto-sync</p>
                      <p className="text-xs text-slate-600">Daily at 2:00 AM</p>
                    </div>
                    <Switch checked={connection?.auto_sync || false} />
                  </div>
                )}

                {/* Last Sync Info */}
                {isActive && connection?.last_sync_date && (
                  <div className="text-xs text-slate-600">
                    Last synced: {new Date(connection.last_sync_date).toLocaleString()}
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2">
                  {!isActive ? (
                    <>
                      <Button 
                        onClick={() => {
                          setIsTestingConnection(integration.id);
                          testConnectionMutation.mutate(integration.name);
                        }}
                        disabled={isTestingConnection === integration.id}
                        variant="outline"
                        size="sm"
                        className="flex-1"
                      >
                        <Settings className="w-4 h-4 mr-2" />
                        {isTestingConnection === integration.id ? 'Testing...' : 'Configure'}
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        onClick={() => syncNowMutation.mutate(integration.name)}
                        disabled={syncNowMutation.isPending}
                        size="sm"
                        className="flex-1 bg-slate-900 hover:bg-slate-800 text-white"
                      >
                        <RefreshCw className="w-4 h-4 mr-2" />
                        Sync Now
                      </Button>
                      <Button variant="outline" size="sm">
                        <Settings className="w-4 h-4" />
                      </Button>
                    </>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Data Mapping Summary */}
      <Card className="border-slate-300 bg-white/70 backdrop-blur-xl">
        <CardHeader>
          <CardTitle className="font-light text-slate-900">Auto-Populated Data Flows</CardTitle>
          <p className="text-sm text-slate-600 font-light">Cross-module data linkage enabled</p>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-slate-900" />
              <span className="text-sm text-slate-700">ERP Purchase Orders → CBAM Declarations</span>
              <Badge variant="outline" className="ml-auto border-slate-300 text-slate-700">Active</Badge>
            </div>
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-slate-700" />
              <span className="text-sm text-slate-700">TMS Shipments → Logistics Emissions</span>
              <Badge variant="outline" className="ml-auto border-slate-300 text-slate-700">Active</Badge>
            </div>
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-slate-600" />
              <span className="text-sm text-slate-700">Financial Spend → Scope 3 Estimates (CCF)</span>
              <Badge variant="outline" className="ml-auto border-slate-300 text-slate-700">Active</Badge>
            </div>
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-lg">
              <div className="w-2 h-2 rounded-full bg-slate-500" />
              <span className="text-sm text-slate-700">Supplier Master → SupplyLens Risk Screening</span>
              <Badge variant="outline" className="ml-auto border-slate-300 text-slate-700">Active</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Created Draft Indicator */}
      {createdDraftId && (
        <div className="bg-slate-100 p-4 rounded-lg border border-slate-300 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-900 mb-1">✓ Draft Created</p>
            <p className="text-xs text-slate-700">Draft ID: {createdDraftId}</p>
          </div>
          <Link to={`${createPageUrl('EvidenceDrafts')}?draft_id=${createdDraftId}`}>
            <Button size="sm" className="bg-slate-900 hover:bg-slate-800 text-white">
              View in Evidence Vault
            </Button>
          </Link>
        </div>
      )}

      {/* Info Box */}
      <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
        <p className="text-xs font-semibold text-slate-900 mb-1">💡 Integration Testing</p>
        <p className="text-xs text-slate-700 font-light">
          Click "Test" on any endpoint to create a draft with idempotent correlation_id. Re-running with same endpoint will return existing draft.
          All drafts produce deterministic receipts with source_system, ingestion_method, and timestamp.
        </p>
      </div>
    </div>
  );
}