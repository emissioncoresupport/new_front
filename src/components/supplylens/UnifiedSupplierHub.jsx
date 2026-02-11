import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Building2, Plus, Search, Filter, Download, Upload, 
  Zap, TrendingUp, AlertTriangle, CheckCircle, Clock,
  Network, Package, ShieldAlert, FileText, Settings, MapPin, ExternalLink, Database, GitMerge, Link2
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Import existing components
import SupplierTable from './SupplierTable';
import SupplierDetailModal from './SupplierDetailModal';
import UnifiedSupplierWizard from './UnifiedSupplierWizard';
import ProductMappingWorkbench from '../mdm/ProductMappingWorkbench';
import MasterDataDashboard from '../mdm/MasterDataDashboard';
import SupplierNetworkMap from '../supplychain/SupplierNetworkMap';
import ERPUniversalConnector from '../integration/ERPUniversalConnector';
import UnifiedOrchestrator from '../services/UnifiedOrchestrator';
import DataIngestionPipeline from '../services/DataIngestionPipeline';
import MultiTierNetworkVisualizer from './MultiTierNetworkVisualizer';
import SourceRecordManager from './SourceRecordManager';
import IdentityResolutionQueue from './IdentityResolutionQueue';
import MappingWorkbench from './MappingWorkbench';
import CoverageAnalyticsDashboard from './CoverageAnalyticsDashboard';
import IntegratedDashboard from './IntegratedDashboard';
import UnifiedMappingInterface from './UnifiedMappingInterface';
import DraggableDashboard from '../layout/DraggableDashboard';

export default function UnifiedSupplierHub() {
  const [view, setView] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [showWizard, setShowWizard] = useState(false);
  const [selectedSupplier, setSelectedSupplier] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showERPModal, setShowERPModal] = useState(false);

  const queryClient = useQueryClient();

  // Fetch all data with proper defaults
  const { data: suppliers = [], isLoading: suppliersLoading } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => base44.entities.Supplier.list('-created_date'),
    initialData: [],
    retry: 1,
    staleTime: 30000
  });

  const { data: sites = [] } = useQuery({
    queryKey: ['supplier-sites'],
    queryFn: () => base44.entities.SupplierSite.list(),
    initialData: [],
    enabled: true,
    retry: false
  });

  const { data: contacts = [] } = useQuery({
    queryKey: ['supplier-contacts'],
    queryFn: () => base44.entities.SupplierContact.list(),
    initialData: [],
    enabled: true,
    retry: false
  });

  const { data: skus = [] } = useQuery({
    queryKey: ['skus'],
    queryFn: () => base44.entities.SKU.list(),
    initialData: [],
    enabled: true,
    retry: false
  });

  const { data: mappings = [] } = useQuery({
    queryKey: ['supplier-sku-mappings'],
    queryFn: () => base44.entities.SupplierSKUMapping.list(),
    initialData: [],
    enabled: true,
    retry: false
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ['risk-alerts'],
    queryFn: () => base44.entities.RiskAlert.list('-created_date'),
    initialData: [],
    enabled: true,
    retry: false
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['onboarding-tasks'],
    queryFn: () => base44.entities.OnboardingTask.list('-created_date'),
    initialData: [],
    enabled: true,
    retry: false
  });

  const { data: materialSkus = [] } = useQuery({
    queryKey: ['material-skus'],
    queryFn: () => base44.entities.MaterialSKU.list(),
    initialData: [],
    enabled: true,
    retry: false
  });

  const { data: productSkus = [] } = useQuery({
    queryKey: ['product-skus'],
    queryFn: () => base44.entities.ProductSKU.list(),
    initialData: [],
    enabled: true,
    retry: false
  });

  const { data: bomItems = [] } = useQuery({
    queryKey: ['bom-items'],
    queryFn: () => base44.entities.BOMItem.list(),
    initialData: [],
    enabled: true,
    retry: false
  });

  const { data: evidenceDocs = [] } = useQuery({
    queryKey: ['documents'],
    queryFn: () => base44.entities.Document.list(),
    initialData: [],
    enabled: true,
    retry: false
  });

  const { data: sourceRecords = [] } = useQuery({
    queryKey: ['source-records'],
    queryFn: () => base44.entities.SourceRecord.list('-created_date'),
    initialData: [],
    enabled: true,
    retry: false
  });

  const { data: dedupeSuggestions = [] } = useQuery({
    queryKey: ['dedupe-suggestions'],
    queryFn: () => base44.entities.DedupeSuggestion.list('-created_date'),
    initialData: [],
    enabled: true,
    retry: false
  });

  const { data: mappingSuggestions = [] } = useQuery({
    queryKey: ['mapping-suggestions'],
    queryFn: () => base44.entities.DataMappingSuggestion.list('-created_date'),
    initialData: [],
    enabled: true,
    retry: false
  });

  // Calculate metrics with safe defaults - ensure arrays are always valid
  const safeSuppliers = Array.isArray(suppliers) ? suppliers : [];
  const safeMappings = Array.isArray(mappings) ? mappings : [];
  const safeTasks = Array.isArray(tasks) ? tasks : [];
  const safeAlerts = Array.isArray(alerts) ? alerts : [];

  const metrics = {
    total: safeSuppliers.length,
    active: safeSuppliers.filter(s => s?.status === 'active').length,
    onboarding: safeSuppliers.filter(s => s?.onboarding_status === 'in_progress').length,
    highRisk: safeSuppliers.filter(s => s?.risk_level === 'high' || s?.risk_level === 'critical').length,
    fullyMapped: safeSuppliers.filter(s => safeMappings.some(m => m?.supplier_id === s?.id)).length,
    unmapped: safeSuppliers.filter(s => !safeMappings.some(m => m?.supplier_id === s?.id)).length,
    pendingTasks: safeTasks.filter(t => t?.status === 'pending' || t?.status === 'in_progress').length,
    dataQuality: Math.round(safeSuppliers.reduce((acc, s) => acc + (s?.data_completeness || 0), 0) / (safeSuppliers.length || 1))
  };

  const avgDataQuality = metrics.dataQuality;

  const handleView = (supplier) => {
    setSelectedSupplier(supplier);
    setShowDetailModal(true);
  };

  const handleEdit = (supplier) => {
    setSelectedSupplier(supplier);
    setShowWizard(true);
  };

  const handleDelete = async (supplier) => {
    if (!confirm(`Delete ${supplier.legal_name}? This action cannot be undone.`)) {
      return;
    }

    try {
      await base44.entities.Supplier.delete(supplier.id);
      toast.success('Supplier deleted');
      queryClient.invalidateQueries({ queryKey: ['suppliers'] });
    } catch (error) {
      toast.error('Failed to delete supplier: ' + error.message);
    }
  };

  const filteredSuppliers = (Array.isArray(suppliers) ? suppliers : []).filter(s => 
    s?.legal_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s?.trade_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    s?.country?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-3 mt-6">
      {/* Header - Clean CBAM-style */}
      <div className="relative px-8 py-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-4 h-4 text-slate-400" />
              <span className="text-xs text-slate-400 uppercase tracking-widest font-light">Supply Chain Hub</span>
            </div>
            <h1 className="text-3xl font-light text-slate-900 mb-1">Master Data</h1>
            <p className="text-sm text-slate-500 font-light">Unified supplier intelligence and compliance management</p>
          </div>
          <div className="flex gap-2">
            <button 
              type="button"
              onClick={() => setShowWizard(true)}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-md bg-slate-900 text-white hover:bg-slate-800 transition-all duration-200 font-light text-sm tracking-wide"
            >
              <Plus className="w-4 h-4 stroke-[1.5]" />
              Smart Onboard
            </button>
            <label htmlFor="hub-bulk-upload" className="cursor-pointer">
              <div className="inline-flex items-center gap-2 px-5 py-2 rounded-md bg-white border border-slate-300 text-slate-900 hover:bg-slate-50 transition-all duration-200 font-light text-sm tracking-wide">
                <Download className="w-4 h-4 stroke-[1.5]" />
                Import
              </div>
            </label>
            <input
              id="hub-bulk-upload"
              type="file"
              className="hidden"
              accept=".xlsx,.xls,.csv,.pdf"
              multiple
              onChange={async (e) => {
              const files = Array.from(e.target.files || []);
              if (files.length === 0) return;

              const toastId = toast.loading(`Ingesting ${files.length} file(s)...`);

              try {
                const user = await base44.auth.me();

                for (const file of files) {
                  const { file_url } = await base44.integrations.Core.UploadFile({ file });

                  // Hash calculation
                  const arrayBuffer = await file.arrayBuffer();
                  const hashBuffer = await crypto.subtle.digest('SHA-256', arrayBuffer);
                  const hashArray = Array.from(new Uint8Array(hashBuffer));
                  const file_hash_sha256 = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

                  // Document record
                  const docRecord = await base44.entities.Document.create({
                    tenant_id: user.company_id,
                    object_type: 'SourceRecord',
                    object_id: 'pending',
                    file_name: file.name,
                    file_url,
                    file_hash_sha256,
                    file_size_bytes: file.size,
                    document_type: 'bulk_import',
                    uploaded_by: user.email,
                    uploaded_at: new Date().toISOString(),
                    status: 'processing'
                  });

                  // Ingest via unified pipeline
                  await DataIngestionPipeline.ingest('bulk_import', { file_url }, {
                    entityType: 'supplier',
                    documentIds: [docRecord.id],
                    autoProcess: false
                  });

                  const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
                    file_url,
                    json_schema: {
                      type: "array",
                      items: {
                        type: "object",
                        properties: {
                          legal_name: { type: "string" },
                          country: { type: "string" },
                          vat_number: { type: "string" },
                          email: { type: "string" }
                        }
                      }
                    }
                  });

                  if (result.status === 'success' && result.output) {
                    const suppliers = Array.isArray(result.output) ? result.output : [result.output];

                    // STRICT INGESTION PIPELINE: All data goes to source records FIRST
                    for (const data of suppliers) {
                      if (data.legal_name && data.country) {
                        await base44.entities.SourceRecord.create({
                          tenant_id: user.company_id,
                          source_system: 'bulk_import',
                          entity_type: 'supplier',
                          external_id: `${file_hash_sha256}_${data.legal_name}`,
                          source_data: data,
                          raw_payload: data,
                          document_ids: [docRecord.id],
                          status: 'pending_review',
                          ingested_at: new Date().toISOString(),
                          ingested_by: user.email
                        });
                      }
                    }
                  }

                  await base44.entities.Document.update(docRecord.id, { status: 'ingested' });
                }

                toast.dismiss(toastId);
                toast.success(`${files.length} file(s) ingested as source records - review to create suppliers`);
                queryClient.invalidateQueries({ queryKey: ['source-records'] });
              } catch (error) {
                toast.dismiss(toastId);
                toast.error('Ingestion failed: ' + error.message);
              }
                }}
              />
            <button 
              type="button"
              className="inline-flex items-center gap-2 px-5 py-2 rounded-md bg-white border border-slate-300 text-slate-900 hover:bg-slate-50 transition-all duration-200 font-light text-sm tracking-wide"
              onClick={async () => {
                const csv = 'Name,Country,VAT,Email\n' + suppliers.map(s => 
                  `"${s.legal_name}","${s.country}","${s.vat_number || ''}","${s.email || ''}"`
                ).join('\n');
                const blob = new Blob([csv], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'suppliers.csv';
                a.click();
                URL.revokeObjectURL(url);
                toast.success('Suppliers exported');
              }}
            >
              <Upload className="w-4 h-4 stroke-[1.5]" />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Search Bar & ERP Button - Tesla Minimal */}
      <div className="grid grid-cols-[1fr_auto] gap-3">
        <div className="bg-white rounded-lg border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <Input
              placeholder="Search suppliers, products, materials..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 border-0 bg-transparent text-sm h-9 focus-visible:ring-0 focus-visible:ring-offset-0 font-light"
            />
          </div>
        </div>
        <button 
          type="button"
          onClick={() => setShowERPModal(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-all duration-200 font-light text-xs tracking-wide shadow-sm whitespace-nowrap"
        >
          <Plus className="w-3.5 h-3.5 stroke-[1.5]" />
          Configure ERP
        </button>
      </div>

      {/* Navigation - Tesla Glassmorphic Tabs */}
      <div className="relative bg-white rounded-lg border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.08)] overflow-hidden">
        <Tabs value={view} onValueChange={setView}>
          <TabsList className="relative bg-transparent border-b border-slate-200 rounded-none h-auto p-0 w-full justify-start backdrop-blur-sm">
            <TabsTrigger 
              value="overview" 
              className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 hover:bg-slate-50/50 px-8 py-4 text-base font-light text-slate-500 transition-all tracking-wide"
            >
              <span className="relative z-10">Overview</span>
            </TabsTrigger>
            <TabsTrigger 
              value="suppliers" 
              className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 hover:bg-slate-50/50 px-8 py-4 text-base font-light text-slate-500 transition-all tracking-wide"
            >
              <span className="relative z-10">Suppliers</span>
            </TabsTrigger>
            <TabsTrigger 
              value="mappings" 
              className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 hover:bg-slate-50/50 px-8 py-4 text-base font-light text-slate-500 transition-all tracking-wide"
            >
              <span className="relative z-10">Mappings</span>
            </TabsTrigger>
            <TabsTrigger 
              value="onboarding" 
              className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 hover:bg-slate-50/50 px-8 py-4 text-base font-light text-slate-500 transition-all tracking-wide"
            >
              <span className="relative z-10">Onboarding</span>
            </TabsTrigger>
            <TabsTrigger 
              value="risk" 
              className="relative rounded-none border-b-2 border-transparent data-[state=active]:border-slate-900 data-[state=active]:bg-transparent data-[state=active]:text-slate-900 hover:bg-slate-50/50 px-8 py-4 text-base font-light text-slate-500 transition-all tracking-wide"
            >
              <span className="relative z-10">Risk & Readiness</span>
            </TabsTrigger>
          </TabsList>

        <TabsContent value="overview" className="mt-4 p-6">
          <IntegratedDashboard 
            onNavigate={setView}
            onViewSupplier={(s) => {
              setSelectedSupplier(s);
              setShowDetailModal(true);
            }}
          />
        </TabsContent>

        <TabsContent value="suppliers" className="mt-4 p-6">
          <div className="space-y-4">
            {/* Identity Review Section - Embedded Tesla Design */}
            {dedupeSuggestions.length > 0 && (
              <div className="relative bg-amber-50/60 backdrop-blur-xl border border-amber-300/40 rounded-lg p-4 shadow-[0_1px_3px_rgba(251,191,36,0.12)]">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-100/30 via-transparent to-transparent pointer-events-none rounded-lg"></div>
                <div className="relative flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    <span className="text-sm font-light text-amber-900">Identity Review Required</span>
                    <Badge className="bg-amber-600 font-light">{dedupeSuggestions.length}</Badge>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => document.getElementById('identity-drawer')?.classList.toggle('hidden')}
                    className="h-7 hover:bg-amber-100/40 text-xs font-light"
                  >
                    Review
                  </Button>
                </div>
                <div id="identity-drawer" className="hidden relative">
                  <IdentityResolutionQueue embedded />
                </div>
              </div>
            )}

            {/* Evidence Quick Access Panel - Tesla Design */}
            <div className="relative bg-white/60 backdrop-blur-xl rounded-lg border border-white/40 shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-4">
              <div className="absolute inset-0 bg-gradient-to-br from-white/40 via-transparent to-transparent pointer-events-none rounded-lg"></div>
              <div className="relative flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <FileText className="w-4 h-4 text-slate-600" />
                  <span className="text-sm font-light text-slate-900">Recent Evidence</span>
                  <Badge variant="outline" className="text-xs font-light border-slate-300">{evidenceDocs.length}</Badge>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => document.getElementById('evidence-drawer')?.classList.toggle('hidden')}
                  className="h-7 hover:bg-white/60 text-xs font-light"
                >
                  {document.getElementById('evidence-drawer')?.classList.contains('hidden') ? 'Show' : 'Hide'}
                </Button>
              </div>
              <div id="evidence-drawer" className="hidden relative">
                <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                  {evidenceDocs.slice(0, 6).map(doc => (
                    <div key={doc.id} className="flex items-center gap-2 p-2 bg-white/40 backdrop-blur-sm rounded-lg border border-white/60 hover:bg-white/70 hover:shadow-md transition-all cursor-pointer"
                      onClick={() => window.open(doc.file_url, '_blank')}>
                      <FileText className="w-3.5 h-3.5 text-slate-600 flex-shrink-0" />
                      <span className="truncate text-xs font-light text-slate-900">{doc.file_name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Quality Badges on Table */}
            <SupplierTable
              suppliers={filteredSuppliers}
              onView={handleView}
              onEdit={handleEdit}
              onDelete={handleDelete}
              isLoading={suppliersLoading}
              showQualityBadges={true}
            />
          </div>
        </TabsContent>

        <TabsContent value="mappings" className="mt-4 p-6">
          <div className="space-y-4">
            {/* Coverage Metrics - Tesla Design */}
            <div className="grid grid-cols-4 gap-3">
              <div className="bg-white rounded-lg border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-5 text-center hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] transition-shadow">
                <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-slate-50 flex items-center justify-center">
                  <Package className="w-5 h-5 text-slate-600" strokeWidth={1.5} />
                </div>
                <div className="text-3xl font-light text-slate-900 mb-1">{materialSkus.length}</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest font-light">Materials</div>
                <div className="text-[9px] text-slate-400 mt-0.5 font-light">in master data</div>
              </div>
              <div className="bg-white rounded-lg border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-5 text-center hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] transition-shadow">
                <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-slate-50 flex items-center justify-center">
                  <Database className="w-5 h-5 text-slate-600" strokeWidth={1.5} />
                </div>
                <div className="text-3xl font-light text-slate-900 mb-1">{productSkus.length}</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest font-light">Products</div>
                <div className="text-[9px] text-slate-400 mt-0.5 font-light">in catalog</div>
              </div>
              <div className="bg-white rounded-lg border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-5 text-center hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] transition-shadow">
                <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-slate-50 flex items-center justify-center">
                  <Link2 className="w-5 h-5 text-slate-600" strokeWidth={1.5} />
                </div>
                <div className="text-3xl font-light text-slate-900 mb-1">
                  {mappingSuggestions.length > 0 ? Math.round((mappingSuggestions.filter(m => m.status === 'approved').length / mappingSuggestions.length) * 100) : 0}%
                </div>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest font-light">Coverage</div>
                <div className="text-[9px] text-slate-400 mt-0.5 font-light">mapped relationships</div>
              </div>
              <div className="bg-white rounded-lg border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-5 text-center hover:shadow-[0_4px_12px_rgba(0,0,0,0.12)] transition-shadow">
                <div className="w-10 h-10 mx-auto mb-3 rounded-lg bg-slate-50 flex items-center justify-center">
                  <FileText className="w-5 h-5 text-slate-600" strokeWidth={1.5} />
                </div>
                <div className="text-3xl font-light text-slate-900 mb-1">{evidenceDocs.length}</div>
                <div className="text-[10px] text-slate-500 uppercase tracking-widest font-light">Evidence</div>
                <div className="text-[9px] text-slate-400 mt-0.5 font-light">supporting docs</div>
              </div>
            </div>

            <UnifiedMappingInterface />
          </div>
        </TabsContent>

        <TabsContent value="onboarding" className="mt-4 p-6">
          <div className="space-y-4">
            {/* Ingestion Pipeline Status */}
            <div className="relative bg-gradient-to-br from-[#86b027]/10 to-transparent backdrop-blur-xl rounded-2xl border border-[#86b027]/30 p-6">
              <h3 className="text-lg font-light text-slate-900 mb-2 flex items-center gap-2">
                <Database className="w-5 h-5 text-[#86b027]" />
                Ingestion Pipeline
              </h3>
              <p className="text-sm text-slate-600 mb-4">
                All data flows through source records first: ERP sync, CSV uploads, PDF extraction, and manual entry.
                Source records are immutable and track full lineage.
              </p>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-white/60 rounded-lg p-3 text-center">
                  <div className="text-2xl font-light text-slate-900">{sourceRecords.filter(s => s.status === 'pending_review').length}</div>
                  <div className="text-xs text-slate-500">Pending Review</div>
                </div>
                <div className="bg-white/60 rounded-lg p-3 text-center">
                  <div className="text-2xl font-light text-slate-900">{sourceRecords.filter(s => s.status === 'canonical').length}</div>
                  <div className="text-xs text-slate-500">Canonicalized</div>
                </div>
                <div className="bg-white/60 rounded-lg p-3 text-center">
                  <div className="text-2xl font-light text-slate-900">{sourceRecords.length}</div>
                  <div className="text-xs text-slate-500">Total Records</div>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={() => document.getElementById('source-drawer')?.classList.toggle('hidden')}
                className="mt-4 w-full border-[#86b027] text-[#86b027] hover:bg-[#86b027]/10"
              >
                <Database className="w-4 h-4 mr-2" />
                Review Source Records ({sourceRecords.filter(s => s.status === 'pending_review').length} pending)
              </Button>
            </div>

            {/* Source Records Drawer - Hidden by default */}
            <div id="source-drawer" className="hidden bg-white rounded-2xl border border-slate-200 p-6 shadow-lg">
              <SourceRecordManager />
            </div>



            <CoverageAnalyticsDashboard />
          </div>
        </TabsContent>

        <TabsContent value="risk" className="mt-4 p-6">
          <DataQualityDashboard suppliers={suppliers} materials={materialSkus} products={productSkus} onNavigate={setView} />
        </TabsContent>
      </Tabs>
      </div>

      {/* Modals */}
      {showERPModal && (
        <DraggableDashboard
          open={showERPModal}
          onClose={() => setShowERPModal(false)}
          title="ERP Configuration"
          icon={Database}
          width="900px"
          height="calc(100vh - 4rem)"
        >
          <ERPUniversalConnector />
        </DraggableDashboard>
      )}

      {showWizard && (
        <UnifiedSupplierWizard
          open={showWizard}
          onOpenChange={setShowWizard}
          supplier={selectedSupplier}
          onComplete={() => {
            setShowWizard(false);
            setSelectedSupplier(null);
            queryClient.invalidateQueries();
          }}
        />
      )}

      {selectedSupplier && (
        <SupplierDetailModal
          supplier={selectedSupplier}
          open={showDetailModal}
          onOpenChange={setShowDetailModal}
          onEdit={handleEdit}
          sites={sites}
          contacts={contacts}
          alerts={alerts}
          onboardingTasks={tasks}
          allSuppliers={suppliers}
          materialSkus={materialSkus}
          productSkus={productSkus}
          bomItems={bomItems}
          documents={evidenceDocs}
          onRefresh={() => queryClient.invalidateQueries()}
        />
      )}
    </div>
  );
}

// Network Map View
function NetworkMapView({ suppliers }) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.08)] p-6">
      <SupplierNetworkMap suppliers={suppliers} />
    </div>
  );
}

// Sites View
function SitesView({ sites, suppliers }) {
  return (
    <div className="space-y-4">
      {/* Header Card */}
      <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden p-6">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50/30 via-transparent to-[#86b027]/5 pointer-events-none"></div>
        <div className="relative flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#86b027]/20 to-[#86b027]/5 backdrop-blur-md border border-white/60 flex items-center justify-center shadow-[0_4px_16px_rgba(134,176,39,0.15)]">
            <MapPin className="w-6 h-6 text-[#86b027]" />
          </div>
          <div>
            <h2 className="text-2xl font-extralight text-slate-900">Supplier Sites</h2>
            <p className="text-sm text-slate-500 mt-0.5">{sites.length} locations tracked</p>
          </div>
        </div>
      </div>

      {sites.length === 0 ? (
        <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] p-12 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-slate-100/60 backdrop-blur-md border border-white/60 flex items-center justify-center">
            <MapPin className="w-10 h-10 text-slate-400" />
          </div>
          <p className="text-lg font-light text-slate-900 mb-2">No sites registered yet</p>
          <p className="text-sm text-slate-500">Add supplier sites to track manufacturing locations</p>
        </div>
      ) : (
        <div className="grid gap-4">
          {sites.map(site => {
            const supplier = suppliers.find(s => s.id === site.supplier_id);
            return (
              <div key={site.id} className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.16)] hover:-translate-y-1 transition-all duration-300 overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-slate-50/30 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                <div className="relative p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-lg font-light text-slate-900 mb-1">{site.name}</p>
                      <p className="text-sm text-slate-600 font-light mb-2">{supplier?.legal_name}</p>
                      <div className="flex items-center gap-2 text-sm text-slate-500">
                        <MapPin className="w-4 h-4" />
                        <span>{site.city}, {site.country}</span>
                      </div>
                    </div>
                    <Badge variant="outline" className="border-slate-300 text-slate-700 font-light capitalize">{site.site_type?.replace('_', ' ')}</Badge>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Evidence Vault View
function EvidenceVaultView({ documents }) {
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [filterType, setFilterType] = useState('all');

  const documentsBySupplier = React.useMemo(() => {
    const filtered = filterType === 'all' ? documents : documents.filter(d => d.document_type === filterType);
    const grouped = {};
    filtered.forEach(doc => {
      const supplierId = doc.object_type === 'Supplier' ? doc.object_id : 'other';
      if (!grouped[supplierId]) grouped[supplierId] = [];
      grouped[supplierId].push(doc);
    });
    return grouped;
  }, [documents, filterType]);

  return (
    <div className="space-y-4">
      {/* Header Card */}
      <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden p-6">
        <div className="absolute inset-0 bg-gradient-to-br from-slate-50/30 via-transparent to-[#02a1e8]/5 pointer-events-none"></div>
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#02a1e8]/20 to-[#02a1e8]/5 backdrop-blur-md border border-white/60 flex items-center justify-center shadow-[0_4px_16px_rgba(2,161,232,0.15)]">
              <FileText className="w-6 h-6 text-[#02a1e8]" />
            </div>
            <div>
              <h2 className="text-2xl font-extralight text-slate-900">Evidence Vault</h2>
              <p className="text-sm text-slate-500 mt-0.5">{documents.length} documents stored</p>
            </div>
          </div>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px] rounded-lg border-slate-200 text-sm font-light">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Documents</SelectItem>
              <SelectItem value="certificate">Certificates</SelectItem>
              <SelectItem value="declaration">Declarations</SelectItem>
              <SelectItem value="test_report">Test Reports</SelectItem>
              <SelectItem value="sds">Safety Data Sheets</SelectItem>
              <SelectItem value="invoice">Invoices</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {documents.length === 0 ? (
        <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] p-12 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-slate-100/60 backdrop-blur-md border border-white/60 flex items-center justify-center">
            <FileText className="w-10 h-10 text-slate-400" />
          </div>
          <p className="text-lg font-light text-slate-900 mb-2">No documents uploaded yet</p>
          <p className="text-sm text-slate-500">Upload compliance documents and certificates</p>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.entries(documentsBySupplier).map(([supplierId, docs]) => (
            <div key={supplierId} className="space-y-3">
              {docs.map(doc => (
                <div 
                  key={doc.id} 
                  className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:shadow-[0_16px_48px_rgba(0,0,0,0.16)] hover:-translate-y-1 transition-all duration-300 overflow-hidden group cursor-pointer"
                  onClick={() => setSelectedDoc(doc)}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-[#02a1e8]/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                  <div className="relative p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 flex-1">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#02a1e8]/20 to-[#02a1e8]/5 backdrop-blur-md border border-white/60 flex items-center justify-center">
                          <FileText className="w-5 h-5 text-[#02a1e8]" />
                        </div>
                        <div className="flex-1">
                          <p className="text-base font-light text-slate-900 mb-1">{doc.file_name}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <Badge variant="outline" className="text-xs capitalize border-slate-300 text-slate-700 font-light">
                              {doc.document_type?.replace('_', ' ')}
                            </Badge>
                            <span className="text-xs text-slate-500 font-light">
                              {new Date(doc.uploaded_at).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant={doc.status === 'verified' ? 'default' : 'secondary'} className="capitalize font-light">
                          {doc.status?.replace('_', ' ')}
                        </Badge>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            window.open(doc.file_url, '_blank');
                          }}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      {/* Document Detail Modal */}
      {selectedDoc && (
        <Dialog open={!!selectedDoc} onOpenChange={() => setSelectedDoc(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh]">
            <DialogHeader>
              <DialogTitle>{selectedDoc.file_name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <Label className="text-xs text-slate-500">Type</Label>
                  <p className="font-medium capitalize">{selectedDoc.document_type}</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Status</Label>
                  <Badge variant={selectedDoc.status === 'verified' ? 'default' : 'secondary'}>
                    {selectedDoc.status}
                  </Badge>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Uploaded</Label>
                  <p className="font-medium">{new Date(selectedDoc.uploaded_at).toLocaleString()}</p>
                </div>
                <div>
                  <Label className="text-xs text-slate-500">Hash (SHA-256)</Label>
                  <p className="font-mono text-xs">{selectedDoc.file_hash_sha256?.substring(0, 16)}...</p>
                </div>
              </div>
              <div className="border rounded-lg overflow-hidden">
                <iframe
                  src={selectedDoc.file_url}
                  className="w-full h-[500px]"
                  title={selectedDoc.file_name}
                />
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

// Data Quality Dashboard
function DataQualityDashboard({ suppliers, materials, products, onNavigate }) {
  const avgCompleteness = Math.round(
    suppliers.reduce((acc, s) => acc + (s.data_completeness || 0), 0) / (suppliers.length || 1)
  );

  const missingCriticalData = suppliers.filter(s => 
    !s.vat_number || !s.primary_contact_email || !s.country
  );

  return (
    <div className="space-y-4">
      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:shadow-[0_20px_60px_rgba(0,0,0,0.16)] hover:-translate-y-2 transition-all duration-500 overflow-hidden group cursor-pointer">
          <div className="absolute inset-0 bg-gradient-to-br from-[#86b027]/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
          <div className="relative p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-[#86b027]/20 to-[#86b027]/5 backdrop-blur-md border border-white/60 flex items-center justify-center shadow-[0_4px_16px_rgba(134,176,39,0.15)]">
              <Database className="w-6 h-6 text-[#86b027] group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-4xl font-extralight text-[#86b027] mb-2">{avgCompleteness}%</p>
            <p className="text-xs text-slate-500 uppercase tracking-widest">Completeness</p>
          </div>
        </div>

        <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:shadow-[0_20px_60px_rgba(0,0,0,0.16)] hover:-translate-y-2 transition-all duration-500 overflow-hidden group cursor-pointer">
          <div className="absolute inset-0 bg-gradient-to-br from-rose-500/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
          <div className="relative p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-rose-500/20 to-rose-500/5 backdrop-blur-md border border-white/60 flex items-center justify-center shadow-[0_4px_16px_rgba(244,63,94,0.15)]">
              <AlertTriangle className="w-6 h-6 text-rose-600 group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-4xl font-extralight text-rose-600 mb-2">{missingCriticalData.length}</p>
            <p className="text-xs text-slate-500 uppercase tracking-widest">Missing Data</p>
          </div>
        </div>

        <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:shadow-[0_20px_60px_rgba(0,0,0,0.16)] hover:-translate-y-2 transition-all duration-500 overflow-hidden group cursor-pointer">
          <div className="absolute inset-0 bg-gradient-to-br from-[#02a1e8]/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
          <div className="relative p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-[#02a1e8]/20 to-[#02a1e8]/5 backdrop-blur-md border border-white/60 flex items-center justify-center shadow-[0_4px_16px_rgba(2,161,232,0.15)]">
              <Building2 className="w-6 h-6 text-[#02a1e8] group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-4xl font-extralight text-slate-900 mb-2">{suppliers.length}</p>
            <p className="text-xs text-slate-500 uppercase tracking-widest">Suppliers</p>
          </div>
        </div>

        <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] hover:shadow-[0_20px_60px_rgba(0,0,0,0.16)] hover:-translate-y-2 transition-all duration-500 overflow-hidden group cursor-pointer">
          <div className="absolute inset-0 bg-gradient-to-br from-[#86b027]/5 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
          <div className="relative p-6 text-center">
            <div className="w-12 h-12 mx-auto mb-3 rounded-2xl bg-gradient-to-br from-[#86b027]/20 to-[#86b027]/5 backdrop-blur-md border border-white/60 flex items-center justify-center shadow-[0_4px_16px_rgba(134,176,39,0.15)]">
              <Package className="w-6 h-6 text-[#86b027] group-hover:scale-110 transition-transform" />
            </div>
            <p className="text-4xl font-extralight text-slate-900 mb-2">{materials.length}</p>
            <p className="text-xs text-slate-500 uppercase tracking-widest">Materials</p>
          </div>
        </div>
      </div>

      {/* Incomplete Data List */}
      <div className="relative bg-gradient-to-br from-white/60 via-white/40 to-white/30 backdrop-blur-3xl rounded-2xl border border-white/50 shadow-[0_8px_32px_rgba(0,0,0,0.12)] overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-amber-50/20 via-transparent to-transparent pointer-events-none"></div>
        <div className="relative p-6">
          <h3 className="text-xl font-extralight text-slate-900 mb-6">Suppliers with Incomplete Data</h3>
          <div className="space-y-3">
            {missingCriticalData.slice(0, 10).map(supplier => (
              <div key={supplier.id} className="relative bg-gradient-to-br from-amber-50/60 via-amber-50/40 to-amber-50/30 backdrop-blur-xl rounded-2xl border border-amber-300/40 shadow-[0_4px_16px_rgba(251,191,36,0.12)] hover:shadow-[0_12px_40px_rgba(251,191,36,0.20)] hover:-translate-y-1 transition-all duration-300 overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-100/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                <div className="relative p-5 flex items-center justify-between">
                  <div>
                    <p className="text-base font-light text-slate-900 mb-1">{supplier.legal_name}</p>
                    <p className="text-sm text-slate-600 font-light">
                      Missing: {[
                        !supplier.vat_number && 'VAT',
                        !supplier.primary_contact_email && 'Email',
                        !supplier.country && 'Country'
                      ].filter(Boolean).join(', ')}
                    </p>
                  </div>
                  <Badge className="bg-amber-600 text-white font-light">{supplier.data_completeness || 0}%</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}