import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertDialog, AlertDialogContent } from "@/components/ui/alert-dialog";
import { CheckCircle2, AlertTriangle, Loader2, Info, Upload, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
// Internal adapter for evidence engine (backend endpoints)
import * as Kernel from '@/components/supplylens/KernelAdapter';
import IngestionDiagnosticsDrawer from '@/components/supplylens/IngestionDiagnosticsDrawer';
import ModeBanner from '@/components/supplylens/ModeBanner';
import EvidenceService from '@/components/supplylens/services/evidenceService';

/**
 * SEALING WIZARD — Compliance Grade + Method Enforcement
 * Step 1: Declare provenance (method-enforced source system)
 * Step 2: Method-specific payload (no generic uploader)
 * Step 3: Review & seal
 */

import Contract1DeclarationStepEnforced from '@/components/supplylens/steps/Contract1DeclarationStepEnforced';
import FileUploadPayloadHardened from '@/components/supplylens/steps/method-specific/FileUploadPayloadHardened';
import ManualEntryPayloadV2 from '@/components/supplylens/steps/method-specific/ManualEntryPayloadV2';
import APIPushPayload from '@/components/supplylens/steps/method-specific/APIPushPayload';
import ERPAPIPayload from '@/components/supplylens/steps/method-specific/ERPAPIPayload';
import ERPAPIPayloadV2 from './steps/method-specific/ERPAPIPayloadV2';
import ERPExportPayloadV2 from '@/components/supplylens/steps/method-specific/ERPExportPayloadV2';
import ERPExportPayloadClean from '@/components/supplylens/steps/method-specific/ERPExportPayloadClean';
import SupplierPortalPayload from '@/components/supplylens/steps/method-specific/SupplierPortalPayload';
import Contract1ReviewSummary from '@/components/supplylens/steps/Contract1ReviewSummary';
import Contract1ReviewSummaryManualEntry from '@/components/supplylens/steps/Contract1ReviewSummaryManualEntry';
import Contract1ReviewSummaryGeneric from '@/components/supplylens/steps/Contract1ReviewSummaryGeneric';
import { createDraftBinding, validateDraftBinding } from '@/components/supplylens/ManualEntryDraftBinding';
import Contract1UIChecklist from '@/components/supplylens/Contract1UIChecklist';
import { hashDeclaration } from '@/components/supplylens/utils/payloadHash';
import DraftNotFoundRecovery from '@/components/supplylens/DraftNotFoundRecovery';

export default function Contract1SealingWizardComplianceGrade({ onClose, dataMode }) {
  const [step, setStep] = useState(1);
  const [isSealing, setIsSealing] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [fileMetadata, setFileMetadata] = useState(null);
  const [draftState, setDraftState] = useState(null);
  const [draftError, setDraftError] = useState(null);
  const [sealError, setSealError] = useState(null);
  const [loadingDraft, setLoadingDraft] = useState(false);
  const [creatingDraft, setCreatingDraft] = useState(false);

  // PERSISTENT STORE: draft_id with localStorage (single source of truth)
  const [draftId, setDraftIdState] = useState(() => {
    if (typeof window === 'undefined') return null;
    const storedDraftId = localStorage.getItem('ec_evidence_draft_id');
    console.log('[WIZARD STORE] Initializing draft_id from localStorage:', storedDraftId || 'null');
    return storedDraftId;
  });

  const setDraftId = (id) => {
    console.log('[WIZARD STORE] Updating draft_id:', id);
    setDraftIdState(id);
    if (typeof window === 'undefined') return;
    
    if (id) {
      localStorage.setItem('ec_evidence_draft_id', id);
    } else {
      localStorage.removeItem('ec_evidence_draft_id');
    }
  };

  // Clear on receipt completion
  React.useEffect(() => {
    if (receipt && typeof window !== 'undefined') {
      localStorage.removeItem('ec_evidence_draft_id');
      localStorage.removeItem('ec_draft_declaration');
    }
  }, [receipt]);

  const [declaration, setDeclaration] = useState(() => {
    // Attempt to restore from localStorage
    try {
      const stored = localStorage.getItem('ec_draft_declaration');
      if (stored) {
        const parsed = JSON.parse(stored);
        console.log('[WIZARD] Declaration restored from localStorage');
        return parsed;
      }
    } catch {}
    
    return {
      ingestion_method: 'FILE_UPLOAD',
      source_system: 'OTHER',
      erp_instance_friendly_name: '',
      evidence_category: '',
      dataset_type: 'SUPPLIER_MASTER',
      other_evidence_type: '',
      declared_scope: 'ENTIRE_ORGANIZATION',
      scope_target_id: '',
      scope_target_name: '',
      why_this_evidence: '',
      purpose_tags: [],
      contains_personal_data: false,
      gdpr_legal_basis: '',
      retention_justification: '',
      retention_policy: 'STANDARD_1_YEAR',
      retention_custom_days: null,
      external_reference_id: '',
      snapshot_at_utc: '',
      api_endpoint: '',
      expected_schema: '',
      connector_reference: '',
      portal_request_id: '',
      supplier_name: '',
      entry_notes: '',
      export_job_id: ''
    };
  });

  // Persist declaration to localStorage on change
  useEffect(() => {
    try {
      localStorage.setItem('ec_draft_declaration', JSON.stringify(declaration));
    } catch {}
  }, [declaration]);

  const [payload, setPayload] = useState('');
  const [file, setFile] = useState(null);
  const [draftBinding, setDraftBinding] = useState(null);
  const [lastCorrelationId, setLastCorrelationId] = useState(null);
  const [lastSavedDeclarationHash, setLastSavedDeclarationHash] = useState(null);

  // UI Validation Mode (browser session only, never persisted server-side)
  const [simulationMode, setSimulationMode] = useState(() => {
    if (typeof window === 'undefined') return false;
    const urlParam = new URLSearchParams(window.location.search).has('simulate');
    const stored = localStorage.getItem('ui_validation_mode') === 'true';
    return urlParam || stored;
  });
  
  // Persist simulation mode to localStorage
  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('ui_validation_mode', simulationMode.toString());
    }
  }, [simulationMode]);
  
  const [simulationFileMetadata, setSimulationFileMetadata] = useState(null);
  
  // Feature flag + role check for diagnostics (dev only)
  const [showDiagnostics, setShowDiagnostics] = React.useState(false);
  
  React.useEffect(() => {
    const checkDiagnosticsAccess = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const isDev = urlParams.get('dev') === '1' || window.location.hostname === 'localhost';
        const user = await base44.auth.me();
        const isAdmin = user?.role === 'admin' || user?.role === 'architect';
        setShowDiagnostics((isDev || isAdmin) && (window.location.hostname === 'localhost' || process.env.NODE_ENV === 'development'));
      } catch (err) {
        setShowDiagnostics(false);
      }
    };
    checkDiagnosticsAccess();
  }, []);

  // Fetch draft for seal when entering Step 3
  const fetchDraftSnapshot = async () => {
    if (step !== 3 || draftState) return;

    console.log('[STEP3] Fetching draft...');

    if (!draftId && !simulationMode) {
      console.error('[STEP3] draft_id missing (required for real mode)');
      setDraftError({
        code: 'DRAFT_ID_MISSING',
        message: 'No draft_id - return to Step 1',
        correlation_id: null
      });
      return;
    }

    setLoadingDraft(true);
    setDraftError(null);

    try {
      console.log('[STEP3] Fetching draft for seal...');
      
      // 10-second timeout for draft fetch
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Draft fetch timed out after 10 seconds')), 10000)
      );
      
      const fetchOperation = Kernel.kernel_getDraftForSeal(
        draftId, 
        simulationMode,
        declaration.ingestion_method,
        !!simulationFileMetadata
      );
      
      const result = await Promise.race([fetchOperation, timeoutPromise]);

      if (result.error_code) {
        console.error('[STEP3] Error:', result.error_code);
        setLastCorrelationId(result.correlation_id);
        
        // Check if draft not found (404/403)
        const isDraftNotFound = result.error_code.includes('NOT_FOUND') || 
                                result.error_code.includes('FORBIDDEN') ||
                                result.message?.toLowerCase().includes('not found');
        
        setDraftError({
          code: result.error_code,
          message: result.message,
          correlation_id: result.correlation_id,
          is_draft_not_found: isDraftNotFound
        });
        return;
      }

      console.log('[STEP3] ✓ Draft ready | Files:', result.files?.length || 0);

      // Transform to expected format for UI
      const transformed = {
        draft: { draft_id: result.draft_id, ...result.metadata },
        attachments: result.files,
        can_seal: result.validation?.ready_to_seal || false,
        missing_fields: result.validation?.missing_fields?.map(f => f.field) || [],
        field_errors: result.validation?.missing_fields || [],
        correlation_id: result.correlation_id,
        build_id: result.build_id,
        contract_version: result.contract_version
      };

      setLastCorrelationId(result.correlation_id);
      setDraftState(transformed);
      
      // Show validation warnings
      if (!transformed.can_seal && transformed.field_errors?.length > 0) {
        const errorMsg = transformed.field_errors.map(e => `${e.field}: ${e.error}`).join(', ');
        toast.warning('Validation Issues', {
          description: errorMsg,
          duration: 6000
        });
      }
    } catch (error) {
      console.error('[STEP3] Exception:', error.message);
      
      const isTimeout = error.message?.includes('timed out');
      
      setDraftError({
        code: isTimeout ? 'REQUEST_TIMEOUT' : 'FETCH_FAILED',
        message: isTimeout ? 'Request timed out after 10 seconds' : error.message,
        correlation_id: null,
        is_timeout: isTimeout
      });
    } finally {
      setLoadingDraft(false);
    }
  };

  React.useEffect(() => {
    if (step === 3) {
      setDraftState(null); // Clear cache
      fetchDraftSnapshot();
    }
  }, [step]);



  const handleSeal = async () => {
    console.log('[STEP3] Sealing...');
    setIsSealing(true);
    setSealError(null);

    try {
      let result;
      
      if (simulationMode) {
        // Simulation: Generate deterministic receipt
        console.log('[STEP3] UI Validation Mode: generating test receipt');
        const simEvidenceId = `SIM_${crypto.randomUUID()}`;
        const simPayloadHash = draftState?.attachments?.[0]?.sha256 || `SIM_PAYLOAD_${Date.now()}`;
        const simMetadataHash = `SIM_META_${draftState?.draft?.dataset_type || 'unknown'}_${Date.now()}`.substring(0, 64);
        
        result = {
          evidence_id: simEvidenceId,
          correlation_id: `SIM_SEAL_${Date.now()}`,
          request_id: `SIM_REQ_${Date.now()}`,
          ledger_state: 'SIMULATED',
          payload_hash_sha256: simPayloadHash,
          metadata_hash_sha256: simMetadataHash,
          sealed_at_utc: new Date().toISOString(),
          retention_ends_utc: null,
          review_status: 'PENDING_REVIEW',
          quarantine_reason: null,
          build_id: 'simulation-ui-only',
          contract_version: 'contract_ingest_v1'
        };
      } else {
        // Real: Call server
          console.log('[STEP3] Sealing to server...');
        
        // 10-second timeout for seal operation
        const sealTimeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Sealing request timed out after 10 seconds')), 10000)
        );
        
        const sealOperation = Kernel.kernel_sealDraft(draftId);
        result = await Promise.race([sealOperation, sealTimeoutPromise]);

        if (result.error_code) {
          console.error('[STEP3] Seal failed:', result.error_code);
          setLastCorrelationId(result.correlation_id);
          setSealError({
            code: result.error_code,
            message: result.message,
            field_errors: result.field_errors || [],
            correlation_id: result.correlation_id,
            is_server_error: false
          });
          toast.error(result.error_code, {
            description: `${result.message}\nCorrelation: ${result.correlation_id}`,
            duration: 6000
          });
          return;
        }
      }

      console.log('[STEP3] ✓ Sealed | ID:', result.evidence_id.substring(0, 12) + '...');

      setLastCorrelationId(result.correlation_id);
      
      // Clear draft_id from store after successful seal
      if (!simulationMode) {
        setDraftId(null);
      }
      
      setReceipt({
        evidence_id: result.evidence_id,
        correlation_id: result.correlation_id,
        request_id: result.request_id || `SEAL_${Date.now()}`,
        ledger_state: result.ledger_state,
        trust_level: result.trust_level || 'PENDING',
        review_status: result.review_status || 'PENDING_REVIEW',
        quarantined: result.ledger_state === 'QUARANTINED',
        quarantine_reason: result.quarantine_reason,
        payload_hash: result.payload_hash_sha256,
        metadata_hash: result.metadata_hash_sha256,
        retention_ends: result.retention_ends_utc || null,
        sealed_at: result.sealed_at_utc,
        build_id: result.build_id,
        contract_version: result.contract_version,
        payload_size: draftState?.attachments?.reduce((sum, a) => sum + (a.size_bytes || 0), 0) || 0,
        simulated: simulationMode
      });
      toast.success(simulationMode ? 'UI Validation Complete' : 'Evidence Sealed Successfully', { 
        description: simulationMode 
          ? 'Simulation only — no ledger record created, no bytes stored' 
          : `Evidence ID: ${result.evidence_id.substring(0, 12)}...`,
        duration: simulationMode ? 3000 : 4000
      });
    } catch (error) {
      console.error('[STEP3] Exception:', error.message);

      // Detect error type
      const is500Error = error.response?.status === 500 || error.message?.includes('500');
      const isTimeout = error.message?.includes('timed out');

      setSealError({
        code: is500Error ? 'SERVER_ERROR' : isTimeout ? 'REQUEST_TIMEOUT' : 'SEAL_FAILED',
        message: is500Error 
          ? 'Sealing failed (server error). No immutable record created. This is not your fault.' 
          : isTimeout
          ? 'Sealing request timed out after 10 seconds. No evidence was sealed.'
          : error.message,
        field_errors: [],
        correlation_id: error.response?.data?.correlation_id || lastCorrelationId,
        is_server_error: is500Error || isTimeout
      });

      toast.error(is500Error ? 'Server Error (500)' : isTimeout ? 'Request Timeout' : 'Seal failed', { 
        description: is500Error 
          ? `Internal error, not your fault. Correlation: ${error.response?.data?.correlation_id || lastCorrelationId || 'N/A'}`
          : isTimeout
          ? 'Server did not respond within 10 seconds. Please retry.'
          : error.message 
      });
    } finally {
      setIsSealing(false);
    }
  };

  return (
    <AlertDialog open={true} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white/95 backdrop-blur-xl border border-white/50">
        {/* MODE BANNER - Always visible */}
        <ModeBanner simulationMode={simulationMode} />

        <Card className="border-0 shadow-none bg-transparent">
          <CardHeader className="pb-3">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-slate-900">Seal Evidence</CardTitle>
                <p className="text-xs text-slate-600 mt-2">
                  {simulationMode 
                    ? 'UI Validation Mode: Preview workflow without storing data or creating immutable ledger records.' 
                    : 'Create immutable evidence ledger entry with server-verified cryptographic hashes.'}
                </p>
                <div className="flex items-center gap-3 mt-3 pt-2 border-t border-slate-200">
                  <button
                    onClick={() => setSimulationMode(!simulationMode)}
                    className={`text-xs px-3 py-1.5 rounded-md border transition-colors ${
                      simulationMode 
                        ? 'bg-amber-100 border-amber-400 text-amber-900 font-semibold shadow-sm' 
                        : 'bg-white border-slate-300 text-slate-700 hover:bg-slate-50'
                    }`}
                    title="UI Validation Mode: Preview workflow without storing data or creating ledger records"
                  >
                    {simulationMode ? '⚠️ UI Validation Mode' : 'Production Mode'}
                  </button>
                  {showDiagnostics && draftId && (
                    <IngestionDiagnosticsDrawer
                      draftId={draftId}
                      declaration={declaration}
                      draftSnapshot={draftState}
                      lastCorrelationId={lastCorrelationId}
                      visible={showDiagnostics}
                    />
                  )}
                </div>



              </div>
            </div>
            <div className="flex gap-2 mt-4">
              {[
                { num: 1, label: 'Provenance & Metadata' },
                { num: 2, label: 'Payload' },
                { num: 3, label: 'Review & Seal' }
              ].map(s => (
                <div key={s.num} className="flex-1">
                  <div className={`h-1.5 rounded-full ${s.num <= step ? 'bg-[#86b027]' : 'bg-slate-200'}`} />
                  <p className="text-[9px] text-slate-500 mt-1 text-center">{s.num}/{3}: {s.label}</p>
                </div>
              ))}
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* STEP 1: Provenance & Metadata */}
            {step === 1 && (
              <Contract1DeclarationStepEnforced
                declaration={declaration}
                setDeclaration={setDeclaration}
                creatingDraft={creatingDraft}
                onNext={async () => {
                  console.log('[STEP1] Saving draft | Method:', declaration.ingestion_method);
                  
                  setCreatingDraft(true);
                  
                  // 10-second timeout with progress feedback
                  const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Request timed out after 10 seconds')), 10000)
                  );
                  
                  // Show "taking longer" message after 3 seconds
                  const slowWarning = setTimeout(() => {
                    toast.info('Still saving...', { description: 'Server is processing your request' });
                  }, 3000);
                  
                  try {
                    let result;
                    
                    // Check if declaration changed (avoid unnecessary server calls)
                    const currentHash = hashDeclaration(declaration);
                    const hasChanged = currentHash !== lastSavedDeclarationHash;
                    
                    const saveOperation = async () => {
                      if (!draftId) {
                        console.log('[STEP1] Creating draft...');
                        return await Kernel.kernel_createDraft(declaration);
                      } else if (hasChanged) {
                        console.log('[STEP1] Updating draft (changed)...');
                        return await Kernel.kernel_updateDraft(draftId, declaration);
                      } else {
                        console.log('[STEP1] No changes detected, skipping update');
                        return { draft_id: draftId, correlation_id: lastCorrelationId || 'UNCHANGED' };
                      }
                    };
                    
                    // Race between save operation and timeout
                    result = await Promise.race([saveOperation(), timeoutPromise]);
                    clearTimeout(slowWarning);
                    
                    // Update hash after successful save
                    setLastSavedDeclarationHash(currentHash);

                    if (result.error_code) {
                      console.error('[STEP1] Validation error:', result.error_code);
                      setLastCorrelationId(result.correlation_id);
                      
                      // Render field errors
                      if (result.field_errors && result.field_errors.length > 0) {
                        const errorList = result.field_errors.map(e => 
                          `• ${e.field}: ${e.error}${e.hint ? ' (' + e.hint + ')' : ''}`
                        ).join('\n');
                        toast.error('Validation Failed', {
                          description: errorList + `\n\nCorrelation: ${result.correlation_id}`,
                          duration: 10000
                        });
                      } else {
                        toast.error(result.error_code, {
                          description: `${result.message}\nCorrelation: ${result.correlation_id}`,
                          duration: 6000
                        });
                      }
                      return;
                    }

                    console.log('[STEP1] ✓ Draft saved:', result.draft_id?.substring(0, 12) + '...');

                    // Persist to localStorage
                    localStorage.setItem('ec_draft_id', result.draft_id);
                    localStorage.setItem('ec_draft_declaration', JSON.stringify(declaration));
                    
                    setDraftId(result.draft_id);
                    if (result.correlation_id) {
                      setLastCorrelationId(result.correlation_id);
                    }
                    
                    if (hasChanged || !draftId) {
                      toast.success('Draft saved', {
                        description: `Proceeding to payload step`,
                        duration: 2000
                      });
                    } else {
                      // No changes, proceed silently
                      console.log('[STEP1] No changes detected, proceeding to Step 2');
                    }
                    
                    setStep(2);
                  } catch (error) {
                    clearTimeout(slowWarning);
                    console.error('[STEP1] Exception:', error.message);
                    
                    if (error.message.includes('timed out')) {
                      toast.error('Request Timeout', { 
                        description: 'Server did not respond within 10 seconds. Please retry.',
                        action: {
                          label: 'Retry',
                          onClick: () => document.querySelector('[data-step1-next]')?.click()
                        }
                      });
                    } else {
                      toast.error('Draft save failed', { description: error.message });
                    }
                  } finally {
                    setCreatingDraft(false);
                  }
                }}
                onCancel={onClose}
              />
            )}

            {/* STEP 2: Payload */}
            {step === 2 && (
              <div>
                {!draftId && !simulationMode && (
                  <Card className="bg-red-50 border-red-300 mb-4">
                    <CardContent className="p-3 flex gap-2 items-start">
                      <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                      <div className="text-xs text-red-900">
                        <p className="font-bold">Draft not created yet</p>
                        <p>Complete required metadata in Step 1 and save to generate draft.</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
                
                {(() => {
                  const method = declaration.ingestion_method;
                  const commonProps = {
                    declaration,
                    draftId,
                    simulationMode,
                    onNext: () => setStep(3),
                    onBack: () => setStep(1)
                  };

                  switch (method) {
                    case 'FILE_UPLOAD':
                      return (
                        <FileUploadPayloadHardened
                          {...commonProps}
                          onSimulationModeToggle={() => setSimulationMode(true)}
                          onFileAttached={(metadata) => {
                            setFile(metadata.file);
                            setFileMetadata(metadata);
                            setLastCorrelationId(metadata.correlation_id);
                            if (metadata.simulated) {
                              setSimulationFileMetadata(metadata);
                            }
                          }}
                        />
                      );
                    
                    case 'MANUAL_ENTRY':
                      return (
                        <ManualEntryPayloadV2
                          {...commonProps}
                          payload={payload}
                          setPayload={setPayload}
                          draftBinding={draftBinding}
                          setDraftBinding={setDraftBinding}
                          onNext={async () => {
                            if (payload && !simulationMode) {
                              try {
                                const timeoutPromise = new Promise((_, reject) => 
                                  setTimeout(() => reject(new Error('Payload attachment timed out after 10 seconds')), 10000)
                                );
                                
                                const attachOperation = Kernel.kernel_attachPayload(draftId, payload);
                                const result = await Promise.race([attachOperation, timeoutPromise]);
                                
                                if (result.error_code) {
                                  toast.error('Payload attachment failed', { 
                                    description: `${result.message}\nCorrelation: ${result.correlation_id}`,
                                    duration: 6000
                                  });
                                  return;
                                }
                                setLastCorrelationId(result.correlation_id);
                              } catch (error) {
                                const isTimeout = error.message?.includes('timed out');
                                toast.error(isTimeout ? 'Request Timeout' : 'Payload failed', { 
                                  description: isTimeout ? 'Server did not respond within 10 seconds' : error.message,
                                  duration: 6000
                                });
                                return;
                              }
                            }
                            setStep(3);
                          }}
                        />
                      );
                    
                    case 'API_PUSH':
                      return (
                        <APIPushPayload
                          {...commonProps}
                          onNext={async () => {
                            // Construct method_payload for API_PUSH
                            if (!simulationMode) {
                              const methodPayload = {
                                method: 'API_PUSH',
                                external_reference_id: declaration.external_reference_id,
                                received_at_utc: declaration.received_at_utc,
                                payload_digest_sha256: declaration.payload_digest_sha256,
                                payload_bytes_count: declaration.payload_bytes_count,
                                source_endpoint: declaration.source_endpoint
                              };
                              
                              try {
                                const timeoutPromise = new Promise((_, reject) => 
                                  setTimeout(() => reject(new Error('Payload attachment timed out after 10 seconds')), 10000)
                                );
                                
                                const attachOperation = Kernel.kernel_attachPayload(draftId, methodPayload);
                                const result = await Promise.race([attachOperation, timeoutPromise]);
                                
                                if (result.error_code) {
                                  toast.error('Payload attachment failed', { 
                                    description: `${result.message}\nCorrelation: ${result.correlation_id}`,
                                    duration: 6000
                                  });
                                  return;
                                }
                                setLastCorrelationId(result.correlation_id);
                              } catch (error) {
                                const isTimeout = error.message?.includes('timed out');
                                toast.error(isTimeout ? 'Request Timeout' : 'Payload failed', { 
                                  description: isTimeout ? 'Server did not respond within 10 seconds' : error.message,
                                  duration: 6000
                                });
                                return;
                              }
                            }
                            setStep(3);
                          }}
                        />
                      );
                    
                    case 'ERP_API':
                      return (
                        <ERPAPIPayloadV2
                          {...commonProps}
                          onNext={async () => {
                            // Construct method_payload for ERP_API
                            if (!simulationMode) {
                              const methodPayload = {
                                method: 'ERP_API',
                                erp_system: declaration.erp_system,
                                connector_name: declaration.connector_name,
                                run_id: declaration.run_id,
                                query_profile: declaration.query_profile,
                                custom_profile_name: declaration.custom_profile_name,
                                started_at_utc: declaration.started_at_utc,
                                finished_at_utc: declaration.finished_at_utc,
                                records_returned: declaration.records_returned,
                                pagination_pages: declaration.pagination_pages,
                                api_base_url: declaration.api_base_url,
                                manifest_digest_sha256: declaration.manifest_digest_sha256
                              };
                              
                              try {
                                const timeoutPromise = new Promise((_, reject) => 
                                  setTimeout(() => reject(new Error('Payload attachment timed out after 10 seconds')), 10000)
                                );
                                
                                const attachOperation = Kernel.kernel_attachPayload(draftId, methodPayload);
                                const result = await Promise.race([attachOperation, timeoutPromise]);
                                
                                if (result.error_code) {
                                  toast.error('Payload attachment failed', { 
                                    description: `${result.message}\nCorrelation: ${result.correlation_id}`,
                                    duration: 6000
                                  });
                                  return;
                                }
                                setLastCorrelationId(result.correlation_id);
                              } catch (error) {
                                const isTimeout = error.message?.includes('timed out');
                                toast.error(isTimeout ? 'Request Timeout' : 'Payload failed', { 
                                  description: isTimeout ? 'Server did not respond within 10 seconds' : error.message,
                                  duration: 6000
                                });
                                return;
                              }
                            }
                            setStep(3);
                          }}
                        />
                      );
                    
                    case 'ERP_EXPORT':
                      return (
                        <ERPExportPayloadClean
                          {...commonProps}
                          onNext={async () => {
                            // Construct method_payload for ERP_EXPORT
                            if (!simulationMode) {
                              const methodPayload = {
                                method: 'ERP_EXPORT',
                                erp_system: declaration.erp_system,
                                export_job_id: declaration.export_job_id,
                                export_type: declaration.export_type,
                                exported_at_utc: declaration.exported_at_utc,
                                export_period_start_utc: declaration.export_period_start_utc,
                                export_period_end_utc: declaration.export_period_end_utc,
                                storage_location: declaration.storage_location,
                                manifest_digest_sha256: declaration.manifest_digest_sha256,
                                record_count: declaration.record_count,
                                file_count: declaration.file_count
                              };
                              
                              try {
                                const timeoutPromise = new Promise((_, reject) => 
                                  setTimeout(() => reject(new Error('Payload attachment timed out after 10 seconds')), 10000)
                                );
                                
                                const attachOperation = Kernel.kernel_attachPayload(draftId, methodPayload);
                                const result = await Promise.race([attachOperation, timeoutPromise]);
                                
                                if (result.error_code) {
                                  toast.error('Payload attachment failed', { 
                                    description: `${result.message}\nCorrelation: ${result.correlation_id}`,
                                    duration: 6000
                                  });
                                  return;
                                }
                                setLastCorrelationId(result.correlation_id);
                              } catch (error) {
                                const isTimeout = error.message?.includes('timed out');
                                toast.error(isTimeout ? 'Request Timeout' : 'Payload failed', { 
                                  description: isTimeout ? 'Server did not respond within 10 seconds' : error.message,
                                  duration: 6000
                                });
                                return;
                              }
                            }
                            setStep(3);
                          }}
                        />
                      );
                    
                    case 'SUPPLIER_PORTAL':
                      return <SupplierPortalPayload {...commonProps} />;
                    
                    default:
                      return (
                        <Alert className="bg-red-50 border-red-300">
                          <AlertTriangle className="w-4 h-4 text-red-600" />
                          <AlertDescription className="text-sm text-red-900 ml-2">
                            Method adapter not implemented: {method}
                          </AlertDescription>
                        </Alert>
                      );
                  }
                })()}
              </div>
            )}



            {/* STEP 3: Review & Seal */}
            {step === 3 && !receipt && (
              <div className="space-y-4">

                {/* Draft Verification Status (fetch from review endpoint) */}
                {loadingDraft && (
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4 flex gap-3 items-center">
                      <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
                      <p className="text-sm text-blue-900">Fetching draft state from server...</p>
                    </CardContent>
                  </Card>
                )}

                {draftError && (
                  <Card className="bg-red-50 border-red-300">
                    <CardContent className="p-4 space-y-3">
                      <div className="flex gap-2 items-start">
                        <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                        <div className="flex-1">
                          <p className="text-sm font-bold text-red-900">
                            {draftError.is_draft_not_found ? 'Draft Expired or Inaccessible' : 
                             draftError.is_timeout ? 'Request Timeout' : 
                             'Draft Fetch Failed'}
                          </p>
                          <p className="text-xs text-red-800 mt-1">{draftError.message}</p>
                          <p className="text-xs font-semibold text-red-900 mt-2 font-mono">
                            {draftError.code}
                          </p>
                          
                          {draftError.correlation_id && (
                            <div className="mt-2 pt-2 border-t border-red-200">
                              <div className="flex items-center justify-between">
                                <p className="text-xs text-red-700">
                                  Correlation ID: <code className="font-mono font-bold">{draftError.correlation_id}</code>
                                </p>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    navigator.clipboard.writeText(draftError.correlation_id);
                                    toast.success('Correlation ID copied');
                                  }}
                                  className="text-xs h-6"
                                >
                                  Copy
                                </Button>
                              </div>
                            </div>
                          )}
                          
                          <div className="mt-3 pt-3 border-t border-red-200 space-y-2">
                            {draftError.is_draft_not_found && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setDraftId(null);
                                  setDraftError(null);
                                  setStep(1);
                                  toast.info('Creating new draft with preserved inputs');
                                }}
                                className="bg-red-600 hover:bg-red-700 text-white text-xs w-full"
                              >
                                Create New Draft (Inputs Preserved)
                              </Button>
                            )}
                            {draftError.is_timeout && (
                              <Button
                                size="sm"
                                onClick={() => {
                                  setDraftError(null);
                                  fetchDraftSnapshot();
                                }}
                                className="bg-red-600 hover:bg-red-700 text-white text-xs w-full"
                              >
                                Retry Fetch
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setStep(1)}
                              className="text-xs w-full"
                            >
                              Back to Step 1
                            </Button>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Seal Errors (422 validation OR 500 server error) */}
                {sealError && (
                  <Card className={sealError.is_server_error ? "bg-red-50 border-red-400" : "bg-amber-50 border-amber-300"}>
                    <CardContent className="p-4 space-y-2">
                      <div className="flex gap-2 items-start">
                        <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${sealError.is_server_error ? 'text-red-600' : 'text-amber-600'}`} />
                        <div className="flex-1">
                          <p className={`text-sm font-bold ${sealError.is_server_error ? 'text-red-900' : 'text-amber-900'}`}>
                            {sealError.is_server_error ? 'Server Error (500)' : 'Seal Validation Failed (422)'}
                          </p>
                          <p className={`text-xs font-semibold mt-1 ${sealError.is_server_error ? 'text-red-900' : 'text-amber-900'}`}>
                            {sealError.code || 'ERROR'}
                          </p>
                          <p className={`text-xs mt-1 ${sealError.is_server_error ? 'text-red-800' : 'text-amber-800'}`}>{sealError.message}</p>
                          
                          {sealError.field_errors && sealError.field_errors.length > 0 && !sealError.is_server_error && (
                            <div className="mt-3 pt-3 border-t border-amber-200">
                              <p className="text-xs font-semibold text-amber-900 mb-2">Fix These Fields:</p>
                              <ul className="text-xs text-amber-800 space-y-1.5">
                                {sealError.field_errors.map((fe, idx) => (
                                  <li key={idx} className="pl-3 border-l-2 border-amber-400">
                                    <span className="font-mono font-bold">{fe.field}</span>
                                    <p className="mt-0.5">{fe.error}</p>
                                    {fe.hint && <p className="italic text-amber-700 mt-0.5">💡 {fe.hint}</p>}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {sealError.correlation_id && (
                            <div className={`mt-2 pt-2 border-t ${sealError.is_server_error ? 'border-red-200' : 'border-amber-200'}`}>
                              <p className={`text-xs ${sealError.is_server_error ? 'text-red-700' : 'text-amber-700'}`}>
                                Correlation ID: <code className="font-mono font-bold">{sealError.correlation_id}</code>
                              </p>
                            </div>
                          )}

                          {sealError.is_server_error && (
                            <div className="mt-3 pt-3 border-t border-red-200 space-y-2">
                              <Button
                                size="sm"
                                onClick={() => {
                                  setSealError(null);
                                  handleSeal();
                                }}
                                className="bg-red-600 hover:bg-red-700 text-white text-xs w-full"
                              >
                                Retry Sealing
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setStep(2)}
                                className="text-xs w-full"
                              >
                                Back to Step 2
                              </Button>
                            </div>
                          )}

                          {!sealError.is_server_error && (
                            <div className="mt-3 pt-3 border-t border-amber-200 space-y-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setStep(1)}
                                className="text-xs w-full"
                              >
                                Back to Step 1
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setStep(2)}
                                className="text-xs w-full"
                              >
                                Back to Step 2
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {(draftState || simulationFileMetadata) && !loadingDraft && !draftError && (
                   <Card className={
                     simulationMode
                     ? "bg-amber-50 border-amber-300"
                     : !draftState?.can_seal
                     ? "bg-red-50 border-red-300"
                     : "bg-green-50 border-green-200"
                   }>
                    <CardContent className="p-3 text-xs space-y-2">
                       <div className={`flex gap-2 items-center ${
                         simulationMode ? "text-amber-900" : !draftState?.can_seal ? "text-red-900" : "text-green-900"
                       }`}>
                        {simulationMode ? (
                          <>
                            <Eye className="w-4 h-4 text-amber-600 flex-shrink-0" />
                            Simulation Mode - UI preview only
                          </>
                        ) : !draftState?.can_seal ? (
                          <>
                            <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                            Cannot seal - validation failed
                          </>
                        ) : (
                          <>
                            <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                            Ready to seal
                          </>
                        )}
                      </div>
                      <div className={`p-3 rounded border space-y-1 ${simulationMode ? 'bg-amber-900 border-amber-700 text-amber-50' : 'bg-slate-900 border-slate-700 text-white'}`}>
                        <p className={`text-[11px] font-semibold mb-1 uppercase tracking-wide ${simulationMode ? 'text-amber-400' : 'text-slate-400'}`}>
                          {simulationMode ? 'UI Ready: YES (simulation)' : 'Evidence Engine Verification'}
                        </p>
                             {simulationFileMetadata && simulationMode && (
                          <>
                            <p className="text-[10px] text-amber-100">File (simulated): <code className="font-mono text-amber-200">{simulationFileMetadata.filename}</code></p>
                            <p className="text-[10px] text-amber-100">{(simulationFileMetadata.size_bytes / 1024).toFixed(2)} KB • {simulationFileMetadata.content_type}</p>
                            <p className="text-[9px] text-amber-300 mt-1">⚠️ No bytes stored, test hash only</p>
                          </>
                        )}
                        {draftState && !simulationMode && (
                          <>
                            <p className="text-[10px] text-slate-300">Draft ID: <code className="font-mono text-green-400">{draftState.draft?.draft_id || draftId}</code></p>
                               <p className="text-[10px] text-slate-300">
                              Evidence Engine Ready: <span className={`font-bold ${draftState.can_seal ? 'text-green-400' : 'text-red-400'}`}>{draftState.can_seal ? 'YES' : 'NO'}</span>
                            </p>
                          </>
                        )}
                        <div className={`pt-1 border-t ${simulationMode ? 'border-amber-700' : 'border-slate-700'}`}>
                          <p className={`text-[10px] ${simulationMode ? 'text-amber-100' : 'text-slate-300'}`}>
                            {declaration.ingestion_method === 'MANUAL_ENTRY' ? (
                              <>Payload: <span className="font-bold text-green-400">Canonical JSON (hashed server-side)</span></>
                            ) : (
                              <>Files: <span className={`font-bold ${simulationMode ? 'text-amber-200' : 'text-blue-400'}`}>
                                {simulationFileMetadata ? 1 : (draftState?.attachments?.length || 0)}
                              </span></>
                            )}
                          </p>
                        </div>
                        {draftState?.build_id && (
                            <p className={`text-[9px] ${simulationMode ? 'text-amber-600' : 'text-slate-500'}`}>Build: {draftState.build_id}</p>
                          )}
                          {(draftState?.correlation_id || simulationFileMetadata?.correlation_id) && (
                            <p className={`text-[9px] ${simulationMode ? 'text-amber-600' : 'text-slate-500'}`}>Correlation: {(draftState?.correlation_id || simulationFileMetadata?.correlation_id)?.substring(0, 24)}...</p>
                          )}
                      </div>

                      {/* No files warning - only for methods that require files */}
                      {!simulationFileMetadata && 
                       (!draftState || !draftState.attachments || draftState.attachments.length === 0) && 
                       ['FILE_UPLOAD', 'ERP_EXPORT'].includes(declaration.ingestion_method) && 
                       !simulationMode && (
                        <Alert className="bg-amber-50 border-amber-300">
                          <AlertTriangle className="h-4 w-4 text-amber-600" />
                          <AlertDescription className="text-xs text-amber-900 ml-2">
                            <strong>No files attached.</strong> Return to Step 2 and upload at least one file, or switch to UI Validation Mode to preview Step 3.
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Manual Entry payload confirmation */}
                      {declaration.ingestion_method === 'MANUAL_ENTRY' && (
                        <Alert className="bg-blue-50 border-blue-300">
                          <Info className="h-4 w-4 text-blue-600" />
                          <AlertDescription className="text-xs text-blue-900 ml-2">
                            <strong>MANUAL_ENTRY:</strong> Payload hashed from canonical JSON (stable key ordering, server-side). No file attachments expected.
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* Validation errors */}
                      {draftState && draftState.field_errors && draftState.field_errors.length > 0 && (
                        <div className="mt-2 p-2 bg-amber-50 border border-amber-300 rounded">
                          <p className="text-amber-900 font-medium text-xs mb-2">Validation errors (server):</p>
                          <ul className="space-y-1">
                            {draftState.field_errors.map((err, idx) => (
                              <li key={idx} className="text-[10px] text-amber-800 pl-2 border-l-2 border-amber-400">
                                <strong>{err.field}:</strong> {err.error}
                                {err.hint && <span className="italic text-amber-700"> ({err.hint})</span>}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Files display - only show if files exist */}
                      {(simulationFileMetadata || (draftState && draftState.attachments && draftState.attachments.length > 0)) && (
                        <div className="mt-2 space-y-1">
                          <p className="text-[10px] text-slate-700 font-semibold">{simulationMode ? 'File (simulated)' : 'Files (server-verified)'}:</p>
                          {simulationMode && simulationFileMetadata ? (
                            <div className="p-2 border rounded bg-amber-50 border-amber-300">
                              <p className="text-[10px] font-mono text-slate-900">{simulationFileMetadata.filename}</p>
                              <p className="text-[9px] text-slate-600">Size: {(simulationFileMetadata.size_bytes / 1024).toFixed(2)} KB • {simulationFileMetadata.content_type}</p>
                              <Badge className="bg-amber-600 text-white text-[8px] mt-1">SIMULATED UI ONLY</Badge>
                              <div className="mt-1 p-1.5 rounded border bg-amber-100 border-amber-300">
                                <p className="text-[9px] font-semibold text-amber-800">SHA-256 (SIMULATED test hash):</p>
                                <code className="text-[9px] break-all font-mono font-bold text-amber-900">{simulationFileMetadata.sha256}</code>
                                <p className="text-[8px] text-amber-700 mt-1">⚠️ Deterministic test value. No file bytes stored. Not an immutable ledger event.</p>
                              </div>
                            </div>
                          ) : draftState?.attachments?.length > 0 ? draftState.attachments.map((att, idx) => (
                            <div key={idx} className={`p-2 border rounded ${att.simulated ? 'bg-amber-50 border-amber-300' : 'bg-green-50 border-green-200'}`}>
                              <p className="text-[10px] font-mono text-slate-900">{att.filename}</p>
                              <p className="text-[9px] text-slate-600">Size: {(att.size_bytes / 1024).toFixed(2)} KB • {att.content_type}</p>
                              {att.simulated && (
                                <Badge className="bg-amber-600 text-white text-[8px] mt-1">SIMULATION: Not stored</Badge>
                              )}
                              <div className={`mt-1 p-1.5 rounded border ${att.simulated ? 'bg-amber-100 border-amber-300' : 'bg-green-50 border-green-200'}`}>
                                <p className={`text-[9px] font-semibold ${att.simulated ? 'text-amber-800' : 'text-green-800'}`}>
                                  SHA-256 {att.simulated ? '(simulated deterministic test hash)' : '(server-computed)'}:
                                </p>
                                <code className={`text-[9px] break-all font-mono font-bold ${att.simulated ? 'text-amber-900' : 'text-green-900'}`}>
                                  {att.sha256 || <span className="text-red-600">NOT_COMPUTED</span>}
                                </code>
                                {att.simulated && (
                                  <p className="text-[8px] text-amber-700 mt-1">⚠️ Deterministic test value - not an immutable ledger event</p>
                                )}
                              </div>
                            </div>
                          )) : null}
                          </div>
                          )}


                    </CardContent>
                  </Card>
                )}

                {!draftError && !loadingDraft && (
                  declaration.ingestion_method === 'MANUAL_ENTRY' ? (
                    <Contract1ReviewSummaryManualEntry 
                      declaration={declaration} 
                      draftBinding={draftBinding}
                      payload={payload}
                      simulationMode={simulationMode}
                    />
                  ) : declaration.ingestion_method === 'FILE_UPLOAD' ? (
                    <Contract1ReviewSummary 
                      declaration={declaration} 
                      payload={payload}
                      simulationMode={simulationMode}
                      fileMetadata={fileMetadata || simulationFileMetadata}
                    />
                  ) : (
                    <Contract1ReviewSummaryGeneric
                      declaration={declaration}
                      payload={payload}
                      simulationMode={simulationMode}
                      fileMetadata={fileMetadata}
                      draftState={draftState}
                    />
                  )
                )}

                <div className="flex gap-3 justify-end pt-4 border-t">
                  <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
                  <Button 
                    onClick={handleSeal} 
                    disabled={
                      simulationMode || 
                      isSealing || 
                      loadingDraft || 
                      draftError || 
                      !draftState?.can_seal ||
                      // Method-specific file requirements
                      (['FILE_UPLOAD', 'ERP_EXPORT'].includes(declaration.ingestion_method) && 
                       (!draftState.attachments || draftState.attachments.length === 0))
                    }
                    className={`gap-2 ${
                     isSealing || 
                     loadingDraft || 
                     draftError || 
                     (!simulationMode && !draftState?.can_seal) ||
                     (!simulationMode && ['FILE_UPLOAD', 'ERP_EXPORT'].includes(declaration.ingestion_method) && 
                      (!draftState?.attachments || draftState.attachments.length === 0))
                     ? 'opacity-50 cursor-not-allowed bg-slate-400' 
                     : simulationMode
                     ? 'opacity-50 cursor-not-allowed bg-slate-400'
                     : 'bg-green-600 hover:bg-green-700'
                    }`}
                  >
                    {isSealing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sealing...
                      </>
                    ) : loadingDraft ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Verifying...
                      </>
                    ) : simulationMode ? (
                      <>Sealing disabled in UI Validation Mode</>
                    ) : draftError ? (
                       'Draft Error'
                     ) : (['FILE_UPLOAD', 'ERP_EXPORT'].includes(declaration.ingestion_method) && 
                          (!draftState?.attachments || draftState.attachments.length === 0)) ? (
                       'No files - go to Step 2'
                     ) : !draftState?.can_seal ? (
                       'Fix validation errors'
                     ) : (
                       <>
                         <CheckCircle2 className="w-4 h-4" />
                         Seal Evidence
                       </>
                     )}
                  </Button>
                </div>
              </div>
            )}

            {/* RECEIPT */}
            {receipt && (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <h3 className="font-medium text-slate-900">{receipt.simulated ? 'Simulated Result (No Ledger Record Created)' : 'Evidence Sealed'}</h3>
                  {receipt.quarantined && (
                    <Badge className="bg-red-100 text-red-800 ml-auto">QUARANTINED</Badge>
                  )}
                </div>

                {receipt.quarantined && (
                  <Card className="bg-red-50 border-red-300">
                    <CardContent className="p-3 text-sm text-red-900 flex gap-2">
                      <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold">Unlinked evidence stored as QUARANTINED</p>
                        <p className="text-xs mt-1">This evidence is not linked to a valid target, so it is excluded from downstream calculations until resolved.</p>
                        {receipt.quarantine_reason && (
                          <p className="text-xs mt-1 font-mono text-red-800">{receipt.quarantine_reason}</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )}

                <div className="space-y-2 bg-slate-900 text-white rounded p-4 border border-slate-700 text-xs font-mono">
                  <p className="text-slate-400 font-semibold uppercase tracking-wide text-[10px] mb-2">
                    {receipt.simulated ? 'Simulated Evidence Receipt (UI Test Only)' : 'Sealed Evidence Receipt'}
                  </p>
                  <div>
                    <p className="text-slate-500 font-semibold">Evidence ID (immutable)</p>
                    <code className="text-green-400 break-all">{receipt.evidence_id}</code>
                  </div>
                  <div>
                    <p className="text-slate-500 font-semibold">Correlation ID</p>
                    <code className="text-blue-400 break-all">{receipt.correlation_id}</code>
                  </div>
                  <div>
                    <p className="text-slate-500 font-semibold">Ledger State</p>
                    <Badge className={receipt.ledger_state === 'SEALED' ? 'bg-green-600' : 'bg-red-600'}>
                      {receipt.ledger_state || 'SEALED'}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-slate-500 font-semibold">Metadata Hash (SHA-256, canonical JSON)</p>
                    <code className="text-purple-400 break-all text-[10px]">
                      {receipt.metadata_hash && receipt.metadata_hash !== 'metadata_hash_placeholder' 
                        ? receipt.metadata_hash 
                        : <span className="text-red-400 font-bold">NOT_COMPUTED (BUG)</span>
                      }
                    </code>
                  </div>
                  <div>
                    <p className="text-slate-500 font-semibold">
                      Payload Hash (SHA-256, {declaration.ingestion_method === 'MANUAL_ENTRY' ? 'canonical JSON' : 'file bytes'})
                    </p>
                    <code className="text-purple-400 break-all text-[10px]">
                      {receipt.payload_hash && receipt.payload_hash !== 'payload_hash_placeholder'
                        ? receipt.payload_hash 
                        : <span className="text-red-400 font-bold">NOT_COMPUTED (BUG)</span>
                      }
                    </code>
                  </div>
                  <div>
                    <p className="text-slate-500 font-semibold">Payload Size</p>
                    <p className="text-slate-300">{(receipt.payload_size / 1024).toFixed(2)} KB ({receipt.payload_size} bytes)</p>
                  </div>
                  <div>
                    <p className="text-slate-500 font-semibold">Sealed At (UTC)</p>
                    <p className="text-slate-300">{receipt.sealed_at ? new Date(receipt.sealed_at).toISOString() : 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-slate-500 font-semibold">Retention Ends (UTC)</p>
                    <p className="text-yellow-400 font-bold">
                      {receipt.retention_ends && receipt.retention_ends !== 'INVALID' && receipt.retention_ends !== null
                        ? new Date(receipt.retention_ends).toISOString() 
                        : <span className="text-slate-400">Computed at seal</span>
                      }
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500 font-semibold">Review Status</p>
                    <Badge className={
                      receipt.review_status === 'APPROVED' ? 'bg-green-600 text-white' :
                      receipt.review_status === 'REJECTED' ? 'bg-red-600 text-white' :
                      'bg-amber-600 text-white'
                    }>
                      {receipt.review_status === 'AUTO_APPROVED' || receipt.review_status === 'System Precheck' || receipt.review_status === 'Draft Validation Passed'
                        ? 'NOT_REVIEWED' 
                        : receipt.review_status === 'NOT_REVIEWED'
                        ? 'NOT_REVIEWED'
                        : receipt.review_status}
                    </Badge>
                    <p className="text-[9px] text-slate-400 mt-1">
                      {receipt.review_status === 'NOT_REVIEWED' || receipt.review_status === 'PENDING_REVIEW' || receipt.review_status === 'AUTO_APPROVED'
                        ? 'Awaiting human review (no auto-approval)' 
                        : receipt.review_status === 'APPROVED'
                        ? 'Human-approved'
                        : receipt.review_status === 'REJECTED'
                        ? 'Human-rejected'
                        : 'Status updated'}
                    </p>
                  </div>
                  {receipt.simulated && (
                    <div className="pt-2 border-t border-amber-500">
                      <Badge className="bg-amber-600 text-white text-[10px]">
                        SIMULATED RESULT — NO LEDGER RECORD CREATED
                      </Badge>
                      <p className="text-[9px] text-amber-300 mt-1">⚠️ UI validation only. Hashes are deterministic test values, not audit evidence.</p>
                    </div>
                  )}
                  <div className="pt-2 border-t border-slate-700">
                    <p className="text-slate-500 font-semibold text-[9px]">Server Build & Contract</p>
                    <p className="text-[9px] text-slate-400">Build: <code className="text-slate-300">{receipt.build_id || 'unknown'}</code></p>
                    <p className="text-[9px] text-slate-400">Contract: <code className="text-slate-300">{receipt.contract_version || 'unknown'}</code></p>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <Button 
                    onClick={() => {
                      onClose();
                      // Reset wizard state
                      setStep(1);
                      setReceipt(null);
                      setDraftState(null);
                      setSimulationFileMetadata(null);
                    }} 
                    className="w-full bg-[#86b027] hover:bg-[#86b027]/90"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    {receipt.simulated ? 'Done — UI Validation Complete' : 'Done — Evidence Sealed'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </AlertDialogContent>
    </AlertDialog>
  );
}