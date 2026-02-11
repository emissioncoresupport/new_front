import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Database, RefreshCw, CheckCircle2, AlertTriangle, ArrowRight, Link as LinkIcon, Unlink } from "lucide-react";
import { toast } from "sonner";
import SupplyLensMappingService from './services/SupplyLensMappingService';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function SupplyLensSyncPanel({ type }) {
  const [syncDetails, setSyncDetails] = useState(null);
  const queryClient = useQueryClient();

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list()
  });

  const { data: skus = [] } = useQuery({
    queryKey: ['skus'],
    queryFn: () => base44.entities.SKU.list()
  });

  const { data: operators = [] } = useQuery({
    queryKey: ['economic-operators'],
    queryFn: () => base44.entities.EconomicOperator.list()
  });

  const { data: deviceModels = [] } = useQuery({
    queryKey: ['device-models'],
    queryFn: () => base44.entities.DeviceModel.list()
  });

  const { data: batches = [] } = useQuery({
    queryKey: ['ingestion-batches'],
    queryFn: () => base44.entities.IngestionBatch.list('-started_at', 10)
  });

  const { data: supplierMaps = [] } = useQuery({
    queryKey: ['supplier-actor-maps'],
    queryFn: () => base44.entities.EUDAMEDSupplierActorMap.list()
  });

  const { data: skuMaps = [] } = useQuery({
    queryKey: ['sku-device-maps'],
    queryFn: () => base44.entities.EUDAMEDSKUDeviceMap.list()
  });

  // Calculate sync status from mapping tables
  const confirmedSuppliers = supplierMaps.filter(m => m.mapping_status === 'confirmed').length;
  const suggestedSuppliers = supplierMaps.filter(m => m.mapping_status === 'suggested').length;

  const confirmedSKUs = skuMaps.filter(m => m.mapping_status === 'confirmed').length;
  const suggestedSKUs = skuMaps.filter(m => m.mapping_status === 'suggested').length;

  const syncMutation = useMutation({
    mutationFn: async () => {
      if (type === 'actors') {
        return await SupplyLensMappingService.syncSuppliers();
      } else {
        return await SupplyLensMappingService.syncSKUs();
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries(['mapping-candidates']);
      queryClient.invalidateQueries(['economic-operators']);
      queryClient.invalidateQueries(['device-models']);
      queryClient.invalidateQueries(['supplylens-mappings']);
      toast.success(`Sync complete: ${result.suggested} suggested, ${result.confirmed} confirmed`);
    },
    onError: (error) => {
      toast.error(error.message);
    }
  });

  const lastSync = batches.find(b => b.source_type === 'SUPPLYLENS_SYNC');

  return (
    <>
      <Card className="border-l-4 border-l-[#86b027]">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Database className="w-5 h-5 text-[#86b027]" />
            SupplyLens Integration Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div className="p-3 bg-white rounded-lg border-2 border-[#86b027]/20">
              <div className="flex items-center gap-2 mb-1">
                <LinkIcon className="w-4 h-4 text-[#86b027]" />
                <span className="text-xs font-medium text-slate-600">
                  {type === 'actors' ? 'Suppliers → Actors' : 'SKUs → Devices'}
                </span>
              </div>
              <p className="text-3xl font-bold text-[#86b027]">
                {type === 'actors' ? confirmedSuppliers : confirmedSKUs}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                confirmed mappings
              </p>
            </div>

            <div className="p-3 bg-amber-50 rounded-lg border-2 border-amber-300">
              <div className="flex items-center gap-2 mb-1">
                <Unlink className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-medium text-amber-700">Unmapped</span>
              </div>
              <p className="text-3xl font-bold text-amber-600">
                {type === 'actors' ? suggestedSuppliers : suggestedSKUs}
              </p>
              <p className="text-xs text-amber-700 mt-1">
                pending review
              </p>
            </div>

            {lastSync && (
              <div className={`p-3 rounded-lg border-2 ${
                lastSync.status === 'completed' ? 'bg-emerald-50 border-emerald-300' :
                lastSync.status === 'failed' ? 'bg-rose-50 border-rose-300' : 'bg-blue-50 border-blue-300'
              }`}>
                <div className="flex items-center gap-2 mb-1">
                  <RefreshCw className="w-4 h-4 text-slate-600" />
                  <span className="text-xs font-medium text-slate-600">Last Sync</span>
                </div>
                <p className="text-sm font-bold text-slate-900">
                  {new Date(lastSync.started_at).toLocaleDateString()}
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  {new Date(lastSync.started_at).toLocaleTimeString()}
                </p>
                <Badge className={`mt-2 ${
                  lastSync.status === 'completed' ? 'bg-emerald-500' :
                  lastSync.status === 'partial' ? 'bg-amber-500' :
                  lastSync.status === 'failed' ? 'bg-rose-500' : 'bg-slate-500'
                }`}>
                  {lastSync.status}
                </Badge>
              </div>
            )}
          </div>

          <Button 
            onClick={() => syncMutation.mutate()}
            disabled={syncMutation.isPending}
            className="w-full bg-[#02a1e8] hover:bg-[#0291d1]"
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${syncMutation.isPending ? 'animate-spin' : ''}`} />
            {syncMutation.isPending ? 'Syncing...' : 'Run Sync'}
          </Button>

          {((type === 'actors' && suggestedSuppliers > 0) || (type === 'devices' && suggestedSKUs > 0)) && (
            <div className="p-3 bg-amber-50 rounded-lg border-l-4 border-amber-500">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5" />
                <div className="text-xs text-amber-800">
                  <p className="font-semibold">Review Required</p>
                  <p className="mt-1">
                    {type === 'actors' 
                      ? `${suggestedSuppliers} suppliers detected - review and approve mappings`
                      : `${suggestedSKUs} SKUs detected - review and approve mappings`
                    }
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>


    </>
  );
}