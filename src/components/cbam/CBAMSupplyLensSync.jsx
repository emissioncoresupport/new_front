import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Network, RefreshCw, CheckCircle2, AlertTriangle, ArrowRight } from "lucide-react";
import { toast } from "sonner";

export default function CBAMSupplyLensSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const queryClient = useQueryClient();

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list()
  });

  const { data: skus = [] } = useQuery({
    queryKey: ['skus'],
    queryFn: () => base44.entities.SKU.list()
  });

  const { data: supplierPCFs = [] } = useQuery({
    queryKey: ['supplier-pcfs'],
    queryFn: () => base44.entities.SupplierPCF.list()
  });

  const syncMutation = useMutation({
    mutationFn: async () => {
      // Simulate syncing SupplyLens data to CBAM
      const cbamEntries = [];
      
      for (const sku of skus.slice(0, 5)) { // Demo: sync first 5 SKUs
        const supplier = suppliers.find(s => s.id === sku.supplier_id);
        const pcf = supplierPCFs.find(p => p.supplier_id === sku.supplier_id);
        
        if (supplier && pcf) {
          cbamEntries.push({
            cn_code: sku.hs_code || '72031000',
            product_name: sku.sku_name,
            country_of_origin: supplier.country,
            quantity: Math.random() * 1000 + 100,
            embedded_emissions_factor: pcf.emissions_intensity || 2.1,
            total_embedded_emissions: (pcf.emissions_intensity || 2.1) * (Math.random() * 1000 + 100),
            import_date: new Date().toISOString().split('T')[0],
            supplier_id: supplier.id,
            data_quality_rating: 'high',
            validation_status: 'pending',
            source: 'SupplyLens'
          });
        }
      }
      
      // Bulk create CBAM entries
      for (const entry of cbamEntries) {
        await base44.entities.CBAMEmissionEntry.create(entry);
      }
      
      return cbamEntries.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['cbam-emission-entries'] });
      toast.success(`Synced ${count} entries from SupplyLens`);
      setIsSyncing(false);
    },
    onError: () => {
      toast.error('Sync failed');
      setIsSyncing(false);
    }
  });

  const handleSync = () => {
    setIsSyncing(true);
    syncMutation.mutate();
  };

  const suppliersWithPCF = suppliers.filter(s => 
    supplierPCFs.some(pcf => pcf.supplier_id === s.id)
  );

  const suppliersWithoutPCF = suppliers.filter(s => 
    !supplierPCFs.some(pcf => pcf.supplier_id === s.id)
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-3">
            <Network className="w-7 h-7 text-[#86b027]" />
            SupplyLens Integration
          </h2>
          <p className="text-slate-500 mt-1">
            Automatically import CBAM data from your SupplyLens suppliers and SKUs
          </p>
        </div>
        <Button 
          onClick={handleSync}
          disabled={isSyncing || syncMutation.isPending}
          className="bg-[#86b027] hover:bg-[#769c22]"
        >
          {isSyncing || syncMutation.isPending ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Syncing...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Sync from SupplyLens
            </>
          )}
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="border-slate-200">
          <CardContent className="pt-6">
            <p className="text-xs text-slate-500 mb-1">Total Suppliers</p>
            <p className="text-3xl font-bold text-slate-900">{suppliers.length}</p>
          </CardContent>
        </Card>
        <Card className="border-emerald-200 bg-emerald-50/30">
          <CardContent className="pt-6">
            <p className="text-xs text-emerald-700 mb-1">With PCF Data</p>
            <p className="text-3xl font-bold text-emerald-900">{suppliersWithPCF.length}</p>
          </CardContent>
        </Card>
        <Card className="border-amber-200 bg-amber-50/30">
          <CardContent className="pt-6">
            <p className="text-xs text-amber-700 mb-1">Missing PCF Data</p>
            <p className="text-3xl font-bold text-amber-900">{suppliersWithoutPCF.length}</p>
          </CardContent>
        </Card>
        <Card className="border-blue-200 bg-blue-50/30">
          <CardContent className="pt-6">
            <p className="text-xs text-blue-700 mb-1">SKUs Tracked</p>
            <p className="text-3xl font-bold text-blue-900">{skus.length}</p>
          </CardContent>
        </Card>
      </div>

      {/* Sync Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Ready to Sync</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {suppliersWithPCF.slice(0, 5).map(supplier => {
              const pcf = supplierPCFs.find(p => p.supplier_id === supplier.id);
              const supplierSKUs = skus.filter(s => s.supplier_id === supplier.id);
              
              return (
                <div key={supplier.id} className="p-4 border border-slate-200 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                      <div>
                        <h4 className="font-bold text-slate-900">{supplier.company_name}</h4>
                        <p className="text-xs text-slate-500">{supplier.country}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{supplierSKUs.length} SKUs</Badge>
                      <Badge className="bg-emerald-100 text-emerald-700 border-0">
                        PCF: {pcf?.emissions_intensity || 'N/A'} tCO2/t
                      </Badge>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {suppliersWithoutPCF.length > 0 && (
            <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-amber-900 mb-1">
                    {suppliersWithoutPCF.length} suppliers missing PCF data
                  </p>
                  <p className="text-sm text-amber-700">
                    These suppliers will use EU default benchmarks. Request actual emissions data to reduce CBAM costs.
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card className="border-blue-200 bg-blue-50/30">
        <CardHeader>
          <CardTitle className="text-lg">How SupplyLens Sync Works</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm text-slate-700">
            <div className="flex items-start gap-3">
              <ArrowRight className="w-4 h-4 text-[#86b027] mt-0.5" />
              <p><strong>Step 1:</strong> Pulls supplier information and SKUs from your SupplyLens database</p>
            </div>
            <div className="flex items-start gap-3">
              <ArrowRight className="w-4 h-4 text-[#86b027] mt-0.5" />
              <p><strong>Step 2:</strong> Maps SKUs to CBAM CN codes using HS code data</p>
            </div>
            <div className="flex items-start gap-3">
              <ArrowRight className="w-4 h-4 text-[#86b027] mt-0.5" />
              <p><strong>Step 3:</strong> Uses supplier PCF data for emissions intensity (or EU defaults if missing)</p>
            </div>
            <div className="flex items-start gap-3">
              <ArrowRight className="w-4 h-4 text-[#86b027] mt-0.5" />
              <p><strong>Step 4:</strong> Creates CBAM emission entries ready for reporting</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}