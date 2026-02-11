import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogContent } from "@/components/ui/alert-dialog";
import { Loader2, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

/**
 * CONTRACT 1 SEALING WIZARD V2 — 3 Steps
 * Step 1: Declaration (ingestion metadata)
 * Step 2: Payload (file upload or API payload)
 * Step 3: Receipt (confirmation + hashes)
 */

export default function Contract1SealingWizardV2({ onClose }) {
  const [step, setStep] = useState(1);
  const [isSealing, setIsSealing] = useState(false);
  const [receipt, setReceipt] = useState(null);

  const [declaration, setDeclaration] = useState({
    ingestion_method: 'API_PUSH',
    dataset_type: 'SUPPLIER_MASTER',
    source_system: 'MANUAL',
    declared_scope: 'ENTIRE_ORGANIZATION',
    scope_target_id: '',
    declared_intent: '',
    purpose_tags: [],
    contains_personal_data: false,
    gdpr_legal_basis: '',
    retention_policy: '3_YEARS',
    snapshot_date_utc: ''
  });

  const [payload, setPayload] = useState('');
  const [file, setFile] = useState(null);

  const canProceedStep1 = declaration.declared_intent.trim() && declaration.purpose_tags.length > 0;
  const canProceedStep2 = payload.trim() || file;

  const handleSeal = async () => {
    if (!canProceedStep2) {
      toast.error('Provide payload or upload file');
      return;
    }

    setIsSealing(true);

    try {
      const payloadData = file ? await file.text() : payload;

      const response = await base44.functions.invoke('ingestEvidence', {
        payload: payloadData,
        ingestion_method: declaration.ingestion_method,
        dataset_type: declaration.dataset_type,
        source_system: declaration.source_system,
        declared_scope: declaration.declared_scope,
        scope_target_id: declaration.scope_target_id || undefined,
        declared_intent: declaration.declared_intent,
        purpose_tags: declaration.purpose_tags,
        contains_personal_data: declaration.contains_personal_data,
        gdpr_legal_basis: declaration.gdpr_legal_basis || undefined,
        retention_policy: declaration.retention_policy,
        snapshot_date_utc: declaration.snapshot_date_utc || undefined,
        idempotency_key: `seal-${crypto.randomUUID()}`
      });

      if (response.data?.receipt) {
        setReceipt(response.data.receipt);
        setStep(3);
        toast.success('Evidence sealed successfully');
      } else {
        toast.error(response.data?.error || 'Sealing failed');
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSealing(false);
    }
  };

  return (
    <AlertDialog open={true} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <Card className="border-0 shadow-none">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Seal Evidence — Step {step}/3</CardTitle>
              <Button variant="ghost" size="sm" onClick={onClose}>✕</Button>
            </div>
            <div className="flex gap-2 mt-4">
              {[1, 2, 3].map(s => (
                <div
                  key={s}
                  className={`flex-1 h-1.5 rounded-full transition-all ${
                    s <= step ? 'bg-[#86b027]' : 'bg-slate-200'
                  }`}
                />
              ))}
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* STEP 1: Declaration */}
            {step === 1 && (
              <div className="space-y-4">
                <h3 className="font-medium text-slate-900">Declare Evidence</h3>

                <div className="space-y-3">
                  {/* Ingestion Method */}
                  <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1">Ingestion Method *</label>
                    <select
                      value={declaration.ingestion_method}
                      onChange={(e) => setDeclaration({ ...declaration, ingestion_method: e.target.value })}
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                    >
                      <option value="FILE_UPLOAD">File Upload</option>
                      <option value="ERP_EXPORT">ERP Export</option>
                      <option value="ERP_API">ERP API</option>
                      <option value="SUPPLIER_PORTAL">Supplier Portal</option>
                      <option value="API_PUSH">API Push</option>
                      <option value="MANUAL">Manual Entry</option>
                    </select>
                  </div>

                  {/* Dataset Type */}
                  <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1">Dataset Type *</label>
                    <select
                      value={declaration.dataset_type}
                      onChange={(e) => setDeclaration({ ...declaration, dataset_type: e.target.value })}
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                    >
                      <option value="SUPPLIER_MASTER">Supplier Master</option>
                      <option value="PRODUCT_MASTER">Product Master</option>
                      <option value="BOM">Bill of Materials</option>
                      <option value="TEST_REPORT">Test Report</option>
                      <option value="CERTIFICATE">Certificate</option>
                    </select>
                  </div>

                  {/* Source System */}
                  <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1">Source System *</label>
                    <input
                      type="text"
                      value={declaration.source_system}
                      onChange={(e) => setDeclaration({ ...declaration, source_system: e.target.value })}
                      placeholder="e.g., SAP, MANUAL"
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                    />
                  </div>

                  {/* Declared Scope */}
                  <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1">Declared Scope *</label>
                    <select
                      value={declaration.declared_scope}
                      onChange={(e) => setDeclaration({ ...declaration, declared_scope: e.target.value })}
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                    >
                      <option value="ENTIRE_ORGANIZATION">Entire Organization</option>
                      <option value="LEGAL_ENTITY">Legal Entity</option>
                      <option value="SITE">Site</option>
                      <option value="PRODUCT_FAMILY">Product Family</option>
                      <option value="UNKNOWN">Unknown</option>
                    </select>
                  </div>

                  {/* Scope Target ID (conditional) */}
                  {declaration.declared_scope === 'SITE' && (
                    <div>
                      <label className="text-xs font-medium text-slate-700 block mb-1">Site ID *</label>
                      <input
                        type="text"
                        value={declaration.scope_target_id}
                        onChange={(e) => setDeclaration({ ...declaration, scope_target_id: e.target.value })}
                        placeholder="Site identifier"
                        className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                  )}

                  {/* Declared Intent */}
                  <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1">Why This Evidence? *</label>
                    <textarea
                      value={declaration.declared_intent}
                      onChange={(e) => setDeclaration({ ...declaration, declared_intent: e.target.value })}
                      placeholder="Describe the business purpose and intent"
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm h-20"
                    />
                  </div>

                  {/* Purpose Tags */}
                  <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1">Purpose Tags * (min 1)</label>
                    <div className="flex gap-2 flex-wrap">
                      {['COMPLIANCE', 'AUDIT', 'RISK_ASSESSMENT', 'SUPPLIER_ONBOARDING'].map(tag => (
                        <Button
                          key={tag}
                          size="sm"
                          variant={declaration.purpose_tags.includes(tag) ? 'default' : 'outline'}
                          onClick={() => {
                            const tags = declaration.purpose_tags.includes(tag)
                              ? declaration.purpose_tags.filter(t => t !== tag)
                              : [...declaration.purpose_tags, tag];
                            setDeclaration({ ...declaration, purpose_tags: tags });
                          }}
                          className={`text-xs ${
                            declaration.purpose_tags.includes(tag) ? 'bg-[#86b027]' : ''
                          }`}
                        >
                          {tag}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Personal Data */}
                  <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1">Contains Personal Data?</label>
                    <select
                      value={declaration.contains_personal_data ? 'yes' : 'no'}
                      onChange={(e) => setDeclaration({ ...declaration, contains_personal_data: e.target.value === 'yes' })}
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                    >
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                    </select>
                  </div>

                  {/* GDPR Legal Basis (conditional) */}
                  {declaration.contains_personal_data && (
                    <div>
                      <label className="text-xs font-medium text-slate-700 block mb-1">GDPR Legal Basis *</label>
                      <select
                        value={declaration.gdpr_legal_basis}
                        onChange={(e) => setDeclaration({ ...declaration, gdpr_legal_basis: e.target.value })}
                        className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                      >
                        <option value="">Select...</option>
                        <option value="CONSENT">Consent (Article 6(1)(a))</option>
                        <option value="CONTRACT">Contract (Article 6(1)(b))</option>
                        <option value="LEGAL_OBLIGATION">Legal Obligation (Article 6(1)(c))</option>
                        <option value="VITAL_INTERESTS">Vital Interests (Article 6(1)(d))</option>
                        <option value="PUBLIC_TASK">Public Task (Article 6(1)(e))</option>
                        <option value="LEGITIMATE_INTERESTS">Legitimate Interests (Article 6(1)(f))</option>
                      </select>
                    </div>
                  )}

                  {/* Retention Policy */}
                  <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1">Retention Policy *</label>
                    <select
                      value={declaration.retention_policy}
                      onChange={(e) => setDeclaration({ ...declaration, retention_policy: e.target.value })}
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                    >
                      <option value="6_MONTHS">6 Months</option>
                      <option value="12_MONTHS">12 Months</option>
                      <option value="3_YEARS">3 Years</option>
                      <option value="7_YEARS">7 Years</option>
                    </select>
                  </div>

                  {/* Snapshot Date (conditional for ERP_API) */}
                  {declaration.ingestion_method === 'ERP_API' && (
                    <div>
                      <label className="text-xs font-medium text-slate-700 block mb-1">Snapshot Date (UTC) *</label>
                      <input
                        type="datetime-local"
                        value={declaration.snapshot_date_utc}
                        onChange={(e) => setDeclaration({ ...declaration, snapshot_date_utc: e.target.value })}
                        className="w-full rounded border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                  )}
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t">
                  <Button variant="outline" onClick={onClose}>Cancel</Button>
                  <Button
                    onClick={() => setStep(2)}
                    disabled={!canProceedStep1}
                    className="bg-[#86b027] hover:bg-[#86b027]/90"
                  >
                    Next: Provide Evidence
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 2: Payload */}
            {step === 2 && (
              <div className="space-y-4">
                <h3 className="font-medium text-slate-900">Provide Evidence</h3>

                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1">Upload File or Paste Payload</label>
                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-slate-400 transition">
                      <input
                        type="file"
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                        className="hidden"
                        id="file-upload"
                      />
                      <label htmlFor="file-upload" className="cursor-pointer">
                        {file ? (
                          <p className="text-sm text-green-600">✓ {file.name}</p>
                        ) : (
                          <p className="text-sm text-slate-500">Click to upload or drag file here</p>
                        )}
                      </label>
                    </div>
                  </div>

                  <div className="relative">
                    <p className="text-xs text-slate-500 mb-2">OR paste JSON/CSV payload:</p>
                    <textarea
                      value={payload}
                      onChange={(e) => setPayload(e.target.value)}
                      placeholder='{"supplier": "ACME Corp", "country": "DE"}'
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm h-40 font-mono"
                    />
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t">
                  <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                  <Button
                    onClick={() => setStep(3)}
                    disabled={!canProceedStep2}
                    className="bg-[#86b027] hover:bg-[#86b027]/90"
                  >
                    Review & Seal
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 3: Receipt */}
            {step === 3 && !receipt && (
              <div className="space-y-4">
                <h3 className="font-medium text-slate-900">Confirm & Seal Evidence</h3>
                <p className="text-sm text-slate-600">
                  Sealing is final and immutable. This will compute cryptographic hashes and create an audit trail.
                </p>

                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <p className="text-xs text-amber-900">
                    <strong>Note:</strong> You will not be able to modify this evidence after sealing.
                  </p>
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t">
                  <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
                  <Button
                    onClick={handleSeal}
                    disabled={isSealing}
                    className="bg-green-600 hover:bg-green-700 gap-2"
                  >
                    {isSealing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Sealing...
                      </>
                    ) : (
                      'Seal Evidence Now'
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* RECEIPT */}
            {receipt && (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <h3 className="font-medium text-green-900">Evidence Sealed Successfully</h3>
                </div>

                <div className="space-y-3 bg-slate-50 rounded-lg p-4">
                  <div>
                    <p className="text-xs text-slate-600 font-medium">Evidence ID</p>
                    <code className="text-xs font-mono text-slate-900 break-all">{receipt.evidence_id}</code>
                  </div>

                  <div>
                    <p className="text-xs text-slate-600 font-medium">Payload Hash (SHA-256)</p>
                    <code className="text-xs font-mono text-slate-900 break-all">{receipt.payload_hash_sha256}</code>
                  </div>

                  <div>
                    <p className="text-xs text-slate-600 font-medium">Metadata Hash (SHA-256)</p>
                    <code className="text-xs font-mono text-slate-900 break-all">{receipt.metadata_hash_sha256}</code>
                  </div>

                  <div>
                    <p className="text-xs text-slate-600 font-medium">Sealed At</p>
                    <p className="text-xs font-mono text-slate-900">{new Date(receipt.sealed_at_utc).toISOString()}</p>
                  </div>

                  <div>
                    <p className="text-xs text-slate-600 font-medium">Audit Events</p>
                    <p className="text-xs font-mono text-slate-900">{receipt.audit_event_count}</p>
                  </div>
                </div>

                <Button
                  onClick={onClose}
                  className="w-full bg-[#86b027] hover:bg-[#86b027]/90"
                >
                  Close & View Evidence
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </AlertDialogContent>
    </AlertDialog>
  );
}