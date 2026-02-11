import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { 
  Network, Link as LinkIcon, Unlink, CheckCircle2, AlertTriangle, Plus,
  Package, Building2, MapPin, Layers, ArrowRight, Search, Upload, Download,
  Sparkles, TrendingUp, Globe, Factory, Trash2, Edit2, Eye, Target, Share2, Database, Settings, FileText
} from "lucide-react";
import { toast } from "sonner";
import MultiTierNetwork from './MultiTierNetwork';
import BOMDocumentExtractor from './BOMDocumentExtractor';
import SmartMappingAI from './SmartMappingAI';
import MappingConflictResolver from './MappingConflictResolver';
import MasterDataDashboard from '../mdm/MasterDataDashboard';
import EntityResolutionEngine from '../mdm/EntityResolutionEngine';
import ProductMappingWorkbench from '../mdm/ProductMappingWorkbench';
import DataNormalizationEngine from '../mdm/DataNormalizationEngine';
import OnboardingCaseManager from '../mdm/OnboardingCaseManager';
import ERPConnectorHub from './ERPConnectorHub';

export default function MasterMappingHub({ suppliers }) {
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [showMappingModal, setShowMappingModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [showCreateSKUModal, setShowCreateSKUModal] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [showIntegrationHub, setShowIntegrationHub] = useState(false);
  const [selectedMapping, setSelectedMapping] = useState(null);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [newMapping, setNewMapping] = useState({
    supplier_id: '',
    sku_id: '',
    relationship_type: 'manufacturer',
    is_primary_supplier: true,
    lead_time_days: null,
    annual_volume: null,
    unit_price: null
  });
  const [newSKU, setNewSKU] = useState({
    sku_code: '',
    description: '',
    category: 'General'
  });

  const queryClient = useQueryClient();

  // Fetch all mapping-related data
  const { data: skus = [] } = useQuery({
    queryKey: ['skus'],
    queryFn: () => base44.entities.SKU.list()
  });

  const { data: mappings = [], isLoading: mappingsLoading } = useQuery({
    queryKey: ['supplier-sku-mappings'],
    queryFn: () => base44.entities.SupplierSKUMapping.list()
  });

  const { data: boms = [] } = useQuery({
    queryKey: ['boms'],
    queryFn: () => base44.entities.BillOfMaterials.list()
  });

  const { data: sites = [] } = useQuery({
    queryKey: ['supplier-sites'],
    queryFn: () => base44.entities.SupplierSite.list()
  });

  // Smart Mapping Hub data
  const { data: externalRecords = [] } = useQuery({
    queryKey: ['external-records'],
    queryFn: () => base44.entities.ExternalRecord.list()
  });

  const { data: suggestions = [] } = useQuery({
    queryKey: ['data-mapping-suggestions'],
    queryFn: () => base44.entities.DataMappingSuggestion.list()
  });

  const { data: conflicts = [] } = useQuery({
    queryKey: ['data-conflicts'],
    queryFn: () => base44.entities.DataConflict.list()
  });

  const pendingExternalRecords = externalRecords.filter(r => r.status === 'pending');

  // Mutations
  const createMappingMutation = useMutation({
    mutationFn: async (data) => {
      // Check for duplicate mapping
      const existingMapping = mappings.find(m => 
        m.supplier_id === data.supplier_id && m.sku_id === data.sku_id
      );
      
      if (existingMapping) {
        throw new Error('Mapping already exists between this supplier and SKU');
      }
      
      return await base44.entities.SupplierSKUMapping.create({
        ...data,
        mapping_confidence: 100,
        source_system: 'manual'
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-sku-mappings'] });
      toast.success("Mapping created successfully");
      setShowMappingModal(false);
      resetForm();
    },
    onError: (error) => {
      console.error('Mapping creation error:', error);
      toast.error(error.message || 'Failed to create mapping');
    }
  });

  const updateMappingMutation = useMutation({
    mutationFn: async ({ id, data }) => {
      return await base44.entities.SupplierSKUMapping.update(id, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-sku-mappings'] });
      toast.success("Mapping updated");
      setSelectedMapping(null);
    }
  });

  const deleteMappingMutation = useMutation({
    mutationFn: async (id) => {
      return await base44.entities.SupplierSKUMapping.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['supplier-sku-mappings'] });
      toast.success("Mapping deleted");
    }
  });

  const resetForm = () => {
    setNewMapping({
      supplier_id: '',
      sku_id: '',
      relationship_type: 'manufacturer',
      is_primary_supplier: true,
      lead_time_days: null,
      annual_volume: null,
      unit_price: null
    });
  };

  // Calculate mapping completeness & data quality
  const getMappingStats = () => {
    const suppliersWithMappings = new Set(mappings.map(m => m.supplier_id)).size;
    const skusWithMappings = new Set(mappings.map(m => m.sku_id)).size;
    const bomCoverage = skus.filter(sku => 
      boms.some(b => b.parent_sku_id === sku.id || b.child_sku_id === sku.id)
    ).length;

    // Data quality score based on completeness
    const mappingsWithPrice = mappings.filter(m => m.unit_price).length;
    const mappingsWithLeadTime = mappings.filter(m => m.lead_time_days).length;
    const mappingsWithVolume = mappings.filter(m => m.annual_volume).length;
    const dataQuality = mappings.length > 0 
      ? Math.round(((mappingsWithPrice + mappingsWithLeadTime + mappingsWithVolume) / (mappings.length * 3)) * 100)
      : 0;

    return {
      totalSuppliers: suppliers.length,
      mappedSuppliers: suppliersWithMappings,
      unmappedSuppliers: suppliers.length - suppliersWithMappings,
      supplierCoverage: suppliers.length > 0 ? Math.round((suppliersWithMappings / suppliers.length) * 100) : 0,
      totalSKUs: skus.length,
      mappedSKUs: skusWithMappings,
      unmappedSKUs: skus.length - skusWithMappings,
      skuCoverage: skus.length > 0 ? Math.round((skusWithMappings / skus.length) * 100) : 0,
      bomCoverage: skus.length > 0 ? Math.round((bomCoverage / skus.length) * 100) : 0,
      totalMappings: mappings.length,
      dataQuality,
      sitesAvg: suppliers.length > 0 ? (sites.length / suppliers.length).toFixed(1) : 0
    };
  };

  const stats = getMappingStats();

  const handleCreateMapping = () => {
    if (!newMapping.supplier_id || !newMapping.sku_id) {
      toast.error("Please select both supplier and SKU");
      return;
    }
    
    // Validate that selected supplier and SKU exist
    const supplierExists = suppliers.find(s => s.id === newMapping.supplier_id);
    const skuExists = skus.find(s => s.id === newMapping.sku_id);
    
    if (!supplierExists) {
      toast.error("Selected supplier not found");
      return;
    }
    
    if (!skuExists) {
      toast.error("Selected SKU not found");
      return;
    }
    
    createMappingMutation.mutate(newMapping);
  };

  const getSupplierName = (supplierId) => {
    const supplier = suppliers.find(s => s.id === supplierId);
    return supplier?.legal_name || 'Unknown';
  };

  const getSKUName = (skuId) => {
    const sku = skus.find(s => s.id === skuId);
    return sku ? `${sku.sku_code} - ${sku.description || ''}` : 'Unknown SKU';
  };

  const filteredMappings = mappings.filter(m => {
    const supplier = suppliers.find(s => s.id === m.supplier_id);
    const sku = skus.find(s => s.id === m.sku_id);
    const term = searchTerm.toLowerCase();
    return (
      supplier?.legal_name?.toLowerCase().includes(term) ||
      sku?.sku_code?.toLowerCase().includes(term) ||
      sku?.description?.toLowerCase().includes(term)
    );
  });

  const unmappedSuppliers = suppliers.filter(s => 
    !mappings.some(m => m.supplier_id === s.id)
  );

  const unmappedSKUs = skus.filter(s => 
    !mappings.some(m => m.sku_id === s.id)
  );

  const exportMappings = () => {
    const csv = [
      ['Supplier', 'SKU Code', 'SKU Description', 'Relationship', 'Primary', 'Lead Time (days)', 'Annual Volume', 'Unit Price'].join(','),
      ...mappings.map(m => {
        const supplier = suppliers.find(s => s.id === m.supplier_id);
        const sku = skus.find(s => s.id === m.sku_id);
        return [
          supplier?.legal_name || '',
          sku?.sku_code || '',
          sku?.description || '',
          m.relationship_type || '',
          m.is_primary_supplier ? 'Yes' : 'No',
          m.lead_time_days || '',
          m.annual_volume || '',
          m.unit_price || ''
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `supplier-sku-mappings-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    toast.success("Mappings exported");
  };

  // AI-Powered Auto-Mapping Engine
  const runAIAutoMapping = async () => {
    setIsAnalyzing(true);
    toast.loading("AI analyzing unmapped data...");
    
    try {
      const unmappedData = {
        suppliers: unmappedSuppliers.map(s => ({ id: s.id, name: s.legal_name, country: s.country, products: s.notes })),
        skus: unmappedSKUs.map(s => ({ id: s.id, code: s.sku_code, description: s.description }))
      };

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert supply chain mapping AI. Analyze this data and suggest optimal supplier-SKU mappings based on:
        1. Product/service alignment between supplier capabilities and SKU requirements
        2. Geographic proximity and logistics efficiency
        3. Industry standards and best practices
        
        Unmapped Suppliers: ${JSON.stringify(unmappedData.suppliers)}
        Unmapped SKUs: ${JSON.stringify(unmappedData.skus)}
        
        For each suggested mapping, provide: supplier_id, sku_id, relationship_type, confidence_score (0-100), reasoning`,
        response_json_schema: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  supplier_id: { type: "string" },
                  sku_id: { type: "string" },
                  relationship_type: { type: "string" },
                  confidence_score: { type: "number" },
                  reasoning: { type: "string" }
                }
              }
            }
          }
        }
      });

      setAiSuggestions(result.suggestions || []);
      toast.success(`AI found ${result.suggestions?.length || 0} smart mapping suggestions`);
      setShowAIAssistant(true);
    } catch (error) {
      toast.error("AI analysis failed: " + error.message);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Bulk Import from File
  const handleBulkImport = async (file) => {
    toast.loading("Processing bulk import...");
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "array",
          items: {
            type: "object",
            properties: {
              supplier_name: { type: "string" },
              sku_code: { type: "string" },
              relationship_type: { type: "string" },
              lead_time_days: { type: "number" },
              unit_price: { type: "number" }
            }
          }
        }
      });

      if (result.status === 'success' && result.output) {
        let created = 0;
        for (const row of result.output) {
          const supplier = suppliers.find(s => s.legal_name?.toLowerCase().includes(row.supplier_name?.toLowerCase()));
          const sku = skus.find(s => s.sku_code === row.sku_code);
          
          if (supplier && sku) {
            await base44.entities.SupplierSKUMapping.create({
              supplier_id: supplier.id,
              sku_id: sku.id,
              relationship_type: row.relationship_type || 'manufacturer',
              lead_time_days: row.lead_time_days,
              unit_price: row.unit_price,
              is_primary_supplier: false,
              source_system: 'bulk_import'
            });
            created++;
          }
        }
        toast.success(`Successfully imported ${created} mappings`);
        queryClient.invalidateQueries({ queryKey: ['supplier-sku-mappings'] });
      }
    } catch (error) {
      toast.error("Import failed: " + error.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-[#545454]">Master Mapping Hub</h2>
          <p className="text-slate-500">Single source of truth for Supplier ↔ SKU ↔ BOM ↔ Site relationships</p>
        </div>
        <div className="flex gap-3">
          <label htmlFor="bulk-upload-mappings">
            <Button variant="outline" type="button" asChild>
              <div className="cursor-pointer">
                <Upload className="w-4 h-4 mr-2" />
                Bulk Import
              </div>
            </Button>
          </label>
          <input
            id="bulk-upload-mappings"
            type="file"
            className="hidden"
            accept=".xlsx,.xls,.csv"
            onChange={(e) => e.target.files?.[0] && handleBulkImport(e.target.files[0])}
          />
          <Button variant="outline" onClick={exportMappings} disabled={mappings.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Export
          </Button>
          <Button 
            variant="outline"
            onClick={runAIAutoMapping}
            disabled={isAnalyzing || unmappedSuppliers.length === 0}
            className="border-purple-200 text-purple-700 hover:bg-purple-50"
          >
            <Sparkles className="w-4 h-4 mr-2" />
            AI Auto-Map
          </Button>
          <Button 
            onClick={() => setShowMappingModal(true)}
            className="bg-gradient-to-r from-[#86b027] to-[#769c22] hover:from-[#769c22] hover:to-[#86b027] text-white shadow-lg"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Mapping
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="border-slate-100 shadow-sm rounded-xl overflow-hidden">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-[#86b027]/10">
                <Building2 className="w-5 h-5 text-[#86b027]" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase">Supplier Coverage</p>
                <p className="text-2xl font-extrabold text-[#545454]">{stats.supplierCoverage}%</p>
                <p className="text-xs text-slate-500">{stats.mappedSuppliers}/{stats.totalSuppliers} mapped</p>
              </div>
            </div>
            <Progress value={stats.supplierCoverage} className="h-1.5 mt-3" />
          </CardContent>
        </Card>

        <Card className="border-slate-100 shadow-sm rounded-xl overflow-hidden">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-[#02a1e8]/10">
                <Package className="w-5 h-5 text-[#02a1e8]" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase">SKU Coverage</p>
                <p className="text-2xl font-extrabold text-[#545454]">{stats.skuCoverage}%</p>
                <p className="text-xs text-slate-500">{stats.mappedSKUs}/{stats.totalSKUs} mapped</p>
              </div>
            </div>
            <Progress value={stats.skuCoverage} className="h-1.5 mt-3" />
          </CardContent>
        </Card>

        <Card className="border-slate-100 shadow-sm rounded-xl overflow-hidden">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-indigo-100">
                <Layers className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase">BOM Coverage</p>
                <p className="text-2xl font-extrabold text-[#545454]">{stats.bomCoverage}%</p>
                <p className="text-xs text-slate-500">{boms.length} BOM lines</p>
              </div>
            </div>
            <Progress value={stats.bomCoverage} className="h-1.5 mt-3" />
          </CardContent>
        </Card>

        <Card className="border-slate-100 shadow-sm rounded-xl overflow-hidden">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-purple-100">
                <Target className="w-5 h-5 text-purple-600" />
              </div>
              <div>
                <p className="text-xs text-slate-500 font-bold uppercase">Data Quality</p>
                <p className="text-2xl font-extrabold text-[#545454]">{stats.dataQuality}%</p>
                <p className="text-xs text-slate-500">Completeness score</p>
              </div>
            </div>
            <Progress value={stats.dataQuality} className="h-1.5 mt-3" />
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="bg-white p-1.5 rounded-full border border-slate-100 inline-flex h-auto shadow-sm flex-wrap">
          <TabsTrigger value="mdm-dashboard" className="gap-2 rounded-full px-6 py-2.5 text-sm">
            <TrendingUp className="w-4 h-4" />
            MDM Dashboard
          </TabsTrigger>
          <TabsTrigger value="overview" className="gap-2 rounded-full px-6 py-2.5 text-sm">
            <Network className="w-4 h-4" />
            All Mappings ({stats.totalMappings})
          </TabsTrigger>
          <TabsTrigger value="product-workbench" className="gap-2 rounded-full px-6 py-2.5 text-sm">
            <Target className="w-4 h-4" />
            Product Workbench
          </TabsTrigger>
          <TabsTrigger value="entity-resolution" className="gap-2 rounded-full px-6 py-2.5 text-sm">
            <Share2 className="w-4 h-4" />
            Entity Resolution
          </TabsTrigger>
          <TabsTrigger value="normalization" className="gap-2 rounded-full px-6 py-2.5 text-sm">
            <Settings className="w-4 h-4" />
            Normalization
          </TabsTrigger>
          <TabsTrigger value="onboarding-cases" className="gap-2 rounded-full px-6 py-2.5 text-sm">
            <FileText className="w-4 h-4" />
            Onboarding Cases
          </TabsTrigger>
          <TabsTrigger value="multi-tier" className="gap-2 rounded-full px-6 py-2.5 text-sm">
            <Share2 className="w-4 h-4" />
            Multi-Tier Network
          </TabsTrigger>
          <TabsTrigger value="ai-extract" className="gap-2 rounded-full px-6 py-2.5 text-sm">
            <Sparkles className="w-4 h-4" />
            AI BOM Extractor
          </TabsTrigger>
          <TabsTrigger value="smart-matching" className="gap-2 rounded-full px-6 py-2.5 text-sm">
            <Database className="w-4 h-4" />
            Smart Mapping ({pendingExternalRecords.length})
          </TabsTrigger>
          <TabsTrigger value="conflicts" className="gap-2 rounded-full px-6 py-2.5 text-sm">
            <AlertTriangle className="w-4 h-4" />
            Conflicts ({conflicts.filter(c => c.status === 'open').length})
          </TabsTrigger>
        </TabsList>

        {/* MDM Dashboard Tab */}
        <TabsContent value="mdm-dashboard" className="mt-6">
          <MasterDataDashboard />
        </TabsContent>

        {/* Product Workbench Tab */}
        <TabsContent value="product-workbench" className="mt-6">
          <ProductMappingWorkbench />
        </TabsContent>

        {/* Entity Resolution Tab */}
        <TabsContent value="entity-resolution" className="mt-6">
          <EntityResolutionEngine />
        </TabsContent>

        {/* Normalization Tab */}
        <TabsContent value="normalization" className="mt-6">
          <DataNormalizationEngine />
        </TabsContent>

        {/* Onboarding Cases Tab */}
        <TabsContent value="onboarding-cases" className="mt-6">
          <OnboardingCaseManager />
        </TabsContent>

        {/* All Mappings Tab */}
        <TabsContent value="overview" className="mt-6">
          <Card className="border-slate-100 shadow-sm rounded-2xl">
            <CardHeader className="border-b border-slate-100">
              <div className="flex justify-between items-center">
                <CardTitle className="text-lg font-bold text-[#545454]">Active Supplier-SKU Mappings</CardTitle>
                <Input 
                  placeholder="Search mappings..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64"
                  icon={<Search className="w-4 h-4" />}
                />
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[600px] overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 sticky top-0 z-10">
                    <tr>
                      <th className="text-left p-4 text-xs font-bold text-[#545454] uppercase">Supplier</th>
                      <th className="text-left p-4 text-xs font-bold text-[#545454] uppercase">SKU</th>
                      <th className="text-center p-4 text-xs font-bold text-[#545454] uppercase">Relationship</th>
                      <th className="text-center p-4 text-xs font-bold text-[#545454] uppercase">Primary</th>
                      <th className="text-center p-4 text-xs font-bold text-[#545454] uppercase">Lead Time</th>
                      <th className="text-center p-4 text-xs font-bold text-[#545454] uppercase">Data Quality</th>
                      <th className="text-right p-4 text-xs font-bold text-[#545454] uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {mappingsLoading ? (
                      <tr><td colSpan="7" className="text-center py-12 text-slate-400">Loading...</td></tr>
                    ) : filteredMappings.length === 0 ? (
                      <tr><td colSpan="7" className="text-center py-12 text-slate-400">No mappings found</td></tr>
                    ) : (
                      filteredMappings.map(mapping => {
                        const supplier = suppliers.find(s => s.id === mapping.supplier_id);
                        const sku = skus.find(s => s.id === mapping.sku_id);
                        const quality = [mapping.unit_price, mapping.lead_time_days, mapping.annual_volume].filter(Boolean).length;
                        
                        return (
                          <tr key={mapping.id} className="hover:bg-slate-50 transition-colors">
                            <td className="p-4">
                              <div>
                                <p className="font-medium text-[#545454]">{supplier?.legal_name || 'Unknown'}</p>
                                <p className="text-xs text-slate-500">{supplier?.country}</p>
                              </div>
                            </td>
                            <td className="p-4">
                              <div>
                                <p className="font-medium text-[#545454]">{sku?.sku_code || 'Unknown'}</p>
                                <p className="text-xs text-slate-500 max-w-[200px] truncate">{sku?.description}</p>
                              </div>
                            </td>
                            <td className="p-4 text-center">
                              <Badge variant="outline" className="capitalize text-xs">
                                {mapping.relationship_type?.replace('_', ' ')}
                              </Badge>
                            </td>
                            <td className="p-4 text-center">
                              {mapping.is_primary_supplier ? (
                                <CheckCircle2 className="w-4 h-4 text-[#86b027] mx-auto" />
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                            <td className="p-4 text-center">
                              {mapping.lead_time_days ? (
                                <span className="text-sm text-slate-600">{mapping.lead_time_days}d</span>
                              ) : (
                                <span className="text-slate-300">—</span>
                              )}
                            </td>
                            <td className="p-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${
                                  quality === 3 ? 'bg-[#86b027]' :
                                  quality === 2 ? 'bg-amber-500' :
                                  'bg-rose-500'
                                }`} />
                                <span className="text-xs text-slate-600">{quality}/3</span>
                              </div>
                            </td>
                            <td className="p-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  onClick={() => setSelectedMapping(mapping)}
                                  className="h-8 w-8 p-0"
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="ghost"
                                  onClick={() => deleteMappingMutation.mutate(mapping.id)}
                                  className="h-8 w-8 p-0 text-rose-500 hover:text-rose-700"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Multi-Tier Network Tab */}
        <TabsContent value="multi-tier" className="mt-6">
          <MultiTierNetwork suppliers={suppliers} />
        </TabsContent>

        {/* AI BOM Extractor Tab */}
        <TabsContent value="ai-extract" className="mt-6">
          <BOMDocumentExtractor suppliers={suppliers} />
        </TabsContent>

        {/* Smart Mapping Tab */}
        <TabsContent value="smart-matching" className="mt-6">
          <SmartMappingAI />
        </TabsContent>

        {/* Conflicts Tab */}
        <TabsContent value="conflicts" className="mt-6">
          <MappingConflictResolver />
        </TabsContent>

        {/* Unmapped Suppliers Tab */}
        <TabsContent value="unmapped-suppliers" className="mt-6">
          <Card className="border-slate-100 shadow-sm rounded-2xl">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-lg font-bold text-[#545454]">Suppliers Without Mappings</CardTitle>
              <CardDescription>These suppliers are not linked to any SKUs yet</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[500px] overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="text-left p-4 text-xs font-bold text-[#545454] uppercase">Supplier</th>
                      <th className="text-center p-4 text-xs font-bold text-[#545454] uppercase">Country</th>
                      <th className="text-center p-4 text-xs font-bold text-[#545454] uppercase">Tier</th>
                      <th className="text-center p-4 text-xs font-bold text-[#545454] uppercase">Sites</th>
                      <th className="text-right p-4 text-xs font-bold text-[#545454] uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {unmappedSuppliers.map(supplier => (
                      <tr key={supplier.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4">
                          <p className="font-medium text-[#545454]">{supplier.legal_name}</p>
                        </td>
                        <td className="p-4 text-center">
                          <Badge variant="outline">{supplier.country}</Badge>
                        </td>
                        <td className="p-4 text-center">
                          <Badge className="bg-slate-100 text-slate-700">
                            Tier {supplier.tier?.replace('tier_', '')}
                          </Badge>
                        </td>
                        <td className="p-4 text-center">
                          <span className="text-sm text-slate-600">
                            {sites.filter(s => s.supplier_id === supplier.id).length}
                          </span>
                        </td>
                        <td className="p-4 text-right">
                          <Button 
                            size="sm"
                            onClick={() => {
                              setNewMapping({...newMapping, supplier_id: supplier.id});
                              setShowMappingModal(true);
                            }}
                            className="bg-[#86b027] hover:bg-[#769c22] text-white h-8 text-xs"
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Map SKU
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Unmapped SKUs Tab */}
        <TabsContent value="unmapped-skus" className="mt-6">
          <Card className="border-slate-100 shadow-sm rounded-2xl">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-lg font-bold text-[#545454]">SKUs Without Suppliers</CardTitle>
              <CardDescription>These products need supplier assignments for DPP compliance</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[500px] overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="text-left p-4 text-xs font-bold text-[#545454] uppercase">SKU Code</th>
                      <th className="text-left p-4 text-xs font-bold text-[#545454] uppercase">Description</th>
                      <th className="text-center p-4 text-xs font-bold text-[#545454] uppercase">Category</th>
                      <th className="text-right p-4 text-xs font-bold text-[#545454] uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {unmappedSKUs.map(sku => (
                      <tr key={sku.id} className="hover:bg-slate-50 transition-colors">
                        <td className="p-4">
                          <p className="font-medium text-[#545454]">{sku.sku_code}</p>
                        </td>
                        <td className="p-4">
                          <p className="text-sm text-slate-600">{sku.description || 'No description'}</p>
                        </td>
                        <td className="p-4 text-center">
                          <Badge variant="outline">{sku.category || 'Uncategorized'}</Badge>
                        </td>
                        <td className="p-4 text-right">
                          <Button 
                            size="sm"
                            onClick={() => {
                              setNewMapping({...newMapping, sku_id: sku.id});
                              setShowMappingModal(true);
                            }}
                            className="bg-[#86b027] hover:bg-[#769c22] text-white h-8 text-xs"
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Assign Supplier
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Sites Tab */}
        <TabsContent value="sites" className="mt-6">
          <Card className="border-slate-100 shadow-sm rounded-2xl">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-lg font-bold text-[#545454]">Production Sites & Facilities</CardTitle>
              <CardDescription>Validated manufacturing locations for DPP traceability</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="max-h-[500px] overflow-y-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="text-left p-4 text-xs font-bold text-[#545454] uppercase">Site Name</th>
                      <th className="text-left p-4 text-xs font-bold text-[#545454] uppercase">Supplier</th>
                      <th className="text-center p-4 text-xs font-bold text-[#545454] uppercase">Location</th>
                      <th className="text-center p-4 text-xs font-bold text-[#545454] uppercase">Type</th>
                      <th className="text-center p-4 text-xs font-bold text-[#545454] uppercase">Risk</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {sites.map(site => {
                      const supplier = suppliers.find(s => s.id === site.supplier_id);
                      return (
                        <tr key={site.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-4">
                            <div className="flex items-center gap-2">
                              <Factory className="w-4 h-4 text-slate-400" />
                              <p className="font-medium text-[#545454]">{site.site_name}</p>
                            </div>
                          </td>
                          <td className="p-4">
                            <p className="text-sm text-slate-600">{supplier?.legal_name || 'Unknown'}</p>
                          </td>
                          <td className="p-4 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <MapPin className="w-3 h-3 text-slate-400" />
                              <span className="text-sm text-slate-600">{site.city}, {site.country}</span>
                            </div>
                          </td>
                          <td className="p-4 text-center">
                            <Badge variant="outline" className="capitalize">
                              {site.facility_type?.replace('_', ' ')}
                            </Badge>
                          </td>
                          <td className="p-4 text-center">
                            {site.site_risk_score ? (
                              <div className="flex items-center justify-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${
                                  site.site_risk_score < 30 ? 'bg-[#86b027]' :
                                  site.site_risk_score < 60 ? 'bg-amber-500' :
                                  'bg-rose-500'
                                }`} />
                                <span className="text-sm text-slate-600">{site.site_risk_score}</span>
                              </div>
                            ) : (
                              <span className="text-slate-300">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Create/Edit Mapping Modal */}
      <Dialog open={showMappingModal} onOpenChange={setShowMappingModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#545454]">Create Supplier-SKU Mapping</DialogTitle>
            <DialogDescription>Link a supplier to a product for complete supply chain visibility</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Supplier *</Label>
                <Select value={newMapping.supplier_id} onValueChange={(v) => setNewMapping({...newMapping, supplier_id: v})}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select supplier..." />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.legal_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>SKU *</Label>
                <div className="flex gap-2 items-start">
                  <div className="flex-1 min-w-0">
                    <Select value={newMapping.sku_id} onValueChange={(v) => setNewMapping({...newMapping, sku_id: v})}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select SKU..." />
                      </SelectTrigger>
                      <SelectContent>
                        {skus.map(s => (
                          <SelectItem key={s.id} value={s.id}>{s.sku_code} - {s.description}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowCreateSKUModal(true)}
                    className="shrink-0 border-[#86b027] text-[#86b027] hover:bg-[#86b027]/10 whitespace-nowrap"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    New SKU
                  </Button>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Relationship Type</Label>
                <Select value={newMapping.relationship_type} onValueChange={(v) => setNewMapping({...newMapping, relationship_type: v})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="manufacturer">Manufacturer</SelectItem>
                    <SelectItem value="assembler">Assembler</SelectItem>
                    <SelectItem value="trader">Trader</SelectItem>
                    <SelectItem value="distributor">Distributor</SelectItem>
                    <SelectItem value="raw_material_supplier">Raw Material Supplier</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Lead Time (days)</Label>
                <Input 
                  type="number"
                  value={newMapping.lead_time_days || ''}
                  onChange={(e) => setNewMapping({...newMapping, lead_time_days: parseInt(e.target.value) || null})}
                  placeholder="e.g. 45"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Annual Volume</Label>
                <Input 
                  type="number"
                  value={newMapping.annual_volume || ''}
                  onChange={(e) => setNewMapping({...newMapping, annual_volume: parseInt(e.target.value) || null})}
                  placeholder="e.g. 10000"
                />
              </div>
              <div className="space-y-2">
                <Label>Unit Price (EUR)</Label>
                <Input 
                  type="number"
                  step="0.01"
                  value={newMapping.unit_price || ''}
                  onChange={(e) => setNewMapping({...newMapping, unit_price: parseFloat(e.target.value) || null})}
                  placeholder="e.g. 12.50"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="primary"
                checked={newMapping.is_primary_supplier}
                onChange={(e) => setNewMapping({...newMapping, is_primary_supplier: e.target.checked})}
                className="rounded"
              />
              <Label htmlFor="primary" className="cursor-pointer">Mark as primary supplier for this SKU</Label>
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setShowMappingModal(false)}>Cancel</Button>
            <Button 
              onClick={handleCreateMapping}
              disabled={createMappingMutation.isPending}
              className="bg-[#86b027] hover:bg-[#769c22] text-white"
            >
              {createMappingMutation.isPending ? 'Creating...' : 'Create Mapping'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Create SKU Modal */}
      <Dialog open={showCreateSKUModal} onOpenChange={setShowCreateSKUModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#545454]">Create New SKU</DialogTitle>
            <DialogDescription>Add a new product to your inventory</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>SKU Code *</Label>
              <Input
                value={newSKU.sku_code}
                onChange={(e) => setNewSKU({...newSKU, sku_code: e.target.value})}
                placeholder="e.g. PROD-001"
              />
            </div>
            <div className="space-y-2">
              <Label>Description *</Label>
              <Input
                value={newSKU.description}
                onChange={(e) => setNewSKU({...newSKU, description: e.target.value})}
                placeholder="e.g. Widget Assembly"
              />
            </div>
            <div className="space-y-2">
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
            <Button variant="outline" onClick={() => {
              setShowCreateSKUModal(false);
              setNewSKU({ sku_code: '', description: '', category: 'General' });
            }}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                if (!newSKU.sku_code || !newSKU.description) {
                  toast.error("Please fill in SKU code and description");
                  return;
                }
                try {
                  const createdSKU = await base44.entities.SKU.create({
                    sku_code: newSKU.sku_code,
                    description: newSKU.description,
                    category: newSKU.category,
                    status: 'active'
                  });
                  
                  await queryClient.invalidateQueries({ queryKey: ['skus'] });
                  await queryClient.refetchQueries({ queryKey: ['skus'] });
                  
                  setNewMapping(prev => ({...prev, sku_id: createdSKU.id}));
                  setShowCreateSKUModal(false);
                  setNewSKU({ sku_code: '', description: '', category: 'General' });
                  toast.success(`SKU ${newSKU.sku_code} created and selected`);
                } catch (error) {
                  console.error("SKU creation error:", error);
                  toast.error(`Failed to create SKU: ${error.message || 'Unknown error'}`);
                }
              }}
              className="bg-[#86b027] hover:bg-[#769c22] text-white"
            >
              Create SKU
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* View/Edit Mapping Details Modal */}
      {selectedMapping && (
        <Dialog open={!!selectedMapping} onOpenChange={() => setSelectedMapping(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold text-[#545454]">Mapping Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-xs font-bold text-slate-500 uppercase mb-1">Supplier</p>
                  <p className="font-bold text-[#545454]">{getSupplierName(selectedMapping.supplier_id)}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-xs font-bold text-slate-500 uppercase mb-1">SKU</p>
                  <p className="font-bold text-[#545454]">{getSKUName(selectedMapping.sku_id)}</p>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-xs font-bold text-slate-500 uppercase mb-1">Lead Time</p>
                  <p className="font-bold text-[#545454]">{selectedMapping.lead_time_days ? `${selectedMapping.lead_time_days} days` : '—'}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-xs font-bold text-slate-500 uppercase mb-1">Annual Volume</p>
                  <p className="font-bold text-[#545454]">{selectedMapping.annual_volume || '—'}</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-lg">
                  <p className="text-xs font-bold text-slate-500 uppercase mb-1">Unit Price</p>
                  <p className="font-bold text-[#545454]">{selectedMapping.unit_price ? `€${selectedMapping.unit_price}` : '—'}</p>
                </div>
              </div>
              <div className="p-4 bg-slate-50 rounded-lg">
                <p className="text-xs font-bold text-slate-500 uppercase mb-1">Relationship Type</p>
                <Badge className="capitalize">{selectedMapping.relationship_type?.replace('_', ' ')}</Badge>
                {selectedMapping.is_primary_supplier && (
                  <Badge className="ml-2 bg-[#86b027] text-white">Primary Supplier</Badge>
                )}
              </div>
            </div>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setSelectedMapping(null)}>Close</Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* AI Assistant Modal */}
      <Dialog open={showAIAssistant} onOpenChange={setShowAIAssistant}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-purple-700 flex items-center gap-2">
              <Sparkles className="w-5 h-5" />
              AI Mapping Suggestions
            </DialogTitle>
            <DialogDescription>
              Smart recommendations based on supplier capabilities, SKU requirements, and industry best practices
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {aiSuggestions.map((suggestion, idx) => {
              const supplier = suppliers.find(s => s.id === suggestion.supplier_id);
              const sku = skus.find(s => s.id === suggestion.sku_id);
              const confidence = suggestion.confidence_score || 0;
              
              return (
                <div key={idx} className="p-4 border rounded-lg hover:bg-slate-50 transition-colors">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <Badge className="bg-[#86b027] text-white">{supplier?.legal_name}</Badge>
                        <ArrowRight className="w-4 h-4 text-slate-400" />
                        <Badge variant="outline">{sku?.sku_code}</Badge>
                      </div>
                      <p className="text-sm text-slate-600">{suggestion.reasoning}</p>
                    </div>
                    <div className="text-right ml-4">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${
                          confidence >= 80 ? 'bg-green-500' :
                          confidence >= 60 ? 'bg-amber-500' :
                          'bg-slate-400'
                        }`} />
                        <span className="text-sm font-bold">{confidence}%</span>
                      </div>
                      <span className="text-xs text-slate-500">confidence</span>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button 
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        // Reject suggestion - could log this for learning
                        setAiSuggestions(aiSuggestions.filter((_, i) => i !== idx));
                        toast.info("Suggestion dismissed");
                      }}
                    >
                      Dismiss
                    </Button>
                    <Button 
                      size="sm"
                      className="bg-[#86b027] hover:bg-[#769c22]"
                      onClick={async () => {
                        try {
                          await base44.entities.SupplierSKUMapping.create({
                            supplier_id: suggestion.supplier_id,
                            sku_id: suggestion.sku_id,
                            relationship_type: suggestion.relationship_type || 'manufacturer',
                            is_primary_supplier: false,
                            mapping_confidence: confidence,
                            source_system: 'ai_suggestion'
                          });
                          setAiSuggestions(aiSuggestions.filter((_, i) => i !== idx));
                          queryClient.invalidateQueries({ queryKey: ['supplier-sku-mappings'] });
                          toast.success("Mapping created from AI suggestion");
                        } catch (error) {
                          toast.error("Failed to create mapping");
                        }
                      }}
                    >
                      Accept & Create
                    </Button>
                  </div>
                </div>
              );
            })}
            {aiSuggestions.length === 0 && (
              <div className="text-center py-12 text-slate-400">
                <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-30" />
                <p>No AI suggestions available</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}