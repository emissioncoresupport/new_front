import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Shield, User, FileText, Lock, AlertTriangle } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import BOMForm from '../../forms/BOMForm';
import SupplierMasterForm from '../../forms/SupplierMasterForm';
import ProductMasterForm from '../../forms/ProductMasterForm';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import EvidenceReceipt from '../../EvidenceReceipt';

export default function ManualEntryPayloadV2({ payload, setPayload, declaration, setDeclaration, draftBinding, draftId, onNext, onBack, simulationMode }) {
  const [formData, setFormData] = useState(null);
  const [isValid, setIsValid] = useState(false);
  const [savingPayload, setSavingPayload] = useState(false);
  const [validationResult, setValidationResult] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isSealing, setIsSealing] = useState(false);
  const [sealedEvidence, setSealedEvidence] = useState(null);

  // Parse existing payload if available
  useEffect(() => {
    if (payload && payload.trim()) {
      try {
        const parsed = JSON.parse(payload);
        setFormData(parsed);
      } catch (e) {
        // Invalid JSON, ignore
      }
    }
  }, []);

  const handleFormChange = (data) => {
    setFormData(data);
    // Store payload JSON in declaration state
    // DO NOT create any payload.txt file attachment
    setDeclaration(prev => ({
      ...prev,
      manual_json_data: JSON.stringify(data)
    }));
  };

  const handleValidation = (valid) => {
    setIsValid(valid);
  };

  const handleValidate = async () => {
    if (!formData) {
      setValidationResult({ valid: false, errors: ['No data to validate'] });
      return;
    }

    setIsValidating(true);
    
    try {
      const { demoStore } = await import('../../DemoDataStore');
      
      // Create or update draft
      let draft;
      if (draftId) {
        draft = demoStore.getEvidenceDraft(draftId);
        if (draft) {
          demoStore.updateEvidenceDraft(draftId, {
            payload: formData,
            binding: draftBinding || {}
          });
        }
      }
      
      if (!draft) {
        // Create new draft
        draft = demoStore.createEvidenceDraft({
          dataset_type: declaration.evidence_type || declaration.dataset_type,
          ingestion_method: 'MANUAL_ENTRY',
          binding: draftBinding || {},
          payload: formData
        });
        // Store draft_id in declaration for next step
        setDeclaration(prev => ({ ...prev, draft_id: draft.draft_id }));
      }
      
      // Validate
      const result = demoStore.validateEvidenceDraft(draft.draft_id);
      setValidationResult(result);
      setIsValid(result.valid);
    } catch (error) {
      console.error('[ManualEntry] Validation error:', error);
      setValidationResult({ valid: false, errors: [error.message] });
    } finally {
      setIsValidating(false);
    }
  };

  const handleSeal = async () => {
    if (!validationResult?.valid) {
      toast.error('Validation must pass before sealing');
      return;
    }

    setIsSealing(true);

    try {
      const { demoStore } = await import('../../DemoDataStore');
      
      const draft_id = declaration.draft_id;
      if (!draft_id) {
        throw new Error('No draft_id found');
      }

      const evidence = demoStore.sealEvidenceDraft(draft_id);
      setSealedEvidence(evidence);
      toast.success('Evidence sealed successfully');
    } catch (error) {
      console.error('[ManualEntry] Seal error:', error);
      toast.error(error.message || 'Seal failed');
    } finally {
      setIsSealing(false);
    }
  };

  const canProceed = 
    declaration.entry_notes && 
    declaration.entry_notes.trim().length >= 20 && 
    validationResult?.valid;

  const renderForm = () => {
    const evidenceType = declaration.evidence_type || declaration.dataset_type;

    if (evidenceType === 'BOM') {
      return <BOMForm data={formData} onChange={handleFormChange} onValidate={handleValidation} />;
    } else if (evidenceType === 'SUPPLIER_MASTER') {
      return <SupplierMasterForm data={formData} onChange={handleFormChange} onValidate={handleValidation} />;
    } else if (evidenceType === 'PRODUCT_MASTER') {
      return <ProductMasterForm data={formData} onChange={handleFormChange} onValidate={handleValidation} />;
    } else if (evidenceType === 'TRANSACTION_OR_MOVEMENT_LOG') {
      // Simple JSON entry for transaction logs (no structured form yet)
      return (
        <div className="space-y-3">
          <Alert className="bg-blue-50 border-blue-200">
            <AlertDescription className="text-xs text-blue-900">
              <strong>Transaction/Movement Log:</strong> Enter structured JSON data for the transaction record.
            </AlertDescription>
          </Alert>
          <div>
            <Label className="text-xs font-medium">Transaction Data (JSON) *</Label>
            <Textarea
              value={declaration.manual_json_data || ''}
              onChange={(e) => {
                setDeclaration(prev => ({ ...prev, manual_json_data: e.target.value }));
                try {
                  const parsed = JSON.parse(e.target.value);
                  setIsValid(!!parsed);
                } catch {
                  setIsValid(false);
                }
              }}
              placeholder='{"transaction_id":"TXN-001","date":"2026-01-29","amount":1000}'
              className="font-mono h-32"
            />
          </div>
        </div>
      );
    } else {
      // This should never be reached because Step 1 blocks unsupported method-evidence-type combos
      return (
        <Alert className="bg-red-50 border-red-200">
          <AlertDescription className="text-sm text-red-900">
            <strong>Error:</strong> Evidence type "{evidenceType}" does not support manual entry. This should have been blocked in Step 1. Please go back and select SUPPLIER_MASTER, PRODUCT_MASTER, or TRANSACTION_OR_MOVEMENT_LOG.
          </AlertDescription>
        </Alert>
      );
    }
  };

  // If sealed, show receipt
  if (sealedEvidence) {
    return <EvidenceReceipt evidence={sealedEvidence} />;
  }

  return (
    <div className="space-y-4">
      {/* STEP 1 BINDING CONTEXT (READ-ONLY) */}
      <Card className="bg-slate-50 border-slate-300">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Lock className="w-4 h-4 text-slate-600" />
            Binding Context (Step 1)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-slate-600 font-medium">Evidence Type</p>
              <p className="text-slate-900 font-mono">{draftBinding?.evidence_type || declaration.evidence_type || draftBinding?.dataset_type || declaration.dataset_type}</p>
            </div>
            <div>
              <p className="text-slate-600 font-medium">Scope</p>
              <p className="text-slate-900 font-mono">{draftBinding?.declared_scope || declaration.declared_scope}</p>
            </div>
            {(draftBinding?.scope_target_id || declaration.scope_target_id) && (
              <div>
                <p className="text-slate-600 font-medium">Linked To</p>
                <p className="text-slate-900 font-mono">{draftBinding?.scope_target_name || declaration.scope_target_name}</p>
              </div>
            )}
            {(draftBinding?.declared_scope === 'UNKNOWN' || declaration.declared_scope === 'UNKNOWN') && (
              <div className="col-span-2 bg-red-50 border border-red-200 rounded p-2">
                <p className="text-red-900 font-medium">Quarantine Status</p>
                <p className="text-red-800 text-xs mt-1">UNLINKED - Will be quarantined until linked to valid scope</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-blue-50/50 border-blue-300/60">
        <CardContent className="p-4 text-sm text-blue-900 space-y-2">
          <div className="flex items-start gap-2">
            <FileText className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-600" />
            <div>
              <p className="font-medium">📝 Step 2: Enter Data</p>
              <p className="text-xs text-blue-800 mt-1">Fill in required fields. Data will be converted to canonical JSON and hashed server-side at seal.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-blue-50/50 border-blue-300/60">
        <CardContent className="p-4 text-xs text-blue-900 space-y-2">
          <div className="flex items-start gap-2">
            <Shield className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-medium">System Verification (Auto-Captured at Seal)</p>
              <ul className="list-disc list-inside mt-1 space-y-1 text-blue-800">
                <li>Attestor User ID: captured from auth session</li>
                <li>Sealed At (UTC): server timestamp</li>
                <li>Method: MANUAL_ENTRY</li>
                <li>Source System: INTERNAL_MANUAL (locked)</li>
                <li>Trust Level: LOW (manual attestation)</li>
                <li>Review Status: NOT_REVIEWED (requires approval before use in calculations)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Entry Notes from Step 1 */}
      <div className="bg-slate-50/50 border border-slate-200 rounded p-3">
        <p className="text-xs text-slate-600 mb-2">
          <strong>Attestation Notes (from Step 1):</strong>
        </p>
        <div className="bg-white border border-slate-300 rounded p-2 text-xs text-slate-700 max-h-24 overflow-y-auto">
          {declaration.entry_notes || <span className="text-slate-400 italic">Not set</span>}
        </div>
        <p className="text-xs text-slate-500 mt-1">{(declaration.entry_notes || '').length} / 20 chars minimum</p>
      </div>

      {/* Dataset-Specific Form */}
      <Card className="bg-white border-slate-200">
        <CardContent className="p-4">
          <div className="mb-3 flex items-center gap-2">
            <Badge className="bg-purple-100 text-purple-800">{declaration.evidence_type || declaration.dataset_type}</Badge>
            <p className="text-xs text-slate-600">Evidence Type</p>
          </div>
          {renderForm()}
        </CardContent>
      </Card>

      {/* Validation Button & Results */}
      <Card className="border-2 border-slate-300">
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Validation</p>
              <p className="text-xs text-slate-600">Run schema checks before sealing</p>
            </div>
            <Button 
              onClick={handleValidate}
              disabled={!formData || isValidating}
              variant="outline"
              className="gap-2"
            >
              {isValidating ? 'Validating...' : 'Validate'}
            </Button>
          </div>
          
          {validationResult && (
            <div className={`mt-3 p-3 rounded border-2 ${
              validationResult.valid 
                ? 'bg-green-50 border-green-300' 
                : 'bg-red-50 border-red-300'
            }`}>
              <div className="flex items-center gap-2">
                {validationResult.valid ? (
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-600" />
                )}
                <p className={`text-sm font-semibold ${
                  validationResult.valid ? 'text-green-900' : 'text-red-900'
                }`}>
                  {validationResult.valid ? 'Validation Passed' : 'Validation Failed'}
                </p>
              </div>
              {!validationResult.valid && validationResult.errors.length > 0 && (
                <ul className="list-disc list-inside mt-2 text-xs text-red-800 space-y-1">
                  {validationResult.errors.map((err, idx) => (
                    <li key={idx}>{err}</li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cannot Proceed Alert */}
      {!canProceed && (
        <Alert className="bg-amber-50 border-amber-300">
          <AlertCircle className="w-4 h-4 text-amber-600" />
          <AlertDescription className="text-xs text-amber-900 ml-2">
            <p className="font-medium">Cannot proceed to Review & Seal:</p>
            <ul className="list-disc list-inside mt-1">
              {(!declaration.entry_notes || declaration.entry_notes.trim().length < 20) && (
                <li>Attestation notes required (min. 20 chars) — go back to Step 1</li>
              )}
              {!validationResult && <li>Click "Validate" button to check data</li>}
              {validationResult && !validationResult.valid && <li>Fix validation errors shown above</li>}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* High-Risk Warning */}
      <Alert className="bg-orange-50 border-orange-300">
        <AlertTriangle className="w-4 h-4 text-orange-600" />
        <AlertDescription className="text-xs text-orange-900 ml-2">
          <p className="font-medium">⚠️ Manual Entry Risk Notice</p>
          <p className="mt-1">
            Manual entry bypasses automated ingestion. Data is sealed with your attestation. Trust level: LOW. Review status: NOT_REVIEWED. Human approval required before this evidence can be used in compliance calculations or regulatory submissions.
          </p>
        </AlertDescription>
      </Alert>

      {/* CRITICAL: Manual Entry - NO Payload File */}
      <Card className="bg-slate-50 border-slate-300">
        <CardContent className="p-3 text-xs text-slate-700">
          <p className="font-medium text-slate-900 mb-1">Payload Handling (Manual Entry)</p>
          <ul className="list-disc list-inside space-y-0.5">
            <li>NO payload.txt file will be created</li>
            <li>JSON data stored in draft record</li>
            <li>Server computes hash from canonical JSON at seal time</li>
            <li>Expected Files: 0 (data in metadata)</li>
          </ul>
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex gap-3 justify-end pt-4 border-t">
        <Button variant="outline" onClick={onBack} disabled={savingPayload || isSealing}>Back</Button>
        <Button 
          onClick={handleSeal}
          disabled={!canProceed || isSealing}
          className="bg-[#86b027] hover:bg-[#86b027]/90 disabled:opacity-50 gap-2"
        >
          {isSealing && <Loader2 className="w-4 h-4 animate-spin" />}
          {isSealing ? 'Sealing...' : 'Seal Evidence'}
        </Button>
      </div>
    </div>
  );
}