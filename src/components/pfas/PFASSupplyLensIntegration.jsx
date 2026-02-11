import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Link2, Play, CheckCircle2, AlertCircle, Loader2, RefreshCw } from "lucide-react";
import PFASAutomationService from './services/PFASAutomationService';
import { toast } from 'sonner';

export default function PFASSupplyLensIntegration() {
  const [scanning, setScanning] = useState(false);
  const queryClient = useQueryClient();

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list()
  });

  const { data: products = [] } = useQuery({
    queryKey: ['products'],
    queryFn: () => base44.entities.Product.list()
  });

  const { data: packaging = [] } = useQuery({
    queryKey: ['ppwr-packaging'],
    queryFn: () => base44.entities.PPWRPackaging.list()
  });

  const { data: assessments = [] } = useQuery({
    queryKey: ['pfas-assessments'],
    queryFn: () => base44.entities.PFASAssessment.list()
  });

  const scanAllMutation = useMutation({
    mutationFn: async () => {
      setScanning(true);
      const results = {
        suppliers: 0,
        products: 0,
        packaging: 0
      };

      // Scan all suppliers
      for (const supplier of suppliers) {
        const existing = assessments.find(a => a.entity_id === supplier.id && a.entity_type === 'Supplier');
        if (!existing) {
          await PFASAutomationService.autoScanSupplier(supplier.id);
          results.suppliers++;
        }
      }

      // Scan all products
      for (const product of products) {
        const existing = assessments.find(a => a.entity_id === product.id && a.entity_type === 'Product');
        if (!existing) {
          await PFASAutomationService.autoScanProduct(product.id);
          results.products++;
        }
      }

      // Scan all PPWR packaging
      for (const pkg of packaging) {
        const existing = assessments.find(a => a.entity_id === pkg.id && a.entity_type === 'PPWRPackaging');
        if (!existing) {
          await PFASAutomationService.autoScanPPWRPackaging(pkg.id);
          results.packaging++;
        }
      }

      return results;
    },
    onSuccess: (results) => {
      setScanning(false);
      queryClient.invalidateQueries({ queryKey: ['pfas-assessments'] });
      toast.success(`Auto-scan complete: ${results.suppliers} suppliers, ${results.products} products, ${results.packaging} packaging items`);
    },
    onError: () => {
      setScanning(false);
      toast.error('Auto-scan failed');
    }
  });

  const stats = {
    suppliersScanned: assessments.filter(a => a.entity_type === 'Supplier').length,
    productsScanned: assessments.filter(a => a.entity_type === 'Product').length,
    packagingScanned: assessments.filter(a => a.entity_type === 'PPWRPackaging').length,
    totalSuppliers: suppliers.length,
    totalProducts: products.length,
    totalPackaging: packaging.length
  };

  const coveragePercent = {
    suppliers: suppliers.length > 0 ? (stats.suppliersScanned / stats.totalSuppliers) * 100 : 0,
    products: products.length > 0 ? (stats.productsScanned / stats.totalProducts) * 100 : 0,
    packaging: packaging.length > 0 ? (stats.packagingScanned / stats.totalPackaging) * 100 : 0
  };

  return (
    <div className="space-y-6">
      <Card className="border-[#86b027]/30 bg-gradient-to-br from-white to-[#86b027]/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-[#86b027]">
                <Link2 className="w-5 h-5" />
                SupplyLens + PPWR Integration
              </CardTitle>
              <p className="text-sm text-slate-500 mt-1">
                Auto-scan suppliers, products, and packaging for PFAS
              </p>
            </div>
            <Button
              onClick={() => scanAllMutation.mutate()}
              disabled={scanning}
              className="bg-[#86b027] hover:bg-[#769c22] text-white"
            >
              {scanning ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Play className="w-4 h-4 mr-2" />
              )}
              {scanning ? 'Scanning...' : 'Run Auto-Scan'}
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-3 gap-4">
        <Card className="border-blue-200 bg-blue-50/30">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-blue-900">Suppliers</h4>
              <Badge className={coveragePercent.suppliers === 100 ? 'bg-emerald-500' : 'bg-amber-500'}>
                {coveragePercent.suppliers.toFixed(0)}%
              </Badge>
            </div>
            <div className="text-2xl font-bold text-blue-700">
              {stats.suppliersScanned} / {stats.totalSuppliers}
            </div>
            <p className="text-xs text-slate-600 mt-1">Scanned</p>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50/30">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-purple-900">Products</h4>
              <Badge className={coveragePercent.products === 100 ? 'bg-emerald-500' : 'bg-amber-500'}>
                {coveragePercent.products.toFixed(0)}%
              </Badge>
            </div>
            <div className="text-2xl font-bold text-purple-700">
              {stats.productsScanned} / {stats.totalProducts}
            </div>
            <p className="text-xs text-slate-600 mt-1">Scanned</p>
          </CardContent>
        </Card>

        <Card className="border-[#86b027]/30 bg-[#86b027]/5">
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-3">
              <h4 className="font-semibold text-[#86b027]">PPWR Packaging</h4>
              <Badge className={coveragePercent.packaging === 100 ? 'bg-emerald-500' : 'bg-amber-500'}>
                {coveragePercent.packaging.toFixed(0)}%
              </Badge>
            </div>
            <div className="text-2xl font-bold text-[#86b027]">
              {stats.packagingScanned} / {stats.totalPackaging}
            </div>
            <p className="text-xs text-slate-600 mt-1">Art. 8 Checks</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-slate-200">
        <CardHeader>
          <CardTitle className="text-lg">Integration Features</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-emerald-900 text-sm">Auto-Scan on Onboarding</p>
                <p className="text-xs text-slate-600">New suppliers/products automatically assessed</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-emerald-900 text-sm">PPWR Cross-Check</p>
                <p className="text-xs text-slate-600">Packaging Article 8 PFAS ban validation</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-emerald-900 text-sm">Blockchain Audit Trail</p>
                <p className="text-xs text-slate-600">Every assessment timestamped and hashed</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3 bg-emerald-50 rounded-lg border border-emerald-200">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 mt-0.5 shrink-0" />
              <div>
                <p className="font-semibold text-emerald-900 text-sm">Scheduled Re-Scans</p>
                <p className="text-xs text-slate-600">Monthly updates for high-risk items (risk ≥50)</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}