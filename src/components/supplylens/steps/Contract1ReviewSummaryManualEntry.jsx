import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { Alert, AlertDescription } from "@/components/ui/alert";
import EvidenceReceipt from '../EvidenceReceipt';

/**
 * Contract1ReviewSummaryManualEntry - Review & Seal Step
 * Shows validation status, allows sealing, displays receipt
 */
export default function Contract1ReviewSummaryManualEntry({ declaration, draftBinding, onBack }) {
  const [sealing, setSealing] = useState(false);
  const [sealedEvidence, setSealedEvidence] = useState(null);
  const [sealError, setSealError] = useState(null);

  const handleSeal = async () => {
    setSealing(true);
    setSealError(null);

    try {
      const { demoStore } = await import('../DemoDataStore');
      
      const draft_id = declaration.draft_id;
      if (!draft_id) {
        throw new Error('No draft_id found. Please go back and validate your data.');
      }

      const draft = demoStore.getEvidenceDraft(draft_id);
      if (!draft) {
        throw new Error(`Draft ${draft_id} not found`);
      }

      if (draft.validation_status !== 'PASS') {
        throw new Error('Draft validation must pass before sealing');
      }

      // Seal the draft
      const evidence = demoStore.sealEvidenceDraft(draft_id);
      setSealedEvidence(evidence);
    } catch (error) {
      console.error('[Contract1ReviewSummary] Seal error:', error);
      setSealError(error.message);
    } finally {
      setSealing(false);
    }
  };

  // If sealed, show receipt
  if (sealedEvidence) {
    return <EvidenceReceipt evidence={sealedEvidence} onClose={() => window.location.href = '/app/EvidenceVault'} />;
  }

  return (
    <div className="space-y-6">
      {/* Review Header */}
      <Card className="border-2 border-slate-300">
        <CardHeader className="bg-slate-50 border-b border-slate-200">
          <CardTitle className="flex items-center gap-2 text-slate-900">
            <Shield className="w-5 h-5" />
            Review & Seal
          </CardTitle>
          <p className="text-xs text-slate-600 mt-1">Final review before creating immutable evidence record</p>
        </CardHeader>
        <CardContent className="p-6 space-y-4">
          {/* Binding Context */}
          <div>
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Binding Context</p>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-slate-600">Dataset Type</p>
                <Badge variant="outline" className="mt-1">{declaration.dataset_type || declaration.evidence_type}</Badge>
              </div>
              <div>
                <p className="text-slate-600">Ingestion Method</p>
                <Badge variant="outline" className="mt-1">MANUAL_ENTRY</Badge>
              </div>
              {draftBinding?.declared_scope && (
                <div>
                  <p className="text-slate-600">Scope</p>
                  <p className="text-slate-900 font-mono text-xs mt-1">{draftBinding.declared_scope}</p>
                </div>
              )}
            </div>
          </div>

          {/* Attestation Notes */}
          <div>
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Attestation Notes</p>
            <div className="bg-slate-50 border border-slate-200 rounded p-3 text-sm text-slate-700">
              {declaration.entry_notes || 'No notes provided'}
            </div>
          </div>

          {/* Validation Status */}
          <div>
            <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Validation Status</p>
            {declaration.draft_id ? (
              <Alert className="bg-green-50 border-green-300">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <AlertDescription className="text-sm text-green-900 ml-2">
                  Validation passed. Ready to seal.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert className="bg-red-50 border-red-300">
                <AlertCircle className="w-4 h-4 text-red-600" />
                <AlertDescription className="text-sm text-red-900 ml-2">
                  No validated draft found. Please go back and validate your data.
                </AlertDescription>
              </Alert>
            )}
          </div>

          {/* Seal Error */}
          {sealError && (
            <Alert className="bg-red-50 border-red-300">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <AlertDescription className="text-sm text-red-900 ml-2">
                <strong>Seal Failed:</strong> {sealError}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* What Happens on Seal */}
      <Card className="bg-blue-50 border-blue-300">
        <CardContent className="p-4 text-sm text-blue-900">
          <p className="font-semibold mb-2">What happens when you seal:</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Evidence record created with SEALED status</li>
            <li>Payload hash (SHA-256) computed and stored</li>
            <li>Metadata hash (SHA-256) computed and stored</li>
            <li>Display ID assigned (e.g., EV-0001)</li>
            <li>Retention period set (7 years)</li>
            <li>Audit trail logged</li>
            <li>Record becomes immutable</li>
          </ul>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3 justify-end pt-4 border-t border-slate-200">
        <Button variant="outline" onClick={onBack} disabled={sealing}>
          Back
        </Button>
        <Button 
          onClick={handleSeal}
          disabled={!declaration.draft_id || sealing}
          className="bg-[#86b027] hover:bg-[#86b027]/90 gap-2"
        >
          {sealing && <Loader2 className="w-4 h-4 animate-spin" />}
          {sealing ? 'Sealing...' : 'Seal Evidence'}
        </Button>
      </div>
    </div>
  );
}