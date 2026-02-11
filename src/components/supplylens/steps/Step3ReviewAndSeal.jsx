import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Info, FileText, AlertTriangle, Shield, Copy, CheckCircle, Lock, Radio, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { safeReplace, safeSubstring } from '../utils/stringHelpers';

// Helper: Check if evidence is eligible for calculations
export function isEligibleForCalculations(evidence) {
  return evidence.review_status === 'APPROVED' && evidence.reconciliation_status === 'BOUND';
}

// Helper: Check if BOM has any PENDING_MATCH components
function hasPendingMatchComponents(formData) {
  if (formData.evidence_type !== 'BOM' || !formData.payload_data_json?.components) {
    return false;
  }
  return formData.payload_data_json.components.some(c => 
    c.match_status === 'PENDING_MATCH' || (!c.component_sku_id && c.component_sku_code)
  );
}

export default function Step3ReviewAndSeal({ 
  formData, 
  draftId, 
  correlationId, 
  uploadedFiles,
  adapterMode = 'real'  // DEFAULT to 'real' if undefined
}) {
  const handleCopyId = (id, label) => {
    navigator.clipboard.writeText(id);
    toast.success(`${label} copied`);
  };

  const getBoundEntityLabel = () => {
    if (formData.binding_mode === 'DEFER_BINDING') {
      return 'UNBOUND';
    }
    if (formData.binding_mode === 'BIND_EXISTING') {
      // Use target_label from Step 1 snapshot (deterministic)
      return formData.target_label || formData.bound_entity_id || 'Not selected';
    }
    if (formData.binding_mode === 'CREATE_NEW') {
      if (formData.declared_scope === 'SUPPLIER') {
        return formData.stub_supplier_name || 'Not provided';
      }
      if (formData.declared_scope === 'SKU') {
        return formData.stub_sku_code || 'Not provided';
      }
    }
    return 'Unknown';
  };

  const getMethodLabel = (method) => {
    const labels = {
      'MANUAL_ENTRY': 'Manual Entry',
      'FILE_UPLOAD': 'File Upload',
      'ERP_EXPORT_FILE': 'ERP Export File',
      'API_PUSH_DIGEST': 'API Push (Digest Only)'
    };
    return labels[method] || method;
  };

  const getEvidenceTypeLabel = (type) => {
    const labels = {
      'SUPPLIER_MASTER': 'Supplier Master Data',
      'PRODUCT_MASTER': 'Product Master Data',
      'BOM': 'Bill of Materials',
      'CERTIFICATE': 'Certificate',
      'TEST_REPORT': 'Test Report'
    };
    return labels[type] || type;
  };

  const isUnbound = formData.binding_mode === 'DEFER_BINDING';
  const isManualEntry = formData.ingestion_method === 'MANUAL_ENTRY';
  const hasPendingMatch = hasPendingMatchComponents(formData);

  return (
    <TooltipProvider>
      <div className="space-y-3">
        {/* Header: Draft ID + Correlation ID */}
        <div className="p-4 bg-gradient-to-br from-slate-50/80 to-white/50 backdrop-blur-xl rounded-lg border border-slate-200 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label className="text-slate-900 font-medium text-sm">Draft ID</Label>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="w-3.5 h-3.5 text-slate-400" />
                </TooltipTrigger>
                <TooltipContent>Unique identifier for this draft. Used for tracking and audit trails.</TooltipContent>
              </Tooltip>
            </div>
            <button
              onClick={() => handleCopyId(draftId, 'Draft ID')}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/80 hover:bg-white border border-slate-200 rounded-lg transition-colors"
            >
              <span className="text-xs font-mono text-slate-700">{safeSubstring(draftId, 0, 16)}...</span>
              <Copy className="w-3 h-3 text-slate-400" />
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Label className="text-slate-900 font-medium text-sm">Correlation ID</Label>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="w-3.5 h-3.5 text-slate-400" />
                </TooltipTrigger>
                <TooltipContent>Unique trace ID for this operation. Critical for debugging and audits.</TooltipContent>
              </Tooltip>
            </div>
            <button
              onClick={() => handleCopyId(correlationId, 'Correlation ID')}
              className="flex items-center gap-2 px-3 py-1.5 bg-white/80 hover:bg-white border border-slate-200 rounded-lg transition-colors"
            >
              <span className="text-xs font-mono text-slate-700">{safeSubstring(correlationId, 0, 16)}...</span>
              <Copy className="w-3 h-3 text-slate-400" />
            </button>
          </div>

          {/* Mode Badge */}
             <div className="flex items-center justify-between pt-2 border-t border-slate-200">
               <Label className="text-slate-900 font-medium text-sm">Adapter Mode</Label>
               <Badge className={(adapterMode || 'real') === 'mock' ? 'bg-amber-100 text-amber-900' : 'bg-[#86b027]/10 text-[#86b027]'}>
                 {(adapterMode || 'real') === 'mock' ? 'MOCK' : 'REAL'}
               </Badge>
             </div>
        </div>

        {/* Core Metadata */}
        <div className="p-4 bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-xl rounded-lg border border-slate-200 space-y-2">
          <h3 className="text-xs font-semibold text-slate-900 flex items-center gap-2 uppercase tracking-wide">
            <FileText className="w-3 h-3" />
            Metadata
          </h3>
          
          <div className="space-y-3">
            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Label className="text-slate-700 text-sm">Ingestion Method</Label>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-3 h-3 text-slate-400" />
                  </TooltipTrigger>
                  <TooltipContent>How evidence data enters the system (transport mechanism)</TooltipContent>
                </Tooltip>
              </div>
              <Badge variant="outline">{getMethodLabel(formData.ingestion_method)}</Badge>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Label className="text-slate-700 text-sm">Evidence Type</Label>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-3 h-3 text-slate-400" />
                  </TooltipTrigger>
                  <TooltipContent>The type of compliance evidence being submitted</TooltipContent>
                </Tooltip>
              </div>
              <Badge variant="outline">{getEvidenceTypeLabel(formData.evidence_type)}</Badge>
            </div>

            <div className="flex items-center justify-between py-2 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Label className="text-slate-700 text-sm">Declared Scope</Label>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-3 h-3 text-slate-400" />
                  </TooltipTrigger>
                  <TooltipContent>The organizational scope this evidence applies to</TooltipContent>
                </Tooltip>
              </div>
              <Badge variant="outline">{formData.declared_scope}</Badge>
            </div>

            <div className="flex items-center justify-between py-2">
              <div className="flex items-center gap-2">
                <Label className="text-slate-700 text-sm">Provenance Source</Label>
                <Tooltip>
                  <TooltipTrigger>
                    <Info className="w-3 h-3 text-slate-400" />
                  </TooltipTrigger>
                  <TooltipContent>Who originated this evidence (metadata only)</TooltipContent>
                </Tooltip>
              </div>
              <Badge variant="outline">{safeReplace(formData.provenance_source, '_', ' ')}</Badge>
            </div>
          </div>
        </div>

        {/* Binding Summary */}
        <div className="p-4 bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-xl rounded-lg border border-slate-200 space-y-2">
          <div className="flex items-center gap-2">
            <Label className="text-slate-900 font-semibold text-xs uppercase tracking-wide">Binding</Label>
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-3.5 h-3.5 text-slate-400" />
              </TooltipTrigger>
              <TooltipContent>How this evidence is linked to entities. UNBOUND evidence is quarantined until reconciled.</TooltipContent>
            </Tooltip>
          </div>

          <div className="space-y-1 text-sm">
            <div className="flex items-center justify-between py-1.5 border-b border-slate-100">
              <Label className="text-slate-700 text-xs">Binding Mode</Label>
              <Badge className={isUnbound ? 'bg-amber-100 text-amber-900' : 'bg-slate-100 text-slate-900'}>
                {formData.binding_mode}
              </Badge>
            </div>

            <div className="flex items-center justify-between py-1.5">
              <Label className="text-slate-700 text-xs">Target Entity</Label>
              <div className="text-right">
                {isUnbound ? (
                  <Badge className="bg-red-100 text-red-900">UNBOUND</Badge>
                ) : (
                  <span className="text-sm text-slate-900 font-mono">{getBoundEntityLabel()}</span>
                )}
              </div>
            </div>

            {formData.reconciliation_hint && (
               <div className="pt-1.5 border-t border-slate-100">
                 <Label className="text-slate-700 text-xs mb-0.5 block">Reconciliation Hint</Label>
                 <p className="text-xs text-slate-600 font-mono">{formData.reconciliation_hint}</p>
              </div>
            )}
          </div>
        </div>

        {/* Purpose and Attestation */}
        <div className="p-4 bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-xl rounded-lg border border-slate-200 space-y-2">
          <div className="flex items-center gap-2">
            <Label className="text-slate-900 font-medium text-sm">Purpose & Attestation</Label>
            <Tooltip>
              <TooltipTrigger>
                <Info className="w-3.5 h-3.5 text-slate-400" />
              </TooltipTrigger>
              <TooltipContent>Why this evidence was submitted and who attests to its accuracy</TooltipContent>
            </Tooltip>
          </div>

          <div className="space-y-2">
            <div>
              <Label className="text-slate-700 text-xs mb-0.5 block">Purpose</Label>
              <p className="text-sm text-slate-900 p-3 bg-slate-50/50 rounded-lg border border-slate-100">
                {formData.why_this_evidence}
              </p>
            </div>

            {formData.attestation_notes && (
              <div>
                <Label className="text-slate-700 text-xs mb-1 block">Attestation Notes</Label>
                <p className="text-sm text-slate-900 p-3 bg-slate-50/50 rounded-lg border border-slate-100">
                  {formData.attestation_notes}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Attachments List */}
        {uploadedFiles && uploadedFiles.length > 0 && (
          <div className="p-6 bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-xl rounded-xl border-2 border-slate-200 space-y-4">
            <div className="flex items-center gap-2">
              <Label className="text-slate-900 font-medium text-sm">Attachments ({uploadedFiles.length})</Label>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="w-3.5 h-3.5 text-slate-400" />
                </TooltipTrigger>
                <TooltipContent>Files attached to this evidence. Will be hashed at seal time.</TooltipContent>
              </Tooltip>
            </div>

            <div className="space-y-2">
              {uploadedFiles.map((file) => (
                <div key={file.attachment_id} className="flex items-center justify-between p-3 bg-slate-50/50 border border-slate-200 rounded-lg">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <FileText className="w-4 h-4 text-slate-600 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-900 font-medium truncate">{file.file_name}</p>
                      <p className="text-xs text-slate-500">{(file.file_size / 1024).toFixed(1)} KB</p>
                    </div>
                  </div>
                  <CheckCircle className="w-4 h-4 text-[#86b027] flex-shrink-0" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Digest Summary (API_PUSH_DIGEST) */}
        {formData.ingestion_method === 'API_PUSH_DIGEST' && formData.payload_digest_sha256 && (
          <div className="p-6 bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-xl rounded-xl border-2 border-slate-200 space-y-4">
            <div className="flex items-center gap-2">
              <Label className="text-slate-900 font-medium text-sm">Digest Summary</Label>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="w-3.5 h-3.5 text-slate-400" />
                </TooltipTrigger>
                <TooltipContent>Cryptographic digest of the payload. No payload data is stored.</TooltipContent>
              </Tooltip>
            </div>

            <div className="space-y-3">
              <div>
                <Label className="text-slate-700 text-xs mb-1 block">Algorithm</Label>
                <Badge variant="outline">SHA-256</Badge>
              </div>

              <div>
                <Label className="text-slate-700 text-xs mb-1 block">Digest Value</Label>
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono text-slate-900 bg-slate-50/50 p-2 rounded border border-slate-100 flex-1 break-all">
                    {formData.payload_digest_sha256}
                  </code>
                  <button
                    onClick={() => handleCopyId(formData.payload_digest_sha256, 'Digest')}
                    className="p-2 hover:bg-slate-100 rounded transition-colors"
                  >
                    <Copy className="w-3 h-3 text-slate-400" />
                  </button>
                </div>
              </div>

              {formData.external_reference_id && (
                <div>
                  <Label className="text-slate-700 text-xs mb-1 block">External Reference ID</Label>
                  <code className="text-xs font-mono text-slate-900 bg-slate-50/50 p-2 rounded border border-slate-100 block">
                    {formData.external_reference_id}
                  </code>
                </div>
              )}
            </div>
          </div>
        )}

        {/* BOM Component Preview */}
        {formData.evidence_type === 'BOM' && formData.payload_data_json?.components && formData.payload_data_json.components.length > 0 && (
          <div className="p-6 bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-xl rounded-xl border-2 border-slate-200 space-y-4">
            <div className="flex items-center gap-2">
              <Label className="text-slate-900 font-medium text-sm">BOM Components ({formData.payload_data_json.components.length})</Label>
              <Tooltip>
                <TooltipTrigger>
                  <Info className="w-3.5 h-3.5 text-slate-400" />
                </TooltipTrigger>
                <TooltipContent>Components in this Bill of Materials</TooltipContent>
              </Tooltip>
            </div>

            <div className="space-y-2">
               {formData.payload_data_json.components.map((comp, idx) => {
                 const hasSKU = !!comp.component_sku_id;
                 const code = ((comp.component_sku_code || '').toString() || '').trim();
                 const hasCode = code.length > 0;

                 return (
                   <div key={idx} className="flex items-center justify-between p-3 bg-slate-50/50 border border-slate-200 rounded-lg">
                     <div className="flex items-center gap-3 flex-1">
                       <span className="text-xs font-medium text-slate-600">#{idx + 1}</span>
                       <div className="flex-1">
                         {hasSKU ? (
                           <>
                             <Badge className="bg-green-100 text-green-800 text-xs">Bound Component SKU</Badge>
                             <p className="text-xs text-slate-600 mt-1 font-mono">{comp.component_sku_id.substring(0, 20)}...</p>
                           </>
                         ) : hasCode ? (
                           <>
                             <Badge className="bg-amber-100 text-amber-800 text-xs">Pending Match</Badge>
                             <p className="text-xs text-slate-900 mt-1 font-medium">{code}</p>
                           </>
                         ) : (
                           <Badge className="bg-red-100 text-red-800 text-xs">No Identifier</Badge>
                         )}
                       </div>
                       <div className="text-right">
                         <p className="text-sm text-slate-900 font-medium">{comp.quantity} {comp.uom}</p>
                       </div>
                     </div>
                   </div>
                 );
               })}
             </div>
          </div>
        )}

        {/* Canonical Payload Preview (Collapsed) */}
        {formData.ingestion_method === 'MANUAL_ENTRY' && formData.payload_data_json && Object.keys(formData.payload_data_json).length > 0 && (
          <details className="border-2 border-slate-200 rounded-xl">
            <summary className="p-4 bg-slate-50/50 cursor-pointer hover:bg-slate-100/50 transition-colors">
              <span className="text-sm font-medium text-slate-700">Advanced: Canonical Payload Preview</span>
            </summary>
            <div className="p-4 bg-white/50 space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <Info className="w-3.5 h-3.5 text-slate-500" />
                <Label className="text-xs text-slate-600">Read-only. Will be hashed at seal time.</Label>
              </div>
              <pre className="text-xs font-mono text-slate-700 overflow-auto max-h-64 bg-slate-900/5 p-3 rounded">
                {JSON.stringify(formData.payload_data_json, null, 2)}
              </pre>
            </div>
          </details>
        )}

        {/* Warning Section */}
        <div className="space-y-3">
          {/* CRITICAL: PENDING_MATCH Gating Banner */}
          {hasPendingMatch && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border-2 border-red-300 rounded-xl">
              <XCircle className="w-5 h-5 text-red-700 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-900">Evidence SEALED but NOT USABLE</p>
                <p className="text-xs text-red-800 mt-1 font-medium">
                  This evidence is sealed but BLOCKED from calculations until reconciliation + review are completed.
                </p>
                <p className="text-xs text-red-700 mt-2">
                  BOM components with "PENDING_MATCH" status must be reconciled to existing SKUs, and the record must be approved before use in compliance calculations or exports.
                </p>
              </div>
            </div>
          )}

          {/* UNBOUND Warning */}
          {isUnbound && (
            <div className="flex items-start gap-3 p-4 bg-red-50 border-2 border-red-200 rounded-xl">
              <Lock className="w-5 h-5 text-red-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-red-900">Blocked Until Reconciled</p>
                <p className="text-xs text-red-700 mt-1">
                  UNBOUND evidence cannot be used in compliance calculations until reconciled to an entity and approved by a reviewer.
                </p>
              </div>
            </div>
          )}

          {/* Manual Entry Trust Warning */}
          {isManualEntry && (
            <div className="flex items-start gap-3 p-4 bg-amber-50 border-2 border-amber-200 rounded-xl">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-900">Manual Entry: LOW Trust Level</p>
                <p className="text-xs text-amber-700 mt-1">
                  Manual entry defaults to LOW trust until reviewed. Compliance policy may block downstream use without reviewer approval.
                </p>
              </div>
            </div>
          )}

          {/* AI Disclaimer (Always) */}
          <div className="flex items-start gap-3 p-4 bg-blue-50 border-2 border-blue-200 rounded-xl">
            <Info className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-blue-900">AI Assistance Disclaimer</p>
              <p className="text-xs text-blue-700 mt-1">
                AI suggestions are not authoritative. All evidence must be validated by authorized personnel before use in compliance reporting.
              </p>
            </div>
          </div>
        </div>

        {/* Seal Info Banner - Defensive Mode Check */}
         <div className="flex items-start gap-3 p-4 bg-slate-50 border-2 border-slate-200 rounded-xl">
         <Shield className="w-5 h-5 text-slate-600 mt-0.5 flex-shrink-0" />
         <div>
          <p className="text-sm font-medium text-slate-900">Ready to Seal</p>
          <p className="text-xs text-slate-600 mt-1">
            {String(adapterMode || 'real').toLowerCase() === 'mock' 
              ? 'Mock mode: Simulates sealing with generated hashes. No data persisted to backend.'
              : 'Sealing creates an immutable, tamper-evident record with cryptographic hashes. This action cannot be undone.'}
          </p>
         </div>
         </div>
      </div>
    </TooltipProvider>
  );
}