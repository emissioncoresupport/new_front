import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertDialog, AlertDialogContent } from "@/components/ui/alert-dialog";
import { CheckCircle2, AlertTriangle, Loader2, Info, ExternalLink, MapPin, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { createPageUrl } from '@/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

/**
 * CONTRACT 1 SEALING WIZARD V3 — Smart conditional fields
 * Step 1: Declaration with intelligent conditional fields based on ingestion_method
 * Step 2: Provide evidence (payload)
 * Step 3: Review receipt
 */

export default function Contract1SealingWizardV3({ onClose, dataMode }) {
  const [step, setStep] = useState(1);
  const [isSealing, setIsSealing] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [isCreatingWorkItem, setIsCreatingWorkItem] = useState(false);

  const [declaration, setDeclaration] = useState({
    ingestion_method: 'FILE_UPLOAD',
    dataset_type: 'SUPPLIER_MASTER',
    declared_scope: 'ENTIRE_ORGANIZATION',
    declared_intent: '',
    purpose_tags: [],
    personal_data_present: false,
    gdpr_legal_basis: '',
    retention_policy: '3_YEARS',
    retention_custom_days: null,
    source_system: '',
    origin_system_name: null,
    snapshot_date_utc: '',
    entry_notes: '',
    supplier_portal_request_id: '',
    external_reference_id: ''
  });

  const [payload, setPayload] = useState('');
  const [file, setFile] = useState(null);

  // Determine which fields are required based on ingestion_method
  const getConditionalRequirements = () => {
    const reqs = {
      all: ['ingestion_method', 'dataset_type', 'declared_scope', 'declared_intent', 'purpose_tags']
    };

    if (declaration.personal_data_present) {
      reqs.gdpr = ['gdpr_legal_basis', 'retention_policy'];
    }

    if (declaration.ingestion_method === 'ERP_API') {
      reqs.erp_api = ['snapshot_date_utc', 'origin_system_name'];
    }

    if (declaration.ingestion_method === 'ERP_EXPORT') {
      reqs.erp_export = ['origin_system_name'];
    }

    if (declaration.ingestion_method === 'MANUAL_ENTRY') {
      reqs.manual = ['entry_notes'];
    }

    if (declaration.ingestion_method === 'SUPPLIER_PORTAL') {
      reqs.supplier = ['supplier_portal_request_id'];
    }

    if (declaration.ingestion_method === 'API_PUSH') {
      reqs.api_push = ['external_reference_id'];
    }

    return reqs;
  };

  const checkCanProceed = () => {
    const reqs = getConditionalRequirements();
    const allReqs = Object.values(reqs).flat();

    return allReqs.every(field => {
      const val = declaration[field];
      if (field === 'purpose_tags') return Array.isArray(val) && val.length > 0;
      if (field === 'entry_notes') return val && val.trim().length > 0 && val.length <= 280;
      return val && val.toString().trim().length > 0;
    });
  };

  // Source system validation per ingestion_method
  const getSourceSystemRules = () => {
    const rules = {
      FILE_UPLOAD: { label: 'User File Upload', fixed: 'USER_FILE_UPLOAD', editable: false },
      ERP_EXPORT: { label: 'Select ERP System', fixed: null, editable: true, options: ['SAP', 'ORACLE', 'MICROSOFT_DYNAMICS', 'NETSUITE', 'ODOO', 'OTHER'] },
      ERP_API: { label: 'Select ERP System', fixed: null, editable: true, options: ['SAP', 'ORACLE', 'MICROSOFT_DYNAMICS', 'NETSUITE', 'ODOO', 'OTHER'] },
      SUPPLIER_PORTAL: { label: 'Supplier Portal', fixed: 'SUPPLIER_PORTAL', editable: false },
      API_PUSH: { label: 'Client System', fixed: 'CLIENT_SYSTEM', editable: false },
      MANUAL_ENTRY: { label: 'Internal Manual', fixed: 'INTERNAL_MANUAL', editable: false }
    };
    return rules[declaration.ingestion_method] || { label: 'Source System', fixed: null, editable: true };
  };

  const sourceSystemRules = getSourceSystemRules();

  // Auto-set source_system if fixed
  if (sourceSystemRules.fixed && declaration.source_system !== sourceSystemRules.fixed) {
    setDeclaration({ ...declaration, source_system: sourceSystemRules.fixed });
  }

  const canProceedStep1 = checkCanProceed() && declaration.source_system;
  const canProceedStep2 = payload.trim() || file;

  const handleSeal = async () => {
    setIsSealing(true);

    try {
      const payloadData = file ? await file.text() : payload;

      // STEP 1: Ingest (creates INGESTED state)
      const ingestResponse = await base44.functions.invoke('ingestEvidenceV4_Deterministic', {
        payload: payloadData,
        ingestion_method: declaration.ingestion_method,
        dataset_type: declaration.dataset_type,
        declared_scope: declaration.declared_scope,
        declared_intent: declaration.declared_intent,
        purpose_tags: declaration.purpose_tags,
        personal_data_present: declaration.personal_data_present,
        gdpr_legal_basis: declaration.gdpr_legal_basis || null,
        retention_policy: declaration.retention_policy,
        retention_custom_days: declaration.retention_custom_days || null,
        snapshot_date_utc: declaration.snapshot_date_utc || null,
        origin_system_name: declaration.origin_system_name || null,
        source_system: declaration.source_system,
        entry_notes: declaration.entry_notes || null,
        supplier_portal_request_id: declaration.supplier_portal_request_id || null,
        external_reference_id: declaration.external_reference_id || null,
        provenance: dataMode === 'DEMO' ? 'TEST_FIXTURE' : 'USER_PROVIDED'
      });

      if (!ingestResponse.data?.success) {
        toast.error(ingestResponse.data?.error || 'Ingestion validation failed');
        return;
      }

      const evidenceId = ingestResponse.data.receipt.evidence_id;

      // STEP 2: Explicit seal (transitions INGESTED → SEALED)
      const sealResponse = await base44.functions.invoke('sealEvidenceV2_Explicit', {
        evidence_id: evidenceId
      });

      if (sealResponse.data?.success) {
        setReceipt({
          ...ingestResponse.data.receipt,
          sealed_at_utc: sealResponse.data.receipt.sealed_at_utc
        });
        setStep(3);
        toast.success('Evidence ingested and sealed');
      } else {
        toast.error(sealResponse.data?.error || 'Seal action failed');
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
            {/* STEP 1: Smart Declaration */}
            {step === 1 && (
              <div className="space-y-4">
                <h3 className="font-medium text-slate-900">Declare Evidence Provenance</h3>

                <div className="space-y-3">
                  {/* Ingestion Method */}
                  <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1">Ingestion Method *</label>
                    <select
                      value={declaration.ingestion_method}
                      onChange={(e) => setDeclaration({ ...declaration, ingestion_method: e.target.value })}
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm bg-white focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                    >
                      <option value="FILE_UPLOAD">File Upload (CSV/JSON/XML)</option>
                      <option value="ERP_EXPORT">ERP Export (batch export)</option>
                      <option value="ERP_API">ERP API (real-time query)</option>
                      <option value="SUPPLIER_PORTAL">Supplier Portal (submission)</option>
                      <option value="API_PUSH">API Push (programmatic)</option>
                      <option value="MANUAL_ENTRY">Manual Entry (human data entry)</option>
                    </select>
                  </div>

                  {/* Dataset Type */}
                  <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1">Dataset Type *</label>
                    <select
                      value={declaration.dataset_type}
                      onChange={(e) => setDeclaration({ ...declaration, dataset_type: e.target.value })}
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm bg-white focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
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
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm bg-white focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                    >
                      <option value="ENTIRE_ORGANIZATION">Entire Organization</option>
                      <option value="LEGAL_ENTITY">Specific Legal Entity</option>
                      <option value="SITE">Specific Site/Facility</option>
                      <option value="PRODUCT_FAMILY">Product Family</option>
                      <option value="UNKNOWN">Unknown / Not Specified</option>
                    </select>
                  </div>

                  {/* Declared Intent */}
                  <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1">Why This Evidence? *</label>
                    <textarea
                      value={declaration.declared_intent}
                      onChange={(e) => setDeclaration({ ...declaration, declared_intent: e.target.value })}
                      placeholder="Describe business purpose (e.g., supplier onboarding, emissions reporting, compliance audit)"
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm h-16 bg-white focus:ring-1 focus:ring-[#86b027] focus:border-[#86b027]"
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
                          className={`text-xs ${
                            declaration.purpose_tags.includes(tag) ? 'bg-[#86b027] border-[#86b027]' : ''
                          }`}
                        >
                          {tag}
                        </Button>
                      ))}
                    </div>
                  </div>

                  {/* Conditional: Snapshot Date (ERP_API) */}
                  {declaration.ingestion_method === 'ERP_API' && (
                    <div>
                      <label className="text-xs font-medium text-slate-700 block mb-1">
                        Snapshot Date (UTC) * — Point-in-time for ERP API query
                      </label>
                      <input
                        type="datetime-local"
                        value={declaration.snapshot_date_utc}
                        onChange={(e) => setDeclaration({ ...declaration, snapshot_date_utc: e.target.value })}
                        className="w-full rounded border border-slate-300 px-3 py-2 text-sm bg-white focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                      />
                    </div>
                  )}

                  {/* Source System (conditional enforcement) */}
                  <div>
                    <label className="text-xs font-medium text-slate-700 block mb-1">
                      Source System * — {sourceSystemRules.label}
                    </label>
                    {sourceSystemRules.editable ? (
                      <select
                        value={declaration.source_system}
                        onChange={(e) => setDeclaration({ ...declaration, source_system: e.target.value })}
                        className="w-full rounded border border-slate-300 px-3 py-2 text-sm bg-white focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                      >
                        <option value="">Select...</option>
                        {sourceSystemRules.options?.map(opt => (
                          <option key={opt} value={opt}>{opt}</option>
                        ))}
                      </select>
                    ) : (
                      <div className="px-3 py-2 rounded border border-slate-300 bg-slate-50 text-sm font-medium text-slate-900">
                        {sourceSystemRules.fixed}
                      </div>
                    )}
                  </div>

                  {/* Conditional: Origin System Friendly Name (ERP_API or ERP_EXPORT) */}
                  {(declaration.ingestion_method === 'ERP_API' || declaration.ingestion_method === 'ERP_EXPORT') && (
                    <div>
                      <label className="text-xs font-medium text-slate-700 block mb-1">
                        Friendly Name * — e.g., SAP S/4HANA, Oracle NetSuite
                      </label>
                      <input
                        type="text"
                        value={declaration.origin_system_name || ''}
                        onChange={(e) => setDeclaration({ ...declaration, origin_system_name: e.target.value })}
                        placeholder="Installation name or version"
                        className="w-full rounded border border-slate-300 px-3 py-2 text-sm bg-white focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                      />
                    </div>
                  )}

                  {/* Conditional: Entry Notes (MANUAL_ENTRY) */}
                  {declaration.ingestion_method === 'MANUAL_ENTRY' && (
                    <div>
                      <label className="text-xs font-medium text-slate-700 block mb-1">
                        Entry Notes * (max 280 chars) — Why manually entered?
                      </label>
                      <textarea
                        value={declaration.entry_notes}
                        onChange={(e) => setDeclaration({ ...declaration, entry_notes: e.target.value.slice(0, 280) })}
                        placeholder="e.g., Email submission from supplier, phone call notes"
                        className="w-full rounded border border-slate-300 px-3 py-2 text-sm h-12 bg-white focus:ring-1 focus:ring-[#86b027] focus:border-[#86b027]"
                      />
                      <p className="text-xs text-slate-500 mt-1">{declaration.entry_notes.length}/280</p>
                    </div>
                  )}

                  {/* Conditional: Supplier Portal Request ID */}
                  {declaration.ingestion_method === 'SUPPLIER_PORTAL' && (
                    <div>
                      <label className="text-xs font-medium text-slate-700 block mb-1">
                        Supplier Portal Request ID * — Submission reference
                      </label>
                      <input
                        type="text"
                        value={declaration.supplier_portal_request_id}
                        onChange={(e) => setDeclaration({ ...declaration, supplier_portal_request_id: e.target.value })}
                        placeholder="e.g., REQ-2026-001234"
                        className="w-full rounded border border-slate-300 px-3 py-2 text-sm bg-white focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                      />
                    </div>
                  )}

                  {/* Conditional: External Reference ID (API_PUSH) */}
                  {declaration.ingestion_method === 'API_PUSH' && (
                    <div>
                      <label className="text-xs font-medium text-slate-700 block mb-1">
                        External Reference ID * — Idempotency key (client-provided)
                      </label>
                      <input
                        type="text"
                        value={declaration.external_reference_id}
                        onChange={(e) => setDeclaration({ ...declaration, external_reference_id: e.target.value })}
                        placeholder="e.g., ext-supplier-12345-20260125"
                        className="w-full rounded border border-slate-300 px-3 py-2 text-sm bg-white focus:ring-1 focus:ring-slate-900 focus:border-slate-900"
                      />
                      <p className="text-xs text-slate-500 mt-1">Prevents duplicate submissions</p>
                    </div>
                  )}

                  {/* Personal Data */}
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                    <label className="text-xs font-medium text-slate-700 flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={declaration.personal_data_present}
                        onChange={(e) => setDeclaration({ ...declaration, personal_data_present: e.target.checked })}
                        className="w-4 h-4 cursor-pointer"
                      />
                      Contains Personal Data?
                    </label>
                  </div>

                  {/* Conditional: GDPR Fields */}
                  {declaration.personal_data_present && (
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
                          <option value="VITAL_INTERESTS">Vital Interests (Art. 6(1)(d))</option>
                          <option value="PUBLIC_TASK">Public Task (Art. 6(1)(e))</option>
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
                    disabled={!canProceedStep1}
                    className="bg-slate-900 hover:bg-slate-800 text-white"
                  >
                    Next: Upload Evidence
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 2: Payload */}
            {step === 2 && (
              <div className="space-y-4">
                <h3 className="font-medium text-slate-900">Provide Evidence Payload</h3>

                <div className="space-y-3">
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
                        <p className="text-sm text-slate-500">Click or drag file here</p>
                      )}
                    </label>
                  </div>

                  <div className="relative">
                    <p className="text-xs text-slate-500 mb-2 font-medium">OR paste raw payload:</p>
                    <textarea
                      value={payload}
                      onChange={(e) => setPayload(e.target.value)}
                      placeholder='{"supplier_id": "SUP-123", "country": "DE", "active": true}'
                      className="w-full rounded border border-slate-300 px-3 py-2 text-sm h-32 font-mono bg-white focus:ring-1 focus:ring-[#86b027] focus:border-[#86b027]"
                    />
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t">
                  <Button variant="outline" onClick={() => setStep(1)}>Back</Button>
                  <Button
                    onClick={() => setStep(3)}
                    disabled={!canProceedStep2}
                    className="bg-slate-900 hover:bg-slate-800 text-white"
                  >
                    Review & Seal
                  </Button>
                </div>
              </div>
            )}

            {/* STEP 3: Receipt or Confirm */}
            {step === 3 && !receipt && (
              <div className="space-y-4">
                <div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-900">
                    <p className="font-medium">Immutable Seal</p>
                    <p className="text-xs mt-1">After sealing, this record becomes immutable. Can only be superseded by new evidence.</p>
                  </div>
                </div>

                <div className="flex gap-3 justify-end pt-4 border-t">
                  <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
                  <Button
                    onClick={handleSeal}
                    disabled={isSealing}
                    className="bg-slate-900 hover:bg-slate-800 text-white gap-2"
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
                {/* Success Header */}
                <div className="flex items-center gap-2 mb-4">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <h3 className="font-medium text-green-900">Evidence Sealed Successfully</h3>
                </div>

                {/* Receipt Details */}
                <div className="space-y-2 bg-slate-50 rounded-lg p-4 border border-slate-200">
                  <div>
                    <p className="text-xs text-slate-600 font-medium">Evidence ID</p>
                    <code className="text-xs font-mono text-slate-900 break-all">{receipt.evidence_id}</code>
                  </div>

                  <div>
                    <p className="text-xs text-slate-600 font-medium">Record ID</p>
                    <code className="text-xs font-mono text-slate-900 break-all">{receipt.record_id}</code>
                  </div>

                  <div>
                    <p className="text-xs text-slate-600 font-medium">Ledger State</p>
                    <Badge className="text-xs bg-slate-100 text-slate-800">{receipt.ledger_state}</Badge>
                  </div>

                  <div>
                    <p className="text-xs text-slate-600 font-medium">Payload Hash (SHA-256)</p>
                    <code className="text-xs font-mono text-slate-700 break-all">{receipt.payload_hash_sha256}</code>
                  </div>

                  <div>
                    <p className="text-xs text-slate-600 font-medium">Metadata Hash (SHA-256)</p>
                    <code className="text-xs font-mono text-slate-700 break-all">{receipt.metadata_hash_sha256}</code>
                  </div>

                  <div>
                    <p className="text-xs text-slate-600 font-medium">Audit Events Created</p>
                    <p className="text-xs text-slate-900 font-mono">{receipt.audit_event_count}</p>
                  </div>
                </div>

                {/* Next Actions */}
                <div className="space-y-2 pt-2">
                  <p className="text-xs font-semibold text-slate-700 uppercase tracking-wide">Next Actions</p>
                  <div className="grid grid-cols-1 gap-2">
                    {/* View Evidence Record */}
                    <Button
                      onClick={() => {
                        onClose();
                        setTimeout(() => {
                          window.location.href = `${createPageUrl('EvidenceRecordDetail')}?evidence_id=${receipt.evidence_id}`;
                        }, 300);
                      }}
                      variant="outline"
                      className="w-full gap-2 justify-start text-left"
                    >
                      <ExternalLink className="w-4 h-4 flex-shrink-0" />
                      <span>View Evidence Record</span>
                    </Button>

                    {/* View Bound Supplier */}
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            onClick={() => {
                              if (receipt.linked_entity_id) {
                                onClose();
                                setTimeout(() => {
                                  window.location.href = `${createPageUrl('SupplyLensNetwork')}?tab=suppliers&entity=${receipt.linked_entity_id}`;
                                }, 300);
                              }
                            }}
                            disabled={!receipt.linked_entity_id}
                            variant="outline"
                            className="w-full gap-2 justify-start text-left"
                          >
                            <MapPin className="w-4 h-4 flex-shrink-0" />
                            <span>View Bound Entity</span>
                          </Button>
                        </TooltipTrigger>
                        {!receipt.linked_entity_id && (
                          <TooltipContent>
                            <p className="text-xs">No bound entity. Evidence is quarantined or awaiting binding.</p>
                          </TooltipContent>
                        )}
                      </Tooltip>
                    </TooltipProvider>

                    {/* Create Mapping Work Item */}
                    <Button
                      onClick={async () => {
                        setIsCreatingWorkItem(true);
                        try {
                          const { demoStore } = await import('./DemoDataStore');

                          // Infer priority from dataset type impact
                          const priorityMap = {
                            'SUPPLIER_MASTER': 'HIGH',
                            'PRODUCT_MASTER': 'HIGH',
                            'BOM': 'MEDIUM',
                            'TEST_REPORT': 'MEDIUM',
                            'CERTIFICATE': 'LOW',
                            'ENERGY_DATA': 'MEDIUM',
                            'COMPLIANCE_DOC': 'HIGH'
                          };

                          const priority = priorityMap[declaration.dataset_type] || 'MEDIUM';

                          // Infer impacted module from dataset type
                          const moduleMap = {
                            'SUPPLIER_MASTER': 'CBAM',
                            'PRODUCT_MASTER': 'CBAM',
                            'BOM': 'CBAM',
                            'TEST_REPORT': 'PFAS',
                            'CERTIFICATE': 'EUDAMED',
                            'ENERGY_DATA': 'CCF',
                            'COMPLIANCE_DOC': 'CSRD'
                          };

                          const impactedModule = moduleMap[declaration.dataset_type] || 'CBAM';

                          const workItemPayload = {
                            type: 'MAPPING',
                            status: 'OPEN',
                            priority,
                            impacted_module: impactedModule,
                            title: `AI Mapping: ${declaration.dataset_type}`,
                            description: `Auto-created mapping work item for sealed evidence ${receipt.evidence_id}`,
                            linked_evidence_record_ids: [receipt.record_id],
                            linked_evidence_display_ids: [receipt.evidence_id],
                            linked_entity_candidates: receipt.linked_entity_id ? [receipt.linked_entity_id] : [],
                            required_action_text: 'SYSTEM_AUTO_CREATED',
                            owner: 'system@supplylens',
                            created_at_utc: new Date().toISOString()
                          };

                          const newWorkItem = demoStore.createWorkItem(workItemPayload);

                          demoStore.createAuditEvent({
                            event_type: 'WORK_ITEM_CREATED',
                            object_type: 'work_item',
                            object_id: newWorkItem.work_item_id,
                            metadata: {
                              triggered_from: 'seal_success_modal',
                              evidence_id: receipt.evidence_id,
                              work_item_type: 'MAPPING'
                            }
                          });

                          toast.success(`Work item created: ${newWorkItem.work_item_id}`);
                          onClose();

                          setTimeout(() => {
                            window.location.href = `${createPageUrl('SupplyLens')}?highlight=${newWorkItem.work_item_id}`;
                          }, 500);
                        } catch (error) {
                          console.error('Create work item error:', error);
                          toast.error('Failed to create work item');
                        } finally {
                          setIsCreatingWorkItem(false);
                        }
                      }}
                      disabled={isCreatingWorkItem}
                      variant="outline"
                      className="w-full gap-2 justify-start text-left"
                    >
                      <Plus className="w-4 h-4 flex-shrink-0" />
                      <span>{isCreatingWorkItem ? 'Creating...' : 'Create Mapping Work Item'}</span>
                    </Button>
                  </div>
                </div>

                {/* Close Button */}
                <Button onClick={onClose} className="w-full bg-slate-900 hover:bg-slate-800 text-white">
                  Close
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </AlertDialogContent>
    </AlertDialog>
  );
}