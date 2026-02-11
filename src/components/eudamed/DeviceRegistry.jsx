import React, { useState } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Plus, Activity, Upload, Search, Shield, CheckCircle2, AlertCircle, Eye, ArrowUp, Database, Edit2, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import DeviceModal from './DeviceModal';
import EUDAMEDBulkImporter from './EUDAMEDBulkImporter';
import SupplyLensSyncPanel from './SupplyLensSyncPanel';
import ValidationEngine from './services/ValidationEngine';
import IngestionPipeline from './services/IngestionPipeline';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export default function DeviceRegistry() {
  const [showModal, setShowModal] = useState(false);
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [bulkImportOpen, setBulkImportOpen] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [expandedValidation, setExpandedValidation] = useState({});
  const queryClient = useQueryClient();

  const { data: deviceModels = [] } = useQuery({
    queryKey: ['device-models'],
    queryFn: () => base44.entities.DeviceModel.list()
  });

  const { data: deviceFamilies = [] } = useQuery({
    queryKey: ['device-families'],
    queryFn: () => base44.entities.DeviceFamily.list()
  });

  const { data: udiRecords = [] } = useQuery({
    queryKey: ['udi-records'],
    queryFn: () => base44.entities.UdiDiRecord.list()
  });

  const { data: validationRuns = [] } = useQuery({
    queryKey: ['validation-runs'],
    queryFn: () => base44.entities.ValidationRun.list()
  });

  const { data: validationIssues = [] } = useQuery({
    queryKey: ['validation-issues'],
    queryFn: () => base44.entities.ValidationIssue.list()
  });

  // Sync SKUs from SupplyLens
  const syncSKUsMutation = useMutation({
    mutationFn: async () => {
      toast.loading('Syncing SKUs from SupplyLens...');
      const skus = await base44.entities.SKU.list();
      const batch = await IngestionPipeline.startIngestionBatch('SUPPLYLENS_SYNC');
      
      // Create default device family if none exists
      let defaultFamily = deviceFamilies[0];
      if (!defaultFamily) {
        const user = await base44.auth.me();
        const operators = await base44.entities.EconomicOperator.list();
        const manufacturer = operators.find(o => o.operator_type === 'manufacturer');
        
        if (!manufacturer) {
          throw new Error('Please register a manufacturer first in Actor Registry');
        }
        
        defaultFamily = await base44.entities.DeviceFamily.create({
          tenant_id: user.tenant_id || 'default',
          family_name: 'General Medical Devices',
          risk_class: 'Class I',
          device_type: 'Medical Device',
          manufacturer_id: manufacturer.id,
          intended_purpose: 'General purpose medical devices',
          status: 'draft'
        });
      }
      
      for (const sku of skus) {
        await IngestionPipeline.ingestSKUAsDeviceModel(sku.id, defaultFamily.id, batch.id);
      }
      
      await IngestionPipeline.completeIngestionBatch(batch.id);
      return batch;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['device-models']);
      toast.dismiss();
      toast.success('SKU sync completed');
    },
    onError: (error) => {
      toast.dismiss();
      toast.error(error.message);
    }
  });

  const promoteMutation = useMutation({
    mutationFn: async ({ id, targetState }) => {
      return await ValidationEngine.promoteEntityState('DeviceModel', id, targetState);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['device-models']);
      queryClient.invalidateQueries(['validation-runs']);
      toast.success('Status updated');
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (deviceId) => {
      await base44.entities.DeviceModel.delete(deviceId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['device-models']);
      toast.success('Device deleted');
      setDeleteConfirm(null);
    },
    onError: (error) => {
      toast.error(`Delete failed: ${error.message}`);
    }
  });

  const handleEdit = (device) => {
    setSelectedDevice(device);
    setShowModal(true);
  };

  const filtered = deviceModels.filter(d => 
    d.model_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    d.commercial_name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getLatestValidation = (modelId) => {
    return validationRuns
      .filter(v => v.entity_id === modelId && v.entity_type === 'DeviceModel')
      .sort((a, b) => new Date(b.executed_at) - new Date(a.executed_at))[0];
  };

  const getValidationIssues = (validationRunId) => {
    return validationIssues.filter(i => i.validation_run_id === validationRunId);
  };

  const toggleValidationExpanded = (deviceId) => {
    setExpandedValidation(prev => ({
      ...prev,
      [deviceId]: !prev[deviceId]
    }));
  };

  const getUDICount = (modelId) => {
    return udiRecords.filter(u => u.device_model_id === modelId).length;
  };

  return (
    <div className="space-y-6">
      {/* SupplyLens Sync Status */}
      <SupplyLensSyncPanel type="devices" />

      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-xl font-bold">Device & UDI Registry</h2>
          <p className="text-sm text-slate-600">UDI/Device module - Models, families, and UDI-DI records</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setBulkImportOpen(true)}>
            <Upload className="w-4 h-4 mr-2" />
            Bulk Import
          </Button>
          <Button variant="outline" onClick={() => syncSKUsMutation.mutate()} disabled={syncSKUsMutation.isPending}>
            <Database className="w-4 h-4 mr-2" />
            {syncSKUsMutation.isPending ? 'Syncing...' : 'Sync SupplyLens'}
          </Button>
          <Button onClick={() => { setSelectedDevice(null); setShowModal(true); }} className="bg-[#86b027] hover:bg-[#769c22]">
            <Plus className="w-4 h-4 mr-2" />
            Register Device
          </Button>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <Input
          placeholder="Search by model name or commercial name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-9"
        />
      </div>

      <div className="grid gap-4">
        {filtered.map(device => {
          const validation = getLatestValidation(device.id);
          const issues = validation ? getValidationIssues(validation.id) : [];
          const isExpanded = expandedValidation[device.id];
          const udiCount = getUDICount(device.id);
          const family = deviceFamilies.find(f => f.id === device.device_family_id);
          
          return (
            <Card key={device.id} className="border-l-4" style={{
              borderLeftColor: device.status === 'exported' ? '#86b027' : 
                              device.status === 'ready' ? '#02a1e8' :
                              device.status === 'validated' ? '#f59e0b' : '#94a3b8'
            }}>
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Activity className="w-6 h-6 text-blue-600" />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <h3 className="font-bold text-lg">{device.commercial_name || device.model_name}</h3>
                        <p className="text-sm text-slate-600">Model: {device.model_name}</p>
                        {family && <p className="text-xs text-slate-500">Family: {family.family_name} ({family.risk_class})</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={
                          device.status === 'exported' ? 'bg-emerald-500' :
                          device.status === 'ready' ? 'bg-blue-500' :
                          device.status === 'validated' ? 'bg-amber-500' : 'bg-slate-500'
                        }>{device.status}</Badge>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={() => handleEdit(device)}
                          className="h-8 w-8"
                        >
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          onClick={() => setDeleteConfirm(device)}
                          className="h-8 w-8 text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs mt-3">
                      <p><strong>Catalog #:</strong> {device.catalog_number || 'N/A'}</p>
                      <p><strong>Version:</strong> {device.version_number || '1.0'}</p>
                      <p><strong>UDI Records:</strong> {udiCount}</p>
                      {device.sterile && <Badge variant="outline" className="text-xs">Sterile</Badge>}
                      {device.single_use && <Badge variant="outline" className="text-xs">Single Use</Badge>}
                    </div>

                    {validation && (
                      <Collapsible open={isExpanded} onOpenChange={() => toggleValidationExpanded(device.id)}>
                        <div className="mt-3">
                          <CollapsibleTrigger className="w-full">
                            <div className="p-3 bg-slate-50 rounded-lg border hover:bg-slate-100 transition-colors cursor-pointer">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  {validation.outcome === 'pass' ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                                  ) : (
                                    <AlertCircle className="w-4 h-4 text-rose-600" />
                                  )}
                                  <span className="text-xs font-medium">Validation: {validation.outcome}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <div className="text-xs text-slate-500">
                                    {validation.critical_issues > 0 && (
                                      <span className="text-rose-600 font-bold">{validation.critical_issues} critical</span>
                                    )}
                                    {validation.warnings > 0 && (
                                      <span className="text-amber-600 ml-2">{validation.warnings} warnings</span>
                                    )}
                                  </div>
                                  {isExpanded ? (
                                    <ChevronUp className="w-4 h-4 text-slate-400" />
                                  ) : (
                                    <ChevronDown className="w-4 h-4 text-slate-400" />
                                  )}
                                </div>
                              </div>
                            </div>
                          </CollapsibleTrigger>
                          
                          <CollapsibleContent>
                            <div className="mt-2 p-3 bg-white rounded-lg border space-y-2">
                              {issues.length === 0 ? (
                                <p className="text-xs text-slate-500">No validation issues</p>
                              ) : (
                                issues.map((issue, idx) => (
                                  <div key={idx} className="p-2 bg-slate-50 rounded border-l-2" style={{
                                    borderLeftColor: issue.severity === 'critical' ? '#ef4444' : 
                                                    issue.severity === 'major' ? '#f59e0b' : '#94a3b8'
                                  }}>
                                    <div className="flex items-start gap-2">
                                      <Badge variant="outline" className={
                                        issue.severity === 'critical' ? 'border-rose-500 text-rose-700' :
                                        issue.severity === 'major' ? 'border-amber-500 text-amber-700' : 'border-slate-400'
                                      }>{issue.severity}</Badge>
                                      <div className="flex-1">
                                        <p className="text-xs font-medium text-slate-900">{issue.message}</p>
                                        <p className="text-xs text-slate-600 mt-1">Field: <code className="bg-white px-1 rounded">{issue.field_path}</code></p>
                                        {issue.suggested_fix && (
                                          <p className="text-xs text-blue-600 mt-1">💡 {issue.suggested_fix}</p>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                ))
                              )}
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    )}

                    <div className="flex gap-2 mt-4">
                      {device.status === 'draft' && (
                        <Button 
                          size="sm"
                          onClick={() => promoteMutation.mutate({ id: device.id, targetState: 'validated' })}
                          className="bg-amber-500 hover:bg-amber-600"
                        >
                          <ArrowUp className="w-3 h-3 mr-1" /> Validate
                        </Button>
                      )}
                      
                      {device.status === 'validated' && (
                        <Button 
                          size="sm"
                          onClick={() => promoteMutation.mutate({ id: device.id, targetState: 'ready' })}
                          className="bg-blue-500 hover:bg-blue-600"
                        >
                          <Shield className="w-3 h-3 mr-1" /> Mark Ready
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}

        {filtered.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <Activity className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No device models found</p>
              <Button onClick={() => setShowModal(true)} className="mt-4 bg-[#86b027]">
                <Plus className="w-4 h-4 mr-2" /> Register First Device
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <DeviceModal 
        open={showModal} 
        onOpenChange={(open) => {
          setShowModal(open);
          if (!open) setSelectedDevice(null);
        }}
        device={selectedDevice}
      />

      <EUDAMEDBulkImporter 
        open={bulkImportOpen} 
        onOpenChange={setBulkImportOpen}
        type="devices"
      />

      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Device Model?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteConfirm?.commercial_name || deleteConfirm?.model_name}</strong>? This will also delete all associated UDI-DI records and provenance data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => deleteMutation.mutate(deleteConfirm.id)}
              className="bg-rose-600 hover:bg-rose-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}