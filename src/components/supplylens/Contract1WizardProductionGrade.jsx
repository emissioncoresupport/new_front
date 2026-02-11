import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertTriangle, Loader2, XCircle, Info, AlertCircle, Bug } from 'lucide-react';
import { toast } from 'sonner';
import Contract1DeclarationStepEnforced from './steps/Contract1DeclarationStepEnforced';
import Contract1PayloadStepMethodAware from './steps/Contract1PayloadStepMethodAware';
import Contract1ReviewSummaryGeneric from './steps/Contract1ReviewSummaryGeneric';
import HowMethodsWorkModal from './HowMethodsWorkModal';
// Evidence Engine Adapter - internal implementation
// Function names (kernel_*) are backend interfaces only - UI never shows them
import { kernel_createDraft, kernel_getDraftForSeal, kernel_sealDraftHardened } from './KernelAdapter';
import { getMethodConfig, canProceedToStep2 } from './utils/contract1MethodRegistry';

/**
 * CONTRACT 1 EVIDENCE SEALING WIZARD (PRODUCTION-GRADE)
 * 
 * REFACTORED 2026-01-29:
 * - Ingestion Method = HOW evidence arrived (mechanism)
 * - Submission Channel = WHO submitted (context)
 * - Evidence Type = canonical small set, no duplicates
 * - Session persistence: draft_id survives refresh
 * - Timeout handling: 15s create, 20s seal
 * - Error handling: Field-level validation, correlation IDs labeled as "Reference ID"
 * - Simulation isolation: SIM- prefix, strong watermark, no production writes
 * - No "Kernel" in UI - only "Evidence Engine" or operation names
 */

export default function Contract1WizardProductionGrade({ 
  onClose, 
  simulationMode = false 
}) {
  // Get tenant ID for scoped storage
  const [tenantId, setTenantId] = useState(null);
  useEffect(() => {
    // Fetch tenant ID from user context or company settings
    // For now, use a default or retrieve from base44.auth.me()
    setTenantId('default'); // TODO: Replace with actual tenant ID
  }, []);

  // State with localStorage persistence (tenant-scoped)
  const [step, setStep] = useState(() => {
    const saved = localStorage.getItem('contract1_wizard_step');
    return saved ? parseInt(saved) : 1;
  });
  const [draftId, setDraftId] = useState(() => {
    return localStorage.getItem('evidenceDraftId:default') || null;
  });
  const [correlationId, setCorrelationId] = useState(null);
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState(null);
  const [draftValidated, setDraftValidated] = useState(false);
  
  // Diagnostics state
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [diagnostics, setDiagnostics] = useState({
    lastAction: null,
    lastCorrelationId: null,
    lastErrorCode: null,
    draftStatus: 'not_created'
  });
  
  // InFlight guards - prevent double-submit
  const inFlightRef = useRef({
    step1: false,
    step2: false,
    step3: false
  });

  // Draft ID Guard - prevent operations without valid draftId
  const requireDraftId = (actionName) => {
    if (!draftId || typeof draftId !== 'string' || draftId.length === 0) {
      setError({
        type: 'draft_not_found',
        message: `Draft missing or expired. Cannot ${actionName}. Return to Step 1 to create a new draft.`,
        correlation_id: null
      });
      toast.error('Draft Not Found', {
        description: `Cannot ${actionName} without a valid draft reference.`,
        duration: 5000
      });
      return false;
    }
    return true;
  };

  // Persist step and draftId to localStorage (tenant-scoped)
  useEffect(() => {
    if (tenantId) {
      localStorage.setItem('contract1_wizard_step', step.toString());
    }
  }, [step, tenantId]);

  useEffect(() => {
    if (tenantId) {
      if (draftId) {
        localStorage.setItem(`evidenceDraftId:${tenantId}`, draftId);
      } else {
        localStorage.removeItem(`evidenceDraftId:${tenantId}`);
      }
    }
  }, [draftId, tenantId]);

  // Validate stored draftId on mount
  useEffect(() => {
    if (!tenantId || simulationMode || draftValidated || !draftId) return;
    
    // Validate that stored draftId is still valid
    const validateDraft = async () => {
      try {
        const result = await kernel_getDraftForSeal(draftId);
        if (result.error_code === 'DRAFT_NOT_FOUND') {
          // Draft expired - clear and reset
          setDraftId(null);
          localStorage.removeItem(`evidenceDraftId:${tenantId}`);
          setStep(1);
          toast.warning('Draft Expired', {
            description: 'Previous draft has expired. Please create a new draft.',
            duration: 4000
          });
        }
        setDraftValidated(true);
      } catch (err) {
        console.warn('Draft validation failed:', err);
        setDraftValidated(true);
      }
    };
    
    validateDraft();
  }, [tenantId, draftId, simulationMode, draftValidated]);

  // Cleanup on receipt
  useEffect(() => {
    if (receipt && tenantId) {
      localStorage.removeItem('contract1_wizard_step');
      localStorage.removeItem(`evidenceDraftId:${tenantId}`);
    }
  }, [receipt, tenantId]);

  // Initial clean state
  const getInitialDeclaration = () => ({
    ingestion_method: '',
    submission_channel: 'INTERNAL_USER',
    supplier_submission_id: null,
    source_system: '',
    evidence_type: '',
    other_evidence_description: null,
    declared_scope: '',
    scope_target_id: null,
    scope_target_name: null,
    why_this_evidence: '',
    purpose_tags: [],
    retention_policy: '',
    contains_personal_data: false,
    gdpr_legal_basis: null,
    retention_justification: null,
    external_reference_id: null,
    payload_digest_sha256: null,
    connector_reference: null,
    api_event_reference: null,
    export_job_id: null,
    snapshot_at_utc: null,
    entry_notes: null,
    erp_instance_friendly_name: null,
    pii_confirmation: false,
    unlinked_reason: null,
    resolution_due_date: null,
    retention_custom_days: null,
    manual_json_data: null
  });

  const [declaration, setDeclaration] = useState(getInitialDeclaration);



  // Timeout handler - 15s for create, 20s for seal
  const withTimeout = (promise, timeoutMs = 15000) => {
    return Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Request timeout')), timeoutMs)
      )
    ]);
  };

  // STEP 1: Create draft
  const handleStep1Next = async () => {
    if (inFlightRef.current.step1) return;
    inFlightRef.current.step1 = true;

    try {
      setError(null);
      
      if (simulationMode) {
        // Simulation: skip server call, generate local artifacts
        const simDraftId = `SIM-DRAFT-${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        const simCorrId = `SIM-CORR-${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
        setDraftId(simDraftId);
        setCorrelationId(simCorrId);
        setStep(2);
        toast.info('UI Validation Mode', {
          description: `Simulated draft created: ${simDraftId.substring(0, 20)}...`
        });
        return;
      }

      const result = await withTimeout(kernel_createDraft(declaration));

      // Update diagnostics
      setDiagnostics(prev => ({
        ...prev,
        lastAction: 'createDraft',
        lastCorrelationId: result.correlation_id || null,
        lastErrorCode: result.error_code || null,
        draftStatus: result.error_code ? 'create_failed' : 'created'
      }));

      if (result.error_code) {
        // Server returned error - show field-level details
        setError({
          type: 'validation',
          message: result.message || 'Validation failed. Please check required fields.',
          field_errors: result.field_errors || [],
          correlation_id: result.correlation_id
        });
        
        if (result.field_errors && result.field_errors.length > 0) {
          toast.error('Validation Failed', {
            description: 'Please fix the fields listed below.',
            duration: 8000
          });
        } else {
          toast.error('Draft Creation Failed', { 
            description: `${result.message} (Reference ID: ${result.correlation_id})`,
            duration: 6000
          });
        }
        return;
      }

      // CRITICAL: Validate draft_id exists before proceeding
      if (!result.draft_id || typeof result.draft_id !== 'string' || result.draft_id.length === 0) {
        setError({
          type: 'system',
          message: 'Draft creation succeeded but draft_id is missing. Please retry.',
          correlation_id: result.correlation_id
        });
        toast.error('Draft ID Missing', {
          description: 'Server error: draft reference not returned.',
          duration: 5000
        });
        return;
      }

      // Success - store draft reference and proceed
      setDraftId(result.draft_id);
      setCorrelationId(result.correlation_id);
      setError(null);
      setStep(2);
      
      setDiagnostics(prev => ({ ...prev, draftStatus: 'ready_for_payload' }));
      
      toast.success('Draft created', {
        description: `Reference: ${result.draft_id.substring(0, 16)}...`,
        duration: 3000
      });
    } catch (err) {
      const isTimeout = err.message === 'Request timeout';
      setError({
        type: 'system',
        message: isTimeout ? 'Request timeout (15s). Server is taking longer than expected. Please retry or try again later.' : err.message || 'Network error occurred. Please check your connection.',
        correlation_id: null
      });
      toast.error(isTimeout ? 'Request Timeout' : 'Network Error', { 
        description: isTimeout ? 'Server did not respond within 15 seconds. Please try again.' : 'Unable to connect to server. Check your connection and retry.'
      });
    } finally {
      inFlightRef.current.step1 = false;
    }
  };

  // STEP 2: Attach payload (handled in step component)
   const handleStep2Next = () => {
     // Guard: require valid draftId
     if (!requireDraftId('proceed to review')) {
       return;
     }

     // Additional validation: check if draft is simulation in production mode
     if (!simulationMode && draftId.startsWith('SIM-')) {
       setError({
         type: 'draft_invalid',
         message: 'Simulated draft cannot be sealed in production mode. Please restart the wizard.',
         correlation_id: null
       });
       toast.error('Invalid Draft', {
         description: 'Simulation drafts cannot be sealed. Please create a new draft.'
       });
       return;
     }

     setError(null);
     setStep(3);
     setDiagnostics(prev => ({ ...prev, draftStatus: 'ready_for_seal', lastAction: 'navigateToStep3' }));
   };

  // STEP 3: Seal
  const handleSeal = async () => {
    if (inFlightRef.current.step3) return;
    
    // Guard: require valid draftId before sealing
    if (!simulationMode && !requireDraftId('seal evidence')) {
      return;
    }
    
    inFlightRef.current.step3 = true;

    try {
      setError(null);

      if (simulationMode) {
        // Simulation: show success but don't seal
        const simEvidenceId = `SIM-EV-${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
        const simPayloadHash = 'sim' + Array(61).fill(0).map((_, i) => (i % 16).toString(16)).join('');
        const simMetadataHash = 'sim' + Array(61).fill(0).map((_, i) => ((i + 8) % 16).toString(16)).join('');
        
        toast.info('UI Validation Mode Complete', {
          description: 'No ledger record created. This is a workflow simulation only.'
        });
        
        setReceipt({
          evidence_id: simEvidenceId,
          ledger_state: 'SIMULATED',
          payload_hash_sha256: simPayloadHash,
          metadata_hash_sha256: simMetadataHash,
          sealed_at_utc: new Date().toISOString(),
          retention_ends_utc: new Date(Date.now() + 7*365*24*60*60*1000).toISOString(),
          trust_level: 'SIMULATION',
          review_status: 'NOT_REVIEWED',
          correlation_id: correlationId || `SIM-CORR-${Date.now()}`
        });
        return;
      }

      // Explicit draftId validation before backend call
      if (!draftId || draftId === 'undefined' || draftId === 'null') {
        throw new Error('Draft ID is undefined - cannot proceed with seal operation');
      }

      const result = await withTimeout(kernel_sealDraftHardened(draftId), 20000);

      // Update diagnostics
      setDiagnostics(prev => ({
        ...prev,
        lastAction: 'sealDraft',
        lastCorrelationId: result.correlation_id || null,
        lastErrorCode: result.error_code || null,
        draftStatus: result.error_code ? 'seal_failed' : 'sealed'
      }));

      if (result.error_code) {
        if (result.error_code === 'DRAFT_NOT_FOUND') {
          // Clear stored draftId on 404/422
          setDraftId(null);
          if (tenantId) {
            localStorage.removeItem(`evidenceDraftId:${tenantId}`);
          }
          setDiagnostics(prev => ({ ...prev, draftStatus: 'not_found' }));
          
          setError({
            type: 'draft_not_found',
            message: 'Draft not found or has expired. Please return to Step 1 to create a new draft.',
            correlation_id: result.correlation_id
          });
          toast.error('Draft Not Found', {
            description: result.correlation_id ? `Reference ID: ${result.correlation_id}` : 'Draft expired or removed',
            duration: 5000
          });
        } else if (result.error_code === 'IMMUTABILITY_CONFLICT') {
          setError({
            type: 'conflict',
            message: 'This evidence has already been sealed and cannot be sealed again.',
            correlation_id: result.correlation_id
          });
          toast.error('Already Sealed', {
            description: result.correlation_id ? `Reference ID: ${result.correlation_id}` : 'Already sealed',
            duration: 5000
          });
        } else if (result.error_code === 'VALIDATION_FAILED') {
          const validationMessage = result.message || 'Required fields are missing or invalid.';
          setError({
            type: 'validation',
            message: validationMessage,
            correlation_id: result.correlation_id,
            field_errors: result.field_errors
          });
          toast.error('Validation Failed', {
            description: result.correlation_id ? `Reference ID: ${result.correlation_id}` : validationMessage,
            duration: 5000
          });
        } else {
          const systemMessage = result.message || 'An error occurred while sealing. Please retry or contact support.';
          setError({
            type: 'system',
            message: systemMessage,
            correlation_id: result.correlation_id
          });
          toast.error('System Error', {
            description: result.correlation_id ? `Reference ID: ${result.correlation_id}` : systemMessage,
            duration: 5000
          });
        }
        return;
      }

      // Clear localStorage on success
      if (tenantId) {
        localStorage.removeItem('contract1_wizard_step');
        localStorage.removeItem(`evidenceDraftId:${tenantId}`);
      }
      
      setDiagnostics(prev => ({ ...prev, draftStatus: 'sealed' }));
      setReceipt(result);
      toast.success('Evidence sealed successfully', {
        description: `Evidence ID: ${result.evidence_id.substring(0, 16)}... • Reference ID: ${result.correlation_id || 'N/A'}`,
        duration: 5000
      });
    } catch (err) {
      const isTimeout = err.message === 'Request timeout';
      const isDraftIdError = err.message && err.message.includes('Draft ID is undefined');
      
      if (isDraftIdError) {
        // Clear stored draftId if it was invalid
        setDraftId(null);
        if (tenantId) {
          localStorage.removeItem(`evidenceDraftId:${tenantId}`);
        }
        setDiagnostics(prev => ({ ...prev, draftStatus: 'undefined_error' }));
      }
      
      const errCorrelationId = `ERR_${Date.now()}`;
      setDiagnostics(prev => ({
        ...prev,
        lastAction: 'sealDraft_error',
        lastCorrelationId: errCorrelationId,
        lastErrorCode: isDraftIdError ? 'DRAFT_ID_UNDEFINED' : isTimeout ? 'TIMEOUT' : 'NETWORK_ERROR'
      }));
      
      setError({
        type: isDraftIdError ? 'draft_not_found' : 'system',
        message: isDraftIdError ? 'Draft ID is undefined - cannot proceed with seal operation. Please return to Step 1.' : 
                 isTimeout ? 'Request timeout (20s). Server is taking longer than expected. Please retry.' : 
                 err.message || 'Network error occurred',
        correlation_id: errCorrelationId
      });
      
      toast.error(isDraftIdError ? 'Draft Reference Lost' : isTimeout ? 'Request Timeout' : 'Network Error', {
        description: isDraftIdError ? 'Draft reference is invalid. Please create a new draft from Step 1.' :
                    isTimeout ? 'Server did not respond within 20 seconds. Please retry.' : 
                    'Check your connection and retry.',
        duration: 6000
      });
    } finally {
      inFlightRef.current.step3 = false;
    }
  };

  const handleCancel = () => {
    if (window.confirm('Cancel wizard? Unsaved changes will be lost.')) {
      onClose();
    }
  };

  const isInFlight = Object.values(inFlightRef.current).some(v => v);

  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const dragRef = useRef(null);

  const handleMouseDown = (e) => {
    if (e.target.closest('button, input, textarea, select')) return;
    setIsDragging(true);
    setDragStart({
      x: e.clientX - position.x,
      y: e.clientY - position.y
    });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    setPosition({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y
    });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart]);

  return (
    <div 
      ref={dragRef}
      className="fixed inset-0 z-50 bg-slate-900/30 backdrop-blur-sm flex items-center justify-center"
      style={{ cursor: isDragging ? 'grabbing' : 'default' }}
    >
      <div
        className="relative max-w-4xl w-full mx-6"
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
          transition: isDragging ? 'none' : 'transform 0.2s ease-out'
        }}
      >
        <div 
          className="glassmorphic-panel rounded-2xl border border-white/30 shadow-[0_20px_60px_rgba(0,0,0,0.3)] overflow-hidden"
          onMouseDown={handleMouseDown}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        >
          {/* UI Validation Mode Watermark */}
          {simulationMode && (
            <div className="bg-gradient-to-r from-yellow-100/90 via-yellow-50/90 to-yellow-100/90 backdrop-blur-xl border-b-2 border-yellow-500">
              <div className="p-4">
                <div className="flex items-center gap-3">
                  <div className="bg-yellow-500 rounded-full p-2">
                    <AlertTriangle className="w-6 h-6 text-white flex-shrink-0" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-yellow-900 text-xl">⚠️ UI VALIDATION MODE</p>
                    <p className="text-sm text-yellow-800 mt-1 font-medium">
                      Simulated operations only. No data is saved to production ledger. All IDs prefixed with SIM-. 
                      For workflow testing and UI verification purposes only. Not audit evidence.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Progress Header */}
          <div className="p-6 border-b border-white/20 bg-gradient-to-r from-white/10 to-transparent">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-light tracking-tight text-slate-900">Evidence Sealing Wizard</h2>
              <div className="flex gap-2 items-center">
                {draftId && (
                  <Badge variant="outline" className="bg-green-50/80 text-green-700 border-green-300/50 text-[10px] font-mono backdrop-blur-sm">
                    Draft: {draftId.substring(0, 12)}...
                  </Badge>
                )}
                <Badge variant={simulationMode ? "outline" : "default"} className={simulationMode ? "bg-amber-100/80 text-amber-800 backdrop-blur-sm" : "bg-slate-800/80 text-white backdrop-blur-sm"}>
                  {simulationMode ? 'Simulation' : 'Production'}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowDiagnostics(!showDiagnostics)}
                  className="text-xs text-slate-500 hover:text-slate-700 hover:bg-white/30"
                >
                  <Bug className="w-3 h-3 mr-1" />
                  Diagnostics
                </Button>
              </div>
            </div>
            <div className="flex gap-2 mb-3">
              {[1, 2, 3].map(s => (
                <div
                  key={s}
                  className={`flex-1 h-1 rounded-full transition-all ${
                    s < step ? 'bg-gradient-to-r from-[#86b027] to-[#86b027]/80' :
                    s === step ? 'bg-gradient-to-r from-[#86b027]/60 to-[#86b027]/40' :
                    'bg-white/30'
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-slate-600 font-light">
               Step {step}/3: {step === 1 ? 'Provenance & Metadata' : step === 2 ? `${declaration.ingestion_method ? getMethodConfig(declaration.ingestion_method)?.step2_label : 'Payload'}` : 'Review & Seal'}
            </p>
          </div>

          {/* Diagnostics Panel */}
          {showDiagnostics && (
            <div className="mx-6 mt-4 glassmorphic-panel rounded-xl border border-slate-300/30 backdrop-blur-xl">
              <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Bug className="w-4 h-4 text-slate-600" />
                <h3 className="text-sm font-medium text-slate-900">Internal Diagnostics</h3>
              </div>
              <Badge variant="outline" className="text-[9px] bg-slate-100 text-slate-600">DEBUG ONLY</Badge>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <p className="text-slate-500 font-medium">Tenant ID</p>
                <code className="text-slate-900 font-mono text-[10px]">{tenantId || 'loading...'}</code>
              </div>
              <div>
                <p className="text-slate-500 font-medium">Draft Status</p>
                <Badge className={`text-[9px] ${
                  diagnostics.draftStatus === 'sealed' ? 'bg-green-100 text-green-800' :
                  diagnostics.draftStatus === 'not_found' ? 'bg-red-100 text-red-800' :
                  diagnostics.draftStatus === 'ready_for_seal' ? 'bg-blue-100 text-blue-800' :
                  'bg-slate-100 text-slate-800'
                }`}>
                  {diagnostics.draftStatus}
                </Badge>
              </div>
              <div className="col-span-2">
                <p className="text-slate-500 font-medium">Draft ID (Current)</p>
                {draftId ? (
                  <code className={`text-[10px] font-mono block break-all ${
                    draftId === 'undefined' || draftId === 'null' ? 'text-red-600 bg-red-50 border border-red-300 rounded px-2 py-1' : 'text-slate-900'
                  }`}>
                    {draftId}
                  </code>
                ) : (
                  <span className="text-red-600 text-[10px] font-semibold bg-red-50 px-2 py-1 rounded">
                    ⚠️ UNDEFINED - Seal will fail
                  </span>
                )}
              </div>
              <div>
                <p className="text-slate-500 font-medium">Last Action</p>
                <code className="text-slate-900 font-mono text-[10px]">{diagnostics.lastAction || 'none'}</code>
              </div>
              <div>
                <p className="text-slate-500 font-medium">Last Error Code</p>
                <code className={`text-[10px] font-mono ${diagnostics.lastErrorCode ? 'text-red-700' : 'text-slate-900'}`}>
                  {diagnostics.lastErrorCode || 'none'}
                </code>
              </div>
              <div className="col-span-2">
                <p className="text-slate-500 font-medium">Last Correlation ID</p>
                <code className="text-slate-900 font-mono text-[10px] block break-all">
                  {diagnostics.lastCorrelationId || 'none'}
                </code>
              </div>
            </div>
                {(!draftId || draftId === 'undefined' || draftId === 'null') && step >= 2 && (
                  <Alert className="mt-3 bg-red-50/80 border-red-300 backdrop-blur-sm">
                    <XCircle className="w-4 h-4 text-red-600" />
                    <AlertDescription className="text-xs text-red-900 ml-2">
                      <strong>⚠️ BLOCKING ERROR:</strong> Draft ID is undefined. Seal operation will fail. Return to Step 1 to create a valid draft.
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </div>
          )}

      {/* Validation Error Alert (Step 1 Specific) */}
      {step === 1 && error && error.type === 'validation' && (
        <Alert className="mb-4 bg-red-50 border-red-400 border-l-4">
          <AlertCircle className="w-5 h-5 text-red-600" />
          <AlertDescription className="ml-2">
            <p className="font-semibold text-red-900">Validation Failed</p>
            <p className="text-sm text-red-800 mt-1">{error.message}</p>
            {error.field_errors && error.field_errors.length > 0 && (
              <div className="mt-3 pt-3 border-t border-red-300">
                <p className="text-xs font-semibold text-red-900 mb-2">Fix These Fields:</p>
                <ul className="space-y-1">
                  {error.field_errors.map((err, idx) => (
                    <li key={idx} className="text-xs text-red-800 flex items-start gap-2">
                      <span className="text-red-600">•</span>
                      <span><strong>{err.field}:</strong> {err.message}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {error.correlation_id && (
              <p className="text-xs text-red-700 font-mono mt-2">Reference ID: {error.correlation_id}</p>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* System/Network Errors (Any Step) */}
      {error && error.type !== 'validation' && (
        <Alert className={`mb-4 border-l-4 ${
          error.type === 'draft_not_found' ? 'bg-amber-50 border-amber-300' : 
          'bg-red-50 border-red-300'
        }`}>
          <AlertCircle className={`w-4 h-4 ${
            error.type === 'draft_not_found' ? 'text-amber-600' : 'text-red-600'
          }`} />
          <AlertDescription className={`text-sm ml-2 ${
            error.type === 'draft_not_found' ? 'text-amber-900' : 'text-red-900'
          }`}>
            <strong>
              {error.type === 'draft_not_found' ? 'Draft Not Found' : 
               error.type === 'conflict' ? 'Immutability Conflict' : 
               'System Error'}:
            </strong> {error.message}
            {error.correlation_id && (
              <p className="text-xs mt-1 font-mono">Reference ID: {error.correlation_id}</p>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Draft Not Found Recovery */}
      {error?.type === 'draft_not_found' && (
        <Card className="mb-4 bg-amber-50 border-amber-200">
          <CardContent className="p-4 space-y-3">
            <p className="text-sm text-amber-900 font-medium">What happened?</p>
            <p className="text-xs text-amber-800">
              The draft you're trying to seal has expired or is no longer accessible. This can happen if:
              <ul className="list-disc list-inside mt-1 space-y-0.5">
                <li>Session timeout occurred</li>
                <li>More than 24 hours have passed since draft creation</li>
                <li>The draft was deleted or invalidated</li>
              </ul>
            </p>
            <Button
              onClick={() => {
                setError(null);
                setStep(1);
                setDraftId(null);
                setReceipt(null);
                if (tenantId) {
                  localStorage.removeItem(`evidenceDraftId:${tenantId}`);
                }
              }}
              className="w-full bg-amber-600 hover:bg-amber-700"
            >
              Create New Draft
            </Button>
          </CardContent>
        </Card>
      )}

          <div className="glassmorphic-content p-6">
          {/* STEP 1 */}
          {step === 1 && (
            <Contract1DeclarationStepEnforced
              declaration={declaration}
              setDeclaration={(newDeclaration) => {
                if (typeof newDeclaration === 'function') {
                  setDeclaration(newDeclaration);
                } else {
                  setDeclaration(newDeclaration);
                }
              }}
              onNext={() => {
                if (typeof handleStep1Next === 'function') {
                  handleStep1Next();
                } else {
                  console.error('handleStep1Next is not a function');
                  toast.error('System Error', { description: 'Navigation function is invalid' });
                }
              }}
              onCancel={handleCancel}
              creatingDraft={inFlightRef.current.step1}
            />
          )}

          {/* STEP 2 */}
          {step === 2 && (!draftId || typeof draftId !== 'string' || draftId.length === 0) && (
            <div className="space-y-3">
              <Alert className="bg-red-50 border-red-300">
                <XCircle className="w-4 h-4 text-red-600" />
                <AlertDescription className="text-sm text-red-900 ml-2">
                  <strong>Draft Reference Missing:</strong> Cannot proceed without a valid draft reference.
                </AlertDescription>
              </Alert>
              <Button
                onClick={() => {
                  setStep(1);
                  setError(null);
                }}
                className="w-full bg-[#86b027] hover:bg-[#86b027]/90"
              >
                Return to Step 1
              </Button>
            </div>
          )}

          {step === 2 && draftId && typeof draftId === 'string' && draftId.length > 0 && (
            <Contract1PayloadStepMethodAware
              declaration={declaration}
              setDeclaration={setDeclaration}
              draftId={draftId}
              simulationMode={simulationMode}
              onBack={() => setStep(1)}
              onNext={handleStep2Next}
              requireDraftId={requireDraftId}
            />
          )}

          {/* STEP 3 */}
          {step === 3 && !receipt && !draftId && (
            <div className="space-y-3">
              <Alert className="bg-red-50 border-red-300">
                <XCircle className="w-4 h-4 text-red-600" />
                <AlertDescription className="text-sm text-red-900 ml-2">
                  <strong>Draft Reference Lost:</strong> Cannot seal without a valid draft reference.
                </AlertDescription>
              </Alert>
              <Button
                onClick={() => {
                  setStep(1);
                  setError(null);
                }}
                className="w-full bg-[#86b027] hover:bg-[#86b027]/90"
              >
                Return to Step 1
              </Button>
            </div>
          )}

          {step === 3 && !receipt && draftId && (
            <div className="space-y-4">
              <Contract1ReviewSummaryGeneric
                declaration={declaration}
                simulationMode={simulationMode}
              />

              <Alert className="bg-blue-50 border-blue-300">
                <Info className="w-4 h-4 text-blue-600" />
                <AlertDescription className="text-sm text-blue-900 ml-2">
                  <strong>Immutable Seal:</strong> After sealing, this record becomes immutable. It can only be superseded by new evidence.
                </AlertDescription>
              </Alert>

              <div className="flex gap-3 justify-end pt-4 border-t">
                <Button variant="outline" onClick={() => setStep(2)} disabled={isInFlight}>
                  Back
                </Button>
                <Button
                  onClick={handleSeal}
                  disabled={isInFlight}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {inFlightRef.current.step3 ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                      Sealing...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      {simulationMode ? 'Validate UI' : 'Seal Evidence'}
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* SEALING RECEIPT */}
          {receipt && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle2 className={`w-5 h-5 ${simulationMode ? 'text-yellow-600' : 'text-green-600'}`} />
                <h3 className={`font-medium ${simulationMode ? 'text-yellow-900' : 'text-green-900'}`}>
                  {simulationMode ? '⚠️ UI Validation Complete (Not Audit Evidence)' : 'Evidence Sealed Successfully'}
                </h3>
              </div>

              {simulationMode && (
                <Alert className="bg-gradient-to-r from-yellow-100 to-yellow-50 border-yellow-500 border-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-700" />
                  <AlertDescription className="text-sm text-yellow-900 ml-2">
                    <strong>⚠️ Simulation Only - Not Audit Evidence</strong>
                    <p className="mt-1 text-xs">
                      This is a workflow simulation. No immutable record was created. All artifacts are prefixed with SIM- and are not valid for regulatory submissions or compliance purposes.
                    </p>
                  </AlertDescription>
                </Alert>
              )}

              {/* Sealing Receipt Card */}
              <Card className={simulationMode ? "border-yellow-400 bg-yellow-50/50" : "border-green-200 bg-green-50/50"}>
                <CardHeader className={`pb-3 border-b ${simulationMode ? 'border-yellow-300' : 'border-green-200'}`}>
                  <h4 className={`font-medium flex items-center gap-2 ${simulationMode ? 'text-yellow-900' : 'text-green-900'}`}>
                    <CheckCircle2 className={`w-4 h-4 ${simulationMode ? 'text-yellow-600' : 'text-green-600'}`} />
                    {simulationMode ? 'Simulated Receipt (Not Valid for Audit)' : 'Sealing Receipt'}
                  </h4>
                </CardHeader>
                <CardContent className="p-4 space-y-3 text-xs">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-slate-600 font-medium">Evidence ID</p>
                      <code className="text-slate-900 font-mono text-[10px] bg-white rounded px-2 py-1 block mt-1 break-all">
                        {receipt.evidence_id}
                      </code>
                    </div>
                    <div>
                      <p className="text-slate-600 font-medium">Ledger State</p>
                      <Badge className={`text-xs mt-1 ${
                        simulationMode 
                          ? 'bg-yellow-100 text-yellow-800 border-yellow-400' 
                          : receipt.ledger_state === 'SEALED' 
                          ? 'bg-green-100 text-green-800 border-green-400'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {receipt.ledger_state}
                      </Badge>
                    </div>
                  </div>

                  <div>
                    <p className="text-slate-600 font-medium">Sealed At (UTC)</p>
                    <p className="text-slate-900 mt-1">{new Date(receipt.sealed_at_utc).toISOString()}</p>
                  </div>

                  <div>
                    <p className="text-slate-600 font-medium">Retention Until (UTC)</p>
                    <p className="text-slate-900 mt-1 font-mono text-[10px]">{receipt.retention_ends_utc ? new Date(receipt.retention_ends_utc).toISOString() : 'Pending (computed at seal)'}</p>
                  </div>

                  <div className={`rounded p-2 space-y-1 ${simulationMode ? 'bg-yellow-100 border border-yellow-400' : 'bg-slate-100'}`}>
                    <p className="text-slate-600 font-medium">Immutability</p>
                    <p className={`font-semibold ${simulationMode ? 'text-yellow-900' : 'text-slate-900'}`}>
                      {simulationMode ? '⚠️ NOT IMMUTABLE (Simulation)' : '✓ IMMUTABLE'}
                    </p>
                    <p className={`text-[10px] italic ${simulationMode ? 'text-yellow-800' : 'text-slate-600'}`}>
                      {simulationMode 
                        ? 'Simulation mode: No ledger record created. This is not audit evidence.'
                        : 'This record is now locked and cannot be modified or deleted. All hashes are cryptographically verified.'}
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-2">
                    <div>
                      <p className="text-slate-600 font-medium">Payload Digest SHA-256</p>
                      <code className="text-[10px] font-mono text-slate-700 bg-white rounded px-2 py-1 block mt-1 break-all">
                        {receipt.payload_hash_sha256}
                      </code>
                    </div>
                    <div>
                      <p className="text-slate-600 font-medium">Metadata Digest SHA-256</p>
                      <code className="text-[10px] font-mono text-slate-700 bg-white rounded px-2 py-1 block mt-1 break-all">
                        {receipt.metadata_hash_sha256}
                      </code>
                    </div>
                  </div>

                  {receipt.correlation_id && (
                    <div className="bg-slate-100 rounded p-2">
                      <p className="text-slate-600 font-medium text-[10px]">Correlation ID (audit reference)</p>
                      <code className="text-[10px] font-mono text-slate-700 block mt-1">
                        {receipt.correlation_id}
                      </code>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-slate-600 font-medium">Trust Level</p>
                      <Badge className={`text-xs mt-1 ${
                        receipt.trust_level === 'LOW' ? 'bg-amber-100 text-amber-800' :
                        receipt.trust_level === 'MEDIUM' ? 'bg-blue-100 text-blue-800' :
                        receipt.trust_level === 'HIGH' ? 'bg-green-100 text-green-800' :
                        'bg-slate-100 text-slate-800'
                      }`}>
                        {receipt.trust_level}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-slate-600 font-medium">Review Status</p>
                      <Badge className={`text-xs mt-1 ${
                        (receipt.review_status || 'NOT_REVIEWED') === 'NOT_REVIEWED' ? 'bg-yellow-100 text-yellow-800' :
                        receipt.review_status === 'PENDING_REVIEW' ? 'bg-blue-100 text-blue-800' :
                        receipt.review_status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {receipt.review_status || 'NOT_REVIEWED'}
                      </Badge>
                      {(receipt.review_status === 'NOT_REVIEWED' || !receipt.review_status) && (
                        <p className="text-[10px] text-yellow-700 mt-1">⚠️ Approval required before use</p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="flex gap-3">
                <Button 
                  onClick={() => {
                    setReceipt(null);
                    setDraftId(null);
                    setStep(1);
                    setError(null);
                    setDeclaration(getInitialDeclaration());
                    if (tenantId) {
                      localStorage.removeItem('contract1_wizard_step');
                      localStorage.removeItem(`evidenceDraftId:${tenantId}`);
                    }
                  }} 
                  variant="outline"
                  className="flex-1"
                >
                  Seal Another
                </Button>
                <Button onClick={onClose} className="flex-1 bg-[#86b027] hover:bg-[#86b027]/90">
                  Close & View Vault
                </Button>
              </div>
            </div>
          )}
          </div>
        </div>
      </div>
    </div>
  );
}