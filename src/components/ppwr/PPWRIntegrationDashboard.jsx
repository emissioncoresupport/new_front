import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";
import { 
  RefreshCw, Package, QrCode, Mail, Link2, 
  CheckCircle2, Loader2, Database, FileText 
} from "lucide-react";
import PPWRIntegrationHub from './services/PPWRIntegrationHub';

export default function PPWRIntegrationDashboard() {
  const [syncing, setSyncing] = useState(false);
  const queryClient = useQueryClient();

  const { data: packaging = [] } = useQuery({
    queryKey: ['ppwr-packaging'],
    queryFn: () => base44.entities.PPWRPackaging.list()
  });

  const { data: skus = [] } = useQuery({
    queryKey: ['skus'],
    queryFn: () => base44.entities.SKU.list()
  });

  const stats = {
    total_packaging: packaging.length,
    linked_to_sku: packaging.filter(p => p.sku_id).length,
    with_dpp: packaging.filter(p => p.digital_passport_id).length,
    pending_declarations: packaging.filter(p => !p.supplier_declaration_url && p.supplier_id).length
  };

  const handleBatchSync = async () => {
    setSyncing(true);
    toast.info('Syncing with SupplyLens...');
    
    try {
      const results = await PPWRIntegrationHub.batchSyncFromSupplyLens();
      queryClient.invalidateQueries({ queryKey: ['ppwr-packaging'] });
      toast.success(`Sync complete: ${results.synced} updated`);
    } catch (error) {
      toast.error('Sync failed');
    } finally {
      setSyncing(false);
    }
  };

  const handleGenerateDPP = async (packagingId) => {
    try {
      toast.info('Generating Digital Product Passport...');
      await PPWRIntegrationHub.generateDPP(packagingId);
      queryClient.invalidateQueries({ queryKey: ['ppwr-packaging'] });
    } catch (error) {
      // Error handled in service
    }
  };

  const handleRequestDeclaration = async (packagingId) => {
    try {
      toast.info('Sending declaration request...');
      await PPWRIntegrationHub.requestSupplierDeclaration(packagingId);
    } catch (error) {
      // Error handled in service
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-[#02a1e8]/30 bg-gradient-to-br from-white to-[#02a1e8]/5">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="w-5 h-5 text-[#02a1e8]" />
                Cross-Module Integration
              </CardTitle>
              <p className="text-sm text-slate-500 mt-1">
                Auto-sync with SupplyLens, DPP, SKU/BOM systems
              </p>
            </div>
            <Button 
              onClick={handleBatchSync}
              disabled={syncing || skus.length === 0}
              className="bg-[#02a1e8] hover:bg-[#0287c3] text-white"
            >
              {syncing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Sync All from SupplyLens
                </>
              )}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Integration Stats */}
      <div className="grid grid-cols-4 gap-4">
        <Card className="border-slate-200">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-slate-500 uppercase font-bold">Total Packaging</p>
                <h3 className="text-3xl font-extrabold text-slate-900 mt-2">{stats.total_packaging}</h3>
              </div>
              <Package className="w-10 h-10 text-slate-300" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#86b027]/20 bg-[#86b027]/5">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#86b027] uppercase font-bold">Linked to SKU</p>
                <h3 className="text-3xl font-extrabold text-[#86b027] mt-2">{stats.linked_to_sku}</h3>
                <p className="text-xs text-[#86b027]/70 mt-1">
                  {stats.total_packaging > 0 ? Math.round((stats.linked_to_sku / stats.total_packaging) * 100) : 0}%
                </p>
              </div>
              <Database className="w-10 h-10 text-[#86b027]/30" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-[#02a1e8]/20 bg-[#02a1e8]/5">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-[#02a1e8] uppercase font-bold">With DPP</p>
                <h3 className="text-3xl font-extrabold text-[#02a1e8] mt-2">{stats.with_dpp}</h3>
                <p className="text-xs text-[#02a1e8]/70 mt-1">
                  {stats.total_packaging > 0 ? Math.round((stats.with_dpp / stats.total_packaging) * 100) : 0}%
                </p>
              </div>
              <QrCode className="w-10 h-10 text-[#02a1e8]/30" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50/50">
          <CardContent className="p-5">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-amber-700 uppercase font-bold">Pending Requests</p>
                <h3 className="text-3xl font-extrabold text-amber-600 mt-2">{stats.pending_declarations}</h3>
              </div>
              <Mail className="w-10 h-10 text-amber-300" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Action Cards */}
      <div className="grid grid-cols-2 gap-6">
        {/* SKU Sync */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Database className="w-5 h-5 text-[#86b027]" />
              SupplyLens SKU Sync
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600">
              Auto-populate packaging data from SKU catalog and BOM. Material composition, weight, and supplier info synced automatically.
            </p>
            <div className="p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">Available SKUs:</span>
                <span className="font-bold text-slate-900">{skus.length}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-slate-600">Already synced:</span>
                <span className="font-bold text-[#86b027]">{stats.linked_to_sku}</span>
              </div>
            </div>
            <Button 
              onClick={handleBatchSync}
              disabled={syncing}
              className="w-full bg-[#86b027] hover:bg-[#769c22]"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Sync Now
            </Button>
          </CardContent>
        </Card>

        {/* DPP Generation */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <QrCode className="w-5 h-5 text-[#02a1e8]" />
              Digital Product Passport
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-slate-600">
              Auto-generate DPPs with QR codes for consumer access. Includes material composition, recyclability, and compliance data.
            </p>
            <div className="p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-600">DPPs created:</span>
                <span className="font-bold text-[#02a1e8]">{stats.with_dpp}</span>
              </div>
              <div className="flex items-center justify-between text-sm mt-2">
                <span className="text-slate-600">Pending:</span>
                <span className="font-bold text-amber-600">{stats.total_packaging - stats.with_dpp}</span>
              </div>
            </div>
            <Button 
              onClick={() => {
                const needsDPP = packaging.find(p => !p.digital_passport_id);
                if (needsDPP) {
                  handleGenerateDPP(needsDPP.id);
                } else {
                  toast.info('All packaging already has DPP');
                }
              }}
              disabled={stats.total_packaging === stats.with_dpp}
              className="w-full bg-[#02a1e8] hover:bg-[#0287c3]"
            >
              <QrCode className="w-4 h-4 mr-2" />
              Generate DPPs
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Packaging List with Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Integration Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {packaging.slice(0, 5).map(pkg => (
              <div key={pkg.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                <div className="flex-1">
                  <p className="font-semibold text-slate-900">{pkg.packaging_name}</p>
                  <div className="flex gap-2 mt-1">
                    {pkg.sku_id && <Badge variant="outline" className="text-xs">SKU Linked</Badge>}
                    {pkg.digital_passport_id && <Badge variant="outline" className="text-xs">DPP Created</Badge>}
                    {pkg.supplier_declaration_url && <Badge variant="outline" className="text-xs">Declaration Received</Badge>}
                  </div>
                </div>
                <div className="flex gap-2">
                  {!pkg.digital_passport_id && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleGenerateDPP(pkg.id)}
                    >
                      <QrCode className="w-3 h-3 mr-1" />
                      Generate DPP
                    </Button>
                  )}
                  {!pkg.supplier_declaration_url && pkg.supplier_id && (
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => handleRequestDeclaration(pkg.id)}
                    >
                      <Mail className="w-3 h-3 mr-1" />
                      Request Data
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}