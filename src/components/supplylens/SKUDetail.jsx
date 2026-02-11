import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, Building2, FileText, AlertCircle, CheckCircle2, ExternalLink, Network, Sparkles } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { demoStore } from './DemoDataStore';

export default function SKUDetail({ skuId, onClose }) {
  const { data: sku, isLoading } = useQuery({
    queryKey: ['sku', skuId],
    queryFn: () => demoStore.getEntity('SKU', skuId),
    enabled: !!skuId
  });

  const { data: mappings = [] } = useQuery({
    queryKey: ['sku-mappings', skuId],
    queryFn: () => demoStore.getSKUMappings(skuId),
    enabled: !!skuId
  });

  const { data: workItems = [] } = useQuery({
    queryKey: ['sku-work-items', skuId],
    queryFn: () => demoStore.getWorkItemsForEntity('SKU', skuId),
    enabled: !!skuId
  });

  const { data: linkedEvidence = [] } = useQuery({
    queryKey: ['sku-evidence', skuId],
    queryFn: () => demoStore.getEvidenceForEntity('SKU', skuId),
    enabled: !!skuId
  });

  const { data: bom } = useQuery({
    queryKey: ['sku-bom', skuId],
    queryFn: () => {
      const allEntities = demoStore.listEntities('BOM');
      return allEntities.find(b => b.entity_id === `BOM-${skuId.split('-')[1]}`);
    },
    enabled: !!skuId
  });

  if (isLoading || !sku) {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-600 font-light">Loading SKU details...</p>
      </div>
    );
  }

  const openWorkItems = workItems.filter(wi => wi.status === 'OPEN' || wi.status === 'BLOCKED');
  const bomStatus = bom ? (bom.readiness === 'PENDING_MATCH' ? 'PENDING_MATCH' : 'READY') : 'NO_BOM';
  
  const readinessModules = [
    { name: 'CBAM', status: linkedEvidence.some(e => e.dataset_type?.includes('CBAM')) ? 'READY' : 'INCOMPLETE' },
    { name: 'LCA/PCF', status: bomStatus === 'READY' ? 'READY' : 'INCOMPLETE' },
    { name: 'Logistics', status: linkedEvidence.some(e => e.dataset_type?.includes('LOGISTICS')) ? 'READY' : 'INCOMPLETE' },
    { name: 'DPP', status: linkedEvidence.length > 0 ? 'READY' : 'INCOMPLETE' }
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-white/60 to-slate-50/40 backdrop-blur-sm rounded-xl border border-slate-200/60 flex items-center justify-center">
              <Package className="w-6 h-6 text-slate-700" />
            </div>
            <div>
              <h2 className="text-2xl font-light text-slate-900 tracking-tight">{sku.name}</h2>
              <p className="text-sm text-slate-600 font-mono font-light">{sku.sku_code}</p>
            </div>
          </div>
          <Badge variant="outline" className="ml-15 text-xs">{sku.category}</Badge>
        </div>
        <Badge className={
          sku.mapping_status === 'MAPPED' ? 'bg-green-100 text-green-800 border border-green-200' :
          'bg-slate-100 text-slate-700 border border-slate-200'
        }>
          {sku.mapping_status}
        </Badge>
      </div>

      {/* Open Issues Alert */}
      {openWorkItems.length > 0 && (
        <Card className="bg-red-50/80 backdrop-blur-sm border-2 border-red-200/60 rounded-xl">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <div>
                <p className="text-sm font-semibold text-red-900">{openWorkItems.length} Open Task{openWorkItems.length !== 1 ? 's' : ''}</p>
                <p className="text-xs text-red-700 font-light">Requires attention</p>
              </div>
            </div>
            <Button
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white rounded-lg shadow-md"
              onClick={() => {
                window.location.href = `${createPageUrl('SupplyLens')}?filter_sku=${skuId}`;
              }}
            >
              Open Tasks
            </Button>
          </CardContent>
        </Card>
      )}

      {/* AI Suggestions Quick Access */}
      <Card className="bg-gradient-to-br from-[#86b027]/5 to-[#86b027]/10 border border-[#86b027]/20 rounded-xl">
        <CardContent className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Sparkles className="w-5 h-5 text-[#86b027]" />
            <div>
              <p className="text-sm font-semibold text-slate-900">AI Mapping Suggestions</p>
              <p className="text-xs text-slate-600 font-light">Review pending matches</p>
            </div>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-slate-300 hover:bg-white rounded-lg"
            onClick={() => {
              window.location.href = `${createPageUrl('EvidenceVault')}?tab=history&filter_entity=${skuId}&filter_entity_type=SKU`;
            }}
          >
            Review
          </Button>
        </CardContent>
      </Card>

      {/* BOM Status */}
      <Card className="bg-white/70 backdrop-blur-xl border border-slate-200/60 shadow-lg">
        <CardHeader className="border-b border-slate-200/50 bg-gradient-to-r from-white/40 via-white/20 to-white/40">
          <CardTitle className="text-base font-light tracking-tight text-slate-900">BOM Status</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Network className="w-5 h-5 text-slate-600" />
              <div>
                <p className="text-sm font-medium text-slate-900">
                  {bomStatus === 'NO_BOM' ? 'No BOM Available' :
                   bomStatus === 'PENDING_MATCH' ? 'Pending Component Matches' :
                   'BOM Complete'}
                </p>
                {bom && (
                  <p className="text-xs text-slate-600 font-light mt-1">{bom.components?.length || 0} components</p>
                )}
              </div>
            </div>
            <Badge className={
              bomStatus === 'READY' ? 'bg-green-100 text-green-800 border border-green-200' :
              bomStatus === 'PENDING_MATCH' ? 'bg-amber-100 text-amber-800 border border-amber-200' :
              'bg-slate-100 text-slate-600 border border-slate-200'
            }>
              {bomStatus}
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Suppliers */}
      <Card className="bg-white/70 backdrop-blur-xl border border-slate-200/60 shadow-lg">
        <CardHeader className="border-b border-slate-200/50 bg-gradient-to-r from-white/40 via-white/20 to-white/40">
          <CardTitle className="text-base font-light tracking-tight text-slate-900">Suppliers ({mappings.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {mappings.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-500 font-light">No supplier mappings yet</div>
          ) : (
            <div className="divide-y divide-slate-200/50">
              {mappings.map((mapping, idx) => {
                const supplier = demoStore.getEntity('SUPPLIER', mapping.supplier_id);
                return (
                  <div key={idx} className="p-4 hover:bg-white/50 backdrop-blur-sm transition-all cursor-pointer" onClick={() => {
                    window.location.href = `${createPageUrl('SupplyLensNetwork')}?entity_type=SUPPLIER&entity_id=${mapping.supplier_id}`;
                  }}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-slate-600" />
                          <p className="text-sm font-medium text-slate-900">{supplier?.name || mapping.supplier_id}</p>
                        </div>
                        <p className="text-xs text-slate-600 font-mono mt-1">{mapping.supplier_id}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">{mapping.relationship_type}</Badge>
                          <span className="text-xs text-slate-500">Confidence: {mapping.confidence}%</span>
                        </div>
                      </div>
                      <Badge className={
                        mapping.status === 'APPROVED' ? 'bg-green-100 text-green-800 border border-green-200' :
                        'bg-amber-100 text-amber-800 border border-amber-200'
                      } style={{ fontSize: '10px' }}>
                        {mapping.status}
                      </Badge>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Readiness by Module */}
      <Card className="bg-white/70 backdrop-blur-xl border border-slate-200/60 shadow-lg">
        <CardHeader className="border-b border-slate-200/50 bg-gradient-to-r from-white/40 via-white/20 to-white/40">
          <CardTitle className="text-base font-light tracking-tight text-slate-900">Readiness by Module</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          <div className="grid grid-cols-2 gap-3">
            {readinessModules.map((module, idx) => (
              <div key={idx} className="bg-gradient-to-br from-white/60 to-slate-50/40 backdrop-blur-sm border border-slate-200/60 rounded-xl p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-700 font-semibold uppercase tracking-wider">{module.name}</span>
                  {module.status === 'READY' ? (
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-amber-600" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Linked Evidence */}
      <Card className="bg-white/70 backdrop-blur-xl border border-slate-200/60 shadow-lg">
        <CardHeader className="border-b border-slate-200/50 bg-gradient-to-r from-white/40 via-white/20 to-white/40">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base font-light tracking-tight text-slate-900">Linked Evidence ({linkedEvidence.length})</CardTitle>
            <Button
              size="sm"
              variant="outline"
              className="border border-slate-300 hover:bg-slate-50 rounded-lg"
              onClick={() => {
                window.location.href = `${createPageUrl('EvidenceVault')}?filter_sku=${skuId}`;
              }}
            >
              View All
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4">
          {linkedEvidence.length === 0 ? (
            <p className="text-sm text-slate-500 font-light text-center py-4">No evidence linked yet</p>
          ) : (
            <div className="space-y-2">
              {linkedEvidence.slice(0, 5).map((ev, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50/50 backdrop-blur-sm rounded-lg border border-slate-200/40 hover:bg-white/60 transition-all">
                  <div>
                    <p className="text-xs font-mono text-slate-900 font-semibold">{ev.display_id}</p>
                    <p className="text-xs text-slate-600 font-light mt-1">{ev.dataset_type}</p>
                  </div>
                  <Badge className={ev.status === 'SEALED' ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-slate-100 text-slate-600'} style={{ fontSize: '10px' }}>
                    {ev.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}