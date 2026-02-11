import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, CheckCircle, ChevronRight, FileText, Shield, Copy, Plus, Info, AlertTriangle, GripVertical, Loader2, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';
import { WizardDraftManager, safeCallback } from './utils/wizardDraftManager';
import { 
  getMethodConfig, 
  validateStep1, 
  validateStep2, 
  canProceedToStep2, 
  canProceedToStep3,
  canSeal,
  getAllMethods,
  getAllowedEvidenceTypesForMethod,
  getAllowedScopesForEvidenceType,
  requiresScopeTarget,
  getTargetEntityType,
  getProvenanceChannels,
  isScopeCompatibleWithEvidence
} from './utils/registryValidator';
import SupplierPicker from './pickers/SupplierPicker';
import SKUPicker from './pickers/SKUPicker';
import ProductFamilyPicker from './pickers/ProductFamilyPicker';
import LegalEntityPicker from './pickers/LegalEntityPicker';
import CreateEntityModal from './modals/CreateEntityModal';
import HowMethodsWorkModal from './HowMethodsWorkModal';
import { MockEvidenceApiAdapter } from './adapters/EvidenceApiAdapter';
import { getStepComponent } from './ingestion/stepFactoryRegistry';
import Step2SupplierMasterData from './steps/Step2SupplierMasterData';
import Step2ProductMasterData from './steps/Step2ProductMasterData';
import Step2RegistryDriven from './steps/Step2RegistryDriven';
import PostIngestionSuccessScreen from './PostIngestionSuccessScreen';

export default function IngestionWizardRegistryDriven({ 
  initialDraftId, 
  onComplete, 
  onCancel,
  mode = 'production' 
}) {
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedMethod, setSelectedMethod] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const dragRef = useRef(null);
  const [formData, setFormData] = useState({
    provenance_source: 'INTERNAL_USER',
    retention_policy: 'STANDARD_7_YEARS',
    contains_personal_data: false,
    ingestion_method: '',
    evidence_type: '',
    declared_scope: '',
    binding_mode: '',
    binding_target_type: '',
    bound_entity_id: null,
    binding_target_object: null,
    binding_state: 'NONE', // NONE | BOUND | DEFERRED
    binding_identity: null, // { name, country_code } for BOUND state
    reconciliation_hint: '',
    why_this_evidence: '',
    attestation_notes: '',
    payload_data_json: null,
    external_reference_id: ''
  });
  const [errors, setErrors] = useState({});
  const [correlationId, setCorrelationId] = useState(null);
  const [attachments, setAttachments] = useState([]);
  const [showReceipt, setShowReceipt] = useState(false);
  const [sealResponse, setSealResponse] = useState(null);
  
  // Draft manager instance - single source of truth
  const draftManager = useRef(null);
  const [draftId, setDraftId] = useState(null);

  // Binding state
  const [bindingMode, setBindingMode] = useState('BIND_EXISTING');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showHelpModal, setShowHelpModal] = useState(false);
  const [entityToCreate, setEntityToCreate] = useState(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showAdvancedGDPR, setShowAdvancedGDPR] = useState(false);
  const [mockSealedRefs] = useState(new Set());
  const adapter = new MockEvidenceApiAdapter(mockSealedRefs, () => {});
  const [draftStatus, setDraftStatus] = useState(null);

  // Initialize draft manager on mount + validate adapter
  useEffect(() => {
    const initManager = async () => {
      try {
        const user = await base44.auth.me();
        const tenantId = user.email.split('@')[0];
        draftManager.current = new WizardDraftManager(tenantId, user.id);
        
        const recoveredDraftId = draftManager.current.initialize(initialDraftId);
        if (recoveredDraftId) {
          setDraftId(recoveredDraftId);
          setCorrelationId(draftManager.current.getCorrelationId());
          console.log(`[Wizard] Recovered draft: ${recoveredDraftId}`);
        }

        // STRICT: Validate adapter contract at wizard entry
        if (!adapter || !adapter.entities) {
          setErrors({ 
            general: 'Adapter misconfigured - missing entities interface' 
          });
          console.error('[Wizard] ADAPTER_MISSING: adapter.entities not found');
          return;
        }

        const missing = [];
        if (!adapter.entities.Supplier?.create) missing.push('Supplier.create');
        if (!adapter.entities.Supplier?.read) missing.push('Supplier.read');
        if (!adapter.entities.Supplier?.search) missing.push('Supplier.search');

        if (missing.length > 0) {
          setErrors({ 
            general: `Adapter misconfigured - missing functions: ${missing.join(', ')}` 
          });
          console.error('[Wizard] ADAPTER_CONTRACT_VIOLATION:', missing);
        }
      } catch (error) {
        console.error('[Wizard] Failed to initialize draft manager:', error);
      }
    };
    
    initManager();
  }, [initialDraftId]);

  // Removed: Direct getDraftSnapshot call - not needed for wizard flow
  // Draft state is managed by draftManager and upsertDraft mutations
  
  // Load registry-driven methods
  const availableMethods = getAllMethods();

  // Fetch attachments
  const { data: attachmentsList = [] } = useQuery({
    queryKey: ['evidenceAttachments', draftId],
    queryFn: () => base44.entities.EvidenceAttachment.filter({ evidence_draft_id: draftId }),
    enabled: !!draftId
  });
  
  useEffect(() => {
    // Guard: only update if length changed (prevents infinite loop on reference change)
    if ((attachmentsList?.length || 0) !== attachments.length) {
      setAttachments(attachmentsList || []);
    }
  }, [attachmentsList, attachments.length]);

  // Fetch entity counts for readiness banner
  const { data: productFamilies = [] } = useQuery({
    queryKey: ['productFamilies'],
    queryFn: () => base44.entities.Product.list()
  });

  const { data: skus = [] } = useQuery({
    queryKey: ['skus'],
    queryFn: () => base44.entities.SKU.list()
  });

  // Suppliers via adapter (mock in preview)
  const { data: suppliers = [] } = useQuery({
    queryKey: ['suppliers'],
    queryFn: async () => {
      try {
        // Use unified entities interface
        if (!adapter?.entities?.Supplier?.search) {
          console.warn('[Wizard] Adapter Supplier.search not available');
          return [];
        }
        const result = await adapter.entities.Supplier.search('');
        return result || [];
      } catch (err) {
        console.error('[Wizard] Supplier search failed:', err);
        return [];
      }
    }
  });

  const { data: legalEntities = [] } = useQuery({
    queryKey: ['legalEntities'],
    queryFn: () => base44.entities.LegalEntity.list()
  });

  // STRICT: Auto-switch binding mode when no entities exist
  useEffect(() => {
    if (!formData.declared_scope || !requiresScopeTarget(formData.declared_scope)) return;
    
    const targetEntityType = getTargetEntityType(formData.declared_scope);
    let entityCount = 0;
    
    if (targetEntityType === 'Supplier') entityCount = suppliers?.length || 0;
    else if (targetEntityType === 'SKU') entityCount = skus?.length || 0;
    else if (targetEntityType === 'ProductFamily') entityCount = productFamilies?.length || 0;
    else if (targetEntityType === 'LegalEntity') entityCount = legalEntities?.length || 0;

    // IDEMPOTENT GUARD: Only update if value needs to change
    if (entityCount === 0 && bindingMode === 'BIND_EXISTING') {
      setBindingMode('CREATE_NEW');
    }
  }, [formData.declared_scope, suppliers?.length, skus?.length, productFamilies?.length, legalEntities?.length, bindingMode]);



  const upsertDraftMutation = useMutation({
    mutationFn: async (payload) => {
      // Use DemoDataStore for draft management
      const { demoStore } = await import('@/components/supplylens/DemoDataStore');
      
      if (!draftId) {
        // Create new draft (state: DRAFT_CREATED)
        const draft = demoStore.createEvidenceDraft({
          ingestion_method: payload.ingestion_method,
          evidence_type: payload.evidence_type,
          declared_scope: payload.declared_scope,
          binding_mode: payload.binding_mode,
          bound_entity_type: payload.binding_target_type,
          bound_entity_id: payload.bound_entity_id,
          why_this_evidence: payload.purpose_explanation,
          provenance_source: payload.source_system || payload.provenance_source
        });
        setDraftStatus(draft.status);
        return { data: { draft_id: draft.draft_id, status: draft.status } };
      } else {
        // Update existing draft + attach payload (triggers PAYLOAD_ATTACHED)
        const draft = demoStore.updateEvidenceDraft(draftId, {
          payload_stub: JSON.stringify(payload.payload_data_json || {}),
          attestation_notes: payload.attestation_notes,
          why_this_evidence: payload.purpose_explanation || formData.why_this_evidence,
          provenance_source: payload.source_system || payload.provenance_source || formData.provenance_source
        });
        
        // Run validation (triggers VALIDATED or QUARANTINED)
        const validationResult = demoStore.validateEvidenceDraft(draftId);
        const updatedDraft = demoStore.getEvidenceDraft(draftId);
        setDraftStatus(updatedDraft.status);
        
        return { 
          data: { 
            draft_id: updatedDraft.draft_id, 
            status: updatedDraft.status,
            validation: validationResult
          } 
        };
      }
    },
    onSuccess: (response) => {
      if (response.data?.draft_id) {
        const newDraftId = response.data.draft_id;
        
        if (!draftId) {
          setDraftId(newDraftId);
          toast.success('Draft created');
        } else {
          toast.success('Draft updated');
        }
        
        queryClient.invalidateQueries({ queryKey: ['evidence-drafts'] });
        queryClient.invalidateQueries({ queryKey: ['demo-evidence-drafts'] });
        console.log(`[Wizard] Draft saved: ${newDraftId}`);
      }
    },
    onError: (error) => {
      toast.error(error.message || 'Failed to save draft');
      console.error('[Wizard] Upsert draft failed:', error);
    }
  });

  const [showSuccessScreen, setShowSuccessScreen] = useState(false);

  const sealDraftMutation = useMutation({
    mutationFn: async () => {
      // Use DemoDataStore for sealing
      const { demoStore } = await import('@/components/supplylens/DemoDataStore');
      const draft = demoStore.getEvidenceDraft(draftId);
      if (!draft) {
        throw new Error('Draft not found');
      }
      
      const sealedRecord = demoStore.sealEvidenceDraft(draftId);
      return { data: sealedRecord };
    },
    onSuccess: (response) => {
      if (response.data?.record_id) {
        toast.success('Evidence sealed successfully');
        console.log(`[Wizard] Sealed: ${response.data.record_id}`);
        
        // Invalidate queries
        queryClient.invalidateQueries({ queryKey: ['demo-evidence-vault'] });
        queryClient.invalidateQueries({ queryKey: ['demo-evidence-drafts'] });
        queryClient.invalidateQueries({ queryKey: ['demo-kpis'] });
        queryClient.invalidateQueries({ queryKey: ['demo-activity'] });
        
        // Show success screen with actions
        setSealResponse(response.data);
        setShowSuccessScreen(true);
        
        // Clear draft state
        if (draftManager.current) {
          draftManager.current.clear();
        }
      }
    },
    onError: (error) => {
      toast.error(error?.message || 'Seal failed');
      console.error('[Wizard] Seal failed:', error);
    }
  });

  const handleNext = async () => {
    // Generate correlation ID for this operation if not exists
    const operationCorrId = correlationId || draftManager.current?.getCorrelationId() || `corr_${crypto.randomUUID()}`;
    
    try {
      if (!selectedMethod) {
        toast.error('Please select an ingestion method');
        return;
      }

      const config = getMethodConfig(selectedMethod);
      
      if (currentStep === 1) {
        // SAFETY: Check scope/entity mapping exists
        const targetEntityType = formData.declared_scope && requiresScopeTarget(formData.declared_scope) 
          ? getTargetEntityType(formData.declared_scope)
          : null;

        if (formData.declared_scope && requiresScopeTarget(formData.declared_scope) && !targetEntityType) {
          setErrors({ 
            declared_scope: 'Unsupported scope for this evidence type. Configuration error.' 
          });
          setCorrelationId(operationCorrId);
          toast.error('Scope configuration error');
          console.error(`[Wizard] Missing entity type mapping for scope: ${formData.declared_scope}`, 'Correlation:', operationCorrId);
          return;
        }

        // Run validation
        const validation = validateStep1({
          ingestion_method: selectedMethod,
          evidence_type: formData.evidence_type,
          declared_scope: formData.declared_scope,
          why_this_evidence: formData.why_this_evidence,
          external_reference_id: formData.external_reference_id,
          binding_mode: bindingMode,
          bound_entity_id: formData.bound_entity_id
        });
        
        if (!validation.valid) {
          setErrors(validation.errors);
          setCorrelationId(operationCorrId);
          const count = Object.keys(validation.errors).length;
          toast.error(`Fix ${count} field${count > 1 ? 's' : ''} to continue`);
          return;
        }

        // Build payload with binding data snapshot
        let draftPayload = {
          ingestion_method: selectedMethod,
          provenance_source: formData.provenance_source || 'INTERNAL_USER',
          evidence_type: formData.evidence_type,
          declared_scope: formData.declared_scope,
          source_system: config.defaults.source_system,
          purpose_explanation: formData.why_this_evidence,
          binding_mode: bindingMode,
          retention_policy: formData.retention_policy || 'STANDARD_7_YEARS',
          contains_personal_data: formData.contains_personal_data || false,
          external_reference_id: formData.external_reference_id || null
        };

        // Add binding data snapshot for Step 2 prefill (CRITICAL for Supplier Master Data)
        if ((bindingMode === 'BIND_EXISTING' || bindingMode === 'CREATE_NEW') && formData.bound_entity_id) {
          const bindingObj = formData.binding_target_object;
          
          // If binding object missing, fetch via adapter (edge case recovery)
          let targetMeta = {};
          if (targetEntityType === 'Supplier') {
            if (bindingObj && (bindingObj.name || bindingObj.legal_name)) {
              targetMeta = { 
                supplier_name: bindingObj.name || bindingObj.legal_name, 
                country_code: bindingObj.country_code,
                email: bindingObj.email || null 
              };
            } else {
              // Edge case: fetch supplier via adapter
              try {
                if (adapter?.entities?.Supplier?.read) {
                  const fetchedSupplier = await adapter.entities.Supplier.read(formData.bound_entity_id);
                  if (fetchedSupplier) {
                    targetMeta = {
                      supplier_name: fetchedSupplier.name || fetchedSupplier.legal_name,
                      country_code: fetchedSupplier.country_code,
                      email: fetchedSupplier.email || null
                    };
                  }
                }
              } catch (fetchErr) {
                console.error('[Wizard] Failed to fetch supplier for binding:', fetchErr);
              }
            }
          }
          
          draftPayload._step1_binding = {
            mode: bindingMode,
            target_type: targetEntityType,
            target_id: formData.bound_entity_id,
            target_label: (bindingObj?.name || bindingObj?.legal_name || formData.bound_entity_id),
            target_meta: targetMeta
          };
          
          // Persist into formData for Step 2 access
          setFormData(prev => ({
            ...prev,
            _step1_binding: draftPayload._step1_binding
          }));
        }

        // Add binding fields
        if (bindingMode === 'BIND_EXISTING' || bindingMode === 'CREATE_NEW') {
          draftPayload.binding_target_type = targetEntityType;
          draftPayload.bound_entity_id = formData.bound_entity_id;
        } else if (bindingMode === 'DEFER') {
          draftPayload.binding_target_type = targetEntityType;
          draftPayload.reconciliation_hint = formData.reconciliation_hint || null;
        }

        // Save draft (creates DRAFT_CREATED state)
        const response = await upsertDraftMutation.mutateAsync(draftPayload);

        // Verify draft creation
        if (response?.data?.draft_id) {
          if (!draftId) {
            setDraftId(response.data.draft_id);
            console.log(`[Wizard] Draft created: ${response.data.draft_id}, status: ${response.data.status || 'DRAFT_CREATED'}`);
          }
          
          // State guard: Only proceed if draft created successfully
          if (response.data.status && response.data.status !== 'DRAFT_CREATED') {
            setErrors({ general: `Unexpected draft state: ${response.data.status}` });
            toast.error('Draft creation failed');
            return;
          }
          
          setCurrentStep(2);
          setErrors({});
        } else {
          throw new Error('Server did not return draft_id');
        }
      } else if (currentStep === 2) {
        console.log('[Step2Next] clicked', { method: selectedMethod, evidenceType: formData.evidence_type, bindingState: formData.binding_state });
        
        // PHASE A.3: Require draft_id for Step 2
        if (!draftManager.current?.hasDraftId()) {
          setErrors({ general: 'Draft missing. Return to Step 1 to recreate.' });
          setCorrelationId(operationCorrId);
          toast.error('Draft missing. Return to Step 1.');
          console.error('[Step2Next] Draft ID missing');
          setCurrentStep(1);
          return;
        }

        // BULLETPROOF: Wrap Step 2 validation in try/catch to prevent crashes
        try {
           // CRITICAL: BOM component validation (if applicable)
           if (formData.evidence_type === 'BOM' && formData._bomValidate) {
             const isBomValid = formData._bomValidate();
             if (!isBomValid) {
               toast.error('Fix BOM component errors before proceeding');
               console.error('[Step2Next] BOM validation failed');
               return;
             }
           }

           // PHASE D: Validate Step 2 using registry
           console.log('[Step2Next] Running validation...', {
             method: selectedMethod,
             attestation_length: formData.attestation_notes?.length || 0,
             binding_state: formData.binding_state,
             binding_identity: formData.binding_identity,
             payload_keys: Object.keys(formData.payload_data_json || {})
           });
           
           const validation = validateStep2(selectedMethod, formData, attachments);

           if (!validation.valid) {
             setErrors(validation.errors);
             setCorrelationId(operationCorrId);
             
             console.error('[Step2Next] Validation failed', validation.errors);

             // Enhanced BOM component validation feedback
             if (formData.evidence_type === 'BOM') {
               const payload = formData.payload_data_json || {};
               const components = payload.components || [];

               if (components.length === 0) {
                 toast.error('Add at least one component');
               } else {
                 const invalidComponents = components.filter(c => 
                   !c.component_sku_id && !c.component_sku_code
                 );
                 if (invalidComponents.length > 0) {
                   toast.error(`${invalidComponents.length} component(s) missing SKU/code`);
                 } else {
                   toast.error('Please fix validation errors');
                 }
               }
             } else {
               const errorCount = Object.keys(validation.errors).length;
               toast.error(`Fix ${errorCount} required field${errorCount > 1 ? 's' : ''}`);
             }
             return;
           }
           
           console.log('[Step2Next] Validation passed, saving draft...');

          // CRITICAL: For BOM evidence, inject parent_sku_id + normalize components
          // CRITICAL: Always include retention_policy in Step 2 draft update
          const updatedFormData = { 
            ...formData,
            retention_policy: formData.retention_policy || 'STANDARD_7_YEARS'
          };
          if (formData.evidence_type === 'BOM' && formData.payload_data_json) {
            const components = (formData.payload_data_json.components || []).map(comp => ({
              component_sku_id: comp.component_sku_id || null,
              component_sku_code: comp.component_sku_code || null,
              quantity: comp.quantity,
              uom: comp.uom,
              match_status: comp.component_sku_id ? 'BOUND' : 'PENDING_MATCH'
            }));
            
            // Compute reconciliation_status for BOM
            const hasPendingMatch = components.some(c => c.match_status === 'PENDING_MATCH');
            updatedFormData.reconciliation_status = hasPendingMatch ? 'PENDING_MATCH' : 'BOUND';
            
            if (bindingMode === 'BIND_EXISTING' || bindingMode === 'CREATE_NEW') {
              updatedFormData.payload_data_json = {
                ...formData.payload_data_json,
                parent_sku_id: formData.bound_entity_id,
                components
              };
            } else if (bindingMode === 'DEFER') {
              updatedFormData.payload_data_json = {
                ...formData.payload_data_json,
                parent_sku_id: null,
                components
              };
              updatedFormData.reconciliation_status = 'UNBOUND';
            }
          }

          // Update draft with step 2 data (triggers PAYLOAD_ATTACHED → VALIDATED transition)
          const updatePayload = {
            ...updatedFormData,
            payload_data_json: updatedFormData.payload_data_json,
            attestation_notes: updatedFormData.attestation_notes,
            purpose_explanation: updatedFormData.why_this_evidence
          };
          await upsertDraftMutation.mutateAsync(updatePayload);

          // Verify draft reached VALIDATED state
          const { demoStore } = await import('@/components/supplylens/DemoDataStore');
          const draft = demoStore.getEvidenceDraft(draftId);
          
          if (draft.status === 'QUARANTINED') {
            const reasonCode = draft.quarantine_reason || 'UNKNOWN';
            const errorList = draft.validation_errors || [];
            
            setErrors({ 
              general: `QUARANTINED: ${reasonCode}`,
              quarantine_reason: reasonCode,
              validation_errors: errorList 
            });
            
            const errorSummary = errorList.length > 0 
              ? errorList.map(e => e.message).join('; ')
              : reasonCode;
            
            toast.error(`Quarantined: ${reasonCode}`, { duration: 5000 });
            console.error('[Step2Next] Draft QUARANTINED:', { reasonCode, errors: errorList });
            return;
          }
          
          if (draft.status !== 'VALIDATED') {
            setErrors({ general: `Cannot proceed: draft status is ${draft.status}, must be VALIDATED` });
            toast.error(`Invalid state: ${draft.status}`);
            return;
          }

          console.log('[Step2Next] Draft VALIDATED, navigating to Step 3');
          setCurrentStep(3);
          setErrors({});
        } catch (step2Error) {
          // BULLETPROOF: Capture validation exceptions without crashing
          const errorMessage = step2Error?.message || 'Validation error';
          const truncatedMessage = errorMessage && typeof errorMessage === 'string' 
            ? (errorMessage.length > 120 ? errorMessage.substring(0, 120) + '...' : errorMessage)
            : 'Validation error';
          
          // Set error banner with correlation
          setErrors({
            general: truncatedMessage,
            error_code: 'STEP2_NEXT_CRASH',
            _correlation: operationCorrId
          });
          
          // Log to audit metadata
          if (!window.__EC_AUDIT__) window.__EC_AUDIT__ = { calls: [] };
          window.__EC_AUDIT__.calls.push({
            timestamp: new Date().toISOString(),
            error_code: 'STEP2_NEXT_CRASH',
            correlation_id: operationCorrId,
            stack: step2Error?.stack || 'No stack available',
            evidence_type: formData.evidence_type,
            method: selectedMethod,
            components_count: formData.payload_data_json?.components?.length || 0
          });
          
          toast.error(`Step 2 crash: ${truncatedMessage.substring(0, 40)}...`);
          console.error('[STEP2_NEXT_CRASH]', step2Error, 'Correlation:', operationCorrId);
          
          // Re-throw to outer handler
          throw step2Error;
        }
      }
    } catch (error) {
      // CRITICAL: Always set correlation_id for error tracking
      setCorrelationId(operationCorrId);
      
      // PHASE A.6: Defensive error handling with user-visible banner
      if (error.message === 'DRAFT_MISSING: Draft ID is required but not set. Return to Step 1.') {
        setErrors({ general: `${error.message} (${operationCorrId.substring(0, 12)})` });
        toast.error('Draft missing. Return to Step 1.');
        setCurrentStep(1);
      } else if (error.message?.includes('Unknown scope') || error.message?.includes('scope')) {
        setErrors({ 
          declared_scope: `Scope configuration error: ${error.message}`,
          _correlation: operationCorrId
        });
        toast.error('Invalid scope configuration');
        console.error('[Wizard] Scope error:', error, 'Correlation:', operationCorrId);
      } else {
        // Generic error handling - show banner with correlation
        setErrors({ 
          general: `${error.message || 'An unexpected error occurred'}`,
          _correlation: operationCorrId
        });
        toast.error(`Error (${operationCorrId.substring(0, 8)}...)`);
        console.error('[Wizard] handleNext error:', error, 'Correlation:', operationCorrId);
      }
    }
  };

  const handleSeal = async () => {
    try {
      // State guard: Require draft_id
      if (!draftManager.current?.hasDraftId() || !draftId) {
        setErrors({ general: 'Draft missing. Cannot seal without draft.' });
        toast.error('Draft missing. Return to Step 1.');
        return;
      }

      // State guard: Check draft is VALIDATED before sealing
      const { demoStore } = await import('@/components/supplylens/DemoDataStore');
      const draft = demoStore.getEvidenceDraft(draftId);
      
      if (!draft) {
        setErrors({ general: 'Draft not found' });
        toast.error('Draft not found. Return to Step 1.');
        setCurrentStep(1);
        return;
      }
      
      if (draft.status !== 'VALIDATED' && draft.status !== 'READY_TO_SEAL') {
        setErrors({ general: `Cannot seal: draft status is ${draft.status}, must be VALIDATED` });
        toast.error(`Cannot seal from ${draft.status} state`);
        return;
      }

      if (!canSeal(selectedMethod, formData, attachments, mode)) {
        toast.error('Cannot seal: validation requirements not met');
        return;
      }

      await sealDraftMutation.mutateAsync();
    } catch (error) {
      if (error.message?.includes('DRAFT_MISSING')) {
        setErrors({ general: error.message });
        toast.error('Draft missing. Return to Step 1.');
        setCurrentStep(1);
      } else if (error.message?.includes('Cannot seal')) {
        setErrors({ general: error.message });
        toast.error(error.message);
      } else {
        console.error('[Wizard] handleSeal error:', error);
        toast.error(error.message || 'Seal failed. Please try again.');
      }
    }
  };

  // Auto-expand Advanced if method requires external_reference_id
  useEffect(() => {
    const config = selectedMethod ? getMethodConfig(selectedMethod) : null;
    // Guard: only expand if not already expanded
    if (config?.requires_external_reference_id && !showAdvanced) {
      setShowAdvanced(true);
    }
  }, [selectedMethod, showAdvanced]);

  const renderStep1 = () => {
    const config = selectedMethod ? getMethodConfig(selectedMethod) : null;
    const targetEntityType = formData.declared_scope ? getTargetEntityType(formData.declared_scope) : null;
    const needsTarget = formData.declared_scope && requiresScopeTarget(formData.declared_scope);
    
    // Get entity label for UI
    const entityLabel = targetEntityType === 'ProductFamily' ? 'Product Family' : targetEntityType;
    
    let entityCount = 0;
    if (targetEntityType === 'Supplier') entityCount = suppliers.length;
    else if (targetEntityType === 'SKU') entityCount = skus.length;
    else if (targetEntityType === 'ProductFamily') entityCount = productFamilies.length;
    else if (targetEntityType === 'LegalEntity') entityCount = legalEntities.length;

    return (
      <div className="space-y-6">
        {/* Help Button - Tesla Style */}
        <div className="flex justify-end">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowHelpModal(true)}
            className="text-slate-600 hover:text-slate-900 hover:bg-slate-100/50 backdrop-blur-sm transition-all"
          >
            <Info className="w-4 h-4 mr-2" />
            How Binding Works
          </Button>
        </div>

        {/* System Readiness Banner - Tesla Glassmorphic */}
        {needsTarget && entityCount === 0 && (
          <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-amber-50/80 to-amber-100/40 backdrop-blur-xl rounded-xl border border-amber-200/60 shadow-[0_2px_8px_rgba(251,191,36,0.1)]">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-900">No {entityLabel} found in this tenant</p>
              <p className="text-xs text-amber-700/90 mt-1 font-light">
                You can create a new {entityLabel} now or defer binding for later reconciliation.
              </p>
            </div>
          </div>
        )}

        {/* Method Dropdown - Tesla Minimalist */}
        <div>
          <Label className="text-slate-900 font-medium text-sm mb-2 block">Ingestion Method *</Label>
          <Select 
            value={selectedMethod || ''} 
            onValueChange={(value) => {
              setSelectedMethod(value);
              setFormData(prev => ({ ...prev, ingestion_method: value }));
              setErrors({});
            }}
          >
            <SelectTrigger className="h-11 border-2 border-slate-300 bg-white hover:border-slate-400 transition-all rounded-lg">
              <SelectValue placeholder="Select method" />
            </SelectTrigger>
            <SelectContent className="bg-white border-2 border-slate-300">
              {availableMethods.map(method => (
                <SelectItem key={method.id} value={method.id}>
                  {method.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {errors.ingestion_method && (
            <p className="text-xs text-red-500 mt-1.5 font-light">{errors.ingestion_method}</p>
          )}
        </div>

        {selectedMethod && (
          <>
            {/* Evidence Type - Tesla Clean */}
            <div>
              <Label className="text-slate-900 font-medium text-sm mb-2 block">Evidence Type *</Label>
              <Select 
                value={formData.evidence_type || ''} 
                onValueChange={(value) => {
                  setFormData(prev => {
                    // STRICT: Reset scope if incompatible + clear binding
                    const newFormData = {...prev, evidence_type: value};
                    if (prev.declared_scope && !isScopeCompatibleWithEvidence(value, prev.declared_scope)) {
                      newFormData.declared_scope = '';
                      newFormData.bound_entity_id = null;
                      setBindingMode('BIND_EXISTING');
                    }
                    return newFormData;
                  });
                  setErrors({});
                }}
              >
                <SelectTrigger className="h-11 border-2 border-slate-300 hover:border-slate-400 bg-white shadow-sm transition-all rounded-lg">
                  <SelectValue placeholder="Select evidence type" />
                </SelectTrigger>
                <SelectContent className="bg-white border-2 border-slate-300 shadow-lg">
                  {getAllowedEvidenceTypesForMethod(selectedMethod).map(type => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.evidence_type && (
                <p className="text-xs text-red-500 mt-1.5 font-light">{errors.evidence_type}</p>
              )}
            </div>

            {/* Declared Scope - Tesla Minimalist */}
            {formData.evidence_type && (
              <div>
                <Label className="text-slate-900 font-medium text-sm mb-2 block">Declared Scope *</Label>
                <Select 
                  value={formData.declared_scope || ''} 
                  onValueChange={(value) => {
                    setFormData(prev => ({...prev, declared_scope: value, bound_entity_id: null}));
                    setErrors({});
                  }}
                >
                  <SelectTrigger className="h-11 border-2 border-slate-300 hover:border-slate-400 bg-white shadow-sm transition-all rounded-lg">
                    <SelectValue placeholder="Select scope" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border-2 border-slate-300 shadow-lg">
                    {getAllowedScopesForEvidenceType(formData.evidence_type).map(scope => (
                      <SelectItem key={scope.id} value={scope.id}>
                        {scope.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.declared_scope && (
                  <div className="mt-2 p-2 bg-red-50/80 border border-red-200 rounded-lg">
                    <p className="text-xs text-red-700 font-light">{errors.declared_scope}</p>
                  </div>
                )}
              </div>
            )}

            {/* TASK B: Scope Binding with auto-switch logic */}
            {formData.declared_scope && requiresScopeTarget(formData.declared_scope) && (
              <>
                <div>
                 <Label className="text-slate-900 font-medium text-sm mb-2 block">Scope Binding Mode *</Label>
                 <Select 
                   value={bindingMode} 
                   onValueChange={(value) => {
                     setBindingMode(value);
                     if (value === 'DEFER') {
                       setFormData(prev => ({...prev, bound_entity_id: null}));
                     }
                   }}
                   disabled={selectedMethod === 'ERP_EXPORT_FILE'}
                 >
                   <SelectTrigger className="h-11 border-2 border-slate-300 hover:border-slate-400 bg-white shadow-sm transition-all rounded-lg">
                     <SelectValue />
                   </SelectTrigger>
                   <SelectContent className="bg-white border-2 border-slate-300 shadow-lg">
                     {entityCount > 0 && selectedMethod !== 'ERP_EXPORT_FILE' && (
                       <SelectItem value="BIND_EXISTING">
                         Bind to existing {entityLabel}
                       </SelectItem>
                     )}
                     {selectedMethod !== 'ERP_EXPORT_FILE' && (
                       <SelectItem value="CREATE_NEW">Create new {entityLabel}</SelectItem>
                     )}
                     <SelectItem value="DEFER">
                       Defer binding (ingest unbound)
                       {selectedMethod === 'ERP_EXPORT_FILE' && ' - Recommended'}
                     </SelectItem>
                   </SelectContent>
                 </Select>
                 {entityCount === 0 && selectedMethod !== 'ERP_EXPORT_FILE' && (
                   <p className="text-xs text-amber-700 mt-1.5 font-light">
                     No {entityLabel} found - showing CREATE_NEW and DEFER only
                   </p>
                 )}
                 {selectedMethod === 'ERP_EXPORT_FILE' && (
                   <p className="text-xs text-[#86b027] mt-1.5 font-medium">
                     ERP batch exports must use "Defer binding" mode (dataset snapshot)
                   </p>
                 )}
                </div>

                {bindingMode === 'BIND_EXISTING' && (
                  <div>
                    {/* Binding Status Indicator - BOUND state */}
                    {formData.binding_state === 'BOUND' && formData.bound_entity_id ? (
                      <div className="space-y-3">
                        <div className="p-3 bg-gradient-to-br from-green-50/80 to-emerald-50/40 backdrop-blur-xl rounded-xl border border-green-200/60">
                          <div className="flex items-center gap-2 mb-1">
                            <CheckCircle className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-medium text-green-900">Bound to {entityLabel}</span>
                          </div>
                          <div className="text-xs text-green-700 space-y-0.5 ml-6">
                            <div>ID: <code className="font-mono bg-green-100 px-1 rounded">{formData.bound_entity_id.substring(0, 20)}...</code></div>
                            {formData.binding_identity && (
                              <>
                                <div>Name: <span className="font-medium">{formData.binding_identity.name}</span> (locked)</div>
                                <div>Country: <span className="font-medium">{formData.binding_identity.country_code}</span> (locked)</div>
                              </>
                            )}
                          </div>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setFormData(prev => ({
                              ...prev,
                              bound_entity_id: null,
                              binding_target_object: null,
                              binding_state: 'NONE',
                              binding_identity: null
                            }));
                            toast.info(`Binding reset - select a different ${entityLabel}`);
                          }}
                          className="text-xs border-slate-200 hover:border-slate-300"
                        >
                          Change {entityLabel}
                        </Button>
                      </div>
                    ) : (
                      <>
                        <Label className="text-slate-900 font-medium text-sm mb-2 block">Select {entityLabel} *</Label>
                        {entityCount === 0 ? (
                          <div className="p-6 border-2 border-dashed border-slate-200 rounded-xl text-center bg-gradient-to-br from-slate-50/80 to-white/60 backdrop-blur-md">
                            <p className="text-sm text-slate-700 mb-3 font-light">No {entityLabel} found. Create new or Defer binding.</p>
                            <div className="flex gap-2 justify-center">
                              <Button
                                type="button"
                                size="sm"
                                onClick={() => setBindingMode('CREATE_NEW')}
                                className="bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition-all"
                              >
                                <Plus className="w-4 h-4 mr-1" />
                                Create {entityLabel}
                              </Button>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() => setBindingMode('DEFER')}
                                className="border-slate-200 hover:bg-slate-100/50 backdrop-blur-sm"
                              >
                                Defer Binding
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {targetEntityType === 'Supplier' && (
                              <SupplierPicker
                                value={formData.bound_entity_id}
                                onChange={(id, object) => {
                                  const identity = object ? {
                                    name: object.name || object.legal_name,
                                    country_code: object.country_code
                                  } : null;
                                  setFormData(prev => ({
                                    ...prev, 
                                    bound_entity_id: id, 
                                    binding_target_object: object,
                                    binding_state: id ? 'BOUND' : 'NONE',
                                    binding_identity: identity
                                  }));
                                }}
                                error={errors.bound_entity_id}
                                adapter={adapter}
                              />
                            )}
                            {targetEntityType === 'SKU' && (
                              <SKUPicker
                                value={formData.bound_entity_id}
                                onChange={(id, object) => {
                                  const identity = object ? {
                                    sku_code: object.sku_code,
                                    product_name: object.name
                                  } : null;
                                  setFormData(prev => ({
                                    ...prev, 
                                    bound_entity_id: id, 
                                    binding_target_object: object,
                                    binding_state: id ? 'BOUND' : 'NONE',
                                    binding_identity: identity
                                  }));
                                }}
                                error={errors.bound_entity_id}
                              />
                            )}
                            {targetEntityType === 'ProductFamily' && (
                              <ProductFamilyPicker
                                value={formData.bound_entity_id}
                                onChange={(id, object) => {
                                  const identity = object ? {
                                    sku_code: object.sku_code || object.code,
                                    product_name: object.name
                                  } : null;
                                  setFormData(prev => ({
                                    ...prev, 
                                    bound_entity_id: id, 
                                    binding_target_object: object,
                                    binding_state: id ? 'BOUND' : 'NONE',
                                    binding_identity: identity
                                  }));
                                }}
                                error={errors.bound_entity_id}
                              />
                            )}
                            {targetEntityType === 'LegalEntity' && (
                              <LegalEntityPicker
                                value={formData.bound_entity_id}
                                onChange={(id, object) => setFormData(prev => ({...prev, bound_entity_id: id, binding_target_object: object, binding_state: id ? 'BOUND' : 'NONE'}))}
                                error={errors.bound_entity_id}
                              />
                            )}
                          </>
                        )}
                      </>
                    )}
                  </div>
                )}

                {bindingMode === 'CREATE_NEW' && (
                  <div className="p-4 bg-white rounded-xl border-2 border-[#86b027]/40 shadow-sm">
                    <p className="text-sm text-slate-900/90 mb-3 font-light">
                      Click below to create a new {entityLabel}. It will be automatically selected after creation.
                    </p>
                    <Button
                      type="button"
                      onClick={() => {
                        setEntityToCreate(targetEntityType);
                        setShowCreateModal(true);
                      }}
                      className="bg-slate-900 hover:bg-slate-800 text-white shadow-sm transition-all"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create {entityLabel}
                    </Button>
                  </div>
                )}

                {bindingMode === 'DEFER' && (
                  <>
                    <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-amber-50/80 to-amber-100/40 backdrop-blur-xl rounded-xl border border-amber-200/60 shadow-[0_2px_8px_rgba(251,191,36,0.1)]">
                      <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
                      <div className="text-sm">
                        <p className="font-medium text-amber-900">Unbound Evidence</p>
                        <p className="text-xs mt-1 text-amber-700 font-light">
                          Cannot be used in compliance calculations until reconciled and approved.
                        </p>
                      </div>
                    </div>

                    <div>
                      <Label className="text-slate-900 font-medium text-sm mb-2 block">
                        Reconciliation Hint (optional)
                      </Label>
                      <p className="text-xs text-slate-500 mb-2 font-light">
                        Optional identifier to aid future reconciliation (e.g., SAP code, supplier reference)
                      </p>
                      <Input
                        value={formData.reconciliation_hint || ''}
                        onChange={(e) => {
                          setFormData(prev => ({
                            ...prev, 
                            reconciliation_hint: e.target.value,
                            binding_state: 'DEFERRED'
                          }));
                        }}
                        placeholder="e.g., SKU-12345, MAT-789, SUPP-001"
                        className="h-11 border-2 border-slate-300 hover:border-slate-400 bg-white shadow-sm transition-all rounded-lg"
                        maxLength={120}
                      />
                    </div>
                  </>
                )}
              </>
            )}

            <div>
              <Label className="text-slate-900 font-medium text-sm mb-2 block">Why This Evidence? *</Label>
              <Textarea 
                value={formData.why_this_evidence || ''}
                onChange={(e) => setFormData(prev => ({...prev, why_this_evidence: e.target.value}))}
                placeholder="Explain the purpose and context (minimum 20 characters)"
                rows={3}
                className="border-2 border-slate-300 hover:border-slate-400 bg-white shadow-sm transition-all rounded-lg resize-none"
              />
              {errors.why_this_evidence && (
                <p className="text-xs text-red-500 mt-1.5 font-light">{errors.why_this_evidence}</p>
              )}
            </div>

            {/* Provenance Source - Tesla Clean */}
            <div>
              <Label className="text-slate-900 font-medium text-sm mb-2 block">Provenance Source *</Label>
              <p className="text-xs text-slate-500 mb-2 font-light">Who originated this evidence? (Metadata only)</p>
              <Select 
                value={formData.provenance_source || 'INTERNAL_USER'} 
                onValueChange={(value) => setFormData(prev => ({...prev, provenance_source: value}))}
              >
                <SelectTrigger className="h-11 border-2 border-slate-300 hover:border-slate-400 bg-white shadow-sm transition-all rounded-lg">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-white border-2 border-slate-300 shadow-lg">
                  {getProvenanceChannels().map(channel => (
                    <SelectItem key={channel.id} value={channel.id}>
                      {channel.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-slate-500 mt-1.5 font-light">
                Does not affect method selection or logic
              </p>
            </div>

            {/* Advanced Section - Collapsible */}
            <div className="border-t border-slate-200/50 pt-4">
              <button
                type="button"
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="flex items-center gap-2 text-sm text-slate-700 hover:text-slate-900 transition-colors w-full"
              >
                <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
                <span className="font-medium">Advanced Options</span>
                {config?.requires_external_reference_id && (
                  <Badge className="ml-auto bg-amber-100 text-amber-800 text-xs">Required for this method</Badge>
                )}
              </button>

              {showAdvanced && (
                <div className="mt-4 space-y-4 pl-6 border-l-2 border-slate-200/50">
                  {/* External Reference ID */}
                  <div>
                    <Label className="text-slate-900 font-medium text-sm mb-2 block">
                      External Reference ID
                      {config?.requires_external_reference_id && ' *'}
                    </Label>
                    <p className="text-xs text-slate-500 mb-2 font-light">
                      {config?.requires_external_reference_id 
                        ? 'Idempotency key for machine ingestion (prevents duplicate processing)' 
                        : 'Optional identifier for external system linkage'}
                    </p>
                    <Input 
                      value={formData.external_reference_id || ''}
                      onChange={(e) => setFormData(prev => ({...prev, external_reference_id: e.target.value}))}
                      placeholder={config?.requires_external_reference_id 
                        ? "e.g., RUN-20260130-001, BATCH-789" 
                        : "e.g., EMAIL-REF-123, TICKET-456"}
                      className={`h-11 border-2 ${
                        errors.external_reference_id ? 'border-red-300' : 'border-slate-300'
                      } hover:border-slate-400 bg-white shadow-sm transition-all rounded-lg`}
                      maxLength={120}
                    />
                    {errors.external_reference_id && (
                      <p className="text-xs text-red-500 mt-1.5 font-light">{errors.external_reference_id}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {/* Draft State Display */}
        {draftId && draftStatus && (
          <div className={`flex items-center gap-3 p-3 rounded-xl border ${
            draftStatus === 'DRAFT_CREATED' ? 'bg-slate-50 border-slate-200' :
            draftStatus === 'VALIDATED' ? 'bg-blue-50 border-blue-200' :
            draftStatus === 'QUARANTINED' ? 'bg-red-50 border-red-200' :
            'bg-slate-50 border-slate-200'
          }`}>
            <div className={`w-2 h-2 rounded-full ${
              draftStatus === 'DRAFT_CREATED' ? 'bg-slate-500' :
              draftStatus === 'VALIDATED' ? 'bg-blue-500' :
              draftStatus === 'QUARANTINED' ? 'bg-red-500' :
              'bg-slate-400'
            }`} />
            <div className="flex-1">
              <p className="text-xs font-medium text-slate-900">Draft State: {draftStatus}</p>
              <p className="text-xs text-slate-600 mt-0.5">Draft ID: {draftId.substring(0, 20)}...</p>
            </div>
          </div>
        )}

        {/* Validation Summary Banner */}
        {Object.keys(errors).length > 0 && (
          <div className="flex items-start gap-3 p-4 bg-gradient-to-br from-red-50/80 to-rose-50/40 backdrop-blur-xl rounded-xl border border-red-200/60 shadow-[0_2px_8px_rgba(239,68,68,0.1)]">
            <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-red-900">
                {errors.quarantine_reason 
                  ? `QUARANTINED: ${errors.quarantine_reason}`
                  : `Fix ${Object.keys(errors).filter(k => !k.startsWith('_')).length} field${Object.keys(errors).length > 1 ? 's' : ''} to continue`
                }
              </p>
              <ul className="text-xs text-red-800/90 mt-1.5 space-y-1 font-light">
                {Object.entries(errors).filter(([k]) => !k.startsWith('_')).map(([field, message]) => (
                  <li key={field}>• {typeof field === 'string' ? (field ? field.replace(/_/g, ' ') : 'Unknown') : field}: {typeof message === 'string' ? message : JSON.stringify(message)}</li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Modals */}
        <CreateEntityModal
          entityType={entityToCreate}
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            setEntityToCreate(null);
          }}
          onCreated={(newEntityId, entityObject) => {
            // TRANSACTIONAL BIND: Store locked identity snapshot
            let lockedIdentity = null;
            if (targetEntityType === 'Supplier') {
              lockedIdentity = {
                name: entityObject.name || entityObject.legal_name,
                country_code: entityObject.country_code
              };
            } else if (targetEntityType === 'SKU' || targetEntityType === 'ProductFamily') {
              lockedIdentity = {
                sku_code: entityObject.sku_code || entityObject.code,
                product_name: entityObject.name
              };
            }

            setFormData(prev => ({
              ...prev, 
              bound_entity_id: newEntityId,
              binding_target_object: entityObject,
              binding_state: 'BOUND',
              binding_identity: lockedIdentity
            }));
            setBindingMode('BIND_EXISTING');
            queryClient.invalidateQueries();
            setShowCreateModal(false);
            setEntityToCreate(null);
            toast.success(`${entityToCreate} created (ID: ${newEntityId.substring(0, 12)}...)`);
            console.log('[Wizard] Transactional bind complete:', { newEntityId, lockedIdentity });
          }}
          adapter={adapter}
        />

        <HowMethodsWorkModal
          isOpen={showHelpModal}
          onClose={() => setShowHelpModal(false)}
        />
      </div>
    );
  };

  const renderStep2 = () => {
    // Route to appropriate Step 2 component based on evidence type
    const isSupplierMaster = formData.evidence_type === 'SUPPLIER_MASTER' && selectedMethod === 'MANUAL_ENTRY';
    const isProductMaster = formData.evidence_type === 'PRODUCT_MASTER' && selectedMethod === 'MANUAL_ENTRY';
    
    let stepProps, Step2Component;
    
    if (isSupplierMaster) {
      stepProps = {
        formData,
        setFormData,
        errors,
        bindingData: formData._step1_binding,
        adapter: adapter
      };
      Step2Component = Step2SupplierMasterData;
    } else if (isProductMaster) {
      stepProps = {
        formData,
        setFormData,
        errors,
        bindingData: formData._step1_binding
      };
      Step2Component = Step2ProductMasterData;
    } else {
      stepProps = {
        methodId: selectedMethod,
        formData,
        setFormData,
        errors,
        attachments,
        onFileUpload: (e) => {
          const files = Array.from(e.target.files || []);
          console.log('Files to upload:', files);
        },
        adapterMode: adapter.mode
      };
      Step2Component = Step2RegistryDriven;
    }

    return (
      <div className="space-y-6">
        <Step2Component {...stepProps} />

        {/* Advanced GDPR Controls */}
        <div className="p-4 bg-white border-2 border-slate-300 rounded-lg shadow-sm">
          <button
            type="button"
            onClick={() => setShowAdvancedGDPR(!showAdvancedGDPR)}
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ChevronRight className={`w-4 h-4 transition-transform ${showAdvancedGDPR ? 'rotate-90' : ''}`} />
            <span className="font-medium">Advanced: Data Handling</span>
          </button>
          
          {showAdvancedGDPR && (
            <div className="mt-4 space-y-4 pl-6">
              <div className="flex items-start gap-3">
                <input
                  type="checkbox"
                  id="contains_personal_data"
                  checked={formData.contains_personal_data}
                  onChange={(e) => setFormData(prev => ({...prev, contains_personal_data: e.target.checked}))}
                  className="mt-1"
                />
                <div>
                  <Label htmlFor="contains_personal_data" className="text-sm font-medium text-slate-700">
                    Contains Personal Data
                  </Label>
                  <p className="text-xs text-slate-500 mt-1">
                    Auto-detected from payload. Check if this evidence contains PII (GDPR).
                  </p>
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-slate-700 mb-2 block">Retention Policy</Label>
                <select
                  value={formData.retention_policy}
                  onChange={(e) => setFormData(prev => ({...prev, retention_policy: e.target.value}))}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:ring-2 focus:ring-[#86b027]/20 focus:border-[#86b027]"
                >
                  <option value="STANDARD_1_YEAR">Standard (1 year)</option>
                  <option value="STANDARD_7_YEARS">Standard (7 years)</option>
                  <option value="LEGAL_HOLD">Legal Hold</option>
                  <option value="CUSTOMER_CONTRACT">Customer Contract</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderReceipt = () => {
    if (!sealResponse) return null;

    const config = selectedMethod ? getMethodConfig(selectedMethod) : null;
    const targetEntityType = formData.declared_scope ? getTargetEntityType(formData.declared_scope) : null;
    const hasHash = sealResponse.payload_sha256 && sealResponse.payload_sha256 !== 'MOCK_PAYLOAD_HASH';
    
    // Critical field validation
    const isMissingCriticalFields = !sealResponse.sealed_at_utc || !sealResponse.payload_sha256;
    const isRealMode = adapter.mode === 'real';
    
    if (isMissingCriticalFields) {
      return (
        <div className="space-y-6">
          <div className="flex items-center gap-4 p-6 bg-gradient-to-br from-red-50/80 to-red-50/40 backdrop-blur-xl rounded-xl border-2 border-red-200/60">
            <AlertTriangle className="w-10 h-10 text-red-600" />
            <div>
              <h3 className="text-xl font-semibold text-red-900">Seal Operation Failed</h3>
              <p className="text-sm text-red-700 mt-0.5">Critical fields missing from seal response</p>
            </div>
          </div>
          
          <div className="p-6 bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-xl rounded-xl border-2 border-slate-200">
            <p className="text-sm text-red-900 font-medium mb-3">Missing Required Fields:</p>
            <ul className="text-xs text-red-800 space-y-1 ml-4">
              {!sealResponse.sealed_at_utc && <li>• sealed_at_utc</li>}
              {!sealResponse.payload_sha256 && <li>• payload_sha256</li>}
            </ul>
            {correlationId && (
              <div className="mt-4 pt-4 border-t border-slate-200">
                <p className="text-xs text-slate-600 font-medium mb-2">Correlation ID (for support):</p>
                <code className="text-xs font-mono text-slate-900 bg-slate-100 px-2 py-1 rounded">{correlationId}</code>
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Success Header */}
        <div className="flex items-center gap-4 p-6 bg-gradient-to-br from-green-50/80 to-emerald-50/40 backdrop-blur-xl rounded-xl border-2 border-green-200/60">
          <CheckCircle className="w-10 h-10 text-green-600" />
          <div>
            <h3 className="text-xl font-semibold text-green-900">Evidence Sealed</h3>
            <p className="text-sm text-green-700 mt-0.5">Immutable record created successfully</p>
            <p className="text-xs text-green-600 mt-1">
              Environment: {isRealMode ? 'Production API' : 'Preview (Base44)'}
            </p>
          </div>
        </div>

        {/* Record Details */}
        <div className="p-6 bg-white rounded-xl border-2 border-slate-300 shadow-sm space-y-4">
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Record Details</h3>
          
          <div className="space-y-3 text-sm">
            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <span className="text-slate-700 font-medium">Record ID</span>
              <code className="text-xs font-mono text-slate-900 bg-slate-100 px-2 py-1 rounded">
                {sealResponse.record_id}
              </code>
            </div>

            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <span className="text-slate-700 font-medium">Tenant ID</span>
              <code className="text-xs font-mono text-slate-900 bg-slate-100 px-2 py-1 rounded">
                {sealResponse.tenant_id || 'N/A'}
              </code>
            </div>

            {isRealMode && sealResponse.tenant_id && typeof sealResponse.tenant_id === 'string' && sealResponse.tenant_id.trim() !== '' && (
              <div className="flex justify-between items-center pb-3 border-b border-slate-100">
                <span className="text-slate-700 font-medium">Tenant ID</span>
                <code className="text-xs font-mono text-slate-900 bg-slate-100 px-2 py-1 rounded">
                  {sealResponse.tenant_id}
                </code>
              </div>
            )}

            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <span className="text-slate-700 font-medium">Correlation ID</span>
              <code className="text-xs font-mono text-slate-900 bg-slate-100 px-2 py-1 rounded">
                {sealResponse.correlation_id || correlationId}
              </code>
            </div>

            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <span className="text-slate-700 font-medium">Sealed At (UTC)</span>
              <code className="text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded">
                {sealResponse.sealed_at_utc}
              </code>
            </div>

            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <span className="text-slate-700 font-medium">Review Status</span>
              <Badge variant={sealResponse.review_status === 'ACCEPTED' ? 'default' : 'outline'} className="text-xs">
              {sealResponse.review_status || 'NOT_REVIEWED'}
              </Badge>
            </div>

            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <span className="text-slate-700 font-medium">Attestation</span>
              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-800 border-blue-200">
                DECLARED
              </Badge>
            </div>

            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <span className="text-slate-700 font-medium">Verification</span>
              <Badge variant="outline" className="text-xs bg-slate-50 text-slate-700">
                NOT_VERIFIED
              </Badge>
            </div>

            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <span className="text-slate-700 font-medium">Scope Binding Status</span>
              <Badge variant={
                formData.binding_state === 'BOUND' ? 'default' : 
                formData.binding_state === 'DEFERRED' ? 'outline' : 
                'destructive'
              } className="text-xs">
                {sealResponse.scope_binding_status || (formData.binding_state === 'BOUND' ? 'BOUND' : 'UNRESOLVED')}
              </Badge>
            </div>

            {formData.binding_state === 'BOUND' && formData.bound_entity_id && (
              <>
                <div className="flex justify-between">
                  <span className="text-slate-600">Target Entity Type:</span>
                  <span className="text-slate-900">{targetEntityType || 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Target Entity ID:</span>
                  <code className="text-xs font-mono text-slate-700">{formData.bound_entity_id.substring(0, 20)}...</code>
                </div>
                {formData.binding_identity && (
                  <div className="pt-2 bg-green-50/60 p-2 rounded border border-green-200">
                    <p className="text-xs text-green-800 font-medium mb-1">Identity Snapshot (Locked):</p>
                    <div className="text-xs text-green-700 space-y-0.5 ml-2">
                      <div>Name: {formData.binding_identity.name}</div>
                      <div>Country: {formData.binding_identity.country_code}</div>
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="flex justify-between items-center pb-3 border-b border-slate-100">
              <span className="text-slate-700 font-medium">Evidence Receipt ID</span>
              <code className="text-xs font-mono text-slate-900 bg-slate-100 px-2 py-1 rounded">
                {sealResponse.evidence_receipt_id || `RCPT-${sealResponse.display_id || 'N/A'}`}
              </code>
            </div>

            {sealResponse.payload_sha256 && (
              <div className="pt-2 space-y-3">
                <div>
                  <span className="text-slate-700 font-medium block mb-2">
                    {hasHash && isRealMode ? 'Cryptographic Hash' : 'Preview Hash'}
                  </span>
                  <div className="space-y-2">
                    <div>
                      <p className="text-xs text-slate-600 mb-1">Algorithm: SHA-256</p>
                      <code className="text-xs font-mono text-slate-700 bg-slate-50 p-2 rounded border border-slate-200 block break-all">
                        {sealResponse.payload_sha256}
                      </code>
                    </div>
                    {(!hasHash || !isRealMode) && (
                      <p className="text-xs text-amber-700 italic">Preview mode: hash computed client-side for demonstration</p>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-xs text-slate-600 mb-1">Hash Scope:</p>
                  <code className="text-xs font-mono text-slate-700 bg-slate-50 px-2 py-1 rounded border border-slate-200">
                    {sealResponse.hash_scope || 'canonical_payload_plus_metadata'}
                  </code>
                </div>

                {hasHash && isRealMode && (
                  <div className="space-y-1 bg-slate-50 p-3 rounded border border-slate-200">
                    <p className="text-xs text-slate-700 font-medium">Canonicalization:</p>
                    <ul className="text-xs text-slate-600 space-y-0.5 ml-4">
                      <li>• Computed server-side</li>
                      <li>• Deterministic canonical JSON serialization</li>
                      <li>• Immutable after seal</li>
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Evidence Summary */}
        <div className="p-6 bg-white rounded-xl border-2 border-slate-300 shadow-sm space-y-4">
          <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Evidence Summary</h3>
          
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-700">Method:</span>
              <span className="text-slate-900 font-medium">{config?.label || selectedMethod}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-700">Evidence Type:</span>
              <span className="text-slate-900 font-medium">
                {formData.evidence_type === 'SUPPLIER_MASTER' ? 'Supplier Master Data' :
                 formData.evidence_type === 'PRODUCT_MASTER' ? 'Product Master Data' :
                 formData.evidence_type === 'BOM' ? 'Bill of Materials' :
                 formData.evidence_type}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-700">Declared Scope:</span>
              <span className="text-slate-900 font-medium">{formData.declared_scope}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-700">Binding:</span>
              <span className="text-slate-900 font-medium">
                {bindingMode === 'BIND_EXISTING' && formData.bound_entity_id && `Bound to ${targetEntityType}`}
                {bindingMode === 'CREATE_NEW' && formData.bound_entity_id && `New ${targetEntityType} created`}
                {bindingMode === 'DEFER' && 'UNBOUND (deferred)'}
              </span>
            </div>
          </div>
        </div>

        {/* Next Steps */}
        <div className="flex items-start gap-3 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
          <Info className="w-5 h-5 text-blue-600 mt-0.5" />
          <div className="text-sm">
            <p className="font-medium text-blue-900">Next Steps</p>
            <p className="text-xs text-blue-700 mt-1">
              View this record in the Evidence Vault or create another evidence entry.
            </p>
          </div>
        </div>

        {/* Backend Receipt Contract - Developer Info */}
        {(adapter.mode === 'mock' || !sealResponse?.tenant_id) && (
          <details className="border border-slate-200 rounded-lg">
            <summary className="p-3 bg-slate-50 cursor-pointer hover:bg-slate-100 text-xs font-medium text-slate-700">
              Backend Receipt Contract
            </summary>
            <div className="p-3 bg-white text-xs text-slate-600 space-y-1">
              <p className="font-medium text-slate-700 mb-2">Backend must return:</p>
              <ul className="space-y-0.5 ml-4">
                <li>• tenant_id (required in production)</li>
                <li>• actor_id (user/service identity)</li>
                <li>• record_id</li>
                <li>• correlation_id</li>
                <li>• sealed_at_utc</li>
                <li>• hash_alg + hash_value</li>
                <li>• hash_scope</li>
              </ul>
            </div>
          </details>
        )}
      </div>
    );
  };

  const renderStep3 = () => {
    if (!selectedMethod) {
      return (
        <div className="p-8 text-center text-slate-500">
          Configuration error. Please restart the wizard.
        </div>
      );
    }
    
    const config = getMethodConfig(selectedMethod);
    const targetEntityType = formData.declared_scope ? getTargetEntityType(formData.declared_scope) : null;
    const payload = (formData.payload_data_json || {});
    const isMock = adapter.mode === 'mock';

    return (
      <div className="space-y-6">
        <div className="p-6 bg-white rounded-xl border-2 border-slate-300 shadow-[0_4px_16px_rgba(0,0,0,0.12)]">
          <h3 className="font-semibold text-slate-900 mb-4 text-lg">Review Before Sealing</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-700 font-medium">Method:</span>
              <span className="font-semibold text-slate-900">{config.label}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-700 font-medium">Evidence Type:</span>
              <span className="font-semibold text-slate-900">
                {formData.evidence_type === 'SUPPLIER_MASTER' ? 'Supplier Master Data' :
                 formData.evidence_type === 'PRODUCT_MASTER' ? 'Product Master Data' :
                 formData.evidence_type === 'BOM' ? 'Bill of Materials' :
                 formData.evidence_type === 'CERTIFICATE' ? 'Certificate / Compliance Document' :
                 formData.evidence_type === 'TEST_REPORT' ? 'Test Report / Lab Results' :
                 formData.evidence_type === 'TRANSACTION_LOG' ? 'Transaction / Shipment Log' :
                 formData.evidence_type}
              </span>
            </div>

            {/* Declared Scope Display */}
            <div className="flex justify-between pt-2 border-t border-slate-200/50">
              <span className="text-slate-700 font-medium">Declared Scope:</span>
              <span className="font-semibold text-slate-900">
                {formData.declared_scope === 'PRODUCT' ? 'Product / SKU' : 
                 formData.declared_scope === 'PRODUCT_FAMILY' ? 'Product Family' :
                 formData.declared_scope === 'LEGAL_ENTITY' ? 'Legal Entity' :
                 formData.declared_scope === 'SUPPLIER' ? 'Supplier' :
                 formData.declared_scope === 'SITE' ? 'Site / Facility' :
                 formData.declared_scope === 'ENTIRE_ORG' ? 'Entire Organization' :
                 formData.declared_scope}
              </span>
            </div>

            {/* Binding Summary */}
            <div className="flex justify-between pt-2 border-t border-slate-200/50">
              <span className="text-slate-700 font-medium">Binding:</span>
              <span className="font-medium text-slate-900">
                {bindingMode === 'BIND_EXISTING' && formData.bound_entity_id && `Bound to ${targetEntityType === 'ProductFamily' ? 'Product Family' : targetEntityType}`}
                {bindingMode === 'CREATE_NEW' && formData.bound_entity_id && `New ${targetEntityType === 'ProductFamily' ? 'Product Family' : targetEntityType} created`}
                {bindingMode === 'DEFER' && 'UNBOUND (deferred)'}
              </span>
            </div>
            {formData.bound_entity_id && (
              <div className="flex justify-between">
                <span className="text-slate-600">Target ID:</span>
                <span className="font-mono text-xs text-slate-700">{formData.bound_entity_id}</span>
              </div>
            )}
            {bindingMode === 'DEFER' && formData.reconciliation_hint && (
              <div className="flex justify-between">
                <span className="text-slate-600">Reconciliation Hint:</span>
                <span className="font-mono text-xs text-slate-700">{formData.reconciliation_hint}</span>
              </div>
            )}

            {/* Purpose */}
            <div className="flex justify-between pt-2 border-t border-slate-200/50">
              <span className="text-slate-700 font-medium">Purpose:</span>
              <span className="text-slate-900 text-right max-w-md">{formData.why_this_evidence}</span>
            </div>

            {/* Provenance */}
            <div className="flex justify-between">
              <span className="text-slate-700 font-medium">Provenance:</span>
              <span className="text-slate-900">{formData.provenance_source || 'INTERNAL_USER'}</span>
            </div>

            {/* Attestation Notes (Manual Entry) */}
            {selectedMethod === 'MANUAL_ENTRY' && formData.attestation_notes && (
              <div className="flex justify-between pt-2 border-t border-slate-200/50">
                <span className="text-slate-700 font-medium">Attestation:</span>
                <span className="text-slate-900 text-right max-w-md text-xs">{formData.attestation_notes.substring(0, 80)}{formData.attestation_notes.length > 80 ? '...' : ''}</span>
              </div>
            )}

            {/* Payload Summary - Separated Binding Identity vs Claims */}
            {selectedMethod === 'MANUAL_ENTRY' && formData.evidence_type === 'SUPPLIER_MASTER' && (
              <div className="pt-2 border-t border-slate-200/50 space-y-3">
                {/* A) Binding Identity */}
                {formData.binding_state === 'BOUND' && formData.binding_identity && (
                  <div>
                    <span className="text-slate-700 font-medium block mb-2">A) Binding Identity (Locked):</span>
                    <div className="space-y-1 pl-4 text-xs">
                      <div className="flex gap-2"><span className="text-slate-600">Supplier ID:</span><span className="text-slate-900 font-mono">{formData.bound_entity_id?.substring(0, 20)}...</span></div>
                      <div className="flex gap-2"><span className="text-slate-600">Name:</span><span className="text-slate-900 font-medium">{formData.binding_identity.name}</span></div>
                      <div className="flex gap-2"><span className="text-slate-600">Country:</span><span className="text-slate-900 font-medium">{formData.binding_identity.country_code}</span></div>
                    </div>
                  </div>
                )}
                {/* B) Claims to be Sealed */}
                <div>
                  <span className="text-slate-700 font-medium block mb-2">
                    {formData.binding_state === 'BOUND' ? 'B) Claims to be Sealed:' : 'Payload Summary:'}
                  </span>
                  <div className="space-y-1 pl-4 text-xs">
                    {payload.supplier_code && <div className="flex gap-2"><span className="text-slate-600">Code:</span><span className="text-slate-900">{payload.supplier_code}</span><Badge className="ml-2 bg-blue-100 text-blue-800 text-xs">confidence: DECLARED</Badge></div>}
                    {payload.vat_id && <div className="flex gap-2"><span className="text-slate-600">VAT ID:</span><span className="text-slate-900">{payload.vat_id}</span><Badge className="ml-2 bg-blue-100 text-blue-800 text-xs">confidence: DECLARED</Badge></div>}
                    {payload.address && <div className="flex gap-2"><span className="text-slate-600">Address:</span><span className="text-slate-900">{payload.address.substring(0, 40)}...</span></div>}
                    {payload.contact_email && <div className="flex gap-2"><span className="text-slate-600">Email:</span><span className="text-slate-900">{payload.contact_email}</span></div>}
                    {formData.binding_state !== 'BOUND' && payload.supplier_name && <div className="flex gap-2"><span className="text-slate-600">Name:</span><span className="text-slate-900 font-medium">{payload.supplier_name}</span></div>}
                    {formData.binding_state !== 'BOUND' && payload.country_code && <div className="flex gap-2"><span className="text-slate-600">Country:</span><span className="text-slate-900">{payload.country_code}</span></div>}
                  </div>
                </div>
              </div>
            )}
            {selectedMethod === 'MANUAL_ENTRY' && formData.evidence_type === 'PRODUCT_MASTER' && (
              <div className="pt-2 border-t border-slate-200/50 space-y-3">
                {/* A) Binding Identity */}
                {formData.binding_state === 'BOUND' && formData.binding_identity && (
                  <div>
                    <span className="text-slate-700 font-medium block mb-2">A) Binding Identity (Locked):</span>
                    <div className="space-y-1 pl-4 text-xs">
                      <div className="flex gap-2"><span className="text-slate-600">SKU/Product ID:</span><span className="text-slate-900 font-mono">{formData.bound_entity_id?.substring(0, 20)}...</span></div>
                      <div className="flex gap-2"><span className="text-slate-600">SKU Code:</span><span className="text-slate-900 font-medium">{formData.binding_identity.sku_code}</span></div>
                      <div className="flex gap-2"><span className="text-slate-600">Product Name:</span><span className="text-slate-900 font-medium">{formData.binding_identity.product_name}</span></div>
                    </div>
                  </div>
                )}
                {/* B) Claims to be Sealed */}
                <div>
                  <span className="text-slate-700 font-medium block mb-2">
                    {formData.binding_state === 'BOUND' ? 'B) Claims to be Sealed:' : 'Payload Summary:'}
                  </span>
                  <div className="space-y-1 pl-4 text-xs">
                    {payload.hs_code && <div className="flex gap-2"><span className="text-slate-600">HS Code:</span><span className="text-slate-900">{payload.hs_code}</span><Badge className="ml-2 bg-blue-100 text-blue-800 text-xs">confidence: DECLARED</Badge></div>}
                    {payload.category && <div className="flex gap-2"><span className="text-slate-600">Category:</span><span className="text-slate-900">{payload.category}</span></div>}
                    {payload.weight_kg && <div className="flex gap-2"><span className="text-slate-600">Weight:</span><span className="text-slate-900">{payload.weight_kg} kg</span></div>}
                    {payload.uom && <div className="flex gap-2"><span className="text-slate-600">UOM:</span><span className="text-slate-900">{payload.uom}</span></div>}
                    {payload.description && <div className="flex gap-2"><span className="text-slate-600">Desc:</span><span className="text-slate-900">{payload.description.substring(0, 40)}...</span></div>}
                    {formData.binding_state !== 'BOUND' && payload.product_code_claim && <div className="flex gap-2"><span className="text-slate-600">Code Claim:</span><span className="text-slate-900 font-medium">{payload.product_code_claim}</span></div>}
                    {formData.binding_state !== 'BOUND' && payload.product_name_claim && <div className="flex gap-2"><span className="text-slate-600">Name Claim:</span><span className="text-slate-900 font-medium">{payload.product_name_claim}</span></div>}
                  </div>
                </div>
              </div>
            )}
            {selectedMethod === 'MANUAL_ENTRY' && formData.evidence_type === 'BOM' && (
              <div className="pt-2 border-t border-slate-200/50">
                <span className="text-slate-700 font-medium block mb-2">BOM Components:</span>
                <div className="space-y-1 pl-4 text-xs">
                  {(payload.components || []).map((comp, idx) => (
                    <div key={idx} className="flex gap-2 items-center">
                      <span className="text-slate-600">#{idx + 1}:</span>
                      {comp.component_sku_id ? (
                        <Badge className="bg-green-100 text-green-800 text-xs">Bound: {comp.component_sku_id.substring(0, 12)}</Badge>
                      ) : comp.component_sku_code ? (
                        <Badge className="bg-amber-100 text-amber-800 text-xs">Pending Match: {comp.component_sku_code}</Badge>
                      ) : (
                        <Badge className="bg-red-100 text-red-800 text-xs">Invalid</Badge>
                      )}
                      <span className="text-slate-900">{comp.quantity} {comp.uom}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Data Handling Summary */}
            {(formData.contains_personal_data || formData.retention_policy !== 'STANDARD_7_YEARS') && (
              <div className="pt-2 border-t border-slate-200/50">
                <span className="text-slate-700 font-medium block mb-2">Data Handling:</span>
                <div className="space-y-1 pl-4 text-xs">
                  {formData.contains_personal_data && (
                    <div className="flex gap-2">
                      <span className="text-amber-600 font-medium">⚠</span>
                      <span className="text-slate-900">Contains Personal Data (GDPR)</span>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <span className="text-slate-600">Retention:</span>
                    <span className="text-slate-900">{String(formData.retention_policy || 'STANDARD_7_YEARS').replace(/_/g, ' ')}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-between pt-2 border-t border-slate-200/50">
              <span className="text-slate-600">Draft ID:</span>
              <span className="font-mono text-xs text-slate-700">{draftId}</span>
            </div>
            {attachments.length > 0 && (
              <div className="flex justify-between">
                <span className="text-slate-600">Attachments:</span>
                <span className="font-medium text-slate-900">{attachments.length} file(s)</span>
              </div>
            )}
          </div>
        </div>

        {/* Sealing Info Banner - Mode Aware */}
        {!isMock ? (
          <div className="flex items-center gap-3 text-sm text-slate-700 p-4 bg-gradient-to-br from-blue-50/80 to-cyan-50/40 backdrop-blur-xl rounded-xl border border-blue-200/60 shadow-[0_2px_8px_rgba(59,130,246,0.08)]">
            <Shield className="w-4 h-4 text-blue-600" />
            <span className="font-light">Sealing will create an immutable, auditable evidence record with cryptographic hash</span>
          </div>
        ) : (
          <div className="flex items-center gap-3 text-sm text-amber-900 p-4 bg-gradient-to-br from-amber-50/80 to-amber-100/40 backdrop-blur-xl rounded-xl border border-amber-200/60 shadow-[0_2px_8px_rgba(251,191,36,0.1)]">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <span className="font-light">Mock mode: Backend sealing is not active. Record will be simulated only.</span>
          </div>
        )}
      </div>
    );
  };

  const handleDragStart = (e) => {
    if (e.target.closest('button, input, select, textarea, [role="combobox"]')) return;
    setIsDragging(true);
    setDragOffset({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging) return;
      setPosition({
        x: e.clientX - dragOffset.x,
        y: e.clientY - dragOffset.y
      });
    };

    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  // Determine linked entity for success screen
  const linkedEntity = formData.bound_entity_id ? {
    id: formData.bound_entity_id,
    type: formData.bound_entity_type || getTargetEntityType(formData.declared_scope),
    name: formData.binding_identity?.name || formData.binding_identity?.product_name || formData.bound_entity_id
  } : null;

  return (
    <>
      {showSuccessScreen && sealResponse ? (
        <PostIngestionSuccessScreen
          sealedRecord={sealResponse}
          createdWorkItem={null}
          linkedEntity={linkedEntity}
          onClose={() => {
            setShowSuccessScreen(false);
            if (onComplete && typeof onComplete === 'function') {
              safeCallback(onComplete, 'onComplete')(sealResponse.record_id);
            }
          }}
        />
      ) : (
        <div 
          ref={dragRef}
          className="w-full max-w-2xl max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl border-2 border-slate-300 fixed"
          style={{
            transform: `translate(calc(-50% + ${position.x}px), calc(-50% + ${position.y}px))`,
            left: '50%',
            top: '50%'
          }}
        >
      <Card className="bg-transparent border-0 shadow-none rounded-0 overflow-hidden flex flex-col h-full max-h-[90vh]">
        <CardHeader 
          onMouseDown={handleDragStart}
          className="border-b border-slate-300 bg-white py-3 px-6 flex-shrink-0 cursor-move hover:bg-slate-50 transition-colors flex flex-col items-center gap-3"
        >
            <div className="w-8 h-1 rounded-full bg-slate-400/40"></div>
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-slate-900" />
                <div className="flex-1">
                  <CardTitle className="text-lg font-medium tracking-tight text-slate-900">
                    Evidence Wizard
                  </CardTitle>
                  <p className="text-xs text-slate-600 font-normal">
                    Immutable sealing workflow
                  </p>
                </div>
                {draftStatus && (
                  <Badge 
                    variant={
                      draftStatus === 'SEALED' ? 'default' : 
                      draftStatus === 'VALIDATED' ? 'default' :
                      draftStatus === 'QUARANTINED' ? 'destructive' :
                      'outline'
                    }
                    className={`text-xs ${
                      draftStatus === 'SEALED' ? 'bg-green-600' :
                      draftStatus === 'VALIDATED' ? 'bg-blue-600' :
                      draftStatus === 'QUARANTINED' ? 'bg-red-600' :
                      'bg-slate-500'
                    } text-white`}
                  >
                    {draftStatus}
                  </Badge>
                )}
                </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  if (draftManager.current) {
                    draftManager.current.clear();
                  }
                  if (onCancel && typeof onCancel === 'function') {
                    safeCallback(onCancel, 'onCancel')();
                  }
                }}
                className="h-8 w-8 rounded-full hover:bg-slate-200/50 text-slate-500 hover:text-slate-700 transition-all"
              >
                <span className="text-xl leading-none">×</span>
              </Button>
            </div>
           <div className="flex items-center gap-2 mt-3">
            {[1, 2, 3].map((step) => (
              <div key={step} className="flex-1 flex items-center gap-1.5">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold transition-all ${
                  step < currentStep ? 'bg-slate-900 text-white' :
                  step === currentStep ? 'bg-slate-900 text-white ring-2 ring-slate-900/20' :
                  'bg-slate-200 text-slate-600'
                }`}>
                  {step < currentStep ? '✓' : step}
                </div>
                {step < 3 && (
                  <div className={`h-0.5 flex-1 transition-colors rounded-full ${
                    step < currentStep ? 'bg-slate-900' : 'bg-slate-300'
                  }`} />
                )}
              </div>
            ))}
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-4 overflow-y-auto flex-1">
          {showReceipt ? renderReceipt() : (
            <>
              {currentStep === 1 && renderStep1()}
              {currentStep === 2 && renderStep2()}
              {currentStep === 3 && renderStep3()}
            </>
          )}

          <div className="flex items-center justify-between pt-4 border-t border-slate-200/50">
            <div className="flex items-center gap-3">
              {showReceipt ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    // Reset wizard for new entry
                    setShowReceipt(false);
                    setSealResponse(null);
                    setCurrentStep(1);
                    setSelectedMethod(null);
                    setFormData({
                      provenance_source: 'INTERNAL_USER',
                      retention_policy: 'STANDARD_7_YEARS',
                      contains_personal_data: false,
                      ingestion_method: '',
                      evidence_type: '',
                      declared_scope: '',
                      binding_mode: '',
                      binding_target_type: '',
                      bound_entity_id: null,
                      binding_target_object: null,
                      binding_state: 'NONE',
                      binding_identity: null,
                      reconciliation_hint: '',
                      why_this_evidence: '',
                      attestation_notes: '',
                      payload_data_json: null,
                      external_reference_id: ''
                    });
                    setBindingMode('BIND_EXISTING');
                    setErrors({});
                  }}
                  className="border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 text-slate-700 backdrop-blur-sm transition-all"
                >
                  Create Another Entry
                </Button>
              ) : (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    if (draftManager.current) {
                      draftManager.current.clear();
                    }
                    if (onCancel && typeof onCancel === 'function') {
                      safeCallback(onCancel, 'onCancel')();
                    }
                  }}
                  className="border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 text-slate-700 backdrop-blur-sm transition-all"
                >
                  Cancel
                </Button>
              )}
              {correlationId && (
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(correlationId);
                    toast.success('Correlation ID copied');
                  }}
                  className="flex items-center gap-2 text-xs text-slate-400 hover:text-slate-600 transition-colors"
                  title="Copy correlation ID for support"
                >
                  <Copy className="w-3 h-3" />
                  {correlationId.substring(0, 12)}...
                </button>
              )}
            </div>
            <div className="flex gap-3">
              {showReceipt ? (
                <Button
                  onClick={() => {
                    if (onComplete && typeof onComplete === 'function') {
                      safeCallback(onComplete, 'onComplete')(sealResponse.record_id);
                    }
                  }}
                  className="bg-slate-900 hover:bg-slate-800 text-white shadow-md hover:shadow-lg transition-all"
                >
                  Done
                </Button>
              ) : (
                <>
                  {currentStep > 1 && (
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setErrors({});
                    setCurrentStep(currentStep - 1);
                  }}
                  className="border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 text-slate-700 backdrop-blur-sm transition-all"
                >
                  Back
                </Button>
              )}
              {currentStep < 3 && (
               <Button 
                 onClick={() => {
                   if (typeof handleNext === 'function') {
                     handleNext();
                   } else {
                     toast.error('Navigation error - please refresh');
                     console.error('[Wizard] handleNext is not a function:', typeof handleNext);
                   }
                 }}
                 disabled={
                   !selectedMethod || 
                   upsertDraftMutation.isPending ||
                   (currentStep === 1 && 
                    formData.declared_scope && 
                    requiresScopeTarget(formData.declared_scope) && 
                    (bindingMode === 'BIND_EXISTING' || bindingMode === 'CREATE_NEW') &&
                    !formData.bound_entity_id)
                 }
                 className="bg-slate-900 hover:bg-slate-800 text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
               >
                  {upsertDraftMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      Next <ChevronRight className="w-4 h-4 ml-1" />
                    </>
                  )}
                </Button>
              )}
              {currentStep === 3 && (
                <Button 
                  onClick={() => {
                    if (typeof handleSeal === 'function') {
                      handleSeal();
                    } else {
                      toast.error('Seal error - please refresh');
                      console.error('[Wizard] handleSeal is not a function:', typeof handleSeal);
                    }
                  }}
                  disabled={
                    !canSeal(selectedMethod, formData, attachments, mode) || 
                    sealDraftMutation.isPending ||
                    !draftId ||
                    !draftManager.current?.hasDraftId()
                  }
                  className="bg-slate-900 hover:bg-slate-800 text-white shadow-md hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {sealDraftMutation.isPending ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sealing...
                    </>
                  ) : (
                    <>
                      <Shield className="w-4 h-4 mr-2" />
                      Seal Evidence
                    </>
                  )}
                </Button>
              )}
                </>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
      )}
    </>
  );
}