import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Link as LinkIcon, RefreshCw, CheckCircle2, AlertCircle, 
  ArrowRight, Building2, Package, Loader2, Sparkles 
} from "lucide-react";
import { toast } from "sonner";
import eventBus, { CBAM_EVENTS } from './services/CBAMEventBus';

/**
 * CBAM ↔ SupplyLens Connector
 * Automatically links suppliers and SKUs from SupplyLens to CBAM entries
 * Enables emission data inheritance and supplier onboarding workflow
 */

export default function CBAMSupplyLensConnector() {
  const queryClient = useQueryClient();
  const [isLinking, setIsLinking] = useState(false);

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list()
  });

  const { data: skus = [] } = useQuery({
    queryKey: ['skus'],
    queryFn: () => base44.entities.SKU.list()
  });

  const { data: cbamEntries = [] } = useQuery({
    queryKey: ['cbam-emission-entries'],
    queryFn: () => base44.entities.CBAMEmissionEntry.list()
  });

  const { data: supplierPCFs = [] } = useQuery({
    queryKey: ['supplier-pcfs'],
    queryFn: () => base44.entities.SupplierPCF.list()
  });

  const { data: supplierMappings = [] } = useQuery({
    queryKey: ['supplier-sku-mappings'],
    queryFn: () => base44.entities.SupplierSKUMapping.list()
  });

  // Calculate linkage statistics
  const stats = {
    totalEntries: cbamEntries.length,
    linkedToSupplier: cbamEntries.filter(e => e.supplier_id).length,
    linkedToSKU: cbamEntries.filter(e => e.sku_id).length,
    hasVerifiedData: cbamEntries.filter(e => 
      e.calculation_method === 'EU_method' && e.supplier_id
    ).length,
    unmappedSuppliers: suppliers.filter(s => 
      s.cbam_relevant && !cbamEntries.some(e => e.supplier_id === s.id)
    ).length
  };

  // Auto-link CBAM entries to SupplyLens data
  const autoLinkMutation = useMutation({
    mutationFn: async () => {
      const results = {
        linked: 0,
        updated: 0,
        skipped: 0,
        errors: []
      };

      for (const entry of cbamEntries) {
        // Skip if already linked
        if (entry.supplier_id && entry.sku_id) {
          results.skipped++;
          continue;
        }

        try {
          // Match by CN code + country
          let matchedSupplier = suppliers.find(s => 
            s.country_of_origin === entry.country_of_origin &&
            s.cbam_relevant === true
          );

          // Match SKU by CN code
          const matchedSKU = skus.find(sk => 
            sk.sku_code === entry.cn_code || 
            sk.cn_code === entry.cn_code
          );

          // If supplier found, check for verified emission data
          if (matchedSupplier) {
            const supplierPCF = supplierPCFs.find(p => 
              p.supplier_id === matchedSupplier.id &&
              p.cn_code === entry.cn_code &&
              p.verification_status === 'verified'
            );

            const updates = {
              supplier_id: matchedSupplier.id,
              supplier_name: matchedSupplier.legal_name || matchedSupplier.trade_name
            };

            if (matchedSKU) {
              updates.sku_id = matchedSKU.id;
              updates.product_name = updates.product_name || matchedSKU.name;
            }

            // Import verified emissions if available
            if (supplierPCF && entry.calculation_method !== 'EU_method') {
              updates.direct_emissions_specific = supplierPCF.direct_emissions;
              updates.indirect_emissions_specific = supplierPCF.indirect_emissions || 0;
              updates.calculation_method = 'EU_method';
              updates.data_source = 'SupplyLens_PCF';
              results.updated++;
            }

            await base44.entities.CBAMEmissionEntry.update(entry.id, updates);
            results.linked++;

            // Emit event
            eventBus.emit(CBAM_EVENTS.ENTRY_UPDATED, { 
              entryId: entry.id, 
              updates,
              source: 'SupplyLens_Sync'
            });
          }
        } catch (error) {
          results.errors.push({
            entry_id: entry.id,
            error: error.message
          });
        }
      }

      return results;
    },
    onSuccess: (results) => {
      queryClient.invalidateQueries({ queryKey: ['cbam-emission-entries'] });
      toast.success(`✓ SupplyLens Sync Complete`, {
        description: `${results.linked} entries linked • ${results.updated} with verified data`
      });
    },
    onError: () => {
      toast.error('Auto-linking failed');
    }
  });

  // Sync specific entry
  const syncEntry = async (entry) => {
    const matchedSupplier = suppliers.find(s => 
      s.country_of_origin === entry.country_of_origin &&
      s.cbam_relevant === true
    );

    if (!matchedSupplier) {
      toast.warning('No matching supplier found in SupplyLens');
      return;
    }

    const supplierPCF = supplierPCFs.find(p => 
      p.supplier_id === matchedSupplier.id &&
      p.cn_code === entry.cn_code &&
      p.verification_status === 'verified'
    );

    const updates = {
      supplier_id: matchedSupplier.id,
      supplier_name: matchedSupplier.legal_name
    };

    if (supplierPCF) {
      updates.direct_emissions_specific = supplierPCF.direct_emissions;
      updates.indirect_emissions_specific = supplierPCF.indirect_emissions || 0;
      updates.calculation_method = 'EU_method';
    }

    await base44.entities.CBAMEmissionEntry.update(entry.id, updates);
    queryClient.invalidateQueries({ queryKey: ['cbam-emission-entries'] });
    
    toast.success(`Linked to ${matchedSupplier.legal_name}`);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <LinkIcon className="w-5 h-5 text-[#86b027]" />
                SupplyLens Integration
              </CardTitle>
              <CardDescription>
                Auto-link CBAM entries with supplier emission data from SupplyLens
              </CardDescription>
            </div>
            <Button
              onClick={() => autoLinkMutation.mutate()}
              disabled={autoLinkMutation.isPending || stats.totalEntries === 0}
              className="bg-[#86b027] hover:bg-[#769c22] text-white"
            >
              {autoLinkMutation.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Auto-Link All
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Statistics */}
          <div className="grid grid-cols-4 gap-4">
            <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
              <div className="text-xs text-slate-500 uppercase mb-1">Total Entries</div>
              <div className="text-2xl font-bold text-slate-900">{stats.totalEntries}</div>
            </div>
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-xs text-green-700 uppercase mb-1">Linked Suppliers</div>
              <div className="text-2xl font-bold text-green-700">{stats.linkedToSupplier}</div>
              <div className="text-xs text-slate-500">{((stats.linkedToSupplier / stats.totalEntries) * 100).toFixed(0)}%</div>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-xs text-blue-700 uppercase mb-1">Verified Data</div>
              <div className="text-2xl font-bold text-blue-700">{stats.hasVerifiedData}</div>
              <div className="text-xs text-slate-500">EU Method</div>
            </div>
            <div className="p-4 bg-amber-50 rounded-lg border border-amber-200">
              <div className="text-xs text-amber-700 uppercase mb-1">Unmapped</div>
              <div className="text-2xl font-bold text-amber-700">{stats.unmappedSuppliers}</div>
              <div className="text-xs text-slate-500">suppliers</div>
            </div>
          </div>

          {/* Linking Status */}
          {stats.totalEntries > 0 && stats.linkedToSupplier === 0 && (
            <Alert className="border-amber-200 bg-amber-50">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <AlertDescription className="text-sm">
                <strong>No CBAM entries linked to SupplyLens suppliers yet.</strong> Run auto-link to match suppliers by country and import verified emission data.
              </AlertDescription>
            </Alert>
          )}

          {stats.linkedToSupplier > 0 && stats.hasVerifiedData < stats.linkedToSupplier && (
            <Alert className="border-blue-200 bg-blue-50">
              <AlertCircle className="w-4 h-4 text-blue-600" />
              <AlertDescription className="text-sm">
                <strong>{stats.linkedToSupplier - stats.hasVerifiedData} suppliers linked without verified emission data.</strong> Request PCF data from these suppliers in SupplyLens.
              </AlertDescription>
            </Alert>
          )}

          {/* Unlinked Entries Preview */}
          <div>
            <h4 className="font-semibold text-slate-900 mb-3">Unlinked CBAM Entries</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {cbamEntries.filter(e => !e.supplier_id).slice(0, 5).map(entry => (
                <div key={entry.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-slate-900">{entry.product_name}</div>
                    <div className="text-xs text-slate-500">{entry.cn_code} • {entry.country_of_origin}</div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => syncEntry(entry)}
                    className="ml-3"
                  >
                    <LinkIcon className="w-3 h-3 mr-1" />
                    Link Now
                  </Button>
                </div>
              ))}
            </div>
          </div>

          {/* SupplyLens Suppliers with CBAM Data */}
          <div>
            <h4 className="font-semibold text-slate-900 mb-3">SupplyLens Suppliers (CBAM-Relevant)</h4>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {suppliers.filter(s => s.cbam_relevant).slice(0, 5).map(supplier => {
                const hasPCF = supplierPCFs.some(p => 
                  p.supplier_id === supplier.id && 
                  p.verification_status === 'verified'
                );
                const linkedEntries = cbamEntries.filter(e => e.supplier_id === supplier.id);

                return (
                  <div key={supplier.id} className="flex items-center justify-between p-3 bg-white border border-slate-200 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <div className="font-medium text-slate-900">{supplier.legal_name || supplier.trade_name}</div>
                        {hasPCF && <CheckCircle2 className="w-4 h-4 text-green-600" />}
                      </div>
                      <div className="text-xs text-slate-500">{supplier.country_of_origin} • {linkedEntries.length} linked entries</div>
                    </div>
                    {!hasPCF && (
                      <Badge variant="outline" className="text-amber-600 border-amber-300">
                        No PCF Data
                      </Badge>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-slate-200">
            <Button
              variant="outline"
              onClick={() => {
                queryClient.invalidateQueries({ queryKey: ['suppliers'] });
                queryClient.invalidateQueries({ queryKey: ['cbam-emission-entries'] });
                toast.success('Data refreshed');
              }}
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Refresh Data
            </Button>
            <Button
              variant="outline"
              onClick={() => window.location.href = '/SupplyLens'}
            >
              <Building2 className="w-4 h-4 mr-2" />
              Open SupplyLens
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}