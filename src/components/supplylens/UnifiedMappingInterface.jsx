import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Link2, ArrowRight, Check, X, Search, Sparkles, 
  Building2, Package, FileText, Zap, RefreshCw, AlertCircle
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import MasterDataOrchestrator from './MasterDataOrchestrator';
import OrchestrationMonitor from './OrchestrationMonitor';
import orchestrationService from './SupplyLensOrchestrationService';
import EvidenceSidePanel from './EvidenceSidePanel';

export default function UnifiedMappingInterface() {
  const [activeTab, setActiveTab] = useState('suggestions');
  const [searchTerm, setSearchTerm] = useState('');
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [showEvidencePanel, setShowEvidencePanel] = useState(false);
  const [selectedMapping, setSelectedMapping] = useState(null);
  const queryClient = useQueryClient();

  // Fetch all data
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list()
  });

  const { data: materials = [] } = useQuery({
    queryKey: ['material-skus'],
    queryFn: () => base44.entities.MaterialSKU.list()
  });

  const { data: mappings = [] } = useQuery({
    queryKey: ['supplier-sku-mappings'],
    queryFn: () => base44.entities.SupplierSKUMapping.list()
  });

  const { data: products = [] } = useQuery({
    queryKey: ['product-skus'],
    queryFn: () => base44.entities.ProductSKU.list()
  });

  const { data: boms = [] } = useQuery({
    queryKey: ['boms'],
    queryFn: () => base44.entities.BOM.list()
  });

  const { data: bomItems = [] } = useQuery({
    queryKey: ['bom-items'],
    queryFn: () => base44.entities.BOMItem.list()
  });

  const { data: mappingSuggestions = [] } = useQuery({
    queryKey: ['mapping-suggestions'],
    queryFn: () => base44.entities.DataMappingSuggestion.filter({ status: 'pending' })
  });

  const { data: evidencePacks = [] } = useQuery({
    queryKey: ['evidence-packs'],
    queryFn: () => base44.entities.EvidencePack.list()
  });

  // Calculate stats
  const stats = {
    totalSuppliers: suppliers.length,
    totalMaterials: materials.length,
    totalMappings: mappings.filter(m => m.status === 'approved').length,
    proposedMappings: mappingSuggestions.length,
    unmappedSuppliers: suppliers.filter(s => 
      !mappings.some(m => m.supplier_id === s.id && m.status === 'approved')
    ).length,
    unmappedMaterials: materials.filter(m => 
      !mappings.some(map => map.sku_id === m.id && map.status === 'approved')
    ).length,
    coverageRate: materials.length > 0 
      ? Math.round((mappings.filter(m => m.status === 'approved').length / materials.length) * 100) 
      : 0
  };

  // Discover relationships mutation
  const discoverMutation = useMutation({
    mutationFn: async (options) => {
      setIsDiscovering(true);
      try {
        const suggestions = await MasterDataOrchestrator.discoverRelationships(options);
        return suggestions;
      } finally {
        setIsDiscovering(false);
      }
    },
    onSuccess: (suggestions) => {
      toast.success(`Found ${suggestions.length} potential relationships`);
      queryClient.invalidateQueries(['supplier-sku-mappings']);
    }
  });

  // Approve mapping suggestion mutation
  const approveMappingMutation = useMutation({
    mutationFn: async (suggestionId) => {
      const result = await base44.functions.invoke('approveMappingSuggestion', { 
        suggestion_id: suggestionId,
        action: 'approve'
      });
      return result.data;
    },
    onSuccess: () => {
      toast.success('Mapping approved with evidence pack');
      queryClient.invalidateQueries(['mapping-suggestions']);
      queryClient.invalidateQueries(['supplier-sku-mappings']);
      queryClient.invalidateQueries(['evidence-packs']);
    }
  });

  // Create mapping mutation
  const createMappingMutation = useMutation({
    mutationFn: async ({ supplierId, materialId, type, confidence, validFrom, validUntil, evidenceIds }) => {
      const user = await base44.auth.me();
      
      // Create mapping with full metadata
      const mapping = await base44.entities.SupplierSKUMapping.create({
        tenant_id: user.company_id || user.id,
        supplier_id: supplierId,
        sku_id: materialId,
        relationship_type: type,
        mapping_confidence: confidence,
        status: 'proposed',
        valid_from: validFrom || new Date().toISOString(),
        valid_until: validUntil,
        source_system: 'manual',
        created_by: user.email
      });

      // Create evidence pack if evidenceIds provided
      if (evidenceIds && evidenceIds.length > 0) {
        await base44.entities.EvidencePack.create({
          tenant_id: user.company_id || user.id,
          entity_type: 'SupplierSKUMapping',
          entity_id: mapping.id,
          evidence_document_ids: evidenceIds,
          status: 'draft',
          created_by: user.email
        });
      }

      return mapping;
    },
    onSuccess: () => {
      toast.success('Mapping created - pending approval');
      queryClient.invalidateQueries(['supplier-sku-mappings']);
      queryClient.invalidateQueries(['evidence-packs']);
    }
  });

  // Delete mapping mutation
  const deleteMappingMutation = useMutation({
    mutationFn: async (mappingId) => {
      return await base44.entities.SupplierSKUMapping.delete(mappingId);
    },
    onSuccess: () => {
      toast.success('Relationship removed');
      queryClient.invalidateQueries(['supplier-sku-mappings']);
    }
  });

  const handleAutoDiscover = () => {
    discoverMutation.mutate({ 
      minConfidence: 70, 
      autoApprove: true 
    });
  };

  const unmappedSuppliers = suppliers.filter(s => 
    !mappings.some(m => m.supplier_id === s.id)
  );

  const unmappedMaterials = materials.filter(m => 
    !mappings.some(map => map.sku_id === m.id)
  );

  return (
    <div className="space-y-6">
      {/* Live Orchestration Monitor */}
      <OrchestrationMonitor />
      
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extralight text-slate-900">Master Data Relationships</h2>
          <p className="text-sm text-slate-500 font-light mt-1">
            Unified mapping interface for Suppliers → Materials → BOMs → Products
          </p>
        </div>
        <Button 
          onClick={handleAutoDiscover}
          disabled={isDiscovering}
          className="bg-[#86b027] hover:bg-[#86b027]/90 text-white"
        >
          {isDiscovering ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Discovering...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Auto-Discover
            </>
          )}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <StatCard
          label="Suppliers"
          value={stats.totalSuppliers}
          icon={Building2}
          color="text-slate-600"
        />
        <StatCard
          label="Materials"
          value={stats.totalMaterials}
          icon={Package}
          color="text-slate-600"
        />
        <StatCard
          label="Relationships"
          value={stats.totalMappings}
          icon={Link2}
          color="text-[#86b027]"
        />
        <StatCard
          label="Unmapped Suppliers"
          value={stats.unmappedSuppliers}
          icon={AlertCircle}
          color="text-amber-600"
        />
        <StatCard
          label="Unmapped Materials"
          value={stats.unmappedMaterials}
          icon={AlertCircle}
          color="text-amber-600"
        />
        <StatCard
          label="Coverage"
          value={`${stats.coverageRate}%`}
          icon={Check}
          color="text-[#86b027]"
        />
      </div>

      {/* Main Interface */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white/40 backdrop-blur-xl border border-slate-200/60 p-1 h-auto shadow-sm rounded-xl">
          <TabsTrigger value="review" className="gap-2 px-5 py-2.5 text-sm font-light">
            <AlertCircle className="w-4 h-4" />
            Review Queue
            {stats.proposedMappings > 0 && (
              <Badge className="ml-2 bg-amber-600 text-white">{stats.proposedMappings}</Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="active" className="gap-2 px-5 py-2.5 text-sm font-light">
            <Link2 className="w-4 h-4" />
            Active Mappings
          </TabsTrigger>
          <TabsTrigger value="bom" className="gap-2 px-5 py-2.5 text-sm font-light">
            <FileText className="w-4 h-4" />
            SKU → BOM
          </TabsTrigger>
          <TabsTrigger value="suggestions" className="gap-2 px-5 py-2.5 text-sm font-light">
            <Sparkles className="w-4 h-4" />
            AI Discovery
          </TabsTrigger>
        </TabsList>

        {/* Review Queue Tab */}
        <TabsContent value="review" className="space-y-4">
          <ReviewQueuePanel
            suggestions={mappingSuggestions}
            suppliers={suppliers}
            materials={materials}
            products={products}
            evidencePacks={evidencePacks}
            onApprove={approveMappingMutation.mutate}
            onReject={(id) => {
              base44.entities.DataMappingSuggestion.update(id, { status: 'rejected' });
              queryClient.invalidateQueries(['mapping-suggestions']);
              toast.info('Mapping rejected');
            }}
          />
        </TabsContent>

        {/* AI Discovery Tab */}
        <TabsContent value="suggestions" className="space-y-4">
          <AutoDiscoveryPanel 
            suppliers={suppliers}
            materials={materials}
            onCreateMapping={createMappingMutation.mutate}
          />
        </TabsContent>

        {/* Active Mappings Tab */}
        <TabsContent value="active" className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search mappings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 bg-white/40 backdrop-blur-xl border-slate-200/60"
            />
          </div>

          <div className="grid gap-3">
            {mappings
              .filter(m => m.status === 'approved')
              .filter(m => {
                const supplier = suppliers.find(s => s.id === m.supplier_id);
                const material = materials.find(mat => mat.id === m.sku_id);
                return (
                  supplier?.legal_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  material?.material_name?.toLowerCase().includes(searchTerm.toLowerCase())
                );
              })
              .map(mapping => {
                const supplier = suppliers.find(s => s.id === mapping.supplier_id);
                const material = materials.find(m => m.id === mapping.sku_id);
                const evidencePack = evidencePacks.find(ep => 
                  ep.entity_type === 'SupplierSKUMapping' && ep.entity_id === mapping.id
                );
                
                return (
                  <Card key={mapping.id} className="bg-white/40 backdrop-blur-xl border-slate-200/60 hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-4 flex-1">
                          <div className="flex items-center gap-2 flex-1">
                            <Building2 className="w-4 h-4 text-slate-600" />
                            <div>
                              <p className="font-light text-slate-900">
                                {supplier?.legal_name || 'Unknown'}
                              </p>
                              <p className="text-xs text-slate-500">{supplier?.country}</p>
                            </div>
                          </div>
                          <ArrowRight className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <div className="flex items-center gap-2 flex-1">
                            <Package className="w-4 h-4 text-[#86b027]" />
                            <div>
                              <p className="font-light text-slate-900">
                                {material?.material_name || 'Unknown'}
                              </p>
                              <p className="text-xs text-slate-500">{material?.internal_sku}</p>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            base44.entities.SupplierSKUMapping.update(mapping.id, { status: 'superseded' });
                            queryClient.invalidateQueries(['supplier-sku-mappings']);
                            toast.success('Mapping archived');
                          }}
                          className="h-8 w-8 p-0"
                        >
                          <X className="w-4 h-4 text-slate-600" />
                        </Button>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className="capitalize font-light text-xs">
                          {mapping.relationship_type}
                        </Badge>
                        <Badge className={cn(
                          "font-light text-xs",
                          mapping.mapping_confidence >= 80 
                            ? "bg-green-100 text-green-700"
                            : "bg-amber-100 text-amber-700"
                        )}>
                          {mapping.mapping_confidence}% confidence
                        </Badge>
                        {mapping.valid_from && (
                          <Badge variant="outline" className="text-xs font-light">
                            Valid from: {new Date(mapping.valid_from).toLocaleDateString()}
                          </Badge>
                        )}
                        {mapping.valid_until && (
                          <Badge variant="outline" className="text-xs font-light">
                            Until: {new Date(mapping.valid_until).toLocaleDateString()}
                          </Badge>
                        )}
                        {evidencePack && (
                          <Badge 
                            className="bg-slate-100 text-slate-700 text-xs font-light cursor-pointer hover:bg-slate-200"
                            onClick={() => {
                              setSelectedMapping(mapping);
                              setShowEvidencePanel(true);
                            }}
                          >
                            <FileText className="w-3 h-3 mr-1" />
                            {evidencePack.evidence_document_ids?.length || 0} evidence
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
          </div>
        </TabsContent>

        {/* SKU to BOM Tab */}
        <TabsContent value="bom" className="space-y-4">
          <BOMVersionMappingPanel 
            products={products}
            materials={materials}
            boms={boms}
            bomItems={bomItems}
            evidencePacks={evidencePacks}
          />
        </TabsContent>

      </Tabs>

      {/* Evidence Side Panel */}
      {showEvidencePanel && selectedMapping && (
        <Dialog open={showEvidencePanel} onOpenChange={setShowEvidencePanel}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Mapping Evidence</DialogTitle>
            </DialogHeader>
            <EvidenceSidePanel 
              entityType="SupplierSKUMapping" 
              entityId={selectedMapping.id}
              entityName={`Mapping ${selectedMapping.id}`}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Review Queue Panel for pending mappings
function ReviewQueuePanel({ suggestions, suppliers, materials, products, evidencePacks, onApprove, onReject }) {
  if (suggestions.length === 0) {
    return (
      <Card className="bg-white/40 backdrop-blur-xl border-slate-200/60">
        <CardContent className="p-12 text-center">
          <Check className="w-12 h-12 mx-auto mb-4 text-green-500" />
          <p className="text-slate-600 font-light">All mappings reviewed</p>
          <p className="text-sm text-slate-500 mt-1">No pending approvals</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {suggestions.map(suggestion => {
        const sourceEntity = suggestion.source_type === 'supplier' 
          ? suppliers.find(s => s.id === suggestion.source_id)
          : materials.find(m => m.id === suggestion.source_id);
        const targetEntity = suggestion.target_type === 'material'
          ? materials.find(m => m.id === suggestion.target_id)
          : products.find(p => p.id === suggestion.target_id);

        return (
          <Card key={suggestion.id} className="bg-white/40 backdrop-blur-xl border-slate-200/60 border-l-4 border-l-amber-500">
            <CardContent className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-amber-100 text-amber-700 font-light">
                      {suggestion.confidence_score}% confidence
                    </Badge>
                    <Badge variant="outline" className="capitalize font-light text-xs">
                      {suggestion.mapping_type}
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-600 font-light">
                    {suggestion.reasoning || 'AI detected potential relationship'}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Source</p>
                  <p className="font-light text-slate-900">{sourceEntity?.legal_name || sourceEntity?.material_name || 'Unknown'}</p>
                  <p className="text-xs text-slate-500 mt-1">{suggestion.source_type}</p>
                </div>
                <div className="flex items-center justify-center">
                  <ArrowRight className="w-6 h-6 text-slate-400" />
                </div>
                <div className="p-4 bg-[#86b027]/10 rounded-lg">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Target</p>
                  <p className="font-light text-slate-900">{targetEntity?.material_name || targetEntity?.product_name || 'Unknown'}</p>
                  <p className="text-xs text-slate-500 mt-1">{suggestion.target_type}</p>
                </div>
              </div>

              {suggestion.matched_attributes && (
                <div className="mb-4 p-3 bg-slate-50 rounded-lg">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-2">Matching Attributes</p>
                  <div className="flex gap-2 flex-wrap">
                    {suggestion.matched_attributes.map((attr, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs font-light">
                        {attr}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={() => onApprove(suggestion.id)}
                  className="flex-1 bg-[#86b027] hover:bg-[#86b027]/90"
                >
                  <Check className="w-4 h-4 mr-2" />
                  Approve & Create Evidence Pack
                </Button>
                <Button
                  onClick={() => onReject(suggestion.id)}
                  variant="outline"
                >
                  <X className="w-4 h-4 mr-2" />
                  Reject
                </Button>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// BOM Version Mapping Panel
function BOMVersionMappingPanel({ products, materials, boms, bomItems, evidencePacks }) {
  const queryClient = useQueryClient();
  const [selectedProduct, setSelectedProduct] = useState(null);

  const productBoms = boms.filter(b => b.product_id === selectedProduct?.id);

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-[#86b027]/10 to-transparent border-[#86b027]/30">
        <CardContent className="p-4">
          <p className="font-light text-slate-900 mb-1">SKU → BOM Version Mapping</p>
          <p className="text-xs text-slate-600">
            Link products to their versioned BOMs with validity periods and evidence
          </p>
        </CardContent>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="bg-white/40 backdrop-blur-xl border-slate-200/60">
          <CardHeader>
            <CardTitle className="text-base font-light">Products</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 max-h-96 overflow-y-auto">
            {products.map(product => (
              <div
                key={product.id}
                onClick={() => setSelectedProduct(product)}
                className={cn(
                  "p-3 rounded-lg border cursor-pointer transition-all",
                  selectedProduct?.id === product.id
                    ? "bg-[#86b027]/10 border-[#86b027]"
                    : "bg-white/40 border-slate-200/60 hover:bg-white/70"
                )}
              >
                <p className="font-light text-slate-900">{product.product_name}</p>
                <p className="text-xs text-slate-500 mt-1">{product.internal_sku}</p>
                <Badge className="mt-2 text-xs font-light">
                  {productBoms.length} BOM version{productBoms.length !== 1 ? 's' : ''}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="bg-white/40 backdrop-blur-xl border-slate-200/60">
          <CardHeader>
            <CardTitle className="text-base font-light">BOM Versions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 max-h-96 overflow-y-auto">
            {!selectedProduct ? (
              <p className="text-sm text-slate-500 text-center py-8">Select a product to view BOMs</p>
            ) : productBoms.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-8">No BOMs found for this product</p>
            ) : (
              productBoms.map(bom => {
                const items = bomItems.filter(item => item.bom_id === bom.id);
                const evidencePack = evidencePacks.find(ep => 
                  ep.entity_type === 'BOM' && ep.entity_id === bom.id
                );

                return (
                  <div key={bom.id} className="p-4 bg-white rounded-lg border border-slate-200 space-y-3">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-light text-slate-900">{bom.bom_name || `BOM v${bom.version}`}</p>
                        <p className="text-xs text-slate-500 mt-1">Version {bom.version}</p>
                      </div>
                      <Badge className={cn(
                        "text-xs font-light",
                        bom.status === 'active' ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-700"
                      )}>
                        {bom.status}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-600">
                      <Package className="w-3 h-3" />
                      <span>{items.length} components</span>
                      {evidencePack && (
                        <>
                          <span className="text-slate-400">•</span>
                          <FileText className="w-3 h-3" />
                          <span>{evidencePack.evidence_document_ids?.length || 0} evidence files</span>
                        </>
                      )}
                    </div>

                    {bom.valid_from && (
                      <div className="flex gap-2">
                        <Badge variant="outline" className="text-xs font-light">
                          From: {new Date(bom.valid_from).toLocaleDateString()}
                        </Badge>
                        {bom.valid_until && (
                          <Badge variant="outline" className="text-xs font-light">
                            Until: {new Date(bom.valid_until).toLocaleDateString()}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, color }) {
  return (
    <Card className="bg-white/40 backdrop-blur-xl border-slate-200/60">
      <CardContent className="p-4 text-center">
        <Icon className={cn("w-5 h-5 mx-auto mb-2", color)} />
        <div className="text-2xl font-extralight text-slate-900">{value}</div>
        <div className="text-xs text-slate-500 uppercase tracking-wider font-light">{label}</div>
      </CardContent>
    </Card>
  );
}

function AutoDiscoveryPanel({ suppliers, materials, onCreateMapping }) {
  const [suggestions, setSuggestions] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleAnalyze = async () => {
    setIsAnalyzing(true);
    try {
      const discovered = await MasterDataOrchestrator.discoverRelationships({
        minConfidence: 70,
        autoApprove: false
      });
      setSuggestions(discovered);
      toast.success(`Found ${discovered.length} potential matches`);
    } catch (error) {
      toast.error('Analysis failed: ' + error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="space-y-4">
      <Card className="bg-gradient-to-br from-[#86b027]/10 to-transparent border-[#86b027]/30">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-light text-slate-900">AI-Powered Relationship Discovery</p>
              <p className="text-xs text-slate-600 mt-1">
                Automatically detect supplier-material relationships based on names, codes, and metadata
              </p>
            </div>
            <Button 
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              variant="outline"
              className="border-[#86b027] text-[#86b027] hover:bg-[#86b027]/10"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Zap className="w-4 h-4 mr-2" />
                  Analyze Now
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {suggestions.length === 0 ? (
        <Card className="bg-white/40 backdrop-blur-xl border-slate-200/60">
          <CardContent className="p-12 text-center">
            <Sparkles className="w-12 h-12 mx-auto mb-4 text-slate-400" />
            <p className="text-slate-600 font-light">No suggestions yet</p>
            <p className="text-sm text-slate-500 mt-1">Run AI analysis to discover relationships</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {suggestions.map((suggestion, idx) => (
            <Card key={idx} className="bg-white/40 backdrop-blur-xl border-slate-200/60">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <Badge className={cn(
                    "font-light",
                    suggestion.confidence >= 85 
                      ? "bg-green-100 text-green-700"
                      : "bg-amber-100 text-amber-700"
                  )}>
                    {suggestion.confidence}% confidence
                  </Badge>
                  <span className="text-xs text-slate-500">{suggestion.reasoning}</span>
                </div>
                <div className="flex items-center gap-4 mb-3">
                  <div className="flex-1 p-3 bg-slate-50 rounded-lg">
                    <p className="text-xs text-slate-500">Supplier</p>
                    <p className="font-light text-slate-900">{suggestion.supplier_name}</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-400" />
                  <div className="flex-1 p-3 bg-[#86b027]/10 rounded-lg">
                    <p className="text-xs text-slate-500">Material</p>
                    <p className="font-light text-slate-900">{suggestion.material_name}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    onClick={() => onCreateMapping({
                      supplierId: suggestion.supplier_id,
                      materialId: suggestion.material_id,
                      type: 'manufacturer',
                      confidence: suggestion.confidence
                    })}
                    className="flex-1 bg-[#86b027] hover:bg-[#86b027]/90"
                    size="sm"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Approve
                  </Button>
                  <Button
                    onClick={() => {
                      setSuggestions(suggestions.filter((_, i) => i !== idx));
                      toast.info('Suggestion dismissed');
                    }}
                    variant="outline"
                    size="sm"
                  >
                    <X className="w-4 h-4 mr-2" />
                    Reject
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}