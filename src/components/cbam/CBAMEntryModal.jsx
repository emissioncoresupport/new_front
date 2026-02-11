import React, { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { toast } from "sonner";
import CBAMCalculationService from './services/CBAMCalculationService';
import CBAMOrchestrator from './services/CBAMOrchestrator';
import { 
  Upload, FileText, Calculator, Sparkles, AlertCircle, CheckCircle2, 
  Globe, ArrowRight, Loader2, Building2, GripVertical, X, Package
} from "lucide-react";
import CNCodeAutocomplete from './CNCodeAutocomplete';
import PrecursorInputPanel from './PrecursorInputPanel';
import { getDefaultEmissions, getMarkupDescription } from './constants/euDefaultValues2025';
import CBAMDocumentViewer from './CBAMDocumentViewer';
import CalculationMethodBadge from './ui/CalculationMethodBadge';
import PrecursorRequirementBadge from './ui/PrecursorRequirementBadge';
import SubmissionGatePanel from './ui/SubmissionGatePanel';
import { CBAMSubmissionGate } from './services/lifecycle/CBAMSubmissionGate';
import { ConservativePreviewService } from './services/lifecycle/ConservativePreviewService';
import { CBAMUIStateMachine } from './services/lifecycle/CBAMUIStateMachine';
import { StateTransitionValidator } from './ui/StateTransitionValidator';
import CBAMEntryStateMachineUI from './ui/CBAMEntryStateMachineUI';
import StateAwareField from './ui/StateAwareField';
import { isComplexGood, getDefaultPrecursorsForGood } from './constants/complexGoodsMappings';

export default function CBAMEntryModal({ open, onOpenChange, initialData, clients }) {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('import');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showSupplierSearch, setShowSupplierSearch] = useState(false);
  const [supplierSearchQuery, setSupplierSearchQuery] = useState('');
  const [uploadedFile, setUploadedFile] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [calculation, setCalculation] = useState({
    totalEmissions: 0,
    certificatesRequired: 0,
    estimatedCost: 0,
    payable: 0
  });
  const [viewingDocument, setViewingDocument] = useState(null);
  const [isDocViewerOpen, setIsDocViewerOpen] = useState(false);

  // Draggable state
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const modalRef = useRef(null);

  useEffect(() => {
    if (open) {
      setPosition({ x: 0, y: 0 });
    }
  }, [open]);

  // Form State
  const [formData, setFormData] = useState({
    import_id: `IMP-2026-${Math.floor(Math.random() * 10000)}`,
    eori_number: '',
    declarant_name: '',
    import_date: new Date().toISOString().split('T')[0],
    country_of_origin: '',
    cn_code: '',
    product_name: '',
    quantity: 0,
    calculation_method: 'Default_values',
    production_route: '',
    direct_emissions_specific: 0,
    indirect_emissions_specific: 0,
    carbon_price_due_paid: 0,
    aggregated_goods_category: 'Iron & Steel',
    reporting_period_year: 2026,
    functional_unit: 'tonnes',
    language: 'English',
    precursors_used: []
  });

  // STATE MACHINE
  const stateMachine = CBAMEntryStateMachineUI({ entry: formData, onChange: setFormData, onSubmit: null });
  const currentState = stateMachine.currentState;
  const rules = stateMachine.rules;

  // CONSERVATIVE PREVIEW: Calculate worst-case compliant assumptions
  useEffect(() => {
    if (!formData.cn_code) {
      setCalculation({ 
        totalEmissions: 0, 
        certificatesRequired: 0, 
        estimatedCost: 0, 
        payable: 0,
        isConservative: true,
        warnings: ['CN code required']
      });
      return;
    }

    // Use ConservativePreviewService for worst-case compliance assumptions
    const preview = ConservativePreviewService.calculateConservativePreview({
      ...formData,
      quantity: parseFloat(formData.quantity) || 0,
      direct_emissions_specific: parseFloat(formData.direct_emissions_specific) || 0,
      indirect_emissions_specific: parseFloat(formData.indirect_emissions_specific) || 0,
      reporting_period_year: formData.reporting_period_year || 2026
    });

    setCalculation(preview);
  }, [formData.quantity, formData.cn_code, formData.direct_emissions_specific, formData.indirect_emissions_specific, formData.verification_status, formData.production_route, formData.reporting_period_year]);

  // Auto-populate defaults
  useEffect(() => {
    if (
      formData.calculation_method === 'Default_values' && 
      formData.cn_code && 
      formData.production_route && 
      formData.country_of_origin &&
      (!formData.direct_emissions_specific || formData.direct_emissions_specific === 0)
    ) {
      const defaults = getDefaultEmissions(formData.cn_code, formData.production_route, formData.country_of_origin);
      
      if (defaults) {
        setFormData(prev => ({
          ...prev,
          direct_emissions_specific: defaults.direct_emissions,
          indirect_emissions_specific: defaults.indirect_emissions
        }));
        
        toast.success(
          `Default values applied: ${getMarkupDescription(formData.country_of_origin)}`,
          { duration: 3000 }
        );
      }
    }
  }, [formData.cn_code, formData.production_route, formData.country_of_origin, formData.calculation_method]);

  const createEntryMutation = useMutation({
    mutationFn: async (data) => {
      const user = await base44.auth.me();
      const users = await base44.entities.User.list();
      const fullUser = users.find(u => u.email === user.email);
      
      const entryData = {
        ...data,
        company_id: fullUser?.company_id
      };
      
      if (initialData?.id) {
        return base44.entities.CBAMEmissionEntry.update(initialData.id, entryData);
      }
      return base44.entities.CBAMEmissionEntry.create(entryData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cbam-emission-entries'] });
      toast.success(initialData ? "Import declaration updated" : "Import declaration created successfully");
      onOpenChange(false);
    },
    onError: () => toast.error("Failed to save import declaration")
  });

  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers-list'],
    queryFn: () => base44.entities.Supplier.list()
  });

  const { data: supplierSubmissions = [] } = useQuery({
    queryKey: ['supplier-cbam-submissions'],
    queryFn: () => base44.entities.SupplierCBAMSubmission.list()
  });

  const { data: supplierPCFs = [] } = useQuery({
    queryKey: ['supplier-pcfs'],
    queryFn: () => base44.entities.SupplierPCF.list()
  });

  useEffect(() => {
    if (initialData) {
      setFormData({
        ...initialData,
        import_id: initialData.import_id || `IMP-2026-${Math.floor(Math.random() * 10000)}`,
        documents: initialData.documents || [],
        reporting_period_year: initialData.reporting_period_year || 2026
      });
      setDocuments(initialData.documents || []);
      setActiveTab('basic');
    } else if (!open) {
       setDocuments([]);
       setUploadedFile(null);
       setFormData({
         import_id: `IMP-2026-${Math.floor(Math.random() * 10000)}`,
         eori_number: '',
         declarant_name: '',
         import_date: new Date().toISOString().split('T')[0],
         country_of_origin: '',
         cn_code: '',
         product_name: '',
         quantity: 0,
         calculation_method: 'Default_values',
         production_route: '',
         direct_emissions_specific: 0,
         indirect_emissions_specific: 0,
         carbon_price_due_paid: 0,
         aggregated_goods_category: 'Iron & Steel',
         reporting_period_year: 2026,
         functional_unit: 'tonnes',
         language: 'English',
         precursors_used: []
       });
    }
  }, [initialData, open]);

  const handleInputChange = (field, value) => {
    // STATE MACHINE: Validate action before allowing edit
    const validation = StateTransitionValidator.validateAction(currentState, `edit_${field}`, formData);
    
    if (!validation.allowed) {
      toast.error(`Cannot edit ${field}: ${validation.reason}`);
      return;
    }

    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSearchSuppliers = () => {
    setShowSupplierSearch(true);
    setSupplierSearchQuery('');
  };

  const getFilteredSuppliers = () => {
    let filtered = [...suppliers];
    
    if (supplierSearchQuery && supplierSearchQuery.trim()) {
      const query = supplierSearchQuery.toLowerCase().trim();
      filtered = filtered.filter(s => 
        (s.legal_name?.toLowerCase().includes(query)) ||
        (s.trade_name?.toLowerCase().includes(query)) ||
        (s.email?.toLowerCase().includes(query)) ||
        (s.company_name?.toLowerCase().includes(query))
      );
    }
    
    if (formData.country_of_origin && !supplierSearchQuery) {
      filtered = filtered.filter(s => 
        s.country === formData.country_of_origin || 
        s.country_of_origin === formData.country_of_origin
      );
    }
    
    return filtered;
  };

  const handleSelectSupplier = async (supplier) => {
    setShowSupplierSearch(false);
    
    const supplierSubmissions_filtered = supplierSubmissions.filter(s => s.supplier_id === supplier.id && s.verification_status === 'verified');
    const supplierPCFs_filtered = supplierPCFs.filter(p => p.supplier_id === supplier.id && p.verification_status === 'verified');
    
    let bestSubmission = formData.cn_code ? 
      supplierSubmissions_filtered.find(s => s.cn_code === formData.cn_code) : null;
    
    let bestPCF = formData.cn_code ? 
      supplierPCFs_filtered.find(p => p.cn_code === formData.cn_code) : null;
    
    if (!bestSubmission && supplierSubmissions_filtered.length > 0) {
      bestSubmission = supplierSubmissions_filtered[0];
    }
    
    if (!bestPCF && supplierPCFs_filtered.length > 0) {
      bestPCF = supplierPCFs_filtered[0];
    }

    const updates = {
      supplier_id: supplier.id,
      supplier_name: supplier.legal_name || supplier.trade_name,
      supplier_email: supplier.email
    };

    if (!formData.country_of_origin) {
      updates.country_of_origin = supplier.country_of_origin || supplier.country;
    }

    if (bestSubmission) {
      updates.direct_emissions_specific = bestSubmission.direct_emissions;
      updates.indirect_emissions_specific = bestSubmission.indirect_emissions || 0;
      updates.calculation_method = 'EU_method';
      updates.production_route = '';
      
      if (!formData.product_name && bestSubmission.product_name) {
        updates.product_name = bestSubmission.product_name;
      }
      if (!formData.cn_code && bestSubmission.cn_code) {
        updates.cn_code = bestSubmission.cn_code;
        updates.goods_nomenclature = bestSubmission.product_name || '';
      }
      
      toast.success(`✓ Verified data from ${supplier.legal_name || supplier.trade_name}`, {
        description: `${bestSubmission.direct_emissions.toFixed(3)} tCO2e/t direct • EU Method`
      });
    } else if (bestPCF) {
      updates.direct_emissions_specific = bestPCF.direct_emissions || 0;
      updates.indirect_emissions_specific = bestPCF.indirect_emissions || 0;
      updates.calculation_method = 'EU_method';
      updates.production_route = '';
      
      toast.success(`✓ PCF data from ${supplier.legal_name || supplier.trade_name}`);
    } else {
      toast.warning(`Supplier linked: ${supplier.legal_name || supplier.trade_name}`, {
        description: 'No emission data found. Request data or use defaults.'
      });
    }

    setFormData(prev => ({ ...prev, ...updates }));
  };

  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;

    const isBulk = files.length > 1;
    setIsAnalyzing(true);
    
    toast.info(`Processing ${files.length} document(s)...`);

    try {
      const results = [];
      
      for (const file of files) {
        setUploadedFile({ name: file.name, size: file.size, status: 'uploading', url: null });
        
        const uploadRes = await base44.integrations.Core.UploadFile({ file });
        const fileUrl = uploadRes.file_url;

        setUploadedFile(prev => ({ ...prev, status: 'extracting', url: fileUrl }));

        const extractRes = await base44.integrations.Core.ExtractDataFromUploadedFile({
          file_url: fileUrl,
          json_schema: {
            type: "object",
            properties: {
              eori_number: { type: "string" },
              import_date: { type: "string", format: "date" },
              country_of_origin: { type: "string" },
              quantity: { type: "number" },
              cn_code: { type: "string" },
              product_name: { type: "string" },
              aggregated_goods_category: { type: "string" },
              production_route: { type: "string" },
              direct_emissions_specific: { type: "number" },
              indirect_emissions_specific: { type: "number" },
              carbon_price_due_paid: { type: "number" }
            }
          }
        });

        if (extractRes.output) {
          results.push({
            file: file.name,
            data: extractRes.output,
            url: fileUrl,
            fields: Object.keys(extractRes.output).length
          });
        }
      }

      if (results.length > 0) {
        if (!isBulk) {
          setFormData(prev => ({ ...prev, ...results[0].data }));
          setUploadedFile({ 
            name: results[0].file, 
            size: files[0].size, 
            status: 'success', 
            extractedFields: results[0].fields,
            url: results[0].url
          });
          toast.success(`Extracted ${results[0].fields} fields!`);
          setActiveTab('basic');
        } else {
          const user = await base44.auth.me();
          const users = await base44.entities.User.list();
          const fullUser = users.find(u => u.email === user.email);
          
          for (const result of results) {
            await base44.entities.CBAMEmissionEntry.create({
              ...formData,
              ...result.data,
              company_id: fullUser?.company_id,
              import_id: `IMP-2025-${Math.floor(Math.random() * 10000)}`
            });
          }
          
          queryClient.invalidateQueries({ queryKey: ['cbam-emission-entries'] });
          toast.success(`Created ${results.length} declarations!`);
          onOpenChange(false);
        }
      }
    } catch (error) {
      console.error(error);
      setUploadedFile(prev => ({ ...prev, status: 'error' }));
      toast.error("Failed to analyze documents");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = async () => {
    // STATE MACHINE: Only allow submit in REPORT_READY state
    if (!stateMachine.canPerform('submit')) {
      toast.error('Cannot submit: Compliance gates not passed');
      return;
    }

    // SUBMISSION GATE: Final compliance check
    const gateEvaluation = CBAMSubmissionGate.canSubmit({
      ...formData,
      direct_emissions_specific: calculation.totalEmissions,
      certificates_required: calculation.certificatesRequired,
      is_complex_good: isComplexGood(formData.cn_code),
      lifecycle_locks: formData.lifecycle_locks || []
    });

    if (!gateEvaluation.canSubmit) {
      gateEvaluation.blockedReasons.forEach(reason => {
        toast.error(reason);
      });
      return;
    }

    const loadingToast = toast.loading(initialData?.id ? 'Updating...' : 'Creating entry...');
    
    try {
      if (initialData?.id) {
        await createEntryMutation.mutateAsync(formData);
        toast.dismiss(loadingToast);
        return;
      }
      
      const result = await CBAMOrchestrator.createEntry(
        { 
          ...formData, 
          documents,
          functional_unit: 'tonnes',
          reporting_period_year: parseInt(formData.import_date?.split('-')[0]) || 2026
        },
        { 
          includePrecursors: true,
          createAuditLog: true,
          notifyStakeholders: false
        }
      );
      
      toast.dismiss(loadingToast);
      
      if (!result.success) {
        toast.error(`Failed: ${result.error}`);
        return;
      }

      queryClient.invalidateQueries({ queryKey: ['cbam-emission-entries'] });
      
      const totalEmissions = result.calculation?.breakdown?.total_embedded || result.entry?.total_embedded_emissions || 0;
      const certificates = result.calculation?.breakdown?.certificates || result.entry?.certificates_required || 0;
      
      toast.success(`✓ Import created`, {
        description: `${parseFloat(totalEmissions).toFixed(2)} tCO2e • ${Math.ceil(certificates)} certificates`
      });
      
      onOpenChange(false);
      
    } catch (error) {
      toast.dismiss(loadingToast);
      console.error('Submit error:', error);
      toast.error(`Failed: ${error.message}`);
    }
  };

  // Drag handlers
  const handleMouseDown = (e) => {
    if (e.target.closest('.drag-handle')) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y
      });
    }
  };

  const handleMouseMove = (e) => {
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart, position]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        ref={modalRef}
        onMouseDown={handleMouseDown}
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
          cursor: isDragging ? 'grabbing' : 'default'
        }}
        className="w-full max-w-5xl h-[85vh] overflow-hidden bg-white/95 backdrop-blur-xl shadow-2xl border border-slate-900/10 rounded-2xl"
      >
        {/* Tesla Header */}
        <div className="drag-handle flex items-center justify-between px-6 py-4 border-b border-slate-900/10 bg-white/80 backdrop-blur-xl cursor-grab active:cursor-grabbing rounded-t-2xl">
          <div className="flex items-center gap-3">
            <GripVertical className="w-4 h-4 text-slate-400" />
            <h2 className="text-sm font-medium text-slate-900">
              {initialData?.id ? 'Edit Import' : 'New Import Declaration'}
            </h2>
          </div>
          <button
            onClick={() => onOpenChange(false)}
            className="p-1 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4 text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex overflow-hidden h-[calc(85vh-56px)]">
          {/* Sidebar Navigation */}
          <div className="w-44 flex-shrink-0 bg-white/60 backdrop-blur-xl border-r border-slate-900/10 p-3 space-y-1">
            <button
              onClick={() => setActiveTab('import')}
              className={`w-full text-left px-2 py-1.5 text-xs transition-all ${
                activeTab === 'import' 
                  ? 'bg-black text-white font-medium' 
                  : 'text-slate-600 hover:bg-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-3 h-3" />
                Smart Import
              </div>
            </button>
            
            <button
              onClick={() => setActiveTab('basic')}
              className={`w-full text-left px-2 py-1.5 text-xs transition-all ${
                activeTab === 'basic' 
                  ? 'bg-black text-white font-medium' 
                  : 'text-slate-600 hover:bg-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <FileText className="w-3 h-3" />
                Basic Details
              </div>
            </button>
            
            <button
              onClick={() => setActiveTab('product')}
              className={`w-full text-left px-2 py-1.5 text-xs transition-all ${
                activeTab === 'product' 
                  ? 'bg-black text-white font-medium' 
                  : 'text-slate-600 hover:bg-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <Package className="w-3 h-3" />
                Product Info
              </div>
            </button>
            
            <button
              onClick={() => setActiveTab('emissions')}
              className={`w-full text-left px-2 py-1.5 text-xs transition-all ${
                activeTab === 'emissions' 
                  ? 'bg-black text-white font-medium' 
                  : 'text-slate-600 hover:bg-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <Calculator className="w-3 h-3" />
                Emissions
              </div>
            </button>
            
            <button
              onClick={() => setActiveTab('docs')}
              className={`w-full text-left px-2 py-1.5 text-xs transition-all ${
                activeTab === 'docs' 
                  ? 'bg-black text-white font-medium' 
                  : 'text-slate-600 hover:bg-white'
              }`}
            >
              <div className="flex items-center gap-2">
                <Upload className="w-3 h-3" />
                Documents
              </div>
            </button>
            
            {/* Live Calculation - CONSERVATIVE PREVIEW + STATE BADGE */}
            <div className="mt-4 p-3 bg-white/80 backdrop-blur-xl border border-slate-900/10 rounded-lg space-y-2">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-[9px] font-semibold text-slate-700 uppercase">Preview</h4>
                <div className="flex items-center gap-1">
                  {stateMachine.renderStateBadge()}
                </div>
              </div>
              <div className="space-y-1.5">
                <div>
                  <p className="text-[9px] text-slate-500">Total Emissions</p>
                  <p className="text-sm font-medium text-slate-900">
                    {(calculation?.totalEmissions || 0).toFixed(2)} <span className="text-[8px] font-normal text-slate-500">tCO2e</span>
                  </p>
                </div>
                <div>
                  <p className="text-[9px] text-slate-500">Est. CBAM Exposure</p>
                  <p className="text-sm font-medium text-slate-900">
                    €{(calculation?.payable || 0).toLocaleString(undefined, {minimumFractionDigits: 0})}
                  </p>
                </div>
                {calculation?.markupApplied > 0 && (
                  <div className="pt-1.5 border-t border-slate-200">
                    <p className="text-[8px] text-slate-500">
                      Markup: {calculation.markupApplied?.toFixed(0)}% | {calculation.certificatesRequired} certs
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto p-4">
            {activeTab === 'import' && (
              <div className="space-y-3">
                <div className="border border-dashed border-slate-300 bg-slate-50 p-8 text-center hover:border-slate-400 transition-all relative group">
                  <input 
                    type="file" 
                    multiple
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                    onChange={handleFileUpload}
                    accept=".pdf,.jpg,.png,.csv"
                    disabled={isAnalyzing}
                  />
                  <div className="w-12 h-12 bg-white border border-slate-200 flex items-center justify-center mx-auto mb-3">
                    {isAnalyzing ? <Loader2 className="w-6 h-6 animate-spin text-slate-700" /> : <Sparkles className="w-6 h-6 text-slate-700" />}
                  </div>
                  <h3 className="text-sm font-medium text-slate-900 mb-1">Smart Document Import</h3>
                  <p className="text-xs text-slate-600 max-w-md mx-auto mb-4">
                    Upload <strong>Customs Declaration</strong>, <strong>Invoice</strong>, or <strong>Supplier Report</strong>. 
                    AI extracts all CBAM data automatically.
                  </p>
                  <div className="inline-flex items-center gap-2 px-5 py-2 bg-black hover:bg-slate-800 text-white text-xs font-medium transition-all">
                    {isAnalyzing ? 'Processing...' : 'Select Document(s)'}
                  </div>
                </div>

                {uploadedFile && (
                  <div className="bg-white border border-slate-200 p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className={`w-8 h-8 border flex items-center justify-center ${
                          uploadedFile.status === 'success' ? 'border-slate-900 bg-slate-50' :
                          uploadedFile.status === 'error' ? 'border-red-500 bg-red-50' :
                          'border-slate-300 bg-slate-50'
                        }`}>
                          {uploadedFile.status === 'success' && <CheckCircle2 className="w-4 h-4 text-slate-900" />}
                          {uploadedFile.status === 'error' && <AlertCircle className="w-4 h-4 text-red-600" />}
                          {(uploadedFile.status === 'uploading' || uploadedFile.status === 'extracting') && 
                            <Loader2 className="w-4 h-4 text-slate-600 animate-spin" />}
                        </div>
                        <div>
                          <p className="text-xs font-medium text-slate-900">{uploadedFile.name}</p>
                          <p className="text-[10px] text-slate-500">
                            {uploadedFile.status === 'uploading' && 'Uploading...'}
                            {uploadedFile.status === 'extracting' && 'Extracting data...'}
                            {uploadedFile.status === 'success' && `✓ ${uploadedFile.extractedFields} fields extracted`}
                            {uploadedFile.status === 'error' && 'Extraction failed'}
                          </p>
                        </div>
                      </div>
                      {uploadedFile.status === 'success' && (
                        <Button 
                          onClick={() => setActiveTab('basic')} 
                          className="bg-black hover:bg-slate-800 text-white text-xs h-7 px-3"
                        >
                          Review Data <ArrowRight className="w-3 h-3 ml-1" />
                        </Button>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex justify-center pt-2">
                  <button 
                    onClick={() => setActiveTab('basic')} 
                    className="text-xs text-slate-400 hover:text-slate-600 underline"
                  >
                    Skip to manual entry
                  </button>
                </div>
              </div>
            )}

            {activeTab === 'basic' && (
              <div className="space-y-3">
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <Label className="text-[10px] font-semibold text-slate-700">Import ID</Label>
                    <Input value={formData.import_id} disabled className="mt-1 bg-slate-50 h-8 text-xs" />
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold text-slate-700">EORI Number</Label>
                    <Input value={formData.eori_number} onChange={(e) => handleInputChange('eori_number', e.target.value)} className="mt-1 h-8 text-xs" />
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold text-slate-700">Import Date</Label>
                    <Input type="date" value={formData.import_date} onChange={(e) => handleInputChange('import_date', e.target.value)} className="mt-1 h-8 text-xs" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[10px] font-semibold text-slate-700">Country of Origin</Label>
                    <Select value={formData.country_of_origin} onValueChange={(v) => handleInputChange('country_of_origin', v)}>
                      <SelectTrigger className="mt-1 h-8 text-xs">
                        <SelectValue placeholder="Select country..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="China">🇨🇳 China</SelectItem>
                        <SelectItem value="India">🇮🇳 India</SelectItem>
                        <SelectItem value="Turkey">🇹🇷 Turkey</SelectItem>
                        <SelectItem value="USA">🇺🇸 USA</SelectItem>
                        <SelectItem value="Brazil">🇧🇷 Brazil</SelectItem>
                        <SelectItem value="Russia">🇷🇺 Russia</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold text-slate-700">Declarant Name</Label>
                    <Input value={formData.declarant_name} onChange={(e) => handleInputChange('declarant_name', e.target.value)} placeholder="Company name" className="mt-1 h-8 text-xs" />
                  </div>
                </div>

                <div className="p-2 bg-slate-50 border border-slate-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5 text-slate-700" />
                    <p className="text-[10px] text-slate-900 font-medium">Link SupplyLens supplier</p>
                  </div>
                  <Button
                    type="button"
                    size="sm"
                    onClick={handleSearchSuppliers}
                    className="bg-black hover:bg-slate-800 text-white h-7 px-3 text-xs"
                  >
                    Select Supplier
                  </Button>
                </div>

                {showSupplierSearch && (
                  <div className="p-3 bg-white border border-slate-200 space-y-2">
                    <Input
                      placeholder="Search suppliers..."
                      value={supplierSearchQuery}
                      onChange={(e) => setSupplierSearchQuery(e.target.value)}
                      autoFocus
                      className="h-8 text-xs"
                    />
                    <div className="space-y-1.5 max-h-48 overflow-y-auto">
                      {getFilteredSuppliers().map(sup => (
                        <button
                          key={sup.id}
                          onClick={() => handleSelectSupplier(sup)}
                          className="w-full p-2 bg-slate-50 border border-slate-200 hover:border-black hover:bg-white transition-all text-left"
                        >
                          <p className="font-medium text-slate-900 text-xs">{sup.legal_name || sup.trade_name}</p>
                          <p className="text-[10px] text-slate-500">{sup.country} • {sup.email}</p>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[10px] font-semibold text-slate-700">Quantity (tonnes)</Label>
                    <Input type="number" step="0.001" value={formData.quantity} onChange={(e) => handleInputChange('quantity', e.target.value)} className="mt-1 h-8 text-xs" />
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold text-slate-700">Product Name</Label>
                    <Input value={formData.product_name} onChange={(e) => handleInputChange('product_name', e.target.value)} placeholder="e.g., Hot-rolled steel" className="mt-1 h-8 text-xs" />
                  </div>
                </div>
                
                <div className="flex justify-end gap-2 pt-2">
                  <Button onClick={() => setActiveTab('product')} className="bg-black hover:bg-slate-800 text-white text-xs h-8 px-4">
                    Next <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {activeTab === 'product' && (
              <div className="space-y-3">
                <div>
                  <Label className="text-[10px] font-semibold text-slate-700">Goods Category</Label>
                  <Select 
                    value={formData.aggregated_goods_category} 
                    onValueChange={(v) => handleInputChange('aggregated_goods_category', v)}
                  >
                    <SelectTrigger className="mt-1 h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Iron & Steel">Iron & Steel</SelectItem>
                      <SelectItem value="Aluminium">Aluminium</SelectItem>
                      <SelectItem value="Cement">Cement</SelectItem>
                      <SelectItem value="Fertilizers">Fertilizers</SelectItem>
                      <SelectItem value="Hydrogen">Hydrogen</SelectItem>
                      <SelectItem value="Electricity">Electricity</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <CNCodeAutocomplete
                  value={formData.cn_code}
                  onChange={(code, description) => {
                    handleInputChange('cn_code', code || '');
                    if (description && !formData.product_name) {
                      handleInputChange('product_name', description);
                    }
                  }}
                  label="CN Code"
                  required
                  placeholder="Search CN codes..."
                />

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setActiveTab('basic')} className="border-slate-200 text-xs h-8 px-4">Back</Button>
                  <Button onClick={() => setActiveTab('emissions')} className="bg-black hover:bg-slate-800 text-white text-xs h-8 px-4">
                    Next <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {activeTab === 'emissions' && (
              <div className="space-y-3">
                {/* Calculation Method - READ-ONLY STATUS (derived from verification) */}
                <div>
                  <Label className="text-[10px] font-semibold text-slate-700 mb-1">Calculation Method Status</Label>
                  <CalculationMethodBadge
                    verification_status={formData.verification_status}
                    evidence_reference={formData.evidence_reference || formData.verification_report_id}
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[10px] font-semibold text-slate-700">Direct Emissions (tCO2e/t)</Label>
                    <Input 
                      type="number" 
                      step="0.01" 
                      value={formData.direct_emissions_specific} 
                      onChange={(e) => handleInputChange('direct_emissions_specific', e.target.value)}
                      className="mt-1 h-8 text-xs" 
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold text-slate-700">Indirect Emissions (tCO2e/t)</Label>
                    <Input 
                      type="number" 
                      step="0.01" 
                      value={formData.indirect_emissions_specific} 
                      onChange={(e) => handleInputChange('indirect_emissions_specific', e.target.value)}
                      className="mt-1 h-8 text-xs" 
                    />
                  </div>
                </div>

                {/* Default Values Display + Production Route */}
                <div className="p-2.5 bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-3.5 h-3.5 text-slate-700" />
                    <span className="font-semibold text-[10px] text-slate-900">Default Values Assumptions</span>
                  </div>
                  <div className="text-[9px] text-slate-600 space-y-0.5 mb-2">
                    <p>✓ EU benchmarks + <strong>10% regulatory markup</strong> (2026)</p>
                    <p>✓ Free allocation applied after calculation</p>
                    <p>✓ Non-verified data penalized per Art. C(2025) 8552</p>
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold text-slate-700">Production Route (Required)</Label>
                    <Select 
                      value={formData.production_route} 
                      onValueChange={(v) => handleInputChange('production_route', v)}
                    >
                      <SelectTrigger className="mt-1 h-8 text-xs">
                        <SelectValue placeholder="Select route..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="bf_bof_route">Blast Furnace → BOF (Iron & Steel)</SelectItem>
                        <SelectItem value="dri_eaf_route">DRI → EAF (Iron & Steel)</SelectItem>
                        <SelectItem value="scrap_eaf_route">Scrap → EAF (Iron & Steel)</SelectItem>
                        <SelectItem value="primary_route">Primary Route (Aluminium)</SelectItem>
                        <SelectItem value="secondary_route">Secondary Route (Aluminium)</SelectItem>
                        <SelectItem value="dry_process">Dry Process (Cement)</SelectItem>
                        <SelectItem value="wet_process">Wet Process (Cement)</SelectItem>
                        <SelectItem value="steam_reforming">Steam Reforming (Fertilizers)</SelectItem>
                        <SelectItem value="grey_smr">Grey SMR (Hydrogen)</SelectItem>
                        <SelectItem value="green_electrolysis">Green Electrolysis (Hydrogen)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Precursor Requirement Badge */}
                <PrecursorRequirementBadge
                  cnCode={formData.cn_code}
                  precursorCount={(formData.precursors_used || []).length}
                  isCompleted={(formData.precursors_used || []).length > 0}
                />

                <PrecursorInputPanel 
                   precursors={formData.precursors_used || []}
                   onChange={(precursors) => handleInputChange('precursors_used', precursors)}
                   isRequired={isComplexGood(formData.cn_code)}
                 />

                {formData.carbon_price_due_paid > 0 && (
                  <div className="p-2 bg-slate-50 border border-slate-200 space-y-1.5">
                    <Label className="text-[10px] font-semibold text-slate-700">Carbon Price Certificate Upload *</Label>
                    <input 
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={async (e) => {
                        const file = e.target.files[0];
                        if (file) {
                          const { file_url } = await base44.integrations.Core.UploadFile({ file });
                          handleInputChange('carbon_price_certificate_url', file_url);
                          toast.success('Certificate uploaded');
                        }
                      }}
                      className="text-[10px]"
                    />
                    <p className="text-[9px] text-slate-600">Proof REQUIRED for deductions per Art. 9</p>
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-2">
                  <Button variant="outline" onClick={() => setActiveTab('product')} className="border-slate-200 text-xs h-8 px-4">Back</Button>
                  <Button onClick={() => setActiveTab('docs')} className="bg-black hover:bg-slate-800 text-white text-xs h-8 px-4">
                    Next <ArrowRight className="w-3 h-3 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {activeTab === 'docs' && (
              <div className="space-y-3">
                <div className="border border-dashed border-slate-300 bg-slate-50 p-6 text-center hover:bg-slate-100 transition-all relative">
                  <input 
                    type="file" 
                    multiple
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    onChange={(e) => {
                      const files = Array.from(e.target.files);
                      files.forEach(async (file) => {
                        const uploadRes = await base44.integrations.Core.UploadFile({ file });
                        setDocuments(prev => [...prev, {
                          name: file.name,
                          url: uploadRes.file_url,
                          type: file.type,
                          size: file.size,
                          uploaded_at: new Date().toISOString()
                        }]);
                      });
                      toast.success(`${files.length} document(s) uploaded`);
                    }}
                    accept=".pdf,.jpg,.jpeg,.png"
                  />
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <h4 className="font-medium text-slate-700 mb-1 text-xs">Attach Evidence Documents</h4>
                  <p className="text-[10px] text-slate-500">PO, Invoice, Mill Cert, Verification Reports</p>
                </div>

                {documents.length > 0 && (
                  <div className="space-y-1.5">
                    {documents.map((doc, idx) => (
                      <div key={idx} className="flex items-center justify-between p-2 bg-white border border-slate-200">
                        <div className="flex items-center gap-2">
                          <FileText className="w-3.5 h-3.5 text-slate-600" />
                          <span className="text-xs text-slate-900">{doc.name}</span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDocuments(prev => prev.filter((_, i) => i !== idx))}
                          className="text-red-600 hover:bg-red-50 h-6 text-[10px] px-2"
                        >
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="space-y-2 pt-3 border-t border-slate-200">
                  {/* Submission Gate Panel */}
                  <SubmissionGatePanel
                    submission={CBAMSubmissionGate.getSubmissionSummary({
                      ...formData,
                      direct_emissions_specific: calculation.totalEmissions,
                      certificates_required: calculation.certificatesRequired,
                      is_complex_good: isComplexGood(formData.cn_code),
                      lifecycle_locks: formData.lifecycle_locks || []
                    })}
                    onSubmit={handleSubmit}
                    loading={createEntryMutation.isPending}
                  />
                  
                  <Button 
                    variant="outline" 
                    onClick={() => setActiveTab('emissions')} 
                    className="w-full border-slate-200 text-xs h-8"
                  >
                    Back
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <CBAMDocumentViewer
        document={viewingDocument}
        open={isDocViewerOpen}
        onClose={() => {
          setIsDocViewerOpen(false);
          setViewingDocument(null);
        }}
      />
    </div>
  );
}