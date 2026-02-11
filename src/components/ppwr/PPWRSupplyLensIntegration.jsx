import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from "sonner";
import { Link2, Package, Building2, FileStack, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";

export default function PPWRSupplyLensIntegration() {
  const [selectedPackaging, setSelectedPackaging] = useState(null);
  const queryClient = useQueryClient();

  const { data: packaging = [] } = useQuery({
    queryKey: ['ppwr-packaging'],
    queryFn: () => base44.entities.PPWRPackaging.list()
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list()
  });

  const { data: skus = [] } = useQuery({
    queryKey: ['skus'],
    queryFn: () => base44.entities.SKU.list()
  });

  const { data: boms = [] } = useQuery({
    queryKey: ['boms'],
    queryFn: () => base44.entities.BOM.list()
  });

  const { data: bomLines = [] } = useQuery({
    queryKey: ['bom-lines'],
    queryFn: () => base44.entities.BOMLine.list()
  });

  // Calculate mapping statistics
  const mappedPackaging = packaging.filter(p => p.supplier_id || p.sku_id);
  const packagingSuppliers = [...new Set(packaging.filter(p => p.supplier_id).map(p => p.supplier_id))];
  
  const linkPackagingMutation = useMutation({
    mutationFn: async ({ packagingId, supplierId, skuId }) => {
      await base44.entities.PPWRPackaging.update(packagingId, {
        supplier_id: supplierId || undefined,
        sku_id: skuId || undefined
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ppwr-packaging'] });
      toast.success('Packaging linked successfully');
    }
  });

  const autoMapPackagingMutation = useMutation({
    mutationFn: async () => {
      const mappings = [];
      
      // Auto-map based on material names and suppliers
      for (const pkg of packaging) {
        // Try to match with suppliers by manufacturer_id
        const matchedSupplier = suppliers.find(s => 
          pkg.manufacturer_id && (
            s.legal_name?.toLowerCase().includes(pkg.manufacturer_id.toLowerCase()) ||
            s.trade_name?.toLowerCase().includes(pkg.manufacturer_id.toLowerCase())
          )
        );

        // Try to match with SKUs by packaging name
        const matchedSKU = skus.find(sku => 
          sku.name?.toLowerCase().includes(pkg.packaging_name?.toLowerCase()) ||
          pkg.packaging_name?.toLowerCase().includes(sku.name?.toLowerCase())
        );

        if (matchedSupplier || matchedSKU) {
          mappings.push({
            packagingId: pkg.id,
            supplierId: matchedSupplier?.id,
            skuId: matchedSKU?.id
          });
        }
      }

      for (const mapping of mappings) {
        await base44.entities.PPWRPackaging.update(mapping.packagingId, {
          supplier_id: mapping.supplierId,
          sku_id: mapping.skuId
        });
      }

      return mappings.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['ppwr-packaging'] });
      toast.success(`${count} packaging items auto-mapped`);
    }
  });

  const syncBOMPackagingMutation = useMutation({
    mutationFn: async () => {
      // Find BOM lines that represent packaging materials
      const packagingBOMLines = bomLines.filter(line => 
        line.part_number?.toLowerCase().includes('packaging') ||
        line.part_number?.toLowerCase().includes('box') ||
        line.part_number?.toLowerCase().includes('bottle') ||
        line.part_number?.toLowerCase().includes('container')
      );

      // Create PPWR packaging entries from BOM lines if not exist
      const created = [];
      for (const bomLine of packagingBOMLines) {
        const exists = packaging.find(p => p.packaging_name === bomLine.part_number);
        
        if (!exists) {
          const newPkg = await base44.entities.PPWRPackaging.create({
            packaging_name: bomLine.part_number,
            material_category: bomLine.material_type || 'Plastic',
            total_weight_kg: bomLine.weight || 0.1,
            compliance_status: 'Unknown'
          });
          created.push(newPkg);
        }
      }

      return created.length;
    },
    onSuccess: (count) => {
      queryClient.invalidateQueries({ queryKey: ['ppwr-packaging'] });
      toast.success(`${count} packaging items synced from BOM`);
    }
  });

  return (
    <div className="space-y-6">
      <Card className="border-[#86b027]/20 bg-gradient-to-br from-[#86b027]/5 to-white">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#86b027]/10">
              <Link2 className="w-6 h-6 text-[#86b027]" />
            </div>
            <div>
              <CardTitle className="text-xl text-slate-900">SupplyLens Integration</CardTitle>
              <p className="text-sm text-slate-600 mt-1">
                Map packaging to suppliers, SKUs, and BOMs for complete traceability
              </p>
            </div>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase font-bold">Total Packaging</p>
                <h3 className="text-3xl font-bold text-slate-900">{packaging.length}</h3>
              </div>
              <Package className="w-10 h-10 text-slate-300" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#86b027]/20 bg-[#86b027]/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#86b027] uppercase font-bold">Mapped</p>
                <h3 className="text-3xl font-bold text-[#86b027]">{mappedPackaging.length}</h3>
                <p className="text-xs text-[#86b027]/70 mt-1">
                  {packaging.length > 0 ? Math.round((mappedPackaging.length / packaging.length) * 100) : 0}%
                </p>
              </div>
              <CheckCircle2 className="w-10 h-10 text-[#86b027]/30" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#02a1e8]/20 bg-[#02a1e8]/5">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#02a1e8] uppercase font-bold">Suppliers</p>
                <h3 className="text-3xl font-bold text-[#02a1e8]">{packagingSuppliers.length}</h3>
              </div>
              <Building2 className="w-10 h-10 text-[#02a1e8]/30" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-purple-700 uppercase font-bold">BOMs</p>
                <h3 className="text-3xl font-bold text-purple-600">{boms.length}</h3>
              </div>
              <FileStack className="w-10 h-10 text-purple-300" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-3">
        <Button
          onClick={() => autoMapPackagingMutation.mutate()}
          disabled={autoMapPackagingMutation.isPending}
          className="bg-[#86b027] hover:bg-[#769c22]"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          Auto-Map Packaging
        </Button>
        <Button
          onClick={() => syncBOMPackagingMutation.mutate()}
          disabled={syncBOMPackagingMutation.isPending}
          variant="outline"
          className="border-[#02a1e8] text-[#02a1e8] hover:bg-[#02a1e8]/10"
        >
          <FileStack className="w-4 h-4 mr-2" />
          Sync from BOMs
        </Button>
      </div>

      <Alert className="border-blue-200 bg-blue-50">
        <Link2 className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-sm text-slate-700">
          <strong>Integration Benefits:</strong> Link packaging to suppliers for EPR compliance tracking, 
          connect to SKUs for product-level sustainability reporting, and sync with BOMs for automated 
          material composition analysis.
        </AlertDescription>
      </Alert>

      <Card>
        <CardHeader>
          <CardTitle>Packaging Mapping</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {packaging.map((pkg) => (
              <div key={pkg.id} className="flex items-center gap-4 p-4 border border-slate-200 rounded-lg">
                <div className="flex-1">
                  <p className="font-semibold text-slate-900">{pkg.packaging_name}</p>
                  <div className="flex items-center gap-4 mt-2">
                    {pkg.supplier_id ? (
                      <Badge className="bg-[#86b027]">
                        <Building2 className="w-3 h-3 mr-1" />
                        {suppliers.find(s => s.id === pkg.supplier_id)?.legal_name || 'Linked'}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-slate-500">No Supplier</Badge>
                    )}
                    {pkg.sku_id ? (
                      <Badge className="bg-[#02a1e8]">
                        <Package className="w-3 h-3 mr-1" />
                        {skus.find(s => s.id === pkg.sku_id)?.name || 'Linked'}
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-slate-500">No SKU</Badge>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Select
                    onValueChange={(value) => {
                      linkPackagingMutation.mutate({
                        packagingId: pkg.id,
                        supplierId: value,
                        skuId: pkg.sku_id
                      });
                    }}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Link Supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map(supplier => (
                        <SelectItem key={supplier.id} value={supplier.id}>
                          {supplier.legal_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select
                    onValueChange={(value) => {
                      linkPackagingMutation.mutate({
                        packagingId: pkg.id,
                        supplierId: pkg.supplier_id,
                        skuId: value
                      });
                    }}
                  >
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Link SKU" />
                    </SelectTrigger>
                    <SelectContent>
                      {skus.map(sku => (
                        <SelectItem key={sku.id} value={sku.id}>
                          {sku.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}