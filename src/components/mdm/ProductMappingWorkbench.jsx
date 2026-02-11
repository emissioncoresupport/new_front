import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { 
  Package, Upload, CheckCircle2, XCircle, Clock, 
  Sparkles, FileText, Loader2, Download, Plus, BarChart3
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function ProductMappingWorkbench() {
  // Force rebuild v2
  const [activeTab, setActiveTab] = useState('review_queue');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCreateSKU, setShowCreateSKU] = useState(false);
  const [newSKU, setNewSKU] = useState({
    sku_code: '',
    description: '',
    category: 'General'
  });
  const queryClient = useQueryClient();

  const { data: reviewQueue = [] } = useQuery({
    queryKey: ['mapping-review-queue', 'pending'],
    queryFn: () => base44.entities.MappingReviewQueue.filter({ status: 'pending' }, '-confidence_score')
  });

  const { data: supplierMappings = [] } = useQuery({
    queryKey: ['supplier-part-mappings'],
    queryFn: () => base44.entities.SupplierPartMapping.list('-created_date', 100)
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list()
  });

  const { data: skus = [] } = useQuery({
    queryKey: ['skus'],
    queryFn: () => base44.entities.SKU.list()
  });

  const pendingMappings = reviewQueue.filter(m => m.status === 'pending');
  const highConfidence = pendingMappings.filter(m => m.confidence_score >= 80);

  const stats = {
    pendingReview: pendingMappings.length,
    highConfidence: highConfidence.length,
    activeMappings: supplierMappings.length,
    coverage: skus.length > 0 ? Math.round((supplierMappings.length / skus.length) * 100) : 0
  };

  const handleCatalogUpload = async (file) => {
    setIsProcessing(true);
    const toastId = toast.loading("Processing supplier catalog...");

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });

      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  supplier_name: { type: "string" },
                  supplier_part_number: { type: "string" },
                  description: { type: "string" },
                  manufacturer_part_number: { type: "string" },
                  unit_price: { type: "number" },
                  lead_time_days: { type: "number" }
                }
              }
            }
          }
        }
      });

      if (result.status !== 'success') {
        throw new Error(result.details || 'Extraction failed');
      }

      const items = result.output?.items || result.output || [];
      
      if (items.length === 0) {
        throw new Error('No items found in catalog');
      }

      toast.dismiss(toastId);
      toast.loading(`Processing ${items.length} items with AI...`);

      const matchingPrompt = `
You are a supply chain data matching expert. Match these supplier catalog items to existing SKUs.

SUPPLIER CATALOG ITEMS:
${JSON.stringify(items, null, 2)}

EXISTING SUPPLIERS:
${JSON.stringify(suppliers.map(s => ({ id: s.id, name: s.legal_name, country: s.country })), null, 2)}

EXISTING SKUs:
${JSON.stringify(skus.map(s => ({ id: s.id, code: s.sku_code, description: s.description })), null, 2)}

For each catalog item:
1. Find the matching supplier by name (fuzzy match OK)
2. Find or suggest matching SKU by part number or description
3. If no SKU match exists, set create_new_sku=true and suggest sku_code
4. Provide confidence score 0-100
5. Explain reasoning

Return array of matches.`;

      const aiResult = await base44.integrations.Core.InvokeLLM({
        prompt: matchingPrompt,
        response_json_schema: {
          type: "object",
          properties: {
            matches: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  supplier_name: { type: "string" },
                  supplier_id: { type: "string" },
                  supplier_part_number: { type: "string" },
                  sku_id: { type: "string" },
                  create_new_sku: { type: "boolean" },
                  suggested_sku_code: { type: "string" },
                  description: { type: "string" },
                  confidence_score: { type: "number" },
                  unit_price: { type: "number" },
                  lead_time_days: { type: "number" },
                  reasoning: { type: "string" }
                }
              }
            }
          }
        }
      });

      const matches = aiResult.matches || [];
      let created = 0;
      let queued = 0;

      for (const match of matches) {
        try {
          let skuId = match.sku_id;

          if (match.create_new_sku && match.suggested_sku_code && match.confidence_score >= 70) {
            const newSKU = await base44.entities.SKU.create({
              sku_code: match.suggested_sku_code,
              description: match.description || match.supplier_part_number,
              category: 'General',
              status: 'active'
            });
            skuId = newSKU.id;
          }

          if (match.supplier_id && skuId) {
            if (match.confidence_score >= 85) {
              await base44.entities.SupplierPartMapping.create({
                supplier_id: match.supplier_id,
                supplier_part_number: match.supplier_part_number,
                sku_id: skuId,
                unit_price: match.unit_price,
                lead_time_days: match.lead_time_days,
                relationship_type: 'manufacturer',
                approval_status: 'approved',
                confidence_score: match.confidence_score,
                source_system: 'ai_catalog_import'
              });
              created++;
            } else {
              const evidencePack = await base44.entities.EvidencePack.create({
                pack_type: 'mapping',
                related_entity_type: 'SupplierPartMapping',
                confidence_level: match.confidence_score >= 70 ? 'medium' : 'low',
                summary: match.reasoning
              });

              await base44.entities.MappingReviewQueue.create({
                mapping_type: 'supplier_part',
                suggested_supplier_id: match.supplier_id,
                suggested_sku_id: skuId,
                confidence_score: match.confidence_score,
                ai_reasoning: match.reasoning,
                evidence_pack_id: evidencePack.id,
                status: 'pending',
                priority: match.confidence_score >= 70 ? 'medium' : 'low'
              });
              queued++;
            }
          }
        } catch (err) {
          console.error('Failed to process match:', match, err);
        }
      }

      toast.dismiss();
      toast.success(`✓ ${created} mappings created, ${queued} queued for review`);
      
      queryClient.invalidateQueries({ queryKey: ['supplier-part-mappings'] });
      queryClient.invalidateQueries({ queryKey: ['mapping-review-queue'] });
      queryClient.invalidateQueries({ queryKey: ['skus'] });
    } catch (error) {
      console.error('Catalog import error:', error);
      toast.dismiss();
      toast.error('Import failed: ' + (error.message || 'Unknown error'));
    } finally {
      setIsProcessing(false);
    }
  };

  const approveMappingMutation = useMutation({
    mutationFn: async (queueItem) => {
      const user = await base44.auth.me();
      
      const mapping = await base44.entities.SupplierPartMapping.create({
        supplier_id: queueItem.suggested_supplier_id,
        supplier_part_number: queueItem.source_record_id,
        sku_id: queueItem.suggested_sku_id,
        approval_status: 'approved',
        approved_by: user.email,
        approval_date: new Date().toISOString(),
        valid_from: new Date().toISOString().split('T')[0],
        confidence_score: queueItem.confidence_score,
        evidence_pack_id: queueItem.evidence_pack_id,
        relationship_type: 'manufacturer'
      });

      await base44.entities.MappingReviewQueue.update(queueItem.id, {
        status: 'approved',
        reviewed_by: user.email,
        review_date: new Date().toISOString()
      });

      await base44.entities.ChangeLog.create({
        entity_type: 'SupplierPartMapping',
        entity_id: mapping.id,
        change_type: 'create',
        change_reason: 'Approved from mapping workbench',
        approved_by: user.email
      });

      return mapping;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mapping-review-queue'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-part-mappings'] });
      toast.success('Mapping approved and activated');
    },
    onError: (error) => {
      toast.error('Failed to approve mapping: ' + (error.message || 'Unknown error'));
    }
  });

  const rejectMappingMutation = useMutation({
    mutationFn: async (id) => {
      const user = await base44.auth.me();
      return await base44.entities.MappingReviewQueue.update(id, {
        status: 'rejected',
        reviewed_by: user.email,
        review_date: new Date().toISOString()
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mapping-review-queue'] });
      toast.success('Mapping rejected');
    }
  });

  const createSKUMutation = useMutation({
    mutationFn: async (skuData) => {
      return await base44.entities.SKU.create(skuData);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['skus'] });
      toast.success(`SKU ${data.sku_code} created successfully`);
      setShowCreateSKU(false);
      setNewSKU({ sku_code: '', description: '', category: 'General' });
    },
    onError: (error) => {
      toast.error('Failed to create SKU: ' + (error.message || 'Unknown error'));
    }
  });

  return (
    <div className="space-y-4">
      {/* Create SKU Modal */}
      <Dialog open={showCreateSKU} onOpenChange={setShowCreateSKU}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Create New SKU</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>SKU Code *</Label>
              <Input
                value={newSKU.sku_code}
                onChange={(e) => setNewSKU({...newSKU, sku_code: e.target.value})}
                placeholder="e.g. PROD-001"
              />
            </div>
            <div>
              <Label>Description *</Label>
              <Input
                value={newSKU.description}
                onChange={(e) => setNewSKU({...newSKU, description: e.target.value})}
                placeholder="e.g. Widget Assembly"
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={newSKU.category} onValueChange={(v) => setNewSKU({...newSKU, category: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="General">General</SelectItem>
                  <SelectItem value="Raw Materials">Raw Materials</SelectItem>
                  <SelectItem value="Components">Components</SelectItem>
                  <SelectItem value="Finished Goods">Finished Goods</SelectItem>
                  <SelectItem value="Packaging">Packaging</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowCreateSKU(false)}>Cancel</Button>
            <Button 
              onClick={() => {
                if (!newSKU.sku_code || !newSKU.description) {
                  toast.error("Please fill in SKU code and description");
                  return;
                }
                createSKUMutation.mutate(newSKU);
              }}
              disabled={createSKUMutation.isPending}
            >
              {createSKUMutation.isPending ? 'Creating...' : 'Create SKU'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Header */}
      <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden p-6">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50/30 via-transparent to-[#86b027]/5 pointer-events-none"></div>
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#86b027]/20 to-[#86b027]/5 backdrop-blur-md border border-white/60 flex items-center justify-center shadow-[0_4px_16px_rgba(134,176,39,0.15)]">
              <Package className="w-6 h-6 text-[#86b027]" />
            </div>
            <div>
              <h2 className="text-2xl font-extralight text-slate-900">Product Mapping Workbench</h2>
              <p className="text-sm text-slate-500 mt-0.5 font-light">AI-powered supplier catalog and BOM mapping with approval workflows</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setShowCreateSKU(true)} className="rounded-lg border-slate-300 font-light">
              <Plus className="w-4 h-4 mr-2" />
              Create SKU
            </Button>
            <label htmlFor="catalog-upload">
              <Button size="sm" disabled={isProcessing} as="div" className="cursor-pointer rounded-lg bg-slate-900 hover:bg-slate-800 font-light">
                {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                Import Catalog
              </Button>
            </label>
            <input
              id="catalog-upload"
              type="file"
              className="hidden"
              accept=".xlsx,.xls,.csv"
              disabled={isProcessing}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleCatalogUpload(file);
                e.target.value = '';
              }}
            />
            <Button variant="outline" size="sm" onClick={() => {
              const csv = [
                ['supplier_name', 'supplier_part_number', 'description', 'manufacturer_part_number', 'unit_price', 'lead_time_days'].join(','),
                ['Example Corp', 'PART-001', 'Widget Assembly', 'MPN-123', '25.50', '30'].join(',')
              ].join('\n');
              const blob = new Blob([csv], { type: 'text/csv' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'supplier_catalog_template.csv';
              a.click();
              URL.revokeObjectURL(url);
              toast.success('Template downloaded');
            }} className="rounded-lg border-slate-300 font-light">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: "Pending Review", value: stats.pendingReview, icon: Clock, color: "text-amber-600" },
          { label: "High Confidence", value: stats.highConfidence, icon: Sparkles, color: "text-emerald-600" },
          { label: "Active Mappings", value: stats.activeMappings, icon: CheckCircle2, color: "text-[#02a1e8]" },
          { label: "Coverage", value: `${stats.coverage}%`, icon: BarChart3, color: "text-[#86b027]" }
        ].map((stat, i) => (
          <div 
            key={i} 
            className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:shadow-[0_20px_60px_rgba(0,0,0,0.16)] hover:-translate-y-2 transition-all duration-500 cursor-pointer overflow-hidden group"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-slate-50/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            <div className="relative p-6 text-center">
              <stat.icon className={cn("w-6 h-6 mx-auto mb-3", stat.color, "group-hover:scale-110 transition-transform")} />
              <p className="text-4xl font-extralight text-slate-900 mb-2">{stat.value}</p>
              <p className="text-xs text-slate-500 uppercase tracking-widest">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50/30 via-transparent to-transparent pointer-events-none"></div>
        <TabsList className="relative bg-transparent border-b border-white/40 w-full justify-start rounded-t-2xl p-0 h-auto backdrop-blur-sm">
          <TabsTrigger 
            value="review_queue"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 hover:bg-white/40 px-6 py-3 text-sm font-light text-slate-600 transition-all"
          >
            Review Queue ({stats.pendingReview})
          </TabsTrigger>
          <TabsTrigger 
            value="active_mappings"
            className="rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 hover:bg-white/40 px-6 py-3 text-sm font-light text-slate-600 transition-all"
          >
            Active Mappings ({stats.activeMappings})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="review_queue" className="p-6 relative">
          <div className="space-y-4">
            <h3 className="text-base font-extralight text-slate-900 uppercase tracking-widest mb-4">AI Mapping Suggestions</h3>
            {pendingMappings.map(item => {
              const supplier = suppliers.find(s => s.id === item.suggested_supplier_id);
              const sku = skus.find(s => s.id === item.suggested_sku_id);

              return (
                <div key={item.id} className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.16)] hover:-translate-y-1 transition-all duration-300 overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-50/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                  <div className="relative p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <div className="grid grid-cols-2 gap-6 mb-4">
                          <div>
                            <Badge variant="outline" className="mb-2 text-xs font-light border-slate-300">Supplier Part</Badge>
                            <p className="font-light text-slate-900">{supplier?.legal_name}</p>
                            <p className="text-sm text-slate-500 mt-1 font-light">Part #: {item.source_record_id}</p>
                          </div>
                          <div>
                            <Badge className="mb-2 text-xs bg-[#86b027]/10 text-[#86b027] border-[#86b027]/20 font-light">Internal SKU</Badge>
                            <p className="font-light text-slate-900">{sku?.sku_code}</p>
                            <p className="text-sm text-slate-500 mt-1 font-light">{sku?.description}</p>
                          </div>
                        </div>
                        <p className="text-xs text-slate-600 font-light">{item.ai_reasoning}</p>
                      </div>

                    <div className="text-right space-y-3">
                      <div>
                        <div className={cn(
                          "text-4xl font-extralight mb-2",
                          item.confidence_score >= 90 ? "text-emerald-600" :
                          item.confidence_score >= 75 ? "text-amber-600" :
                          "text-slate-600"
                        )}>
                          {item.confidence_score}<span className="text-xl">%</span>
                        </div>
                        <div className="h-1.5 bg-white/40 rounded-full w-24 overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-emerald-500 to-[#86b027] rounded-full transition-all"
                            style={{ width: `${item.confidence_score}%` }}
                          />
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2 pt-2">
                        <button
                          type="button"
                          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-all text-xs font-light shadow-sm hover:shadow-md"
                          onClick={() => approveMappingMutation.mutate(item)}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Approve
                        </button>
                        <button
                          type="button"
                          className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-md bg-white border border-slate-300 text-slate-700 hover:bg-slate-50 transition-all text-xs font-light"
                          onClick={() => rejectMappingMutation.mutate(item.id)}
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          Reject
                        </button>
                      </div>
                    </div>
                  </div>
                  </div>
                </div>
              );
            })}

            {pendingMappings.length === 0 && (
              <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] p-12 text-center">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-slate-100/60 backdrop-blur-md border border-white/60 flex items-center justify-center">
                  <Package className="w-10 h-10 text-slate-400" />
                </div>
                <p className="text-lg font-light text-slate-900 mb-2">No mappings pending review</p>
                <p className="text-sm text-slate-500">Import a supplier catalog to get started</p>
              </div>
            )}
          </div>
        </TabsContent>

        <TabsContent value="active_mappings" className="p-6 relative">
          <h3 className="text-base font-extralight text-slate-900 uppercase tracking-widest mb-4">Active Supplier Part Mappings</h3>
          <div className="space-y-3">
            {supplierMappings.slice(0, 20).map(mapping => {
              const supplier = suppliers.find(s => s.id === mapping.supplier_id);
              const sku = skus.find(s => s.id === mapping.sku_id);

              return (
                <div key={mapping.id} className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.16)] hover:-translate-y-1 transition-all duration-300 overflow-hidden group">
                  <div className="absolute inset-0 bg-gradient-to-br from-slate-50/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                  <div className="relative flex items-center justify-between p-5">
                    <div className="flex-1 grid grid-cols-3 gap-4">
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-widest font-light mb-1">Supplier</p>
                        <p className="font-light text-slate-900 text-sm">{supplier?.legal_name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-widest font-light mb-1">Part Number</p>
                        <p className="font-light text-slate-900 text-sm">{mapping.supplier_part_number}</p>
                      </div>
                      <div>
                        <p className="text-xs text-slate-500 uppercase tracking-widest font-light mb-1">Internal SKU</p>
                        <p className="font-light text-slate-900 text-sm">{sku?.sku_code}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge className={cn(
                        "text-xs font-light",
                        mapping.approval_status === 'approved' ? 'bg-emerald-100 text-emerald-700 border-emerald-200' :
                        'bg-amber-100 text-amber-700 border-amber-200'
                      )}>
                        {mapping.approval_status}
                      </Badge>
                      {mapping.valid_from && (
                        <span className="text-xs text-slate-500 font-light">
                          Since {new Date(mapping.valid_from).toLocaleDateString()}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}