import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";
import { CheckCircle2, Copy, Loader2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function Contract1SealReceiptStep({
  declaration,
  payload,
  isSealing,
  onSeal
}) {
  const [sealReceipt, setSealReceipt] = useState(null);
  const [error, setError] = useState(null);
  const [localIsSealing, setLocalIsSealing] = useState(isSealing);

  useEffect(() => {
    if (isSealing && !sealReceipt && !error) {
      performSeal();
    }
  }, [isSealing]);

  const performSeal = async () => {
    setLocalIsSealing(true);
    setError(null);

    try {
      const formData = new FormData();

      // Prepare metadata
      const metadata = {
        ingestion_method: declaration.ingestion_method,
        dataset_type: declaration.dataset_type,
        source_system: declaration.source_system,
        source_system_detail: declaration.source_system_detail || null,
        snapshot_date_utc: declaration.snapshot_date_utc || null,
        declared_scope: declaration.declared_scope,
        scope_target_id: declaration.scope_target_id || null,
        declared_intent: declaration.declared_intent,
        intent_details: declaration.intent_details || null,
        purpose_tags: declaration.intended_consumers,
        intended_consumers: declaration.intended_consumers,
        personal_data_present: declaration.personal_data_present,
        gdpr_legal_basis: declaration.personal_data_present ? declaration.gdpr_legal_basis : null,
        retention_policy: declaration.retention_policy,
        retention_duration_days: declaration.retention_duration_days || null,
        payload: payload.type === 'json' ? { raw_json: payload.data } : null
      };

      formData.append('metadata', JSON.stringify(metadata));

      if (payload.type === 'file') {
        formData.append('file', payload.file);
      }

      // Add idempotency key
      const response = await base44.functions.invoke('ingestEvidence', {}, {
        method: 'POST',
        headers: {
          'Idempotency-Key': `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        },
        body: formData
      });

      if (response.data.success) {
        setSealReceipt(response.data);
        toast.success('Evidence sealed successfully');
      } else {
        setError(response.data.error || 'Sealing failed');
      }
    } catch (err) {
      setError(err.message || 'Sealing failed');
      toast.error('Sealing error: ' + err.message);
    } finally {
      setLocalIsSealing(false);
    }
  };

  const copyToClipboard = (text, label) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied`);
  };

  if (error) {
    return (
      <Card className="bg-red-50/50 border-red-200">
        <CardContent className="p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium text-red-900">Sealing Failed</p>
              <p className="text-sm text-red-700 mt-1">{error}</p>
              <Button
                onClick={() => {
                  setError(null);
                  setSealReceipt(null);
                  performSeal();
                }}
                size="sm"
                className="mt-3"
              >
                Retry
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (localIsSealing || !sealReceipt) {
    return (
      <div className="space-y-4">
        <Card className="bg-white/30 border-white/50">
          <CardContent className="p-8 text-center">
            <Loader2 className="w-8 h-8 text-[#86b027] animate-spin mx-auto mb-3" />
            <p className="text-sm font-medium text-slate-900">Sealing evidence...</p>
            <p className="text-xs text-slate-500 mt-2">Computing hashes and creating audit trail</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Success Banner */}
      <Card className="bg-green-50/50 border-green-200">
        <CardContent className="p-4 flex items-start gap-3">
          <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
          <div>
            <p className="font-medium text-green-900">Evidence Sealed Successfully</p>
            <p className="text-xs text-green-700 mt-1">Your data is now immutable and audited.</p>
          </div>
        </CardContent>
      </Card>

      {/* Receipt Details */}
      <Card className="bg-white/40 border-white/50">
        <CardHeader>
          <CardTitle className="text-sm">Evidence Receipt</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Evidence ID */}
          <div>
            <p className="text-xs text-slate-500 font-medium mb-1">Evidence ID</p>
            <div className="flex items-center gap-2">
              <code className="text-xs font-mono bg-white/50 px-3 py-1.5 rounded flex-1 break-all">
                {sealReceipt.evidence_id}
              </code>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => copyToClipboard(sealReceipt.evidence_id, 'Evidence ID')}
                className="h-8 w-8 flex-shrink-0"
              >
                <Copy className="w-3 h-3" />
              </Button>
            </div>
          </div>

          {/* Sealed At */}
          <div>
            <p className="text-xs text-slate-500 font-medium mb-1">Sealed At (UTC)</p>
            <p className="text-sm text-slate-900 font-mono">
              {new Date(sealReceipt.sealed_at_utc).toISOString()}
            </p>
          </div>

          {/* Payload Hash */}
          <div>
            <p className="text-xs text-slate-500 font-medium mb-1">Payload Hash</p>
            <div className="flex items-center gap-2">
              <code className="text-xs font-mono bg-white/50 px-3 py-1.5 rounded flex-1">
                {sealReceipt.payload_hash_sha256.substring(0, 32)}...
              </code>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => copyToClipboard(sealReceipt.payload_hash_sha256, 'Hash')}
                className="h-8 w-8 flex-shrink-0"
              >
                <Copy className="w-3 h-3" />
              </Button>
            </div>
          </div>

          {/* Metadata Hash */}
          <div>
            <p className="text-xs text-slate-500 font-medium mb-1">Metadata Hash</p>
            <div className="flex items-center gap-2">
              <code className="text-xs font-mono bg-white/50 px-3 py-1.5 rounded flex-1">
                {sealReceipt.metadata_hash_sha256.substring(0, 32)}...
              </code>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => copyToClipboard(sealReceipt.metadata_hash_sha256, 'Hash')}
                className="h-8 w-8 flex-shrink-0"
              >
                <Copy className="w-3 h-3" />
              </Button>
            </div>
          </div>

          {/* Dataset Info */}
          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-white/30">
            <div>
              <p className="text-xs text-slate-500 font-medium mb-1">Dataset Type</p>
              <Badge variant="outline" className="text-xs">
                {sealReceipt.declaration_summary.dataset_type}
              </Badge>
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium mb-1">Ingestion Method</p>
              <Badge variant="outline" className="text-xs">
                {sealReceipt.declaration_summary.ingestion_method}
              </Badge>
            </div>
          </div>

          {/* Declaration Summary */}
          <div className="pt-3 border-t border-white/30">
            <p className="text-xs text-slate-500 font-medium mb-2">Declaration</p>
            <div className="text-xs space-y-1 text-slate-700">
              <p>Scope: {sealReceipt.declaration_summary.declared_scope}</p>
              <p>Intent: {sealReceipt.declaration_summary.declared_intent}</p>
              <p>Consumers: {sealReceipt.declaration_summary.intended_consumers.join(', ')}</p>
              <p>Retention: {sealReceipt.declaration_summary.retention_policy}</p>
              {sealReceipt.declaration_summary.personal_data_present && (
                <p>GDPR Basis: {sealReceipt.declaration_summary.gdpr_legal_basis}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Next Actions */}
      <Card className="bg-white/30 border-white/50">
        <CardContent className="p-4">
          <p className="text-xs text-slate-600 font-medium mb-2">Next Steps</p>
          <ul className="text-xs text-slate-700 space-y-1 list-disc list-inside">
            <li>View in Evidence Vault to access full receipt</li>
            <li>Evidence is immutable and cannot be modified</li>
            <li>Audit trail is complete and auditable</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}