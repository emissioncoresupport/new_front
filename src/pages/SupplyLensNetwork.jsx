import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { toast } from 'sonner';

import EvidenceLinkagePanel from '@/components/supplylens/EvidenceLinkagePanel';
import NotFoundCard from '@/components/supplylens/NotFoundCard';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, Package, Network as NetworkIcon, ExternalLink, AlertCircle, CheckCircle2, XCircle, Clock, Link as LinkIcon, GripVertical, Grid3x3, List } from 'lucide-react';
import { motion } from 'framer-motion';

export default function SupplyLensNetwork() {
  const urlParams = new URLSearchParams(window.location.search);
  const urlEntityType = urlParams.get('entity_type');
  const urlEntityId = urlParams.get('entity_id');
  const initialTab = urlParams.get('tab') || (urlEntityType === 'SUPPLIER' ? 'suppliers' : urlEntityType === 'SKU' ? 'skus' : urlEntityType === 'BOM' ? 'boms' : 'suppliers');
  const searchQuery = urlParams.get('q') || '';
  const focusParam = urlParams.get('focus') || '';
  
  const [selectedEntity, setSelectedEntity] = useState(null);
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [showLinkagePanel, setShowLinkagePanel] = useState(false);
  const [linkageEntity, setLinkageEntity] = useState(null);
  const [mappingDecision, setMappingDecision] = useState({ reason_code: '', outcome: '', suggestion_id: '' });
  const [viewMode, setViewMode] = useState('table');
  const [activeTab, setActiveTab] = useState(initialTab);
  const [searchFilter, setSearchFilter] = useState(searchQuery);
  const [focusedEntityId, setFocusedEntityId] = useState(focusParam);
  const [autoOpenedEntityId, setAutoOpenedEntityId] = React.useState(null);
  const [notFoundId, setNotFoundId] = useState(null);
  const [notFoundType, setNotFoundType] = useState(null);
  const focusedRowRef = React.useRef(null);
  
  // Auto-open entity panel if URL contains entity_id
  useEffect(() => {
    const openEntityFromUrl = async () => {
      if (urlEntityId && urlEntityType) {
        const { demoStore } = await import('@/components/supplylens/DemoDataStore');
        const entity = demoStore.getEntity(urlEntityType, urlEntityId);
        
        if (entity) {
          setLinkageEntity(entity);
          setShowLinkagePanel(true);
          setFocusedEntityId(urlEntityId);
          setNotFoundId(null);
          setNotFoundType(null);
          
          // Set correct tab based on entity type
          const correctTab = urlEntityType === 'SUPPLIER' ? 'suppliers' : 
                             urlEntityType === 'SKU' ? 'skus' :
                             urlEntityType === 'BOM' ? 'bom' :
                             urlEntityType === 'SITE' ? 'suppliers' : 'suppliers';
          setActiveTab(correctTab);
        } else {
          setNotFoundId(urlEntityId);
          setNotFoundType(urlEntityType);
          setLinkageEntity(null);
          setShowLinkagePanel(false);
        }
      }
    };
    
    openEntityFromUrl();
  }, [urlEntityId, urlEntityType]);

  const { data: suppliers = [], refetch: refetchSuppliers } = useQuery({
    queryKey: ['demo-suppliers'],
    queryFn: async () => {
      const { demoStore } = await import('@/components/supplylens/DemoDataStore');
      return demoStore.listEntities('SUPPLIER').filter(s => s.id || s.entity_id);
    }
  });

  const { data: skus = [], refetch: refetchSKUs } = useQuery({
    queryKey: ['demo-skus'],
    queryFn: async () => {
      const { demoStore } = await import('@/components/supplylens/DemoDataStore');
      return demoStore.listEntities('SKU').filter(s => s.id || s.entity_id);
    }
  });

  const { data: boms = [], refetch: refetchBOMs } = useQuery({
    queryKey: ['demo-boms'],
    queryFn: async () => {
      const { demoStore } = await import('@/components/supplylens/DemoDataStore');
      return demoStore.listEntities('BOM').filter(b => b.id || b.entity_id);
    }
  });
  

  
  const handleRefresh = () => {
    refetchSuppliers();
    refetchSKUs();
    refetchBOMs();
  };

  React.useEffect(() => {
    if (focusedEntityId && focusedRowRef.current) {
      setTimeout(() => {
        focusedRowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        focusedRowRef.current.classList.add('animate-pulse-highlight');
        setTimeout(() => {
          focusedRowRef.current?.classList.remove('animate-pulse-highlight');
        }, 3000);
      }, 300);
    }
  }, [focusedEntityId, activeTab, suppliers, skus, boms]);

  const getMockEntityData = (entityId, entityType) => ({
    linkedEvidence: [
      { evidence_id: 'EV-001', dataset_type: 'Supplier Master', sealed_date: '2026-02-01', trust_level: 'HIGH' },
      { evidence_id: 'EV-002', dataset_type: 'Invoice', sealed_date: '2026-02-02', trust_level: 'MEDIUM' }
    ],
    mappingDecisions: [
      { decision_id: 'DEC-001', date: '2026-02-01T10:00:00Z', user: 'admin@example.com', reason_code: 'EXACT_MATCH', outcome: 'APPROVED' },
      { decision_id: 'DEC-002', date: '2026-02-02T14:00:00Z', user: 'admin@example.com', reason_code: 'FUZZY_MATCH', outcome: 'REJECTED' }
    ],
    aiSuggestions: [
      { suggestion_id: 'SUG-001', type: 'EXACT_MATCH', confidence: 0.95, source_value: 'Acme Corp', target_entity_id: 'supplier_123', status: 'PENDING' },
      { suggestion_id: 'SUG-002', type: 'FUZZY_MATCH', confidence: 0.78, source_value: 'Acme Corporation', target_entity_id: 'supplier_456', status: 'PENDING' }
    ],
    evidenceCount: Math.floor(Math.random() * 10),
    mappingStatus: ['MAPPED', 'PENDING', 'CONFLICT', 'NO_EVIDENCE'][Math.floor(Math.random() * 4)],
    readinessImpact: ['READY', 'READY_WITH_GAPS', 'PENDING_MATCH', 'NOT_READY'][Math.floor(Math.random() * 4)]
  });

  const handleMappingDecision = async (outcome, suggestionId) => {
    toast.info('Backend not connected yet');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white/60 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-[1920px] mx-auto px-8 py-6">
          <h1 className="text-3xl font-light text-slate-900 tracking-tight">Network</h1>
          <p className="text-slate-600 font-light mt-1">Master data entities with evidence linkage and readiness impacts</p>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-[1920px] mx-auto px-8 py-8">
        {notFoundId && (
          <NotFoundCard 
            recordId={`${notFoundType} ${notFoundId}`} 
            recordType="Entity"
            onBack={() => {
              setNotFoundId(null);
              setNotFoundType(null);
              window.history.back();
            }}
          />
        )}
        {!notFoundId && (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          {/* Controls Bar */}
          <div className="flex gap-4 items-center justify-between">
            <Input
              type="text"
              placeholder="Search products by name, SKU, description..."
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
              className="flex-1 h-10 bg-white border border-slate-200 rounded-lg shadow-sm transition-all focus:border-slate-400 focus:ring-0 text-sm placeholder:text-slate-400"
            />
            <div className="flex gap-1 bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
              <Button
                size="sm"
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                onClick={() => setViewMode('grid')}
                className={viewMode === 'grid' ? 'bg-slate-900 text-white h-8 px-3' : 'h-8 px-3 hover:bg-slate-50 text-slate-600'}
              >
                <Grid3x3 className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                onClick={() => setViewMode('table')}
                className={viewMode === 'table' ? 'bg-slate-900 text-white h-8 px-3' : 'h-8 px-3 hover:bg-slate-50 text-slate-600'}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Tabs Navigation */}
          <TabsList className="bg-white/80 backdrop-blur-sm border border-slate-200 shadow-sm rounded-lg p-1">
            <TabsTrigger value="suppliers" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white text-slate-600 rounded-md transition-all font-light">
              <span className="flex items-center gap-2">
                <Building2 className="w-4 h-4" />
                Suppliers
              </span>
            </TabsTrigger>
            <TabsTrigger value="skus" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white text-slate-600 rounded-md transition-all font-light">
              <span className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                SKUs & Products
              </span>
            </TabsTrigger>
            <TabsTrigger value="bom" className="data-[state=active]:bg-slate-900 data-[state=active]:text-white text-slate-600 rounded-md transition-all font-light">
              <span className="flex items-center gap-2">
                <NetworkIcon className="w-4 h-4" />
                BOM
              </span>
            </TabsTrigger>
          </TabsList>

          {/* Suppliers Tab */}
          <TabsContent value="suppliers" className="space-y-0">
            {viewMode === 'table' ? (
              <div className="bg-white/70 backdrop-blur-xl border border-slate-200/60 rounded-xl overflow-hidden shadow-lg">
                <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gradient-to-r from-white/40 via-white/20 to-white/40 backdrop-blur-sm border-b border-slate-200/50 text-xs font-semibold text-slate-700 uppercase tracking-[0.15em]">
                  <div className="col-span-3">Entity</div>
                  <div className="col-span-1">Status</div>
                  <div className="col-span-1">Evidence</div>
                  <div className="col-span-2">Mapping</div>
                  <div className="col-span-2">Readiness</div>
                  <div className="col-span-2">Open Tasks</div>
                  <div className="col-span-1 text-right">Actions</div>
                </div>
                
                <div className="divide-y divide-slate-100">
                  {suppliers
                    .filter(supplier => 
                     !searchFilter || 
                     supplier.name?.toLowerCase().includes(searchFilter.toLowerCase()) ||
                     supplier.legal_name?.toLowerCase().includes(searchFilter.toLowerCase()) ||
                     supplier.entity_id?.toLowerCase().includes(searchFilter.toLowerCase()) ||
                     supplier.supplier_id?.toLowerCase().includes(searchFilter.toLowerCase()) ||
                     supplier.country?.toLowerCase().includes(searchFilter.toLowerCase()) ||
                     supplier.country_code?.toLowerCase().includes(searchFilter.toLowerCase())
                    )
                    .slice(0, 50).map((supplier) => {
                     const isFocused = focusedEntityId === (supplier.entity_id || supplier.entityId || supplier.supplier_id || supplier.id);
                     return (
                    <div 
                     key={supplier.id} 
                     ref={isFocused ? focusedRowRef : null}
                     className={`grid grid-cols-12 gap-4 px-6 py-4 hover:bg-white/50 backdrop-blur-sm transition-all group ${isFocused ? 'bg-amber-50/50 border-l-4 border-amber-400' : ''}`}
                    >
                      <div className="col-span-3 flex items-center gap-3">
                      <Building2 className="w-4 h-4 text-slate-400" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{supplier.name || supplier.legalName || supplier.legal_name}</p>
                        <p className="text-xs text-slate-500 font-mono truncate">{supplier.entity_id || supplier.entityId || supplier.supplier_id || 'No ID'}</p>
                      </div>
                      </div>

                      <div className="col-span-1 flex items-center">
                      <span className="text-xs text-slate-600 font-light">{supplier.status || supplier.supplierStatus || supplier.supplier_status || 'Active'}</span>
                      </div>

                      <div className="col-span-1 flex items-center">
                      <span className="text-xs text-slate-600 font-light">
                        {supplier.evidence_count || supplier.evidenceLinks?.length || 0}
                      </span>
                      </div>

                      <div className="col-span-2 flex items-center">
                      <Badge variant="outline" className="text-xs border-slate-300">{supplier.mapping_status || 'MAPPED'}</Badge>
                      </div>

                      <div className="col-span-2 flex items-center">
                      <Badge variant="outline" className="text-xs border-slate-300">{supplier.readiness || 'READY'}</Badge>
                      </div>

                      <div className="col-span-2 flex items-center">
                      {supplier.open_work_items > 0 ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1 border-red-300 text-red-700 hover:bg-red-50"
                          onClick={() => {
                            window.location.href = `${createPageUrl('SupplyLens')}?tab=queue&workQueueFilter=all&entity_type=SUPPLIER&entity_id=${supplier.entity_id || supplier.id}`;
                          }}
                        >
                          {supplier.open_work_items} Tasks
                        </Button>
                      ) : (
                        <span className="text-xs text-slate-400 font-light">—</span>
                      )}
                      </div>
                      
                      <div className="col-span-1 flex items-center justify-end">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => {
                            setLinkageEntity(supplier);
                            setShowLinkagePanel(true);
                          }}
                          className="h-7 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white rounded-lg"
                        >
                          View
                        </Button>
                      </div>
                    </div>
                    );
                    })}

                    {suppliers.length === 0 && (
                    <div className="px-6 py-12 text-center">
                     <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                     <p className="text-sm text-slate-500">No suppliers found</p>
                    </div>
                    )}
                    </div>
              </div>
            ) : (
              <div className="grid gap-4">
                {suppliers
                  .filter(supplier => 
                    !searchFilter || 
                    supplier.legal_name?.toLowerCase().includes(searchFilter.toLowerCase()) ||
                    supplier.supplier_id?.toLowerCase().includes(searchFilter.toLowerCase())
                  )
                  .slice(0, 50).map((supplier) => (
                  <Card key={supplier.id} className="bg-white border border-slate-200 hover:border-slate-300 shadow-sm hover:shadow-md transition-all">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <Building2 className="w-5 h-5 text-slate-600" />
                            <h3 className="text-lg font-medium text-slate-900 tracking-tight">{supplier.name || supplier.legalName}</h3>
                            <Badge variant="outline" className="text-xs">{supplier.country_code}</Badge>
                          </div>

                          <div className="grid grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-slate-500 font-light text-xs uppercase tracking-wider mb-1">Mapping</p>
                              <Badge className={
                                supplier.mapping_status === 'MAPPED' ? 'bg-green-100 text-green-800 border border-green-200' :
                                supplier.mapping_status === 'CONFLICT' ? 'bg-red-100 text-red-800 border border-red-200' :
                                'bg-slate-100 text-slate-700 border border-slate-200'
                              } style={{ fontSize: '10px' }}>{supplier.mapping_status}</Badge>
                            </div>
                            <div>
                              <p className="text-slate-500 font-light text-xs uppercase tracking-wider mb-1">Evidence</p>
                              <span className="text-slate-900 font-medium text-sm">{supplier.evidence_count || 0}</span>
                            </div>
                            <div>
                              <p className="text-slate-500 font-light text-xs uppercase tracking-wider mb-1">Readiness</p>
                              <Badge className={
                                supplier.readiness === 'READY' ? 'bg-green-100 text-green-800 border border-green-200' :
                                supplier.readiness === 'CONFLICT' ? 'bg-red-100 text-red-800 border border-red-200' :
                                'bg-amber-100 text-amber-800 border border-amber-200'
                              } style={{ fontSize: '10px' }}>{supplier.readiness}</Badge>
                            </div>
                            <div>
                              <p className="text-slate-500 font-light text-xs uppercase tracking-wider mb-1">SKUs</p>
                              <span className="text-slate-900 font-medium text-sm">{demoStore.getSupplierMappings(supplier.entity_id || supplier.id).length}</span>
                            </div>
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="border border-slate-300 hover:bg-white/90 rounded-lg"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEntity({ type: 'SUPPLIER', id: supplier.entity_id || supplier.id });
                            setShowLinkagePanel(true);
                          }}
                        >
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* SKUs Tab */}
          <TabsContent value="skus" className="space-y-0">
            {viewMode === 'table' ? (
              <div className="bg-white/70 backdrop-blur-xl border border-slate-200/60 rounded-xl overflow-hidden shadow-lg">
                <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gradient-to-r from-white/40 via-white/20 to-white/40 backdrop-blur-sm border-b border-slate-200/50 text-xs font-semibold text-slate-700 uppercase tracking-[0.15em]">
                  <div className="col-span-3">Product</div>
                  <div className="col-span-2">SKU Code</div>
                  <div className="col-span-1">Evidence</div>
                  <div className="col-span-2">Mapping</div>
                  <div className="col-span-2">Open Tasks</div>
                  <div className="col-span-1">Readiness</div>
                  <div className="col-span-1 text-right">Actions</div>
                </div>
                
                <div className="divide-y divide-slate-100">
                  {skus
                    .filter(sku => 
                      !searchFilter || 
                      sku.name?.toLowerCase().includes(searchFilter.toLowerCase()) ||
                      sku.sku_code?.toLowerCase().includes(searchFilter.toLowerCase()) ||
                      sku.id?.toLowerCase().includes(searchFilter.toLowerCase())
                    )
                    .slice(0, 50).map((sku) => {
                     const isFocused = focusedEntityId === (sku.entity_id || sku.entityId || sku.sku_code || sku.code || sku.id);
                     return (
                    <div 
                     key={sku.id} 
                     ref={isFocused ? focusedRowRef : null}
                     className={`grid grid-cols-12 gap-4 px-6 py-4 hover:bg-white/50 backdrop-blur-sm transition-all group ${isFocused ? 'bg-amber-50/50 border-l-4 border-amber-400' : ''}`}
                    >
                      <div className="col-span-3 flex items-center gap-3">
                        <Package className="w-4 h-4 text-slate-400" />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{sku.name}</p>
                          <p className="text-xs text-slate-500 font-light truncate">{sku.category || 'No category'}</p>
                        </div>
                      </div>
                      
                      <div className="col-span-2 flex items-center">
                       <code className="text-xs text-slate-600 font-mono">{sku.code || sku.skuCode || sku.sku_code || 'N/A'}</code>
                      </div>
                      
                      <div className="col-span-1 flex items-center">
                       <span className="text-xs text-slate-600 font-light">
                         {sku.evidence_count || sku.evidenceLinks?.length || 0}
                       </span>
                      </div>

                      <div className="col-span-2 flex items-center">
                       <Badge variant="outline" className="text-xs border-slate-300">{sku.mapping_status || 'MAPPED'}</Badge>
                      </div>

                      <div className="col-span-2 flex items-center">
                      {sku.open_work_items > 0 ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1 border-red-300 text-red-700 hover:bg-red-50 rounded-lg"
                          onClick={() => {
                            window.location.href = `${createPageUrl('SupplyLens')}?tab=queue&workQueueFilter=all&entity_type=SKU&entity_id=${sku.entity_id || sku.id}`;
                          }}
                        >
                          {sku.open_work_items} Tasks
                        </Button>
                      ) : (
                        <span className="text-xs text-slate-400 font-light">—</span>
                      )}
                      </div>

                      <div className="col-span-1 flex items-center">
                       <Badge variant="outline" className="text-xs border-slate-300">{sku.readiness || 'READY'}</Badge>
                      </div>
                      
                      <div className="col-span-1 flex items-center justify-end">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => {
                            setLinkageEntity(sku);
                            setShowLinkagePanel(true);
                          }}
                          className="h-7 px-2 text-xs opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white rounded-lg"
                        >
                          View
                        </Button>
                      </div>
                    </div>
                    );
                    })}

                    {skus.length === 0 && (
                    <div className="px-6 py-12 text-center">
                     <Package className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                     <p className="text-sm text-slate-500">No SKUs found</p>
                    </div>
                    )}
                    </div>
              </div>
            ) : (
              <div className="grid gap-4">
                {skus
                  .filter(sku => 
                    !searchFilter || 
                    sku.name?.toLowerCase().includes(searchFilter.toLowerCase()) ||
                    sku.sku_code?.toLowerCase().includes(searchFilter.toLowerCase())
                  )
                  .slice(0, 50).map((sku) => (
                  <Card key={sku.entity_id || sku.id} className="bg-white/70 backdrop-blur-xl border border-slate-200/60 hover:border-slate-300 shadow-lg hover:shadow-xl transition-all rounded-xl cursor-pointer"
                    onClick={() => {
                      setSelectedEntity({ type: 'SKU', id: sku.entity_id || sku.id });
                      setShowLinkagePanel(true);
                    }}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <Package className="w-5 h-5 text-slate-600" />
                            <h3 className="text-lg font-medium text-slate-900 tracking-tight">{sku.name}</h3>
                            <Badge variant="outline" className="font-mono text-xs">{sku.sku_code || sku.code}</Badge>
                          </div>
                          
                          <div className="grid grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-slate-500 font-light text-xs uppercase tracking-wider mb-1">Category</p>
                              <p className="text-slate-900 text-xs font-medium">{sku.category || 'Uncategorized'}</p>
                            </div>
                            <div>
                              <p className="text-slate-500 font-light text-xs uppercase tracking-wider mb-1">Evidence</p>
                              <span className="text-slate-900 font-medium text-sm">{sku.evidence_count || 0}</span>
                            </div>
                            <div>
                              <p className="text-slate-500 font-light text-xs uppercase tracking-wider mb-1">Mapping</p>
                              <Badge className={
                                sku.mapping_status === 'MAPPED' ? 'bg-green-100 text-green-800 border border-green-200' :
                                'bg-slate-100 text-slate-700 border border-slate-200'
                              } style={{ fontSize: '10px' }}>{sku.mapping_status}</Badge>
                            </div>
                            <div>
                              <p className="text-slate-500 font-light text-xs uppercase tracking-wider mb-1">Suppliers</p>
                              <span className="text-slate-900 font-medium text-sm">{demoStore.getSKUMappings(sku.entity_id || sku.id).length}</span>
                            </div>
                          </div>
                        </div>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="border border-slate-300 hover:bg-white/90 rounded-lg"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEntity({ type: 'SKU', id: sku.entity_id || sku.id });
                            setShowLinkagePanel(true);
                          }}
                        >
                          View Details
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* BOM Tab */}
          <TabsContent value="bom" className="space-y-0">
           {viewMode === 'table' ? (
             <div className="bg-white border border-slate-200/60 rounded-xl overflow-hidden shadow-sm backdrop-blur-xl">
              <div className="grid grid-cols-12 gap-4 px-6 py-3 bg-gradient-to-r from-white/40 via-white/20 to-white/40 backdrop-blur-sm border-b border-slate-200/50 text-xs font-semibold text-slate-700 uppercase tracking-[0.15em]">
                <div className="col-span-3">BOM Name</div>
                <div className="col-span-2">BOM ID</div>
                <div className="col-span-1">Evidence</div>
                <div className="col-span-2">Mapping</div>
                <div className="col-span-2">Open Tasks</div>
                <div className="col-span-1">Readiness</div>
                <div className="col-span-1 text-right">Actions</div>
              </div>

               <div className="divide-y divide-slate-100">
                 {boms.length === 0 && (
                   <div className="px-6 py-12 text-center">
                     <NetworkIcon className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                     <p className="text-sm text-slate-500">No BOMs found</p>
                     <Button className="mt-4 bg-slate-900 hover:bg-slate-800 text-white">
                       Import BOM
                     </Button>
                   </div>
                 )}

                 {boms.map((bom) => {
                   const isFocused = focusedEntityId === (bom.entity_id || bom.entityId || bom.id);
                   return (
                     <div 
                       key={bom.id}
                       ref={isFocused ? focusedRowRef : null}
                       className={`grid grid-cols-12 gap-4 px-6 py-4 hover:bg-white/50 backdrop-blur-sm transition-all group ${isFocused ? 'bg-amber-50/50 border-l-4 border-amber-400' : ''}`}
                     >
                       <div className="col-span-3 flex items-center gap-3">
                         <NetworkIcon className="w-4 h-4 text-slate-400" />
                         <p className="text-sm font-medium text-slate-900">{bom.name || bom.bomName || bom.bom_name || 'Unnamed BOM'}</p>
                       </div>
                       <div className="col-span-2 flex items-center">
                         <code className="text-xs text-slate-600 font-mono">{bom.entity_id || bom.entityId || bom.id}</code>
                       </div>
                       <div className="col-span-1 flex items-center">
                         <span className="text-xs text-slate-600 font-light">{bom.evidence_count || 0}</span>
                       </div>
                       <div className="col-span-2 flex items-center">
                         <Badge variant="outline" className="text-xs border-slate-300">{bom.mapping_status || 'MAPPED'}</Badge>
                       </div>
                       <div className="col-span-2 flex items-center">
                       {bom.open_work_items > 0 ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 text-xs gap-1 border-red-300 text-red-700 hover:bg-red-50 rounded-lg"
                          onClick={() => {
                            window.location.href = `${createPageUrl('SupplyLens')}?tab=queue&workQueueFilter=all&entity_type=BOM&entity_id=${bom.entity_id || bom.id}`;
                          }}
                        >
                          {bom.open_work_items} Tasks
                        </Button>
                      ) : (
                        <span className="text-xs text-slate-400 font-light">—</span>
                      )}
                       </div>
                       <div className="col-span-1 flex items-center">
                         <Badge variant="outline" className="text-xs border-slate-300">{bom.readiness || 'READY'}</Badge>
                       </div>
                       <div className="col-span-1 flex items-center justify-end">
                         <Button 
                           size="sm" 
                           variant="ghost" 
                           onClick={() => {
                             setLinkageEntity(bom);
                             setShowLinkagePanel(true);
                           }}
                           className="h-7 px-2 text-xs opacity-0 group-hover:opacity-100 hover:bg-white rounded-lg"
                         >
                           View
                         </Button>
                       </div>
                     </div>
                   );
                 })}
               </div>
             </div>
           ) : (
             <Card className="bg-white border border-slate-200 shadow-sm">
               <CardContent className="p-12 text-center">
                 <NetworkIcon className="w-12 h-12 text-slate-400 mx-auto mb-4" />
                 <p className="text-slate-600 font-light">Grid view for BOMs coming soon</p>
               </CardContent>
             </Card>
           )}
          </TabsContent>
        </Tabs>
        )}
        </div>

        {showLinkagePanel && linkageEntity && (
        <EvidenceLinkagePanel 
         entity={linkageEntity}
         entityType={activeTab === 'suppliers' ? 'SUPPLIER' : activeTab === 'skus' ? 'SKU' : 'BOM'}
         linkedEvidence={[]}
         onClose={() => {
           setShowLinkagePanel(false);
           setLinkageEntity(null);
         }}
         onRefresh={handleRefresh}
        />
        )}
        </div>
        );
        }