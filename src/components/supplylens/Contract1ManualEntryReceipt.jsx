import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, Copy } from 'lucide-react';
import { toast } from 'sonner';

export default function Contract1ManualEntryReceipt({ 
  recordId, 
  correlationId, 
  onComplete, 
  adapterMode = 'real', 
  draftId = null,
  sealResponse = null 
}) {
  const [copied, setCopied] = useState(null);

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    toast.success('Copied');
    setTimeout(() => setCopied(null), 2000);
  };

  const sealedAt = (sealResponse?.sealed_at_utc || '').toString().trim();
  const payloadSha256 = (sealResponse?.payload_sha256 || '').toString().trim();
  const fileSha256 = (sealResponse?.file_sha256 || '').toString().trim();
  const tenantId = (sealResponse?.tenant_id || '').toString().trim();
  const reviewStatus = (sealResponse?.review_status || 'NOT_REVIEWED').toString().trim();
  const trustLevel = (sealResponse?.trust_level || 'LOW').toString().trim();
  const reconciliationStatus = (sealResponse?.reconciliation_status || 'UNBOUND').toString().trim();
  const hashScope = (sealResponse?.hash_scope || 'canonical_payload_plus_metadata').toString().trim();

  // Critical field validation
  const isMissingCriticalFields = !sealedAt || !payloadSha256;
  const isRealMode = adapterMode === 'real';

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-8">
      <div className="max-w-3xl mx-auto">
        {isMissingCriticalFields ? (
          <Card className="bg-white/95 backdrop-blur-xl border-2 border-red-300 shadow-lg rounded-2xl overflow-hidden">
            <CardHeader className="border-b-2 border-red-200 bg-gradient-to-br from-red-50 to-transparent p-8">
              <div className="flex items-center gap-4">
                <AlertTriangle className="w-10 h-10 text-red-600" />
                <div>
                  <CardTitle className="text-2xl font-medium tracking-tight text-red-900">
                    Seal Operation Failed
                  </CardTitle>
                  <p className="text-sm text-red-800 mt-1">
                    Critical fields missing from seal response
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-8 space-y-4">
              <div className="p-4 bg-red-50 border-2 border-red-200 rounded-xl">
                <p className="text-sm text-red-900 font-medium">Missing Required Fields:</p>
                <ul className="text-xs text-red-800 mt-2 space-y-1">
                  {!sealedAt && <li>• sealed_at_utc</li>}
                  {!payloadSha256 && <li>• payload_sha256</li>}
                </ul>
              </div>
              {correlationId && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl">
                  <p className="text-xs text-slate-600 font-medium mb-2">Correlation ID (for support):</p>
                  <code className="text-xs font-mono text-slate-900">{correlationId}</code>
                </div>
              )}
              <Button
                onClick={() => {
                  if (onComplete && typeof onComplete === 'function') {
                    onComplete(null);
                  }
                }}
                variant="outline"
                className="w-full"
              >
                Close
              </Button>
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-white/95 backdrop-blur-xl border-2 border-green-300 shadow-lg rounded-2xl overflow-hidden">
            <CardHeader className="border-b-2 border-green-200 bg-gradient-to-br from-green-50 to-transparent p-8">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <CheckCircle className="w-10 h-10 text-green-600" />
                  <div>
                    <CardTitle className="text-2xl font-medium tracking-tight text-green-900">
                      {adapterMode === 'mock' ? 'Mock Record Created' : 'Evidence Sealed'}
                    </CardTitle>
                    <p className="text-sm text-green-800 mt-1">
                      {adapterMode === 'mock' ? 'Simulated seal (not persisted)' : 'Immutable record created'}
                    </p>
                  </div>
                </div>
                <Badge className={adapterMode === 'mock' ? 'bg-amber-100 text-amber-900' : 'bg-[#86b027]/10 text-[#86b027]'}>
                  {adapterMode === 'mock' ? 'MOCK' : 'REAL'}
                </Badge>
              </div>
              <div className="text-xs text-slate-600 mt-2">
                Environment: {adapterMode === 'mock' ? 'Preview (Base44)' : 'Production API'}
              </div>
            </CardHeader>

          <CardContent className="p-8 space-y-8">
            {/* Record Details */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Record Details</h3>
              
              <div className="p-4 bg-gradient-to-br from-white/90 to-white/70 backdrop-blur-xl rounded-xl border-2 border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-slate-700 font-medium">Record ID</span>
                  <button
                    onClick={() => copyToClipboard(recordId, 'recordId')}
                    className="flex items-center gap-2 text-xs text-slate-600 hover:text-slate-900 transition-colors"
                  >
                    <code className="bg-slate-100 px-2 py-1 rounded">{recordId.substring(0, 16)}...</code>
                    <Copy className={`w-4 h-4 ${copied === 'recordId' ? 'text-green-600' : ''}`} />
                  </button>
                </div>

                {isRealMode && tenantId && (
                  <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                    <span className="text-slate-700 font-medium">Tenant ID</span>
                    <code className="text-xs font-mono text-slate-900 bg-slate-100 px-2 py-1 rounded">
                      {tenantId}
                    </code>
                  </div>
                )}

                <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                  <span className="text-slate-700 font-medium">Sealed At (UTC)</span>
                  <code className="text-xs text-slate-600 bg-slate-100 px-2 py-1 rounded">
                    {sealedAt}
                  </code>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                  <span className="text-slate-700 font-medium">Review Status</span>
                  <Badge variant={reviewStatus === 'APPROVED' ? 'default' : 'outline'} className="text-xs">
                    {reviewStatus}
                  </Badge>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                  <span className="text-slate-700 font-medium">Trust Level</span>
                  <Badge variant={
                    trustLevel === 'HIGH' ? 'default' : 
                    trustLevel === 'MEDIUM' ? 'outline' : 
                    'destructive'
                  } className="text-xs">
                    {trustLevel}
                  </Badge>
                </div>

                <div className="flex items-center justify-between pt-3 border-t border-slate-200">
                  <span className="text-slate-700 font-medium">Reconciliation Status</span>
                  <Badge variant={reconciliationStatus === 'BOUND' ? 'default' : 'outline'} className="text-xs">
                    {reconciliationStatus}
                  </Badge>
                </div>
              </div>
            </div>

            {/* Hashes - Only if backend returns hash fields */}
            {(payloadSha256 || fileSha256) && (
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">
                  Cryptographic Hashes
                </h3>
                
                {payloadSha256 === 'MOCK_PAYLOAD_HASH' && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs text-amber-800">
                      Mock mode: hash simulated
                    </p>
                  </div>
                )}
                
                <div className="p-4 bg-gradient-to-br from-slate-900/5 to-slate-900/2 backdrop-blur-xl rounded-xl border-2 border-slate-200 space-y-4">
                  {payloadSha256 && (
                    <div>
                      <p className="text-xs text-slate-600 font-medium mb-2">
                        Payload SHA-256
                      </p>
                      <button
                        onClick={() => copyToClipboard(payloadSha256, 'payload')}
                        className="w-full text-left p-3 bg-white/50 hover:bg-white/80 rounded-lg border border-slate-200 text-xs font-mono text-slate-700 transition-colors flex items-center justify-between"
                      >
                        <span className="break-all">{payloadSha256}</span>
                        <Copy className={`w-4 h-4 ml-2 flex-shrink-0 ${copied === 'payload' ? 'text-green-600' : ''}`} />
                      </button>
                    </div>
                  )}

                  {fileSha256 && (
                    <div>
                      <p className="text-xs text-slate-600 font-medium mb-2">
                        File SHA-256
                      </p>
                      <button
                        onClick={() => copyToClipboard(fileSha256, 'file')}
                        className="w-full text-left p-3 bg-white/50 hover:bg-white/80 rounded-lg border border-slate-200 text-xs font-mono text-slate-700 transition-colors flex items-center justify-between"
                      >
                        <span className="break-all">{fileSha256}</span>
                        <Copy className={`w-4 h-4 ml-2 flex-shrink-0 ${copied === 'file' ? 'text-green-600' : ''}`} />
                      </button>
                    </div>
                  )}

                  <div className="pt-3 border-t border-slate-300">
                    <p className="text-xs text-slate-600 font-medium mb-2">Hash Scope</p>
                    <code className="text-xs font-mono text-slate-700 bg-slate-50 px-2 py-1 rounded border border-slate-200">
                      {hashScope}
                    </code>
                  </div>

                  <div className="space-y-1 bg-slate-50 p-3 rounded border border-slate-200">
                    <p className="text-xs text-slate-700 font-medium">Canonicalization:</p>
                    <ul className="text-xs text-slate-600 space-y-0.5 ml-4">
                      <li>• Computed server-side</li>
                      <li>• Deterministic canonical JSON serialization</li>
                      <li>• Immutable after seal</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {/* Correlation ID */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Audit Trail</h3>
              
              <button
                onClick={() => copyToClipboard(correlationId, 'correlation')}
                className="w-full p-4 bg-blue-50 hover:bg-blue-100 rounded-xl border-2 border-blue-200 text-center transition-colors"
              >
                <p className="text-xs text-blue-700 font-medium mb-2">Correlation ID (for support)</p>
                <code className="text-sm font-mono text-blue-900 break-all">{correlationId}</code>
              </button>
            </div>

            {/* Warnings */}
            <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-xl">
              <h4 className="text-sm font-semibold text-amber-900 mb-2">⚠️ Important</h4>
              <ul className="text-xs text-amber-800 space-y-1">
                {adapterMode === 'mock' && (
                   <li>• <strong>MOCK MODE:</strong> This record is not persisted to the database</li>
                 )}
                 {(reconciliationStatus || '').includes('UNBOUND') && (
                   <li>• Evidence is {reconciliationStatus} - cannot be used in calculations until reconciled</li>
                 )}
                 {(reviewStatus || '').includes('NOT_REVIEWED') && (
                   <li>• Status is {reviewStatus} - requires approval before use</li>
                 )}
                 {(trustLevel || '').includes('LOW') && (
                   <li>• Trust level is {trustLevel} - manual entry requires additional verification</li>
                 )}
                 {payloadSha256 && payloadSha256 !== 'MOCK_PAYLOAD_HASH' && (
                   <li>• Cryptographic hashes guarantee immutability and authenticity</li>
                 )}
                 <li>• Save correlation ID for audit and support reference</li>
              </ul>
            </div>

            {/* Quick Links */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-slate-900 uppercase tracking-wider">Quick Links</h3>
              
              <div className="grid grid-cols-2 gap-3">
                {draftId && (
                  <a
                    href={`/evidence-drafts?draft_id=${draftId}`}
                    className="flex items-center justify-center gap-2 p-3 bg-white hover:bg-slate-50 border-2 border-slate-200 rounded-xl text-sm text-slate-900 transition-colors"
                  >
                    View Draft History
                  </a>
                )}
                <a
                  href={`/audit-trail?record_id=${recordId}`}
                  className="flex items-center justify-center gap-2 p-3 bg-white hover:bg-slate-50 border-2 border-slate-200 rounded-xl text-sm text-slate-900 transition-colors"
                >
                  View Audit Events
                </a>
              </div>
            </div>

            {/* Backend Receipt Contract - Developer Info */}
            {(adapterMode === 'mock' || !tenantId) && (
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
          </CardContent>

          {/* Actions */}
          <div className="flex items-center justify-between p-8 border-t border-slate-200/50 bg-slate-50/30 backdrop-blur-sm">
            <a
              href="/evidence-vault"
              className="text-sm text-slate-600 hover:text-slate-900 transition-colors"
            >
              View Evidence Vault
            </a>

            <Button
              onClick={() => {
                if (onComplete && typeof onComplete === 'function') {
                  onComplete(recordId);
                }
              }}
              className="bg-slate-900 hover:bg-slate-800 text-white gap-2"
            >
              Done
            </Button>
          </div>
          </Card>
        )}
      </div>
    </div>
  );
}