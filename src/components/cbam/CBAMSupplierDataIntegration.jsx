import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Link2, Mail, CheckCircle2, Clock, AlertTriangle, RefreshCw } from "lucide-react";
import { toast } from "sonner";

export default function CBAMSupplierDataIntegration() {
  const [linking, setLinking] = useState(false);
  const queryClient = useQueryClient();

  const { data: entries = [] } = useQuery({
    queryKey: ['cbam-entries'],
    queryFn: () => base44.entities.CBAMEmissionEntry.list()
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list()
  });

  const { data: supplierPCFs = [] } = useQuery({
    queryKey: ['supplier-pcfs'],
    queryFn: () => base44.entities.SupplierPCF.list()
  });

  // Auto-link entries to supplier data
  const autoLinkSupplierData = async () => {
    setLinking(true);
    let linkedCount = 0;

    for (const entry of entries) {
      if (!entry.supplier_id || entry.validation_status === 'validated') continue;

      // Find matching supplier PCF data
      const matchingPCF = supplierPCFs.find(pcf => 
        pcf.supplier_id === entry.supplier_id &&
        pcf.product_cn_code === entry.cn_code
      );

      if (matchingPCF) {
        await base44.entities.CBAMEmissionEntry.update(entry.id, {
          direct_emissions_specific: matchingPCF.direct_emissions_tco2_per_unit,
          indirect_emissions_specific: matchingPCF.indirect_emissions_tco2_per_unit,
          calculation_method: 'actual_values',
          data_quality_rating: 'high',
          validation_status: 'validated'
        });
        linkedCount++;
      }
    }

    setLinking(false);
    toast.success(`Auto-linked ${linkedCount} entries with supplier data`);
    queryClient.invalidateQueries({ queryKey: ['cbam-entries'] });
  };

  // Request data from suppliers
  const requestDataMutation = useMutation({
    mutationFn: async ({ supplier_id, entry_ids }) => {
      const supplier = suppliers.find(s => s.id === supplier_id);
      
      await base44.entities.DataRequest.create({
        request_id: `REQ-${Date.now()}`,
        supplier_id,
        title: 'CBAM Emission Data Request',
        description: `Please provide actual emission data for ${entry_ids.length} import entries`,
        request_type: 'PCF Data',
        status: 'Pending',
        due_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        requested_by: (await base44.auth.me()).email
      });

      // Send email notification
      if (supplier.primary_contact_email) {
        await base44.integrations.Core.SendEmail({
          to: supplier.primary_contact_email,
          subject: 'CBAM Data Request - Emission Information Needed',
          body: `Dear ${supplier.legal_name},

We need actual emission data for imported goods under CBAM regulations.

Number of imports: ${entry_ids.length}
Deadline: ${new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString()}

Please provide:
- Direct emissions (tCO2e per unit)
- Indirect emissions (tCO2e per unit)
- Production route information
- Monitoring plan documentation

Reply to this email or log in to the supplier portal to submit data.

Thank you,
CBAM Compliance Team`
        });
      }

      return { success: true, supplier: supplier.legal_name };
    },
    onSuccess: ({ supplier }) => {
      toast.success(`Data request sent to ${supplier}`);
      queryClient.invalidateQueries({ queryKey: ['data-requests'] });
    }
  });

  // Group entries by supplier
  const entriesBySupplier = entries.reduce((acc, entry) => {
    if (!entry.supplier_id) return acc;
    if (!acc[entry.supplier_id]) {
      const supplier = suppliers.find(s => s.id === entry.supplier_id);
      acc[entry.supplier_id] = {
        supplier,
        entries: [],
        has_data: 0,
        needs_data: 0
      };
    }
    acc[entry.supplier_id].entries.push(entry);
    if (entry.calculation_method === 'actual_values') {
      acc[entry.supplier_id].has_data++;
    } else {
      acc[entry.supplier_id].needs_data++;
    }
    return acc;
  }, {});

  const stats = {
    total_suppliers: Object.keys(entriesBySupplier).length,
    suppliers_with_data: Object.values(entriesBySupplier).filter(s => s.has_data > 0).length,
    entries_with_actual: entries.filter(e => e.calculation_method === 'actual_values').length,
    entries_using_defaults: entries.filter(e => e.calculation_method === 'default_values').length
  };

  return (
    <div className="space-y-5">
      <div className="bg-white/90 backdrop-blur-sm rounded-xl border border-slate-200/60 shadow-[0_4px_16px_rgba(0,0,0,0.08),0_0_0_1px_rgba(255,255,255,0.5)_inset] p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-base font-medium text-slate-900">Supplier Data Integration</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Auto-link emission data from SupplyLens suppliers
            </p>
          </div>
          <Button 
            onClick={autoLinkSupplierData}
            disabled={linking}
            size="sm"
            className="bg-slate-900 hover:bg-slate-800 text-white shadow-sm"
          >
            {linking ? (
              <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Linking...</>
            ) : (
              <><Link2 className="w-4 h-4 mr-2" /> Auto-Link Data</>
            )}
          </Button>
        </div>

        <div className="grid grid-cols-4 gap-3 mb-4">
          <div className="bg-white/80 backdrop-blur-sm rounded-lg border border-slate-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.06)] p-3">
            <div className="text-xs text-slate-600 mb-1">Total Suppliers</div>
            <div className="text-2xl font-light text-slate-900">{stats.total_suppliers}</div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-lg border border-slate-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.06)] p-3">
            <div className="text-xs text-emerald-700 mb-1">With Data</div>
            <div className="text-2xl font-light text-emerald-900">{stats.suppliers_with_data}</div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-lg border border-slate-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.06)] p-3">
            <div className="text-xs text-blue-700 mb-1">Actual Values</div>
            <div className="text-2xl font-light text-blue-900">{stats.entries_with_actual}</div>
          </div>
          <div className="bg-white/80 backdrop-blur-sm rounded-lg border border-slate-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.06)] p-3">
            <div className="text-xs text-amber-700 mb-1">Using Defaults</div>
            <div className="text-2xl font-light text-amber-900">{stats.entries_using_defaults}</div>
          </div>
        </div>

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {Object.values(entriesBySupplier).map(({ supplier, entries, has_data, needs_data }) => (
            <div 
              key={supplier?.id}
              className="bg-white/80 backdrop-blur-sm rounded-lg border border-slate-200/60 shadow-[0_2px_8px_rgba(0,0,0,0.06)] p-3 hover:shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-slate-900">
                      {supplier?.legal_name || 'Unknown Supplier'}
                    </span>
                    {has_data > 0 && (
                      <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Data Available
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-600">
                    <span>{entries.length} imports</span>
                    {has_data > 0 && <span className="text-emerald-600">✓ {has_data} with actual data</span>}
                    {needs_data > 0 && <span className="text-amber-600">⚠ {needs_data} using defaults</span>}
                  </div>
                </div>
                {needs_data > 0 && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="border-slate-200/80 text-slate-700 hover:bg-slate-50"
                    onClick={() => requestDataMutation.mutate({
                      supplier_id: supplier.id,
                      entry_ids: entries.filter(e => e.calculation_method !== 'actual_values').map(e => e.id)
                    })}
                    disabled={requestDataMutation.isPending}
                  >
                    <Mail className="w-3.5 h-3.5 mr-1.5" />
                    Request Data
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}