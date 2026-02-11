/**
 * ERP Universal Connector
 * Single integration point for SAP, Oracle, Dynamics, NetSuite, Odoo
 * Drag-and-drop component for triggering scheduled ERP data ingestion
 */

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { 
    Database, Plus, Play, Settings, RefreshCw, CheckCircle2, 
    AlertCircle, Clock, TrendingUp, Package, Building2, Layers, Zap
} from "lucide-react";
import { toast } from "sonner";
import DataIngestionPipeline from '../services/DataIngestionPipeline';

const ERP_SYSTEMS = [
    { value: 'SAP', label: 'SAP ERP / S/4HANA', endpoints: { suppliers: '/api/suppliers', materials: '/api/materials', bom: '/api/bom', purchase_orders: '/api/purchase_orders' } },
    { value: 'Oracle', label: 'Oracle ERP Cloud', endpoints: { suppliers: '/fscmRestApi/resources/suppliers', materials: '/fscmRestApi/resources/items' } },
    { value: 'Microsoft Dynamics', label: 'Microsoft Dynamics 365', endpoints: { suppliers: '/api/data/v9.2/accounts', materials: '/api/data/v9.2/products' } },
    { value: 'NetSuite', label: 'NetSuite ERP', endpoints: { suppliers: '/vendor', materials: '/inventoryitem' } },
    { value: 'Odoo', label: 'Odoo', endpoints: { suppliers: '/api/v1/partner', materials: '/api/v1/product.product' } },
    { value: 'Custom', label: 'Custom / Other', endpoints: {} }
];

export default function ERPUniversalConnector() {
    const queryClient = useQueryClient();
    const [showConfigModal, setShowConfigModal] = useState(false);
    const [editingConnection, setEditingConnection] = useState(null);
    const [newConnection, setNewConnection] = useState({
        system_type: '',
        connection_name: '',
        api_endpoint: '',
        api_key: '',
        sync_frequency: 'daily',
        status: 'active',
        config_json: {}
    });
    const [selectedEntityTypes, setSelectedEntityTypes] = useState(['suppliers', 'materials']);
    const [autoResolveConflicts, setAutoResolveConflicts] = useState(false);

    const { data: connections = [] } = useQuery({
        queryKey: ['erp-connections'],
        queryFn: () => base44.entities.ERPConnection.list()
    });

    const { data: syncRuns = [] } = useQuery({
        queryKey: ['erp-sync-runs'],
        queryFn: () => base44.entities.ERPSyncRun.list('-started_at', 10)
    });

    const createConnectionMutation = useMutation({
        mutationFn: (data) => base44.entities.ERPConnection.create(data),
        onSuccess: () => {
            queryClient.invalidateQueries(['erp-connections']);
            setShowConfigModal(false);
            resetForm();
            toast.success('ERP connection configured');
        }
    });

    const runIngestionMutation = useMutation({
        mutationFn: async ({ connectionId, entityTypes, autoResolve }) => {
            // Create sync run record
            const syncRun = await base44.entities.ERPSyncRun.create({
                erp_connection_id: connectionId,
                sync_status: 'running',
                started_at: new Date().toISOString(),
                entity_types: entityTypes
            });

            // Trigger backend ingestion via unified pipeline
            const result = await DataIngestionPipeline.ingestFromERP(
                connectionId,
                entityTypes,
                autoResolve
            );

            // Update sync run with results
            await base44.entities.ERPSyncRun.update(syncRun.id, {
                sync_status: result ? 'completed' : 'failed',
                completed_at: new Date().toISOString(),
                records_processed: result?.results ? Object.values(result.results).reduce((sum, r) => sum + r.total, 0) : 0,
                records_created: result?.results ? Object.values(result.results).reduce((sum, r) => sum + r.created, 0) : 0,
                records_updated: result?.results ? Object.values(result.results).reduce((sum, r) => sum + r.updated, 0) : 0,
                errors_count: result?.results ? Object.values(result.results).reduce((sum, r) => sum + r.errors, 0) : 0,
                log_json: JSON.stringify(result)
            });

            return result;
        },
        onSuccess: () => {
            queryClient.invalidateQueries(['erp-sync-runs']);
            queryClient.invalidateQueries(['suppliers']);
            queryClient.invalidateQueries(['skus']);
        }
    });

    const resetForm = () => {
        setNewConnection({
            system_type: '',
            connection_name: '',
            api_endpoint: '',
            api_key: '',
            sync_frequency: 'daily',
            status: 'active',
            config_json: {}
        });
        setEditingConnection(null);
    };

    const handleSystemTypeChange = (systemType) => {
        const system = ERP_SYSTEMS.find(s => s.value === systemType);
        setNewConnection({
            ...newConnection,
            system_type: systemType,
            config_json: { endpoints: system?.endpoints || {} }
        });
    };

    return (
        <div className="space-y-6 h-full overflow-y-auto p-6">
            {/* Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                <div>
                    <h2 className="text-2xl font-light tracking-tight text-slate-900">ERP Configuration</h2>
                    <p className="text-sm text-slate-500 font-light mt-1">Configure your ERP connection and sync settings</p>
                </div>
            </div>

            {/* Configuration Form - Always Visible */}
            <div className="space-y-6 bg-white/60 backdrop-blur-xl rounded-xl border border-slate-200 p-6">
                <div className="space-y-4">
                    <div className="space-y-2">
                        <Label className="text-xs font-light text-slate-700 uppercase tracking-wider">ERP System</Label>
                        <Select value={newConnection.system_type} onValueChange={handleSystemTypeChange}>
                            <SelectTrigger className="w-full">
                                <SelectValue placeholder="Select your ERP system..." />
                            </SelectTrigger>
                            <SelectContent position="popper" sideOffset={5} className="z-[100000]">
                                {ERP_SYSTEMS.map(sys => (
                                    <SelectItem key={sys.value} value={sys.value}>{sys.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs font-light text-slate-700 uppercase tracking-wider">Connection Name</Label>
                        <Input 
                            placeholder="e.g. Production SAP Instance"
                            value={newConnection.connection_name}
                            onChange={(e) => setNewConnection({...newConnection, connection_name: e.target.value})}
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-xs font-light text-slate-700 uppercase tracking-wider">API Endpoint</Label>
                            <Input 
                                placeholder="https://api.erp.com"
                                value={newConnection.api_endpoint}
                                onChange={(e) => setNewConnection({...newConnection, api_endpoint: e.target.value})}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label className="text-xs font-light text-slate-700 uppercase tracking-wider">API Key / Token</Label>
                            <Input 
                                type="password"
                                placeholder="••••••••••••"
                                value={newConnection.api_key}
                                onChange={(e) => setNewConnection({...newConnection, api_key: e.target.value})}
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label className="text-xs font-light text-slate-700 uppercase tracking-wider">Sync Frequency</Label>
                        <Select value={newConnection.sync_frequency} onValueChange={(v) => setNewConnection({...newConnection, sync_frequency: v})}>
                            <SelectTrigger className="w-full">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent position="popper" sideOffset={5} className="z-[100000]">
                                <SelectItem value="manual">Manual Only</SelectItem>
                                <SelectItem value="hourly">Every Hour</SelectItem>
                                <SelectItem value="daily">Daily (Recommended)</SelectItem>
                                <SelectItem value="weekly">Weekly</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="space-y-3">
                        <Label className="text-xs font-light text-slate-700 uppercase tracking-wider">Data to Sync</Label>
                        <div className="grid grid-cols-2 gap-2">
                            {['suppliers', 'materials', 'bom', 'purchase_orders'].map(type => (
                                <div key={type} className="flex items-center gap-2 p-3 rounded-lg bg-white/40 backdrop-blur-sm border border-slate-200">
                                    <Checkbox 
                                        checked={selectedEntityTypes.includes(type)}
                                        onCheckedChange={(checked) => {
                                            setSelectedEntityTypes(checked 
                                                ? [...selectedEntityTypes, type]
                                                : selectedEntityTypes.filter(t => t !== type)
                                            );
                                        }}
                                    />
                                    <Label className="text-sm font-light capitalize cursor-pointer">{type.replace('_', ' ')}</Label>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center justify-between p-4 rounded-xl bg-amber-50/40 backdrop-blur-sm border border-amber-200/40">
                        <div className="flex-1">
                            <Label className="text-sm font-light text-slate-900">Auto-Resolve Conflicts</Label>
                            <p className="text-xs text-slate-600 font-light mt-0.5">Automatically merge duplicate records using AI</p>
                        </div>
                        <Switch 
                            checked={autoResolveConflicts}
                            onCheckedChange={setAutoResolveConflicts}
                        />
                    </div>

                    <Button 
                        onClick={() => createConnectionMutation.mutate(newConnection)}
                        disabled={!newConnection.system_type || !newConnection.connection_name || !newConnection.api_endpoint}
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white rounded-xl shadow-sm font-light h-11"
                    >
                        <Zap className="w-4 h-4 mr-2" /> Create Connection
                    </Button>
                </div>
            </div>



            {/* Recent Sync Runs */}
            {syncRuns.length > 0 && (
                <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-br from-slate-50/30 via-transparent to-transparent pointer-events-none"></div>
                    <div className="relative p-6">
                        <h3 className="text-lg font-light text-slate-900 mb-4">Recent Sync Activity</h3>
                        <div className="space-y-2">
                            {syncRuns.map(run => {
                                const conn = connections.find(c => c.id === run.erp_connection_id);
                                return (
                                    <div key={run.id} className="flex items-center justify-between p-4 bg-white/30 backdrop-blur-sm rounded-lg border border-white/40">
                                        <div className="flex items-center gap-3">
                                            {run.sync_status === 'completed' ? (
                                                <CheckCircle2 className="w-5 h-5 text-[#86b027]" />
                                            ) : run.sync_status === 'failed' ? (
                                                <AlertCircle className="w-5 h-5 text-red-500" />
                                            ) : (
                                                <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
                                            )}
                                            <div>
                                                <p className="text-sm font-light text-slate-900">{conn?.connection_name || 'Unknown'}</p>
                                                <p className="text-xs text-slate-500 font-light">
                                                    {run.records_created} created, {run.records_updated} updated
                                                    {run.errors_count > 0 && `, ${run.errors_count} errors`}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <Badge variant="outline" className="text-[10px] font-light border-slate-200/60 bg-white/40 capitalize">
                                                {run.sync_status}
                                            </Badge>
                                            <p className="text-xs text-slate-400 font-light mt-1">
                                                {new Date(run.started_at).toLocaleTimeString()}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}


        </div>
    );
}