import React, { useState, useEffect } from 'react';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, Users, FileCheck } from 'lucide-react';

/**
 * SUPPLIER_PORTAL Step 2 - Provenance Binding
 * 
 * Displays server-authoritative portal submission provenance.
 * Portal Submission ID is NOT user-entered; it comes from authenticated portal context only.
 * If portal context is missing, issue warning and suggest quarantine path.
 */
export default function SupplierPortalPayload({ declaration, onNext, onBack, draftId, simulationMode }) {
  const [notes, setNotes] = useState(declaration.portal_notes || '');
  
  // Portal submission ID is server-authoritative (captured from portal auth context)
  const hasPortalContext = !!declaration.portal_submission_id;
  
  useEffect(() => {
    declaration.portal_notes = notes;
  }, [notes]);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="font-medium text-slate-900">Step 2: API Receipt Details</h3>
        <p className="text-xs text-slate-600 mt-1">Server-authoritative portal provenance binding</p>
      </div>

      <Card className="bg-green-50/50 border-green-300/60">
        <CardContent className="p-4 space-y-2">
          <div className="flex items-start gap-2">
            <Users className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-green-900">
              <p className="font-medium">Portal Submission Provenance</p>
              <p className="mt-1">Evidence sourced from supplier portal submission. Binding is server-verified and immutable.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Missing Portal Context Warning */}
      {!hasPortalContext && (
        <Alert className="bg-red-50 border-red-300">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <AlertDescription className="text-xs text-red-900 ml-2">
            <strong>Portal context missing.</strong> To use Supplier Portal method, you must launch from an authenticated supplier portal link. This draft will be quarantined with reason: MISSING_PORTAL_CONTEXT.
          </AlertDescription>
        </Alert>
      )}

      {/* Portal Context Card (Server-Authoritative) */}
      <Card className={`${hasPortalContext ? 'bg-white border-green-300' : 'bg-slate-50 border-slate-300'}`}>
        <CardContent className="p-3 space-y-2 text-xs">
          <p className={`font-medium ${hasPortalContext ? 'text-green-900' : 'text-slate-700'} flex items-center gap-1`}>
            {hasPortalContext ? <CheckCircle2 className="w-3 h-3" /> : <AlertCircle className="w-3 h-3" />}
            Portal Submission Binding
          </p>
          <div className="space-y-1 text-slate-700">
            <div className="flex justify-between">
              <span className="text-slate-600">Portal Submission ID</span>
              <code className={`font-mono px-2 py-1 rounded text-[10px] ${hasPortalContext ? 'bg-green-100 text-green-900' : 'bg-slate-100 text-slate-600'}`}>
                {declaration.portal_submission_id || '—'}
              </code>
            </div>
            {hasPortalContext && declaration.portal_supplier_name && (
              <div className="flex justify-between">
                <span className="text-slate-600">Supplier</span>
                <span className="font-medium">{declaration.portal_supplier_name}</span>
              </div>
            )}
            {hasPortalContext && declaration.portal_submitted_at && (
              <div className="flex justify-between">
                <span className="text-slate-600">Submitted At (UTC)</span>
                <span className="font-mono text-[10px]">{new Date(declaration.portal_submitted_at).toISOString()}</span>
              </div>
            )}
          </div>
          <p className={`text-[10px] italic border-t ${hasPortalContext ? 'border-green-200 pt-2 text-green-600' : 'border-slate-200 pt-2 text-slate-600'}`}>
            {hasPortalContext 
              ? '✓ Server-set provenance binding. Not editable.' 
              : 'ⓘ Missing. Access via authenticated portal link to capture context.'}
          </p>
        </CardContent>
      </Card>

      {/* Submission Metadata */}
      {hasPortalContext && (
        <Card className="bg-slate-50/50 border-slate-200">
          <CardContent className="p-3 space-y-1 text-xs">
            <div className="flex justify-between">
              <span className="text-slate-600">Source System (locked)</span>
              <Badge className="bg-green-100 text-green-800 text-[10px]">SUPPLIER_PORTAL</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Dataset Type</span>
              <Badge className="bg-blue-100 text-blue-800 text-[10px]">{declaration.dataset_type}</Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600">Declared Scope</span>
              <Badge className="bg-purple-100 text-purple-800 text-[10px]">{declaration.declared_scope}</Badge>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Additional Notes (optional) */}
      <div>
        <Label className="text-xs font-medium">Additional Context (optional)</Label>
        <Input
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g., Quarterly compliance batch, reference #..."
          disabled={!hasPortalContext}
        />
        <p className="text-xs text-slate-500 mt-1">
          Optional: Audit trail context.
        </p>
      </div>

      <Card className="bg-blue-50/50 border-blue-300/60">
        <CardContent className="p-3 text-xs">
          <div className="flex items-start gap-2">
            <FileCheck className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-blue-900">
              <p className="font-medium">Supplier Portal Provenance Chain</p>
              <ul className="list-disc list-inside mt-1 space-y-0.5 text-blue-800">
                <li>Submission ID: server-generated, immutable</li>
                <li>Supplier Identity: from portal auth context</li>
                <li>Files & metadata: retrieved at seal time</li>
                <li>Hashes: computed server-side (non-forgeable)</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {simulationMode && (
        <Alert className="bg-amber-50 border-amber-300">
          <AlertCircle className="w-4 h-4 text-amber-600" />
          <AlertDescription className="text-xs text-amber-900 ml-2">
            <strong>UI Validation Mode:</strong> Portal submission context will NOT be retrieved. Preview only.
          </AlertDescription>
        </Alert>
      )}

      <Card className={`${hasPortalContext ? 'bg-green-50 border-green-300' : 'bg-amber-50 border-amber-300'}`}>
        <CardContent className="p-3 text-xs">
          <p className={`font-medium mb-2 ${hasPortalContext ? 'text-green-900' : 'text-amber-900'}`}>
            {hasPortalContext ? '✓ Provenance Ready' : '⚠ Portal Context Missing'}
          </p>
          <div className={`space-y-1 ${hasPortalContext ? 'text-green-800' : 'text-amber-800'}`}>
            {hasPortalContext ? (
              <>
                <p>• Submission: <strong>Server-verified binding</strong></p>
                <p>• Supplier: <strong>{declaration.portal_supplier_name || 'Identified'}</strong></p>
                <p className="text-[10px] mt-2">
                  Ready to proceed to review and seal.
                </p>
              </>
            ) : (
              <>
                <p>• Status: <strong>Missing portal context</strong></p>
                <p className="text-[10px] mt-2">
                  Record will be quarantined with reason: MISSING_PORTAL_CONTEXT. Review & provide portal submission ID at a later time.
                </p>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-end pt-4 border-t">
        <Button variant="outline" onClick={onBack}>Back</Button>
        <Button 
          onClick={onNext}
          disabled={!hasPortalContext && !simulationMode}
          className="bg-[#86b027] hover:bg-[#86b027]/90 disabled:opacity-50"
        >
          <CheckCircle2 className="w-4 h-4 mr-2" />
          {hasPortalContext ? 'Review & Seal' : 'Proceed (Quarantine)'}
        </Button>
      </div>
    </div>
  );
}