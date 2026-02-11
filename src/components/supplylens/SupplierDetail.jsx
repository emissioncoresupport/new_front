import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, MapPin, FileText, AlertCircle, CheckCircle2, ExternalLink, Package, Sparkles, Send, Share2 } from 'lucide-react';
import { createPageUrl } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import { demoStore } from './DemoDataStore';
import GrantedDatasetsPanel from './GrantedDatasetsPanel';

export default function SupplierDetail({ supplierId, onClose }) {
  const { data: supplier, isLoading } = useQuery({
    queryKey: ['supplier', supplierId],
    queryFn: () => demoStore.getEntity('SUPPLIER', supplierId),
    enabled: !!supplierId
  });

  const { data: mappings = [] } = useQuery({
    queryKey: ['supplier-mappings', supplierId],
    queryFn: () => demoStore.getSupplierMappings(supplierId),
    enabled: !!supplierId
  });

  const { data: workItems = [] } = useQuery({
    queryKey: ['supplier-work-items', supplierId],
    queryFn: () => demoStore.getWorkItemsForEntity('SUPPLIER', supplierId),
    enabled: !!supplierId
  });

  const { data: linkedEvidence = [] } = useQuery({
    queryKey: ['supplier-evidence', supplierId],
    queryFn: () => demoStore.getEvidenceForEntity('SUPPLIER', supplierId),
    enabled: !!supplierId
  });

  const { data: sites = [] } = useQuery({
    queryKey: ['supplier-sites', supplierId],
    queryFn: () => demoStore.listEntities('SITE').filter(s => s.supplier_id === supplierId),
    enabled: !!supplierId
  });

  if (isLoading || !supplier) {
    return (
      <div className="p-6 text-center">
        <p className="text-slate-600 font-light">Loading supplier details...</p>
      </div>
    );
  }

  const openWorkItems = workItems.filter(wi => wi.status === 'OPEN' || wi.status === 'BLOCKED');
  const readinessModules = [
    { name: 'CBAM', status: supplier.readiness === 'READY' ? 'READY' : 'INCOMPLETE' },
    { name: 'LCA/PCF', status: mappings.length > 0 ? 'READY' : 'INCOMPLETE' },
    { name: 'Logistics', status: sites.length > 0 ? 'READY' : 'INCOMPLETE' },
    { name: 'DPP', status: linkedEvidence.length > 0 ? 'READY' : 'INCOMPLETE' }
  ];

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-white/60 to-slate-50/40 backdrop-blur-sm rounded-xl border border-slate-200/60 flex items-center justify-center">
              <Building2 className="w-6 h-6 text-slate-700" />
            </div>
            <div>
              <h2 className="text-2xl font-light text-slate-900 tracking-tight">{supplier.name}</h2>
              <p className="text-sm text-slate-600 font-light">{supplier.legalName || supplier.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 ml-15">
            <MapPin className="w-4 h-4 text-slate-500" />
            <span className="text-sm text-slate-700 font-mono">{supplier.country_code}</span>
          </div>
        </div>
        <Badge className={
          supplier.mapping_status === 'MAPPED' ? 'bg-green-100 text-green-800 border border-green-200' :
          supplier.mapping_status === 'CONFLICT' ? 'bg-red-100 text-red-800 border border-red-200' :
          'bg-slate-100 text-slate-700 border border-slate-200'
        }>
          {supplier.mapping_status}
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
                window.location.href = `${createPageUrl('SupplyLens')}?filter_supplier=${supplierId}`;
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
              window.location.href = `${createPageUrl('EvidenceVault')}?tab=history&filter_entity=${supplierId}&filter_entity_type=SUPPLIER`;
            }}
          >
            Review
          </Button>
        </CardContent>
      </Card>

      {/* Supplier Exchange Actions */}
      <Card className="bg-white/70 backdrop-blur-xl border border-slate-200/60 shadow-lg rounded-xl">
        <CardHeader className="border-b border-slate-200/50 bg-gradient-to-r from-white/40 via-white/20 to-white/40">
          <CardTitle className="text-base font-light tracking-tight text-slate-900">Supplier Exchange</CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          <Button
            size="sm"
            className="w-full justify-start gap-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg"
            onClick={() => {
              const newRequest = {
                work_item_id: `WI-REQ-${Date.now()}`,
                type: 'DATA_REQUEST',
                status: 'OPEN',
                priority: 'MEDIUM',
                supplier_id: supplierId,
                supplier_name: supplier.name,
                dataset_type: 'CBAM_EMISSIONS',
                due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                created_at_utc: new Date().toISOString(),
                owner: 'admin@example.com',
                title: `Data request from ${supplier.name}`
              };
              const stored = localStorage.getItem('supplier_requests') || '[]';
              const requests = JSON.parse(stored);
              requests.push(newRequest);
              localStorage.setItem('supplier_requests', JSON.stringify(requests));
              window.location.href = `${createPageUrl('SupplyLens')}?filter_type=DATA_REQUEST`;
            }}
          >
            <Send className="w-4 h-4" />
            Request Data from Supplier
          </Button>
          <GrantedDatasetsPanel supplierOrgId={supplierId} buyerOrgId="BuyerOrgA" />
        </CardContent>
      </Card>

      {/* Supplied SKUs */}
      <Card className="bg-white/70 backdrop-blur-xl border border-slate-200/60 shadow-lg">
        <CardHeader className="border-b border-slate-200/50 bg-gradient-to-r from-white/40 via-white/20 to-white/40">
          <CardTitle className="text-base font-light tracking-tight text-slate-900">Supplied SKUs ({mappings.length})</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {mappings.length === 0 ? (
            <div className="p-6 text-center text-sm text-slate-500 font-light">No SKU mappings yet</div>
          ) : (
            <div className="divide-y divide-slate-200/50">
              {mappings.map((mapping, idx) => {
                const sku = demoStore.getEntity('SKU', mapping.sku_id);
                return (
                  <div key={idx} className="p-4 hover:bg-white/50 backdrop-blur-sm transition-all cursor-pointer" onClick={() => {
                    window.location.href = `${createPageUrl('SupplyLensNetwork')}?entity_type=SKU&entity_id=${mapping.sku_id}`;
                  }}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <Package className="w-4 h-4 text-slate-600" />
                          <p className="text-sm font-medium text-slate-900">{sku?.name || mapping.sku_id}</p>
                        </div>
                        <p className="text-xs text-slate-600 font-mono mt-1">{mapping.sku_id}</p>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">{mapping.relationship_type}</Badge>
                          <Badge className={mapping.is_primary ? 'bg-blue-100 text-blue-800' : 'bg-slate-100 text-slate-600'} style={{ fontSize: '10px' }}>
                            {mapping.is_primary ? 'Primary' : 'Secondary'}
                          </Badge>
                          <span className="text-xs text-slate-500">Confidence: {mapping.confidence}%</span>
                        </div>
                      </div>
                      <div className="text-right space-y-1">
                        <Badge className={
                          mapping.status === 'APPROVED' ? 'bg-green-100 text-green-800 border border-green-200' :
                          'bg-amber-100 text-amber-800 border border-amber-200'
                        } style={{ fontSize: '10px' }}>
                          {mapping.status}
                        </Badge>
                        <p className="text-xs text-slate-500">{mapping.evidence_count} evidence</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sites/Installations */}
      {sites.length > 0 && (
        <Card className="bg-white/70 backdrop-blur-xl border border-slate-200/60 shadow-lg">
          <CardHeader className="border-b border-slate-200/50 bg-gradient-to-r from-white/40 via-white/20 to-white/40">
            <CardTitle className="text-base font-light tracking-tight text-slate-900">Sites ({sites.length})</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-slate-200/50">
              {sites.map((site, idx) => (
                <div key={idx} className="p-4 hover:bg-white/50 backdrop-blur-sm transition-all">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-4 h-4 text-slate-600" />
                    <p className="text-sm font-medium text-slate-900">{site.name}</p>
                  </div>
                  <p className="text-xs text-slate-600 font-mono mt-1">{site.canonical_fields?.installation_id || site.entity_id}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
                window.location.href = `${createPageUrl('EvidenceVault')}?filter_supplier=${supplierId}`;
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