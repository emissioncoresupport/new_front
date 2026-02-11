import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogContent } from "@/components/ui/alert-dialog";
import { CheckCircle2, AlertTriangle, Loader2, Info } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';

/**
 * CONTRACT 1 SEALING WIZARD — Regulator-Grade
 * Step 1: Declare provenance (capture_channel + upstream_system distinction)
 * Step 2: Conditional payload by capture_channel
 * Step 3: Review & seal with hashes
 */

export default function Contract1SealingWizardRegulatorGrade({ onClose, dataMode }) {
  const [step, setStep] = useState(1);
  const [isSealing, setIsSealing] = useState(false);
  const [receipt, setReceipt] = useState(null);

  const [declaration, setDeclaration] = useState({
    capture_channel: 'FILE_UPLOAD',
    upstream_system: 'OTHER',
    upstream_system_friendly_name: '',
    dataset_type: 'SUPPLIER_MASTER',
    declared_scope: 'ENTIRE_ORGANIZATION',
    scope_target_id: '',
    primary_intent: '',
    purpose_tags: [],
    contains_personal_data: false,
    gdpr_legal_basis: '',
    retention_policy: '3_YEARS',
    retention_custom_days: null,
    snapshot_date_utc: '',
    export_period_start: '',
    export_period_end: '',
    supplier_portal_request_id: '',
    external_reference_id: '',
    entry_notes: ''
  });

  const [payload, setPayload] = useState('');
  const [file, setFile] = useState(null);

  // Validation rules per capture_channel
  const getChannelRules = () => {
    const rules = {
      FILE_UPLOAD: {
        label: 'File Upload',
        upstreamEditable: true,
        requiresFile: true,
        requiresSnapshot: false,
        requiresNotes: false,
        requiresPortalId: false,
        requiresExtRef: false
      },
      ERP_EXPORT: {
        label: 'ERP Export (Batch)',
        upstreamEditable: true,
        requiresFile: false,
        requiresSnapshot: true,
        requiresNotes: false,
        requiresPortalId: false,
        requiresExtRef: false
      },
      ERP_API: {
        label: 'ERP API (Real-time)',
        upstreamEditable: true,
        requiresFile: false,
        requiresSnapshot: true,
        requiresNotes: false,
        requiresPortalId: false,
        requiresExtRef: false,
        customStep2: 'erp_query'
      },
      SUPPLIER_PORTAL: {
        label: 'Supplier Portal',
        upstreamEditable: false,
        upstreamFixed: 'SUPPLIER_PORTAL',
        requiresFile: false,
        requiresSnapshot: false,
        requiresNotes: false,
        requiresPortalId: true,
        requiresExtRef: false,
        customStep2: 'portal_select'
      },
      API_PUSH: {
        label: 'API Push (Programmatic)',
        upstreamEditable: false,
        upstreamFixed: 'OTHER',
        requiresFile: false,
        requiresSnapshot: false,
        requiresNotes: false,
        requiresPortalId: false,
        requiresExtRef: true,
        customStep2: 'json_paste'
      },
      MANUAL: {
        label: 'Manual Entry',
        upstreamEditable: false,
        upstreamFixed: 'OTHER',
        requiresFile: false,
        requiresSnapshot: false,
        requiresNotes: true,
        requiresPortalId: false,
        requiresExtRef: false,
        customStep2: 'structured_form'
      }
    };
    return rules[declaration.capture_channel] || {};
  };

  const channelRules = getChannelRules();

  // Auto-fix upstream_system if fixed
  if (channelRules.upstreamFixed && declaration.upstream_system !== channelRules.upstreamFixed) {
    setDeclaration(d => ({ ...d, upstream_system: channelRules.upstreamFixed }));
  }

  const validateStep1 = () => {
    const reqs = [
      'capture_channel',
      'upstream_system',
      'dataset_type',
      'declared_scope',
      'primary_intent',
      'purpose_tags',
      'retention_policy'
    ];

    for (const field of reqs) {
      const val = declaration[field];
      if (field === 'purpose_tags') {
        if (!Array.isArray(val) || val.length === 0) return false;
      } else if (!val || (typeof val === 'string' && !val.trim())) {
        return false;
      }
    }

    if (channelRules.requiresSnapshot && !declaration.snapshot_date_utc) return false;
    if (channelRules.requiresNotes && (!declaration.entry_notes || declaration.entry_notes.length === 0)) return false;
    if (channelRules.requiresPortalId && !declaration.supplier_portal_request_id) return false;
    if (channelRules.requiresExtRef && !declaration.external_reference_id) return false;
    if (declaration.contains_personal_data && !declaration.gdpr_legal_basis) return false;

    return true;
  };

  const validateStep2 = () => {
    if (channelRules.requiresFile && !file) return false;
    if (!channelRules.requiresFile && !file && !payload.trim()) return false;
    return true;
  };

  const handleSeal = async () => {
    setIsSealing(true);
    try {
      const payloadData = file ? await file.text() : payload;

      const ingestPayload = {
        capture_channel: declaration.capture_channel,
        upstream_system: declaration.upstream_system,
        upstream_system_friendly_name: declaration.upstream_system_friendly_name || null,
        dataset_type: declaration.dataset_type,
        declared_scope: declaration.declared_scope,
        scope_target_id: declaration.scope_target_id || null,
        primary_intent: declaration.primary_intent,
        purpose_tags: declaration.purpose_tags,
        contains_personal_data: declaration.contains_personal_data,
        gdpr_legal_basis: declaration.gdpr_legal_basis || null,
        retention_policy: declaration.retention_policy,
        retention_custom_days: declaration.retention_custom_days || null,
        snapshot_date_utc: declaration.snapshot_date_utc || null,
        export_period_start: declaration.export_period_start || null,
        export_period_end: declaration.export_period_end || null,
        supplier_portal_request_id: declaration.supplier_portal_request_id || null,
        external_reference_id: declaration.external_reference_id || null,
        entry_notes: declaration.entry_notes || null,
        payload: payloadData,
        provenance: dataMode === 'DEMO' ? 'TEST_FIXTURE' : 'USER_PROVIDED'
      };

      const ingestRes = await base44.functions.invoke('ingestEvidenceV5_RegulatorGrade', ingestPayload);

      if (!ingestRes.data?.ok) {
        toast.error(ingestRes.data?.message || 'Ingestion failed');
        return;
      }

      const evidenceId = ingestRes.data.evidence_id;

      const sealRes = await base44.functions.invoke('sealEvidenceV2_Explicit', {
        evidence_id: evidenceId
      });

      if (sealRes.data?.ok) {
        setReceipt({
          evidence_id: evidenceId,
          request_id: sealRes.data.request_id,
          ledger_state: 'SEALED',
          payload_hash_sha256: ingestRes.data.hash_sha256,
          metadata_hash_sha256: ingestRes.data.metadata_hash,
          sealed_at_utc: sealRes.data.sealed_at_utc,
          capture_channel: declaration.capture_channel
        });
        setStep(3);
        toast.success('Evidence sealed successfully');
      } else {
        toast.error(sealRes.data?.message || 'Seal failed');
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setIsSealing(false);
    }
  };

  return (
    <AlertDialog open={true} onOpenChange={onClose}>
      <AlertDialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-white/95 backdrop-blur-xl border border-white/50">
        <Card className="border-0 shadow-none bg-transparent">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-slate-900">Seal Evidence — Step {step}/3</CardTitle>
              <Button variant="ghost" size="sm" onClick={onClose} className="text-slate-600">✕</Button>
            </div>
            <div className="flex gap-2 mt-4">
              {[1, 2, 3].map(s => (
                <div key={s} className={`flex-1 h-1.5 rounded-full transition-all ${s <= step ? 'bg-[#86b027]' : 'bg-slate-200'}`} />
              ))}
            </div>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* STEP 1: Provenance Declaration */}
            {step === 1 && (
              <div className="space-y-4">
                <h3 className="font-medium text-slate-900">Declare Evidence Provenance</h3>

                <div className="space-y-3">
                  {/* Capture Channel (HOW) */}
                  <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1">Capture Channel (HOW received) *</label>
                    <select
                      value={declaration.capture_channel}
                      onChange={(e) => setDeclaration({ ...declaration, capture_channel: e.target.value })}
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm bg-white focus:ring-1 focus:ring-[#86b027]"
                    >
                      <option value="FILE_UPLOAD">File Upload (CSV/JSON/XML)</option>
                      <option value="ERP_EXPORT">ERP Export (batch export)</option>
                      <option value="ERP_API">ERP API (real-time query)</option>
                      <option value="SUPPLIER_PORTAL">Supplier Portal (submission)</option>
                      <option value="API_PUSH">API Push (programmatic)</option>
                      <option value="MANUAL">Manual Entry (human data entry)</option>
                    </select>
                  </div>

                  {/* Upstream System (WHERE/WHAT) */}
                  <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1">Upstream System (origin) *</label>
                    {channelRules.upstreamEditable ? (
                      <select
                        value={declaration.upstream_system}
                        onChange={(e) => setDeclaration({ ...declaration, upstream_system: e.target.value })}
                        className="w-full rounded border border-slate-300 px-3 py-2 text-sm bg-white focus:ring-1 focus:ring-[#86b027]"
                      >
                        <option value="SAP">SAP</option>
                        <option value="ORACLE">Oracle</option>
                        <option value="MICROSOFT_DYNAMICS">Microsoft Dynamics</option>
                        <option value="NETSUITE">NetSuite</option>
                        <option value="ODOO">Odoo</option>
                        <option value="INFOR">Infor</option>
                        <option value="EPICOR">Epicor</option>
                        <option value="IFS">IFS</option>
                        <option value="SAGE">Sage</option>
                        <option value="WORKDAY">Workday</option>
                        <option value="OTHER">Other</option>
                      </select>
                    ) : (
                      <div className="px-3 py-2 rounded border border-slate-300 bg-slate-50 text-sm font-medium text-slate-900">
                        {channelRules.upstreamFixed}
                      </div>
                    )}
                  </div>

                  {/* Friendly Name */}
                  {(declaration.capture_channel === 'ERP_EXPORT' || declaration.capture_channel === 'ERP_API') && (
                    <div>
                      <label className="text-xs font-medium text-slate-700 block mb-1">System Friendly Name (optional)</label>
                      <input
                        type="text"
                        value={declaration.upstream_system_friendly_name}
                        onChange={(e) => setDeclaration({ ...declaration, upstream_system_friendly_name: e.target.value })}
                        placeholder="e.g., SAP S/4HANA 2025, Oracle NetSuite"
                        className="w-full rounded border border-slate-300 px-3 py-2 text-sm bg-white focus:ring-1 focus:ring-[#86b027]"
                      />
                    </div>
                  )}

                  {/* Dataset Type */}
                  <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1">Dataset Type *</label>
                    <select
                      value={declaration.dataset_type}
                      onChange={(e) => setDeclaration({ ...declaration, dataset_type: e.target.value })}
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm bg-white focus:ring-1 focus:ring-[#86b027]"
                    >
                      <option value="SUPPLIER_MASTER">Supplier Master Data</option>
                      <option value="PRODUCT_MASTER">Product Master Data</option>
                      <option value="BOM">Bill of Materials</option>
                      <option value="TEST_REPORT">Test Report</option>
                      <option value="CERTIFICATE">Certificate</option>
                      <option value="ENERGY_DATA">Energy/Carbon Data</option>
                      <option value="COMPLIANCE_DOC">Compliance Document</option>
                    </select>
                  </div>

                  {/* Declared Scope */}
                  <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1">Declared Scope *</label>
                    <select
                      value={declaration.declared_scope}
                      onChange={(e) => setDeclaration({ ...declaration, declared_scope: e.target.value })}
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm bg-white focus:ring-1 focus:ring-[#86b027]"
                    >
                      <option value="ENTIRE_ORGANIZATION">Entire Organization</option>
                      <option value="LEGAL_ENTITY">Specific Legal Entity</option>
                      <option value="SITE">Specific Site/Facility</option>
                      <option value="PRODUCT_FAMILY">Product Family</option>
                      <option value="UNKNOWN">Unknown / Not Specified</option>
                    </select>
                  </div>

                  {/* Primary Intent */}
                  <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1">Why This Evidence? *</label>
                    <textarea
                      value={declaration.primary_intent}
                      onChange={(e) => setDeclaration({ ...declaration, primary_intent: e.target.value })}
                      placeholder="Describe business purpose (e.g., supplier onboarding, emissions reporting)"
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm h-16 bg-white focus:ring-1 focus:ring-[#86b027]"
                    />
                  </div>

                  {/* Purpose Tags */}
                  <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1">Purpose Tags * (min 1)</label>
                    <div className="flex gap-2 flex-wrap">
                      {['COMPLIANCE', 'AUDIT', 'RISK_ASSESSMENT', 'SUPPLIER_ONBOARDING', 'EMISSIONS_REPORTING'].map(tag => (
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
                          className={`text-xs ${declaration.purpose_tags.includes(tag) ? 'bg-[#86b027]' : ''}`}
                        >
                          {tag}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Conditional: Snapshot Date */}
                  {channelRules.requiresSnapshot && (
                    <div>
                      <label className="text-xs font-medium text-slate-700 block mb-1">Snapshot Date (UTC) *</label>
                      <input
                        type="datetime-local"
                        value={declaration.snapshot_date_utc}
                        onChange={(e) => setDeclaration({ ...declaration, snapshot_date_utc: e.target.value })}
                        className="w-full rounded border border-slate-300 px-3 py-2 text-sm bg-white focus:ring-1 focus:ring-[#86b027]"
                      />
                    </div>
                  )}

                  {/* Conditional: Entry Notes (MANUAL) */}
                  {channelRules.requiresNotes && (
                    <div>
                      <label className="text-xs font-medium text-slate-700 block mb-1">Entry Notes * (max 280 chars)</label>
                      <textarea
                        value={declaration.entry_notes}
                        onChange={(e) => setDeclaration({ ...declaration, entry_notes: e.target.value.slice(0, 280) })}
                        placeholder="e.g., Email submission from supplier"
                        className="w-full rounded border border-slate-300 px-3 py-2 text-sm h-12 bg-white focus:ring-1 focus:ring-[#86b027]"
                      />
                      <p className="text-xs text-slate-500 mt-1">{declaration.entry_notes.length}/280</p>
                    </div>
                  )}

                  {/* Conditional: Portal Request ID */}
                  {channelRules.requiresPortalId && (
                    <div>
                      <label className="text-xs font-medium text-slate-700 block mb-1">Portal Request ID *</label>
                      <input
                        type="text"
                        value={declaration.supplier_portal_request_id}
                        onChange={(e) => setDeclaration({ ...declaration, supplier_portal_request_id: e.target.value })}
                        placeholder="e.g., REQ-2026-001234"
                        className="w-full rounded border border-slate-300 px-3 py-2 text-sm bg-white focus:ring-1 focus:ring-[#86b027]"
                      />
                    </div>
                  )}

                  {/* Conditional: External Reference ID (API_PUSH) */}
                  {channelRules.requiresExtRef && (
                    <div>
                      <label className="text-xs font-medium text-slate-700 block mb-1">External Reference ID * (idempotency key)</label>
                      <input
                        type="text"
                        value={declaration.external_reference_id}
                        onChange={(e) => setDeclaration({ ...declaration, external_reference_id: e.target.value })}
                        placeholder="e.g., ext-supplier-12345-20260125"
                        className="w-full rounded border border-slate-300 px-3 py-2 text-sm bg-white focus:ring-1 focus:ring-[#86b027]"
                      />
                      <p className="text-xs text-slate-500 mt-1">Prevents duplicate submissions</p>
                    </div>
                  )}

                  {/* GDPR Section */}
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                    <label className="text-xs font-medium text-slate-700 flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={declaration.contains_personal_data}
                        onChange={(e) => setDeclaration({ ...declaration, contains_personal_data: e.target.checked })}
                        className="w-4 h-4 cursor-pointer"
                      />
                      Contains Personal Data?
                    </label>
                  </div>

                  {declaration.contains_personal_data && (
                    <div className="space-y-3 bg-amber-50 rounded-lg p-3 border border-amber-200">
                      <div>
                        <label className="text-xs font-medium text-amber-900 block mb-1">GDPR Legal Basis *</label>
                        <select
                          value={declaration.gdpr_legal_basis}
                          onChange={(e) => setDeclaration({ ...declaration, gdpr_legal_basis: e.target.value })}
                          className="w-full rounded border border-amber-300 px-3 py-2 text-sm bg-white focus:ring-1 focus:ring-amber-500"
                        >
                          <option value="">Select...</option>
                          <option value="CONSENT">Consent (Art. 6(1)(a))</option>
                          <option value="CONTRACT">Contract (Art. 6(1)(b))</option>
                          <option value="LEGAL_OBLIGATION">Legal Obligation (Art. 6(1)(c))</option>
                          <option value="LEGITIMATE_INTERESTS">Legitimate Interests (Art. 6(1)(f))</option>
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-medium text-amber-900 block mb-1">Retention Policy *</label>
                        <select
                          value={declaration.retention_policy}
                          onChange={(e) => setDeclaration({ ...declaration, retention_policy: e.target.value })}
                          className="w-full rounded border border-amber-300 px-3 py-2 text-sm bg-white focus:ring-1 focus:ring-amber-500"
                        >
                          <option value="6_MONTHS">6 Months</option>
                          <option value="12_MONTHS">12 Months</option>
                          <option value="3_YEARS">3 Years</option>
                          <option value="7_YEARS">7 Years</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t">
                  <Button variant="outline" onClick={onClose}>Cancel</Button>
                  <Button
                    onClick={() => setStep(2)}
                    disabled={!validateStep1()}
                    className="bg-[#86b027] hover:bg-[#86b027]/90"
                  >
                    Next: {channelRules.customStep2 ? 'Provide Evidence' : 'Upload Payload'}
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 2: Conditional Payload */}
            {step === 2 && (
              <div className="space-y-4">
                <h3 className="font-medium text-slate-900">Provide Evidence Payload</h3>

                <div className="space-y-3">
                  {/* File Upload (default) */}
                  {channelRules.requiresFile && (
                    <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center hover:border-slate-400 transition bg-slate-50/50">
                      <input
                        type="file"
                        onChange={(e) => setFile(e.target.files?.[0] || null)}
                        className="hidden"
                        id="file-upload"
                      />
                      <label htmlFor="file-upload" className="cursor-pointer">
                        {file ? (
                          <p className="text-sm font-medium text-green-600 flex items-center justify-center gap-1">
                            <CheckCircle2 className="w-4 h-4" /> {file.name}
                          </p>
                        ) : (
                          <p className="text-sm text-slate-500">Click or drag file (CSV/JSON/XML)</p>
                        )}
                      </label>
                    </div>
                  )}

                  {/* JSON Paste (primary for API_PUSH) */}
                  {declaration.capture_channel === 'API_PUSH' ? (
                    <div>
                      <label className="text-xs font-medium text-slate-700 block mb-2">Raw Payload (JSON/XML) *</label>
                      <textarea
                        value={payload}
                        onChange={(e) => setPayload(e.target.value)}
                        placeholder='{"supplier_id": "SUP-123", "country": "DE"}'
                        className="w-full rounded border border-slate-300 px-3 py-2 text-sm h-32 font-mono bg-white focus:ring-1 focus:ring-[#86b027]"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="text-xs font-medium text-slate-700 block mb-2">OR paste raw payload (optional):</label>
                      <textarea
                        value={payload}
                        onChange={(e) => setPayload(e.target.value)}
                        placeholder='{"supplier_id": "SUP-123"}'
                        className="w-full rounded border border-slate-300 px-3 py-2 text-sm h-24 font-mono bg-white focus:ring-1 focus:ring-[#86b027]"
                      />
                    </div>
                  )}
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t">
                  <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                  <Button
                    onClick={() => setStep(3)}
                    disabled={!validateStep2()}
                    className="bg-[#86b027] hover:bg-[#86b027]/90"
                  >
                    Review & Seal
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 3: Seal Confirmation or Receipt */}
            {step === 3 && !receipt && (
              <div className="space-y-4">
                <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <p className="font-medium">Immutable Seal</p>
                    <p className="text-xs mt-1">After sealing, this record becomes immutable. Can only be superseded.</p>
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t">
                  <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
                  <Button onClick={handleSeal} disabled={isSealing} className="bg-green-600 hover:bg-green-700 gap-2">
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

                <div className="space-y-2 bg-slate-50 rounded-lg p-4 border border-slate-200 text-xs">
                  <div>
                    <p className="text-slate-600 font-medium">Evidence ID</p>
                    <code className="font-mono text-slate-900 break-all">{receipt.evidence_id}</code>
                  </div>
                  <div>
                    <p className="text-slate-600 font-medium">Capture Channel</p>
                    <Badge className="text-xs bg-blue-100 text-blue-800">{receipt.capture_channel}</Badge>
                  </div>
                  <div>
                    <p className="text-slate-600 font-medium">Payload Hash</p>
                    <code className="font-mono text-slate-700 break-all">{receipt.payload_hash_sha256}</code>
                  </div>
                  <div>
                    <p className="text-slate-600 font-medium">Sealed At (UTC)</p>
                    <p className="font-mono text-slate-900">{new Date(receipt.sealed_at_utc).toISOString()}</p>
                  </div>
                </div>

                <Button onClick={onClose} className="w-full bg-[#86b027] hover:bg-[#86b027]/90">
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