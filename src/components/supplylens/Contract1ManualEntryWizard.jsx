import React, { useState, useEffect, useRef } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { AlertCircle, AlertTriangle, CheckCircle, ChevronRight, Shield, Loader2, Copy, Upload, Info, FileText, Server, Radio } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import {
  validateStep1,
  getManualEntrySchema,
  validateManualEntryPayload,
  getAllowedScopesForEvidenceType,
  getProvenanceChannels,
  requiresScopeTarget,
  getTargetEntityType
} from './utils/registryValidator';
import { MockEvidenceApiAdapter, RealEvidenceApiAdapter } from './adapters/EvidenceApiAdapter';
import ErrorBoundaryWizard from './ErrorBoundaryWizard';
import Contract1ManualEntryReceipt from './Contract1ManualEntryReceipt';
import Step2PayloadByMethod from './steps/Step2PayloadByMethod';
import Step3ReviewAndSeal from './steps/Step3ReviewAndSeal';

export default function Contract1ManualEntryWizard({ onComplete, onCancel }) {
  const [step, setStep] = useState(1);
  const [draftId, setDraftId] = useState(null);
  const [correlationId, setCorrelationId] = useState(null);
  const [recordId, setRecordId] = useState(null);
  const [sealResponse, setSealResponse] = useState(null);
  const [adapterMode, setAdapterMode] = useState('mock'); // 'mock' | 'real'
  
  const [formData, setFormData] = useState({
    ingestion_method: '', // MANUAL_ENTRY, FILE_UPLOAD, ERP_EXPORT_FILE, API_PUSH_DIGEST
    evidence_type: '',
    declared_scope: '',
    binding_mode: 'DEFER_BINDING', // BIND_EXISTING, CREATE_NEW, DEFER_BINDING
    bound_entity_id: null,
    target_label: null, // Human readable label (e.g., "Acme Corp", "SKU-123")
    target_type: null, // SUPPLIER, SKU, PRODUCT_FAMILY, LEGAL_ENTITY, ORG
    target_snapshot_min: null, // Minimal snapshot {id, name/legal_name, code, country, ...}
    reconciliation_hint: '',
    stub_supplier_name: '',
    stub_supplier_code: '',
    stub_sku_code: '',
    stub_product_name: '',
    why_this_evidence: '',
    provenance_source: 'INTERNAL_USER',
    external_reference_id: '',
    external_reference_id_manual: false,
    payload_data_json: {},
    attestation_notes: '',
    // FILE_UPLOAD
    document_title: '',
    reporting_period_start: '',
    reporting_period_end: '',
    notes: '',
    // ERP_EXPORT_FILE
    erp_system_name: '',
    erp_export_job_id: '',
    erp_period_start: '',
    erp_period_end: '',
    // API_PUSH_DIGEST
    payload_digest_sha256: '',
    received_at_utc: '',
    payload_size_bytes: null,
    source_endpoint: ''
  });
  
  const [uploadedFiles, setUploadedFiles] = useState([]);
  
  const [errors, setErrors] = useState({});
  const [validationWarnings, setValidationWarnings] = useState([]);
  const [registryValidation, setRegistryValidation] = useState(null);
  const [isValidatingRegistry, setIsValidatingRegistry] = useState(false);
  
  // Audit instrumentation
  const [auditLog, setAuditLog] = useState({
    lastCall: null,
    lastCallStatus: null,
    lastError: null,
    lastCorrelationId: null
  });
  
  const [adapterCallHistory, setAdapterCallHistory] = useState([]);
  const [draftSnapshot, setDraftSnapshot] = useState(null);
  
  // Fetch entities for binding pickers via adapter (full architectural purity)
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers', adapterMode],
    queryFn: async () => {
      const result = await adapter.listEntities({ entity_type: 'Supplier', limit: 100 });
      return result.items || [];
    },
    enabled: formData.binding_mode === 'BIND_EXISTING' && formData.declared_scope === 'SUPPLIER'
  });
  
  const { data: skus = [] } = useQuery({
    queryKey: ['skus', adapterMode],
    queryFn: async () => {
      const result = await adapter.listEntities({ entity_type: 'SKU', limit: 100 });
      return result.items || [];
    },
    enabled: formData.binding_mode === 'BIND_EXISTING' && formData.declared_scope === 'SKU'
  });

  // Mock sealed drafts store (simulates backend idempotency check)
  const [mockSealedExternalRefs, setMockSealedExternalRefs] = useState(new Set());

  // Emit adapter audit event
  const emitAdapterEvent = (callName, success, error = null, corrId = null) => {
    const entry = {
      timestamp: new Date().toISOString(),
      call_name: callName,
      correlation_id: corrId || correlationId,
      success,
      error_code: error ? (typeof error === 'string' ? error : error.code || 'UNKNOWN') : null
    };
    
    setAuditLog({
      lastCall: callName,
      lastCallStatus: success ? 'success' : 'fail',
      lastError: error,
      lastCorrelationId: corrId || correlationId
    });
    
    setAdapterCallHistory(prev => {
      const updated = [entry, ...prev];
      return updated.slice(0, 25); // Keep max 25 entries
    });
  };

  // Initialize adapter based on mode
  const getAdapter = () => {
    if (adapterMode === 'mock') {
      return new MockEvidenceApiAdapter(mockSealedExternalRefs, setMockSealedExternalRefs);
    } else {
      return new RealEvidenceApiAdapter();
    }
  };

  const adapter = getAdapter();

  // Load draft snapshot on mount if draft_id exists
  useEffect(() => {
    const loadDraftSnapshot = async () => {
      if (!draftId) return;
      
      try {
        const result = await adapter.getDraftSnapshot(draftId);
        emitAdapterEvent('getDraftSnapshot', true, null, result.correlation_id);
        
        if (result.error) {
          setError(`Snapshot load failed: ${result.message}`);
          setCorrelationId(result.correlation_id);
        } else {
          setDraftSnapshot(result.snapshot);
          setCorrelationId(result.correlation_id);
          
          if (result.snapshot) {
            setFormData(prev => ({
              ...prev,
              ...result.snapshot
            }));
          }
        }
      } catch (err) {
        emitAdapterEvent('getDraftSnapshot', false, err.message);
        setError(`Snapshot load failed: ${err.message}`);
      }
    };
    
    loadDraftSnapshot();
  }, [draftId, adapterMode]);

  // Step 1: Create Draft
  const createDraftMutation = useMutation({
    mutationFn: async (payload) => {
      try {
        const result = await adapter.createDraft(payload);
        emitAdapterEvent('createDraft', true, null, result.correlation_id);
        return result;
      } catch (err) {
        emitAdapterEvent('createDraft', false, err.message);
        throw err;
      }
    },
    onSuccess: (data) => {
      setDraftId(data.draft_id);
      setCorrelationId(data.correlation_id);
      setStep(2);
      setErrors({});
      toast.success('Draft created');
    },
    onError: (error) => {
      const msg = error.response?.data?.error || error.message;
      setErrors({ general: msg });
      toast.error(`Draft creation failed: ${msg}`);
    }
  });

  // Step 2: Update Draft
  const updateDraftMutation = useMutation({
    mutationFn: async (payload) => {
      try {
        const result = await adapter.updateDraft(draftId, payload);
        emitAdapterEvent('updateDraft', true, null, result.correlation_id);
        return result;
      } catch (err) {
        emitAdapterEvent('updateDraft', false, err.message);
        throw err;
      }
    },
    onSuccess: (data) => {
      setCorrelationId(data.correlation_id);
      setStep(3);
      setErrors({});
    },
    onError: (error) => {
      const msg = error.response?.data?.error || error.message;
      const corrId = error.response?.data?.correlation_id;
      setErrors({ general: msg, correlation_id: corrId });
      if (corrId) setCorrelationId(corrId);
      toast.error(`Update failed: ${msg}`);
    }
  });

  // Step 3: Seal Draft
  const sealDraftMutation = useMutation({
    mutationFn: async () => {
      try {
        const result = await adapter.sealDraft(draftId, correlationId);
        emitAdapterEvent('sealDraft', true, null, result.correlation_id);
        return result;
      } catch (err) {
        emitAdapterEvent('sealDraft', false, err.message);
        throw err;
      }
    },
    onSuccess: (data) => {
      setRecordId(data.record_id);
      setCorrelationId(data.correlation_id);
      setSealResponse(data);
      setStep(4);
    },
    onError: (error) => {
      const msg = error.response?.data?.error || error.message;
      const corrId = error.response?.data?.correlation_id;
      setErrors({ general: msg, correlation_id: corrId });
      if (corrId) setCorrelationId(corrId);
      toast.error(`Seal failed: ${msg}`);
    }
  });

  // Registry validation on evidence type change
  const handleEvidenceTypeChange = async (type) => {
    setFormData({...formData, evidence_type: type, declared_scope: ''});
    setErrors({});
    setRegistryValidation(null);

    if (!type) return;

    setIsValidatingRegistry(true);
    try {
      const result = await adapter.getMethodContractRegistry({
        method: 'MANUAL_ENTRY',
        evidence_type: type
      });
      
      if (result.error) {
        // Handle NOT_CONFIGURED or other errors
        setErrors({ 
          general: result.message,
          correlation_id: result.correlation_id 
        });
        setCorrelationId(result.correlation_id);
        emitAdapterEvent('getMethodContractRegistry', false, result.message, result.correlation_id);
      } else {
        setRegistryValidation(result.registry);
        emitAdapterEvent('getMethodContractRegistry', true, null, result.correlation_id);
      }
    } catch (err) {
      emitAdapterEvent('getMethodContractRegistry', false, err.message);
      setErrors({ general: 'Registry validation failed: ' + err.message });
    } finally {
      setIsValidatingRegistry(false);
    }
  };

  // Handle Step 1 → Step 2
  const handleNextFromStep1 = async () => {
    // Guard: prevent double-click or if draft already created
    if (createDraftMutation.isPending || draftId) return;
    

    const stepErrors = {};
    const warnings = [];

    if (!formData.ingestion_method) {
      stepErrors.ingestion_method = 'Ingestion method required';
      warnings.push('Ingestion method required');
    }
    if (!formData.evidence_type) {
      stepErrors.evidence_type = 'Evidence type required';
      warnings.push('Evidence type required');
    }
    if (!formData.declared_scope) {
      stepErrors.declared_scope = 'Declared scope required';
      warnings.push('Declared scope required');
    }
    if (!formData.why_this_evidence || formData.why_this_evidence.length < 20) {
      stepErrors.why_this_evidence = 'Purpose explanation required (min 20 chars)';
      warnings.push('Purpose explanation required (minimum 20 characters)');
    }
    
    // Binding validation
    if (formData.binding_mode === 'BIND_EXISTING' && !formData.bound_entity_id) {
      stepErrors.bound_entity_id = 'Entity selection required for BIND_EXISTING mode';
      warnings.push('Select an entity to bind to');
    }
    if (formData.binding_mode === 'CREATE_NEW') {
      if (formData.declared_scope === 'SUPPLIER' && !formData.stub_supplier_name) {
        stepErrors.stub_supplier_name = 'Supplier name required for CREATE_NEW';
        warnings.push('Supplier name required');
      }
      if (formData.declared_scope === 'SKU' && !formData.stub_sku_code) {
        stepErrors.stub_sku_code = 'SKU code required for CREATE_NEW';
        warnings.push('SKU code required');
      }
    }

    if (warnings.length > 0) {
      setErrors(stepErrors);
      setValidationWarnings(warnings);
      toast.error(`Fix ${warnings.length} field(s) before proceeding`);
      return;
    }

    // Clear warnings on successful validation
    setValidationWarnings([]);

    const draftPayload = {
      ingestion_method: formData.ingestion_method,
      evidence_type: formData.evidence_type,
      declared_scope: formData.declared_scope,
      purpose_explanation: formData.why_this_evidence,
      provenance_source: formData.provenance_source,
      binding_mode: formData.binding_mode,
      bound_entity_id: formData.bound_entity_id,
      reconciliation_hint: formData.reconciliation_hint || null,
      external_reference_id: formData.external_reference_id || null,
      purpose_tags: []
    };

    // Add stub data if CREATE_NEW
    if (formData.binding_mode === 'CREATE_NEW') {
      if (formData.declared_scope === 'SUPPLIER') {
        draftPayload.stub_data = {
          supplier_name: formData.stub_supplier_name,
          supplier_code: formData.stub_supplier_code || null
        };
      } else if (formData.declared_scope === 'SKU') {
        draftPayload.stub_data = {
          sku_code: formData.stub_sku_code,
          product_name: formData.stub_product_name || null
        };
      }
    }

    await createDraftMutation.mutateAsync(draftPayload);
  };

  // Refresh snapshot on entering Step 3
  useEffect(() => {
    const refreshSnapshot = async () => {
      if (step !== 3 || !draftId) return;
      
      try {
        const result = await adapter.getDraftSnapshot(draftId);
        emitAdapterEvent('getDraftSnapshot', true, null, result.correlation_id);
        
        if (result.error) {
          setError(`Snapshot load failed: ${result.message}`);
          setCorrelationId(result.correlation_id);
          setDraftSnapshot(null);
        } else {
          setDraftSnapshot(result.snapshot);
          setCorrelationId(result.correlation_id);
          setError(null);
        }
      } catch (err) {
        emitAdapterEvent('getDraftSnapshot', false, err.message);
        setError(`Snapshot load failed: ${err.message}`);
        setDraftSnapshot(null);
      }
    };
    
    refreshSnapshot();
  }, [step, draftId, adapterMode]);

  // Handle Step 2 → Step 3 (with validation per method)
  const handleNextFromStep2 = async () => {
    // Guard: prevent double-click during pending operation
    if (updateDraftMutation.isPending) return;
    

    const methodErrors = {};
    const warnings = [];

    // Method-specific validation
    if (formData.ingestion_method === 'MANUAL_ENTRY') {
      if (!formData.attestation_notes || formData.attestation_notes.length < 20) {
        methodErrors.attestation_notes = 'Attestation notes required (min 20 chars)';
        warnings.push('Attestation notes required (minimum 20 characters)');
      }
      
      // BOM-specific component validation (CRITICAL: validates each row)
      if (formData.evidence_type === 'BOM') {
        const components = formData.payload_data_json?.components || [];
        
        if (components.length === 0) {
          methodErrors.components = 'At least one component required';
          warnings.push('BOM must have at least one component');
        } else {
          // CRITICAL: Validate each component row has identifier + quantity + UoM
          components.forEach((comp, idx) => {
            const hasIdentifier = comp.component_sku_id || comp.component_sku_code;
            const hasValidQuantity = comp.quantity && parseFloat(comp.quantity) > 0;
            const hasUom = comp.uom && comp.uom.trim() !== '';
            
            if (!hasIdentifier) {
              methodErrors[`component_${idx}_identifier`] = `Component #${idx + 1}: SKU or code required`;
              warnings.push(`Component #${idx + 1}: Select SKU or enter component code`);
            }
            if (!hasValidQuantity) {
              methodErrors[`component_${idx}_quantity`] = `Component #${idx + 1}: Quantity must be > 0`;
              warnings.push(`Component #${idx + 1}: Quantity must be greater than 0`);
            }
            if (!hasUom) {
              methodErrors[`component_${idx}_uom`] = `Component #${idx + 1}: Unit of measure required`;
              warnings.push(`Component #${idx + 1}: Unit of measure required`);
            }
          });
        }
      } else {
        // Non-BOM manual entry payload validation
        const payloadValidation = validateManualEntryPayload(formData.evidence_type, formData.payload_data_json);
        if (!payloadValidation.valid) {
          Object.assign(methodErrors, payloadValidation.errors);
          warnings.push(...Object.values(payloadValidation.errors));
        }
      }
    } else if (formData.ingestion_method === 'FILE_UPLOAD') {
      if (uploadedFiles.length === 0) {
        methodErrors.file_url = 'At least one attachment required';
        warnings.push('At least one file must be uploaded');
      }
      if (!formData.document_title) {
        methodErrors.document_title = 'Document title required';
        warnings.push('Document title required');
      }
      if (!formData.reporting_period_start) {
        methodErrors.reporting_period_start = 'Reporting period start required';
        warnings.push('Reporting period start date required');
      }
      if (!formData.reporting_period_end) {
        methodErrors.reporting_period_end = 'Reporting period end required';
        warnings.push('Reporting period end date required');
      }
    } else if (formData.ingestion_method === 'ERP_EXPORT_FILE') {
      if (uploadedFiles.length === 0) {
        methodErrors.file_url = 'File upload required';
        warnings.push('File must be uploaded');
      }
      if (!formData.erp_system_name) {
        methodErrors.erp_system_name = 'ERP system name required';
        warnings.push('ERP system name required');
      }
      if (!formData.erp_export_job_id) {
        methodErrors.erp_export_job_id = 'Export job ID required';
        warnings.push('Export job ID required');
      }
      if (!formData.erp_period_start) {
        methodErrors.erp_period_start = 'Reporting period start required';
        warnings.push('Reporting period start required');
      }
      if (!formData.erp_period_end) {
        methodErrors.erp_period_end = 'Reporting period end required';
        warnings.push('Reporting period end required');
      }
      if (!formData.external_reference_id) {
        methodErrors.external_reference_id = 'External reference ID required';
        warnings.push('External reference ID required');
      }
    } else if (formData.ingestion_method === 'API_PUSH_DIGEST') {
      if (!formData.payload_digest_sha256) {
        methodErrors.payload_digest_sha256 = 'SHA-256 digest required';
        warnings.push('SHA-256 digest required');
      } else {
        // Validate digest format: must be 64 hex characters
        const hexPattern = /^[a-fA-F0-9]{64}$/;
        if (!hexPattern.test(formData.payload_digest_sha256)) {
          methodErrors.payload_digest_sha256 = 'Invalid SHA-256 format (must be 64 hex characters)';
          warnings.push('Invalid SHA-256 digest format');
        }
      }
      if (!formData.external_reference_id) {
        methodErrors.external_reference_id = 'External reference ID required';
        warnings.push('External reference ID required');
      }
    }

    if (warnings.length > 0) {
      setErrors(methodErrors);
      setValidationWarnings(warnings);
      toast.error(`Fix ${warnings.length} validation error(s)`);
      return;
    }

    // Clear warnings and update draft
    setValidationWarnings([]);
    const updatePayload = formData.ingestion_method === 'MANUAL_ENTRY' 
      ? {
          attestation_notes: formData.attestation_notes,
          payload_data_json: formData.payload_data_json,
          trust_level: 'LOW',
          review_status: 'NOT_REVIEWED'
        }
      : formData.ingestion_method === 'FILE_UPLOAD'
      ? {
          attachments: uploadedFiles,
          document_title: formData.document_title,
          reporting_period_start: formData.reporting_period_start,
          reporting_period_end: formData.reporting_period_end,
          notes: formData.notes || null
        }
      : formData.ingestion_method === 'ERP_EXPORT_FILE'
      ? {
          attachments: uploadedFiles,
          erp_system_name: formData.erp_system_name,
          erp_export_job_id: formData.erp_export_job_id,
          erp_period_start: formData.erp_period_start,
          erp_period_end: formData.erp_period_end,
          external_reference_id: formData.external_reference_id
        }
      : {
          payload_digest_sha256: formData.payload_digest_sha256,
          external_reference_id: formData.external_reference_id,
          source_endpoint: formData.source_endpoint,
          payload_size_bytes: formData.payload_size_bytes
        };

    await updateDraftMutation.mutateAsync(updatePayload);
  };

  // Handle Seal
  const handleSeal = async () => {
    // Guard: prevent double-click during sealing
    if (sealDraftMutation.isPending) return;
    
    if (!draftSnapshot) {
      toast.error('Cannot seal: snapshot not loaded');
      return;
    }
    await sealDraftMutation.mutateAsync({ externalRefId: formData.external_reference_id });
  };

  if (step === 4 && recordId) {
    return (
      <ErrorBoundaryWizard currentStep={4}>
        <Contract1ManualEntryReceipt 
          recordId={recordId} 
          correlationId={correlationId} 
          onComplete={onComplete}
          adapterMode={adapterMode}
          draftId={draftId}
          sealResponse={sealResponse}
        />
      </ErrorBoundaryWizard>
    );
  }

  return (
    <ErrorBoundaryWizard currentStep={step}>
      <TooltipProvider>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
        <div className="max-w-3xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="cursor-move"
          >
            <Card className="bg-white border-2 border-slate-300 shadow-lg rounded-2xl overflow-hidden">
              <CardHeader className="border-b-2 border-slate-300 bg-white">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <Shield className="w-6 h-6 text-slate-900" />
                    <div>
                      <CardTitle className="text-2xl font-medium tracking-tight text-slate-900">
                        Evidence Ingestion
                      </CardTitle>
                      <p className="text-sm text-slate-700 font-normal mt-0.5">Contract 1 Compliant Workflow</p>
                    </div>
                  </div>
                  
                  {/* Mode Switcher */}
                  <div className="flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 rounded-lg">
                    <span className="text-xs text-slate-600 font-medium">Mode:</span>
                    <button
                      onClick={() => setAdapterMode(adapterMode === 'mock' ? 'real' : 'mock')}
                      className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                        adapterMode === 'mock' 
                          ? 'bg-amber-100 text-amber-900' 
                          : 'bg-[#86b027]/10 text-[#86b027]'
                      }`}
                    >
                      {adapterMode === 'mock' ? 'Mock' : 'Real API'}
                    </button>
                  </div>
                </div>

              {/* Step Indicator */}
              <div className="flex items-center gap-2">
                {[1, 2, 3].map((s) => (
                  <div key={s} className="flex-1 flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
                      s < step ? 'bg-slate-900 text-white' :
                      s === step ? 'bg-slate-900 text-white ring-4 ring-slate-900/20' :
                      'bg-slate-200 text-slate-600'
                    }`}>
                      {s < step ? '✓' : s}
                    </div>
                    {s < 3 && (
                      <div className={`h-1 flex-1 rounded-full transition-colors ${
                        s < step ? 'bg-slate-900' : 'bg-slate-300'
                      }`} />
                    )}
                  </div>
                ))}
              </div>
            </CardHeader>

            <CardContent className="p-8 space-y-6">
              {/* Validation Warnings Banner */}
              {validationWarnings.length > 0 && (
                <div className="flex items-start gap-3 p-4 bg-yellow-50 border-2 border-yellow-200 rounded-xl">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-yellow-900">Missing Required Fields</p>
                    <ul className="text-xs text-yellow-700 mt-2 space-y-1">
                      {validationWarnings.map(field => (
                        <li key={field}>• {field}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {/* Error Banner */}
              {errors.general && (
                <div className="flex items-start gap-3 p-4 bg-red-50 border-2 border-red-200 rounded-xl">
                  <AlertCircle className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-red-900">{errors.general}</p>
                    {errors.correlation_id && (
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(errors.correlation_id);
                          toast.success('Correlation ID copied');
                        }}
                        className="text-xs text-red-700 mt-1 flex items-center gap-1 hover:text-red-900"
                      >
                        <Copy className="w-3 h-3" />
                        {errors.correlation_id.substring(0, 20)}...
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Validation Warnings (UNBOUND, NOT_REVIEWED) */}
              {step === 3 && (
                <div className="flex items-start gap-3 p-4 bg-amber-50 border-2 border-amber-200 rounded-xl">
                  <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-900">Unbound Evidence</p>
                    <p className="text-xs text-amber-700 mt-1">
                      This evidence cannot be used in compliance calculations until reconciled and approved.
                    </p>
                  </div>
                </div>
              )}

              {/* Step 1: Context */}
              {step === 1 && (
                <div className="space-y-6">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <Label className="text-slate-900 font-medium text-sm">Ingestion Method *</Label>
                      <Tooltip>
                        <TooltipTrigger>
                          <Info className="w-3.5 h-3.5 text-slate-400" />
                        </TooltipTrigger>
                        <TooltipContent>How evidence data enters the system (transport mechanism)</TooltipContent>
                      </Tooltip>
                    </div>
                    <Select value={formData.ingestion_method} onValueChange={(value) => {
                      setFormData({...formData, ingestion_method: value, evidence_type: '', declared_scope: ''});
                      setErrors({});
                    }}>
                      <SelectTrigger className="h-11 border-2 border-slate-300 bg-white">
                        <SelectValue placeholder="Select ingestion method" />
                      </SelectTrigger>
                      <SelectContent className="bg-white border-2 border-slate-300">
                        <SelectItem value="MANUAL_ENTRY">
                          <div className="flex items-center gap-2">
                            <FileText className="w-4 h-4" />
                            Manual Entry
                          </div>
                        </SelectItem>
                        <SelectItem value="FILE_UPLOAD">
                          <div className="flex items-center gap-2">
                            <Upload className="w-4 h-4" />
                            File Upload
                          </div>
                        </SelectItem>
                        <SelectItem value="ERP_EXPORT_FILE">
                          <div className="flex items-center gap-2">
                            <Server className="w-4 h-4" />
                            ERP Export File
                          </div>
                        </SelectItem>
                        <SelectItem value="API_PUSH_DIGEST">
                          <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4" />
                            API Push (Digest Only)
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {errors.ingestion_method && (
                      <p className="text-xs text-red-500 mt-1">{errors.ingestion_method}</p>
                    )}
                  </div>

                  {formData.ingestion_method && (
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Label className="text-slate-900 font-medium text-sm">Evidence Type *</Label>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="w-3.5 h-3.5 text-slate-400" />
                          </TooltipTrigger>
                          <TooltipContent>The type of compliance evidence being submitted</TooltipContent>
                        </Tooltip>
                      </div>
                      <Select value={formData.evidence_type} onValueChange={handleEvidenceTypeChange}>
                      <SelectTrigger className="h-11 border-2 border-slate-300 bg-white">
                        <SelectValue placeholder="Select evidence type" />
                      </SelectTrigger>
                      <SelectContent>
                          {['SUPPLIER_MASTER', 'PRODUCT_MASTER', 'BOM', 'CERTIFICATE', 'TEST_REPORT'].map(type => (
                            <SelectItem key={type} value={type}>
                              {type === 'SUPPLIER_MASTER' ? 'Supplier Master Data' :
                               type === 'PRODUCT_MASTER' ? 'Product Master Data' :
                               type === 'BOM' ? 'Bill of Materials' :
                               type === 'CERTIFICATE' ? 'Certificate' :
                               'Test Report'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {isValidatingRegistry && (
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Validating against registry...
                        </p>
                      )}
                      {errors.evidence_type && (
                        <p className="text-xs text-red-500 mt-1">{errors.evidence_type}</p>
                      )}
                    </div>
                  )}

                  {formData.evidence_type && (
                    <>
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Label className="text-slate-900 font-medium text-sm">Declared Scope *</Label>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="w-3.5 h-3.5 text-slate-400" />
                            </TooltipTrigger>
                            <TooltipContent>The organizational scope this evidence applies to</TooltipContent>
                          </Tooltip>
                        </div>
                        <Select value={formData.declared_scope} onValueChange={(value) => {
                          setFormData({...formData, declared_scope: value});
                          setErrors({});
                        }}>
                          <SelectTrigger className="h-11 border-2 border-slate-300 bg-white">
                            <SelectValue placeholder="Select scope" />
                          </SelectTrigger>
                          <SelectContent>
                            {getAllowedScopesForEvidenceType(formData.evidence_type).map(scope => (
                              <SelectItem key={scope.id} value={scope.id}>{scope.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {errors.declared_scope && (
                          <p className="text-xs text-red-500 mt-1">{errors.declared_scope}</p>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Label className="text-slate-900 font-medium text-sm">Purpose Explanation *</Label>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="w-3.5 h-3.5 text-slate-400" />
                            </TooltipTrigger>
                            <TooltipContent>Explain why this evidence is needed (minimum 20 characters)</TooltipContent>
                          </Tooltip>
                        </div>
                        <Textarea
                          value={formData.why_this_evidence || ''}
                          onChange={(e) => setFormData({...formData, why_this_evidence: e.target.value})}
                          placeholder="Why is this evidence needed? (minimum 20 characters)"
                          rows={3}
                          className="border-2 border-slate-200 bg-white/90 backdrop-blur-md resize-none"
                        />
                        {errors.why_this_evidence && (
                          <p className="text-xs text-red-500 mt-1">{errors.why_this_evidence}</p>
                        )}
                      </div>

                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Label className="text-slate-900 font-medium text-sm">Binding Mode *</Label>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="w-3.5 h-3.5 text-slate-400" />
                            </TooltipTrigger>
                            <TooltipContent>How this evidence links to an entity. UNBOUND evidence is blocked until reconciled.</TooltipContent>
                          </Tooltip>
                        </div>
                        <RadioGroup 
                           value={formData.binding_mode} 
                           onValueChange={(value) => setFormData({...formData, binding_mode: value, bound_entity_id: null, target_label: null, target_type: null, target_snapshot_min: null, stub_supplier_name: '', stub_supplier_code: '', stub_sku_code: '', stub_product_name: '', reconciliation_hint: ''})}
                           className="space-y-3"
                         >
                          <div className="flex items-center space-x-3 p-3 border-2 border-slate-200 rounded-lg bg-white/50 hover:bg-white/80 transition-colors">
                            <RadioGroupItem value="BIND_EXISTING" id="bind_existing" />
                            <Label htmlFor="bind_existing" className="flex-1 cursor-pointer">
                              <div className="font-medium text-slate-900">Bind to Existing Entity</div>
                              <div className="text-xs text-slate-600 mt-0.5">Link to an existing supplier, SKU, or product</div>
                            </Label>
                          </div>
                          <div className="flex items-center space-x-3 p-3 border-2 border-slate-200 rounded-lg bg-white/50 hover:bg-white/80 transition-colors">
                            <RadioGroupItem value="CREATE_NEW" id="create_new" />
                            <Label htmlFor="create_new" className="flex-1 cursor-pointer">
                              <div className="font-medium text-slate-900">Create New Entity</div>
                              <div className="text-xs text-slate-600 mt-0.5">Create a minimal entity stub for binding</div>
                            </Label>
                          </div>
                          <div className="flex items-center space-x-3 p-3 border-2 border-slate-200 rounded-lg bg-white/50 hover:bg-white/80 transition-colors">
                            <RadioGroupItem value="DEFER_BINDING" id="defer_binding" />
                            <Label htmlFor="defer_binding" className="flex-1 cursor-pointer">
                              <div className="font-medium text-slate-900">Defer Binding</div>
                              <div className="text-xs text-slate-600 mt-0.5">Leave unbound, reconcile later</div>
                            </Label>
                          </div>
                        </RadioGroup>
                      </div>

                      {/* BIND_EXISTING: Entity Picker */}
                      {formData.binding_mode === 'BIND_EXISTING' && (
                        <div>
                          <div className="flex items-center gap-2 mb-2">
                            <Label className="text-slate-900 font-medium text-sm">Select Entity *</Label>
                            <Tooltip>
                              <TooltipTrigger>
                                <Info className="w-3.5 h-3.5 text-slate-400" />
                              </TooltipTrigger>
                              <TooltipContent>Select the entity this evidence supports</TooltipContent>
                            </Tooltip>
                          </div>
                          {formData.declared_scope === 'SUPPLIER' && (
                            <Select 
                              value={formData.bound_entity_id || ''} 
                              onValueChange={(value) => {
                                const selected = suppliers.find(s => s.id === value);
                                setFormData({
                                  ...formData, 
                                  bound_entity_id: value,
                                  target_label: selected?.legal_name || selected?.supplier_id,
                                  target_type: 'SUPPLIER',
                                  target_snapshot_min: selected ? {
                                    id: selected.supplier_id,
                                    legal_name: selected.legal_name,
                                    supplier_id: selected.supplier_id,
                                    country_code: selected.country_code,
                                    primary_contact_email: selected.primary_contact_email,
                                    external_supplier_id: selected.external_supplier_id,
                                    vat_number: selected.vat_number
                                  } : null
                                });
                              }}
                            >
                              <SelectTrigger className="h-11 border-2 border-slate-300 bg-white">
                                <SelectValue placeholder="Select supplier" />
                              </SelectTrigger>
                              <SelectContent>
                                {suppliers.map(s => (
                                  <SelectItem key={s.id} value={s.id}>{s.legal_name || s.supplier_id}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          {formData.declared_scope === 'SKU' && (
                            <Select 
                              value={formData.bound_entity_id || ''} 
                              onValueChange={(value) => {
                                const selected = skus.find(s => s.id === value);
                                setFormData({
                                  ...formData, 
                                  bound_entity_id: value,
                                  target_label: selected?.name || selected?.sku_code,
                                  target_type: 'SKU',
                                  target_snapshot_min: selected ? {
                                    id: selected.id,
                                    sku_code: selected.sku_code,
                                    name: selected.name,
                                    sku_id: selected.sku_id
                                  } : null
                                });
                              }}
                            >
                              <SelectTrigger className="h-11 border-2 border-slate-300 bg-white">
                                <SelectValue placeholder="Select SKU" />
                              </SelectTrigger>
                              <SelectContent>
                                {skus.map(s => (
                                  <SelectItem key={s.id} value={s.id}>{s.name || s.sku_code}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                          {suppliers.length === 0 && skus.length === 0 && (
                            <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                              <p className="text-xs text-amber-900">No entities found. Consider CREATE_NEW or DEFER_BINDING.</p>
                            </div>
                          )}
                          {errors.bound_entity_id && (
                            <p className="text-xs text-red-500 mt-1">{errors.bound_entity_id}</p>
                          )}
                        </div>
                      )}

                      {/* CREATE_NEW: Stub Form */}
                      {formData.binding_mode === 'CREATE_NEW' && (
                        <div className="p-4 bg-slate-50/50 border-2 border-slate-200 rounded-xl space-y-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-sm font-medium text-slate-900">Minimal Entity Stub</span>
                            <Tooltip>
                              <TooltipTrigger>
                                <Info className="w-3.5 h-3.5 text-slate-400" />
                              </TooltipTrigger>
                              <TooltipContent>Creates a minimal entity node for binding. Full details belong to evidence payload.</TooltipContent>
                            </Tooltip>
                          </div>
                          {formData.declared_scope === 'SUPPLIER' && (
                            <>
                              <div>
                                <Label className="text-slate-900 font-medium text-sm mb-2 block">Supplier Name *</Label>
                                <Input
                                  value={formData.stub_supplier_name}
                                  onChange={(e) => setFormData({...formData, stub_supplier_name: e.target.value})}
                                  placeholder="e.g., Acme Corporation"
                                  className="border-2 border-slate-300 bg-white"
                                />
                                {errors.stub_supplier_name && (
                                  <p className="text-xs text-red-500 mt-1">{errors.stub_supplier_name}</p>
                                )}
                              </div>
                              <div>
                                <Label className="text-slate-900 font-medium text-sm mb-2 block">Supplier Code (Optional)</Label>
                                <Input
                                  value={formData.stub_supplier_code}
                                  onChange={(e) => setFormData({...formData, stub_supplier_code: e.target.value})}
                                  placeholder="e.g., SUP-001"
                                  className="border-2 border-slate-300 bg-white"
                                />
                              </div>
                            </>
                          )}
                          {formData.declared_scope === 'SKU' && (
                            <>
                              <div>
                                <Label className="text-slate-900 font-medium text-sm mb-2 block">SKU Code *</Label>
                                <Input
                                  value={formData.stub_sku_code}
                                  onChange={(e) => setFormData({...formData, stub_sku_code: e.target.value})}
                                  placeholder="e.g., SKU-12345"
                                  className="border-2 border-slate-300 bg-white"
                                />
                                {errors.stub_sku_code && (
                                  <p className="text-xs text-red-500 mt-1">{errors.stub_sku_code}</p>
                                )}
                              </div>
                              <div>
                                <Label className="text-slate-900 font-medium text-sm mb-2 block">Product Name (Optional)</Label>
                                <Input
                                  value={formData.stub_product_name}
                                  onChange={(e) => setFormData({...formData, stub_product_name: e.target.value})}
                                  placeholder="e.g., Widget Pro"
                                  className="border-2 border-slate-300 bg-white"
                                />
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      {/* DEFER_BINDING: Reconciliation Hint */}
                      {formData.binding_mode === 'DEFER_BINDING' && (
                        <>
                          <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-xl">
                            <div className="flex items-start gap-2">
                              <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                              <div>
                                <p className="text-sm font-medium text-amber-900">UNBOUND Evidence</p>
                                <p className="text-xs text-amber-700 mt-1">This evidence will be blocked from calculations until reconciled and approved.</p>
                              </div>
                            </div>
                          </div>
                          <div>
                            <div className="flex items-center gap-2 mb-2">
                              <Label className="text-slate-900 font-medium text-sm">Reconciliation Hint (Optional)</Label>
                              <Tooltip>
                                <TooltipTrigger>
                                  <Info className="w-3.5 h-3.5 text-slate-400" />
                                </TooltipTrigger>
                                <TooltipContent>Optional hint for matching later, like supplier code, SKU code, ERP material number</TooltipContent>
                              </Tooltip>
                            </div>
                            <Input
                               value={formData.reconciliation_hint}
                               onChange={(e) => setFormData({...formData, reconciliation_hint: e.target.value})}
                               placeholder="e.g., SUP-001, MAT-12345, SKU-ABC"
                               className="border-2 border-slate-300 bg-white"
                             />
                          </div>
                        </>
                      )}

                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Label className="text-slate-900 font-medium text-sm">Provenance Source</Label>
                          <Tooltip>
                            <TooltipTrigger>
                              <Info className="w-3.5 h-3.5 text-slate-400" />
                            </TooltipTrigger>
                            <TooltipContent>Who provided it. This is metadata for audit.</TooltipContent>
                          </Tooltip>
                        </div>
                        <Select value={formData.provenance_source} onValueChange={(value) => {
                          setFormData({...formData, provenance_source: value});
                        }}>
                          <SelectTrigger className="h-11 border-2 border-slate-300 bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="INTERNAL_USER">Internal User</SelectItem>
                            <SelectItem value="SUPPLIER_EXTERNAL">Supplier (External)</SelectItem>
                            <SelectItem value="CONSULTANT_AUDITOR">Consultant/Auditor</SelectItem>
                            <SelectItem value="SYSTEM_GENERATED">System Generated</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-xs text-slate-500 mt-1 font-light">Metadata only</p>
                      </div>

                      <details className="border-2 border-slate-200 rounded-xl">
                        <summary className="p-3 bg-slate-50/50 cursor-pointer hover:bg-slate-100/50 transition-colors">
                          <span className="text-sm font-medium text-slate-700">Advanced: External Reference ID</span>
                        </summary>
                        <div className="p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <Label className="text-slate-900 font-medium text-sm">External Reference ID</Label>
                            <Tooltip>
                              <TooltipTrigger>
                                <Info className="w-3.5 h-3.5 text-slate-400" />
                              </TooltipTrigger>
                              <TooltipContent>Used for idempotency in machine methods. Not required for manual entry.</TooltipContent>
                            </Tooltip>
                          </div>
                          <Input
                             value={formData.external_reference_id}
                             onChange={(e) => setFormData({...formData, external_reference_id: e.target.value})}
                             placeholder="e.g., ERP_TXN_123456"
                             className="border-2 border-slate-300 bg-white"
                           />
                        </div>
                      </details>
                    </>
                  )}
                </div>
              )}

              {/* Step 2: Method Payload */}
              {step === 2 && (
                <Step2PayloadByMethod 
                  formData={formData} 
                  setFormData={setFormData} 
                  errors={errors}
                  adapterMode={adapterMode}
                  draftId={draftId}
                  adapter={adapter}
                  uploadedFiles={uploadedFiles}
                  setUploadedFiles={setUploadedFiles}
                  setCorrelationId={setCorrelationId}
                />
              )}

              {/* Step 3: Review */}
              {step === 3 && draftSnapshot && (
                <Step3ReviewAndSeal
                  formData={draftSnapshot}
                  draftId={draftId}
                  correlationId={correlationId}
                  uploadedFiles={uploadedFiles}
                  adapterMode={adapterMode}
                />
              )}

              {/* Correlation ID Display */}
              {correlationId && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(correlationId);
                    toast.success('Correlation ID copied');
                  }}
                  className="w-full p-3 rounded-lg bg-slate-100/50 hover:bg-slate-100 text-center text-xs text-slate-600 font-mono transition-colors flex items-center justify-center gap-2"
                >
                  <Copy className="w-3 h-3" />
                  Correlation: {correlationId.substring(0, 20)}...
                </button>
              )}
            </CardContent>

            {/* Audit Overlay */}
            {auditLog.lastCall && (
              <div className="border-t border-slate-200/50 bg-slate-900/5 backdrop-blur-sm">
                <div className="px-8 py-3">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-4">
                      <span className="text-slate-600">Step: <span className="font-semibold text-slate-900">{step}/3</span></span>
                      <span className="text-slate-600">Mode: <span className={`font-semibold ${adapterMode === 'mock' ? 'text-amber-700' : 'text-[#86b027]'}`}>{adapterMode.toUpperCase()}</span></span>
                      {draftId && <span className="text-slate-600">Draft: <span className="font-semibold text-slate-900">{draftId.substring(0, 12)}...</span></span>}
                      {correlationId && <span className="text-slate-600">Corr: <span className="font-semibold text-slate-900">{correlationId.substring(0, 12)}...</span></span>}
                    </div>
                    <div className="flex items-center gap-4">
                      <span className="text-slate-600">Last Call: <span className="font-semibold text-slate-900">{auditLog.lastCall}</span></span>
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${auditLog.lastCallStatus === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {auditLog.lastCallStatus?.toUpperCase()}
                      </span>
                      {validationWarnings.length > 0 && (
                        <span className="text-slate-600">Missing: <span className="font-semibold text-amber-700">{validationWarnings.length}</span></span>
                      )}
                    </div>
                  </div>
                </div>
                
                {/* Collapsible Call History */}
                {adapterCallHistory.length > 0 && (
                  <details className="px-8 pb-3">
                    <summary className="text-xs text-slate-600 cursor-pointer hover:text-slate-900 transition-colors font-mono">
                      Call History ({adapterCallHistory.length}/25)
                    </summary>
                    <div className="mt-2 max-h-48 overflow-y-auto bg-slate-900/10 rounded-lg p-3 space-y-1">
                      {adapterCallHistory.map((entry, idx) => (
                        <div key={idx} className="flex items-center justify-between text-xs font-mono py-1 border-b border-slate-200/30 last:border-0">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <span className="text-slate-500 flex-shrink-0">
                              {new Date(entry.timestamp).toLocaleTimeString('en-US', { hour12: false })}
                            </span>
                            <span className="text-slate-900 font-medium truncate">{entry.call_name}</span>
                            {entry.correlation_id && (
                              <span className="text-slate-600 truncate">{entry.correlation_id.substring(0, 8)}...</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {entry.error_code && (
                              <span className="text-red-700 text-xs">{entry.error_code}</span>
                            )}
                            <span className={`w-2 h-2 rounded-full ${entry.success ? 'bg-green-500' : 'bg-red-500'}`} />
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                )}
              </div>
            )}

            {/* Navigation */}
            <div className="flex items-center justify-between p-8 border-t border-slate-300 bg-white">
              <Button
                variant="outline"
                onClick={() => {
                  if (typeof onCancel === 'function') onCancel();
                }}
                className="border-2 border-slate-300 hover:bg-slate-50"
              >
                Cancel
              </Button>

              <div className="flex gap-3">
                {step > 1 && (
                  <Button
                    variant="outline"
                    onClick={() => setStep(step - 1)}
                    className="border-2 border-slate-300 hover:bg-slate-50"
                  >
                    Back
                  </Button>
                )}

                {step < 3 && (
                  <Button
                    onClick={() => {
                      if (step === 1) handleNextFromStep1();
                      else if (step === 2) handleNextFromStep2();
                    }}
                    disabled={createDraftMutation.isPending || updateDraftMutation.isPending}
                    className="bg-slate-900 hover:bg-slate-800 text-white"
                  >
                    {(createDraftMutation.isPending || updateDraftMutation.isPending) ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        Next <ChevronRight className="w-4 h-4" />
                      </>
                    )}
                  </Button>
                )}

                {step === 3 && (
                  <Button
                    onClick={handleSeal}
                    disabled={sealDraftMutation.isPending || !draftSnapshot}
                    className="bg-slate-900 hover:bg-slate-800 text-white gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {sealDraftMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sealing...
                      </>
                    ) : (
                      <>
                        <Shield className="w-4 h-4" />
                        Seal Evidence
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>
          </Card>
          </motion.div>
          </div>
          </div>
          </TooltipProvider>
          </ErrorBoundaryWizard>
          );
          }